import { WorkoutPlanContext } from "./WorkoutPlanContext";

import {
  useTrainingProfile,
} from "./TrainingProfileContext";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

import {
  normalizeExerciseTarget,
} from "../utils/workoutTargets";

const STORAGE_KEY =
  "gym-tracker:applied-plan:v1";

function isValidPlan(value) {
  return (
    value === null ||
    (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.splitId === "string" &&
      Array.isArray(value.sessions)
    )
  );
}

export function WorkoutPlanProvider({
  children,
}) {
  const { profile } =
    useTrainingProfile();

  const [appliedPlan, setAppliedPlan] =
    usePersistentState(
      STORAGE_KEY,
      null,
      isValidPlan
    );

  // ========================================
  // APPLY A COMPLETE WORKOUT PLAN
  // ========================================

  function applyWorkoutPlan(planData) {
    if (!planData) {
      setAppliedPlan(null);
      return;
    }

    const weightUnit =
      planData.weightUnit ??
      profile?.weightUnit ??
      "kg";

    const sessions = planData.sessions.map(
      (session) => {
        const exerciseIds = [
          ...session.exerciseIds,
        ];

        const exerciseTargets =
          Object.fromEntries(
            exerciseIds.map(
              (exerciseId) => [
                exerciseId,

                normalizeExerciseTarget(
                  exerciseId,
                  session.exerciseTargets?.[
                    exerciseId
                  ]
                ),
              ]
            )
          );

        return {
          ...session,

          exerciseIds,

          missingSlots: [
            ...(session.missingSlots ?? []),
          ],

          exerciseTargets,
        };
      }
    );

    setAppliedPlan({
      ...planData,
      weightUnit,
      sessions,
    });
  }

  // ========================================
  // MANUAL EXERCISE WEIGHT UPDATE
  // ========================================

  function updateExerciseWeight(
    sessionId,
    exerciseId,
    nextWeight
  ) {
    const weight = Number(nextWeight);

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      return false;
    }

    const sessionExists =
      appliedPlan?.sessions.some(
        (session) =>
          session.id === sessionId &&
          session.exerciseIds.includes(
            exerciseId
          )
      );

    if (!sessionExists) {
      return false;
    }

    setAppliedPlan((previousPlan) => {
      if (!previousPlan) {
        return previousPlan;
      }

      const sessions =
        previousPlan.sessions.map(
          (session) => {
            if (session.id !== sessionId) {
              return session;
            }

            const currentTarget =
              normalizeExerciseTarget(
                exerciseId,
                session.exerciseTargets?.[
                  exerciseId
                ]
              );

            return {
              ...session,

              exerciseTargets: {
                ...session.exerciseTargets,

                [exerciseId]: {
                  ...currentTarget,
                  weight,
                },
              },
            };
          }
        );

      return {
        ...previousPlan,
        sessions,
      };
    });

    return true;
  }

  return (
    <WorkoutPlanContext.Provider
      value={{
        appliedPlan,
        applyWorkoutPlan,
        updateExerciseWeight,
      }}
    >
      {children}
    </WorkoutPlanContext.Provider>
  );
}
