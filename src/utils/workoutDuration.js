/**
 * UI-only formatting / split helpers.
 * Workout plans and records continue storing durationSeconds (integer).
 */
export function splitDurationSeconds(value) {
  const parsed = Number(value);
  const total = Number.isFinite(parsed)
    ? Math.max(0, Math.floor(parsed))
    : 0;

  return {
    minutes: Math.floor(total / 60),
    seconds: total % 60,
  };
}

export function combineDurationParts(minutes, seconds) {
  const min = Number(minutes);
  const sec = Number(seconds);
  if (!Number.isInteger(min) || min < 0 ||
      !Number.isInteger(sec) || sec < 0 || sec > 59) {
    return null;
  }
  return min * 60 + sec;
}

export function formatDurationLabel(value) {
  const { minutes, seconds } = splitDurationSeconds(value);
  if (minutes === 0) return String(seconds) + ' sec';
  if (seconds === 0) return String(minutes) + ' min';
  return String(minutes) + ' min ' + seconds + ' sec';
}
