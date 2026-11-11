import { createContext, useContext } from "react";

export const WeeklyScheduleContext = createContext(null);

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
