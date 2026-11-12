import {
  CURATED_RECOMMENDATION_TAG,
} from "../data/exerciseRecommendationTags";
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
    // D2.3S BODYWEIGHT TRICEPS SUPPORT
    // These catalog entries explicitly identify
    // the triceps as a primary working muscle.
    const bodyweightTriceps = [
      "close-grip-push-ups",
      "diamond-push-ups",
      "crab-dips",
      "reverse-plank-dips",
    ].includes(exercise.id);

    return (
      anatomical.includes("triceps") &&
      (
        family === "elbow-extension" ||
        bodyweightTriceps
      )
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


export function getDefaultRolePriority(exercise, role) {
  if (!exercise?.id) return 0;

  const family =
    getSelectionMovementFamily(exercise);

  const variation =
    getSelectionVariationKey(exercise);

  const name = String(exercise.name ?? "");
  const id = exercise.id;

  // Programming preference, not an efficacy grade.
  // Higher tiers are considered before lower tiers.
  // Scores still decide among exercises in a tier.

  if (role === "chest") {
    if (/svend|squeeze[- ]press|pullover/i.test(name)) {
      return 0;
    }

    if (/diamond|close[- ]grip/i.test(name)) {
      return 1;
    }

    const conventionalPress =
      variation.startsWith("bench-press") ||
      variation === "push-up" ||
      variation === "floor-press" ||
      [
        "bench-press",
        "dumbbell-chest-press",
        "push-up",
      ].includes(id);

    const conventionalFly =
      variation === "chest-fly";

    if (conventionalPress || conventionalFly) {
      return 3;
    }

    if (
      family === "horizontal-push" ||
      family === "chest-isolation"
    ) {
      return 2;
    }

    return 1;
  }

  if (role === "back") {
    if (
      variation === "pullover" ||
      family === "pull-accessory" ||
      /pullover/i.test(name)
    ) {
      return 0;
    }

    if (
      family === "horizontal-pull" ||
      family === "vertical-pull"
    ) {
      return 3;
    }

    return 1;
  }

  // No change to other muscle groups.
  return 2;
}


const WEEKDAYS_FOR_SIMILARITY = Object.freeze([
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
]);

// Compare meaningful exercise variations,
// not entire muscle groups.
export function getNearDuplicateKey(exercise) {
  if (!exercise?.id) return 'unknown';

  const name = String(
    exercise.name ?? ''
  ).toLowerCase();

  const family =
    getSelectionMovementFamily(exercise);

  const variation = variationKey(exercise);

  // Seated and standing calf exercises
  // have different emphases.
  if (family === 'calf') {
    return /seated|bent.knee/.test(name)
      ? 'calf-raise-seated'
      : 'calf-raise-standing';
  }

  // Avoid stacking very similar
  // hip-flexion core movements.
  if (
    family.startsWith('core-') &&
    (
      /\b(?:leg|knee) raise\b/.test(name) ||
      /toes.to.bar/.test(name)
    )
  ) {
    return 'core-leg-knee-raise';
  }

  if (
    family === 'core-stability' &&
    /plank/.test(name)
  ) {
    return /side|lateral/.test(name)
      ? 'side-plank'
      : 'front-plank';
  }

  // Supported and unsupported horizontal
  // rows can serve distinct functions.
  if (
    family === 'horizontal-pull' &&
    /row|bench.?pull/.test(name)
  ) {
    return /seated|supported|bench.?pull/.test(name)
      ? 'supported-horizontal-row'
      : 'unsupported-horizontal-row';
  }

  if (family === 'vertical-pull') {
    if (/pull.?down/.test(name)) {
      return 'vertical-pulldown';
    }

    if (/pull.?up|chin.?up/.test(name)) {
      return 'vertical-pullup';
    }
  }

  if (/glute.?bridge/.test(name)) {
    return 'glute-bridge';
  }

  if (/hip.?thrust/.test(name)) {
    return 'hip-thrust';
  }

  if (
    family === 'hip-hinge' &&
    /romanian|stiff.?leg/.test(name)
  ) {
    return 'romanian-hip-hinge';
  }

  // Existing keys already distinguish
  // flat, incline and decline bench press.
  return variation;
}

// This penalty affects only workout selection.
// It does not change the exercise's base score.
// Maximum additional penalty: 50 points.
export function getSelectionRepeatPenalty(
  exercise,
  sameSessionKeys = new Set(),
  previousDayIds = new Set(),
  previousDayKeys = new Set()
) {
  const key = getNearDuplicateKey(exercise);

  return (
    sameSessionKeys.has(key) ||
    previousDayIds.has(exercise.id) ||
    previousDayKeys.has(key)
  ) ? 50 : 0;
}

function adjustedRankingScore(
  item,
  usedInWeek,
  usedVariations,
  sessionVariations,
  slotRole,
  usedSessionFamilies,
  sameSessionSimilarityKeys,
  previousDayIds,
  previousDayKeys
) {
  const exercise = item.exercise;

  const variation = variationKey(exercise);

  const family = getSelectionMovementFamily(exercise);

  const name = String(exercise.name ?? "");

  const staticHold =
    /\b(?:hold|isometric|iso)\b/i.test(name);

  const standardCoreHold =
    slotRole === "core" &&
    family === "core-stability" &&
    /\bplank\b/i.test(name);

  // Prefer dynamic movements when available.
  // Holds remain eligible as fallbacks.
  const holdPenalty =
    staticHold && !standardCoreHold
      ? 34
      : 0;

  // Close-grip presses are often more
  // triceps-biased than standard chest presses.
  const chestVariationPenalty =
    slotRole === "chest" &&
    /close[- ]grip/i.test(name)
      ? 14
      : 0;

  // Accessories remain eligible but should not
  // displace standard pulling patterns without reason.
  const accessoryBackPenalty =
    slotRole === "back" &&
    family === "pull-accessory"
      ? 25
      : 0;

  return (
    item.score +
    roleMatchPreference(exercise, slotRole) -
    (usedInWeek.get(exercise.id) ?? 0) * 14 -
    (usedVariations.get(variation) ?? 0) * 4 -
    (sessionVariations.get(variation) ?? 0) * 18 -
    (usedSessionFamilies.get(family) ?? 0) * 6 -
    holdPenalty -
    chestVariationPenalty -
    accessoryBackPenalty -
    getSelectionRepeatPenalty(
      exercise,
      sameSessionSimilarityKeys,
      previousDayIds,
      previousDayKeys
    )
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
  const selectedByCalendarDay = new Map();

  const sessions = volume.sessions.map(
    (session) => {
      const currentIndex =
        WEEKDAYS_FOR_SIMILARITY.indexOf(
          session.dayId
        );

      const previousDayId =
        currentIndex < 0
          ? null
          : WEEKDAYS_FOR_SIMILARITY[
              (currentIndex + 6) % 7
            ];

      const previousDay =
        selectedByCalendarDay.get(previousDayId) ?? {
          ids: new Set(),
          keys: new Set(),
        };

      const selected = [];
      const missingSlots = [];

      const usedInSession = new Set();
      const sessionVariations = new Map();
      const sameSessionSimilarityKeys = new Set();
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
            Number(second.exercise.recommendationTags?.includes(
              CURATED_RECOMMENDATION_TAG
            )) -
            Number(first.exercise.recommendationTags?.includes(
              CURATED_RECOMMENDATION_TAG
            )) ||
            getDefaultRolePriority(
              second.exercise,
              slot.role
            ) -
            getDefaultRolePriority(
              first.exercise,
              slot.role
            ) ||
            adjustedRankingScore(
              second,
              usedInWeek,
              usedVariations,
              sessionVariations,
              slot.role,
              usedSessionFamilies,
              sameSessionSimilarityKeys,
              previousDay.ids,
              previousDay.keys
            ) -
            adjustedRankingScore(
              first,
              usedInWeek,
              usedVariations,
              sessionVariations,
              slot.role,
              usedSessionFamilies,
              sameSessionSimilarityKeys,
              previousDay.ids,
              previousDay.keys
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

        sameSessionSimilarityKeys.add(
          getNearDuplicateKey(exercise)
        );

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

      selectedByCalendarDay.set(
        session.dayId,
        {
          ids: new Set(usedInSession),
          keys: new Set(
            sameSessionSimilarityKeys
          ),
        }
      );

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
