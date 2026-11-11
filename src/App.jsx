
import {
  lazy,
  Suspense,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router";

import "./App.css";

import AppLayout from "./AppLayout";

// ==========================================
// LAZY LOADED PAGES
// ==========================================

// The components below are loaded only when
// the corresponding route is first opened.

// WELCOME AND DASHBOARD

const HomePage = lazy(() =>
  import("./pages/HomePage")
);

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage")
);

// WORKOUTS

const WorkoutsPage = lazy(() =>
  import("./pages/WorkoutsPage")
);

const TodaysWorkoutPage = lazy(() =>
  import("./pages/TodaysWorkoutPage")
);

const WeeklySchedulePage = lazy(() =>
  import("./pages/WeeklySchedulePage")
);

const WorkoutPlansPage = lazy(() =>
  import("./pages/WorkoutPlansPage")
);

const WorkoutBuilderPage = lazy(() =>
  import("./pages/WorkoutBuilderPage")
);

// PROGRESS

const ProgressPage = lazy(() =>
  import("./pages/ProgressPage")
);

const WorkoutHistoryPage = lazy(() =>
  import("./pages/WorkoutHistoryPage")
);

const ConsistencyPage = lazy(() =>
  import("./pages/ConsistencyPage")
);

const TrainingInsightsPage = lazy(() =>
  import("./pages/TrainingInsightsPage")
);

const TrainingChartsPage = lazy(() =>
  import("./pages/TrainingChartsPage")
);

const BodyFatEstimatorPage = lazy(() =>
  import("./pages/BodyFatEstimatorPage")
);

const BodyMeasurementsPage = lazy(() =>
  import("./pages/BodyMeasurementsPage")
);

// EXERCISES

const ExercisesPage = lazy(() =>
  import("./pages/ExercisesPage")
);

const ExerciseDetailsPage = lazy(() =>
  import("./pages/ExerciseDetailsPage")
);

// SETTINGS

const SettingsPage = lazy(() =>
  import("./pages/SettingsPage")
);

const TrainingProfilePage = lazy(() =>
  import("./pages/TrainingProfilePage")
);

const EquipmentPage = lazy(() =>
  import("./pages/EquipmentPage")
);

// NOT FOUND

const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage")
);

// ==========================================
// SHARED CONTEXT PROVIDERS
// ==========================================

// Providers remain statically imported.
// Their state must stay available while
// the user navigates between pages.

import {
  TrainingProfileProvider,
} from "./context/TrainingProfileProvider";

import {
  EquipmentProvider,
} from "./context/EquipmentProvider";

import {
  WeeklyScheduleProvider,
} from "./context/WeeklyScheduleProvider";

import {
  WorkoutPlanProvider,
} from "./context/WorkoutPlanProvider";

import {
  WorkoutSessionProvider,
} from "./context/WorkoutSessionProvider";

// ==========================================
// PAGE LOADING FALLBACK
// ==========================================

function PageLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      style={{
        width: "100%",
        minHeight: "260px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "32px 20px",
        color: "var(--color-text)",
        backgroundColor: "var(--color-page)",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          fontSize: "22px",
        }}
      >
        🏋️
      </div>

      <strong
        style={{
          fontSize: "15px",
          fontWeight: 700,
        }}
      >
        Loading Page
      </strong>

      <p
        style={{
          margin: 0,
          color: "var(--color-text-secondary)",
          fontSize: "12px",
        }}
      >
        Preparing your workout experience...
      </p>
    </section>
  );
}

// ==========================================
// LAZY ROUTE WRAPPER
// ==========================================

// Suspense handles the temporary loading
// state of each route independently.
//
// Keeping Suspense inside the page route
// preserves AppLayout, Header and Footer.

