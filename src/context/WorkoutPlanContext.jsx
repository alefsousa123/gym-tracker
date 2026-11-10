
import {
  createContext,
  useContext,
  useState,
} from "react";

import {
  useTrainingProfile,
} from "./TrainingProfileContext";

import {
  normalizeExerciseTarget,
} from "../utils/workoutTargets";

const WorkoutPlanContext = createContext(null);

export function WorkoutPlanProvider({ children }) {
  const [appliedPlan, setAppliedPlan] = useState(null);

  const { profile } = useTrainingProfile();

  function applyWorkoutPlan(planData) {
    const weightUnit =
      planData.weightUnit ??
      profile?.weightUnit ??
      "kg";

    const sessions = planData.sessions.map((session) => {
      const exerciseIds = [...session.exerciseIds];

      const exerciseTargets = Object.fromEntries(
        exerciseIds.map((exerciseId) => [
          exerciseId,
          normalizeExerciseTarget(
            exerciseId,
            session.exerciseTargets?.[exerciseId]
          ),
        ])
      );

      return {
        ...session,
        exerciseIds,
        missingSlots: [
          ...(session.missingSlots ?? []),
        ],
        exerciseTargets,
      };
    });

    setAppliedPlan({
      ...planData,
      weightUnit,
      sessions,
    });
  }

  return (
    <WorkoutPlanContext.Provider
      value={{
        appliedPlan,
        applyWorkoutPlan,
      }}
    >
      {children}
    </WorkoutPlanContext.Provider>
  );
}

export function useWorkoutPlan() {
  const context = useContext(WorkoutPlanContext);

  if (!context) {
    throw new Error(
      "useWorkoutPlan must be used within a WorkoutPlanProvider."
    );
  }

  return context;
}
