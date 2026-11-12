import { exercises } from "./exercises";

import {
  exerciseGoalAssessmentById,
} from "./exerciseGoalAssessments";

import {
  exerciseAssessmentById,
} from "./exerciseAssessments";

import {
  assessExerciseGoalReadiness,
} from "../utils/exerciseGoalReadiness";

export const exerciseGoalReadiness =
  exercises.map((exercise) =>
    assessExerciseGoalReadiness(
      exercise,
      exerciseGoalAssessmentById.get(
        exercise.id
      ),
      exerciseAssessmentById.get(
        exercise.id
      )
    )
  );

export const exerciseGoalReadinessById =
  new Map(
    exerciseGoalReadiness.map((item) => [
      item.exerciseId,
      item,
    ])
  );

export function getExerciseGoalReadiness(
  exerciseId
) {
  return (
    exerciseGoalReadinessById.get(
      exerciseId
    ) ?? null
  );
}

export function getGoalReadinessReviewQueue() {
  return exerciseGoalReadiness.filter(
    (item) => item.needsReview
  );
}
