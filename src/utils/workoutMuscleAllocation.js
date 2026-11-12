import {
  createWeeklyTemplate,
  getSuggestedSplit,
  workoutSplits,
} from "../data/workoutSplits";

import {
  getSessionTimeBudget,
} from "./workoutTimeBudget";

/**
 * D1.16 - Weekly Muscle Allocation
 *
 * Allocates exercise slots, not actual exercises.
 * Goals and muscle priorities affect distribution.
 *
 * Exercise suitability, equipment and final
 * time validation happen in later stages.
 */

const BASE_ROLES = {
  upper: ["chest", "back", "shoulders"],
  lower: ["legs", "glutes", "core"],

  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "back"],
  legs: ["legs", "glutes", "core"],

  a: ["chest", "chest", "triceps"],
  b: ["back", "back", "biceps"],
  c: ["legs", "glutes", "shoulders"],
};

const EXTRA_POOLS = {
  "full-body": [
    "core", "glutes", "shoulders",
    "chest", "back", "legs",
    "biceps", "triceps", "calves",
  ],

  upper: [
    "chest", "back", "shoulders",
    "biceps", "triceps", "core",
  ],

  lower: [
    "legs", "glutes", "core", "calves",
  ],

  push: [
    "chest", "triceps", "shoulders", "core",
  ],

  pull: [
    "back", "biceps", "core",
  ],

  legs: [
    "legs", "glutes", "core", "calves",
  ],

  a: [
    "chest", "triceps", "shoulders", "core",
  ],

  b: [
    "back", "biceps", "core",
  ],

  c: [
    "legs", "glutes", "shoulders",
    "core", "calves",
  ],
};

const REGIONS = [
  "chest", "back", "legs", "glutes",
  "shoulders", "arms", "abs", "calves",
];

const MAJOR_COVERAGE = [
  "chest", "back", "legs", "core",
];

function toRegion(role) {
  if (role === "core") return "abs";

  if (
    role === "biceps" ||
    role === "triceps"
  ) {
    return "arms";
  }

  return role;
}

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

function getBaseRoles(sessionId, dayIndex, targetCount) {
  // D2.3M: Calves replace the default core
  // slot on longer PPL leg days.
  if (
    sessionId === "legs" && targetCount >= 4
  ) {
    return ["legs", "glutes", "calves"];
  }
  if (
    sessionId === "full-body" ||
    sessionId === "custom"
  ) {
    // Rotate a smaller full-body session to
    // preserve weekly core coverage at 30 min.
    return dayIndex % 3 === 1
      ? ["glutes", "back", "core"]
      : ["legs", "chest", "back"];
  }

  return [
    ...(BASE_ROLES[sessionId] ?? [
      "legs", "chest", "back",
    ]),
  ];
}

function getPool(sessionId) {
  return EXTRA_POOLS[sessionId] ??
    EXTRA_POOLS["full-body"];
}

function countInSession(slots, role) {
  return slots.filter(
    (slot) => slot.role === role
  ).length;
}

function extraPriorityPoints(
  role,
  priorities
) {
  const index =
    priorities.indexOf(toRegion(role));

  if (index === -1) return 0;

  return [12, 8, 5][index] ?? 0;
}

function chooseExtraRole({
  pool,
  slots,
  priorities,
  weeklyRoleCounts,
  sessionId,
  targetCount,
}) {
  let bestRole = null;
  let bestScore = -Infinity;

  for (const role of pool) {
    const current = countInSession(slots, role);
    // D2.3N-FIX: Weekly role budgeting.
    const region = toRegion(role);
    const regionCaps = {
      chest: 6, back: 6, legs: 6, glutes: 5,
      shoulders: 4, arms: 8, abs: 2, calves: 4,
    };
    const isAbsPriority = priorities.includes("abs");
    const coreWeekCap = isAbsPriority ? 4 : 2;

    // Preserve the core slot needed by Pull and ABC-B.
    // Avoid additional core on priority A/Legs days.
    if (role === "core" && (
      current >= 1 ||
      (weeklyRoleCounts.core ?? 0) >= coreWeekCap ||
      (isAbsPriority && ["a", "legs"].includes(sessionId))
    )) continue;

    const weeklyRegionSlots = Object.entries(weeklyRoleCounts)
      .reduce((sum, [existingRole, count]) =>
        sum + (toRegion(existingRole) === region ? count : 0), 0);

    const cap = region === "abs" && isAbsPriority
      ? coreWeekCap : (regionCaps[region] ?? 5);

    // Penalize only when exceeding the preferred cap.
    // This remains a preference, except for core.
    const overCap = Math.max(0, weeklyRegionSlots + 1 - cap);
    const weeklyRegionPenalty = overCap * 30;
    const sessionRegionPenalty = 0;

    // D2.3M: Applies only to nonpriority core.
    if (
      role === "core" &&
      !priorities.includes("abs")
    ) {
      if (
        targetCount >= 4 &&
        ["a", "push", "c", "upper", "legs"]
          .includes(sessionId)
      ) {
        continue;
      }

      const maxCoreSlots =
        targetCount >= 7 ? 2 : 1;

      if (current >= maxCoreSlots) {
        continue;
      }
    }

    // Preserve balanced default sessions.
    // Extra arm-isolation slots are limited
    // to two per session. Manual editing remains free.
    const maxSlots =
      role === "biceps" || role === "triceps"
        ? 2
        : 3;

    if (current >= maxSlots) continue;

    const weeklyCount =
      weeklyRoleCounts[role] ?? 0;

    const priorityPoints =
      extraPriorityPoints(role, priorities);

    const firstInSession =
      current === 0 ? 4 : 0;

    const firstInWeek =
      weeklyCount === 0 ? 3 : 0;

    const coverageBonus =
      MAJOR_COVERAGE.includes(role) &&
      weeklyCount === 0
        ? 5
        : 0;

    const repetitionPenalty =
      current * 6 +
      weeklyCount * 1.5;

    const score = priorityPoints + firstInSession +
      firstInWeek + coverageBonus - repetitionPenalty -
      weeklyRegionPenalty - sessionRegionPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }

  return bestRole;
}

