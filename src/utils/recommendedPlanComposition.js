import { exercises } from "../data/exercises";

import {
  matchesExerciseRole,
} from "./exerciseTrainingRoles";

import {
  exerciseMuscleRegionsById,
} from "../data/exerciseMuscleRegionAssessments";

/**
 * D1.12 - Recommended plan composition.
 *
 * Evaluates a plan template as a whole.
 * Does not estimate actual weekly set volume.
 */

const exerciseById = new Map(
  exercises.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

const REQUIRED_PATTERNS = Object.freeze([
  "push",
  "pull",
  "lower",
  "core",
]);

const VALID_REGIONS = new Set([
  "glutes",
  "legs",
  "abs",
  "back",
  "chest",
  "shoulders",
  "arms",
  "calves",
]);

const PRIORITY_WEIGHTS = [1, 0.7, 0.45];

function getPriorities(profile) {
  const selected =
    Array.isArray(profile?.musclePriorities)
      ? profile.musclePriorities
      : [];

  return [...new Set(selected)]
    .filter((region) =>
      VALID_REGIONS.has(region)
    )
    .slice(0, 3);
}

function getRegionMatch(
  exerciseIds,
  region
) {
  let hasSecondary = false;

  for (const id of exerciseIds) {
    const muscles =
      exerciseMuscleRegionsById.get(id);

    if (
      muscles?.primaryRegions.includes(region)
    ) {
      return 1;
    }

    if (
      muscles?.secondaryRegions.includes(region)
    ) {
      hasSecondary = true;
    }
  }

  return hasSecondary ? 0.45 : 0;
}

export function evaluatePlanComposition(
  preview,
  profile = null
) {
  if (
    !preview ||
    !Array.isArray(preview.sessions)
  ) {
    throw new Error(
      "A valid plan preview is required."
    );
  }

  const ids = preview.sessions.flatMap(
    (session) =>
      session.exercises.map(
        (exercise) => exercise.id
      )
  );

  const selectedExercises = ids.map((id) => {
    const exercise = exerciseById.get(id);

    if (!exercise) {
      throw new Error(
        "Unknown exercise in plan: " + id
      );
    }

    return exercise;
  });

  const useCounts = new Map();

  for (const id of ids) {
    useCounts.set(
      id,
      (useCounts.get(id) ?? 0) + 1
    );
  }

  const repeatedExerciseIds = [
    ...useCounts.entries(),
  ]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const patternCounts = Object.fromEntries(
    REQUIRED_PATTERNS.map((role) => [
      role,
      selectedExercises.filter(
        (exercise) =>
          matchesExerciseRole(
            exercise,
            role
          )
      ).length,
    ])
  );

  const missingPatterns =
    REQUIRED_PATTERNS.filter(
      (role) => patternCounts[role] === 0
    );

  const priorities = getPriorities(profile);

  const priorityCoverage = priorities.map(
    (region, index) => ({
      region,
      weight: PRIORITY_WEIGHTS[index],
      match: getRegionMatch(ids, region),
    })
  );

  const totalPriorityWeight =
    priorityCoverage.reduce(
      (sum, item) => sum + item.weight,
      0
    );

  const weightedPriorityCoverage =
    priorityCoverage.reduce(
      (sum, item) =>
        sum + item.weight * item.match,
      0
    );

  const totalExercises = ids.length;

  const slotCoverage =
    preview.totalSlots > 0
      ? preview.matchedSlots /
        preview.totalSlots
      : 0;

  const patternCoverage =
    REQUIRED_PATTERNS.length -
    missingPatterns.length;

  const uniqueExerciseCount =
    useCounts.size;

  // Component scores:
  // Availability 35
  // Movement coverage 40
  // Muscle priorities 15
  // Diversity 10

  const availabilityPoints = Math.round(
    Math.max(0, Math.min(1, slotCoverage)) * 35
  );

  const movementPoints =
    patternCoverage * 10;

  const muscleFocusPoints =
    totalExercises === 0
      ? 0
      : totalPriorityWeight === 0
        ? 15
        : Math.round(
            15 *
            weightedPriorityCoverage /
            totalPriorityWeight
          );

  const diversityPoints =
    totalExercises === 0
      ? 0
      : Math.round(
          10 *
          uniqueExerciseCount /
          totalExercises
        );

  const components = {
    availability: availabilityPoints,
    movementCoverage: movementPoints,
    muscleFocus: muscleFocusPoints,
    diversity: diversityPoints,
  };

  const score =
    Object.values(components).reduce(
      (sum, value) => sum + value,
      0
    );

  return {
    score,
    components,

    totalExercises,
    uniqueExerciseCount,
    repeatedExerciseIds,

    patternCounts,
    missingPatterns,

    priorityCoverage,

    // The plan preview contains a template,
    // not an actual weekly volume prescription.
    evaluationScope:
      "plan-template-composition",

    scoringModel:
      "gym-tracker-plan-composition-v1",
  };
}
