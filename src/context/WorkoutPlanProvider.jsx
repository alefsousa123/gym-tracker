import { WorkoutPlanContext } from "./WorkoutPlanContext";

import {
  useTrainingProfile,
} from "./TrainingProfileContext";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

import {
  getExerciseEntries,
  saveExerciseEntriesToSession,
  updateExerciseEntryTarget,
} from "../utils/workoutExerciseEntries";

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


    // U1.5B - OCCURRENCE-AWARE PLAN

    const sessions =
      planData.sessions.map(
        (session) => ({
          ...saveExerciseEntriesToSession(
            session,
            getExerciseEntries(session)
          ),

          missingSlots: [
            ...(session.missingSlots ?? []),
          ],
        })
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
    exerciseReference,
    nextWeight
  ) {
    const weight = Number(nextWeight);

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      return false;
    }

    const selectedSession =
      appliedPlan?.sessions.find(
        (session) =>
          session.id === sessionId
      );

    if (!selectedSession) {
      return false;
    }

    const entries =
      getExerciseEntries(selectedSession);

    const exactEntry = entries.find(
      (entry) =>
        entry.entryId === exerciseReference
    );

    const matchingExercises =
      entries.filter(
        (entry) =>
          entry.exerciseId ===
          exerciseReference
      );

    // Entry ID selects one occurrence.
    //
    // A catalog exercise ID remains supported
    // when it identifies exactly one entry.
    //
    // If duplicates exist, a catalog ID alone
    // is ambiguous, so do not change weights.

    const selectedEntry =
      exactEntry ??
      (
        matchingExercises.length === 1
          ? matchingExercises[0]
          : null
      );

    if (!selectedEntry) {
      return false;
    }

    setAppliedPlan((previousPlan) => {
      if (!previousPlan) {
        return previousPlan;
      }

      return {
        ...previousPlan,

        sessions:
          previousPlan.sessions.map(
            (session) =>
              session.id === sessionId
                ? updateExerciseEntryTarget(
                    session,
                    selectedEntry.entryId,
                    { weight }
                  )
                : session
          ),
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
