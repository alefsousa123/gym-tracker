import { exercises } from "../data/exercises";

import {
  isExerciseAvailable,
} from "../data/workoutPlans";

import {
  createSelectedWorkoutProposal,
  supportsExerciseSlot,
} from "./workoutExerciseSelection";

import {
  rankExercisesForUser,
} from "./exerciseRecommendationEngine";

import {
  isAppropriateForAutomaticSelection,
  roleMatchPreference,
} from "./workoutSelectionQuality";

import {
  assessSessionTimeBudget,
  estimateExerciseTime,
  getSessionTimeBudget,
} from "./workoutTimeBudget";

/**
 * D2.3T — Optional equipment-adapted preview.
 *
 * Deliberately does NOT modify the original selection engine.
 * An adjusted slot is never claimed to replace the muscular
 * training effect of the unavailable slot.
 *
 * This function is pure: no saved plans or browser storage change.
 */
const FALLBACK_ROLES = Object.freeze({
  a: ["triceps", "chest", "shoulders", "core"],
  b: ["core", "glutes", "legs", "shoulders", "calves"],
  c: ["legs", "glutes", "calves", "core"],
  push: ["triceps", "chest", "shoulders", "core"],
  pull: ["core", "glutes", "legs", "shoulders", "calves"],
  legs: ["legs", "glutes", "calves", "core"],
  upper: ["chest", "shoulders", "triceps", "core"],
  lower: ["legs", "glutes", "calves", "core"],
  "full-body": [
    "legs", "chest", "core", "glutes",
    "triceps", "shoulders", "calves",
  ],
  custom: [
    "legs", "chest", "core", "glutes",
    "triceps", "shoulders", "calves",
  ],
});

const EXERCISES_BY_ID = new Map(
  exercises.map((exercise) => [exercise.id, exercise])
);

function regionForRole(role) {
  if (role === "core") return "abs";
  if (role === "biceps" || role === "triceps") return "arms";
  return role;
}

function getSessionTime(exerciseEntries, profile) {
  const actual = exerciseEntries.map(
    (entry) => EXERCISES_BY_ID.get(entry.id)
  );

  const targetsById = Object.fromEntries(
    exerciseEntries.map((entry) => [
      entry.id,
      { sets: entry.sets },
    ])
  );

  return assessSessionTimeBudget(
    actual,
    profile,
    { targetsById }
  );
}

function availableRoleCandidates(
  ranked,
  role,
  profile,
  usedInSession,
  weeklyExerciseCounts
) {
  return ranked
    .filter((item) =>
      !usedInSession.has(item.exercise.id) &&
      (item.exercise.category == null ||
        item.exercise.category === "strength") &&
      isAppropriateForAutomaticSelection(
        item.exercise,
        profile
      ) &&
      supportsExerciseSlot(item.exercise, role)
    )
    .sort(
      (first, second) =>
        (
          second.score +
          roleMatchPreference(second.exercise, role) -
          (weeklyExerciseCounts.get(second.exercise.id) ?? 0) * 14
        ) -
        (
          first.score +
          roleMatchPreference(first.exercise, role) -
          (weeklyExerciseCounts.get(first.exercise.id) ?? 0) * 14
        ) ||
        first.exercise.name.localeCompare(second.exercise.name)
    );
}

