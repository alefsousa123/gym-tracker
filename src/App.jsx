
import {
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router";

import "./App.css";

import AppLayout from "./AppLayout";

import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";

import WorkoutsPage from "./pages/WorkoutsPage";
import WeeklySchedulePage from "./pages/WeeklySchedulePage";
import WorkoutPlansPage from "./pages/WorkoutPlansPage";
import WorkoutBuilderPage from "./pages/WorkoutBuilderPage";
import TodaysWorkoutPage from "./pages/TodaysWorkoutPage";

import WorkoutHistoryPage from "./pages/WorkoutHistoryPage";
import ConsistencyPage from "./pages/ConsistencyPage";
import TrainingInsightsPage from "./pages/TrainingInsightsPage";
import TrainingChartsPage from "./pages/TrainingChartsPage";
import BodyFatEstimatorPage from "./pages/BodyFatEstimatorPage";
import BodyMeasurementsPage from "./pages/BodyMeasurementsPage";

import ExercisesPage from "./pages/ExercisesPage";
import ExerciseDetailsPage from "./pages/ExerciseDetailsPage";

import ProgressPage from "./pages/ProgressPage";

import TrainingProfilePage from "./pages/TrainingProfilePage";
import EquipmentPage from "./pages/EquipmentPage";
import SettingsPage from "./pages/SettingsPage";

import NotFoundPage from "./pages/NotFoundPage";

import {
  TrainingProfileProvider,
} from "./context/TrainingProfileContext";

import {
  EquipmentProvider,
} from "./context/EquipmentContext";

import {
  WeeklyScheduleProvider,
} from "./context/WeeklyScheduleContext";

import {
  WorkoutPlanProvider,
} from "./context/WorkoutPlanContext";

import {
  WorkoutSessionProvider,
} from "./context/WorkoutSessionContext";

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

                  {/* ==================================
                      ROOT ROUTE
                  ================================== */}

                  <Route
                    path="/"
                    element={
                      <Navigate
                        to="/dashboard"
                        replace
                      />
                    }
                  />

                  {/* ==================================
                      PUBLIC WELCOME PAGE
                  ================================== */}

                  <Route
                    path="/welcome"
                    element={<HomePage />}
                  />

                  {/* ==================================
                      DASHBOARD
                  ================================== */}

                  <Route
                    path="/dashboard"
                    element={<DashboardPage />}
                  />

                  {/* ==================================
                      WORKOUTS
                  ================================== */}

                  <Route
                    path="/workouts"
                    element={<WorkoutsPage />}
                  />

                  <Route
                    path="/workouts/today"
                    element={<TodaysWorkoutPage />}
                  />

                  <Route
                    path="/workouts/schedule"
                    element={<WeeklySchedulePage />}
                  />

                  <Route
                    path="/workouts/plans"
                    element={<WorkoutPlansPage />}
                  />

                  <Route
                    path="/workouts/builder"
                    element={<WorkoutBuilderPage />}
                  />

                  {/* ==================================
                      PROGRESS
                  ================================== */}

                  <Route
                    path="/progress"
                    element={<ProgressPage />}
                  />

                  <Route
                    path="/progress/history"
                    element={<WorkoutHistoryPage />}
                  />

                  <Route
                    path="/progress/history/:workoutId"
                    element={<WorkoutHistoryPage />}
                  />

                  <Route
                    path="/progress/consistency"
                    element={<ConsistencyPage />}
                  />

                  <Route
                    path="/progress/performance"
                    element={<TrainingInsightsPage />}
                  />

                  <Route
                    path="/progress/charts"
                    element={<TrainingChartsPage />}
                  />

                  <Route
                    path="/progress/body-fat"
                    element={<BodyFatEstimatorPage />}
                  />

                  <Route
                    path="/progress/measurements"
                    element={<BodyMeasurementsPage />}
                  />

                  {/* ==================================
                      OLD WORKOUT ROUTES
                  ================================== */}

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
                    element={<LegacyHistoryRedirect />}
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

                  {/* ==================================
                      EXERCISES
                  ================================== */}

                  <Route
                    path="/exercises"
                    element={<ExercisesPage />}
                  />

                  <Route
                    path="/exercises/:exerciseId"
                    element={<ExerciseDetailsPage />}
                  />

                  {/* ==================================
                      SETTINGS
                  ================================== */}

                  <Route
                    path="/settings"
                    element={<SettingsPage />}
                  />

                  <Route
                    path="/settings/profile"
                    element={<TrainingProfilePage />}
                  />

                  <Route
                    path="/settings/equipment"
                    element={<EquipmentPage />}
                  />

                  {/* ==================================
                      OLD SETTINGS ROUTES
                  ================================== */}

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

                  {/* ==================================
                      PAGE NOT FOUND
                  ================================== */}

                  <Route
                    path="*"
                    element={<NotFoundPage />}
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
