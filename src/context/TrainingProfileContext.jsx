
import {
  createContext,
  useContext,
} from "react";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

const TrainingProfileContext =
  createContext(null);

const STORAGE_KEY =
  "gym-tracker:profile:v1";

function isValidProfile(value) {
  return (
    value === null ||
    (
      typeof value === "object" &&
      !Array.isArray(value)
    )
  );
}

export function TrainingProfileProvider({
  children,
}) {
  // Null means the user has not saved a profile yet.
  const [profile, setProfile] =
    usePersistentState(
      STORAGE_KEY,
      null,
      isValidProfile
    );

  function saveProfile(updatedProfile) {
    setProfile({
      ...updatedProfile,
    });
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
