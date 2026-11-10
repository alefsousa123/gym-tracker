
import { createContext, useContext, useState } from "react";

// Initial training profile values
export const initialTrainingProfile = {
  primaryGoal: "",
  secondaryGoal: "",
  experienceLevel: "",
  trainingLocation: "",
  trainingDaysPerWeek: "3",
  sessionDurationMinutes: "60",
  weightUnit: "kg",
};

// Create the shared context
const TrainingProfileContext = createContext(null);

// Provide training profile data to the application
export function TrainingProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  function saveProfile(updatedProfile) {
    setProfile(updatedProfile);
  }

  return (
    <TrainingProfileContext.Provider
      value={{
        profile,
        saveProfile,
      }}
    >
      {children}
    </TrainingProfileContext.Provider>
  );
}

// Custom hook for accessing the training profile
export function useTrainingProfile() {
  const context = useContext(TrainingProfileContext);

  if (!context) {
    throw new Error(
      "useTrainingProfile must be used within a TrainingProfileProvider."
    );
  }

  return context;
}
