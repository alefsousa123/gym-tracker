
import {
  Navigate,
  Route,
  Routes,
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

import TodayWorkoutOverview from "./components/workouts/TodayWorkoutOverview";

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

function App() {
  return (
    <TrainingProfileProvider>
      <EquipmentProvider>
        <WeeklyScheduleProvider>
          <WorkoutPlanProvider>
            <WorkoutSessionProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  {/* Home */}
                  <Route
                    path="/"
                    element={
                      <>
                        <TodayWorkoutOverview />
                        <HomePage />
                      </>
                    }
                  />

                  {/* Dashboard */}
                  <Route
                    path="/dashboard"
                    element={<DashboardPage />}
                  />

                  {/* Workouts */}
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

                  {/* Exercise Library */}
                  <Route
                    path="/exercises"
                    element={<ExercisesPage />}
                  />

                  <Route
                    path="/exercises/:exerciseId"
                    element={<ExerciseDetailsPage />}
                  />

                  {/* Progress */}
                  <Route
                    path="/progress"
                    element={<ProgressPage />}
                  />

                  {/* Settings */}
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

                  {/* Legacy redirects */}
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

                  {/* Not Found */}
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
