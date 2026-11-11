
import {
  mkdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";

import path from "node:path";
import { fileURLToPath } from "node:url";

import repdbExercises from "../src/data/repdb.generated.json" with { type: "json" };

// ==========================================
// CONFIGURATION
// ==========================================

const EXERCISE_BASE_URL =
  "https://exercise-dataset.com/";

const EQUIPMENT_INDEX_URL =
  "https://api.github.com/repos/RepDB/exercise-dataset/contents/images/equipment";

const EQUIPMENT_BASE_URL =
  "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/images/equipment/";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const outputDirectory = path.join(
  projectRoot,
  "public",
  "repdb-images"
);

const MAX_CONCURRENT_DOWNLOADS = 6;
const DOWNLOAD_TIMEOUT_MS = 30000;

const equipmentOnly =
  process.argv.includes("--equipment");

// ==========================================
// EXERCISE IMAGE JOBS
// ==========================================

function getExerciseJobs() {
  const imagePaths = [
    ...new Set(
      repdbExercises.flatMap((exercise) =>
        Object.values(exercise.media ?? {})
      )
    ),
  ].filter(
    (imagePath) =>
      typeof imagePath === "string" &&
      /^images\/flat\/[a-z0-9_-]+\.webp$/i.test(imagePath)
  );

  return imagePaths.map((imagePath) => ({
    name: path.basename(imagePath),
    url: new URL(imagePath, EXERCISE_BASE_URL).href,
    category: "exercise",
  }));
}

// ==========================================
// EQUIPMENT IMAGE JOBS
// ==========================================

async function getEquipmentJobs() {
  console.log("Loading RepDB equipment image list...");

  const response = await fetch(EQUIPMENT_INDEX_URL, {
    headers: {
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Equipment list request failed: HTTP ${response.status}`
    );
  }

  const files = await response.json();

  if (!Array.isArray(files)) {
    throw new Error("Invalid equipment image list.");
  }

  const equipmentFiles = files.filter(
    (file) =>
      file.type === "file" &&
      /^[a-z0-9-]+\.webp$/i.test(file.name)
  );

  if (equipmentFiles.length === 0) {
    throw new Error("No equipment images found.");
  }

  return equipmentFiles.map((file) => ({
    // Prefix prevents collisions with exercise images.
    name: `equipment-${file.name}`,

    url: new URL(
      file.name,
      EQUIPMENT_BASE_URL
    ).href,

    category: "equipment",
  }));
}

// ==========================================
// CHECK EXISTING FILE
// ==========================================

async function fileAlreadyExists(filePath) {
  try {
    const file = await stat(filePath);

    return file.isFile() && file.size > 100;
  } catch {
    return false;
  }
}

// ==========================================
// VALIDATE WEBP
// ==========================================

function isValidWebP(buffer) {
  return (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

// ==========================================
// DOWNLOAD ONE IMAGE
// ==========================================

async function downloadImage(job) {
  const destination = path.join(
    outputDirectory,
    job.name
  );

  if (await fileAlreadyExists(destination)) {
    return "skipped";
  }

  const response = await fetch(job.url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${job.name}`
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  if (!isValidWebP(buffer)) {
    throw new Error(
      `Invalid WebP image: ${job.name}`
    );
  }

  const temporaryFile = `${destination}.part`;

  try {
    await writeFile(temporaryFile, buffer);
    await rename(temporaryFile, destination);
  } catch (error) {
    await rm(temporaryFile, {
      force: true,
    });

    throw error;
  }

  return "downloaded";
}

// ==========================================
// MAIN PROCESS
// ==========================================

async function main() {
  await mkdir(outputDirectory, {
    recursive: true,
  });

  // Download only equipment when requested.
  const exerciseJobs = equipmentOnly
    ? []
    : getExerciseJobs();

  const equipmentJobs =
    await getEquipmentJobs();

  const jobs = [
    ...exerciseJobs,
    ...equipmentJobs,
  ];

  console.log("\nRepDB image synchronization");
  console.log(`Exercise images: ${exerciseJobs.length}`);
  console.log(`Equipment images: ${equipmentJobs.length}`);
  console.log(`Total files to check: ${jobs.length}`);

  // ========================================
  // DOWNLOAD STATISTICS
  // ========================================

  let nextIndex = 0;
  let completed = 0;
  let downloaded = 0;
  let skipped = 0;

  const failures = [];

  // ========================================
  // CONCURRENT WORKERS
  // ========================================

  async function worker() {
    while (nextIndex < jobs.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const job = jobs[currentIndex];

      try {
        const result = await downloadImage(job);

        if (result === "downloaded") {
          downloaded += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failures.push({
          name: job.name,
          message: error.message,
        });
      }

      completed += 1;

      if (
        completed % 50 === 0 ||
        completed === jobs.length
      ) {
        console.log(
          `Processed ${completed}/${jobs.length}`
        );
      }
    }
  }

  const workerCount = Math.min(
    MAX_CONCURRENT_DOWNLOADS,
    jobs.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );

  // ========================================
  // SUMMARY
  // ========================================

  console.log("\nDownload summary:");
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Already present: ${skipped}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nFailed files:");

    failures.slice(0, 10).forEach((failure) => {
      console.log(
        `${failure.name}: ${failure.message}`
      );
    });

    console.log(
      "\nRun the script again to retry missing images."
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "\nAll requested RepDB images are ready."
  );
}

main().catch((error) => {
  console.error(
    "RepDB synchronization failed:",
    error.message
  );

  process.exitCode = 1;
});
