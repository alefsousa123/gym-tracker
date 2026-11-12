
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import { exercises } from "../data/exercises";

import {
  rankExercisesForWorkoutSession,
} from "../utils/workoutSessionRanking";

import ExerciseMotionPreview from
  "../components/exercises/ExerciseMotionPreview";

import ExerciseTargetsEditor from
  "../components/workouts/ExerciseTargetsEditor";

import {
  isExerciseAvailable,
} from "../data/workoutPlans";

import {
  createWeeklyTemplate,
  getSplitById,
  getSuggestedSplit,
  workoutSplits,
} from "../data/workoutSplits";

import {
  validateExerciseTarget,
} from "../utils/workoutTargets";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import {
  savePersonalizedRecoverySnapshot,
} from "../utils/personalizedApplicationSafety";

import {
  createCompatibleBuilderDraft,
  getBuilderPlanSignature,
  isValidPersonalizedBuilderDraft,
  getBuilderCompatibilityError,
} from "../utils/workoutBuilderPersonalizedAdapter";

import {
  getExerciseEntries,
  saveExerciseEntriesToSession,
  appendExerciseEntry,
  removeExerciseEntry,
  moveExerciseEntry,
  updateExerciseEntryTarget,
} from "../utils/workoutExerciseEntries";

import { reconcileRollingScheduleForPlan } from '../utils/rollingTrainingIntegration';
import "./WorkoutBuilderPage.css";

// ==========================================
// DRAFT STORAGE CONFIGURATION
// ==========================================

const DRAFT_STORAGE_KEY =
  "gym-tracker:workout-builder-draft:v1";

// ==========================================
// VALIDATE A STORED BUILDER STATE
// ==========================================

function isValidStoredBuilderState(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const { draft } = value;

  if (
    value.mode !== "new" &&
    value.mode !== "current"
  ) {
    return false;
  }

  if (
    !draft ||
    typeof draft !== "object" ||
    Array.isArray(draft) ||
    typeof draft.name !== "string" ||
    typeof draft.splitId !== "string" ||
    !["home", "gym"].includes(draft.location) ||
    !["kg", "lb"].includes(draft.weightUnit) ||
    !Array.isArray(draft.sessions)
  ) {
    return false;
  }

  const split = workoutSplits.find(
    (item) => item.id === draft.splitId
  );

  if (
    !split ||
    (
      draft.isPersonalized === true
        ? (
            value.mode !== "current" ||
            !isValidPersonalizedBuilderDraft(
              draft
            )
          )
        : (draft.splitId === 'custom'
          ? draft.sessions.length < 1 || draft.sessions.length > 7
          : draft.sessions.length !== split.sessions.length)
    )
  ) {
    return false;
  }

  const sessionsAreValid =
    draft.sessions.every((session, index) => {
      return (
        session &&
        typeof session === "object" &&
        (
          draft.isPersonalized === true
            ? session.id.startsWith(
                "personalized-"
              )
            : (draft.splitId === 'custom'
              ? typeof session.id === 'string' &&
                /^custom(?:-[a-g])?$/.test(session.id) &&
                draft.sessions.findIndex((s) => s.id === session.id) === index
              : session.id === split.sessions[index].id)
        ) &&
        typeof session.name === "string" &&
        Array.isArray(session.exerciseIds) &&
        session.exerciseIds.every(
          (id) => typeof id === "string"
        ) &&
        session.exerciseTargets &&
        typeof session.exerciseTargets ===
          "object" &&
        !Array.isArray(session.exerciseTargets) &&
        Array.isArray(session.missingSlots)
      );
    });

  if (!sessionsAreValid) {
    return false;
  }

  return (
    typeof value.search === "string" &&
    typeof value.muscleFilter === "string" &&
    (
      value.activeSessionId === null ||
      typeof value.activeSessionId === "string"
    )
  );
}

// ==========================================
// READ SAVED DRAFT FROM SESSION STORAGE
// ==========================================

function readSavedBuilderState(appliedPlan) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedValue =
      window.sessionStorage.getItem(
        DRAFT_STORAGE_KEY
      );

    if (!savedValue) {
      return null;
    }

    const parsedValue =
      JSON.parse(savedValue);

    if (!isValidStoredBuilderState(parsedValue)) {
      return null;
    }

    const savedSignature =
      parsedValue.draft.sourcePlanSignature;

    if (
      parsedValue.mode === "current" &&
      savedSignature &&
      savedSignature !==
        getBuilderPlanSignature(appliedPlan)
    ) {
      return null;
    }

    return parsedValue;
  } catch (error) {
    console.warn(
      "Could not restore workout builder draft:",
      error
    );

    return null;
  }
}

// ==========================================
// CLEAR SAVED DRAFT
// ==========================================

function clearSavedBuilderState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      DRAFT_STORAGE_KEY
    );
  } catch (error) {
    console.warn(
      "Could not clear workout builder draft:",
      error
    );
  }
}

// ==========================================
// CREATE EMPTY SESSIONS
// ==========================================


// D2.3O: Dynamic named custom workout sessions (A-G).
const CUSTOM_SESSION_LETTERS = 'ABCDEFG';
function createCustomWorkoutSession(index) {
  const letter = CUSTOM_SESSION_LETTERS[index];
  if (!letter) throw new RangeError('Maximum seven custom sessions.');
  return {
    id: index === 0 ? 'custom' : 'custom-' + letter.toLowerCase(),
    name: 'Workout ' + letter,
    exerciseIds: [],
    exerciseTargets: {},
    missingSlots: [],
  };
}
function suggestedCustomAssignments(days, sessions) {
  const active = days.filter((day) => day.activity === 'workout');
  return Object.fromEntries(active.map((day, index) => [
    day.dayId,
    sessions[index % sessions.length].id,
  ]));
}

