import {
  buildPerformanceInsights,
} from "./performanceAnalysis";

/**
 * D1.21.1 - Read-only load recommendations.
 *
 * Reuses the existing performance evaluator.
 * Never writes exercise weights or history.
 *
 * A suggestion is not authorization to
 * increase a load. Effort, technique and
 * individual circumstances require review.
 */

const MAX_INCREASE = 0.05;
const PREFERRED_INCREASE = 0.025;

function roundWeight(value) {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function getWeightStep(unit) {
  return unit === "lb" ? 1 : 0.5;
}

export function recommendExerciseProgression(
  insight
) {
  const baseline =
    Number(insight?.baselineWeight);

  const unit =
    insight?.weightUnit === "lb"
      ? "lb"
      : "kg";

  const baseResult = {
    exerciseId:
      insight?.exerciseId ?? null,
    weightUnit: unit,
    currentWeight:
      Number.isFinite(baseline) &&
      baseline > 0
        ? baseline
        : null,
    suggestedWeight: null,
    increaseAmount: null,
    increasePercent: null,
    status: "hold",
    reason: "",
    requiresUserApproval: true,
  };

  if (!insight) {
    return {
      ...baseResult,
      reason: "No exercise data available.",
    };
  }

  if (insight.alreadyAdjusted) {
    return {
      ...baseResult,
      status: "already-adjusted",
      reason:
        "The planned load is already above " +
        "the latest recorded load.",
    };
  }

  if (
    !Array.isArray(insight.recent) ||
    insight.recent.length < 2
  ) {
    return {
      ...baseResult,
      reason:
        "At least two comparable recorded " +
        "sessions are required.",
    };
  }

  if (!insight.canReviewIncrease) {
    return {
      ...baseResult,
      reason:
        "The last two sessions have not met " +
        "the current progression criteria.",
    };
  }

  if (
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
    return {
      ...baseResult,
      reason:
        "A positive recorded weight is required.",
    };
  }

  const step = getWeightStep(unit);

  const preferred =
    baseline * (1 + PREFERRED_INCREASE);

  // Round upward to an available increment.
  const next =
    roundWeight(
      Math.ceil(
        (preferred - 1e-9) / step
      ) * step
    );

  const maximum =
    baseline * (1 + MAX_INCREASE);

  if (
    next <= baseline ||
    next > maximum + 1e-9
  ) {
    return {
      ...baseResult,
      status: "step-unavailable",
      reason:
        "The configured minimum weight step " +
        "would exceed the 5% suggestion limit. " +
        "Review manually or keep the same load.",
    };
  }

  return {
    ...baseResult,
    status: "review",
    suggestedWeight: next,
    increaseAmount:
      roundWeight(next - baseline),
    increasePercent:
      roundWeight(
        ((next - baseline) / baseline) * 100
      ),
    reason:
      "The top repetition target was met " +
      "in two consecutive comparable sessions. " +
      "Review technique, effort and equipment " +
      "before deciding whether to increase.",
  };
}

export function buildProgressionRecommendations(
  appliedPlan,
  workoutHistory
) {
  return buildPerformanceInsights(
    appliedPlan,
    workoutHistory
  ).map((session) => ({
    sessionId: session.sessionId,
    sessionName: session.sessionName,

    exercises: session.exercises.map(
      (insight) =>
        recommendExerciseProgression(
          insight
        )
    ),
  }));
}
