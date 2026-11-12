
import { exercises } from "./exercises";

import repdbCatalog from
  "./repdb.catalog.generated.json";

import {
  classifyExercise,
} from "../utils/classifyExercise";

// Preserve the metadata of RepDB entries that
// were overridden by original Gym Tracker IDs.
const repdbById = new Map(
  repdbCatalog.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

// Build one assessment per unique exercise.
// No modification to the original catalog.
export const exerciseAssessments =
  exercises.map((exercise) =>
    classifyExercise(
      exercise,
      repdbById.get(exercise.id) ?? null
    )
  );

// Efficient lookup for future recommendations.
export const exerciseAssessmentById =
  new Map(
    exerciseAssessments.map((assessment) => [
      assessment.exerciseId,
      assessment,
    ])
  );

export function getExerciseAssessment(
  exerciseId
) {
  return (
    exerciseAssessmentById.get(exerciseId) ??
    null
  );
}
