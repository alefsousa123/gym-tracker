import {
  buildPersonalizedPlanApplication,
} from "./personalizedPlanApplication";

import {
  getCompatibleScheduleSessionOptions,
  assignCompatibleWorkoutSessions,
} from "./personalizedScheduleCompatibility";

/**
 * D1.20.3 - Safety checks before applying
 * a personalized plan.
 *
 * The preparation step is pure.
 * Nothing is persisted here.
 */
export function preparePersonalizedActivation({
  profile,
  proposal,
  splitId,
  location,
  activeWorkout = null,
  acceptCoverageLimitations = false,
}) {
  if (activeWorkout) {
    throw new Error(
      "Finish or discard the active workout before changing plans."
    );
  }

  if (!profile || !proposal) {
    throw new Error(
      "Training profile and preview are required."
    );
  }

  if (!proposal.completeSelection) {
    throw new Error(
      "The personalized draft is incomplete."
    );
  }

  // D2.3T v3 EQUIPMENT ADAPTED: explicit consent.
  if (
    proposal.adaptedToEquipment === true &&
    proposal.adaptationChanges?.length > 0 &&
    !acceptCoverageLimitations
  ) {
    throw new Error(
      "Confirm the changed muscle coverage before applying this alternative."
    );
  }

  if (
    proposal.splitId !== splitId ||
    proposal.location !== location
  ) {
    throw new Error(
      "The preview no longer matches the selected split or location."
    );
  }

  const prepared =
    buildPersonalizedPlanApplication({
      profile,
      proposal,
      templateId: "personalized",
      templateName:
        "Personalized " +
        splitId.toUpperCase() +
        " Plan",
    });

  const { planData, scheduleData } = prepared;

  const options =
    getCompatibleScheduleSessionOptions(
      scheduleData.splitId,
      planData
    );

  const validIds = new Set(
    options.map((option) => option.id)
  );

  const workoutDays =
    scheduleData.days.filter(
      (day) => day.activity === "workout"
    );

  const sessionIds =
    planData.sessions.map(
      (session) => session.id
    );

  if (
    new Set(sessionIds).size !== sessionIds.length ||
    validIds.size !== sessionIds.length ||
    workoutDays.length !== sessionIds.length
  ) {
    throw new Error(
      "Personalized session identifiers are inconsistent."
    );
  }

  for (const day of workoutDays) {
    if (!validIds.has(day.sessionId)) {
      throw new Error(
        "Invalid scheduled session: " +
        day.sessionId
      );
    }

    const session =
      planData.sessions.find(
        (item) => item.id === day.sessionId
      );

    if (
      !session ||
      session.exerciseIds.length === 0 ||
      session.exerciseIds.some(
        (id) => !session.exerciseTargets[id]
      )
    ) {
      throw new Error(
        "Missing exercises or training targets."
      );
    }
  }

  const verifiedDays =
    assignCompatibleWorkoutSessions(
      scheduleData.days,
      scheduleData.splitId,
      planData,
      true
    );

  if (
    JSON.stringify(verifiedDays) !==
    JSON.stringify(scheduleData.days)
  ) {
    throw new Error(
      "The calendar cannot preserve the personalized assignments."
    );
  }

  return {
    ...prepared,
    readyForPersistence: true,
    requiresCalendarCompatibility: false,
  };
}

/**
 * Save the previous applied plan and
 * schedule before replacing them.
 *
 * If localStorage is unavailable or full,
 * throw and DO NOT proceed with applying.
 */
export function savePersonalizedRecoverySnapshot(
  storage,
  { appliedPlan, weeklySchedule }
) {
  if (
    !storage ||
    typeof storage.setItem !== "function" ||
    typeof storage.getItem !== "function"
  ) {
    throw new Error(
      "Browser storage is unavailable. The plan was not applied."
    );
  }

  const savedAt = new Date().toISOString();

  const key =
    "gym-tracker:personalized-recovery:v1:" +
    Date.now() +
    ":" +
    Math.random().toString(36).slice(2, 9);

  const snapshot = JSON.stringify({
    version: 1,
    savedAt,
    appliedPlan: appliedPlan ?? null,
    weeklySchedule: weeklySchedule ?? null,
  });

  storage.setItem(key, snapshot);

  if (storage.getItem(key) !== snapshot) {
    throw new Error(
      "Recovery backup verification failed."
    );
  }

  return {
    key,
    savedAt,
  };
}