function createEmptySessions(splitId) {
  if (splitId === 'custom') return [createCustomWorkoutSession(0)];
  return getSplitById(splitId).sessions.map(
    (session) => ({
      id: session.id,
      name: session.label,
      exerciseIds: [],
      exerciseTargets: {},
      missingSlots: [],
    })
  );
}

// ==========================================
// CREATE NEW CUSTOM WORKOUT DRAFT
// ==========================================

function createNewDraft(
  profile,
  weeklySchedule
) {
  const preferredDays = Number(
    profile?.trainingDaysPerWeek ?? 3
  );

  const splitId =
    weeklySchedule?.splitId ??
    getSuggestedSplit(preferredDays);

  return {
    name: "My Custom Workout Plan",
    splitId,

    location:
      profile?.trainingLocation === "gym"
        ? "gym"
        : "home",

    weightUnit:
      profile?.weightUnit ?? "kg",

    sessions:
      createEmptySessions(splitId),
    ...(splitId === 'custom' ? {
      customDayAssignments: suggestedCustomAssignments(
        createWeeklyTemplate(preferredDays, 'custom').days,
        createEmptySessions('custom')
      ),
      customAssignmentsTouched: false,
    } : {}),
  };
}

// ==========================================
// CREATE EDITABLE COPY OF AN APPLIED PLAN
// ==========================================

function createDraftFromPlan(plan, profile) {
  return createCompatibleBuilderDraft(
    plan,
    profile
  );
}

// ==========================================
// WORKOUT BUILDER PAGE
// ==========================================

