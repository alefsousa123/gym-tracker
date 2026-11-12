import {
  getSplitById,
} from "../data/workoutSplits";

import {
  getExerciseEntries,
  saveExerciseEntriesToSession,
} from "./workoutExerciseEntries";

/**
 * A signature identifies the plan from which
 * an editable Builder draft originated.
 */
export function getBuilderPlanSignature(plan) {
  if (!plan) return null;

  return JSON.stringify({
    name: plan.name,
    templateId: plan.templateId,
    splitId: plan.splitId,
    location: plan.location,
    weightUnit: plan.weightUnit,
    isPersonalized:
      plan.isPersonalized === true,

    customDayAssignments: plan.customDayAssignments,
    sessions: plan.sessions.map(
      (session) => ({
        id: session.id,
        name: session.name,
        exerciseIds: session.exerciseIds,
        exerciseTargets:
          session.exerciseTargets,
        missingSlots: session.missingSlots,

        ...(Array.isArray(
          session.exerciseEntries
        )
          ? {
              exerciseEntries:
                session.exerciseEntries,
            }
          : {}),
      })
    ),
  });
}

/**
 * Preserve all daily sessions instead of
 * reducing a personalized plan to A/B/C.
 */
export function createCompatibleBuilderDraft(
  plan,
  profile
) {
  const split = getSplitById(
    plan.splitId
  );

  const personalized =
    plan.isPersonalized === true;

  const sourceSessions =
    personalized
      ? plan.sessions
      : split.id === 'custom' && Array.isArray(plan.sessions) && plan.sessions.length > 0
        ? plan.sessions
        : split.sessions.map(
          (definition) => (
            plan.sessions.find(
              (session) =>
                session.id === definition.id
            ) ?? {
              id: definition.id,
              name: definition.label,
              exerciseIds: [],
              exerciseTargets: {},
              missingSlots: [],
            }
          )
        );

  return {
    name: plan.name,
    splitId: split.id,

    location:
      plan.location ?? "home",

    weightUnit:
      plan.weightUnit ??
      profile?.weightUnit ??
      "kg",

    isPersonalized: personalized,

    sourcePlanSignature:
      getBuilderPlanSignature(plan),

    ...(split.id === 'custom' && !personalized ? {
      customDayAssignments: {...(plan.customDayAssignments ?? {})},
      customAssignmentsTouched: true,
    } : {}),


    sessions: sourceSessions.map(
      (session) =>
        saveExerciseEntriesToSession(
          {
            id: session.id,
            name: session.name,

            missingSlots: [
              ...(session.missingSlots ?? []),
            ],

            ...(personalized
              ? {
                  plannedDayId:
                    session.plannedDayId,

                  originalSessionType:
                    session.originalSessionType,
                }
              : {}),
          },

          getExerciseEntries(session)
        )
    ),

  };
}

/**
 * Validate the personalized draft shape
 * without requiring traditional split IDs.
 */
export function isValidPersonalizedBuilderDraft(
  draft
) {
  if (
    draft?.isPersonalized !== true ||
    typeof draft.sourcePlanSignature !==
      "string" ||
    !Array.isArray(draft.sessions) ||
    draft.sessions.length < 1 ||
    draft.sessions.length > 6
  ) {
    return false;
  }

  const ids = draft.sessions.map(
    (session) => session?.id
  );

  return (
    new Set(ids).size === ids.length &&
    draft.sessions.every(
      (session) =>
        typeof session.id === "string" &&
        session.id.startsWith(
          "personalized-"
        ) &&
        typeof session.name === "string" &&
        Array.isArray(session.exerciseIds) &&
        session.exerciseTargets !== null &&
        typeof session.exerciseTargets ===
          "object" &&
        !Array.isArray(
          session.exerciseTargets
        ) &&
        Array.isArray(
          session.missingSlots
        )
    )
  );
}

/**
 * Block stale drafts or inconsistent
 * personalized calendar assignments.
 */
export function getBuilderCompatibilityError(
  draft,
  mode,
  appliedPlan,
  weeklySchedule
) {
  if (
    mode === "current" &&
    draft.sourcePlanSignature &&
    draft.sourcePlanSignature !==
      getBuilderPlanSignature(appliedPlan)
  ) {
    return (
      "The applied plan changed after this " +
      "draft was opened. Reload the current " +
      "plan before saving."
    );
  }

  if (!draft.isPersonalized) {
    return null;
  }

  if (
    mode !== "current" ||
    appliedPlan?.isPersonalized !== true ||
    !isValidPersonalizedBuilderDraft(
      draft
    )
  ) {
    return (
      "Invalid personalized plan draft."
    );
  }

  if (
    !weeklySchedule ||
    weeklySchedule.splitId !==
      draft.splitId
  ) {
    return (
      "The personalized calendar is missing " +
      "or uses a different split."
    );
  }

  const draftIds = new Set(
    draft.sessions.map(
      (session) => session.id
    )
  );

  const appliedIds = new Set(
    appliedPlan.sessions.map(
      (session) => session.id
    )
  );

  if (
    draftIds.size !== appliedIds.size ||
    [...draftIds].some(
      (id) => !appliedIds.has(id)
    )
  ) {
    return (
      "The personalized session IDs changed."
    );
  }

  const invalidDay =
    weeklySchedule.days.some(
      (day) =>
        day.activity === "workout" &&
        !draftIds.has(day.sessionId)
    );

  if (invalidDay) {
    return (
      "The calendar references a session " +
      "that is not present in this plan."
    );
  }

  return null;
}
