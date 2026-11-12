import { getSessionTimeBudget } from "./workoutTimeBudget";

/**
 * D1.17 - Proposed direct-set allocation for a weekly plan.
 *
 * Internal planning heuristics, not a medical prescription.
 * Slots are not yet linked to actual exercises.
 */

const REGIONS = [
  "chest", "back", "legs", "glutes",
  "shoulders", "arms", "abs", "calves",
];

// Adjustable product targets, not universal scientific limits.
const WEEKLY_BASE_TARGETS = {
  "build-muscle": {
    beginner: 6,
    intermediate: 8,
    advanced: 10,
  },
  "build-strength": {
    beginner: 5,
    intermediate: 6,
    advanced: 8,
  },
  "improve-endurance": {
    beginner: 4,
    intermediate: 5,
    advanced: 6,
  },
  "body-recomposition": {
    beginner: 6,
    intermediate: 7,
    advanced: 8,
  },
  "general-fitness": {
    beginner: 4,
    intermediate: 5,
    advanced: 6,
  },
};

const TIMING_BY_GOAL = {
  "build-muscle": {
    workSeconds: 40,
    restSeconds: 90,
  },
  "build-strength": {
    workSeconds: 30,
    restSeconds: 150,
  },
  "improve-endurance": {
    workSeconds: 55,
    restSeconds: 60,
  },
  "body-recomposition": {
    workSeconds: 40,
    restSeconds: 90,
  },
  "general-fitness": {
    workSeconds: 40,
    restSeconds: 75,
  },
};

const MAJOR_ROLES = new Set([
  "chest", "back", "legs", "glutes", "shoulders",
]);

function round(value) {
  return Math.round(value * 10) / 10;
}

function getGoal(profile) {
  const goal =
    profile?.primaryGoal ??
    profile?.trainingGoal;

  return WEEKLY_BASE_TARGETS[goal]
    ? goal
    : "general-fitness";
}

function getLevel(profile) {
  const level = String(
    profile?.experienceLevel ?? "beginner"
  ).toLowerCase();

  return [
    "beginner",
    "intermediate",
    "advanced",
  ].includes(level)
    ? level
    : "beginner";
}

function getPriorities(profile) {
  const selected = Array.isArray(
    profile?.musclePriorities
  )
    ? profile.musclePriorities
    : [];

  return [...new Set(selected)]
    .filter((region) =>
      REGIONS.includes(region)
    )
    .slice(0, 3);
}

/**
 * Provisional duration estimate.
 * Actual exercise timing will be checked later.
 */
function estimateSlotSeconds(slot, goal) {
  const timing = TIMING_BY_GOAL[goal];

  const isMajor =
    MAJOR_ROLES.has(slot.role);

  const setupSeconds =
    isMajor ? 70 : 50;

  const restSeconds =
    timing.restSeconds +
    (
      isMajor && goal !== "build-strength"
        ? 15
        : 0
    );

  return (
    setupSeconds +
    slot.sets * timing.workSeconds +
    Math.max(0, slot.sets - 1) *
      restSeconds
  );
}

function sumSessionSeconds(session, goal) {
  return session.slots.reduce(
    (total, slot) =>
      total +
      estimateSlotSeconds(slot, goal),
    0
  );
}

function calculateRegionSets(sessions) {
  const counts = Object.fromEntries(
    REGIONS.map((region) => [region, 0])
  );

  for (const session of sessions) {
    for (const slot of session.slots) {
      counts[slot.region] += slot.sets;
    }
  }

  return counts;
}

/**
 * Convert D1.16 muscle slots into a
 * provisional weekly set allocation.
 */
