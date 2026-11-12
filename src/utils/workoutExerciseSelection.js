import { exercises } from "../data/exercises";

import {
  isExerciseAvailable,
} from "../data/workoutPlans";

import {
  rankExercisesForUser,
} from "./exerciseRecommendationEngine";

import {
  matchesExerciseRole,
} from "./exerciseTrainingRoles";

import {
  exerciseAssessmentById,
} from "../data/exerciseAssessments";

import {
  exerciseMuscleRegionsById,
} from "../data/exerciseMuscleRegionAssessments";

import {
  createWeeklyMuscleAllocation,
} from "./workoutMuscleAllocation";

import {
  rebalancePrioritySessions,
} from "./workoutPriorityRedistribution";

import {
  createWeeklyVolumeAllocation,
} from "./workoutVolumeAllocation";

import {
  estimateExerciseTime,
  assessSessionTimeBudget,
  getSessionTimeBudget,
} from "./workoutTimeBudget";

import {
  isAppropriateForAutomaticSelection,
  getSelectionVariationKey,
  getSelectionMovementFamily,
  roleMatchPreference,
} from "./workoutSelectionQuality";

/**
 * D1.19 - Exercise selection.
 *
 * Converts allocated muscle slots into
 * actual exercises from the catalog.
 *
 * No user data is saved or changed.
 */

function variationKey(exercise) {
  return getSelectionVariationKey(
    exercise
  );
}

export function supportsExerciseSlot(
  exercise,
  role
) {
  if (!exercise?.id) return false;

  const movement =
    exerciseAssessmentById.get(exercise.id);

  const muscles =
    exerciseMuscleRegionsById.get(exercise.id);

  const family =
    movement?.movementFamily;

  const primary =
    muscles?.primaryRegions ?? [];

  const anatomical = (
    exercise.primaryMuscles ?? []
  ).join(" ").toLowerCase();

  if (role === "biceps") {
    return (
      family === "elbow-flexion" &&
      (
        anatomical.includes("biceps") ||
        anatomical.includes("brachialis") ||
        exercise.id === "biceps-curl"
      )
    );
  }

  if (role === "triceps") {
    return (
      family === "elbow-extension" &&
      anatomical.includes("triceps")
    );
  }

  if (role === "calves") {
    return (
      primary.includes("calves") &&
      (
        family === "calf" ||
        /calf|soleus|gastrocnemius/i.test(
          exercise.name
        )
      )
    );
  }

  if (role === "legs") {
    return (
      primary.includes("legs") &&
      matchesExerciseRole(exercise, "legs") &&
      family !== "calf"
    );
  }

  const supportedRoles = new Set([
    "chest",
    "back",
    "shoulders",
    "glutes",
    "core",
  ]);

  if (!supportedRoles.has(role)) {
    return false;
  }

  return matchesExerciseRole(
    exercise,
    role
  );
}

function adjustedRankingScore(
  item,
  usedInWeek,
  usedVariations,
  sessionVariations,
  slotRole,
  usedSessionFamilies
) {
  const exercise = item.exercise;
  const variation =
    variationKey(exercise);

  const family =
    getSelectionMovementFamily(
      exercise
    );

  return (
    item.score +
    roleMatchPreference(
      exercise,
      slotRole
    ) -
    (usedInWeek.get(exercise.id) ?? 0) * 14 -
    (usedVariations.get(variation) ?? 0) * 4 -
    (sessionVariations.get(variation) ?? 0) * 18 -
    (usedSessionFamilies.get(family) ?? 0) * 6
  );
}

/**
 * Generate a proposal from the user's
 * training profile and equipment.
 *
 * Slots are retained if a matching exercise
 * cannot be selected, with an explicit reason.
 */