function WorkoutBuilderPage() {
  // ========================================
  // SHARED CONTEXT DATA
  // ========================================

  const { profile } =
    useTrainingProfile();

  const { homeEquipment } =
    useEquipment();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const {
    appliedPlan,
    applyWorkoutPlan,
  } = useWorkoutPlan();

  const { activeWorkout } =
    useWorkoutSession();

  // ========================================
  // LOAD INITIAL SAVED STATE
  // ========================================

  const [savedBuilderState] = useState(
    () => readSavedBuilderState(
      appliedPlan
    )
  );

  // ========================================
  // EDITABLE PLAN MODE
  // ========================================

  const [mode, setMode] = useState(
    () =>
      savedBuilderState?.mode ??
      (appliedPlan ? "current" : "new")
  );

  // ========================================
  // EDITABLE PLAN DRAFT
  // ========================================

  const [draft, setDraft] = useState(
    () => {
      if (savedBuilderState?.draft) {
        return savedBuilderState.draft;
      }

      return appliedPlan
        ? createDraftFromPlan(
            appliedPlan,
            profile
          )
        : createNewDraft(
            profile,
            weeklySchedule
          );
    }
  );

  // ========================================
  // ACTIVE WORKOUT SESSION
  // ========================================

  const [
    activeSessionId,
    setActiveSessionId,
  ] = useState(() => {
    const savedSessionId =
      savedBuilderState?.activeSessionId;

    const savedSessionExists =
      draft.sessions.some(
        (session) =>
          session.id === savedSessionId
      );

    return savedSessionExists
      ? savedSessionId
      : draft.sessions[0]?.id ?? null;
  });

  // ========================================
  // EXERCISE LIBRARY FILTERS
  // ========================================

  const [search, setSearch] = useState(
    () => savedBuilderState?.search ?? ""
  );

  const [
    muscleFilter,
    setMuscleFilter,
  ] = useState(
    () =>
      savedBuilderState?.muscleFilter ??
      "all"
  );

  // ========================================
  // TEMPORARY CONFIRMATION STATE
  // ========================================

  const [
    pendingMode,
    setPendingMode,
  ] = useState(null);

  const [
    pendingSplit,
    setPendingSplit,
  ] = useState(null);

  const [
    showSaveConfirmation,
    setShowSaveConfirmation,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  // ========================================
  // AUTOMATIC DRAFT PERSISTENCE
  // ========================================

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const builderState = {
      mode,
      draft,
      activeSessionId,
      search,
      muscleFilter,
    };

    try {
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(builderState)
      );
    } catch (storageError) {
      console.warn(
        "Could not save workout builder draft:",
        storageError
      );
    }
  }, [
    mode,
    draft,
    activeSessionId,
    search,
    muscleFilter,
  ]);

  // ========================================
  // CURRENTLY SELECTED SESSION
  // ========================================

  const selectedSession =
    draft.sessions.find(
      (session) =>
        session.id === activeSessionId
    );

  // ========================================
  // AVAILABLE EXERCISES
  // ========================================

  const availableExercises = useMemo(
    () =>
      exercises.filter((exercise) =>
        isExerciseAvailable(
          exercise,
          draft.location,
          homeEquipment
        )
      ),
    [draft.location, homeEquipment]
  );

  const availableExerciseIds = new Set(
    availableExercises.map(
      (exercise) => exercise.id
    )
  );

  // ========================================
  // MUSCLE GROUP OPTIONS
  // ========================================

  const muscleGroups = [
    ...new Set(
      availableExercises.map(
        (exercise) => exercise.muscleGroup
      )
    ),
  ].sort();

  const effectiveMuscleFilter =
    muscleFilter === "all" ||
    muscleGroups.includes(muscleFilter)
      ? muscleFilter
      : "all";

  // ========================================
  // FILTER EXERCISE LIBRARY
  // ========================================


  const filteredExercises =
    rankExercisesForWorkoutSession(
      availableExercises.filter((exercise) => {
        const matchesSearch =
          exercise.name
            .toLowerCase()
            .includes(
              search.trim().toLowerCase()
            );

        const matchesMuscle =
          effectiveMuscleFilter === "all" ||
          exercise.muscleGroup ===
            effectiveMuscleFilter;

        return matchesSearch && matchesMuscle;
      }),
      {
        profile,
        sessionId: selectedSession?.id,
        addedIds:
          selectedSession?.exerciseIds ?? [],
      }
    ).map((item) => item.exercise);

  // ========================================
  // PLAN SUMMARY
  // ========================================

  const totalExercises =
    draft.sessions.reduce(
      (total, session) =>
        total +
        session.exerciseIds.length,
      0
    );

  const draftSessionIds = new Set(
    draft.sessions.map(
      (session) => session.id
    )
  );

  const requiresScheduleUpdate =
    !weeklySchedule ||
    weeklySchedule.splitId !==
      draft.splitId ||
    weeklySchedule.days.some(
      (day) =>
        day.activity === "workout" &&
        (
          !draftSessionIds.has(day.sessionId) ||
          (draft.splitId === 'custom' && !draft.isPersonalized &&
            (draft.customDayAssignments?.[day.dayId] ?? draft.sessions[0]?.id) !== day.sessionId)
        )
    );

  const hadMissingTemplateSlots =
    mode === "current" &&
    appliedPlan?.sessions.some(
      (session) =>
        (session.missingSlots?.length ?? 0) > 0
    );

  // ========================================
  // CLEAR INTERFACE MESSAGES
  // ========================================

  function clearMessages() {
    setError("");
    setFeedback("");
    setShowSaveConfirmation(false);
  }

  // ========================================
  // REQUEST STARTING MODE CHANGE
  // ========================================

  function requestModeChange(nextMode) {
    if (nextMode === mode) {
      return;
    }

    setPendingMode(nextMode);
    setPendingSplit(null);

    setShowSaveConfirmation(false);
  }

  // ========================================
  // CONFIRM STARTING MODE CHANGE
  // ========================================

  function confirmModeChange() {
    const newDraft =
      pendingMode === "current" &&
      appliedPlan
        ? createDraftFromPlan(
            appliedPlan,
            profile
          )
        : createNewDraft(
            profile,
            weeklySchedule
          );

    setDraft(newDraft);
    setMode(pendingMode);

    setActiveSessionId(
      newDraft.sessions[0]?.id ?? null
    );

    setPendingMode(null);
    setSearch("");
    setMuscleFilter("all");

    clearMessages();
  }

  // ========================================
  // CONFIRM WORKOUT SPLIT CHANGE
  // ========================================

  function confirmSplitChange() {
    if (!pendingSplit) {
      return;
    }

    const sessions =
      createEmptySessions(
        pendingSplit
      );

    setDraft((previousDraft) => ({
      ...previousDraft,
      splitId: pendingSplit,
      sessions,
      isPersonalized: false,
      sourcePlanSignature: null,
      ...(pendingSplit === 'custom' ? {
        customAssignmentsTouched: false,
        customDayAssignments: suggestedCustomAssignments(
          createWeeklyTemplate(Number(profile?.trainingDaysPerWeek ?? 3), 'custom').days,
          sessions
        ),
      } : {
        customAssignmentsTouched: undefined,
        customDayAssignments: undefined,
      }),
    }));

    setActiveSessionId(
      sessions[0]?.id ?? null
    );

    setPendingSplit(null);

    clearMessages();
  }

  // ========================================
  // UPDATE A BASIC DRAFT FIELD
  // ========================================

  function updateDraftField(field, value) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      [field]: value,
    }));

    clearMessages();
  }


  // D2.3O: Session definitions belong to this plan,
  // not to the global list of workout split templates.
  const customScheduleDays = draft.splitId === 'custom'
    ? (weeklySchedule?.splitId === 'custom'
        ? weeklySchedule.days
        : createWeeklyTemplate(
            Number(profile?.trainingDaysPerWeek ?? 3), 'custom'
          ).days).filter((day) => day.activity === 'workout')
    : [];

  function addCustomWorkout() {
    if (draft.splitId !== 'custom' || draft.isPersonalized) return;
    if (draft.sessions.length >= 7) return;
    const availableIndex = [...CUSTOM_SESSION_LETTERS].findIndex(
      (_, index) => !draft.sessions.some(
        (s) => s.id === createCustomWorkoutSession(index).id
      )
    );
    if (availableIndex < 0) return;
    const next = createCustomWorkoutSession(availableIndex);
    setDraft((previous) => {
      const sessions = [...previous.sessions, next];
      return {
        ...previous,
        sessions,
        customDayAssignments: previous.customAssignmentsTouched
          ? { ...previous.customDayAssignments }
          : suggestedCustomAssignments(customScheduleDays, sessions),
      };
    });
    setActiveSessionId(next.id);
    clearMessages();
  }

  function renameCustomWorkout(sessionId, name) {
    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.map((s) =>
        s.id === sessionId ? { ...s, name } : s
      ),
    }));
    clearMessages();
  }

  function removeCustomWorkout(sessionId) {
    if (draft.splitId !== 'custom' || draft.isPersonalized || draft.sessions.length <= 1) return;
    const session = draft.sessions.find((s) => s.id === sessionId);
    if (getExerciseEntries(session).length > 0 && !window.confirm(
      'Remove ' + session.name + ' and its exercises from this draft?'
    )) return;
    const sessions = draft.sessions.filter((s) => s.id !== sessionId);
    const fallbackId = sessions[0].id;
    setDraft((previous) => ({
      ...previous,
      sessions,
      customDayAssignments: previous.customAssignmentsTouched
        ? Object.fromEntries(customScheduleDays.map((day) => [
            day.dayId,
            previous.customDayAssignments?.[day.dayId] === sessionId
              ? fallbackId
              : (previous.customDayAssignments?.[day.dayId] ?? fallbackId),
          ]))
        : suggestedCustomAssignments(customScheduleDays, sessions),
    }));
    if (activeSessionId === sessionId) setActiveSessionId(fallbackId);
    clearMessages();
  }

  function assignCustomWorkoutToDay(dayId, sessionId) {
    if (!draft.sessions.some((session) => session.id === sessionId)) return;
    setDraft((previous) => ({
      ...previous,
      customAssignmentsTouched: true,
      customDayAssignments: {
        ...previous.customDayAssignments,
        [dayId]: sessionId,
      },
    }));
    clearMessages();
  }

  // ========================================
  // ADD AN EXERCISE
  // ========================================


  // U1.4 - INDEPENDENT BUILDER ENTRIES

  function addExercise(exerciseId) {
    if (
      !selectedSession ||
      !availableExerciseIds.has(exerciseId)
    ) {
      return;
    }

    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.map(
        (session) =>
          session.id === activeSessionId
            ? appendExerciseEntry(
                session,
                exerciseId
              )
            : session
      ),
    }));

    clearMessages();
  }

  function removeExercise(
    sessionId,
    entryId
  ) {
    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.map(
        (session) =>
          session.id === sessionId
            ? removeExerciseEntry(
                session,
                entryId
              )
            : session
      ),
    }));

    clearMessages();
  }

  function moveExercise(
    sessionId,
    entryId,
    direction
  ) {
    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.map(
        (session) =>
          session.id === sessionId
            ? moveExerciseEntry(
                session,
                entryId,
                direction
              )
            : session
      ),
    }));

    clearMessages();
  }

  function updateExerciseTarget(
    sessionId,
    entryId,
    changes
  ) {
    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.map(
        (session) =>
          session.id === sessionId
            ? updateExerciseEntryTarget(
                session,
                entryId,
                changes
              )
            : session
      ),
    }));

    clearMessages();
  }

  // ========================================
  // VALIDATE COMPLETE DRAFT
  // ========================================

  function getValidationError() {
    if (activeWorkout) {
      return {
        message:
          "Finish or discard the active workout before saving a new plan.",
        sessionId: null,
      };
    }

    const compatibilityError =
      getBuilderCompatibilityError(
        draft,
        mode,
        appliedPlan,
        weeklySchedule
      );

    if (compatibilityError) {
      return {
        message: compatibilityError,
        sessionId: null,
      };
    }

    if (!draft.name.trim()) {
      return {
        message:
          "Please enter a name for your workout plan.",
        sessionId: null,
      };
    }

    if (draft.splitId === 'custom' && !draft.isPersonalized) {
      if (draft.sessions.length < 1 || draft.sessions.length > 7 ||
          new Set(draft.sessions.map((s) => s.id)).size !== draft.sessions.length ||
          draft.sessions.some((s) => !s.name.trim())) {
        return {message: 'Give each custom workout a name and use between one and seven sessions.', sessionId: null};
      }
    }

    for (const session of draft.sessions) {
      const entries =
        getExerciseEntries(session);

      if (
        entries.length === 0
      ) {
        return {
          message:
            `Add at least one exercise to ${session.name}.`,
          sessionId: session.id,
        };
      }

      for (const entry of entries) {
        const exerciseId = entry.exerciseId;
        const exercise = exercises.find(
          (item) =>
            item.id === exerciseId
        );

        if (
          !availableExerciseIds.has(
            exerciseId
          )
        ) {
          return {
            message:
              `${exercise?.name ?? "An exercise"} is unavailable for the current training setup.`,
            sessionId: session.id,
          };
        }

        const result =
          validateExerciseTarget(
            exerciseId,
            entry.target
          );

        if (result.error) {
          return {
            message:
              `${exercise?.name ?? exerciseId}: ${result.error}`,
            sessionId: session.id,
          };
        }
      }
    }

    return null;
  }

  // ========================================
  // REVIEW BEFORE SAVING
  // ========================================

  function handleReviewSave() {
    const validationError =
      getValidationError();

    if (validationError) {
      setError(
        validationError.message
      );

      setFeedback("");

      if (
        validationError.sessionId
      ) {
        setActiveSessionId(
          validationError.sessionId
        );
      }

      return;
    }

    setError("");
    setFeedback("");

    setShowSaveConfirmation(
      true
    );
  }

  // ========================================
  // CONFIRM AND SAVE WORKOUT PLAN
  // ========================================

  function handleConfirmSave() {
    const validationError =
      getValidationError();

    if (validationError) {
      setError(
        validationError.message
      );

      setShowSaveConfirmation(
        false
      );

      if (
        validationError.sessionId
      ) {
        setActiveSessionId(
          validationError.sessionId
        );
      }

      return;
    }

    // Normalize the targets before saving.


    // Validate and preserve every occurrence.

    const savedSessions =
      draft.sessions.map((session) => {
        const entries =
          getExerciseEntries(session).map(
            (entry) => {
              const result =
                validateExerciseTarget(
                  entry.exerciseId,
                  entry.target
                );

              if (result.error) {
                throw new Error(
                  result.error
                );
              }

              return {
                ...entry,
                target: result.value,
              };
            }
          );

        return saveExerciseEntriesToSession(
          {
            id: session.id,
            name: session.name,

            ...(draft.isPersonalized
              ? {
                  plannedDayId:
                    session.plannedDayId,

                  originalSessionType:
                    session.originalSessionType,
                }
              : {}),

            missingSlots: [
              ...(session.missingSlots ?? []),
            ],
          },

          entries
        );
      });

    // Build the final saved plan.

    const updatedPlan = {
      templateId:
        mode === "current"
          ? appliedPlan?.templateId ?? null
          : null,

      source:
        mode === "current"
          ? "customized"
          : "custom",

      name: draft.name.trim(),
      splitId: draft.splitId,
      location: draft.location,
      weightUnit: draft.weightUnit,

      coverage: null,

      ...(draft.isPersonalized
        ? {
            isPersonalized: true,
            generatorVersion:
              "D1.20.5",
          }
        : {}),

      sessions: savedSessions,
      ...(draft.splitId === 'custom' && !draft.isPersonalized ? {
        customDayAssignments: {...draft.customDayAssignments},
      } : {}),
    };

    // Preserve the previous setup before
    // replacing an existing applied plan.
    if (appliedPlan) {
      try {
        savePersonalizedRecoverySnapshot(
          window.localStorage,
          {
            appliedPlan,
            weeklySchedule,
          }
        );
      } catch (backupError) {
        setError(
          "Unable to create a recovery copy: " +
          backupError.message
        );

        setShowSaveConfirmation(false);
        return;
      }
    }

    // Save the applied plan.

    applyWorkoutPlan(
      updatedPlan
    );

    // Refresh the draft's source signature
    // after a successful customization.
    if (mode === "current") {
      setDraft((previousDraft) => ({
        ...previousDraft,
        sourcePlanSignature:
          getBuilderPlanSignature(
            updatedPlan
          ),
      }));
    }

    // Update the weekly schedule if needed.

    if (weeklySchedule?.mode === 'rolling') {
      const nextFixedDays = createWeeklyTemplate(
        Number(profile?.trainingDaysPerWeek ?? 3), updatedPlan.splitId
      ).days;
      saveWeeklySchedule(reconcileRollingScheduleForPlan(
        weeklySchedule, updatedPlan, nextFixedDays
      ));
    } else if (requiresScheduleUpdate) {
      const baseSchedule = weeklySchedule?.splitId === draft.splitId
        ? weeklySchedule
        : createWeeklyTemplate(Number(profile?.trainingDaysPerWeek ?? 3), draft.splitId);
      if (draft.splitId === 'custom' && !draft.isPersonalized) {
        const validIds = new Set(savedSessions.map((s) => s.id));
        let nextIndex = 0;
        saveWeeklySchedule({
          splitId: 'custom',
          days: baseSchedule.days.map((day) => {
            if (day.activity !== 'workout') return {...day, sessionId: null};
            const requested = draft.customDayAssignments?.[day.dayId];
            const sessionId = validIds.has(requested)
              ? requested
              : validIds.has(day.sessionId)
                ? day.sessionId
                : savedSessions[nextIndex % savedSessions.length].id;
            nextIndex++;
            return {...day, sessionId};
          }),
        });
      } else {
        saveWeeklySchedule(createWeeklyTemplate(
          Number(profile?.trainingDaysPerWeek ?? 3), draft.splitId
        ));
      }
    }

    // The draft is no longer needed
    // because the plan was saved.

    clearSavedBuilderState();

    setShowSaveConfirmation(
      false
    );

    setError("");

    setFeedback(
      "Your workout plan and exercise targets have been saved successfully."
    );
  }

  // ========================================
  // PAGE CONTENT
  // ========================================

  return (
    <div className="workout-builder-page">

      {/* ==================================
          BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/workouts"
        fallbackLabel="Workouts"
        className="builder-back-link"
      />

      {/* ==================================
          PAGE HEADING
      ================================== */}

      <header className="builder-page-heading">
        <span className="builder-eyebrow">
          WORKOUT CUSTOMIZATION
        </span>

        <h1>Workout Builder</h1>

        <p>
          Create your own workout plan or customize
          your current program, including sets,
          repetitions, rest, and planned weights.
        </p>
      </header>

      {/* ==================================
          STARTING POINT
      ================================== */}

      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>
            Choose Your Starting Point
          </h2>

          <p>
            Start from scratch or customize
            your selected workout plan.
          </p>
        </div>

        <div className="builder-mode-grid">
          <button
            type="button"
            className={
              `builder-mode-option ${
                mode === "new"
                  ? "is-selected"
                  : ""
              }`
            }
            aria-pressed={
              mode === "new"
            }
            onClick={() =>
              requestModeChange(
                "new"
              )
            }
          >
            <strong>
              Start From Scratch
            </strong>

            <span>
              Build a plan with your own exercises
              and training targets.
            </span>
          </button>

          <button
            type="button"
            className={
              `builder-mode-option ${
                mode === "current"
                  ? "is-selected"
                  : ""
              }`
            }
            aria-pressed={
              mode === "current"
            }
            disabled={!appliedPlan}
            onClick={() =>
              requestModeChange(
                "current"
              )
            }
          >
            <strong>
              Customize Current Plan
            </strong>

            <span>
              {appliedPlan
                ? `Based on ${appliedPlan.name}`
                : "Apply a workout plan first."}
            </span>
          </button>
        </div>

        {/* STARTING POINT CONFIRMATION */}

        {pendingMode && (
          <div className="builder-confirm-box">
            <strong>
              Change Your Starting Point?
            </strong>

            <p>
              Your unsaved draft changes will
              be replaced by the new selection.
            </p>

            <div className="builder-button-row">
              <button
                type="button"
                className="builder-primary-button"
                onClick={
                  confirmModeChange
                }
              >
                Confirm Change
              </button>

              <button
                type="button"
                className="builder-secondary-button"
                onClick={() =>
                  setPendingMode(null)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ==================================
          PLAN SETTINGS
      ================================== */}

      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>
            Plan Settings
          </h2>

          <p>
            Name your plan, select a workout split,
            and choose where you will train.
          </p>
        </div>

        <div className="builder-settings-grid">

          {/* PLAN NAME */}

          <div className="builder-field">
            <label htmlFor="builderPlanName">
              Plan Name
            </label>

            <input
              id="builderPlanName"
              type="text"
              maxLength={80}
              value={draft.name}
              onChange={(event) =>
                updateDraftField(
                  "name",
                  event.target.value
                )
              }
            />
          </div>

          {/* WORKOUT SPLIT */}

          <div className="builder-field">
            <label htmlFor="builderSplit">
              Workout Split
            </label>

            <select
              id="builderSplit"
              value={pendingSplit ?? draft.splitId}
              onChange={(event) => {
                setPendingSplit(
                  event.target.value === draft.splitId
                    ? null : event.target.value
                );
              }}
            >
              {workoutSplits.map(
                (split) => (
                  <option
                    key={split.id}
                    value={split.id}
                  >
                    {split.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* TRAINING LOCATION */}

          <div className="builder-field">
            <label htmlFor="builderLocation">
              Training Location
            </label>

            <select
              id="builderLocation"
              value={draft.location}
              onChange={(event) => {
                updateDraftField(
                  "location",
                  event.target.value
                );

                setMuscleFilter(
                  "all"
                );
              }}
            >
              <option value="home">
                At Home
              </option>

              <option value="gym">
                At the Gym
              </option>
            </select>
          </div>

          {/* WEIGHT UNIT */}

          <div className="builder-field">
            <label>
              Planned Weight Unit
            </label>

            <input
              type="text"
              readOnly
              value={
                draft.weightUnit === "lb"
                  ? "Pounds (lb)"
                  : "Kilograms (kg)"
              }
            />
          </div>
        </div>

        <p className="builder-information">
          This plan uses the weight unit saved
          when it was created. Existing loads
          are not converted automatically
          when profile preferences change.
        </p>

        {draft.isPersonalized && (
          <p className="builder-information">
            You are editing individual
            personalized sessions. Their
            day-specific exercises and targets
            will be preserved when saving.
            Changing the split converts this
            draft to a traditional structure.
          </p>
        )}

        {/* SPLIT CHANGE CONFIRMATION */}

        {pendingSplit && (
          <div className="builder-confirm-box">
            <strong>
              Change Workout Split?
            </strong>

            <p>
              Changing the split will clear
              the exercise selections and targets
              in this draft. Your saved plan will
              remain unchanged until you save again.
            </p>

            <div className="builder-button-row">
              <button
                type="button"
                className="builder-primary-button"
                onClick={
                  confirmSplitChange
                }
              >
                Change Split
              </button>

              <button
                type="button"
                className="builder-secondary-button"
                onClick={() =>
                  setPendingSplit(null)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* HOME EQUIPMENT INFORMATION */}

        {draft.location === "home" && (
          <p className="builder-information">
            Home exercises are filtered
            using your saved equipment.{" "}

            <Link to="/settings/equipment">
              Manage My Equipment →
            </Link>
          </p>
        )}

        {/* MISSING TEMPLATE SLOTS */}

        {hadMissingTemplateSlots && (
          <p className="builder-information">
            Your recommended template contained
            missing movement slots. The Builder
            allows customization but does not
            automatically verify that every
            movement pattern is covered.
          </p>
        )}
      </section>

      {/* ==================================
          WORKOUT EDITOR AND LIBRARY
      ================================== */}

      <div className="builder-main-grid">

        {/* ==================================
            WORKOUT SESSIONS
        ================================== */}

        <section className="builder-panel">
          <div className="builder-section-heading">
            <h2>
              Workout Sessions
            </h2>

            <p>
              Add exercises, organize their order,
              and configure individual targets.
            </p>
          </div>


          {draft.splitId === 'custom' && !draft.isPersonalized && (
            <section className="builder-custom-editor" aria-label="Custom workout setup">
              <div className="builder-custom-topline">
                <div className="builder-custom-heading">
                  <span className="builder-custom-kicker">BUILD YOUR OWN SPLIT</span>
                  <h3>Custom Workout Sessions</h3>
                  <p>Create independent workouts and assign them to the days you train.</p>
                </div>
                <span className="builder-custom-total" aria-label={draft.sessions.length + ' of 7 workouts'}>
                  {draft.sessions.length} / 7
                </span>
              </div>

              <div className="builder-custom-session-list">
                {draft.sessions.map((session, index) => (
                  <div className="builder-custom-session-row" key={session.id}>
                    <span className="builder-custom-letter" aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div className="builder-custom-name-field">
                      <label htmlFor={'custom-name-' + session.id}>Workout name</label>
                      <input
                        id={'custom-name-' + session.id}
                        type="text"
                        value={session.name}
                        maxLength={60}
                        onChange={(event) => renameCustomWorkout(session.id, event.target.value)}
                      />
                      <span className="builder-custom-subtext">
                        {getExerciseEntries(session).length} exercise entries
                      </span>
                    </div>
                    <button
                      type="button"
                      className="builder-custom-remove"
                      disabled={draft.sessions.length <= 1}
                      aria-label={'Remove ' + (session.name || 'workout')}
                      onClick={() => removeCustomWorkout(session.id)}
                    >Remove</button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="builder-custom-add"
                disabled={draft.sessions.length >= 7}
                onClick={addCustomWorkout}
              >
                <span aria-hidden="true">+</span>
                Add Custom Workout
              </button>

              <div className="builder-custom-separator" />

              <div className="builder-custom-heading builder-custom-heading--days">
                <span className="builder-custom-kicker">WEEKLY ROTATION</span>
                <h3>Assign Workouts to Training Days</h3>
                <p>Choose which session belongs to each scheduled workout day.</p>
              </div>

              <div className="builder-custom-day-grid">
                {customScheduleDays.map((day) => (
                  <div className="builder-custom-day-item" key={day.dayId}>
                    <label htmlFor={'custom-day-' + day.dayId}>
                      {day.dayId[0].toUpperCase() + day.dayId.slice(1)}
                    </label>
                    <select
                      id={'custom-day-' + day.dayId}
                      value={draft.sessions.some((s) => s.id === draft.customDayAssignments?.[day.dayId])
                        ? draft.customDayAssignments[day.dayId]
                        : draft.sessions[0].id}
                      onChange={(event) => assignCustomWorkoutToDay(day.dayId, event.target.value)}
                    >
                      {draft.sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name || session.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <p className="builder-custom-help">
                Save your plan to apply this rotation. To change workout and rest days,
                open Weekly Schedule.
              </p>
            </section>
          )}

          {/* SESSION TABS */}

          <div className="builder-session-tabs">
            {draft.sessions.map(
              (session) => (
                <button
                  key={session.id}
                  type="button"
                  className={
                    `builder-session-tab ${
                      activeSessionId ===
                      session.id
                        ? "is-selected"
                        : ""
                    }`
                  }
                  aria-pressed={
                    activeSessionId ===
                    session.id
                  }
                  onClick={() =>
                    setActiveSessionId(
                      session.id
                    )
                  }
                >
                  {session.name}

                  <span>
                    {session.exerciseIds.length}
                  </span>
                </button>
              )
            )}
          </div>

          {/* ACTIVE SESSION CONTENT */}

          {selectedSession && (
            <div className="builder-session-content">

              <div className="builder-session-heading">
                <h3>
                  {selectedSession.name}
                </h3>

                <span>
                  {selectedSession.exerciseIds.length}
                  {" "}exercises
                </span>
              </div>

              {/* EMPTY SESSION */}

              {selectedSession.exerciseIds.length === 0 ? (
                <div className="builder-empty-state">
                  <p>
                    No exercises added yet.
                  </p>

                  <span>
                    Add an exercise from the
                    library to get started.
                  </span>
                </div>
              ) : (
                <div className="builder-selected-list">

                  {/* SELECTED EXERCISES */}

                  {getExerciseEntries(selectedSession).map(
                    (entry, index) => {
                      const exerciseId = entry.exerciseId;
                      const entryId = entry.entryId;
                      const exercise =
                        exercises.find(
                          (item) =>
                            item.id ===
                            exerciseId
                        );

                      const isAvailable =
                        availableExerciseIds.has(
                          exerciseId
                        );

                      const target = entry.target;

                      return (
                        <div
                          className="builder-selected-item"
                          key={entryId}
                        >

                          {/* EXERCISE CARD */}

                          <div className="builder-selected-exercise">
                            <span className="builder-exercise-number">
                              {index + 1}
                            </span>

                            <ExerciseMotionPreview
                              exerciseId={
                                exerciseId
                              }
                              exerciseName={
                                exercise?.name ??
                                "Exercise"
                              }
                              variant="thumbnail"
                            />

                            <div className="builder-exercise-info">
                              <strong>
                                {exercise?.name ??
                                  "Unknown Exercise"}
                              </strong>

                              <span>
                                {exercise?.muscleGroup ??
                                  "Exercise not found"}
                              </span>

                              {!isAvailable && (
                                <span className="builder-unavailable">
                                  Unavailable in
                                  current setup
                                </span>
                              )}
                            </div>

                            {/* REORDER BUTTONS */}

                            <div className="builder-reorder-buttons">
                              <button
                                type="button"
                                aria-label={
                                  `Move ${
                                    exercise?.name ??
                                    "exercise"
                                  } up`
                                }
                                disabled={
                                  index === 0
                                }
                                onClick={() =>
                                  moveExercise(
                                    selectedSession.id,
                                    entryId,
                                    -1
                                  )
                                }
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                aria-label={
                                  `Move ${
                                    exercise?.name ??
                                    "exercise"
                                  } down`
                                }
                                disabled={
                                  index ===
                                  selectedSession
                                    .exerciseIds.length - 1
                                }
                                onClick={() =>
                                  moveExercise(
                                    selectedSession.id,
                                    entryId,
                                    1
                                  )
                                }
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                className="builder-remove-button"
                                aria-label={
                                  `Remove ${
                                    exercise?.name ??
                                    "exercise"
                                  }`
                                }
                                onClick={() =>
                                  removeExercise(
                                    selectedSession.id,
                                    entryId
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* EXERCISE TARGET EDITOR */}

                          <ExerciseTargetsEditor
                            exerciseName={
                              exercise?.name ??
                              "Exercise"
                            }
                            target={target}
                            weightUnit={
                              draft.weightUnit
                            }
                            onChange={(changes) =>
                              updateExerciseTarget(
                                selectedSession.id,
                                entryId,
                                changes
                              )
                            }
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ==================================
            EXERCISE LIBRARY
        ================================== */}

        <section className="builder-panel">
          <div className="builder-section-heading">
            <h2>
              Exercise Library
            </h2>

            <p>
              Add exercises compatible with
              your training location and equipment.
            </p>
          </div>

          {/* LIBRARY FILTERS */}

          <div className="builder-library-filters">

            {/* SEARCH */}

            <div className="builder-field">
              <label htmlFor="builderSearch">
                Search Exercises
              </label>

              <input
                id="builderSearch"
                type="search"
                placeholder="Search by name..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            {/* MUSCLE FILTER */}

            <div className="builder-field">
              <label htmlFor="builderMuscle">
                Muscle Group
              </label>

              <select
                id="builderMuscle"
                value={
                  effectiveMuscleFilter
                }
                onChange={(event) =>
                  setMuscleFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Muscle Groups
                </option>

                {muscleGroups.map(
                  (group) => (
                    <option
                      key={group}
                      value={group}
                    >
                      {group}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* LIBRARY RESULTS */}

          <div className="builder-library-list">
            {filteredExercises.length === 0 ? (
              <div className="builder-empty-state">
                <p>
                  No matching exercises found.
                </p>

                <span>
                  Change the filters or review
                  your available equipment.
                </span>
              </div>
            ) : (
              filteredExercises.map(
                (exercise) => {
                  const alreadyAddedCount =
                    selectedSession
                      ? getExerciseEntries(
                          selectedSession
                        ).filter(
                          (entry) =>
                            entry.exerciseId === exercise.id
                        ).length
                      : 0;

                  return (
                    <div
                      className="builder-library-exercise"
                      key={exercise.id}
                    >

                      {/* EXERCISE PREVIEW */}

                      <ExerciseMotionPreview
                        exerciseId={
                          exercise.id
                        }
                        exerciseName={
                          exercise.name
                        }
                        variant="thumbnail"
                      />

                      {/* EXERCISE INFORMATION */}

                      <div className="builder-library-exercise-info">
                        <strong>
                          {exercise.name}
                        </strong>

                        <span>
                          {exercise.muscleGroup}
                          {" · "}
                          {exercise.equipment.length > 0
                            ? exercise.equipment.join(", ")
                            : "Bodyweight"}
                        </span>

                        <Link
                          to={`/exercises/${exercise.id}`}
                          state={{
                            from: "/workouts/builder",
                            fromLabel: "Workout Builder",
                          }}
                        >
                          View Guide
                        </Link>
                      </div>

                      {/* ADD EXERCISE */}

                      <button
                        type="button"
                        disabled={!selectedSession}
                        onClick={() =>
                          addExercise(
                            exercise.id
                          )
                        }
                      >
                        {alreadyAddedCount > 0
                          ? "+ Add Again"
                          : "+ Add"}
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </div>

      {/* ==================================
          REVIEW AND SAVE PLAN
      ================================== */}

      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>
            Review Your Plan
          </h2>

          <p>
            Review your exercises and planned
            targets before saving.
          </p>
        </div>

        {/* PLAN SUMMARY */}

        <div className="builder-review-grid">

          <div>
            <span>
              Workout Split
            </span>

            <strong>
              {getSplitById(
                draft.splitId
              ).name}
            </strong>
          </div>

          <div>
            <span>
              Sessions
            </span>

            <strong>
              {draft.sessions.length}
            </strong>
          </div>

          <div>
            <span>
              Exercise Entries
            </span>

            <strong>
              {totalExercises}
            </strong>
          </div>
        </div>

        <p className="builder-information">
          Training targets are editable starting
          values. Your actual completed sets,
          repetitions, weights, and rest times
          will be recorded during workouts
          in a future stage.
        </p>

        {/* VALIDATION ERROR */}

        {error && (
          <p
            className="builder-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* SAVE REVIEW BUTTON */}

        {!showSaveConfirmation ? (
          <button
            type="button"
            className="builder-primary-button"
            onClick={
              handleReviewSave
            }
          >
            Review & Save Plan
          </button>
        ) : (
          <div className="builder-confirm-box">

            {/* SAVE CONFIRMATION */}

            <strong>
              Save This Workout Plan?
            </strong>

            <p>
              Your currently selected workout
              plan will be replaced by this version,
              including all exercise targets.
            </p>

            {requiresScheduleUpdate ? (
              <p className="builder-warning">
                A new weekly schedule template
                will also replace your existing
                schedule because the split changed
                or no schedule exists.
              </p>
            ) : (
              <p>
                Your weekly schedule will
                remain unchanged.
              </p>
            )}

            {/* CONFIRMATION ACTIONS */}

            <div className="builder-button-row">
              <button
                type="button"
                className="builder-primary-button"
                onClick={
                  handleConfirmSave
                }
              >
                Confirm & Save
              </button>

              <button
                type="button"
                className="builder-secondary-button"
                onClick={() =>
                  setShowSaveConfirmation(
                    false
                  )
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS FEEDBACK */}

        {feedback && (
          <div
            className="builder-success"
            role="status"
          >
            <p>
              {feedback}
            </p>

            <Link to="/workouts">
              View My Workouts →
            </Link>
          </div>
        )}

        {/* DRAFT STORAGE INFORMATION */}

        <p className="builder-storage-note">
          Unsaved changes are automatically
          preserved in this browser tab.
          Confirmed workout plans are saved
          separately on this device.
        </p>
      </section>
    </div>
  );
}

export default WorkoutBuilderPage;
