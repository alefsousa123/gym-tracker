
import {
  createContext,
  useContext,
} from "react";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

const WeeklyScheduleContext =
  createContext(null);

const STORAGE_KEY =
  "gym-tracker:weekly-schedule:v1";

function isValidSchedule(value) {
  return (
    value === null ||
    (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.splitId === "string" &&
      Array.isArray(value.days)
    )
  );
}

export function WeeklyScheduleProvider({
  children,
}) {
  const [
    weeklySchedule,
    setWeeklySchedule,
  ] = usePersistentState(
    STORAGE_KEY,
    null,
    isValidSchedule
  );

  function saveWeeklySchedule(schedule) {
    if (!schedule) {
      setWeeklySchedule(null);
      return;
    }

    setWeeklySchedule({
      splitId: schedule.splitId,

      days: schedule.days.map((day) => ({
        ...day,
      })),
    });
  }

  return (
    <WeeklyScheduleContext.Provider
      value={{
        weeklySchedule,
        saveWeeklySchedule,
      }}
    >
      {children}
    </WeeklyScheduleContext.Provider>
  );
}

export function useWeeklySchedule() {
  const context = useContext(
    WeeklyScheduleContext
  );

  if (!context) {
    throw new Error(
      "useWeeklySchedule must be used within a WeeklyScheduleProvider."
    );
  }

  return context;
}