export function createSelectedWorkoutProposal(
  profile,
  options = {}
) {
  if (!profile) {
    throw new TypeError(
      "Training profile is required."
    );
  }

  const location =
    options.location ??
    profile.trainingLocation ??
    "gym";

  if (
    location !== "gym" &&
    location !== "home"
  ) {
    throw new RangeError(
      "Select gym or home location."
    );
  }

  const homeEquipment =
    options.homeEquipment ?? [];

  if (!Array.isArray(homeEquipment)) {
    throw new TypeError(
      "Home equipment must be an array."
    );
  }

  const allocation =
    createWeeklyMuscleAllocation(
      profile,
      options.splitId ?? null,
      {
        weekIndex: options.weekIndex ?? 0,
      }
    );

  const balanced =
    rebalancePrioritySessions(
      profile,
      allocation
    );

  const volume =
    createWeeklyVolumeAllocation(
      profile,
      balanced
    );

  const budget =
    getSessionTimeBudget(profile);

  const isAvailable = (exercise) =>
    isExerciseAvailable(
      exercise,
      location,
      homeEquipment
    );

  const ranking =
    rankExercisesForUser(
      exercises,
      {
        profile,
        isAvailable,
      }
    ).filter(
      (item) =>
        item.eligibleForAutomaticRecommendation &&
        isAvailable(item.exercise)
    );

  const usedInWeek = new Map();
  const usedVariations = new Map();
  const warnings = [];

  const sessions = volume.sessions.map(
    (session) => {
      const selected = [];
      const missingSlots = [];

      const usedInSession = new Set();
      const sessionVariations = new Map();
      const usedSessionFamilies = new Map();

      let exerciseSeconds = 0;
      const targetsById = {};

      for (const slot of session.slots) {
        const compatible = ranking
          .filter(
            (item) =>
              !usedInSession.has(
                item.exercise.id
              ) &&
              isAppropriateForAutomaticSelection(
                item.exercise,
                profile
              ) &&
              supportsExerciseSlot(
                item.exercise,
                slot.role
              )
          )
          .sort((first, second) =>
            adjustedRankingScore(
              second,
              usedInWeek,
              usedVariations,
              sessionVariations,
              slot.role,
              usedSessionFamilies
            ) -
            adjustedRankingScore(
              first,
              usedInWeek,
              usedVariations,
              sessionVariations,
              slot.role,
              usedSessionFamilies
            ) ||
            first.exercise.name.localeCompare(
              second.exercise.name
            )
          );

        if (compatible.length === 0) {
          missingSlots.push({
            position: slot.position,
            role: slot.role,
            region: slot.region,
            reason:
              "no-eligible-available-exercise",
          });

          continue;
        }

        let choice = null;

        // Preserve planned sets when possible.
        // If time is insufficient, attempt
        // fewer sets and record the change.
        for (
          let sets = slot.sets;
          sets >= 1 && !choice;
          sets--
        ) {
          for (const item of compatible) {
            const estimate =
              estimateExerciseTime(
                item.exercise,
                profile,
                { sets }
              );

            if (
              exerciseSeconds +
                estimate.estimatedSeconds <=
              budget.availableExerciseMinutes * 60
            ) {
              choice = {
                item,
                estimate,
                sets,
              };

              break;
            }
          }
        }

        if (!choice) {
          missingSlots.push({
            position: slot.position,
            role: slot.role,
            region: slot.region,
            reason: "time-budget-exceeded",
          });

          continue;
        }

        const exercise =
          choice.item.exercise;

        const variation =
          variationKey(exercise);

        targetsById[exercise.id] = {
          sets: choice.sets,
        };

        selected.push({
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,

          role: slot.role,
          region: slot.region,
          slotPosition: slot.position,

          plannedSets: slot.sets,
          sets: choice.sets,

          score: choice.item.score,
          restSeconds:
            choice.estimate.restSeconds,
          estimatedMinutes:
            choice.estimate.estimatedMinutes,

          targetType:
            choice.estimate.targetType,
        });

        usedInSession.add(exercise.id);

        usedInWeek.set(
          exercise.id,
          (usedInWeek.get(exercise.id) ?? 0) + 1
        );

        usedVariations.set(
          variation,
          (usedVariations.get(variation) ?? 0) + 1
        );

        sessionVariations.set(
          variation,
          (sessionVariations.get(variation) ?? 0) + 1
        );

        const movementFamily =
          getSelectionMovementFamily(
            exercise
          );

        usedSessionFamilies.set(
          movementFamily,
          (usedSessionFamilies.get(movementFamily) ?? 0) + 1
        );

        exerciseSeconds +=
          choice.estimate.estimatedSeconds;

        if (choice.sets < slot.sets) {
          warnings.push({
            type: "sets-reduced-for-time",
            dayId: session.dayId,
            role: slot.role,
            exerciseId: exercise.id,
            plannedSets: slot.sets,
            selectedSets: choice.sets,
          });
        }
      }

      const selectedExercises =
        selected.map(
          (item) =>
            exercises.find(
              (exercise) =>
                exercise.id === item.id
            )
        );

      const time =
        assessSessionTimeBudget(
          selectedExercises,
          profile,
          { targetsById }
        );

      for (const slot of missingSlots) {
        warnings.push({
          type: "unfilled-slot",
          dayId: session.dayId,
          ...slot,
        });
      }

      return {
        dayId: session.dayId,
        sessionId: session.sessionId,

        durationMinutes:
          budget.durationMinutes,

        plannedSlotCount:
          session.slots.length,

        exercises: selected,
        missingSlots,

        time,

        fitsEstimatedTime:
          time.fitsTime,
      };
    }
  );


  // ========================================
  // U1.2 - REPEAT ABC CYCLE
  // ========================================
  //
  // For an ABCABC schedule, later A/B/C
  // sessions can reuse their first-cycle
  // exercises instead of being forced into
  // unrelated variations.
  //
  // Only reuse when the scheduled workload,
  // time budget and exercise availability
  // yielded compatible complete sessions.
  //
  // This does not permit duplicate exercise
  // IDs inside a single session. That is
  // handled separately by Workout Builder.

  if (balanced.splitId === "abc") {
    const firstCycleByType = new Map();

    for (
      let index = 0;
      index < sessions.length;
      index += 1
    ) {
      const current = sessions[index];

      const first =
        firstCycleByType.get(
          current.sessionId
        );

      if (!first) {
        firstCycleByType.set(
          current.sessionId,
          current
        );

        continue;
      }

      const compatible =
        first.plannedSlotCount ===
          current.plannedSlotCount &&
        first.durationMinutes ===
          current.durationMinutes &&
        first.exercises.length ===
          current.exercises.length &&
        first.missingSlots.length === 0 &&
        current.missingSlots.length === 0 &&
        first.fitsEstimatedTime === true &&
        current.fitsEstimatedTime === true;

      if (!compatible) {
        continue;
      }

      sessions[index] = {
        ...current,

        exercises:
          first.exercises.map(
            (exercise) => ({
              ...exercise,
            })
          ),

        missingSlots: [
          ...first.missingSlots,
        ],

        time: {
          ...first.time,
        },

        fitsEstimatedTime:
          first.fitsEstimatedTime,
      };
    }
  }

  const plannedSlots =
    sessions.reduce(
      (total, session) =>
        total + session.plannedSlotCount,
      0
    );

  const selectedCount =
    sessions.reduce(
      (total, session) =>
        total + session.exercises.length,
      0
    );

  const completeSelection =
    selectedCount === plannedSlots &&
    sessions.every(
      (session) =>
        session.fitsEstimatedTime
    );

  return {
    splitId: balanced.splitId,
    location,

    profileSummary: {
      primaryGoal:
        profile.primaryGoal ??
        profile.trainingGoal,
      experienceLevel:
        profile.experienceLevel,
      trainingDaysPerWeek:
        profile.trainingDaysPerWeek,
      sessionDurationMinutes:
        budget.durationMinutes,
      musclePriorities:
        balanced.priorities,
    },

    sessions,
    plannedSlots,
    selectedCount,

    completeSelection,
    warnings,

    allocationWarnings:
      balanced.warnings,

    volumeWarnings:
      volume.warnings,

    // This is a proposal, not a saved plan.
    status: "exercise-selection-proposal",

    estimatedTimeVerified: true,
    realWorkoutDurationMeasured: false,
    savedToUserAccount: false,
  };
}
