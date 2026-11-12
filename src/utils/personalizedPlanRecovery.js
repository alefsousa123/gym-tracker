/**
 * D1.20.4 - Personalized plan recovery.
 *
 * Validates recovery snapshots and
 * verifies storage writes before the
 * React providers are updated.
 */

export const RECOVERY_PREFIX =
  "gym-tracker:personalized-recovery:v1:";

export const APPLIED_PLAN_KEY =
  "gym-tracker:applied-plan:v1";

export const WEEKLY_SCHEDULE_KEY =
  "gym-tracker:weekly-schedule:v1";

const DAYS = new Set([
  "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
  "sunday",
]);

const ACTIVITIES = new Set([
  "workout", "rest", "active-recovery",
]);

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isValidPlan(plan) {
  if (plan === null) return true;

  return (
    isObject(plan) &&
    typeof plan.splitId === "string" &&
    plan.splitId.length > 0 &&
    Array.isArray(plan.sessions) &&
    plan.sessions.every(
      (session) =>
        isObject(session) &&
        typeof session.id === "string" &&
        session.id.length > 0 &&
        Array.isArray(session.exerciseIds) &&
        session.exerciseIds.every(
          (id) =>
            typeof id === "string" &&
            id.length > 0
        ) &&
        (
          session.exerciseTargets === undefined ||
          isObject(session.exerciseTargets)
        )
    ) &&
    new Set(
      plan.sessions.map(
        (session) => session.id
      )
    ).size === plan.sessions.length
  );
}

function isValidSchedule(schedule) {
  if (schedule === null) return true;

  if (
    !isObject(schedule) ||
    typeof schedule.splitId !== "string" ||
    !Array.isArray(schedule.days) ||
    schedule.days.length !== 7
  ) {
    return false;
  }

  const unique = new Set();

  for (const day of schedule.days) {
    if (
      !isObject(day) ||
      !DAYS.has(day.dayId) ||
      !ACTIVITIES.has(day.activity) ||
      unique.has(day.dayId)
    ) {
      return false;
    }

    if (
      day.activity === "workout" &&
      (
        typeof day.sessionId !== "string" ||
        day.sessionId.length === 0
      )
    ) {
      return false;
    }

    unique.add(day.dayId);
  }

  return true;
}

function validateSnapshot(snapshot) {
  if (
    !isObject(snapshot) ||
    snapshot.version !== 1 ||
    typeof snapshot.savedAt !== "string" ||
    !Number.isFinite(
      Date.parse(snapshot.savedAt)
    ) ||
    !Object.hasOwn(snapshot, "appliedPlan") ||
    !Object.hasOwn(snapshot, "weeklySchedule") ||
    !isValidPlan(snapshot.appliedPlan) ||
    !isValidSchedule(snapshot.weeklySchedule)
  ) {
    throw new Error(
      "This recovery copy is invalid or incompatible."
    );
  }

  return snapshot;
}

function requireStorage(storage) {
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    throw new Error(
      "Browser storage is unavailable."
    );
  }
}

export function readPersonalizedRecoverySnapshot(
  storage,
  key
) {
  requireStorage(storage);

  if (
    typeof key !== "string" ||
    !key.startsWith(RECOVERY_PREFIX)
  ) {
    throw new Error(
      "Invalid recovery copy identifier."
    );
  }

  const raw = storage.getItem(key);

  if (raw === null) {
    throw new Error(
      "Recovery copy no longer exists."
    );
  }

  let snapshot;

  try {
    snapshot = JSON.parse(raw);
  } catch {
    throw new Error(
      "Recovery copy contains invalid JSON."
    );
  }

  return validateSnapshot(snapshot);
}

export function listPersonalizedRecoverySnapshots(
  storage
) {
  requireStorage(storage);

  if (
    typeof storage.key !== "function" ||
    !Number.isInteger(storage.length)
  ) {
    throw new Error(
      "Storage does not support listing copies."
    );
  }

  const entries = [];

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);

    if (
      typeof key !== "string" ||
      !key.startsWith(RECOVERY_PREFIX)
    ) {
      continue;
    }

    try {
      const snapshot =
        readPersonalizedRecoverySnapshot(
          storage,
          key
        );

      entries.push({
        key,
        savedAt: snapshot.savedAt,
        planName:
          snapshot.appliedPlan?.name ??
          "No previous plan",
        hasPlan:
          snapshot.appliedPlan !== null,
        hasSchedule:
          snapshot.weeklySchedule !== null,
        sessionCount:
          snapshot.appliedPlan?.sessions
            .length ?? 0,
      });
    } catch {
      // Invalid copies are not offered
      // as restoration choices.
    }
  }

  return entries.sort(
    (a, b) =>
      Date.parse(b.savedAt) -
      Date.parse(a.savedAt) ||
      b.key.localeCompare(a.key)
  );
}

/**
 * Verify browser persistence before
 * updating the React provider states.
 *
 * If either write fails, attempt to
 * restore both previous storage values.
 *
 * Browser localStorage is not truly
 * transactional, so keep the separate
 * recovery snapshot as well.
 */
export function persistRecoveredPlanState(
  storage,
  snapshot
) {
  requireStorage(storage);
  validateSnapshot(snapshot);

  const originalPlan =
    storage.getItem(APPLIED_PLAN_KEY);

  const originalSchedule =
    storage.getItem(WEEKLY_SCHEDULE_KEY);

  const nextPlan = JSON.stringify(
    snapshot.appliedPlan
  );

  const nextSchedule = JSON.stringify(
    snapshot.weeklySchedule
  );

  try {
    storage.setItem(
      APPLIED_PLAN_KEY,
      nextPlan
    );

    storage.setItem(
      WEEKLY_SCHEDULE_KEY,
      nextSchedule
    );

    if (
      storage.getItem(APPLIED_PLAN_KEY) !==
        nextPlan ||
      storage.getItem(WEEKLY_SCHEDULE_KEY) !==
        nextSchedule
    ) {
      throw new Error(
        "Storage verification failed."
      );
    }
  } catch (error) {
    const rollbackErrors = [];

    for (const [key, previous] of [
      [APPLIED_PLAN_KEY, originalPlan],
      [WEEKLY_SCHEDULE_KEY, originalSchedule],
    ]) {
      try {
        if (previous === null) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, previous);
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          rollbackError.message
        );
      }
    }

    const suffix =
      rollbackErrors.length > 0
        ? " Automatic rollback also failed. Use the recovery copy."
        : " Previous storage values were restored.";

    throw new Error(
      "Recovery could not be persisted: " +
      error.message +
      "." +
      suffix,
      { cause: error }
    );
  }

  return {
    persisted: true,
    planName:
      snapshot.appliedPlan?.name ??
      "No plan",
  };
}
