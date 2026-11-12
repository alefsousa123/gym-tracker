import {
  exerciseAssessmentById,
} from "../data/exerciseAssessments";

import {
  exerciseGoalReadinessById,
} from "../data/exerciseGoalReadiness";

import {
  exerciseMuscleRegionsById,
} from "../data/exerciseMuscleRegionAssessments";

import {
  getExercisePopularity,
} from "../data/exercisePopularityShares";

import {
  matchesExerciseRole,
} from "./exerciseTrainingRoles";

import {
  scoreMuscleCoverage,
  refineMovementScore,
  isHighSkillForBeginner,
} from "./exerciseScoreCalibration";

/**
 * D1.6 - Internal personalized recommendation engine.
 *
 * This is a product suitability score, not a
 * scientifically measured exercise efficacy.
 *
 * Max components: 35 + 25 + 20 + 10 + 10 = 100.
 */

export const RECOMMENDATION_WEIGHTS =
  Object.freeze({
    goal: 35,
    movement: 25,
    muscleFocus: 20,
    difficulty: 10,
    popularity: 10,
  });

const GOAL_STATUS_POINTS = {
  "catalog-indicator": 35,
  "indirect-catalog-indicator": 27,
  "provisional": 25,
  "indirect-provisional": 19,
  "requires-review": 13,
  "not-indicated": 4,
};

const LEVEL_POINTS = {
  beginner: {
    beginner: 10,
    intermediate: 5,
    advanced: 0,
  },
  intermediate: {
    beginner: 8,
    intermediate: 10,
    advanced: 3,
  },
  advanced: {
    beginner: 6,
    intermediate: 9,
    advanced: 10,
  },
};

const STRENGTH_FAMILIES = new Set([
  "squat",
  "lunge",
  "hip-hinge",
  "hip-extension",
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
]);

function clamp(value, maximum) {
  return Math.max(
    0,
    Math.min(maximum, value)
  );
}

function normalizedGoal(profile) {
  return (
    profile?.primaryGoal ??
    profile?.trainingGoal ??
    "general-fitness"
  );
}

function goalPoints(goal, readiness) {
  const status =
    readiness?.profileMatches?.[goal]?.status ??
    "not-indicated";

  return GOAL_STATUS_POINTS[status] ?? 4;
}

function scoreGoal(profile, readiness) {
  const primary = normalizedGoal(profile);
  const secondary = profile?.secondaryGoal;

  const primaryPoints = goalPoints(
    primary,
    readiness
  );

  if (!secondary || secondary === primary) {
    return primaryPoints;
  }

  return Math.round(
    primaryPoints * 0.8 +
    goalPoints(secondary, readiness) * 0.2
  );
}

function scoreMovement(goal, movement, readiness) {
  const family =
    movement?.movementFamily ?? "unclassified";

  const category =
    readiness?.category ?? "strength";

  const strengthPattern =
    STRENGTH_FAMILIES.has(family);

  if (goal === "build-muscle") {
    if (family === "mobility") return 5;
    if (category === "cardio") return 5;
    if (category === "stretching") return 5;
    if (category === "strength") {
      return strengthPattern ? 23 : 21;
    }
    return 12;
  }

  if (goal === "build-strength") {
    if (strengthPattern) return 25;
    if (category === "olympic") return 22;
    if (category === "strength") return 18;
    return 6;
  }

  if (goal === "improve-endurance") {
    if (category === "cardio") return 9;
    if (category === "strength") return 22;
    if (family === "conditioning") return 18;
    return 12;
  }

  if (goal === "body-recomposition") {
    if (category === "strength") return 23;
    if (category === "cardio") return 14;
    return 10;
  }

  if (category === "strength") return 22;
  if (category === "cardio") return 21;
  if (category === "plyometrics") return 19;
  if (category === "olympic") return 19;
  if (family === "mobility") return 18;

  return 14;
}

function scoreMuscleFocus(
  profile,
  muscles
) {
  return scoreMuscleCoverage(
    profile,
    muscles
  );
}

