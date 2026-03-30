import Dashboard from "./pages/Dashboard";
import TaskAssignment from "./pages/TaskAssignment";
import Auth from "./pages/Auth";
import UserOnlyAuth from "./pages/UserOnlyAuth";
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
import GroupTaskAssignment from "./pages/GroupTaskAssignment";
// import AssignedTasksPage from "./pages/AssignedTasksPage"; // Removed console log import
import AutoCapturePage from "./pages/AutoCapturePage";
import EmployeeReportPage from "./pages/EmployeeReportPage";
import ProjectReportPage from "./pages/ProjectReportPage";
import EmployeeControlPage from "./pages/EmployeeControlPage"; // Added Settings page Route
import EmployeeActiveControlPage from "./pages/EmployeeActiveControlPage"; // Active Control page
import EmployeeLogsAndTaskControlPage from "./pages/EmployeeLogsAndTaskControlPage"; // New Logs/Task Control Page
import EmployeeScreenshotControlPage from "./pages/EmployeeScreenshotControlPage"; // Screenshot Control Page

import ChangePassword from "./pages/ChangePassword"; // Change Password Page
import DiscussionNotepad from "./pages/DiscussionNotepad"; // Discussion Notepad Page
import RecurringTasks from "./pages/RecurringTasks"; // Recurring Tasks Page
import RecurringTaskPopup from "./pages/RecurringTaskPopup";
import GuidePage from "./pages/GuidePage";
import ActivityTrackingPage from "./pages/ActivityTrackingPage";
import Settings from "./pages/Settings";
import NotificationsView from "./components/notifications/NotificationsView";
import ProtectedRoute from "./components/ProtectedRoute";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_URL } from "./utils/config";
import { useSocket } from "./context/SocketContext";
import { useUI } from "./context/UIContext";
import { useAuth } from "./context/AuthContext";
import FloatingActionButtons from "./components/FloatingActionButtons";
import QuickTaskForm from "./components/QuickTaskForm";
import IdleLock from "./components/IdleLock";
import "./App.css";

