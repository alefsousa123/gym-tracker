import { createContext, useContext } from "react";

export const TrainingProfileContext = createContext(null);

export function useTrainingProfile() {
  const context = useContext(
    TrainingProfileContext
  );

  if (!context) {
    throw new Error(
      "useTrainingProfile must be used within a TrainingProfileProvider."
    );
  }

  return context;
}
