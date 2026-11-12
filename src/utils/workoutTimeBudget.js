import {
  exerciseAssessmentById,
} from "../data/exerciseAssessments";

/**
 * D1.15 - Workout Time Budget
 *
 * Estimates exercise and session duration.
 *
 * These are configurable planning estimates,
 * not guaranteed exercise completion times.
 */

export const SUPPORTED_SESSION_MINUTES =
  Object.freeze([30, 45, 60, 75, 90]);

const CAPACITY = Object.freeze({
  30: { min: 2, target: 3, max: 3 },
  45: { min: 3, target: 4, max: 5 },
  60: { min: 4, target: 6, max: 6 },
  75: { min: 5, target: 7, max: 7 },
  90: { min: 6, target: 8, max: 8 },
});

const COMPOUND_FAMILIES = new Set([
  "squat",
  "lunge",
  "hip-hinge",
  "hip-extension",
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
]);

const GOAL_SETTINGS = Object.freeze({
  "build-muscle": {
    sets: 3,
    reps: 10,
    rest: 90,
  },
  "build-strength": {
    sets: 3,
    reps: 6,
    rest: 150,
  },
  "improve-endurance": {
    sets: 2,
    reps: 15,
    rest: 60,
  },
  "body-recomposition": {
    sets: 3,
    reps: 10,
    rest: 90,
  },
  "general-fitness": {
    sets: 3,
    reps: 10,
    rest: 75,
  },
});

const round = (value) =>
  Math.round(value * 10) / 10;

function validNumber(
  value,
  fallback,
  min,
  max
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max
  )
    ? number
    : fallback;
}

function resolveGoal(profile) {
  return (
    profile?.primaryGoal ??
    profile?.trainingGoal ??
    "general-fitness"
  );
}

/**
 * Divide available time into:
 *
 * - Warm-up
 * - Exercise execution
 * - Safety/time buffer
 *
 * Exercise count is a target, not a quota.
 */
export function getSessionTimeBudget(
  profile = null
) {
  const minutes = Number(
    profile?.sessionDurationMinutes ?? 60
  );

  if (
    !SUPPORTED_SESSION_MINUTES.includes(
      minutes
    )
  ) {
    throw new RangeError(
      "Session duration must be 30, 45, 60, 75, or 90 minutes."
    );
  }

  const warmupMinutes =
    minutes <= 30
      ? 5
      : minutes <= 60
        ? 7
        : 9;

  const reserveMinutes =
    minutes <= 30
      ? 2
      : minutes <= 60
        ? 4
        : 6;

  return {
    durationMinutes: minutes,
    warmupMinutes,
    reserveMinutes,

    availableExerciseMinutes:
      minutes -
      warmupMinutes -
      reserveMinutes,

    exerciseCountGuidance: {
      ...CAPACITY[minutes],
    },
  };
}

/**
 * Estimate one exercise.
 *
 * Supports optional custom targets already
 * used by the Workout Builder.
 */
export function estimateExerciseTime(
  exercise,
  profile = null,
  target = null
) {
  if (!exercise?.id) {
    throw new TypeError(
      "Exercise must have an ID."
    );
  }

  const goal =
    GOAL_SETTINGS[resolveGoal(profile)] ??
    GOAL_SETTINGS["general-fitness"];

  const movementFamily =
    exerciseAssessmentById.get(
      exercise.id
    )?.movementFamily;

  const compound =
    COMPOUND_FAMILIES.has(
      movementFamily
    );

  const sets = Math.round(
    validNumber(
      target?.sets,
      goal.sets,
      1,
      8
    )
  );

  const isTimed =
    target?.targetType === "duration" ||
    (
      target?.targetType == null &&
      exercise.id === "plank"
    );

  const reps = validNumber(
    target?.maxReps ??
      target?.minReps,
    goal.reps,
    1,
    60
  );

  const durationSeconds = validNumber(
    target?.durationSeconds,
    30,
    5,
    3600
  );

  const baseRest =
    goal.rest +
    (
      compound &&
      resolveGoal(profile) !==
        "build-strength"
        ? 20
        : 0
    );

  const restSeconds = validNumber(
    target?.restSeconds,
    baseRest,
    0,
    900
  );

  const unilateral =
    /\b(single[- ](?:arm|leg)|one[- ](?:arm|leg)|split squat|bulgarian|lunge|step[- ]up)\b/i
      .test(
        exercise.name ??
          exercise.id.replaceAll(
            "-",
            " "
          )
      );

  const setSeconds =
    isTimed
      ? durationSeconds
      : reps *
        3.5 *
        (unilateral ? 1.65 : 1);

  // Includes preparation / station change.
  const setupSeconds =
    (exercise.equipment?.length ?? 0) > 0
      ? 75
      : 55;

  const totalSeconds = Math.ceil(
    sets * setSeconds +
    (sets - 1) * restSeconds +
    setupSeconds
  );

  return {
    exerciseId: exercise.id,
    sets,
    reps: isTimed ? null : reps,

    targetType:
      isTimed ? "duration" : "reps",

    restSeconds,

    estimatedSeconds:
      totalSeconds,

    estimatedMinutes:
      round(totalSeconds / 60),
  };
}