const App = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { isFormOpen, formMode, closeForm } = useUI();
  const { user } = useAuth();
  const [mtTab, setMtTab] = useState("Individual Task");


  // 2. Global WebSocket Listeners (e.g. for Admin remote toggles & Download Approvals)
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleScreenshotToggle = (data) => {
      const { isActive, employeeId } = data;
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          const userId = parsedUser._id || parsedUser.id;
          if (userId === employeeId) {
            if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
              window.electronAPI.setScreenshotActivity(isActive);
            }
            parsedUser.screenshotActivity = isActive;
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }
        } catch (e) {
        }
      }
    };

    const handleNewNotification = (notification) => {
      setActiveToast(notification);
      
      try {
        const audio = new Audio("/assets/notification.mp3");
        audio.play().catch(() => {});
      } catch (e) {}

      setTimeout(() => {
        setActiveToast(current => 
          (current && current._id === notification._id) ? null : current
        );
      }, 8000);
    };

    socket.on("screenshotActivityUpdate", handleScreenshotToggle);
    socket.on("new_notification", handleNewNotification);

    // --- IPC Navigation Listener ---
    if (window.electronAPI && window.electronAPI.onNavigate) {
      window.electronAPI.onNavigate((targetPath) => {
        navigate(targetPath);
      });
    }

    return () => {
      socket.off("screenshotActivityUpdate", handleScreenshotToggle);
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, navigate]);

  // 3. Global Synchronization for Offline Quick Tasks
  useEffect(() => {
    const syncOfflineTasks = async () => {
      if (!navigator.onLine) return;

      const offlineTasksStr = localStorage.getItem('offlineQuickTasks');
      if (!offlineTasksStr) return;

      let offlineTasks = [];
      try {
        offlineTasks = JSON.parse(offlineTasksStr);
      } catch (e) {
        return;
      }

      if (offlineTasks.length === 0) return;


      const remainingTasks = [];
      for (const task of offlineTasks) {
        try {
          const res = await fetch(`${API_URL}/work-logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task)
          });

          if (!res.ok) {
            remainingTasks.push(task); // Keep it to try again later
          } else {
          }
        } catch (error) {
          remainingTasks.push(task); // Keep it if network fails mid-sync
        }
      }

      // Update local storage with whatever is left (if any failed)
      if (remainingTasks.length > 0) {
        localStorage.setItem('offlineQuickTasks', JSON.stringify(remainingTasks));
      } else {
        localStorage.removeItem('offlineQuickTasks');
      }

      // Notify other components that sync has occurred
      window.dispatchEvent(new Event('offlineTaskSynced'));
    };

    // Attempt sync immediately on mount (if online)
    syncOfflineTasks();

    // Listen for connection restored event
    window.addEventListener('online', syncOfflineTasks);

    // --- Sync Offline Assignments ---
    const syncOfflineAssignments = async () => {
      if (!navigator.onLine) return;

      const offlineAssignmentsStr = localStorage.getItem('offlineAssignments');
      if (!offlineAssignmentsStr) return;

      let offlineAssignments = [];
      try {
        offlineAssignments = JSON.parse(offlineAssignmentsStr);
      } catch (e) {
        return;
      }

      if (offlineAssignments.length === 0) return;


      // Helper to convert Base64 back to Blob/File
      const base64ToFile = async (base64Data, filename, mimeType) => {
        const res = await fetch(base64Data);
        const blob = await res.blob();
        return new File([blob], filename, { type: mimeType });
      };

      const remainingAssignments = [];
      for (const assignment of offlineAssignments) {
        try {
          const payload = new FormData();

          // Append all normal fields
          Object.keys(assignment).forEach(key => {
            if (key === 'documentsData' || key === 'audioFileData') return; // Skip base64 data keys

            if (key === 'roles' || key === 'assignee' || key === 'department' || key === 'projectLead') {
              // explicit handling for assignee based on type?
              // If assignType is overall, assignee is empty.
              const val = (key === 'assignee' && assignment.assignType === 'Overall') ? [] : assignment[key];
              payload.append(key, JSON.stringify(val));
            } else if (assignment[key] !== null && assignment[key] !== undefined) {
              payload.append(key, assignment[key]);
            }
          });

          // Reconstruct and append files
          if (assignment.documentsData) {
            const file = await base64ToFile(assignment.documentsData.base64, assignment.documentsData.name, assignment.documentsData.type);
            payload.append('documents', file);
          }

          if (assignment.audioFileData) {
            const file = await base64ToFile(assignment.audioFileData.base64, assignment.audioFileData.name, assignment.audioFileData.type);
            payload.append('audioFile', file);
          }

          const res = await fetch(`${API_URL}/tasks`, {
            method: "POST",
            body: payload,
          });

          if (!res.ok) {
            remainingAssignments.push(assignment);
          } else {
          }
        } catch (error) {
          remainingAssignments.push(assignment);
        }
      }

      if (remainingAssignments.length > 0) {
        localStorage.setItem('offlineAssignments', JSON.stringify(remainingAssignments));
      } else {
        localStorage.removeItem('offlineAssignments');
      }

      window.dispatchEvent(new Event('offlineAssignmentSynced'));
    };

    syncOfflineAssignments();
    window.addEventListener('online', syncOfflineAssignments);

    return () => {
      window.removeEventListener('online', syncOfflineTasks);
      window.removeEventListener('online', syncOfflineAssignments);
    };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />

        {/* Admin Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assign-task" element={<TaskAssignment />} />
        <Route path="/assign-group-task" element={<GroupTaskAssignment />} />
        <Route path="/admin-tasks" element={<AdminTasksPage />} />
        <Route path="/employee/add" element={<EmployeeManagement />} />
        <Route path="/employee/edit-role" element={<EmployeeManagement />} />
        <Route path="/employee-logs" element={<EmployeeLogSystemPage />} />
        <Route path="/admin/auto-capture" element={<AutoCapturePage />} />
        <Route path="/admin/monitoring-report/employee" element={<EmployeeReportPage />} />
        <Route path="/admin/monitoring-report/project" element={<ProjectReportPage />} />
        <Route path="/admin/settings/employee-login-control" element={<EmployeeControlPage />} />
        <Route path="/admin/settings/active-control" element={<EmployeeActiveControlPage />} />
        <Route path="/admin/settings/employee-logs-tasks" element={<EmployeeLogsAndTaskControlPage />} />
        <Route path="/admin/settings/screenshot-control" element={<EmployeeScreenshotControlPage />} />

        <Route path="/admin/activity-tracking" element={<ActivityTrackingPage />} />

        {/* Employee Routes */}
        <Route path="/employee-log-time" element={<EmployeeLogTime />} />
        <Route path="/log-time" element={<LogTime />} />
        <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee-tasks" element={<EmployeeTaskPage />} />
        <Route path="/employee/assign-task" element={<TaskAssignment />} />
        <Route path="/employee/assign-group-task" element={<GroupTaskAssignment />} />

        <Route path="/assigned-tasks" element={<Navigate to="/employee-tasks" />} /> {/* Redirected to consolidated page */}
        <Route path="/apply-leave" element={<ApplyLeave />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/recurring-tasks" element={<RecurringTasks />} />
        <Route path="/employee/document-approvals" element={<NotificationsView />} />

        {/* Common Routes */}
        <Route path="/credentials-vault" element={<CredentialsVault />} />
        <Route path="/discussion-notepad" element={<DiscussionNotepad />} />
        <Route path="/settings" element={<Settings />} />

        {/* Chat Route (Accessible to all authenticated users) */}
        <Route path="/chat" element={<OfficeChat />} />
        <Route path="/chat/:channelId" element={<OfficeChat />} />
        <Route path="/guide" element={<GuidePage />} />
      </Routes>
      <FloatingActionButtons />
      <IdleLock />

      {/* Global Form Popup Overlay */}
      <div className={`fixed bottom-6 right-4 md:right-28 w-[calc(100%-2rem)] md:w-full ${formMode === 'MT' ? (mtTab === 'Group Task' ? 'md:max-w-[600px]' : 'md:max-w-[450px]') : formMode === 'RT' ? 'md:max-w-[500px]' : 'md:max-w-[460px]'} h-[85vh] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] z-50 rounded-2xl border border-gray-100 overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFormOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'}`}>
        {isFormOpen && (
          <div className="h-full flex flex-col">
            {formMode === 'MT' ? (
              <TaskAssignment
                isModal={true}
                onClose={closeForm}
                onTabChange={setMtTab}
                onSuccess={() => {
                  closeForm();
                  window.dispatchEvent(new Event('refreshLogs'));
                  window.dispatchEvent(new Event('refreshTasks'));
                }}
              />
            ) : formMode === 'RT' ? (
              <RecurringTaskPopup onClose={closeForm} />
            ) : (
              <QuickTaskForm
                key={formMode}
                user={user}
                onClose={closeForm}
                onSuccess={() => {
                  closeForm();
                  window.dispatchEvent(new Event('refreshLogs'));
                }}
                initialIsMeeting={formMode === 'Meeting'}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default App;
