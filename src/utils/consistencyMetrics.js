
function isValidGoal(value) {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

// Prefer the saved weekly schedule.
// Fall back to the training profile.
export function getWeeklyTrainingGoal(
  profile,
  weeklySchedule
) {
  const scheduleDays = Array.isArray(
    weeklySchedule?.days
  )
    ? weeklySchedule.days.filter(
        (day) => day.activity === "workout"
      ).length
    : 0;

  if (isValidGoal(scheduleDays)) {
    return scheduleDays;
  }

  const profileDays = Number(
    profile?.trainingDaysPerWeek
  );

  return isValidGoal(profileDays)
    ? profileDays
    : null;
}

// Start each week on Monday, using local time.
function startOfLocalWeek(date) {
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const daysFromMonday =
    (monday.getDay() + 6) % 7;

  monday.setDate(
    monday.getDate() - daysFromMonday
  );

  return monday;
}

// Calendar arithmetic avoids DST-related errors.
function addWeeks(date, amount) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount * 7
  );

  return result;
}

function localDayKey(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// A workout counts as an active session only
// when at least one set was recorded.
function recordedSetCount(workout) {
  if (!Array.isArray(workout?.exercises)) {
    return 0;
  }

  return workout.exercises.reduce(
    (total, exercise) => {
      const sets = Array.isArray(
        exercise.completedSets
      )
        ? exercise.completedSets.length
        : 0;

      return total + sets;
    },
    0
  );
}

export function getConsistencyStats(
  workoutHistory,
  weeklyGoal,
  today = new Date()
) {
  const goal = isValidGoal(weeklyGoal)
    ? weeklyGoal
    : null;

  const now = new Date(today);

  const currentWeekStart =
    startOfLocalWeek(now);

  const currentWeekKey =
    localDayKey(currentWeekStart);

  // Each week contains a Set of unique
  // training dates, not individual sessions.
  const activityByWeek = new Map();

  let earliestActiveWeek = null;
  let totalSessions = 0;

  const history = Array.isArray(workoutHistory)
    ? workoutHistory
    : [];

  for (const workout of history) {
    if (recordedSetCount(workout) === 0) {
      continue;
    }

    const completedAt = new Date(
      workout?.finishedAt
    );

    if (
      Number.isNaN(completedAt.getTime()) ||
      completedAt > now
    ) {
      continue;
    }

    const weekStart =
      startOfLocalWeek(completedAt);

    const weekKey =
      localDayKey(weekStart);

    const dayKey =
      localDayKey(completedAt);

    if (!activityByWeek.has(weekKey)) {
      activityByWeek.set(
        weekKey,
        new Set()
      );
    }

    // Multiple sessions on the same date
    // still count as one training day.
    activityByWeek.get(weekKey).add(dayKey);

    totalSessions += 1;

    if (
      !earliestActiveWeek ||
      weekStart < earliestActiveWeek
    ) {
      earliestActiveWeek = weekStart;
    }
  }

  // Construct the information for one week.
  function makeWeek(start) {
    const key = localDayKey(start);

    const days =
      activityByWeek.get(key)?.size ?? 0;

    const isCurrent =
      key === currentWeekKey;

    const goalMet =
      goal !== null &&
      days >= goal;

    const progressPercent = goal
      ? Math.min(
          100,
          Math.round(
            (days / goal) * 100
          )
        )
      : Math.min(
          100,
          Math.round(
            (days / 7) * 100
          )
        );

    return {
      key,
      start: new Date(start),
      days,
      isCurrent,
      goalMet,

      beforeHistory:
        !earliestActiveWeek ||
        start < earliestActiveWeek,

      progressPercent,
    };
  }

  // Last 8 calendar weeks, including this one.
  const weeks = Array.from(
    { length: 8 },
    (_, index) =>
      makeWeek(
        addWeeks(
          currentWeekStart,
          index - 7
        )
      )
  );

  // Build the complete timeline from the
  // first recorded workout to the current week.
  const historyWeeks = [];

  if (earliestActiveWeek) {
    for (
      let cursor = new Date(
        earliestActiveWeek
      );
      cursor <= currentWeekStart;
      cursor = addWeeks(cursor, 1)
    ) {
      historyWeeks.push(
        makeWeek(cursor)
      );
    }
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let consecutive = 0;

  if (goal !== null) {
    // Longest run of weeks meeting the goal.
    for (const week of historyWeeks) {
      // An unfinished current week should
      // not break an existing streak.
      if (
        week.isCurrent &&
        !week.goalMet
      ) {
        continue;
      }

      consecutive = week.goalMet
        ? consecutive + 1
        : 0;

      bestStreak = Math.max(
        bestStreak,
        consecutive
      );
    }

    // Count backward from the latest
    // eligible week.
    for (
      let index = historyWeeks.length - 1;
      index >= 0;
      index--
    ) {
      const week = historyWeeks[index];

      if (
        week.isCurrent &&
        !week.goalMet
      ) {
        continue;
      }

      if (!week.goalMet) {
        break;
      }

      currentStreak += 1;
    }
  }

  // Only assess completed weeks.
  // Do not treat weeks before the user's
  // first recorded workout as missed weeks.
  const finishedWeeks =
    historyWeeks.filter(
      (week) => !week.isCurrent
    );

  const recentFinishedWeeks =
    finishedWeeks.slice(-4);

  const recentGoalWeeks =
    recentFinishedWeeks.filter(
      (week) => week.goalMet
    ).length;

  const totalTrainingDays = Array.from(
    activityByWeek.values()
  ).reduce(
    (total, dates) =>
      total + dates.size,
    0
  );

  return {
    goal,

    currentWeek: makeWeek(
      currentWeekStart
    ),

    weeks,

    totalSessions,
    totalTrainingDays,

    currentStreak,
    bestStreak,

    recentGoalWeeks,

    recentWeekCount:
      recentFinishedWeeks.length,
  };
}
