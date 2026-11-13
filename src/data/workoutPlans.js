
import { exercises } from "./exercises";

import {
  assessSessionTimeBudget,
} from "../utils/workoutTimeBudget";

import {
  createWeeklyTemplate,
} from "./workoutSplits";

import {
  evaluateRecommendedWeek,
} from "../utils/recommendedWeeklyAssessment";

import {
  evaluatePlanComposition,
} from "../utils/recommendedPlanComposition";

import {
  exerciseAssessmentById,
} from "./exerciseAssessments";

import {
  rankExercisesForUser,
  isExerciseForPlanSlot,
} from "../utils/exerciseRecommendationEngine";

// ==========================================
// CURATED WORKOUT TEMPLATES
// ==========================================

export const workoutPlans = [
  {
    id: "full-body-foundation",
    name: "Full Body Foundation",
    splitId: "full-body",
    description:
      "A flexible starting structure that covers multiple movement patterns.",
    minDays: 1,
    maxDays: 4,
    levels: ["beginner", "intermediate", "advanced"],
    goals: [
      "general-fitness",
      "build-muscle",
      "body-recomposition",
      "improve-endurance",
    ],
    sessions: [
      {
        id: "full-body",
        name: "Full Body",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Upper Body Push",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Upper Body Pull",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Hip Extension",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Stability",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "upper-lower-builder",
    name: "Upper / Lower Builder",
    splitId: "upper-lower",
    description:
      "Alternate upper-body and lower-body sessions across the week.",
    minDays: 2,
    maxDays: 6,
    levels: ["beginner", "intermediate", "advanced"],
    goals: [
      "build-muscle",
      "build-strength",
      "body-recomposition",
      "general-fitness",
    ],
    sessions: [
      {
        id: "upper",
        name: "Upper Body",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "lower",
        name: "Lower Body",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    splitId: "push-pull-legs",
    description:
      "Organize training by pushing, pulling, and lower-body movements.",
    minDays: 3,
    maxDays: 6,
    levels: ["intermediate", "advanced"],
    goals: [
      "build-muscle",
      "build-strength",
      "body-recomposition",
    ],
    sessions: [
      {
        id: "push",
        name: "Push",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
        ],
      },
      {
        id: "pull",
        name: "Pull",
        slots: [
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "legs",
        name: "Legs",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "abc-training",
    name: "ABC Training",
    splitId: "abc",
    description:
      "Three rotating workout categories that can be customized later.",
    minDays: 3,
    maxDays: 6,
    levels: ["intermediate", "advanced"],
    goals: [
      "build-muscle",
      "general-fitness",
      "improve-endurance",
    ],
    sessions: [
      {
        id: "a",
        name: "Workout A",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
      {
        id: "b",
        name: "Workout B",
        slots: [
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "c",
        name: "Workout C",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
];

// ==========================================
// EXERCISE EQUIPMENT COMPATIBILITY
// ==========================================

export function isExerciseAvailable(
  exercise,
  location,
  homeEquipment
) {
  // Check whether this exercise supports
  // the requested training location.
  // D2.3V: Gym-tagged exercises may also be used
  // at home when their required equipment is owned.
  // Equipment-free gym-only entries stay restricted.
  const permittedByCatalog =
    exercise.locations.includes(location);

  const permittedWithHomeEquipment =
    location === "home" &&
    exercise.locations.includes("gym") &&
    exercise.equipment.length > 0;

  if (!permittedByCatalog && !permittedWithHomeEquipment) {
    return false;
  }

  // Band-assisted pull-ups also require a pull-up bar.
  // The catalog currently lists only resistance bands.
  if (
    location === "home" &&
    exercise.id === "band-assisted-pull-ups" &&
    !homeEquipment.includes("Pull-Up Bar")
  ) {
    return false;
  }

  // Gym workouts assume gym equipment is available.
  // A detailed gym inventory can be added later.
  if (location === "gym") {
    return true;
  }

  // ========================================
  // AVAILABLE HOME EQUIPMENT
  // ========================================

  const availableEquipment = new Set(
    homeEquipment
  );

  const hasFlatBench =
    availableEquipment.has("Bench") ||
    availableEquipment.has("Flat Bench");

  const hasAdjustableBench =
    availableEquipment.has("Bench (Adjustable)");

  const hasInclineBench =
    availableEquipment.has("Incline Bench");

  const hasDeclineBench =
    availableEquipment.has("Decline Bench");

  // ========================================
  // DETECT BENCH REQUIREMENTS
  // ========================================

  const benchEquipmentNames = [
    "Bench",
    "Flat Bench",
    "Incline Bench",
    "Decline Bench",
    "Bench (Adjustable)",
  ];

  const requiresBench = exercise.equipment.some(
    (item) =>
      benchEquipmentNames.includes(item)
  );

  // Push-ups and supported planks use a bench
  // as an elevated surface, not as an
  // adjustable weight-training bench.
  const isBenchSupportedBodyweightExercise =
    /\b(?:push[- ]?ups?|plank hold)\b/i.test(
      exercise.name
    );

  const requiresIncline =
    requiresBench &&
    /\bincline\b/i.test(exercise.name) &&
    !isBenchSupportedBodyweightExercise;

  const requiresDecline =
    requiresBench &&
    /\bdecline\b/i.test(exercise.name) &&
    !isBenchSupportedBodyweightExercise;

  // ========================================
  // INCLINE BENCH VALIDATION
  // ========================================

  // An exercise requiring an inclined bench
  // cannot be performed with a flat-only bench.

  if (
    requiresIncline &&
    !hasAdjustableBench &&
    !hasInclineBench
  ) {
    return false;
  }

  // ========================================
  // DECLINE BENCH VALIDATION
  // ========================================

  // We do not assume that every adjustable
  // bench supports decline positions.

  if (
    requiresDecline &&
    !hasDeclineBench
  ) {
    return false;
  }

  // ========================================
  // VERIFY REQUIRED EQUIPMENT
  // ========================================

  return exercise.equipment.every(
    (requiredEquipment) => {

      // ====================================
      // GENERIC BENCH REQUIREMENT
      // ====================================

      if (requiredEquipment === "Bench") {

        // Incline movements need an inclined bench.
        if (requiresIncline) {
          return (
            hasAdjustableBench ||
            hasInclineBench
          );
        }

        // Decline movements need a compatible
        // decline bench.
        if (requiresDecline) {
          return hasDeclineBench;
        }

        // A flat or adjustable bench can support
        // a standard flat-bench movement.
        return (
          hasFlatBench ||
          hasAdjustableBench
        );
      }

      // ====================================
      // FLAT BENCH REQUIREMENT
      // ====================================

      if (requiredEquipment === "Flat Bench") {
        return (
          hasFlatBench ||
          hasAdjustableBench
        );
      }

      // ====================================
      // INCLINE BENCH REQUIREMENT
      // ====================================

      if (requiredEquipment === "Incline Bench") {
        return (
          hasInclineBench ||
          hasAdjustableBench
        );
      }

      // ====================================
      // ADJUSTABLE BENCH REQUIREMENT
      // ====================================

      if (
        requiredEquipment === "Bench (Adjustable)"
      ) {
        return hasAdjustableBench;
      }

      // ====================================
      // DECLINE BENCH REQUIREMENT
      // ====================================

      if (requiredEquipment === "Decline Bench") {
        return hasDeclineBench;
      }

      // ====================================
      // ALL OTHER EQUIPMENT
      // ====================================

      // D2.3V: Match My Equipment labels.
      const equipmentAliases = {
        "Dip Station": ["Dip Bars"],
        Plates: ["Weight Plates"],
        "Leg Press": ["Leg Press Machine"],
        "Bosu Ball": ["BOSU Ball"],
      };

      return (
        availableEquipment.has(requiredEquipment) ||
        (equipmentAliases[requiredEquipment] ?? []).some(
          (alias) => availableEquipment.has(alias)
        )
      );
    }
  );
}

// ==========================================
// BUILD WORKOUT PLAN PREVIEW
// ==========================================


export function buildPlanPreview(
  plan,
  location,
  homeEquipment,
  profile = null
) {
  const rankedExercises = rankExercisesForUser(
    exercises,
    {
      profile,
      isAvailable: (exercise) =>
        isExerciseAvailable(
          exercise,
          location,
          homeEquipment
        ),
    }
  );


  // Track repeated exercises across sessions.
  // Repetition is allowed for progressive overload.
  const exerciseUseCounts = new Map();
  const variationUseCounts = new Map();

  function chooseDiversifiedCandidate(
    slot,
    usedIds
  ) {
    const available = rankedExercises.filter(
      (item) =>
        item.eligibleForAutomaticRecommendation &&
        !usedIds.has(item.exercise.id)
    );

    const matchingPattern = available.filter(
      (item) =>
        isExerciseForPlanSlot(
          item.exercise,
          slot.label
        )
    );

    // Keep the curated exercise IDs as a
    // fallback when the slot has no family match.
    const candidates =
      matchingPattern.length > 0
        ? matchingPattern
        : available.filter(
            (item) =>
              slot.exerciseIds.includes(
                item.exercise.id
              )
          );

    let best = null;
    let bestAdjustedScore = -Infinity;

    for (const candidate of candidates) {
      const id = candidate.exercise.id;

      const variationGroup =
        exerciseAssessmentById.get(id)
          ?.variationGroup;

      // Small penalties, not exclusions.
      // A strongly suitable exercise may still
      // appear in more than one session.
      const repeatedExercisePenalty =
        (exerciseUseCounts.get(id) ?? 0) * 7;

      const variationPenalty =
        variationGroup
          ? (variationUseCounts.get(
              variationGroup
            ) ?? 0) * 2
          : 0;

      const adjustedScore =
        candidate.score -
        repeatedExercisePenalty -
        variationPenalty;

      if (adjustedScore > bestAdjustedScore) {
        best = candidate;
        bestAdjustedScore = adjustedScore;
      }
    }

    return best;
  }

  let totalSlots = 0;
  let matchedSlots = 0;
  let totalExerciseScore = 0;

  const sessions = plan.sessions.map((session) => {
    const suggestedExercises = [];
    const missingSlots = [];
    const usedIds = new Set();

    session.slots.forEach((slot) => {
      totalSlots += 1;

      // Search all 704 exercises, but preserve
      // the movement pattern required by this slot.
      const fallback =
        chooseDiversifiedCandidate(slot, usedIds);

      if (!fallback) {
        missingSlots.push(slot.label);
        return;
      }

      const chosen = fallback.exercise;

      usedIds.add(chosen.id);

      exerciseUseCounts.set(
        chosen.id,
        (exerciseUseCounts.get(chosen.id) ?? 0) + 1
      );

      const variationGroup =
        exerciseAssessmentById.get(chosen.id)
          ?.variationGroup;

      if (variationGroup) {
        variationUseCounts.set(
          variationGroup,
          (variationUseCounts.get(
            variationGroup
          ) ?? 0) + 1
        );
      }

      matchedSlots += 1;
      totalExerciseScore += fallback.score;

      suggestedExercises.push({
        id: chosen.id,
        name: chosen.name,
        muscleGroup: chosen.muscleGroup,
        equipment: chosen.equipment,
      });
    });

    return {
      id: session.id,
      name: session.name,
      exercises: suggestedExercises,
      missingSlots,
    };
  });

  const coverage =
    totalSlots === 0
      ? 0
      : Math.round(
          (matchedSlots / totalSlots) * 100
        );

  return {
    sessions,
    totalSlots,
    matchedSlots,
    coverage,
    averageExerciseScore:
      matchedSlots === 0
        ? 0
        : totalExerciseScore / matchedSlots,
    hasEmptySession: sessions.some(
      (session) =>
        session.exercises.length === 0
    ),
    isComplete: matchedSlots === totalSlots,
  };
}

// ==========================================
// GET RECOMMENDED WORKOUT PLANS
// ==========================================

export function getRecommendedPlans(
  profile,
  location,
  homeEquipment
) {
  if (!profile) {
    return [];
  }

  const frequency = Number(
    profile.trainingDaysPerWeek
  );

  if (
    !Number.isInteger(frequency) ||
    frequency < 1 ||
    frequency > 6
  ) {
    return [];
  }

  const primaryGoal =
    profile.primaryGoal ??
    profile.trainingGoal;

  const secondaryGoal =
    profile.secondaryGoal ?? "";

  return workoutPlans
    .filter(
      (plan) =>
        frequency >= plan.minDays &&
        frequency <= plan.maxDays &&
        plan.levels.includes(
          profile.experienceLevel
        )
    )
    .map((plan) => {
      const preview = buildPlanPreview(
        plan,
        location,
        homeEquipment,
        profile
      );

      const composition =
        evaluatePlanComposition(
          preview,
          profile
        );

      const weekly =
        evaluateRecommendedWeek(
          preview,
          createWeeklyTemplate(
            frequency,
            plan.splitId
          ),
          profile
        );

      const readyToApply =
        preview.isComplete &&
        !preview.hasEmptySession &&
        weekly.missingPatterns.length === 0 &&
        weekly.missingSessions.length === 0;

      let score = 0;

      if (plan.goals.includes(primaryGoal)) {
        score += 8;
      }

      if (
        secondaryGoal &&
        plan.goals.includes(secondaryGoal)
      ) {
        score += 3;
      }

      // Favor plans with more available exercises.
      score += preview.coverage / 20;

      // Prioritize templates with exercises
      // that better match this user's profile.
      score += preview.averageExerciseScore / 10;

      // Composition is a secondary influence.
      // The primary training goal still matters.
      score += composition.score / 20;

      // Evaluate actual weekly distribution
      // of the proposed template.
      score += weekly.score / 20;

      // Missing weekly movement patterns
      // reduce recommendation priority.
      score -=
        weekly.missingPatterns.length * 2;

      // Analyze time without modifying
      // the selected exercises yet.
      const sessionTimeBudgets =
        preview.sessions.map(
          (session) => ({
            sessionId: session.id,
            ...assessSessionTimeBudget(
              session.exercises,
              profile
            ),
          })
        );

      return {
        plan,
        preview,
        composition,
        weekly,
        readyToApply,
        sessionTimeBudgets,
        score,
      };
    })
    .sort(
      (first, second) =>
        Number(second.readyToApply) -
          Number(first.readyToApply) ||
        second.score - first.score ||
        second.preview.coverage -
          first.preview.coverage
    );
}
