
import { useMemo, useState } from "react";
import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import {
  buildTrainingChartData,
  getTrainingChartVariants,
  getTrainingChartRecords,
  getTrainingChartStats,
} from "../utils/trainingChartData";

import "./TrainingChartsPage.css";

// ==========================================
// FORMATTING HELPERS
// ==========================================

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function displayUnit(unit) {
  return unit === "unknown"
    ? "units"
    : unit;
}

// ==========================================
// REUSABLE SVG TREND CHART
// ==========================================

function TrendChart({
  title,
  description,
  records,
  dataKey,
  unit,
  lineColor,
}) {
  const validValues = records
    .map((record) => record[dataKey])
    .filter(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );

  if (validValues.length === 0) {
    return (
      <section className="tc-panel">
        <div className="tc-panel-heading">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="tc-empty-chart">
          <strong>No Load Data Available</strong>

          <p>
            This chart needs actual weight
            values recorded in completed sets.
          </p>
        </div>
      </section>
    );
  }

  // Make the chart wider when many
  // sessions are selected.
  const width = Math.max(
    760,
    records.length * 65
  );

  const height = 275;

  const left = 64;
  const right = 24;
  const top = 20;
  const bottom = 58;

  const plotWidth =
    width - left - right;

  const plotHeight =
    height - top - bottom;

  const highestValue =
    Math.max(...validValues);

  // Start the vertical scale at zero.
  const yMax =
    Math.max(1, highestValue * 1.15);

  const points = records.map(
    (record, index) => {
      const value = record[dataKey];

      const valid =
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0;

      const x =
        records.length === 1
          ? left + plotWidth / 2
          : left +
            (index * plotWidth) /
              (records.length - 1);

      const y = valid
        ? top +
          plotHeight -
          (value / yMax) * plotHeight
        : null;

      return {
        x,
        y,
        value,
        valid,
        date: record.finishedAt,
      };
    }
  );

  // Do not draw a continuous line across
  // sessions with missing measurements.
  const segments = [];
  let currentSegment = [];

  for (const point of points) {
    if (point.valid) {
      currentSegment.push(point);
    } else if (currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  const gridValues = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

  return (
    <section className="tc-panel">
      <div className="tc-panel-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="tc-chart-scroll">
        <svg
          className="tc-svg-chart"
          viewBox={`0 0 ${width} ${height}`}
          style={{
            minWidth: `${width}px`,
          }}
          role="img"
          aria-label={
            `${title}: chart of ` +
            `${records.length} recorded sessions`
          }
        >
          <title>{title}</title>

          <desc>
            Training sessions are arranged
            from oldest to newest. See the
            detailed table below for the
            exact values.
          </desc>

          {/* Horizontal grid lines */}
          {gridValues.map((fraction) => {
            const y =
              top +
              plotHeight -
              fraction * plotHeight;

            const label =
              yMax * fraction;

            return (
              <g key={fraction}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#3f3f46"
                  strokeWidth="1"
                  strokeDasharray={
                    fraction === 0
                      ? undefined
                      : "4 5"
                  }
                />

                <text
                  x={left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="#a1a1aa"
                  fontSize="11"
                >
                  {formatNumber(label)}
                </text>
              </g>
            );
          })}

          {/* Trend lines */}
          {segments.map(
            (segment, index) => (
              <polyline
                key={index}
                points={segment
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(" ")}
                fill="none"
                stroke={lineColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          )}

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              {point.valid && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={lineColor}
                  stroke="#18181b"
                  strokeWidth="2"
                >
                  <title>
                    {formatFullDate(point.date)}
                    {": "}
                    {formatNumber(point.value)}
                    {" "}
                    {unit}
                  </title>
                </circle>
              )}

              <text
                x={point.x}
                y={height - 24}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="10.5"
              >
                {formatDate(point.date)}
              </text>
            </g>
          ))}

          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fill="#71717a"
            fontSize="11"
          >
            Training sessions
          </text>
        </svg>
      </div>

      <p className="tc-chart-footnote">
        Each point represents one recorded
        exercise entry in a completed workout.
        Sessions are equally spaced; the
        horizontal axis is not a calendar
        time scale.
      </p>
    </section>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

function TrainingChartsPage() {
  const { workoutHistory } =
    useWorkoutSession();

  // Convert the saved workout history into
  // chart-ready records.
  const catalog = useMemo(
    () =>
      buildTrainingChartData(
        workoutHistory
      ),
    [workoutHistory]
  );

  const [requestedExerciseId, setExerciseId] =
    useState("");

  const [requestedVariantKey, setVariantKey] =
    useState("");

  const [range, setRange] =
    useState("12");

  // Choose a valid initial exercise
  // without overwriting saved history.
  const selectedExerciseId =
    catalog.exerciseOptions.some(
      (option) =>
        option.id === requestedExerciseId
    )
      ? requestedExerciseId
      : catalog.exerciseOptions[0]?.id ?? "";

  const variants = useMemo(
    () =>
      getTrainingChartVariants(
        catalog.records,
        selectedExerciseId
      ),
    [catalog.records, selectedExerciseId]
  );

  const selectedVariant =
    variants.find(
      (variant) =>
        variant.key === requestedVariantKey
    ) ?? variants[0];

  const selectedRecords = useMemo(
    () =>
      getTrainingChartRecords(
        catalog.records,
        selectedExerciseId,
        selectedVariant?.key ?? ""
      ),
    [
      catalog.records,
      selectedExerciseId,
      selectedVariant?.key,
    ]
  );

  const stats = useMemo(
    () =>
      getTrainingChartStats(
        selectedRecords
      ),
    [selectedRecords]
  );

  const visibleRecords =
    range === "all"
      ? selectedRecords
      : selectedRecords.slice(
          -Number(range)
        );

  const unit = displayUnit(
    selectedVariant?.weightUnit ?? "unknown"
  );

  // ========================================
  // EMPTY HISTORY
  // ========================================

  if (catalog.exerciseOptions.length === 0) {
    return (
      <main className="tc-page">

        {/* CONTEXTUAL BACK NAVIGATION */}

        <BackToPreviousPage
          fallbackTo="/progress"
          fallbackLabel="Progress"
          className="tc-back-link"
        />

        <header className="tc-header">
          <span className="tc-eyebrow">
            TRAINING ANALYTICS
          </span>

          <h1>Training Charts</h1>

          <p>
            Visualize your recorded exercise
            performance over time.
          </p>
        </header>

        <section className="tc-panel tc-empty-page">
          <h2>No Exercise Data Yet</h2>

          <p>
            Complete a workout with
            repetition-based exercises to
            start building your charts.
          </p>

          <p>
            Timed exercises remain available
            in Workout History but are not
            included in this first version
            of the charts.
          </p>

          <Link
            to="/workouts/today"
            className="tc-primary-link"
          >
            Open Today's Workout
          </Link>
        </section>
      </main>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="tc-page">

      {/* CONTEXTUAL BACK NAVIGATION */}

      <BackToPreviousPage
        fallbackTo="/progress"
        fallbackLabel="Progress"
        className="tc-back-link"
      />

      <header className="tc-header">
        <span className="tc-eyebrow">
          TRAINING ANALYTICS
        </span>

        <h1>Training Charts</h1>

        <p>
          Explore actual loads, repetitions,
          and recorded load-volume across
          your training history.
        </p>
      </header>

      {/* ==================================
          FILTERS
      ================================== */}

      <section className="tc-panel">
        <div className="tc-panel-heading">
          <h2>Select an Exercise</h2>

          <p>
            Compare records for the same
            exercise and loading convention.
          </p>
        </div>

        <div className="tc-filters">
          <label className="tc-field">
            Exercise

            <select
              value={selectedExerciseId}
              onChange={(event) => {
                setExerciseId(
                  event.target.value
                );

                setVariantKey("");
              }}
            >
              {catalog.exerciseOptions.map(
                (option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="tc-field">
            Weight Unit / Load Type

            <select
              value={selectedVariant?.key ?? ""}
              onChange={(event) =>
                setVariantKey(
                  event.target.value
                )
              }
            >
              {variants.map((variant) => (
                <option
                  key={variant.key}
                  value={variant.key}
                >
                  {variant.label}
                </option>
              ))}
            </select>
          </label>

          <label className="tc-field">
            Display Range

            <select
              value={range}
              onChange={(event) =>
                setRange(event.target.value)
              }
            >
              <option value="8">
                Last 8 Sessions
              </option>

              <option value="12">
                Last 12 Sessions
              </option>

              <option value="24">
                Last 24 Sessions
              </option>

              <option value="all">
                All Sessions
              </option>
            </select>
          </label>
        </div>
      </section>

      {/* ==================================
          SUMMARY STATISTICS
      ================================== */}

      <section className="tc-stats-grid">
        <article className="tc-stat-card">
          <span>Sessions Logged</span>

          <strong>
            {stats.sessionCount}
          </strong>

          <small>
            For the selected exercise
          </small>
        </article>

        <article className="tc-stat-card">
          <span>Highest Recorded Load</span>

          <strong>
            {stats.bestWeight === null
              ? "—"
              : `${formatNumber(
                  stats.bestWeight
                )} ${unit}`}
          </strong>

          <small>
            Heaviest set recorded
          </small>
        </article>

        <article className="tc-stat-card">
          <span>Logged Load-Volume</span>

          <strong>
            {stats.totalVolume === null
              ? "—"
              : formatNumber(
                  stats.totalVolume
                )}
          </strong>

          <small>
            {unit} × reps across sessions
          </small>
        </article>

        <article className="tc-stat-card">
          <span>Total Repetitions</span>

          <strong>
            {formatNumber(
              stats.totalReps
            )}
          </strong>

          <small>
            All valid recorded reps
          </small>
        </article>
      </section>

      {/* ==================================
          CHART 1: MAX RECORDED LOAD
      ================================== */}

      <TrendChart
        title="Maximum Recorded Load"
        description={
          "The highest weight entered " +
          "for this exercise in each session."
        }
        records={visibleRecords}
        dataKey="maxWeight"
        unit={unit}
        lineColor="#4ade80"
      />

      {/* ==================================
          CHART 2: LOGGED LOAD-VOLUME
      ================================== */}

      <TrendChart
        title="Logged Load-Volume"
        description={
          "Sum of recorded weight × " +
          "repetitions for each session."
        }
        records={visibleRecords}
        dataKey="loadVolume"
        unit={`${unit}·reps`}
        lineColor="#60a5fa"
      />

      {/* ==================================
          CHART 3: TOTAL REPETITIONS
      ================================== */}

      <TrendChart
        title="Total Repetitions"
        description={
          "All recorded repetitions " +
          "for this exercise per session."
        }
        records={visibleRecords}
        dataKey="totalReps"
        unit="reps"
        lineColor="#c4b5fd"
      />

      {/* ==================================
          SESSION DATA TABLE
      ================================== */}

      <section className="tc-panel">
        <div className="tc-panel-heading">
          <h2>Recorded Session Data</h2>

          <p>
            Exact values behind the
            displayed charts, newest first.
          </p>
        </div>

        <div className="tc-table-scroll">
          <table className="tc-data-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Sets</th>
                <th>Max Load</th>
                <th>Total Reps</th>
                <th>Load-Volume</th>
              </tr>
            </thead>

            <tbody>
              {[...visibleRecords]
                .reverse()
                .map((record, index) => (
                  <tr
                    key={
                      `${record.workoutId}-` +
                      `${record.exerciseId}-` +
                      `${index}`
                    }
                  >
                    <td>
                      <strong>
                        {formatFullDate(
                          record.finishedAt
                        )}
                      </strong>

                      <small>
                        {record.sessionName}
                      </small>
                    </td>

                    <td>
                      {record.setCount}
                    </td>

                    <td>
                      {record.maxWeight === null
                        ? "—"
                        : `${formatNumber(
                            record.maxWeight
                          )} ${unit}`}
                    </td>

                    <td>
                      {record.totalReps}
                    </td>

                    <td>
                      {record.loadVolume === null
                        ? "—"
                        : `${formatNumber(
                            record.loadVolume
                          )} ${unit}·reps`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {stats.missingWeightSets > 0 && (
          <p className="tc-info-note">
            {stats.missingWeightSets}
            {" "}recorded repetition sets
            have no positive weight value.
            They count toward repetitions
            but not logged load-volume.
          </p>
        )}
      </section>

      {/* ==================================
          EXPLANATION
      ================================== */}

      <section className="tc-panel">
        <div className="tc-panel-heading">
          <h2>Understanding Your Charts</h2>
        </div>

        <div className="tc-explanations">
          <p>
            <strong>Maximum Recorded Load:</strong>{" "}
            the heaviest load recorded
            during an exercise session.
            It is not an estimated
            one-repetition maximum.
          </p>

          <p>
            <strong>Logged Load-Volume:</strong>{" "}
            weight multiplied by repetitions
            across sets with a recorded load.
            It is not a direct measurement
            of muscle growth or mechanical work.
          </p>

          <p>
            <strong>Total Repetitions:</strong>{" "}
            the sum of valid repetitions
            entered during that session,
            even when no weight was recorded.
          </p>

          <p>
            <strong>Comparability:</strong>{" "}
            records with different weight units
            or loading conventions are
            displayed separately.
            Equipment and execution differences
            may still affect comparisons.
          </p>
        </div>

        <div className="tc-links">
          <Link
            to="/progress/performance"
            className="tc-secondary-link"
          >
            Performance & Progression
          </Link>

          <Link
            to="/progress/history"
            className="tc-secondary-link"
          >
            Workout History
          </Link>
        </div>
      </section>
    </main>
  );
}

export default TrainingChartsPage;
