import { createContext, useContext } from "react";

export const WorkoutPlanContext = createContext(null);

export function useWorkoutPlan() {
  const context = useContext(
    WorkoutPlanContext
  );

  if (!context) {
    throw new Error(
      "useWorkoutPlan must be used within a WorkoutPlanProvider."
    );
  }

  return context;
}
