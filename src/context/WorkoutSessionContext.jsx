
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  normalizeExerciseTarget,
} from "../utils/workoutTargets";

const WorkoutSessionContext = createContext(null);

const REVIEW_STORAGE_KEY =
  "gym-tracker-training-review-v1";

const REVIEW_INTERVAL_MS =
  14 * 24 * 60 * 60 * 1000;

const initialRestTimer = {
  status: "idle",
  endsAt: null,
  remainingSeconds: 0,
};

function readReviewData() {
  const fallback = {
    firstCompletedAt: null,
    lastPromptedAt: null,
    entries: [],
  };

  try {
    const saved = localStorage.getItem(
      REVIEW_STORAGE_KEY
    );

    if (!saved) {
      return fallback;
    }

    const parsed = JSON.parse(saved);

    return {
      firstCompletedAt:
        parsed.firstCompletedAt ?? null,
      lastPromptedAt:
        parsed.lastPromptedAt ?? null,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries
        : [],
    };
  } catch {
    return fallback;
  }
}

export function WorkoutSessionProvider({
  children,
}) {
  const [activeWorkout, setActiveWorkout] =
    useState(null);

  const [lastWorkout, setLastWorkout] =
    useState(null);

  const [restTimer, setRestTimer] = useState(
    initialRestTimer
  );

  const [reviewData, setReviewData] = useState(
    readReviewData
  );

  const [reviewOpen, setReviewOpen] =
    useState(false);

  // Keep the check-in schedule across page reloads.
  useEffect(() => {
    try {
      localStorage.setItem(
        REVIEW_STORAGE_KEY,
        JSON.stringify(reviewData)
      );
    } catch {
      // The app can still work without storage.
    }
  }, [reviewData]);

  // Finish the rest period at its actual deadline.
  useEffect(() => {
    if (restTimer.status !== "running") {
      return;
    }

    const delay = Math.max(
      0,
      restTimer.endsAt - Date.now()
    );

    const timeoutId = setTimeout(() => {
      setRestTimer((current) => {
        if (current.status !== "running") {
          return current;
        }

        const remaining = Math.max(
          0,
          current.endsAt - Date.now()
        );

        if (remaining > 0) {
          return current;
        }

        return {
          status: "done",
          endsAt: null,
          remainingSeconds: 0,
        };
      });
    }, delay + 50);

    return () => clearTimeout(timeoutId);
  }, [restTimer.status, restTimer.endsAt]);

  function startWorkout({
    plan,
    session,
    scheduledDayId = null,
  }) {
    if (
      activeWorkout ||
      !plan ||
      !session?.exerciseIds?.length
    ) {
      return;
    }

    const workoutExercises =
      session.exerciseIds.map((exerciseId) => ({
        exerciseId,

        target: normalizeExerciseTarget(
          exerciseId,
          session.exerciseTargets?.[exerciseId]
        ),

        completedSets: [],
        skipped: false,
      }));

    setActiveWorkout({
      id: `workout-${Date.now()}`,
      startedAt: new Date().toISOString(),

      planName: plan.name,
      sessionId: session.id,
      sessionName: session.name,

      splitId: plan.splitId,
      location: plan.location,
      weightUnit: plan.weightUnit ?? "kg",

      scheduledDayId,
      exercises: workoutExercises,
    });

    setRestTimer(initialRestTimer);
  }

  // Record actual results without modifying planned targets.
  function recordSet(exerciseId, setData) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) => {
            if (
              exercise.exerciseId !== exerciseId ||
              exercise.skipped ||
              exercise.completedSets.length >=
                Number(exercise.target.sets)
            ) {
              return exercise;
            }

            return {
              ...exercise,

              completedSets: [
                ...exercise.completedSets,

                {
                  setNumber:
                    exercise.completedSets.length + 1,

                  completedAt:
                    new Date().toISOString(),

                  targetType:
                    exercise.target.targetType,

                  reps: setData.reps ?? null,

                  durationSeconds:
                    setData.durationSeconds ?? null,

                  weight: setData.weight ?? null,

                  // Optional historical fields.
                  effort: setData.effort ?? null,
                  technique:
                    setData.technique ?? null,
                },
              ],
            };
          }
        ),
      };
    });
  }

  function undoLastSet(exerciseId) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) =>
            exercise.exerciseId === exerciseId
              ? {
                  ...exercise,
                  completedSets:
                    exercise.completedSets.slice(
                      0,
                      -1
                    ),
                  skipped: false,
                }
              : exercise
        ),
      };
    });
  }

  function toggleSkipExercise(exerciseId) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) =>
            exercise.exerciseId === exerciseId
              ? {
                  ...exercise,
                  skipped: !exercise.skipped,
                }
              : exercise
        ),
      };
    });
  }

  function startRest(seconds) {
    const duration = Number(seconds);

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      setRestTimer(initialRestTimer);
      return;
    }

    setRestTimer({
      status: "running",
      endsAt:
        Date.now() + duration * 1000,
      remainingSeconds: Math.ceil(duration),
    });
  }

  function pauseRest() {
    setRestTimer((timer) => {
      if (timer.status !== "running") {
        return timer;
      }

      const remainingSeconds = Math.max(
        0,
        Math.ceil(
          (timer.endsAt - Date.now()) / 1000
        )
      );

      return {
        status:
          remainingSeconds > 0
            ? "paused"
            : "done",
        endsAt: null,
        remainingSeconds,
      };
    });
  }

  function resumeRest() {
    setRestTimer((timer) => {
      if (
        timer.status !== "paused" ||
        timer.remainingSeconds <= 0
      ) {
        return timer;
      }

      return {
        ...timer,
        status: "running",

        endsAt:
          Date.now() +
          timer.remainingSeconds * 1000,
      };
    });
  }

  function addRestTime(seconds = 30) {
    const extraSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    setRestTimer((timer) => {
      if (timer.status === "running") {
        return {
          ...timer,

          endsAt:
            Math.max(
              timer.endsAt,
              Date.now()
            ) +
            extraSeconds * 1000,
        };
      }

      if (timer.status === "paused") {
        return {
          ...timer,

          remainingSeconds:
            timer.remainingSeconds +
            extraSeconds,
        };
      }

      return timer;
    });
  }

  function clearRestTimer() {
    setRestTimer(initialRestTimer);
  }

  // Called only when a workout is finalized.
  function checkForTrainingReview(finishedAt) {
    const firstCompletedAt =
      reviewData.firstCompletedAt ??
      finishedAt;

    const referenceDate =
      reviewData.lastPromptedAt ??
      firstCompletedAt;

    const elapsed =
      Date.parse(finishedAt) -
      Date.parse(referenceDate);

    setReviewData((previous) => ({
      ...previous,
      firstCompletedAt:
        previous.firstCompletedAt ??
        finishedAt,
    }));

    if (
      Number.isFinite(elapsed) &&
      elapsed >= REVIEW_INTERVAL_MS
    ) {
      setReviewOpen(true);
    }
  }

  function finishWorkout() {
    if (!activeWorkout) {
      return;
    }

    const totalCompletedSets =
      activeWorkout.exercises.reduce(
        (total, exercise) =>
          total + exercise.completedSets.length,
        0
      );

    if (totalCompletedSets === 0) {
      return;
    }

    const fullyCompleted =
      activeWorkout.exercises.every(
        (exercise) =>
          !exercise.skipped &&
          exercise.completedSets.length ===
            Number(exercise.target.sets)
      );

    const finishedAt =
      new Date().toISOString();

    setLastWorkout({
      ...activeWorkout,

      finishedAt,

      status: fullyCompleted
        ? "completed"
        : "partial",

      totalCompletedSets,
    });

    setActiveWorkout(null);
    setRestTimer(initialRestTimer);

    checkForTrainingReview(finishedAt);
  }

  function discardWorkout() {
    setActiveWorkout(null);
    setRestTimer(initialRestTimer);
  }

  // Optional check-in, not required for completing sets.
  function submitTrainingReview({
    difficulty,
    technique,
  }) {
    const now = new Date().toISOString();

    setReviewData((previous) => ({
      ...previous,
      lastPromptedAt: now,

      entries: [
        ...previous.entries,

        {
          id: `review-${Date.now()}`,
          date: now,
          difficulty,
          technique,
        },
      ],
    }));

    setReviewOpen(false);
  }

  // Dismissing postpones the next prompt.
  function dismissTrainingReview() {
    setReviewData((previous) => ({
      ...previous,
      lastPromptedAt:
        new Date().toISOString(),
    }));

    setReviewOpen(false);
  }

  return (
    <WorkoutSessionContext.Provider
      value={{
        activeWorkout,
        lastWorkout,
        restTimer,
        reviewOpen,

        startWorkout,
        recordSet,
        undoLastSet,
        toggleSkipExercise,

        startRest,
        pauseRest,
        resumeRest,
        addRestTime,
        clearRestTimer,

        finishWorkout,
        discardWorkout,

        submitTrainingReview,
        dismissTrainingReview,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const context = useContext(
    WorkoutSessionContext
  );

  if (!context) {
    throw new Error(
      "useWorkoutSession must be used within a WorkoutSessionProvider."
    );
  }

  return context;
}