/**
 * Evaluate a session's estimated duration.
 */
export function assessSessionTimeBudget(
  exercises,
  profile = null,
  options = {}
) {
  if (!Array.isArray(exercises)) {
    throw new TypeError(
      "Exercises must be an array."
    );
  }

  const budget =
    getSessionTimeBudget(profile);

  const estimates =
    exercises.map((entry) => {
      const exercise =
        entry?.exercise ?? entry;

      const target =
        options.targetsById?.[
          exercise.id
        ] ?? null;

      return estimateExerciseTime(
        exercise,
        profile,
        target
      );
    });

  const exerciseSeconds =
    estimates.reduce(
      (sum, estimate) =>
        sum + estimate.estimatedSeconds,
      0
    );

  const totalSeconds =
    exerciseSeconds +
    (
      budget.warmupMinutes +
      budget.reserveMinutes
    ) * 60;

  const remainingMinutes = round(
    budget.durationMinutes -
      totalSeconds / 60
  );

  return {
    ...budget,

    exerciseCount:
      exercises.length,

    exerciseEstimates: estimates,

    estimatedExerciseMinutes:
      round(exerciseSeconds / 60),

    estimatedTotalMinutes:
      round(totalSeconds / 60),

    remainingMinutes,

    overBudgetMinutes:
      Math.max(
        0,
        round(-remainingMinutes)
      ),

    fitsTime:
      totalSeconds <=
      budget.durationMinutes * 60,

    estimationOnly: true,
  };
}

/**
 * Select as many ranked exercises as
 * reasonably fit inside the time budget.
 *
 * Candidates must already be filtered
 * by equipment and experience level.
 *
 * Session muscle roles are handled by
 * the separate recommendation system.
 */
export function fitRankedExercisesToTime(
  candidates,
  profile = null,
  options = {}
) {
  if (!Array.isArray(candidates)) {
    throw new TypeError(
      "Candidates must be an array."
    );
  }

  const budget =
    getSessionTimeBudget(profile);

  const cap = Math.min(
    budget.exerciseCountGuidance.target,
    options.maxExercises ??
      budget.exerciseCountGuidance.max
  );

  const selectedExercises = [];
  const selectedIds = new Set();

  let totalSeconds =
    (
      budget.warmupMinutes +
      budget.reserveMinutes
    ) * 60;

  for (const entry of candidates) {
    if (
      selectedExercises.length >= cap
    ) {
      break;
    }

    if (
      entry?.eligibleForAutomaticRecommendation ===
      false
    ) {
      continue;
    }

    const exercise =
      entry?.exercise ?? entry;

    if (
      !exercise?.id ||
      selectedIds.has(exercise.id)
    ) {
      continue;
    }

    if (
      typeof options.isAllowed ===
        "function" &&
      !options.isAllowed(exercise)
    ) {
      continue;
    }

    const target =
      options.targetsById?.[
        exercise.id
      ] ?? null;

    const estimate =
      estimateExerciseTime(
        exercise,
        profile,
        target
      );

    if (
      totalSeconds +
        estimate.estimatedSeconds >
      budget.durationMinutes * 60
    ) {
      continue;
    }

    selectedExercises.push(
      exercise
    );

    selectedIds.add(
      exercise.id
    );

    totalSeconds +=
      estimate.estimatedSeconds;
  }

  return {
    selectedExercises,

    ...assessSessionTimeBudget(
      selectedExercises,
      profile,
      options
    ),
  };
}
