
import {
  createContext,
  useContext,
  useState,
} from "react";

const WeeklyScheduleContext = createContext(null);

export function WeeklyScheduleProvider({ children }) {
  const [weeklySchedule, setWeeklySchedule] = useState(null);

  function saveWeeklySchedule(schedule) {
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
  const context = useContext(WeeklyScheduleContext);

  if (!context) {
    throw new Error(
      "useWeeklySchedule must be used within a WeeklyScheduleProvider."
    );
  }

  return context;
}