function scoreDifficulty(profile, exercise) {
  const userLevel =
    String(
      profile?.experienceLevel ?? "beginner"
    ).toLowerCase();

  const exerciseLevel =
    String(
      exercise.difficulty ?? ""
    ).toLowerCase();

  return (
    LEVEL_POINTS[userLevel]?.[exerciseLevel] ??
    5
  );
}

function scorePopularity(exerciseId) {
  const popularity =
    getExercisePopularity(exerciseId);

  // An unmeasured movement is not unpopular.
  // It receives a neutral component.
  if (popularity.share === null) {
    return 4;
  }

  const normalized =
    Math.log1p(popularity.share) /
    Math.log1p(9.7);

  return clamp(
    Math.round(4 + normalized * 6),
    10
  );
}

export function scoreExerciseForUser(
  exercise,
  options = {}
) {
  const profile = options.profile ?? null;

  const movement =
    exerciseAssessmentById.get(exercise.id);

  const readiness =
    exerciseGoalReadinessById.get(exercise.id);

  const muscles =
    exerciseMuscleRegionsById.get(exercise.id);

  const level =
    String(
      profile?.experienceLevel ?? "beginner"
    ).toLowerCase();

  const exerciseLevel =
    String(
      exercise.difficulty ?? ""
    ).toLowerCase();

  const isAvailable =
    typeof options.isAvailable === "function"
      ? Boolean(options.isAvailable(exercise))
      : true;

  // Beginners do not receive advanced moves
  // as automatic recommendations.
  const levelAllowed = !(
    level === "beginner" &&
    (
      exerciseLevel === "advanced" ||
      isHighSkillForBeginner(
        exercise,
        movement,
        readiness
      )
    )
  );

  const goal = scoreGoal(
    profile,
    readiness
  );

  const movementPoints =
    refineMovementScore({
      exercise,
      profile,
      movement,
      readiness,
      baseScore: scoreMovement(
        normalizedGoal(profile),
        movement,
        readiness
      ),
    });

  const muscleFocus = scoreMuscleFocus(
    profile,
    muscles
  );

  const difficulty = scoreDifficulty(
    profile,
    exercise
  );

  const popularity = scorePopularity(
    exercise.id
  );

  const score = clamp(
    goal +
    movementPoints +
    muscleFocus +
    difficulty +
    popularity,
    100
  );

  return {
    exerciseId: exercise.id,
    score,

    eligibleForAutomaticRecommendation:
      isAvailable && levelAllowed,

    components: {
      goal,
      movement: movementPoints,
      muscleFocus,
      difficulty,
      popularity,
    },

    popularitySource:
      getExercisePopularity(exercise.id).source,

    scoringModel:
      "gym-tracker-suitability-v2",

    // A computed recommendation, not an
    // effectiveness rating from clinical trials.
    isScientificEfficacyGrade: false,
  };
}

export function rankExercisesForUser(
  candidates,
  options = {}
) {
  return candidates
    .map((exercise) => ({
      exercise,
      ...scoreExerciseForUser(
        exercise,
        options
      ),
    }))
    .sort((first, second) =>
      Number(
        second.eligibleForAutomaticRecommendation
      ) -
      Number(
        first.eligibleForAutomaticRecommendation
      ) ||
      second.score - first.score ||
      first.exercise.name.localeCompare(
        second.exercise.name
      )
    );
}

/**
 * Template slots preserve training balance.
 * Muscle priorities affect the ranking INSIDE
 * each slot, not the type of slot itself.
 */

/**
 * Apply the same functional compatibility
 * rules used by the Workout Builder.
 */
export function isExerciseForPlanSlot(
  exercise,
  slotLabel
) {
  const roles = {
    "Squat Pattern": "squat",
    "Upper Body Push": "chest",
    "Upper Body Pull": "back",
    "Hip Extension": "hip",
    "Core Stability": "core-stability",
    "Chest Exercise": "chest",
    "Back Exercise": "back",
    "Shoulder Exercise": "shoulders",
    "Arm Exercise": "arms",
    "Glute Exercise": "glutes",
    "Core Exercise": "core",
  };

  const role = roles[slotLabel];

  if (!role) return false;

  return matchesExerciseRole(
    exercise,
    role
  );
}
