import {
  assignWorkoutSessions,
  getSplitById,
} from "../data/workoutSplits";

/**
 * D1.20.2 - Personalized schedule compatibility.
 *
 * Allows the existing weekly calendar to
 * display and assign day-specific sessions.
 *
 * This module does not write to storage.
 */

function getPersonalizedSessions(
  splitId,
  appliedPlan
) {
  if (
    !appliedPlan || (appliedPlan?.isPersonalized !== true && splitId !== 'custom') ||
    appliedPlan.splitId !== splitId ||
    !Array.isArray(appliedPlan.sessions) ||
    appliedPlan.sessions.length === 0
  ) {
    return null;
  }

  const sessions = appliedPlan.sessions;

  const ids = sessions.map(
    (session) => session.id
  );

  const valid =
    sessions.every(
      (session) =>
        typeof session.id === "string" &&
        session.id.length > 0 &&
        typeof session.name === "string" &&
        Array.isArray(session.exerciseIds)
    ) &&
    new Set(ids).size === ids.length;

  return valid ? sessions : null;
}

/**
 * Return options accepted by the
 * weekly calendar session selector.
 */
export function getCompatibleScheduleSessionOptions(
  splitId,
  appliedPlan
) {
  const personalized =
    getPersonalizedSessions(
      splitId,
      appliedPlan
    );

  if (personalized) {
    return personalized.map(
      (session) => ({
        id: session.id,
        label: session.name,
      })
    );
  }

  return getSplitById(
    splitId
  ).sessions.map(
    (session) => ({
      id: session.id,
      label: session.label,
    })
  );
}

/**
 * Assign compatible session IDs.
 *
 * When preserveExisting is true, existing
 * valid personalized assignments remain
 * untouched. New workout days reuse the
 * least-assigned available session.
 *
 * Moving a workout to another day can
 * therefore retain its original session ID.
 */
export function assignCompatibleWorkoutSessions(
  days,
  splitId,
  appliedPlan,
  preserveExisting = false
) {
  if (!Array.isArray(days)) {
    throw new TypeError(
      "Schedule days must be an array."
    );
  }

  const personalized =
    getPersonalizedSessions(
      splitId,
      appliedPlan
    );

  // Keep original behavior for every
  // nonpersonalized plan.
  if (!personalized) {
    return assignWorkoutSessions(
      days,
      splitId,
      preserveExisting
    );
  }

  const options =
    getCompatibleScheduleSessionOptions(
      splitId,
      appliedPlan
    );

  const validIds = new Set(
    options.map((option) => option.id)
  );

  const counts = new Map(
    options.map((option) => [
      option.id,
      0,
    ])
  );

  // Count assignments that we will keep.
  if (preserveExisting) {
    for (const day of days) {
      if (
        day.activity === "workout" &&
        validIds.has(day.sessionId)
      ) {
        counts.set(
          day.sessionId,
          counts.get(day.sessionId) + 1
        );
      }
    }
  }

  return days.map((day) => {
    if (day.activity !== "workout") {
      return {
        ...day,
        sessionId: null,
      };
    }

    if (
      preserveExisting &&
      validIds.has(day.sessionId)
    ) {
      return {
        ...day,
      };
    }

    // Select the least-used session.
    // Ties follow the saved plan order.
    const next = options.reduce(
      (best, option) =>
        counts.get(option.id) <
        counts.get(best.id)
          ? option
          : best,
      options[0]
    );

    counts.set(
      next.id,
      counts.get(next.id) + 1
    );

    return {
      ...day,
      sessionId: next.id,
    };
  });
}