function LazyRoute({ component: Component }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

// ==========================================
// LEGACY HISTORY REDIRECT
// ==========================================

function LegacyHistoryRedirect() {
  const { workoutId } = useParams();

  return (
    <Navigate
      to={`/progress/history/${encodeURIComponent(
        workoutId
      )}`}
      replace
    />
  );
}

// ==========================================
// MAIN APPLICATION
// ==========================================

function App() {
  return (
    <TrainingProfileProvider>
      <EquipmentProvider>
        <WeeklyScheduleProvider>
          <WorkoutPlanProvider>
            <WorkoutSessionProvider>

              <Routes>
                <Route element={<AppLayout />}>

                  {/* ==========================
                      ROOT ROUTE
                  ========================== */}

                  <Route
                    path="/"
                    element={
                      <Navigate
                        to="/dashboard"
                        replace
                      />
                    }
                  />

                  {/* ==========================
                      WELCOME
                  ========================== */}

                  <Route
                    path="/welcome"
                    element={
                      <LazyRoute
                        component={HomePage}
                      />
                    }
                  />

                  {/* ==========================
                      DASHBOARD
                  ========================== */}

                  <Route
                    path="/dashboard"
                    element={
                      <LazyRoute
                        component={DashboardPage}
                      />
                    }
                  />

                  {/* ==========================
                      WORKOUTS
                  ========================== */}

                  <Route
                    path="/workouts"
                    element={
                      <LazyRoute
                        component={WorkoutsPage}
                      />
                    }
                  />

                  <Route
                    path="/workouts/today"
                    element={
                      <LazyRoute
                        component={TodaysWorkoutPage}
                      />
                    }
                  />

                  <Route
                    path="/workouts/schedule"
                    element={
                      <LazyRoute
                        component={WeeklySchedulePage}
                      />
                    }
                  />

                  <Route
                    path="/workouts/plans"
                    element={
                      <LazyRoute
                        component={WorkoutPlansPage}
                      />
                    }
                  />

                  <Route
                    path="/workouts/builder"
                    element={
                      <LazyRoute
                        component={WorkoutBuilderPage}
                      />
                    }
                  />

                  {/* ==========================
                      PROGRESS
                  ========================== */}

                  <Route
                    path="/progress"
                    element={
                      <LazyRoute
                        component={ProgressPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/history"
                    element={
                      <LazyRoute
                        component={WorkoutHistoryPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/history/:workoutId"
                    element={
                      <LazyRoute
                        component={WorkoutHistoryPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/consistency"
                    element={
                      <LazyRoute
                        component={ConsistencyPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/performance"
                    element={
                      <LazyRoute
                        component={TrainingInsightsPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/charts"
                    element={
                      <LazyRoute
                        component={TrainingChartsPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/body-fat"
                    element={
                      <LazyRoute
                        component={BodyFatEstimatorPage}
                      />
                    }
                  />

                  <Route
                    path="/progress/measurements"
                    element={
                      <LazyRoute
                        component={BodyMeasurementsPage}
                      />
                    }
                  />

                  {/* ==========================
                      LEGACY WORKOUT ROUTES
                  ========================== */}

                  <Route
                    path="/workouts/history"
                    element={
                      <Navigate
                        to="/progress/history"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/workouts/history/:workoutId"
                    element={
                      <LegacyHistoryRedirect />
                    }
                  />

                  <Route
                    path="/workouts/consistency"
                    element={
                      <Navigate
                        to="/progress/consistency"
                        replace
                      />
                    }
                  />

                  {/* ==========================
                      EXERCISES
                  ========================== */}

                  <Route
                    path="/exercises"
                    element={
                      <LazyRoute
                        component={ExercisesPage}
                      />
                    }
                  />

                  <Route
                    path="/exercises/:exerciseId"
                    element={
                      <LazyRoute
                        component={ExerciseDetailsPage}
                      />
                    }
                  />

                  {/* ==========================
                      SETTINGS
                  ========================== */}

                  <Route
                    path="/settings"
                    element={
                      <LazyRoute
                        component={SettingsPage}
                      />
                    }
                  />

                  <Route
                    path="/settings/profile"
                    element={
                      <LazyRoute
                        component={TrainingProfilePage}
                      />
                    }
                  />

                  <Route
                    path="/settings/equipment"
                    element={
                      <LazyRoute
                        component={EquipmentPage}
                      />
                    }
                  />

                  {/* ==========================
                      LEGACY SETTINGS ROUTES
                  ========================== */}

                  <Route
                    path="/profile"
                    element={
                      <Navigate
                        to="/settings/profile"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/equipment"
                    element={
                      <Navigate
                        to="/settings/equipment"
                        replace
                      />
                    }
                  />

                  {/* ==========================
                      PAGE NOT FOUND
                  ========================== */}

                  <Route
                    path="*"
                    element={
                      <LazyRoute
                        component={NotFoundPage}
                      />
                    }
                  />

                </Route>
              </Routes>

            </WorkoutSessionProvider>
          </WorkoutPlanProvider>
        </WeeklyScheduleProvider>
      </EquipmentProvider>
    </TrainingProfileProvider>
  );
}

export default App;
