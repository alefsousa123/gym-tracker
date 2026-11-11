import { createContext, useContext } from "react";

export const WorkoutSessionContext = createContext(null);

export function useWorkoutSession() {
  const context = useContext(
    WorkoutSessionContext
  );

  if (!context) {
    throw new Error(
      "useWorkoutSession must be used within a WorkoutSessionProvider."
    );
  }

  return context;
}