export function createWeeklyVolumeAllocation(
  profile,
  muscleAllocation
) {
  if (
    !Array.isArray(muscleAllocation?.sessions)
  ) {
    throw new TypeError(
      "A valid D1.16 muscle allocation is required."
    );
  }

  const budget =
    getSessionTimeBudget(profile);

  if (
    muscleAllocation.sessionDurationMinutes !==
    budget.durationMinutes
  ) {
    throw new Error(
      "Profile and allocation durations differ."
    );
  }

  const goal = getGoal(profile);
  const level = getLevel(profile);
  const priorities = getPriorities(profile);

  const baseTarget =
    WEEKLY_BASE_TARGETS[goal][level];

  const priorityBonuses =
    goal === "build-muscle" ||
    goal === "body-recomposition"
      ? [4, 3, 2]
      : [2, 2, 1];

  const targets = Object.fromEntries(
    REGIONS.map((region) => {
      const index =
        priorities.indexOf(region);

      const bonus =
        index >= 0
          ? priorityBonuses[index]
          : 0;

      return [
        region,
        baseTarget + bonus,
      ];
    })
  );

  // Beginners start with fewer sets.
  const initialSets =
    level === "beginner" ||
    budget.durationMinutes <= 45
      ? 2
      : 3;

  const maxSets =
    goal === "build-strength"
      ? 3
      : budget.durationMinutes <= 45
        ? 3
        : 4;

  const maxExerciseSeconds =
    budget.availableExerciseMinutes * 60;

  // Make independent copies. Do not mutate D1.16.
  const sessions = muscleAllocation.sessions.map(
    (session) => {
      if (!Array.isArray(session.slots)) {
        throw new TypeError(
          "Each session needs a slots array."
        );
      }

      return {
        dayId: session.dayId,
        sessionId: session.sessionId,
        targetExerciseCount:
          session.targetExerciseCount,
        durationMinutes:
          budget.durationMinutes,

        slots: session.slots.map(
          (slot) => {
            if (
              !REGIONS.includes(slot.region) ||
              typeof slot.role !== "string"
            ) {
              throw new TypeError(
                "Invalid muscle role or region."
              );
            }

            return {
              ...slot,
              sets: initialSets,
            };
          }
        ),
      };
    }
  );

  // If the initial plan exceeds its estimated
  // time budget, reduce nonpriority sets first.
  for (const session of sessions) {
    let iterations = 0;

    while (
      sumSessionSeconds(session, goal) >
        maxExerciseSeconds &&
      iterations <
        session.slots.length * initialSets
    ) {
      const reducible = session.slots
        .filter(
          (slot) => slot.sets > 1
        )
        .sort((first, second) => {
          const firstIndex =
            priorities.indexOf(first.region);

          const secondIndex =
            priorities.indexOf(second.region);

          const firstRank =
            firstIndex === -1
              ? -1
              : 3 - firstIndex;

          const secondRank =
            secondIndex === -1
              ? -1
              : 3 - secondIndex;

          return (
            firstRank - secondRank ||
            second.sets - first.sets
          );
        });

      if (reducible.length === 0) {
        break;
      }

      reducible[0].sets -= 1;
      iterations += 1;
    }
  }

  // Add sets where prioritized regions
  // still need volume AND time is available.
  const totalSlots = sessions.reduce(
    (sum, session) =>
      sum + session.slots.length,
    0
  );

  for (
    let iteration = 0;
    iteration < totalSlots * maxSets;
    iteration++
  ) {
    const allocated =
      calculateRegionSets(sessions);

    let best = null;
    let bestScore = -Infinity;

    sessions.forEach(
      (session, sessionIndex) => {
        session.slots.forEach(
          (slot, slotIndex) => {
            const priorityIndex =
              priorities.indexOf(
                slot.region
              );

            if (
              priorityIndex < 0 ||
              slot.sets >= maxSets
            ) {
              return;
            }

            const deficit =
              targets[slot.region] -
              allocated[slot.region];

            if (deficit <= 0) {
              return;
            }

            const timing =
              TIMING_BY_GOAL[goal];

            const extraSeconds =
              timing.workSeconds +
              timing.restSeconds +
              (
                MAJOR_ROLES.has(slot.role) &&
                goal !== "build-strength"
                  ? 15
                  : 0
              );

            if (
              sumSessionSeconds(
                session,
                goal
              ) + extraSeconds >
              maxExerciseSeconds
            ) {
              return;
            }

            const score =
              (
                deficit /
                targets[slot.region]
              ) * 10 +
              (3 - priorityIndex) * 1.25 -
              slot.sets * 0.3;

            if (score > bestScore) {
              bestScore = score;

              best = {
                sessionIndex,
                slotIndex,
              };
            }
          }
        );
      }
    );

    if (!best) {
      break;
    }

    sessions[
      best.sessionIndex
    ].slots[
      best.slotIndex
    ].sets += 1;
  }

  const weeklySetsByRegion =
    calculateRegionSets(sessions);

  const weeklySetTotal =
    Object.values(
      weeklySetsByRegion
    ).reduce(
      (sum, count) => sum + count,
      0
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

  const regionAnalysis = REGIONS.map(
    (region) => ({
      region,
      isPriority:
        priorities.includes(region),
      targetSets: targets[region],
      allocatedSets:
        weeklySetsByRegion[region],
      missingSets: Math.max(
        0,
        targets[region] -
          weeklySetsByRegion[region]
      ),
      trainingDays:
        regionTrainingDays[region],
    })
  );

  const priorityAnalysis = priorities.map(
    (region, index) => ({
      region,
      priority: index + 1,
      targetSets:
        targets[region],
      allocatedSets:
        weeklySetsByRegion[region],
      missingSets: Math.max(
        0,
        targets[region] -
          weeklySetsByRegion[region]
      ),
      trainingDays:
        regionTrainingDays[region],
    })
  );

  const warnings = [
    ...(muscleAllocation.warnings ?? []),
  ];

  for (const priority of priorityAnalysis) {
    if (priority.missingSets > 0) {
      warnings.push(
        "priority-target-not-reached:" +
          priority.region
      );
    }

    if (
      sessions.length >= 3 &&
      priority.trainingDays < 2
    ) {
      warnings.push(
        "priority-low-frequency:" +
          priority.region
      );
    }
  }

  const enrichedSessions = sessions.map(
    (session) => {
      const exerciseSeconds =
        sumSessionSeconds(
          session,
          goal
        );

      const estimatedMinutes = round(
        (
          exerciseSeconds +
          (
            budget.warmupMinutes +
            budget.reserveMinutes
          ) * 60
        ) / 60
      );

      const fitsEstimatedTime =
        exerciseSeconds <=
        maxExerciseSeconds;

      if (!fitsEstimatedTime) {
        warnings.push(
          "estimated-time-overflow:" +
            session.dayId
        );
      }

      return {
        ...session,

        plannedSets:
          session.slots.reduce(
            (sum, slot) =>
              sum + slot.sets,
            0
          ),

        estimatedMinutes,
        fitsEstimatedTime,

        slots: session.slots.map(
          (slot) => ({
            ...slot,

            estimatedSlotMinutes:
              round(
                estimateSlotSeconds(
                  slot,
                  goal
                ) / 60
              ),
          })
        ),
      };
    }
  );

  return {
    splitId:
      muscleAllocation.splitId,

    goal,
    level,

    sessionDurationMinutes:
      budget.durationMinutes,

    priorities,
    sessions: enrichedSessions,

    weeklySetsByRegion,
    regionTrainingDays,
    weeklySetTotal,

    suggestedWeeklyTargets:
      targets,

    priorityAnalysis,
    regionAnalysis,
    warnings,

    status:
      "provisional-volume-allocation",

    exercisesSelected: false,
    exactTimeVerified: false,
    physiologicalRecoveryVerified: false,

    // These are planned direct-role sets,
    // not effective volume measured after
    // selecting actual compound exercises.
    countingMethod:
      "direct-planned-role-sets",
  };
}
