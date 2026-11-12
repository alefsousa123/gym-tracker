import {
  exerciseAssessmentById,
} from "../data/exerciseAssessments";

/**
 * D1.19.1 - Exercise-selection quality.
 *
 * Heuristics used only to choose between
 * eligible exercises within a workout slot.
 *
 * These adjustments do not change the
 * personalized 0-100 exercise score.
 */

const BEGINNER_TECHNICAL_EXCLUSIONS = new Set([
  "kettlebell-turkish-get-ups",
  "kettlebell-windmills",
  "jefferson-curl",
  "thruster",
]);

export function isAppropriateForAutomaticSelection(
  exercise,
  profile
) {
  if (!exercise?.id) return false;

  if (
    profile?.experienceLevel === "beginner" &&
    BEGINNER_TECHNICAL_EXCLUSIONS.has(
      exercise.id
    )
  ) {
    return false;
  }

  return true;
}

export function getSelectionMovementFamily(
  exercise
) {
  return (
    exerciseAssessmentById.get(
      exercise.id
    )?.movementFamily ??
    "unknown"
  );
}

/**
 * Group especially similar variations
 * that may have different catalog labels.
 */
export function getSelectionVariationKey(
  exercise
) {
  const id = exercise.id;

  if (
    /(?:^|-)barbell-curl(?:$|-)/.test(id) ||
    id === "close-grip-barbell-curl"
  ) {
    return "barbell-curl-family";
  }

  if (
    id === "bodyweight-squat" ||
    exercise.variationGroup === "squat"
  ) {
    return "squat-family";
  }

  return (
    exercise.variationGroup ??
    exercise.id
  );
}

/**
 * Role-specific ranking adjustments.
 *
 * A role bonus is not a measure of
 * exercise efficacy or a safety rating.
 */
export function roleMatchPreference(
  exercise,
  role
) {
  const family =
    getSelectionMovementFamily(
      exercise
    );

  switch (role) {
    case "glutes":
      if (
        family === "hip-extension" ||
        family === "hip-isolation"
      ) {
        return 13;
      }

      if (family === "hip-hinge") {
        return 7;
      }

      if (family === "lunge") {
        return 3;
      }

      if (family === "squat") {
        return 0;
      }

      return 0;

    case "legs":
      if (family === "squat") return 10;
      if (family === "lunge") return 9;

      if (
        family === "knee-extension" ||
        family === "knee-flexion"
      ) {
        return 9;
      }

      if (family === "hip-hinge") {
        return 3;
      }

      return 0;

    case "chest":
      if (
        family === "horizontal-push" ||
        family === "chest-isolation"
      ) {
        return 6;
      }

      return 0;

    case "back":
      if (
        family === "horizontal-pull" ||
        family === "vertical-pull"
      ) {
        return 7;
      }

      return 0;

    case "shoulders":
      if (
        family === "shoulder-isolation" ||
        family === "vertical-push"
      ) {
        return 6;
      }

      return 0;

    case "core":
      if (family === "core-stability") {
        return 9;
      }

      if (
        family === "core-flexion" ||
        family === "core-rotation"
      ) {
        return 6;
      }

      return -4;

    case "biceps":
      return family === "elbow-flexion"
        ? 5
        : 0;

    case "triceps":
      return family === "elbow-extension"
        ? 5
        : 0;

    case "calves":
      return family === "calf"
        ? 7
        : 0;

    default:
      return 0;
  }
}