export function createEquipmentAdaptedProposal(
  profile,
  options = {}
) {
  const original = createSelectedWorkoutProposal(
    profile,
    options
  );

  if (original.location !== "home") {
    return original;
  }

  const homeEquipment = options.homeEquipment ?? [];
  const budget = getSessionTimeBudget(profile);

  const isAvailable = (exercise) =>
    isExerciseAvailable(exercise, "home", homeEquipment);

  const ranked = rankExercisesForUser(
    exercises,
    { profile, isAvailable }
  ).filter(
    (item) => item.eligibleForAutomaticRecommendation &&
      isAvailable(item.exercise)
  );

  const adaptationChanges = [];
  const weeklyExerciseCounts = new Map();
  const unresolvedSlots = [];

  for (const session of original.sessions) {
    for (const exercise of session.exercises) {
      weeklyExerciseCounts.set(
        exercise.id,
        (weeklyExerciseCounts.get(exercise.id) ?? 0) + 1
      );
    }
  }

  const sessions = original.sessions.map((session) => {
    const chosen = session.exercises.map((entry) => ({ ...entry }));
    const usedInSession = new Set(chosen.map((item) => item.id));
    const roleCounts = new Map();
    const remaining = [];

    for (const entry of chosen) {
      roleCounts.set(
        entry.role,
        (roleCounts.get(entry.role) ?? 0) + 1
      );
    }

    for (const slot of session.missingSlots) {
      if (slot.reason !== "no-eligible-available-exercise") {
        remaining.push({ ...slot });
        continue;
      }

      const roles = (
        FALLBACK_ROLES[session.sessionId] ??
        FALLBACK_ROLES.custom
      ).filter((role) => role !== slot.role);

      let selected = null;

      for (const role of roles) {
        if ((roleCounts.get(role) ?? 0) >= 2) {
          continue;
        }

        const eligible = availableRoleCandidates(
          ranked,
          role,
          profile,
          usedInSession,
          weeklyExerciseCounts
        );

        for (const item of eligible) {
          if (selected) break;

          for (const sets of [3, 2, 1]) {
            const estimate = estimateExerciseTime(
              item.exercise,
              profile,
              { sets }
            );

            const trial = {
              id: item.exercise.id,
              name: item.exercise.name,
              muscleGroup: item.exercise.muscleGroup,
              equipment: [...item.exercise.equipment],
              role,
              region: regionForRole(role),
              slotPosition: slot.position,
              adaptedFromRole: slot.role,
              plannedSets: sets,
              sets,
              score: item.score,
              restSeconds: estimate.restSeconds,
              estimatedMinutes: estimate.estimatedMinutes,
              targetType: estimate.targetType,
            };

            const time = getSessionTime(
              [...chosen, trial],
              profile
            );

            if (
              time.fitsTime &&
              time.estimatedTotalMinutes <= budget.durationMinutes
            ) {
              selected = trial;
              break;
            }
          }
        }

        if (selected) break;
      }

      if (!selected) {
        remaining.push({ ...slot });
        continue;
      }

      chosen.push(selected);
      usedInSession.add(selected.id);
      roleCounts.set(
        selected.role,
        (roleCounts.get(selected.role) ?? 0) + 1
      );
      weeklyExerciseCounts.set(
        selected.id,
        (weeklyExerciseCounts.get(selected.id) ?? 0) + 1
      );

      adaptationChanges.push({
        dayId: session.dayId,
        fromRole: slot.role,
        toRole: selected.role,
        exerciseId: selected.id,
      });
    }

    for (const slot of remaining) {
      unresolvedSlots.push({
        dayId: session.dayId,
        ...slot,
      });
    }

    chosen.sort(
      (first, second) =>
        first.slotPosition - second.slotPosition
    );

    const time = getSessionTime(chosen, profile);

    return {
      ...session,
      exercises: chosen,
      missingSlots: remaining,
      time,
      fitsEstimatedTime: time.fitsTime,
    };
  });

  const selectedCount = sessions.reduce(
    (sum, session) => sum + session.exercises.length,
    0
  );

  const missingKeys = new Set(
    unresolvedSlots.map(
      (slot) => `${slot.dayId}:${slot.position}`
    )
  );

  const warnings = [
    ...original.warnings.filter(
      (warning) =>
        warning?.type !== "unfilled-slot" ||
        missingKeys.has(
          `${warning.dayId}:${warning.position}`
        )
    ),
    ...adaptationChanges.map((change) => ({
      type: "role-adapted-for-equipment",
      ...change,
    })),
  ];

  const uncoveredRoles = [
    ...new Set([
      ...adaptationChanges.map((item) => item.fromRole),
      ...unresolvedSlots.map((item) => item.role),
    ]),
  ];

  return {
    ...original,
    sessions,
    selectedCount,
    completeSelection:
      selectedCount === original.plannedSlots &&
      sessions.every(
        (session) => session.fitsEstimatedTime
      ),
    adaptedToEquipment: true,
    adaptationChanges,
    uncoveredRoles,
    coverageComplete:
      adaptationChanges.length === 0 &&
      unresolvedSlots.length === 0,
    warnings,
  };
}
