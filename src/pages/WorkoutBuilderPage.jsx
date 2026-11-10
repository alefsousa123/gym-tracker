
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { exercises } from "../data/exercises";

import ExerciseMotionPreview from "../components/exercises/ExerciseMotionPreview";
import ExerciseTargetsEditor from "../components/workouts/ExerciseTargetsEditor";

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
  createDefaultExerciseTarget,
  normalizeExerciseTarget,
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

import "./WorkoutBuilderPage.css";

// Create empty sessions from a workout split
function createEmptySessions(splitId) {
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

// Start a new custom plan
function createNewDraft(profile, weeklySchedule) {
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
    weightUnit: profile?.weightUnit ?? "kg",
    sessions: createEmptySessions(splitId),
  };
}

// Create an editable copy of an applied plan
function createDraftFromPlan(plan, profile) {
  const split = getSplitById(plan.splitId);

  return {
    name: plan.name,
    splitId: split.id,
    location: plan.location ?? "home",
    weightUnit:
      plan.weightUnit ??
      profile?.weightUnit ??
      "kg",

    sessions: split.sessions.map((session) => {
      const existingSession = plan.sessions.find(
        (item) => item.id === session.id
      );

      const exerciseIds = [
        ...new Set(
          existingSession?.exerciseIds ?? []
        ),
      ];

      const exerciseTargets = Object.fromEntries(
        exerciseIds.map((exerciseId) => [
          exerciseId,
          normalizeExerciseTarget(
            exerciseId,
            existingSession?.exerciseTargets?.[
              exerciseId
            ]
          ),
        ])
      );

      return {
        id: session.id,
        name:
          existingSession?.name ??
          session.label,
        exerciseIds,
        exerciseTargets,
        missingSlots: [
          ...(existingSession?.missingSlots ?? []),
        ],
      };
    }),
  };
}

