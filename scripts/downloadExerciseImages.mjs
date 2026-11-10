
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const datasetUrl =
  "https://exercise-dataset.com/exercises.json";

const mediaBaseUrl =
  "https://exercise-dataset.com/";

const outputDirectory = path.resolve(
  "public/exercise-images"
);

const mappingFile = path.resolve(
  "src/data/exerciseImages.json"
);

const exerciseMatches = {
  "push-up": ["Push-Up"],
  "bench-press": [
    "Barbell Bench Press",
    "Bench Press",
  ],
  "dumbbell-chest-press": [
    "Dumbbell Bench Press",
    "Dumbbell Chest Press",
  ],
  "bodyweight-squat": ["Bodyweight Squat"],
  "goblet-squat": ["Goblet Squat"],
  "leg-press": ["Leg Press"],
  "dumbbell-row": [
    "Single-Arm Dumbbell Row",
    "Dumbbell Row",
  ],
  "lat-pulldown": [
    "Lat Pulldown",
    "Wide Grip Lat Pulldown",
  ],
  "dumbbell-shoulder-press": [
    "Dumbbell Shoulder Press",
  ],
 "biceps-curl": [
  "Dumbbell Bicep Curl",
  "Dumbbell Biceps Curl",
  "Bicep Curl",
],
  plank: ["Plank"],
  "glute-bridge": ["Glute Bridge"],
};

async function downloadImage(url, destination) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer);
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });

  const response = await fetch(datasetUrl);

  if (!response.ok) {
    throw new Error(`Dataset request failed: ${response.status}`);
  }

  const dataset = await response.json();
  const imageMapping = {};

  for (const [localId, aliases] of Object.entries(exerciseMatches)) {
    const sourceExercise = aliases
      .map((alias) =>
        dataset.exercises.find(
          (exercise) =>
            exercise.name_en.toLowerCase() === alias.toLowerCase()
        )
      )
      .find(Boolean);

    if (!sourceExercise) {
      console.log(`Not found: ${localId}`);
      continue;
    }

    const sourceImages = sourceExercise.images?.flat ?? {};
    const downloadedImages = {};

    for (const position of ["start", "peak", "main"]) {
      const imagePath = sourceImages[position];

      if (!imagePath) continue;

      const filename = `${localId}-${position}.webp`;
      const destination = path.join(outputDirectory, filename);

      try {
        await downloadImage(
          new URL(imagePath, mediaBaseUrl),
          destination
        );

        downloadedImages[position] =
          `/exercise-images/${filename}`;
      } catch (error) {
        console.log(`Failed: ${filename} - ${error.message}`);
      }
    }

    if (Object.keys(downloadedImages).length > 0) {
      imageMapping[localId] = downloadedImages;
      console.log(`Downloaded: ${localId}`);
    }
  }

  await writeFile(
    mappingFile,
    JSON.stringify(imageMapping, null, 2)
  );

  console.log("Exercise image mapping created.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
