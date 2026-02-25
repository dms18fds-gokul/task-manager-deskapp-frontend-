import Dashboard from "./pages/Dashboard";
import TaskAssignment from "./pages/TaskAssignment";
import Auth from "./pages/Auth";
import EmployeeManagement from "./pages/EmployeeManagement";
import EmployeeLogTime from "./pages/EmployeeLogTime";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeTaskPage from "./pages/EmployeeTaskPage";
import EmployeeLogSystemPage from "./pages/EmployeeLogSystemPage";
import ApplyLeave from "./pages/ApplyLeave";
import AdminTasksPage from "./pages/AdminTasksPage";
import LogTime from "./pages/LogTime";
import OfficeChat from "./pages/OfficeChat"; // Import Chat Page
import CredentialsVault from "./pages/CredentialsVault"; // Import CredentialsVault
import EmployeeTaskAssignment from "./pages/EmployeeTaskAssignment";
import AssignedTasksPage from "./pages/AssignedTasksPage"; // Import
import RamUsage from "./pages/RamUsage";
import DeviceRamTable from "./pages/DeviceRamTable";
import AutoCapturePage from "./pages/AutoCapturePage";
import EmployeeReportPage from "./pages/EmployeeReportPage";
import ProjectReportPage from "./pages/ProjectReportPage";
import EmployeeControlPage from "./pages/EmployeeControlPage"; // Added Settings page Route
import EmployeeLogsAndTaskControlPage from "./pages/EmployeeLogsAndTaskControlPage"; // New Logs/Task Control Page
import EmployeeScreenshotControlPage from "./pages/EmployeeScreenshotControlPage"; // Screenshot Control Page
import { Route, Routes, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { API_URL } from "./utils/config";
import { useSocket } from "./context/SocketContext";
import "./App.css";

const App = () => {
  const { socket } = useSocket();

  useEffect(() => {
    // 1. App Memory Tracker via Electron
    if (window.electronAPI && window.electronAPI.getAppMemory) {
      const reportMemory = async () => {
        try {
          // Requires user to be logged in to send their userId
          const token = localStorage.getItem("token");
          const userStr = localStorage.getItem("user");
          if (!token || !userStr) return;

          const user = JSON.parse(userStr);
          const deviceId = await window.electronAPI.getDeviceId();
          const ramUsageMB = await window.electronAPI.getAppMemory();

          if (ramUsageMB) {
            await fetch(`${API_URL}/metrics/ram`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                serialNumber: deviceId,
                userId: user._id,
                ramUsageMB,
                osPlatform: 'desktop-app'
              })
            });
          }
        } catch (error) {
          console.error("Failed to report app memory:", error);
        }
      };

      // Report immediately, then every 1 second (1000ms)
      reportMemory();
      const intervalId = setInterval(reportMemory, 1000);

      return () => clearInterval(intervalId);
    }
  }, []);

  // 2. Global WebSocket Listeners (e.g. for Admin remote toggles)
  useEffect(() => {
    if (!socket) return;

    const handleScreenshotToggle = (data) => {
      const { isActive, employeeId } = data;

      // Ensure this event is meant for the currently logged-in user
      const storedUserStr = localStorage.getItem("user");
      if (storedUserStr) {
        try {
          const parsedUser = JSON.parse(storedUserStr);
          if (parsedUser.employeeId === employeeId || parsedUser._id === employeeId || parsedUser.id === employeeId) {
            console.log("Received live screenshot toggle update for this active user:", isActive);

            if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
              window.electronAPI.setScreenshotActivity(isActive);
            }

            // Persist locally so next app reload knows immediately
            parsedUser.screenshotActivity = isActive;
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }
        } catch (e) {
          console.error("Failed to parse local user for screenshot update", e);
        }
      }
    };

    socket.on("screenshotActivityUpdate", handleScreenshotToggle);

    return () => {
      socket.off("screenshotActivityUpdate", handleScreenshotToggle);
    };
  }, [socket]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />

      {/* Admin Routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/task-assignment" element={<TaskAssignment />} />
      <Route path="/admin-tasks" element={<AdminTasksPage />} />
      <Route path="/employee/add" element={<EmployeeManagement />} />
      <Route path="/employee/edit-role" element={<EmployeeManagement />} />
      <Route path="/employee-logs" element={<EmployeeLogSystemPage />} />
      <Route path="/admin/auto-capture" element={<AutoCapturePage />} />
      <Route path="/admin/monitoring-report/employee" element={<EmployeeReportPage />} />
      <Route path="/admin/monitoring-report/project" element={<ProjectReportPage />} />
      <Route path="/admin/settings/employee-login-control" element={<EmployeeControlPage />} />
      <Route path="/admin/settings/employee-logs-tasks" element={<EmployeeLogsAndTaskControlPage />} />
      <Route path="/admin/settings/screenshot-control" element={<EmployeeScreenshotControlPage />} />

      {/* Employee Routes */}
      <Route path="/employee-log-time" element={<EmployeeLogTime />} />
      <Route path="/log-time" element={<LogTime />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="/employee-tasks" element={<EmployeeTaskPage />} />
      <Route path="/employee-task-assignment" element={<EmployeeTaskAssignment />} />
      <Route path="/assigned-tasks" element={<AssignedTasksPage />} /> {/* Added Route */}
      <Route path="/apply-leave" element={<ApplyLeave />} />

      {/* Common Routes */}
      <Route path="/credentials-vault" element={<CredentialsVault />} />
      <Route path="/admin/ram-usage" element={<RamUsage />} />
      <Route path="/admin/device-ram" element={<DeviceRamTable />} />

      {/* Chat Route (Accessible to all authenticated users) */}
      <Route path="/chat" element={<OfficeChat />} />
      <Route path="/chat/:channelId" element={<OfficeChat />} />
    </Routes>
  );
};

export default App;
