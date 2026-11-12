import {
  CURATED_RECOMMENDATION_TAG,
  CURATED_RECOMMENDATION_BONUS,
} from "../data/exerciseRecommendationTags";
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

export const RECOMMENDATION_WEIGHTS = Object.freeze({
  goal: 45,
  effectiveness: 40,
  movement: 25,
  muscleFocus: 20,
  difficulty: 16,
  popularity: 30,
  programming: 20,
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
  const { share } = getExercisePopularity(exerciseId);

  if (share === null) return 10;
  if (share >= 2) return 30;
  if (share >= 1) return 20;

  return 10;
}

const FOUNDATION_IDS = new Set([
  "bench-press", "chest-press-machine", "dumbbell-chest-press",
  "incline-db-press", "cable-fly", "push-up", "lat-pulldown",
  "pull-up", "seated-cable-row", "chest-supported-machine-row",
  "barbell-row", "dumbbell-row", "squat", "bodyweight-squat",
  "goblet-squat", "leg-press", "hack-squat", "leg-extension",
  "leg-curl", "seated-leg-curl", "romanian-deadlift",
  "deadlift", "hip-thrust", "glute-bridge", "ohp",
  "dumbbell-shoulder-press", "machine-shoulder-press",
  "lateral-raise", "barbell-curl", "biceps-curl",
  "hammer-curl", "tricep-pushdown", "plank",
]);

const GOAL_FOUNDATIONS = {
  "build-muscle": new Set([
    "bench-press", "chest-press-machine", "dumbbell-chest-press",
    "incline-db-press", "cable-fly", "lat-pulldown",
    "seated-cable-row", "chest-supported-machine-row",
    "squat", "leg-press", "hack-squat", "leg-extension",
    "leg-curl", "seated-leg-curl", "romanian-deadlift",
    "hip-thrust", "machine-shoulder-press", "lateral-raise",
    "barbell-curl", "biceps-curl", "tricep-pushdown",
  ]),
  "build-strength": new Set([
    "bench-press", "squat", "deadlift", "romanian-deadlift",
    "ohp", "barbell-row", "lat-pulldown", "pull-up",
    "chest-supported-machine-row", "leg-press", "dumbbell-row",
  ]),
  "improve-endurance": new Set([
    "bodyweight-squat", "goblet-squat", "push-up",
    "glute-bridge", "lat-pulldown", "chest-press-machine",
    "leg-press", "seated-cable-row", "plank",
  ]),
  "general-fitness": new Set([
    "bodyweight-squat", "goblet-squat", "push-up",
    "glute-bridge", "plank", "lat-pulldown",
    "chest-press-machine", "leg-press", "dumbbell-row",
  ]),
};

function scoreProgramming(exercise, profile, movement, readiness) {
  const goal = normalizedGoal(profile);

  const foundations = goal === "body-recomposition"
    ? GOAL_FOUNDATIONS["build-muscle"]
    : GOAL_FOUNDATIONS[goal];

  let points = foundations?.has(exercise.id)
    ? 10
    : FOUNDATION_IDS.has(exercise.id) ? 8 : 5;

  const tags = exercise.tags ?? [];
  const category = readiness?.category ?? exercise.category;
  const name = exercise.name ?? "";
  const equipment = exercise.equipment ?? [];
  const family = movement?.movementFamily ?? "unclassified";

  const balance = /balance dome|bosu/i.test(name) ||
    equipment.some((item) => /balance dome|bosu/i.test(item));

  if (balance) points = Math.min(points, 1);

  if (tags.includes("warm_up") || /inchworm/i.test(name)) {
    points = Math.min(points, 2);
  }

  if (/scapular|negative pull|knee push/i.test(name)) {
    points = Math.min(points, 3);
  }

  if (/hold|isometric/i.test(name) && goal !== "general-fitness") {
    points = Math.min(points, 3);
  }

  if (category === "stretching" || family === "mobility") {
    points = Math.min(points, 2);
  }

  if (goal === "build-strength" &&
      ["knee-extension", "knee-flexion", "chest-isolation",
       "shoulder-isolation", "elbow-flexion", "elbow-extension"]
        .includes(family)) {
    points = Math.min(points, 6);
  }

  return points;
}

function calibratedGoal(profile, readiness, exercise) {
  const primary = normalizedGoal(profile);

  let points = Math.round(
    scoreGoal(profile, readiness) * 30 / 35
  );

  const goals = readiness?.catalogGoals ?? exercise.goals ?? [];

  // A resistance exercise with a hypertrophy
  // catalog tag can still contribute to general
  // fitness or strength training.
  // This is a suitability heuristic, not a
  // scientific efficacy measurement.
  if (
    readiness?.category === "strength" &&
    goals.includes("hypertrophy")
  ) {
    if (primary === "general-fitness") {
      points = Math.max(points, 24);
    }

    if (primary === "build-strength") {
      points = Math.max(points, 22);
    }
  }

  // Muscular endurance can include repeatable
  // resistance-training movements.
  if (primary === "improve-endurance" &&
      readiness?.category === "strength" &&
      (goals.includes("strength") || goals.includes("hypertrophy"))) {
    points = Math.max(points, 20);
  }

  // Warm-up movements should not dominate
  // the main training session.
  if (primary === "improve-endurance" &&
      (exercise.tags ?? []).includes("warm_up")) {
    points = Math.min(points, 19);
  }

  return clamp(points, 30);
}

function scoreEstimatedContribution(
  exercise,
  profile,
  movement,
  readiness
) {
  const goal = normalizedGoal(profile);
  const family = movement?.movementFamily ?? "unclassified";
  const category =
    readiness?.category ?? exercise.category ?? "strength";
  const catalogGoals =
    readiness?.catalogGoals ?? exercise.goals ?? [];
  const tags = exercise.tags ?? [];

  const compoundFamilies = new Set([
    "squat", "lunge", "hip-hinge", "hip-extension",
    "horizontal-push", "vertical-push",
    "horizontal-pull", "vertical-pull",
  ]);

  const isolationFamilies = new Set([
    "chest-isolation", "shoulder-isolation",
    "hip-isolation", "knee-extension", "knee-flexion",
    "elbow-flexion", "elbow-extension", "calf",
  ]);

  let points;

  if (category === "strength") {
    if (
      goal === "build-muscle" ||
      goal === "body-recomposition"
    ) {
      points = catalogGoals.includes("hypertrophy")
        ? 34
        : catalogGoals.includes("strength") ? 26 : 20;

      if (
        compoundFamilies.has(family) ||
        isolationFamilies.has(family)
      ) {
        points += 6;
      }
    } else if (goal === "build-strength") {
      points = catalogGoals.includes("strength")
        ? 32
        : catalogGoals.includes("hypertrophy") ? 26 : 18;

      points += compoundFamilies.has(family) ? 8 : 3;
    } else if (goal === "improve-endurance") {
      points = catalogGoals.includes("endurance")
        ? 35
        : (
            catalogGoals.includes("strength") ||
            catalogGoals.includes("hypertrophy")
          )
          ? 30
          : 24;

      if (family === "core-stability") points += 4;
    } else {
      points = 30;

      if (compoundFamilies.has(family)) points += 6;
      if (family === "core-stability") points += 4;
    }
  } else if (goal === "general-fitness") {
    points = category === "cardio" ? 24 : 18;
  } else if (goal === "improve-endurance") {
    points = category === "cardio" ? 10 : 8;
  } else {
    points = 5;
  }

  if (tags.includes("warm_up")) {
    points = Math.round(points * 0.55);
  }

  if (
    /balance dome|bosu/i.test(exercise.name ?? "") &&
    (
      goal === "build-muscle" ||
      goal === "build-strength"
    )
  ) {
    points = Math.round(points * 0.7);
  }

  return clamp(points, 40);
}


function scoreMainMovementPriority(exercise, profile, movement) {
  const goal = normalizedGoal(profile);
  const family = movement?.movementFamily ?? "unclassified";

  // These scores represent default programming suitability,
  // not experimentally measured exercise effectiveness.
  const compound = new Set([
    "squat", "lunge", "hip-hinge", "hip-extension",
    "horizontal-push", "vertical-push",
    "horizontal-pull", "vertical-pull",
  ]);

  const isolation = new Set([
    "chest-isolation", "shoulder-isolation",
    "hip-isolation", "knee-extension", "knee-flexion",
    "elbow-flexion", "elbow-extension", "calf",
  ]);

  const core = new Set([
    "core-stability", "core-flexion",
    "core-rotation", "core-lateral-flexion",
  ]);

  if (compound.has(family)) return 30;

  if (isolation.has(family)) {
    return goal === "build-strength" ? 18 : 28;
  }

  if (core.has(family)) {
    return goal === "improve-endurance" ? 28 : 24;
  }

  // Pullovers are useful accessories, but usually
  // should not replace rows and pulldowns by default.
  if (family === "pull-accessory") return 5;

  // Exercises without a well-established movement
  // family are retained, but not strongly prioritized.
  if (family === "unclassified") return 7;

  if (family === "mobility") {
    return goal === "general-fitness" ? 14 : 3;
  }

  return 10;
}

export function scoreExerciseForUser(exercise, options = {}) {
  const profile = options.profile ?? null;
  const movement = exerciseAssessmentById.get(exercise.id);
  const readiness = exerciseGoalReadinessById.get(exercise.id);
  const muscles = exerciseMuscleRegionsById.get(exercise.id);

  const level = String(
    profile?.experienceLevel ?? "beginner"
  ).toLowerCase();

  const exerciseLevel = String(
    exercise.difficulty ?? ""
  ).toLowerCase();

  const available =
    typeof options.isAvailable === "function"
      ? Boolean(options.isAvailable(exercise))
      : true;

  const levelAllowed = !(
    level === "beginner" &&
    (
      exerciseLevel === "advanced" ||
      isHighSkillForBeginner(exercise, movement, readiness)
    )
  );

  // Complexity is not efficacy.
  // Experienced users can receive full credit
  // for exercises classified as beginner.

  const experiencePoints =
    level === "advanced"
      ? 16
      : level === "intermediate"
        ? Math.round(
            scoreDifficulty(profile, exercise) * 1.6
          )
        : exerciseLevel === "beginner"
          ? 16
          : exerciseLevel === "intermediate"
            ? 10
            : 0;

  const components = {
    curated: exercise.recommendationTags?.includes(
      CURATED_RECOMMENDATION_TAG
    ) ? CURATED_RECOMMENDATION_BONUS : 0,
    goal: Math.round(
      calibratedGoal(profile, readiness, exercise) * 1.5
    ),

    effectiveness: scoreEstimatedContribution(
      exercise,
      profile,
      movement,
      readiness
    ),

    movement: refineMovementScore({
      exercise,
      profile,
      movement,
      readiness,
      baseScore: scoreMovement(
        normalizedGoal(profile),
        movement,
        readiness
      ),
    }),

    muscleFocus: scoreMuscleFocus(profile, muscles),
    difficulty: experiencePoints,
    popularity: scorePopularity(exercise.id),

    mainMovement: scoreMainMovementPriority(
      exercise, profile, movement
    ),
    programming: scoreProgramming(
      exercise,
      profile,
      movement,
      readiness
    ) * 2,
  };

  return {
    exerciseId: exercise.id,

    score: Object.values(components).reduce(
      (sum, value) => sum + value,
      0
    ),

    eligibleForAutomaticRecommendation:
      available && levelAllowed,

    components,

    popularitySource:
      getExercisePopularity(exercise.id).source,

    effectivenessEvidence:
      "catalog-and-movement-heuristic",

    scoringModel:
      "gym-tracker-additive-points-v1",

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
