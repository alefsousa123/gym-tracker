
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Official RepDB free-tier dataset.
const DATASET_URL = "https://exercise-dataset.com/exercises.json";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const outputFile = path.join(
  projectRoot,
  "src",
  "data",
  "repdb.generated.json"
);

const equipmentLabels = {
  barbell: "Barbell",
  dumbbell: "Dumbbells",
  kettlebell: "Kettlebells",
  cable: "Cable Machine",
  machine: "Machine",
  smith_machine: "Smith Machine",
  resistance_band: "Resistance Bands",
  band: "Resistance Bands",
  bench: "Bench",
  pull_up_bar: "Pull-Up Bar",
  dip_bars: "Dip Bars",
  stability_ball: "Stability Ball",
  exercise_ball: "Stability Ball",
  medicine_ball: "Medicine Ball",
  jump_rope: "Jump Rope",
  yoga_mat: "Yoga Mat",
  foam_roller: "Foam Roller",
  suspension_trainer: "Suspension Trainer",
  ez_bar: "EZ Bar",
  trap_bar: "Trap Bar",
  weight_plate: "Weight Plates",
};

const homeEquipment = new Set([
  "Barbell",
  "Dumbbells",
  "Kettlebells",
  "Resistance Bands",
  "Bench",
  "Pull-Up Bar",
  "Dip Bars",
  "Stability Ball",
  "Medicine Ball",
  "Jump Rope",
  "Yoga Mat",
  "Foam Roller",
  "Suspension Trainer",
  "EZ Bar",
  "Trap Bar",
  "Weight Plates",
]);

const muscleGroupLabels = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  upper_arms: "Arms",
  lower_arms: "Arms",
  upper_legs: "Legs",
  lower_legs: "Legs",
  waist: "Core",
  abdominals: "Core",
  hips: "Glutes",
  neck: "Neck",
  cardio: "Cardio",
  full_body: "Full Body",
};

function humanize(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function listOfStrings(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function getEquipment(source) {
  const rawEquipment = source.equipment;

  const equipmentKeys = Array.isArray(rawEquipment)
    ? rawEquipment
    : typeof rawEquipment === "string"
      ? [rawEquipment]
      : [];

  const equipment = equipmentKeys
    .filter((key) =>
      typeof key === "string" &&
      !["none", "bodyweight", "body_weight"].includes(key)
    )
    .map((key) => equipmentLabels[key] ?? humanize(key));

  if (listOfStrings(source.tags).includes("requires_bench")) {
    equipment.push("Bench");
  }

  return [...new Set(equipment)];
}

function getLocations(source, equipment) {
  // Unknown equipment is treated conservatively as gym-only.
  if (equipment.length === 0) {
    return source.is_bodyweight === true
      ? ["home", "gym"]
      : ["gym"];
  }

  return equipment.every((item) => homeEquipment.has(item))
    ? ["home", "gym"]
    : ["gym"];
}

function getMedia(source) {
  const images = source.images?.flat ?? {};
  const result = {};

  for (const position of ["start", "peak", "main"]) {
    const imagePath = images[position];

    if (
      typeof imagePath === "string" &&
      imagePath.startsWith("images/flat/") &&
      imagePath.endsWith(".webp")
    ) {
      result[position] = imagePath;
    }
  }

  return result;
}

function normalizeExercise(source) {
  if (
    typeof source.id !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/.test(source.id) ||
    typeof source.name_en !== "string" ||
    !source.name_en.trim()
  ) {
    throw new Error(`Invalid exercise: ${String(source.id)}`);
  }

  const equipment = getEquipment(source);

  return {
    id: source.id,
    name: source.name_en.trim(),
    muscleGroup:
      muscleGroupLabels[source.body_part] ??
      humanize(source.body_part || "Other"),
    secondaryMuscles: listOfStrings(source.secondary_muscles)
      .map(humanize),
    equipment,
    locations: getLocations(source, equipment),
    difficulty: humanize(source.difficulty || "Beginner"),
    instructions: listOfStrings(source.instructions_en),
    description: source.description_en ?? "",
    primaryMuscles: listOfStrings(source.primary_muscles)
      .map(humanize),
    category: source.category ?? "strength",
    goals: listOfStrings(source.goals),
    tags: listOfStrings(source.tags),
    variationGroup: source.variation_group ?? null,
    isBodyweight: source.is_bodyweight === true,
    tips: listOfStrings(source.tips_en),
    media: getMedia(source),
    source: "repdb",
  };
}

async function main() {
  console.log("Downloading RepDB exercise data...");

  const response = await fetch(DATASET_URL, {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`RepDB request failed: HTTP ${response.status}`);
  }

  const dataset = await response.json();

  if (
    !Array.isArray(dataset.exercises) ||
    dataset.exercises.length === 0
  ) {
    throw new Error("Unexpected RepDB dataset structure.");
  }

  if (
    Number.isInteger(dataset.count) &&
    dataset.count !== dataset.exercises.length
  ) {
    throw new Error("RepDB dataset count does not match its contents.");
  }

  const exercises = dataset.exercises.map(normalizeExercise);
  const ids = new Set(exercises.map((exercise) => exercise.id));

  if (ids.size !== exercises.length) {
    throw new Error("Duplicate exercise IDs found in RepDB.");
  }

  await mkdir(path.dirname(outputFile), { recursive: true });

  await writeFile(
    outputFile,
    `${JSON.stringify(exercises, null, 2)}\n`,
    "utf8"
  );

  const illustrated = exercises.filter(
    (exercise) => Object.keys(exercise.media).length > 0
  ).length;

  console.log(`Imported exercises: ${exercises.length}`);
  console.log(`Exercises with image references: ${illustrated}`);
  console.log(`Generated: ${path.relative(projectRoot, outputFile)}`);
  console.log("Existing Gym Tracker exercise data was not modified.");
}

main().catch((error) => {
  console.error("RepDB synchronization failed:", error.message);
  process.exitCode = 1;
});
