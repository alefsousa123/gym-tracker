// D2.3R — Scheduled adherence and safe rolling-plan reconciliation.
// Counts completed workout dates, not sessions or skipped rest dates.
import { getScheduleDayForDate, localDateKey } from './rollingTrainingCycle.js';

const MS_PER_DAY = 86400000;

function dateIndex(key) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(key ?? '')) return null;
  const [year, month, day] = key.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
  return Math.floor(utc / MS_PER_DAY);
}

function dateFromIndex(index) {
  const utc = new Date(index * MS_PER_DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12);
}

function recordedSets(workout) {
  return Array.isArray(workout?.exercises)
    ? workout.exercises.reduce((total, exercise) =>
      total + (Array.isArray(exercise?.completedSets) ? exercise.completedSets.length : 0), 0)
    : 0;
}

function completedDateKeys(history, now) {
  const completed = new Set();
  for (const workout of Array.isArray(history) ? history : []) {
    const finished = new Date(workout?.finishedAt);
    if (!Number.isFinite(finished.getTime()) || finished > now || recordedSets(workout) < 1) continue;
    completed.add(localDateKey(finished));
  }
  return completed;
}

function equalRotation(first, second) {
  return Array.isArray(first) && Array.isArray(second) &&
    first.length === second.length && first.every((id, index) => id === second[index]);
}

// Editing a schedule should not silently rewrite its historical streak.
// Changing the training/rest pattern starts a new adherence tracking window.
export function prepareRollingScheduleSave(previous, draft, now = new Date()) {
  if (draft?.mode !== 'rolling') return draft;
  const prior = previous?.rolling;
  const next = draft.rolling;
  const unchanged = previous?.mode === 'rolling' &&
    previous.splitId === draft.splitId &&
    prior?.startDate === next?.startDate &&
    prior?.trainingDays === next?.trainingDays &&
    prior?.restDays === next?.restDays &&
    equalRotation(prior?.sessionIds, next?.sessionIds);
  return {
    ...draft,
    rolling: {
      ...next,
      trackingStartDate: unchanged
        ? (prior.trackingStartDate ?? localDateKey(now))
        : localDateKey(now),
    },
  };
}

// Preserve a rolling cycle when the applied plan is edited.
// Removing a workout removes its obsolete rotation steps, while new sessions
// are added once. A structural change starts a new tracking window.
export function reconcileRollingScheduleForPlan(schedule, plan, fallbackDays, now = new Date()) {
  if (schedule?.mode !== 'rolling') return schedule;
  if (!plan?.sessions?.length || typeof plan.splitId !== 'string') {
    throw new Error('A valid workout plan is required to update the rolling cycle.');
  }
  const valid = plan.sessions.map(session => session.id);
  const validSet = new Set(valid);
  const previous = Array.isArray(schedule.rolling?.sessionIds) ? schedule.rolling.sessionIds : [];
  const surviving = previous.filter(id => validSet.has(id));
  const introduced = valid.filter(id => !surviving.includes(id));
  const nextRotation = [...surviving, ...introduced];
  const changed = schedule.splitId !== plan.splitId || !equalRotation(previous, nextRotation);
  // The fixed-day draft must also remain valid if the user switches modes later.
  let nextDayIndex = 0;
  const safeDays = schedule.splitId !== plan.splitId
    ? fallbackDays
    : (schedule.days ?? []).map(day => {
      if (day.activity !== 'workout' || validSet.has(day.sessionId)) return { ...day };
      const sessionId = valid[nextDayIndex % valid.length];
      nextDayIndex++;
      return { ...day, sessionId };
    });
  return {
    ...schedule,
    splitId: plan.splitId,
    days: safeDays,
    rolling: {
      ...schedule.rolling,
      sessionIds: nextRotation,
      trackingStartDate: changed
        ? localDateKey(now)
        : (schedule.rolling?.trackingStartDate ?? localDateKey(now)),
    },
  };
}

export function getRollingAdherenceStats(history, schedule, now = new Date()) {
  if (schedule?.mode !== 'rolling') return null;
  const nowIndex = dateIndex(localDateKey(now));
  const anchorIndex = dateIndex(schedule.rolling?.startDate);
  const trackingIndex = dateIndex(schedule.rolling?.trackingStartDate ?? schedule.rolling?.startDate);
  if (nowIndex === null || anchorIndex === null || trackingIndex === null ||
      !Number.isInteger(schedule.rolling?.trainingDays) ||
      !Number.isInteger(schedule.rolling?.restDays) ||
      schedule.rolling.trainingDays < 1 || schedule.rolling.restDays < 1 ||
      !Array.isArray(schedule.rolling.sessionIds) || !schedule.rolling.sessionIds.length) {
    return null;
  }

  const completedDates = completedDateKeys(history, now);
  const startIndex = Math.max(anchorIndex, trackingIndex);
  const timeline = [];
  let completedPlanned = 0;
  let missedPlanned = 0;
  let bestStreak = 0;
  let consecutive = 0;

  // A cap prevents an accidentally ancient anchor from freezing the UI.
  // Only the recent five years are scored. The cycle itself remains unbounded.
  for (let index = Math.max(startIndex, nowIndex - 1825); index <= nowIndex; index++) {
    const date = dateFromIndex(index);
    const key = localDateKey(date);
    const day = getScheduleDayForDate(schedule, date);
    if (!day || day.activity !== 'workout') continue;
    const completed = completedDates.has(key);
    const isToday = index === nowIndex;
    timeline.push({ index, key, completed, isToday, sessionId: day.sessionId });
    if (completed) {
      completedPlanned++;
      consecutive++;
      bestStreak = Math.max(bestStreak, consecutive);
    } else if (!isToday) {
      missedPlanned++;
      consecutive = 0;
    }
  }

  // An unfinished workout scheduled for today does not yet break the streak.
  let currentStreak = 0;
  for (let i = timeline.length - 1; i >= 0; i--) {
    const day = timeline[i];
    if (day.isToday && !day.completed) continue;
    if (!day.completed) break;
    currentStreak++;
  }

  const last14 = Array.from({ length: 14 }, (_, offset) => {
    const index = nowIndex - 13 + offset;
    const date = dateFromIndex(index);
    const key = localDateKey(date);
    const day = getScheduleDayForDate(schedule, date);
    const tracked = index >= startIndex;
    const completed = completedDates.has(key);
    const scheduled = day?.activity === 'workout';
    const status = !tracked ? 'not-tracked'
      : !scheduled ? 'rest'
        : completed ? 'completed'
          : index === nowIndex ? 'upcoming' : 'missed';
    return { date: key, dayId: day?.dayId ?? null, sessionId: day?.sessionId ?? null, status };
  });

  let nextWorkout = null;
  for (let offset = 0; offset < 30; offset++) {
    const day = getScheduleDayForDate(schedule, dateFromIndex(nowIndex + offset));
    if (day?.activity === 'workout' &&
        (offset > 0 || !completedDates.has(localDateKey(now)))) {
      nextWorkout = { date: localDateKey(dateFromIndex(nowIndex + offset)), sessionId: day.sessionId };
      break;
    }
  }

  return {
    trackingStartDate: localDateKey(dateFromIndex(startIndex)),
    completedPlanned,
    missedPlanned,
    currentStreak,
    bestStreak,
    last14,
    nextWorkout,
    today: getScheduleDayForDate(schedule, now),
    trainingDays: schedule.rolling.trainingDays,
    restDays: schedule.rolling.restDays,
  };
}