function createSessionSlots({
  sessionId,
  dayIndex,
  targetCount,
  priorities,
  weeklyRoleCounts,
}) {
  const slots = [];

  function add(role, reason) {
    slots.push({
      position: slots.length + 1,
      role,
      region: toRegion(role),
      reason,
    });

    weeklyRoleCounts[role] =
      (weeklyRoleCounts[role] ?? 0) + 1;
  }

  const base =
    getBaseRoles(sessionId, dayIndex, targetCount);

  for (const role of base.slice(
    0,
    targetCount
  )) {
    add(role, "session-structure");
  }

  // Preserve important movement coverage
  // when there is room for a fourth slot.
  if (
    targetCount >= 4 &&
    (
      sessionId === "full-body" ||
      sessionId === "custom" ||
      (
        sessionId === "c" &&
        priorities.includes("abs")
      )
    ) &&
    !slots.some(
      (slot) => slot.role === "core"
    )
  ) {
    add("core", "weekly-balance");
  }

  const pool = getPool(sessionId);

  while (slots.length < targetCount) {
    const role = chooseExtraRole({
      pool,
      slots,
      priorities,
      weeklyRoleCounts,
      sessionId,
      targetCount,
    });

    if (!role) break;

    add(
      role,
      priorities.includes(toRegion(role))
        ? "muscle-priority"
        : "session-balance"
    );
  }

  return slots;
}

/**
 * Produce a proposed muscle distribution
 * for an entire week.
 *
 * weekIndex allows Upper / Lower rotation
 * across consecutive weeks.
 */
export function createWeeklyMuscleAllocation(
  profile,
  selectedSplitId = null,
  options = {}
) {
  const frequency = Number(
    profile?.trainingDaysPerWeek ?? 3
  );

  if (
    !Number.isInteger(frequency) ||
    frequency < 1 ||
    frequency > 6
  ) {
    throw new RangeError(
      "Training frequency must be 1-6 days."
    );
  }

  const weekIndex =
    options.weekIndex ?? 0;

  if (
    !Number.isInteger(weekIndex) ||
    weekIndex < 0
  ) {
    throw new RangeError(
      "weekIndex must be a nonnegative integer."
    );
  }

  const splitId =
    selectedSplitId ??
    getSuggestedSplit(frequency);

  if (
    !workoutSplits.some(
      (split) => split.id === splitId
    )
  ) {
    throw new RangeError(
      "Unknown workout split: " + splitId
    );
  }

  const schedule =
    createWeeklyTemplate(
      frequency,
      splitId
    );

  const budget =
    getSessionTimeBudget(profile);

  const priorities =
    getPriorities(profile);

  const workoutDays =
    schedule.days.filter(
      (day) => day.activity === "workout"
    );

  const weeklyRoleCounts = {};

  const sessions = workoutDays.map(
    (day, index) => {
      let sessionId = day.sessionId;

      // If Upper / Lower has an odd number
      // of sessions, alternate the first
      // session in the following week.
      if (
        splitId === "upper-lower" &&
        frequency % 2 === 1 &&
        weekIndex % 2 === 1
      ) {
        sessionId =
          sessionId === "upper"
            ? "lower"
            : "upper";
      }

      const slots = createSessionSlots({
        sessionId,
        dayIndex: index,
        targetCount:
          budget.exerciseCountGuidance.target,
        priorities,
        weeklyRoleCounts,
      });

      return {
        dayId: day.dayId,
        sessionId,
        targetExerciseCount:
          budget.exerciseCountGuidance.target,
        durationMinutes:
          budget.durationMinutes,
        slots,
      };
    }
  );

  const weeklyRegionSlots =
    Object.fromEntries(
      REGIONS.map((region) => [
        region,
        sessions.flatMap(
          (session) => session.slots
        ).filter(
          (slot) =>
            slot.region === region
        ).length,
      ])
    );

  const regionTrainingDays =
    Object.fromEntries(
      REGIONS.map((region) => [
        region,
        sessions.filter(
          (session) =>
            session.slots.some(
              (slot) =>
                slot.region === region
            )
        ).length,
      ])
    );

  const missingMajorRegions =
    MAJOR_COVERAGE.filter(
      (role) =>
        regionTrainingDays[
          toRegion(role)
        ] === 0
    ).map(toRegion);

  const missedPriorities =
    priorities.filter(
      (region) =>
        regionTrainingDays[region] === 0
    );

  return {
    splitId,
    weekIndex,
    trainingDaysPerWeek: frequency,
    sessionDurationMinutes:
      budget.durationMinutes,
    priorities,
    sessions,
    weeklyRegionSlots,
    regionTrainingDays,
    missingMajorRegions,
    missedPriorities,

    warnings: [
      ...missingMajorRegions.map(
        (region) =>
          "missing-weekly-region:" +
          region
      ),
      ...missedPriorities.map(
        (region) =>
          "priority-not-scheduled:" +
          region
      ),
    ],

    // These are planning slots, not
    // exercise selections or prescribed sets.
    status: "allocation-proposal",
    exercisesSelected: false,
    timeFitVerified: false,
    weeklySetVolumeVerified: false,
  };
}
