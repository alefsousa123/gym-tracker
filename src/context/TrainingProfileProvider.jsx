import { TrainingProfileContext } from "./TrainingProfileContext";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

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
