import { exercises } from "./exercises";

import repdbCatalog from
  "./repdb.catalog.generated.json";

import {
  exerciseAssessmentById,
} from "./exerciseAssessments";

import {
  assessExerciseGoalSignals,
} from "../utils/exerciseGoalSignals";

const repdbById = new Map(
  repdbCatalog.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

export const exerciseGoalAssessments =
  exercises.map((exercise) =>
    assessExerciseGoalSignals(
      exercise,
      repdbById.get(exercise.id) ?? null,
      exerciseAssessmentById.get(exercise.id) ?? null
    )
  );

export const exerciseGoalAssessmentById =
  new Map(
    exerciseGoalAssessments.map((item) => [
      item.exerciseId,
      item,
    ])
  );

export function getExerciseGoalAssessment(
  exerciseId
) {
  return (
    exerciseGoalAssessmentById.get(exerciseId) ??
    null
  );
}

export function getExerciseGoalReviewQueue() {
  return exerciseGoalAssessments.filter(
    (item) => item.needsGoalReview
  );
}
