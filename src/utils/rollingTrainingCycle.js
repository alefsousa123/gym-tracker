// D2.3Q — Rolling training cycle, independent of weekdays.
// Date arithmetic is based on local calendar dates and UTC day indexes.

const DAY_IDS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_MS = 86400000;

export function localDateKey(date = new Date()) {
  return String(date.getFullYear()).padStart(4, '0') + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function dayIndexFromKey(value) {
  const match = /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const verified = new Date(time);
  if (verified.getUTCFullYear() !== year ||
      verified.getUTCMonth() + 1 !== month ||
      verified.getUTCDate() !== day) return null;
  return Math.floor(time / DAY_MS);
}

export function createDefaultRollingCycle(plan, date = new Date()) {
  return {
    startDate: localDateKey(date),
    trainingDays: 3,
    restDays: 1,
    sessionIds: (plan?.sessions ?? []).map(session => session.id),
  };
}

export function getRollingConfigurationError(schedule, plan) {
  if (!plan || plan.splitId !== schedule?.splitId) {
    return 'Apply a workout plan with the same split before saving a rolling cycle.';
  }
  const config = schedule?.rolling;
  if (dayIndexFromKey(config?.startDate) === null) {
    return 'Choose a valid cycle starting date.';
  }
  for (const [name, value] of [
    ['training days', config.trainingDays],
    ['rest days', config.restDays],
  ]) {
    if (!Number.isInteger(value) || value < 1 || value > 7) {
      return 'Choose between 1 and 7 ' + name + '.';
    }
  }
  const ids = config.sessionIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 14) {
    return 'Add between 1 and 14 steps to the workout rotation.';
  }
  const validIds = new Set(plan.sessions.map(session => session.id));
  if (ids.some(id => typeof id !== 'string' || !validIds.has(id))) {
    return 'The rotation includes a session that is no longer in the applied plan.';
  }
  return null;
}

export function getRollingScheduleDay(schedule, date = new Date()) {
  if (schedule?.mode !== 'rolling') return null;
  const config = schedule.rolling;
  const anchor = dayIndexFromKey(config?.startDate);
  const today = dayIndexFromKey(localDateKey(date));
  if (anchor === null || today === null ||
      !Number.isInteger(config?.trainingDays) ||
      !Number.isInteger(config?.restDays) ||
      config.trainingDays < 1 || config.restDays < 1 ||
      !Array.isArray(config.sessionIds) || config.sessionIds.length === 0) {
    return null;
  }
  const dayId = DAY_IDS[(date.getDay() + 6) % 7];
  const dateKey = localDateKey(date);
  const elapsed = today - anchor;
  if (elapsed < 0) {
    return { date: dateKey, dayId, activity: 'not-started', sessionId: null };
  }
  const cycleLength = config.trainingDays + config.restDays;
  const position = elapsed % cycleLength;
  if (position >= config.trainingDays) {
    return { date: dateKey, dayId, activity: 'rest', sessionId: null };
  }
  const workoutIndex = Math.floor(elapsed / cycleLength) * config.trainingDays + position;
  return {
    date: dateKey,
    dayId,
    activity: 'workout',
    sessionId: config.sessionIds[workoutIndex % config.sessionIds.length],
  };
}

export function getScheduleDayForDate(schedule, date = new Date()) {
  if (!schedule) return null;
  if (schedule.mode === 'rolling') return getRollingScheduleDay(schedule, date);
  const dayId = DAY_IDS[(date.getDay() + 6) % 7];
  return schedule.days?.find(day => day.dayId === dayId) ?? null;
}
