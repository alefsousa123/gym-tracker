import repdbCatalog from
  "../data/repdb.catalog.generated.json";

import {
  exerciseAssessmentById,
} from "../data/exerciseAssessments";

import {
  exerciseMuscleRegionsById,
} from "../data/exerciseMuscleRegionAssessments";

/**
 * D1.10 - Functional exercise compatibility.
 *
 * A movement name or variation group alone
 * is not enough to determine its training role.
 *
 * This module checks movement patterns AND
 * primary muscle involvement.
 */

const repdbById = new Map(
  repdbCatalog.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

const LOWER_FAMILIES = new Set([
  "squat",
  "lunge",
  "hip-hinge",
  "hip-extension",
  "hip-isolation",
  "knee-extension",
  "knee-flexion",
  "calf",
]);

const CORE_FAMILIES = new Set([
  "core-flexion",
  "core-stability",
  "core-rotation",
  "core-lateral-flexion",
]);

export function matchesExerciseRole(
  exercise,
  role
) {
  if (!exercise?.id) return false;

  if (!role || role === "full-body") {
    return true;
  }

  const movement =
    exerciseAssessmentById.get(exercise.id);

  const regions =
    exerciseMuscleRegionsById.get(exercise.id);

  const reference =
    repdbById.get(exercise.id);

  if (!movement || !regions) {
    return false;
  }

  const family = movement.movementFamily;

  const category =
    reference?.category ??
    exercise.category ??
    "strength";

  const primary =
    regions.primaryRegions;

  const anatomical =
    reference?.primaryMuscles ??
    exercise.primaryMuscles ??
    [];

  // Resistance-training slots should not
  // prioritize cardio, stretching, Olympic
  // lifting or plyometric drills.
  if (category !== "strength") {
    return false;
  }

  // Keep yoga poses and spinal-mobility drills
  // available in the library, but outside
  // standard resistance-training slots.
  if (
    family === "mobility" ||
    exercise.id.endsWith("-pose") ||
    exercise.id === "jefferson-curl"
  ) {
    return false;
  }

  const has = (region) =>
    primary.includes(region);

  const posteriorShoulder =
    anatomical.includes("Posterior Deltoid") ||
    anatomical.includes("Rhomboids");

  // Thrusters and similar exercises use
  // significant lower-body involvement.
  // They are not ordinary shoulder presses.
  const combinedUpperLower =
    (has("legs") || has("glutes")) &&
    (has("shoulders") || has("chest"));

  const chestPush =
    (
      family === "horizontal-push" &&
      (has("chest") || has("arms"))
    ) ||
    (
      family === "chest-isolation" &&
      has("chest")
    );

  const shoulderPush =
    !combinedUpperLower &&
    (
      (
        family === "vertical-push" &&
        has("shoulders")
      ) ||
      (
        family === "shoulder-isolation" &&
        has("shoulders") &&
        !posteriorShoulder
      )
    );

  const triceps =
    family === "elbow-extension" &&
    has("arms");

  const backPull =
    (
      family === "horizontal-pull" ||
      family === "vertical-pull" ||
      family === "pull-accessory"
    ) &&
    has("back");

  const rearShoulderPull =
    family === "shoulder-isolation" &&
    posteriorShoulder;

  // Jefferson Curl can be misclassified
  // from its name. Arm isolation requires
  // primary arm involvement.
  const biceps =
    family === "elbow-flexion" &&
    has("arms");

  const squat =
    family === "squat" &&
    (has("legs") || has("glutes"));

  const hip =
    (
      family === "hip-extension" ||
      family === "hip-hinge"
    ) &&
    (has("glutes") || has("legs"));

  const lower =
    LOWER_FAMILIES.has(family) &&
    (
      has("legs") ||
      has("glutes") ||
      has("calves")
    );

  const core =
    CORE_FAMILIES.has(family) &&
    has("abs");

  const push =
    chestPush ||
    shoulderPush ||
    triceps;

  const pull =
    backPull ||
    rearShoulderPull ||
    biceps;

  switch (role) {
    case "push":
      return push;

    case "pull":
      return pull;

    case "upper":
      return push || pull;

    case "lower":
    case "legs":
      return lower;

    case "squat":
      return squat;

    case "hip":
      return hip;

    case "glutes":
      return (
        has("glutes") &&
        (
          hip ||
          squat ||
          family === "lunge"
        )
      );

    case "chest":
      return chestPush && has("chest");

    case "back":
      return backPull;

    case "shoulders":
      return (
        (shoulderPush || rearShoulderPull) &&
        has("shoulders")
      );

    case "arms":
      return biceps || triceps;

    case "core":
      return core;

    case "core-stability":
      return (
        family === "core-stability" &&
        has("abs")
      );

    case "a":
      return push || core;

    case "b":
      return pull;

    case "c":
      return lower || core;

    default:
      // Unknown custom session types are
      // left unrestricted for manual choice.
      return true;
  }
}
