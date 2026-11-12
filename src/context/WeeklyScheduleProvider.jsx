import { WeeklyScheduleContext } from "./WeeklyScheduleContext";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

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
      ...schedule,
      days: schedule.days.map(day => ({ ...day })),
      ...(schedule.rolling ? { rolling: {
        ...schedule.rolling,
        sessionIds: [...schedule.rolling.sessionIds],
      }} : {}),
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
