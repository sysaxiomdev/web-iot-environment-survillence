import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loader from "./components/Loader";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import AlertsPage from "./pages/AlertsPage";
import DashboardPage from "./pages/DashboardPage";
import DeviceDetailsPage from "./pages/DeviceDetailsPage";
import DevicesPage from "./pages/DevicesPage";
import LoginPage from "./pages/LoginPage";
import ReadingsPage from "./pages/ReadingsPage";
import SettingsPage from "./pages/SettingsPage";
import SimulatorPage from "./pages/SimulatorPage";

const SwaggerPage = lazy(() => import("./pages/SwaggerPage"));

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/swagger"
        element={
          <Suspense fallback={<Loader label="Loading Swagger UI..." />}>
            <SwaggerPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/:userId/:nodeId" element={<DeviceDetailsPage />} />
          <Route path="/readings" element={<ReadingsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
