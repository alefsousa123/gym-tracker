import { exercises } from "./exercises";

import repdbCatalog from
  "./repdb.catalog.generated.json";

import { trainingFocusAreas } from
  "./trainingFocusOptions";

import {
  classifyExerciseMuscleRegions,
} from "../utils/exerciseMuscleRegions";

const repdbById = new Map(
  repdbCatalog.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

const validFocusRegions = new Set(
  trainingFocusAreas.map((area) => area.id)
);

export const exerciseMuscleRegionAssessments =
  exercises.map((exercise) =>
    classifyExerciseMuscleRegions(
      exercise,
      repdbById.get(exercise.id) ?? null
    )
  );

export const exerciseMuscleRegionsById = new Map(
  exerciseMuscleRegionAssessments.map(
    (assessment) => [
      assessment.exerciseId,
      assessment,
    ]
  )
);

export function getExerciseMuscleRegions(
  exerciseId
) {
  return (
    exerciseMuscleRegionsById.get(exerciseId) ??
    null
  );
}

/**
 * Shows how an exercise relates to the user's
 * selected training priorities.
 *
 * Does NOT assign scores or exclude other
 * muscle groups.
 */
export function matchExerciseMusclePriorities(
  exerciseId,
  selectedPriorities = []
) {
  const assessment =
    getExerciseMuscleRegions(exerciseId);

  if (!assessment) return null;

  const priorities = [
    ...new Set(
      (Array.isArray(selectedPriorities)
        ? selectedPriorities
        : []
      ).filter(
        (id) => validFocusRegions.has(id)
      )
    ),
  ];

  return {
    exerciseId,

    matchedPrimary: priorities.filter(
      (id) =>
        assessment.primaryRegions.includes(id)
    ),

    matchedSecondary: priorities.filter(
      (id) =>
        assessment.secondaryRegions.includes(id)
    ),

    // Other regions still remain eligible
    // for balanced workout planning.
    otherPrimaryRegions:
      assessment.primaryRegions.filter(
        (id) => !priorities.includes(id)
      ),
  };
}