function WorkoutBuilderPage() {
  const { profile } = useTrainingProfile();
  const { homeEquipment } = useEquipment();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const {
    appliedPlan,
    applyWorkoutPlan,
  } = useWorkoutPlan();

  // Editable plan state
  const [mode, setMode] = useState(
    appliedPlan ? "current" : "new"
  );

  const [draft, setDraft] = useState(() =>
    appliedPlan
      ? createDraftFromPlan(appliedPlan, profile)
      : createNewDraft(profile, weeklySchedule)
  );

  const [activeSessionId, setActiveSessionId] =
    useState(() => draft.sessions[0]?.id ?? null);

  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] =
    useState("all");

  const [pendingMode, setPendingMode] =
    useState(null);

  const [pendingSplit, setPendingSplit] =
    useState(null);

  const [
    showSaveConfirmation,
    setShowSaveConfirmation,
  ] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Currently selected workout session
  const selectedSession = draft.sessions.find(
    (session) => session.id === activeSessionId
  );

  // Filter exercises by location and equipment
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

  const muscleGroups = [
    ...new Set(
      availableExercises.map(
        (exercise) => exercise.muscleGroup
      )
    ),
  ].sort();

  const filteredExercises = availableExercises
    .filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(
          search.trim().toLowerCase()
        );

      const matchesMuscle =
        muscleFilter === "all" ||
        exercise.muscleGroup === muscleFilter;

      return matchesSearch && matchesMuscle;
    })
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    );

  const totalExercises = draft.sessions.reduce(
    (total, session) =>
      total + session.exerciseIds.length,
    0
  );

  const requiresScheduleUpdate =
    !weeklySchedule ||
    weeklySchedule.splitId !== draft.splitId;

  const hadMissingTemplateSlots =
    mode === "current" &&
    appliedPlan?.sessions.some(
      (session) =>
        session.missingSlots.length > 0
    );

  // Reset form messages after editing
  function clearMessages() {
    setError("");
    setFeedback("");
    setShowSaveConfirmation(false);
  }

  // Ask before changing the starting point
  function requestModeChange(nextMode) {
    if (nextMode === mode) {
      return;
    }

    setPendingMode(nextMode);
    setPendingSplit(null);
    setShowSaveConfirmation(false);
  }

  function confirmModeChange() {
    const newDraft =
      pendingMode === "current" && appliedPlan
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

  // Changing the split creates new empty sessions
  function confirmSplitChange() {
    if (!pendingSplit) {
      return;
    }

    const sessions =
      createEmptySessions(pendingSplit);

    setDraft((previousDraft) => ({
      ...previousDraft,
      splitId: pendingSplit,
      sessions,
    }));

    setActiveSessionId(
      sessions[0]?.id ?? null
    );

    setPendingSplit(null);
    clearMessages();
  }

  // Change basic plan fields
  function updateDraftField(field, value) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      [field]: value,
    }));

    clearMessages();
  }

  // Add an exercise with its own starting targets
  function addExercise(exerciseId) {
    if (
      !selectedSession ||
      !availableExerciseIds.has(exerciseId) ||
      selectedSession.exerciseIds.includes(
        exerciseId
      )
    ) {
      return;
    }

    setDraft((previousDraft) => ({
      ...previousDraft,

      sessions: previousDraft.sessions.map(
        (session) => {
          if (session.id !== activeSessionId) {
            return session;
          }

          return {
            ...session,

            exerciseIds: [
              ...session.exerciseIds,
              exerciseId,
            ],

            exerciseTargets: {
              ...session.exerciseTargets,

              [exerciseId]:
                createDefaultExerciseTarget(
                  exerciseId
                ),
            },
          };
        }
      ),
    }));

    clearMessages();
  }

  // Remove an exercise and its settings
  function removeExercise(
    sessionId,
    exerciseId
  ) {
    setDraft((previousDraft) => ({
      ...previousDraft,

      sessions: previousDraft.sessions.map(
        (session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const nextTargets = {
            ...session.exerciseTargets,
          };

          delete nextTargets[exerciseId];

          return {
            ...session,

            exerciseIds:
              session.exerciseIds.filter(
                (id) => id !== exerciseId
              ),

            exerciseTargets: nextTargets,
          };
        }
      ),
    }));

    clearMessages();
  }

  // Move exercises without changing their targets
  function moveExercise(
    sessionId,
    exerciseId,
    direction
  ) {
    setDraft((previousDraft) => ({
      ...previousDraft,

      sessions: previousDraft.sessions.map(
        (session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const exerciseIds = [
            ...session.exerciseIds,
          ];

          const currentIndex =
            exerciseIds.indexOf(exerciseId);

          const nextIndex =
            currentIndex + direction;

          if (
            currentIndex < 0 ||
            nextIndex < 0 ||
            nextIndex >= exerciseIds.length
          ) {
            return session;
          }

          [
            exerciseIds[currentIndex],
            exerciseIds[nextIndex],
          ] = [
            exerciseIds[nextIndex],
            exerciseIds[currentIndex],
          ];

          return {
            ...session,
            exerciseIds,
          };
        }
      ),
    }));

    clearMessages();
  }

  // Edit the targets of a specific exercise
  function updateExerciseTarget(
    sessionId,
    exerciseId,
    changes
  ) {
    setDraft((previousDraft) => ({
      ...previousDraft,

      sessions: previousDraft.sessions.map(
        (session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const previousTarget =
            normalizeExerciseTarget(
              exerciseId,
              session.exerciseTargets?.[
                exerciseId
              ]
            );

          return {
            ...session,

            exerciseTargets: {
              ...session.exerciseTargets,

              [exerciseId]: {
                ...previousTarget,
                ...changes,
              },
            },
          };
        }
      ),
    }));

    clearMessages();
  }

  // Validate the entire draft
  function getValidationError() {
    if (!draft.name.trim()) {
      return {
        message:
          "Please enter a name for your workout plan.",
        sessionId: null,
      };
    }

    for (const session of draft.sessions) {
      if (session.exerciseIds.length === 0) {
        return {
          message:
            `Add at least one exercise to ${session.name}.`,
          sessionId: session.id,
        };
      }

      for (const exerciseId of session.exerciseIds) {
        const exercise = exercises.find(
          (item) => item.id === exerciseId
        );

        if (
          !availableExerciseIds.has(exerciseId)
        ) {
          return {
            message:
              `${exercise?.name ?? "An exercise"} is unavailable for the current training setup.`,
            sessionId: session.id,
          };
        }

        const result = validateExerciseTarget(
          exerciseId,
          session.exerciseTargets?.[
            exerciseId
          ]
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

  // Show errors or request saving confirmation
  function handleReviewSave() {
    const validationError =
      getValidationError();

    if (validationError) {
      setError(validationError.message);
      setFeedback("");

      if (validationError.sessionId) {
        setActiveSessionId(
          validationError.sessionId
        );
      }

      return;
    }

    setError("");
    setFeedback("");
    setShowSaveConfirmation(true);
  }

  // Save the complete plan after confirmation
  function handleConfirmSave() {
    const validationError =
      getValidationError();

    if (validationError) {
      setError(validationError.message);
      setShowSaveConfirmation(false);

      if (validationError.sessionId) {
        setActiveSessionId(
          validationError.sessionId
        );
      }

      return;
    }

    const savedSessions = draft.sessions.map(
      (session) => {
        const exerciseTargets =
          Object.fromEntries(
            session.exerciseIds.map(
              (exerciseId) => {
                const result =
                  validateExerciseTarget(
                    exerciseId,
                    session.exerciseTargets[
                      exerciseId
                    ]
                  );

                return [
                  exerciseId,
                  result.value,
                ];
              }
            )
          );

        return {
          id: session.id,
          name: session.name,

          exerciseIds: [
            ...session.exerciseIds,
          ],

          exerciseTargets,

          missingSlots: [
            ...session.missingSlots,
          ],
        };
      }
    );

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

      sessions: savedSessions,
    };

    applyWorkoutPlan(updatedPlan);

    if (requiresScheduleUpdate) {
      saveWeeklySchedule(
        createWeeklyTemplate(
          Number(
            profile?.trainingDaysPerWeek ?? 3
          ),
          draft.splitId
        )
      );
    }

    setShowSaveConfirmation(false);
    setError("");

    setFeedback(
      "Your workout plan and exercise targets have been saved for this session."
    );
  }

  return (
    <div className="workout-builder-page">
      <Link
        to="/workouts"
        className="builder-back-link"
      >
        ← Back to Workouts
      </Link>

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

      {/* Starting point */}
      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>Choose Your Starting Point</h2>

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
            aria-pressed={mode === "new"}
            onClick={() =>
              requestModeChange("new")
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
            aria-pressed={mode === "current"}
            disabled={!appliedPlan}
            onClick={() =>
              requestModeChange("current")
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
                onClick={confirmModeChange}
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

      {/* Basic plan settings */}
      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>Plan Settings</h2>

          <p>
            Name your plan, select a workout split,
            and choose where you will train.
          </p>
        </div>

        <div className="builder-settings-grid">
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

          <div className="builder-field">
            <label htmlFor="builderSplit">
              Workout Split
            </label>

            <select
              id="builderSplit"
              value={draft.splitId}
              onChange={(event) => {
                if (
                  event.target.value !==
                  draft.splitId
                ) {
                  setPendingSplit(
                    event.target.value
                  );
                }
              }}
            >
              {workoutSplits.map((split) => (
                <option
                  key={split.id}
                  value={split.id}
                >
                  {split.name}
                </option>
              ))}
            </select>
          </div>

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

                setMuscleFilter("all");
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
                onClick={confirmSplitChange}
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

        {draft.location === "home" && (
          <p className="builder-information">
            Home exercises are filtered
            using your saved equipment.{" "}

            <Link to="/settings/equipment">
              Manage My Equipment →
            </Link>
          </p>
        )}

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

      {/* Workout editor and exercise library */}
      <div className="builder-main-grid">
        <section className="builder-panel">
          <div className="builder-section-heading">
            <h2>Workout Sessions</h2>

            <p>
              Add exercises, organize their order,
              and configure individual targets.
            </p>
          </div>

          <div className="builder-session-tabs">
            {draft.sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={
                  `builder-session-tab ${
                    activeSessionId === session.id
                      ? "is-selected"
                      : ""
                  }`
                }
                aria-pressed={
                  activeSessionId === session.id
                }
                onClick={() =>
                  setActiveSessionId(session.id)
                }
              >
                {session.name}

                <span>
                  {session.exerciseIds.length}
                </span>
              </button>
            ))}
          </div>

          {selectedSession && (
            <div className="builder-session-content">
              <div className="builder-session-heading">
                <h3>{selectedSession.name}</h3>

                <span>
                  {selectedSession.exerciseIds.length}
                  {" "}exercises
                </span>
              </div>

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
                  {selectedSession.exerciseIds.map(
                    (exerciseId, index) => {
                      const exercise = exercises.find(
                        (item) =>
                          item.id === exerciseId
                      );

                      const isAvailable =
                        availableExerciseIds.has(
                          exerciseId
                        );

                      const target =
                        normalizeExerciseTarget(
                          exerciseId,
                          selectedSession
                            .exerciseTargets?.[
                              exerciseId
                            ]
                        );

                      return (
                        <div
                          className="builder-selected-item"
                          key={exerciseId}
                        >
                          {/* Existing exercise card */}
                          <div className="builder-selected-exercise">
                            <span className="builder-exercise-number">
                              {index + 1}
                            </span>

                            <ExerciseMotionPreview
                              exerciseId={exerciseId}
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

                            {/* Reorder and remove */}
                            <div className="builder-reorder-buttons">
                              <button
                                type="button"
                                aria-label={
                                  `Move ${
                                    exercise?.name ??
                                    "exercise"
                                  } up`
                                }
                                disabled={index === 0}
                                onClick={() =>
                                  moveExercise(
                                    selectedSession.id,
                                    exerciseId,
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
                                    exerciseId,
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
                                    exerciseId
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* New exercise target controls */}
                          <ExerciseTargetsEditor
                            exerciseName={
                              exercise?.name ??
                              "Exercise"
                            }
                            target={target}
                            weightUnit={draft.weightUnit}
                            onChange={(changes) =>
                              updateExerciseTarget(
                                selectedSession.id,
                                exerciseId,
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

        {/* Exercise library */}
        <section className="builder-panel">
          <div className="builder-section-heading">
            <h2>Exercise Library</h2>

            <p>
              Add exercises compatible with
              your training location and equipment.
            </p>
          </div>

          <div className="builder-library-filters">
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

            <div className="builder-field">
              <label htmlFor="builderMuscle">
                Muscle Group
              </label>

              <select
                id="builderMuscle"
                value={muscleFilter}
                onChange={(event) =>
                  setMuscleFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Muscle Groups
                </option>

                {muscleGroups.map((group) => (
                  <option
                    key={group}
                    value={group}
                  >
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              filteredExercises.map((exercise) => {
                const isAdded =
                  selectedSession?.exerciseIds.includes(
                    exercise.id
                  ) ?? false;

                return (
                  <div
                    className="builder-library-exercise"
                    key={exercise.id}
                  >
                    <ExerciseMotionPreview
                      exerciseId={exercise.id}
                      exerciseName={exercise.name}
                      variant="thumbnail"
                    />

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
                      >
                        View Guide
                      </Link>
                    </div>

                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() =>
                        addExercise(exercise.id)
                      }
                    >
                      {isAdded
                        ? "Added"
                        : "+ Add"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Plan review and save */}
      <section className="builder-panel">
        <div className="builder-section-heading">
          <h2>Review Your Plan</h2>

          <p>
            Review your exercises and planned
            targets before saving.
          </p>
        </div>

        <div className="builder-review-grid">
          <div>
            <span>Workout Split</span>

            <strong>
              {getSplitById(draft.splitId).name}
            </strong>
          </div>

          <div>
            <span>Sessions</span>

            <strong>
              {draft.sessions.length}
            </strong>
          </div>

          <div>
            <span>Exercise Entries</span>

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

        {error && (
          <p
            className="builder-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {!showSaveConfirmation ? (
          <button
            type="button"
            className="builder-primary-button"
            onClick={handleReviewSave}
          >
            Review & Save Plan
          </button>
        ) : (
          <div className="builder-confirm-box">
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

            <div className="builder-button-row">
              <button
                type="button"
                className="builder-primary-button"
                onClick={handleConfirmSave}
              >
                Confirm & Save
              </button>

              <button
                type="button"
                className="builder-secondary-button"
                onClick={() =>
                  setShowSaveConfirmation(false)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className="builder-success"
            role="status"
          >
            <p>{feedback}</p>

            <Link to="/workouts">
              View My Workouts →
            </Link>
          </div>
        )}

        <p className="builder-storage-note">
          Your plan is currently saved
          in React memory. Permanent storage
          will be implemented in Stage 14.
        </p>
      </section>
    </div>
  );
}

export default WorkoutBuilderPage;
