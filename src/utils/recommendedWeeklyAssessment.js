import { exercises } from "../data/exercises";

import {
  matchesExerciseRole,
} from "./exerciseTrainingRoles";

import {
  exerciseMuscleRegionsById,
} from "../data/exerciseMuscleRegionAssessments";

/**
 * D1.13 - Weekly recommendation assessment.
 *
 * Evaluates the proposed seven-day schedule.
 *
 * This is a planning heuristic, not a
 * medical recovery test or volume estimate.
 */

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const ROLES = [
  "push",
  "pull",
  "lower",
  "core",
];

const REGIONS = [
  "glutes",
  "legs",
  "abs",
  "back",
  "chest",
  "shoulders",
  "arms",
  "calves",
];

const exerciseById = new Map(
  exercises.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

function getPriorities(profile) {
  const selected =
    Array.isArray(profile?.musclePriorities)
      ? profile.musclePriorities
      : [];

  return [...new Set(selected)]
    .filter((region) =>
      REGIONS.includes(region)
    )
    .slice(0, 3);
}

export function evaluateRecommendedWeek(
  preview,
  schedule,
  profile = null
) {
  if (
    !Array.isArray(preview?.sessions) ||
    !Array.isArray(schedule?.days)
  ) {
    throw new Error(
      "A plan preview and a schedule are required."
    );
  }

  if (
    schedule.days.length !== 7 ||
    new Set(
      schedule.days.map((day) => day.dayId)
    ).size !== 7 ||
    schedule.days.some(
      (day) => !WEEK_DAYS.includes(day.dayId)
    )
  ) {
    throw new Error(
      "The schedule must contain seven unique days."
    );
  }

  const sessionById = new Map(
    preview.sessions.map((session) => [
      session.id,
      session,
    ])
  );

  const dayById = new Map(
    schedule.days.map((day) => [
      day.dayId,
      day,
    ])
  );

  const workoutDays = WEEK_DAYS
    .map((dayId) => dayById.get(dayId))
    .filter(
      (day) => day.activity === "workout"
    )
    .map((day) => {
      const session =
        sessionById.get(day.sessionId);

      const selectedExercises =
        (session?.exercises ?? []).map(
          (item) => {
            const exercise =
              exerciseById.get(item.id);

            if (!exercise) {
              throw new Error(
                "Unknown exercise: " + item.id
              );
            }

            return exercise;
          }
        );

      const primaryRegions = [
        ...new Set(
          selectedExercises.flatMap(
            (exercise) =>
              exerciseMuscleRegionsById
                .get(exercise.id)
                ?.primaryRegions ?? []
          )
        ),
      ];

      const roles = ROLES.filter(
        (role) =>
          selectedExercises.some(
            (exercise) =>
              matchesExerciseRole(
                exercise,
                role
              )
          )
      );

      return {
        dayId: day.dayId,
        sessionId: day.sessionId,
        sessionFound: Boolean(session),
        exerciseIds:
          selectedExercises.map(
            (exercise) => exercise.id
          ),
        primaryRegions,
        roles,
        missingSlots:
          session?.missingSlots.length ?? 0,
      };
    });

  const patternDayCounts =
    Object.fromEntries(
      ROLES.map((role) => [
        role,
        workoutDays.filter(
          (day) => day.roles.includes(role)
        ).length,
      ])
    );

  const missingPatterns =
    ROLES.filter(
      (role) =>
        patternDayCounts[role] === 0
    );

  const primaryRegionDayCounts =
    Object.fromEntries(
      REGIONS.map((region) => [
        region,
        workoutDays.filter(
          (day) =>
            day.primaryRegions.includes(region)
        ).length,
      ])
    );

  const sessionDistribution = {};

  for (const day of workoutDays) {
    const key =
      day.sessionId ?? "unassigned";

    sessionDistribution[key] =
      (sessionDistribution[key] ?? 0) + 1;
  }

  const sameRegionConsecutiveDays = [];

  // Inspect all seven calendar boundaries,
  // including Sunday -> next Monday.
  for (let index = 0; index < 7; index++) {
    const firstDay = WEEK_DAYS[index];
    const nextDay =
      WEEK_DAYS[(index + 1) % 7];

    const first = workoutDays.find(
      (day) => day.dayId === firstDay
    );

    const second = workoutDays.find(
      (day) => day.dayId === nextDay
    );

    if (!first || !second) continue;

    const sharedRegions =
      first.primaryRegions.filter(
        (region) =>
          second.primaryRegions.includes(
            region
          )
      );

    if (sharedRegions.length > 0) {
      sameRegionConsecutiveDays.push({
        firstDay,
        nextDay,
        regions: sharedRegions,
      });
    }
  }

  const priorities = getPriorities(profile);

  // Two weekly exposures are used as a
  // planning preference, not a medical rule.
  const priorityTargetDays = Math.min(
    2,
    workoutDays.length
  );

  const priorityCoverage = priorities.map(
    (region) => ({
      region,
      days:
        primaryRegionDayCounts[region],
      targetDays: priorityTargetDays,
    })
  );

  const scheduledSlots =
    workoutDays.reduce(
      (total, day) =>
        total +
        day.exerciseIds.length +
        day.missingSlots,
      0
    );

  const matchedSlots =
    workoutDays.reduce(
      (total, day) =>
        total +
        day.exerciseIds.length,
      0
    );

  // Internal score components:
  // Available exercise slots: 20
  // Push / Pull / Lower / Core: 40
  // Priority-region frequency: 20
  // Spacing opportunities: 20

  const availabilityPoints =
    scheduledSlots === 0
      ? 0
      : Math.round(
          (20 * matchedSlots) /
          scheduledSlots
        );

  const movementCoveragePoints =
    (ROLES.length -
      missingPatterns.length) * 10;

  const muscleFrequencyPoints =
    workoutDays.length === 0
      ? 0
      : priorities.length === 0
        ? 20
        : Math.round(
            20 *
            priorityCoverage.reduce(
              (total, item) =>
                total +
                (
                  item.targetDays === 0
                    ? 0
                    : Math.min(
                        1,
                        item.days /
                          item.targetDays
                      )
                ),
              0
            ) /
            priorities.length
          );

  // A scheduling signal, not a diagnosis
  // of inadequate physiological recovery.
  const spacingPoints = Math.max(
    0,
    20 -
      sameRegionConsecutiveDays.length * 4
  );

  const components = {
    availability: availabilityPoints,
    movementCoverage:
      movementCoveragePoints,
    muscleFrequency:
      muscleFrequencyPoints,
    spacing: spacingPoints,
  };

  const score =
    Object.values(components).reduce(
      (sum, points) => sum + points,
      0
    );

  const missingSessions =
    workoutDays.filter(
      (day) => !day.sessionFound
    );

  const warnings = [];

  for (const role of missingPatterns) {
    warnings.push(
      "missing-weekly-pattern:" + role
    );
  }

  if (matchedSlots < scheduledSlots) {
    warnings.push(
      "unfilled-training-slots"
    );
  }

  if (missingSessions.length > 0) {
    warnings.push(
      "missing-session-definition"
    );
  }

  if (
    sameRegionConsecutiveDays.length > 0
  ) {
    warnings.push(
      "same-region-on-consecutive-days"
    );
  }

  if (
    priorityCoverage.some(
      (item) =>
        item.days < item.targetDays
    )
  ) {
    warnings.push(
      "priority-frequency-below-preference"
    );
  }

  return {
    score,
    components,
    workoutDayCount: workoutDays.length,
    workoutDays,
    patternDayCounts,
    missingPatterns,
    primaryRegionDayCounts,
    priorityCoverage,
    sessionDistribution,
    sameRegionConsecutiveDays,
    missingSessions:
      missingSessions.map(
        (day) => day.dayId
      ),
    scheduledSlots,
    matchedSlots,
    warnings,
    status:
      warnings.length === 0
        ? "no-flags"
        : "needs-review",
    scoringModel:
      "gym-tracker-weekly-composition-v1",
    evaluationScope:
      "proposed-weekly-template",
    // Actual sets, intensity, fatigue and
    // individual recovery are not measured.
    recoveryAdequacy:
      "not-determined",
  };
}
