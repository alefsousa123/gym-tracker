import {
  createWeeklyTemplate,
  daysOfWeek,
} from "../data/workoutSplits";

import {
  normalizeExerciseTarget,
  validateExerciseTarget,
} from "./workoutTargets";

const dayNames = Object.fromEntries(
  daysOfWeek.map((day) => [
    day.id,
    day.label,
  ])
);

function getRepRange(goal) {
  if (goal === "build-strength") {
    return [4, 6];
  }

  if (goal === "improve-endurance") {
    return [12, 18];
  }

  return [8, 12];
}

function makeExerciseTarget(exercise, goal) {
  const [minReps, maxReps] = getRepRange(goal);

  const target = normalizeExerciseTarget(
    exercise.id,
    {
      sets: exercise.sets,
      restSeconds: exercise.restSeconds,
      targetType:
        exercise.targetType === "duration"
          ? "duration"
          : "reps",
      minReps,
      maxReps,
    }
  );

  const checked = validateExerciseTarget(
    exercise.id,
    target
  );

  if (checked.error) {
    throw new Error(
      exercise.id + ": " + checked.error
    );
  }

  return checked.value;
}

/**
 * Convert a D1.19 proposal into the
 * existing WorkoutPlanProvider and
 * WeeklyScheduleProvider data shapes.
 *
 * IMPORTANT:
 * This function does not save anything.
 *
 * Personalized session IDs require
 * calendar editing support before
 * these objects can be applied.
 */
export function buildPersonalizedPlanApplication({
  profile,
  proposal,
  templateId = "personalized",
  templateName = "Personalized Workout Plan",
}) {
  if (!profile || !proposal) {
    throw new TypeError(
      "Profile and personalized proposal are required."
    );
  }

  const frequency =
    Number(profile.trainingDaysPerWeek);

  if (
    !Number.isInteger(frequency) ||
    frequency < 1 ||
    frequency > 6
  ) {
    throw new RangeError(
      "Training frequency must be 1-6 days."
    );
  }

  if (
    !proposal.completeSelection ||
    proposal.selectedCount !== proposal.plannedSlots ||
    !Array.isArray(proposal.sessions) ||
    proposal.sessions.length !== frequency
  ) {
    throw new Error(
      "Personalized proposal is incomplete."
    );
  }

  const minutes =
    Number(profile.sessionDurationMinutes);

  if (
    minutes !==
    Number(
      proposal.profileSummary
        ?.sessionDurationMinutes
    )
  ) {
    throw new Error(
      "Profile duration differs from the preview."
    );
  }

  if (
    frequency !==
    Number(
      proposal.profileSummary
        ?.trainingDaysPerWeek
    )
  ) {
    throw new Error(
      "Profile frequency differs from the preview."
    );
  }

  const baseSchedule = createWeeklyTemplate(
    frequency,
    proposal.splitId
  );

  const workoutDays =
    baseSchedule.days.filter(
      (day) => day.activity === "workout"
    );

  const proposalByDay = new Map();

  for (const session of proposal.sessions) {
    if (
      !dayNames[session.dayId] ||
      proposalByDay.has(session.dayId)
    ) {
      throw new Error(
        "Invalid or duplicated training day."
      );
    }

    if (
      !Array.isArray(session.exercises) ||
      session.exercises.length === 0 ||
      session.missingSlots.length > 0 ||
      !session.fitsEstimatedTime ||
      !Number.isFinite(
        session.time?.estimatedTotalMinutes
      ) ||
      session.time.estimatedTotalMinutes > minutes
    ) {
      throw new Error(
        "Session is incomplete or exceeds estimated time."
      );
    }

    proposalByDay.set(
      session.dayId,
      session
    );
  }

  for (const day of workoutDays) {
    if (!proposalByDay.has(day.dayId)) {
      throw new Error(
        "Missing planned workout for " + day.dayId
      );
    }
  }

  const goal =
    profile.primaryGoal ??
    profile.trainingGoal ??
    "general-fitness";

  const planSessions =
    workoutDays.map((day) => {
      const session = proposalByDay.get(
        day.dayId
      );

      const sessionId =
        "personalized-" + day.dayId;

      const exerciseIds =
        session.exercises.map(
          (exercise) => exercise.id
        );

      if (
        new Set(exerciseIds).size !==
        exerciseIds.length
      ) {
        throw new Error(
          "Duplicate exercises within " +
          day.dayId
        );
      }

      const exerciseTargets =
        Object.fromEntries(
          session.exercises.map(
            (exercise) => [
              exercise.id,
              makeExerciseTarget(
                exercise,
                goal
              ),
            ]
          )
        );

      return {
        id: sessionId,
        name:
          dayNames[day.dayId] +
          " · " +
          session.sessionId.toUpperCase(),

        exerciseIds,
        exerciseTargets,
        missingSlots: [],

        plannedDayId: day.dayId,
        originalSessionType:
          session.sessionId,
        estimatedMinutes:
          session.time.estimatedTotalMinutes,
      };
    });

  const scheduleData = {
    splitId: proposal.splitId,

    days: baseSchedule.days.map(
      (day) => ({
        ...day,

        sessionId:
          day.activity === "workout"
            ? "personalized-" +
              day.dayId
            : null,
      })
    ),
  };

  const planData = {
    templateId,
    name: templateName,
    splitId: proposal.splitId,

    location: proposal.location,
    weightUnit:
      profile.weightUnit ?? "kg",

    isPersonalized: true,
    generatorVersion: "D1.20.1",

    sessions: planSessions,
  };

  const warnings = [
    ...new Set([
      ...(proposal.allocationWarnings ?? []),
      ...(proposal.volumeWarnings ?? []),
      ...(proposal.warnings ?? [])
        .map((warning) =>
          typeof warning === "string"
            ? warning
            : warning.type
        ),
    ]),
  ];

  return {
    planData,
    scheduleData,
    warnings,

    uniqueSessionIds:
      planSessions.map(
        (session) => session.id
      ),

    // Do not save until the calendar
    // supports personalized session IDs.
    readyForPersistence: false,
    requiresCalendarCompatibility: true,
    saved: false,
  };
}
