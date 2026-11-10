
export const daysOfWeek = [
  { id: "monday", label: "Monday", shortLabel: "Mon" },
  { id: "tuesday", label: "Tuesday", shortLabel: "Tue" },
  { id: "wednesday", label: "Wednesday", shortLabel: "Wed" },
  { id: "thursday", label: "Thursday", shortLabel: "Thu" },
  { id: "friday", label: "Friday", shortLabel: "Fri" },
  { id: "saturday", label: "Saturday", shortLabel: "Sat" },
  { id: "sunday", label: "Sunday", shortLabel: "Sun" },
];

export const workoutSplits = [
  {
    id: "full-body",
    name: "Full Body",
    description: "Full-body sessions throughout the week.",
    sessions: [
      { id: "full-body", label: "Full Body" },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "Alternate upper-body and lower-body sessions.",
    sessions: [
      { id: "upper", label: "Upper Body" },
      { id: "lower", label: "Lower Body" },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    description: "Organize sessions by movement pattern.",
    sessions: [
      { id: "push", label: "Push" },
      { id: "pull", label: "Pull" },
      { id: "legs", label: "Legs" },
    ],
  },
  {
    id: "abc",
    name: "ABC",
    description: "Plan three rotating workout categories.",
    sessions: [
      { id: "a", label: "Workout A" },
      { id: "b", label: "Workout B" },
      { id: "c", label: "Workout C" },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Prepare a flexible schedule for custom workouts.",
    sessions: [
      { id: "custom", label: "Custom Workout" },
    ],
  },
];

// Starting templates based on weekly training frequency
const preferredTrainingDays = {
  1: ["monday"],
  2: ["monday", "thursday"],
  3: ["monday", "wednesday", "friday"],
  4: ["monday", "tuesday", "thursday", "friday"],
  5: ["monday", "tuesday", "wednesday", "friday", "saturday"],
  6: [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ],
  7: [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ],
};

export function getSplitById(splitId) {
  return (
    workoutSplits.find((split) => split.id === splitId) ??
    workoutSplits[0]
  );
}

export function getSuggestedSplit(trainingDaysPerWeek) {
  const frequency = Number(trainingDaysPerWeek);

  if (frequency <= 3) {
    return "full-body";
  }

  if (frequency === 4) {
    return "upper-lower";
  }

  return "push-pull-legs";
}

// Assign session types in chronological order
export function assignWorkoutSessions(
  days,
  splitId,
  preserveExisting = false
) {
  const split = getSplitById(splitId);
  let workoutIndex = 0;

  return days.map((day) => {
    if (day.activity !== "workout") {
      return {
        ...day,
        sessionId: null,
      };
    }

    const suggestedSession =
      split.sessions[workoutIndex % split.sessions.length];

    workoutIndex += 1;

    const existingSessionIsValid = split.sessions.some(
      (session) => session.id === day.sessionId
    );

    return {
      ...day,
      sessionId:
        preserveExisting && existingSessionIsValid
          ? day.sessionId
          : suggestedSession.id,
    };
  });
}

// Generate an editable weekly starting template
export function createWeeklyTemplate(
  trainingDaysPerWeek = 3,
  selectedSplitId = null
) {
  const requestedFrequency = Number(trainingDaysPerWeek);

  const frequency =
    Number.isInteger(requestedFrequency) &&
    requestedFrequency >= 1 &&
    requestedFrequency <= 7
      ? requestedFrequency
      : 3;

  const splitId =
    selectedSplitId ?? getSuggestedSplit(frequency);

  const selectedDays = new Set(
    preferredTrainingDays[frequency]
  );

  const days = daysOfWeek.map((day) => ({
    dayId: day.id,
    activity: selectedDays.has(day.id)
      ? "workout"
      : "rest",
    sessionId: null,
  }));

  return {
    splitId,
    days: assignWorkoutSessions(days, splitId),
  };
}
