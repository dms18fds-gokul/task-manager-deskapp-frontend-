import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import EmployeeSidebar from "../components/EmployeeSidebar";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import StatusBadge from "../components/StatusBadge";
import { FaEllipsisV, FaCheck, FaTimes, FaEye, FaTasks, FaPlus, FaCalendarAlt, FaChevronDown, FaChevronUp, FaPaperPlane, FaRedo, FaHistory, FaExclamationCircle } from "react-icons/fa";
import DownloadDropdown from "../components/DownloadDropdown";
import TaskTimelineModal from "../components/TaskTimelineModal";

import { io } from "socket.io-client";

import { API_URL, getSocketUrl } from "../utils/config";

import QuickTaskForm from "../components/QuickTaskForm";


const EmployeeTaskPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Missing State Definitions
    const [employees, setEmployees] = useState([]); // Added employees state
    const [invitations, setInvitations] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [selectedTaskIdForResponse, setSelectedTaskIdForResponse] = useState(null);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false); // Task Acceptance Success Modal
    const [declineReason, setDeclineReason] = useState("");
    const [reworkConfirmationId, setReworkConfirmationId] = useState(null); // Task ID for rework confirmation
    const [isSubmitting, setIsSubmitting] = useState(false); // Prevention for multiple clicks

    const calculateTotalTime = (sessions) => {
        if (!sessions || sessions.length === 0) return "0m";
        let totalMs = 0;
        const now = new Date();

        sessions.forEach(session => {
            const start = new Date(session.startTime);
            const end = session.endTime ? new Date(session.endTime) : (session.status === "In Progress" ? now : null);

            if (end) {
                totalMs += (end - start);
            }
        });

        const totalMinutes = Math.floor(totalMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const performRework = async (taskId) => {
        try {
            await axios.put(`${API_URL}/tasks/${taskId}/rework`);
            setReworkConfirmationId(null);
            fetchMyTasks(user._id);
        } catch (error) {
            console.error("Error triggering rework:", error);
            alert("Failed to trigger rework");
        }
    };

    const handleRework = async () => {
        if (!reworkConfirmationId) return;

        // Auto-Hold Check
        const existingInProgress = myTasks.find(t => t.status === "In Progress" && t._id !== reworkConfirmationId);

        if (existingInProgress) {
            setConflictingTask(existingInProgress);
            setPendingAcceptTaskId(reworkConfirmationId);
            setPendingActionType("rework");
            setShowHoldConfirmation(true);
            setReworkConfirmationId(null); // Close rework modal to show hold modal
            return;
        }

        await performRework(reworkConfirmationId);
    };
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedTaskForTimeline, setSelectedTaskForTimeline] = useState(null);

    // Filter State
    const [filters, setFilters] = useState({
        project: "",
        priority: "",
        status: "",
        fromDate: "",
        toDate: ""
    });

    // Auto-Hold Logic State
    const [showHoldConfirmation, setShowHoldConfirmation] = useState(false);
    const [conflictingTask, setConflictingTask] = useState(null);
    const [pendingAcceptTaskId, setPendingAcceptTaskId] = useState(null); // Used for both "Accept" and "Status Change"
    const [pendingActionType, setPendingActionType] = useState(null); // 'respond' or 'status_change'

    // Derived State for Filters
    const uniqueProjects = [...new Set(myTasks.map(t => t.projectName))];

    const filteredTasks = myTasks.filter(task => {
        return (
            (filters.project === "" || task.projectName === filters.project) &&
            (filters.priority === "" || task.priority === filters.priority) &&
            (filters.status === "" || task.status === filters.status) &&
            (filters.fromDate === "" || new Date(task.startDate) >= new Date(filters.fromDate)) &&
            (filters.toDate === "" || new Date(task.startDate) <= new Date(filters.toDate))
        );
    });

    const getDateLabel = (dateString) => {
        if (!dateString) return "No Date";
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const formatDate = (d) => {
            return d.getDate().toString().padStart(2, '0') + '-' +
                (d.getMonth() + 1).toString().padStart(2, '0') + '-' +
                d.getFullYear();
        };

        if (formatDate(date) === formatDate(today)) return `Today (${formatDate(date)})`;
        if (formatDate(date) === formatDate(yesterday)) return `Yesterday (${formatDate(date)})`;
        return formatDate(date);
    };

    const sortedTasks = [...filteredTasks].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    const groupedTasks = sortedTasks.reduce((groups, task) => {
        const label = getDateLabel(task.startDate);
        if (!groups[label]) groups[label] = [];
        groups[label].push(task);
        return groups;
    }, {});

    // Fetch Employees for mapping IDs to names
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch(`${API_URL}/employee/all`);
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                }
            } catch (err) {
                console.error("Failed to fetch employees", err);
            }
        };
        fetchEmployees();
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate("/login");
        }
    }, [navigate]);
    // ...

    // Socket.io Real-time Listener
    useEffect(() => {
        if (!user) return;

        // Connect to base URL (remove /api if present)
        const socket = io(getSocketUrl());

        socket.on("newInvitation", (data) => {
            // console.log("New Invitation Received:", data);
            fetchInvitations(user._id); // Changed user.id to user._id to match common pattern if needed, or keep user.id if that works.
        });

        // Listen for task updates (Status changes, Timeline updates)
        socket.on("taskUpdated", (updatedTask) => {
            setMyTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));

            // Update selected task for details modal if it's open
            if (selectedTaskForDetails && selectedTaskForDetails._id === updatedTask._id) {
                setSelectedTaskForDetails(updatedTask);
            }

            // Update selected task for timeline modal if it's open
            if (selectedTaskForTimeline && selectedTaskForTimeline._id === updatedTask._id) {
                setSelectedTaskForTimeline(updatedTask);
            }
        });

        return () => {
            socket.off("newInvitation");
            socket.off("taskUpdated");
            socket.disconnect();
        };
    }, [user, selectedTaskForDetails, selectedTaskForTimeline]);

    const fetchInvitations = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/my-invitations?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();

                // Smart Notification Logic
                const currentIds = data.map(inv => inv._id);
                const lastSeenIds = JSON.parse(localStorage.getItem(`seenInvitations_${userId}`)) || [];

                // Find new invitations that represent ACTUAL new items, not just refresh
                const newIds = currentIds.filter(id => !lastSeenIds.includes(id));

                if (newIds.length > 0) {
                    // Play Sound
                    const audio = new Audio("/assets/notification.mp3");
                    // audio.play().catch(e => console.log("Audio play failed:", e)); // Catch interaction error
                }

                // Update Local Storage with ALL current IDs to mark them as seen
                localStorage.setItem(`seenInvitations_${userId}`, JSON.stringify(currentIds));

                setInvitations(data);
            }
        } catch (error) {
            console.error("Failed to fetch invitations", error);
        }
    };

    const fetchMyTasks = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/my-tasks?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setMyTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch my tasks", error);
        }
    };

    // Fetch data when user is set
    useEffect(() => {
        if (user) {
            fetchInvitations(user._id);
            fetchMyTasks(user._id);
        }
    }, [user]);

    const [showLogForm, setShowLogForm] = useState(false);
    const [logFormData, setLogFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        taskNo: "Auto",
        projectName: [],
        startTime: "",
        endTime: "",
        taskOwner: [],
        description: "",
        taskType: [],
        timeAutomation: "",
        status: "In Progress"
    });
    const [logLoading, setLogLoading] = useState(false);

    // Options for Log Form

    const [projects, setProjects] = useState([]);
    const [owners, setOwners] = useState([]);
    const [types, setTypes] = useState([]);

    // Load options when user loads
    useEffect(() => {
        if (user?._id) {
            fetchLogFilterOptions();
        }
    }, [user]);




    const fetchLogFilterOptions = async () => {
        try {
            const res = await fetch(`${API_URL}/work-logs/filters`);
            if (res.ok) {
                const data = await res.json();
                setProjects(prev => [...new Set([...prev, ...data.projects])].filter(Boolean).sort());
                setOwners(prev => [...new Set([...prev, ...data.owners])].filter(Boolean).sort());
                setTypes(prev => [...new Set([...prev, ...data.types])].filter(Boolean).sort());
            }
        } catch (error) {
            console.error("Error fetching filter options:", error);
        }
    };

    const calculateDurationStr = (start, end) => {
        if (!start || !end) return "";
        const [startHours, startMins] = start.split(':').map(Number);
        const [endHours, endMins] = end.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startHours, startMins, 0);
        const endDate = new Date(0, 0, 0, endHours, endMins, 0);
        let diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) diff += 24 * 60 * 60 * 1000;
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60 / 60 - hours) * 60);
        let durationString = "";
        if (hours > 0) durationString += `${hours} hr${hours > 1 ? 's' : ''} `;
        if (minutes > 0) durationString += `${minutes} min${minutes > 1 ? 's' : ''}`;
        return durationString.trim() || "0 min";
    };

    // Auto-calculate duration
    useEffect(() => {
        if (logFormData.startTime && logFormData.endTime) {
            const duration = calculateDurationStr(logFormData.startTime, logFormData.endTime);
            setLogFormData(prev => ({ ...prev, timeAutomation: duration }));
        }
    }, [logFormData.startTime, logFormData.endTime]);

    // Since we don't have `recentLogs` here, let's fetch daily logs count when form date changes.
    useEffect(() => {
        const fetchDayCount = async () => {
            if (!user || !logFormData.date) return;
            try {
                // We'll use the existing work-logs/employee endpoint but maybe we just need count?
                // Or just fetch them.
                const res = await fetch(`${API_URL}/work-logs/employee/${user._id}`);
                if (res.ok) {
                    const data = await res.json();
                    const logsForDate = data.filter(log => log.date === logFormData.date);
                    const nextTaskNum = logsForDate.length + 1;
                    setLogFormData(prev => ({ ...prev, taskNo: nextTaskNum.toString().padStart(2, '0') }));
                }
            } catch (e) {
                console.error("Error fetching day logs", e);
            }
        };
        if (showLogForm) fetchDayCount();
    }, [logFormData.date, showLogForm, user]);


    const handleLogFormChange = (e) => {
        const { name, value } = e.target;
        setLogFormData(prev => {
            const updates = { [name]: value };
            if (name === 'endTime' && value) {
                updates.status = 'Completed';
            }
            return { ...prev, ...updates };
        });
    };

    const handleLogDataChange = (name, value) => {
        setLogFormData({ ...logFormData, [name]: value });
    };

    const handleLogAddNew = (newValue, type) => {
        if (type === 'Project') {
            setProjects(prev => [...prev, newValue]);
            const current = Array.isArray(logFormData.projectName) ? logFormData.projectName : [];
            handleLogDataChange('projectName', [...current, newValue]);
        } else if (type === 'Owner') {
            setOwners(prev => [...prev, newValue]);
            const current = Array.isArray(logFormData.taskOwner) ? logFormData.taskOwner : [];
            handleLogDataChange('taskOwner', [...current, newValue]);
        } else if (type === 'Type') {
            setTypes(prev => [...prev, newValue]);
            const current = Array.isArray(logFormData.taskType) ? logFormData.taskType : [];
            handleLogDataChange('taskType', [...current, newValue]);
        }
    };

    const handleLogSubmit = async (e) => {
        e.preventDefault();
        if (logFormData.projectName.length === 0 || logFormData.taskOwner.length === 0 || logFormData.taskType.length === 0 || !logFormData.startTime || !logFormData.endTime || !logFormData.description) {
            alert("Please fill in all required fields.");
            return;
        }

        setLogLoading(true);
        const payload = {
            employeeId: user._id,
            date: logFormData.date,
            projectName: Array.isArray(logFormData.projectName) ? logFormData.projectName.join(", ") : logFormData.projectName,
            startTime: logFormData.startTime,
            endTime: logFormData.endTime,
            taskOwner: Array.isArray(logFormData.taskOwner) ? logFormData.taskOwner.join(", ") : logFormData.taskOwner,
            description: logFormData.description,
            taskType: Array.isArray(logFormData.taskType) ? logFormData.taskType.join(", ") : logFormData.taskType,
            timeAutomation: logFormData.timeAutomation,
            duration: logFormData.timeAutomation,
            status: logFormData.status,
            taskTitle: Array.isArray(logFormData.projectName) ? logFormData.projectName.join(", ") : logFormData.projectName
        };

        try {
            const res = await fetch(`${API_URL}/work-logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Log added successfully!");
                setLogFormData(prev => ({
                    ...prev,
                    projectName: [],
                    startTime: "",
                    endTime: "",
                    description: "",
                    timeAutomation: "",
                    taskOwner: [],
                    taskType: []
                }));
                setShowLogForm(false);
            } else {
                const data = await res.json();
                alert(data.message || "Failed to add log");
            }
        } catch (error) {
            console.error("Error adding log:", error);
            alert("Server error");
        } finally {
            setLogLoading(false);
        }
    };

    const handleRespond = async (status, reason = "", taskId = null) => {
        const targetTaskId = taskId || selectedTaskIdForResponse;
        if (!targetTaskId) return;

        if (isSubmitting) return; // Prevent multiple clicks
        setIsSubmitting(true); // Lock immediately

        // Auto-Hold Check for "Accepted" status
        if (status === "Accepted") {
            const inProgressTask = myTasks.find(t => t.status === "In Progress");
            if (inProgressTask) {
                setConflictingTask(inProgressTask);
                setPendingAcceptTaskId(targetTaskId);
                setPendingActionType("respond"); // Mark as response action
                setShowHoldConfirmation(true);
                setIsSubmitting(false); // Unlock since we are waiting for user confirmation
                return;
            }
        }

        await processResponse(targetTaskId, status, reason);
        setIsSubmitting(false);
    };

    const processResponse = async (taskId, status, reason = "") => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user._id, status, reason }),
            });

            if (res.ok) {
                fetchInvitations(user._id);
                fetchMyTasks(user._id);
                setShowDeclineModal(false);
                setDeclineReason("");
                setSelectedTaskIdForResponse(null);
                setOpenDropdownId(null);
                setPendingAcceptTaskId(null); // Clear pending
                setPendingAcceptTaskId(null); // Clear pending
                if (status === "Accepted") {
                    setShowSuccessModal(true);
                } else {
                    alert("Task Declined");
                }
            } else {
                const data = await res.json();
                alert(data.message || "Error responding to task");
            }
        } catch (error) {
            console.error("Error", error);
            alert("Server Error");
        }
    };

    const confirmSwitchToNewTask = async () => {
        if (!conflictingTask || !pendingAcceptTaskId) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 1. Put current task on Hold
            const resHold = await fetch(`${API_URL}/tasks/${conflictingTask._id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Hold" }),
            });

            if (resHold.ok) {
                // Update local state for the HELD task immediately
                setMyTasks(prevTasks =>
                    prevTasks.map(task =>
                        task._id === conflictingTask._id ? { ...task, status: "Hold" } : task
                    )
                );

                // 2. Perform the pending action (Accept OR Status Update)
                if (pendingActionType === "respond") {
                    await processResponse(pendingAcceptTaskId, "Accepted");
                } else if (pendingActionType === "status_change") {
                    await performStatusUpdate(pendingAcceptTaskId, "In Progress");
                } else if (pendingActionType === "rework") {
                    await performRework(pendingAcceptTaskId);
                }

                setShowHoldConfirmation(false);
                setConflictingTask(null);
                setPendingActionType(null);
            } else {
                alert("Failed to put current task on Hold. Operation cancelled.");
            }
        } catch (error) {
            console.error("Switch error:", error);
            alert("Error switching tasks");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Chat Topic Update
    const handleUpdateChatTopic = async (taskId, topic) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/chat-topic`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatTopic: topic }),
            });

            if (res.ok) {
                // Update local state
                setMyTasks(prev => prev.map(t => t._id === taskId ? { ...t, chatTopic: topic } : t));
                // Optional: Show success toast?
            } else {
                alert("Failed to update topic");
            }
        } catch (error) {
            console.error("Error updating topic:", error);
            alert("Error updating topic");
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        // Auto-Hold Check: If switching TO "In Progress"
        if (newStatus === "In Progress") {
            // Check if there is ALREADY an "In Progress" task (excluding the current one)
            const existingInProgress = myTasks.find(t => t.status === "In Progress" && t._id !== taskId);

            if (existingInProgress) {
                setConflictingTask(existingInProgress);
                setPendingAcceptTaskId(taskId); // The task we WANT to switch to "In Progress"
                setPendingActionType("status_change"); // Mark as manual status update
                setShowHoldConfirmation(true);
                return;
            }
        }

        // Direct update if no conflict
        await performStatusUpdate(taskId, newStatus);
    };

    const performStatusUpdate = async (taskId, newStatus) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    userId: user._id
                }),
            });

            if (res.ok) {
                const updatedTask = await res.json();

                // Update local state with full task data (including new sessions)
                setMyTasks(prevTasks =>
                    prevTasks.map(task =>
                        task._id === taskId ? updatedTask : task
                    )
                );

                // Update selected task for details modal if it's open
                if (selectedTaskForDetails && selectedTaskForDetails._id === taskId) {
                    setSelectedTaskForDetails(updatedTask);
                }

                // Update selected task for timeline modal if it's open
                if (selectedTaskForTimeline && selectedTaskForTimeline._id === taskId) {
                    setSelectedTaskForTimeline(updatedTask);
                }
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status");
        }
    };



    const toggleDropdown = (id) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
        setOpenTaskDropdownId(null);
    };

    const toggleTaskDropdown = (id) => {
        setOpenTaskDropdownId(openTaskDropdownId === id ? null : id);
        setOpenDropdownId(null);
    };

    // Columns for download
    const downloadColumns = [
        { header: "Project", accessor: "projectName" },
        { header: "Task", accessor: "taskTitle" },
        { header: "Priority", accessor: "priority" },
        { header: "Status", accessor: "status" },
        { header: "Start Date", accessor: "startDate" }
    ];

    const handleChatClick = async (taskId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/channels/task/${taskId}`, {
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                const channel = await res.json();
                navigate(`/chat/${channel._id}`);
            } else {
                alert("No channel found for this task yet.");
            }
        } catch (error) {
            console.error("Error navigating to chat:", error);
            alert("Error navigating to chat");
        }
    };



    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (user.taskActivity === false && user.role !== "Super Admin") {
        return (
            <div className="flex min-h-screen bg-gray-50 font-sans">
                <EmployeeSidebar className="hidden md:flex" />
                <div className="flex-1 flex flex-col justify-center items-center h-screen p-6 relative">
                    {/* Mobile Sidebar Overlay */}
                    {isSidebarOpen && (
                        <div className="fixed inset-0 z-40 md:hidden">
                            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                            <div className="absolute inset-y-0 left-0 z-50">
                                <EmployeeSidebar className="flex h-full shadow-xl" />
                            </div>
                        </div>
                    )}
                    {/* Header (Mobile toggle) */}
                    <header className="absolute top-0 left-0 right-0 bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                        <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                            </svg>
                        </button>
                    </header>

                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-rose-500 mt-16 md:mt-0">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaExclamationCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-6">
                            Task Activity has been disabled for your account by the Administrator. You no longer have access to this page or its data.
                        </p>
                        <button
                            onClick={() => navigate('/employee-dashboard')}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-2 rounded hover:bg-gray-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">

                    {/* Invitations Section */}
                    {invitations.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                New Invitations
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{invitations.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {invitations.map((invitation) => (
                                    <div key={invitation._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{invitation.projectName}</span>
                                                <h3 className="text-lg font-bold text-gray-800 mt-1">{invitation.taskTitle}</h3>
                                            </div>
                                            <div className="relative">
                                                <button onClick={() => toggleDropdown(invitation._id)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50">
                                                    <FaEllipsisV />
                                                </button>
                                                {openDropdownId === invitation._id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-20 py-1">
                                                        <button
                                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            onClick={() => { setSelectedTaskForDetails(invitation); setOpenDropdownId(null); }}
                                                        >
                                                            <FaEye className="mr-2 text-gray-400" /> View Details
                                                        </button>
                                                        <button
                                                            className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                                            onClick={() => { handleRespond("Accepted", "", invitation._id); }}
                                                            disabled={isSubmitting}
                                                        >
                                                            <FaCheck className="mr-2" /> {isSubmitting ? "Processing..." : "Accept"}
                                                        </button>
                                                        <button
                                                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => { setSelectedTaskIdForResponse(invitation._id); setShowDeclineModal(true); setOpenDropdownId(null); }}
                                                        >
                                                            <FaTimes className="mr-2" /> Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{invitation.description}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { handleRespond("Accepted", "", invitation._id); }}
                                                className={`flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? "Processing..." : "Accept"}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedTaskIdForResponse(invitation._id); setShowDeclineModal(true); }}
                                                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header & Filters */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                <span className="w-2 h-8 bg-emerald-500 rounded-full mr-3"></span>
                                My Tasks
                            </h2>
                            <div className="flex gap-2">
                                <DownloadDropdown
                                    data={filteredTasks}
                                    fileName="My_Tasks"
                                    columns={downloadColumns}
                                />
                                <button
                                    onClick={() => setShowLogForm(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
                                >
                                    <FaPlus /> Quick Task
                                </button>
                            </div>
                        </div>

                        {/* Filter Navbar */}
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4 border border-gray-100">
                            {/* From Date */}
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.fromDate}
                                        onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                        className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                    />
                                    <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                </div>
                            </div>

                            {/* To Date */}
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">To Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.toDate}
                                        onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                        className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                    />
                                    <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                </div>
                            </div>

                            {/* Project Filter */}
                            <div className="flex-1 min-w-[180px]">
                                <CustomDropdown
                                    label="Project"
                                    value={filters.project}
                                    onChange={(val) => setFilters({ ...filters, project: val })}
                                    options={[
                                        { value: "", label: "All Projects" },
                                        ...uniqueProjects.map(p => ({ value: p, label: p }))
                                    ]}
                                    placeholder="All Projects"
                                />
                            </div>

                            {/* Priority Filter */}
                            <div className="flex-1 min-w-[150px]">
                                <CustomDropdown
                                    label="Priority"
                                    value={filters.priority}
                                    onChange={(val) => setFilters({ ...filters, priority: val })}
                                    options={[
                                        { value: "", label: "All Priorities" },
                                        { value: "High", label: "High" },
                                        { value: "Medium", label: "Medium" },
                                        { value: "Low", label: "Low" }
                                    ]}
                                    placeholder="All Priorities"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex-1 min-w-[150px]">
                                <CustomDropdown
                                    label="Status"
                                    value={filters.status}
                                    onChange={(val) => setFilters({ ...filters, status: val })}
                                    options={[
                                        { value: "", label: "All Statuses" },
                                        { value: "In Progress", label: "In Progress" },
                                        { value: "Hold", label: "Hold" },
                                        { value: "Completed", label: "Completed" }
                                    ]}
                                    placeholder="All Statuses"
                                />
                            </div>

                            {/* Reset Filters */}
                            <div className="flex-none pb-[1px]">
                                <button
                                    onClick={() => setFilters({ project: "", priority: "", status: "", fromDate: "", toDate: "" })}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center transform hover:rotate-180 duration-500"
                                    title="Reset Filters"
                                >
                                    <FaRedo className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Task Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                <thead>
                                    <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Assigned By & To</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Project Name</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[20%]">Title Name</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Priority</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Status</th>
                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[8%] text-center">Chats</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedTasks.map((task, index) => (
                                        <tr key={task._id}
                                            onClick={() => setSelectedTaskForDetails(task)}
                                            className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                        >
                                            {/* S.No */}
                                            <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle font-medium">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>

                                            {/* Assigned By & To */}
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 w-6">By:</span>
                                                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={task.assignedBy?.name}>
                                                            {task.assignedBy?.name || "Super Admin"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 w-6">To:</span>
                                                        <div className="text-sm font-semibold text-indigo-900 truncate max-w-[150px]" title={(() => {
                                                            if (!task.assignedTo || task.assignedTo.length === 0) return "Unassigned";
                                                            return task.assignedTo.map(assigneeId => {
                                                                // Handle both populated objects and ID strings (just in case)
                                                                if (typeof assigneeId === 'object' && assigneeId.name) return assigneeId.name;
                                                                const emp = employees.find(e => e._id === assigneeId);
                                                                return emp ? emp.name : "Unknown";
                                                            }).join(", ");
                                                        })()}>
                                                            {(() => {
                                                                if (!task.assignedTo || task.assignedTo.length === 0) return <span className="text-gray-400 italic text-xs">Unassigned</span>;
                                                                return task.assignedTo.map(assigneeId => {
                                                                    if (typeof assigneeId === 'object' && assigneeId.name) return assigneeId.name;
                                                                    const emp = employees.find(e => e._id === assigneeId);
                                                                    return emp ? emp.name : "Unknown";
                                                                }).join(", ");
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Project Name */}
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800 truncate align-middle" title={task.projectName}>
                                                {task.projectName}
                                            </td>

                                            {/* Title Name */}
                                            <td className="px-6 py-4 text-sm font-medium text-gray-600 truncate align-middle" title={task.taskTitle}>
                                                {task.taskTitle}
                                            </td>

                                            {/* Priority */}
                                            <td className="px-6 py-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-sm border ${task.priority === "High" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                    task.priority === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    }`}>
                                                    {task.priority === "High" && <FaExclamationCircle className="mr-1.5 text-[10px]" />}
                                                    {task.priority || "Normal"}
                                                </span>
                                            </td>

                                            {/* Status - Interactive */}
                                            <td className="px-6 py-4 align-middle">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    {task.status === "Completed" ? (
                                                        <button
                                                            onClick={() => setReworkConfirmationId(task._id)}
                                                            className="flex items-center justify-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 w-full hover:bg-emerald-200 transition-colors shadow-sm border border-emerald-200"
                                                            title="Click to Rework"
                                                        >
                                                            <FaCheck className="text-emerald-500 size-3" /> Completed
                                                        </button>
                                                    ) : (
                                                        <StatusBadge
                                                            status={task.status}
                                                            onChange={(val) => handleStatusChange(task._id, val)}
                                                        />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Chats */}
                                            <td className="px-6 py-4 text-center align-middle">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleChatClick(task._id); }}
                                                    className="inline-flex items-center justify-center h-9 w-9 text-indigo-500 bg-white border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all shadow-sm hover:shadow active:scale-95 group-hover:border-indigo-200"
                                                    title="Open Chat"
                                                >
                                                    <FaPaperPlane size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* No tasks empty state */}
                        {sortedTasks.length === 0 && (
                            <div className="text-center py-16">
                                <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                    <FaTasks className="text-gray-300 text-2xl" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-1">No tasks found</h3>
                                <p className="text-gray-500 text-sm">No tasks match your selected filters.</p>
                            </div>
                        )}
                    </div>
                </main >
            </div >

            {/* Task Details Modal */}
            {
                selectedTaskForDetails && (
                    <TaskDetailsModal
                        task={selectedTaskForDetails}
                        onClose={() => setSelectedTaskForDetails(null)}
                    />
                )
            }

            {/* Sidebar Form Overlay */}
            <div className={`fixed inset-y-0 right-0 w-[410px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showLogForm ? 'translate-x-0' : 'translate-x-full'}`}>
                <QuickTaskForm
                    key={showLogForm ? 'open' : 'closed'}
                    user={user}
                    onClose={() => setShowLogForm(false)}
                    onSuccess={() => {
                        // Maybe fetch my tasks? But log affects work logs, not tasks directly unless it creates a task.
                        // The previous logic didn't refresh tasks on log submit either.
                        setShowLogForm(false);
                    }}
                />
            </div>

            {/* Decline Modal */}
            {
                showDeclineModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Decline Task</h3>
                            <p className="text-sm text-gray-600 mb-4">Please provide a reason for declining this task.</p>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none h-32"
                                placeholder="Reason for declining..."
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                            ></textarea>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => { setShowDeclineModal(false); setDeclineReason(""); }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRespond("Declined", declineReason)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Auto-Hold Confirmation Modal */}
            {
                showHoldConfirmation && conflictingTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-l-4 border-amber-500">
                            <div className="flex items-start mb-4">
                                <div className="bg-amber-100 p-2 rounded-full mr-3">
                                    <FaTasks className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Active Task Conflict</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        You are already working on <span className="font-bold text-indigo-600">"{conflictingTask.taskTitle}"</span>.
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                                Do you want to switch this task to <span className="font-bold text-amber-600">Hold</span> and start the new one?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowHoldConfirmation(false);
                                        setConflictingTask(null);
                                        setPendingAcceptTaskId(null);
                                        setPendingActionType(null);
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
                                >
                                    No, Keep Working
                                </button>
                                <button
                                    onClick={confirmSwitchToNewTask}
                                    disabled={isSubmitting}
                                    className={`px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? "Switching..." : "Yes, Switch Task"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rework Confirmation Modal */}
            {
                reworkConfirmationId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Rework Task?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to rework this project? This will start a new tracking session.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setReworkConfirmationId(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRework}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                >
                                    Yes, Rework
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Timeline Modal */}
            {
                showTimelineModal && selectedTaskForTimeline && (
                    <TaskTimelineModal
                        task={selectedTaskForTimeline}
                        onClose={() => { setShowTimelineModal(false); setSelectedTaskForTimeline(null); }}
                    />
                )
            }

            {/* Task Accepted Success Modal */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-all border border-gray-100">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 mb-6 shadow-md">
                                <FaCheck className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Task Accepted!</h3>
                            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                You have successfully accepted the task. It is now in your <span className="font-semibold text-emerald-600">Active Tasks</span> list.
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                            >
                                Let's Get Started
                            </button>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default EmployeeTaskPage;
