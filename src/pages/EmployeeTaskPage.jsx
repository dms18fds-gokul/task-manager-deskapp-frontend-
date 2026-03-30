import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import EmployeeSidebar from "../components/EmployeeSidebar";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { FaSearch, FaEllipsisV, FaCheck, FaTimes, FaEye, FaTasks, FaPlus, FaCalendarAlt, FaChevronDown, FaChevronUp, FaPaperPlane, FaRedo, FaHistory, FaExclamationCircle, FaExternalLinkAlt, FaMicrophone } from "react-icons/fa";
import TaskTimelineModal from "../components/TaskTimelineModal";

import { io } from "socket.io-client";

import { API_URL, getSocketUrl } from "../utils/config";
import QuickTaskForm from "../components/QuickTaskForm";
import TableLoader from "../components/TableLoader";
import RecurringTasks from "./RecurringTasks";


const EmployeeTaskPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Missing State Definitions
    const [employees, setEmployees] = useState([]); // Added employees state
    const [invitations, setInvitations] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [assignedByMeTasks, setAssignedByMeTasks] = useState([]); // Added
    const [viewMode, setViewMode] = useState("my-tasks"); // 'my-tasks', 'assigned-by-me', or 'recurring-tasks'
    const [confirmNavigation, setConfirmNavigation] = useState(null);
    const [selectedTaskIdForResponse, setSelectedTaskIdForResponse] = useState(null);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false); // Task Acceptance Success Modal
    const [declineReason, setDeclineReason] = useState("");
    const [reworkConfirmationId, setReworkConfirmationId] = useState(null); // Task ID for rework confirmation
    const [isSubmitting, setIsSubmitting] = useState(false); // Prevention for multiple clicks
    const [isTableLoading, setIsTableLoading] = useState(true);
    const todayStr = new Date().toISOString().split('T')[0];

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
            await axios.put(`${API_URL}/tasks/${taskId}/rework`, { userId: user._id });
            setReworkConfirmationId(null);
            fetchMyTasks(user._id);
        } catch (error) {
            console.error("Rework error:", error);
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

    const [assignedByMeFilters, setAssignedByMeFilters] = useState({
        project: "",
        assignedTo: "",
        priority: "",
        status: "",
        fromDate: "",
        toDate: ""
    });

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchWrapperRef = useRef(null);

    const [appliedFilters, setAppliedFilters] = useState({
        project: "",
        priority: "",
        status: "",
        fromDate: "",
        toDate: ""
    });

    const [assignedByMeAppliedFilters, setAssignedByMeAppliedFilters] = useState({
        project: "",
        assignedTo: "",
        priority: "",
        status: "",
        fromDate: "",
        toDate: ""
    });

    const handleFetchData = () => {
        setIsTableLoading(true);
        if (viewMode === "my-tasks") {
            setAppliedFilters({ ...filters });
        } else {
            setAssignedByMeAppliedFilters({ ...assignedByMeFilters });
        }
        setTimeout(() => setIsTableLoading(false), 800);
    };

    const handleResetFilters = () => {
        setIsTableLoading(true);
        const resetState = {
            project: "",
            priority: "",
            status: "",
            fromDate: "",
            toDate: ""
        };
        if (viewMode === "my-tasks") {
            setFilters(resetState);
            setAppliedFilters(resetState);
        } else {
            setAssignedByMeFilters({ ...resetState, assignedTo: "" });
            setAssignedByMeAppliedFilters({ ...resetState, assignedTo: "" });
            setEmployeeSearch("");
        }
        setTimeout(() => setIsTableLoading(false), 800);
    };

    // Auto-Hold Logic State
    const [showHoldConfirmation, setShowHoldConfirmation] = useState(false);
    const [conflictingTask, setConflictingTask] = useState(null);
    const [pendingAcceptTaskId, setPendingAcceptTaskId] = useState(null); // Used for both "Accept" and "Status Change"
    const [pendingActionType, setPendingActionType] = useState(null); // 'respond' or 'status_change'

    // Derived State for Filters
    const uniqueProjects = [...new Set([...myTasks, ...assignedByMeTasks].map(t => t.projectName).filter(Boolean))];

    const filteredTasks = myTasks.filter(task => {
        const matchesProject = appliedFilters.project === "" || task.projectName === appliedFilters.project;
        const matchesPriority = appliedFilters.priority === "" || task.priority === appliedFilters.priority;
        const matchesStatus = appliedFilters.status === "" || task.status === appliedFilters.status;

        const taskDateStr = task.startDate?.includes('T') ? task.startDate.split('T')[0] : (task.startDate || "");
        const isToday = taskDateStr === todayStr;

        // Date Range Analysis (String comparison is safer for YYYY-MM-DD)
        const matchesFrom = appliedFilters.fromDate === "" || taskDateStr >= appliedFilters.fromDate;
        const matchesTo = appliedFilters.toDate === "" || taskDateStr <= appliedFilters.toDate;
        const hasDateFilter = appliedFilters.fromDate !== "" || appliedFilters.toDate !== "";

        // Requirement Analysis: By default, for "Yesterday and older dates", hide Completed tasks.
        // We show them ONLY IF it's Today, OR if the user has explicitly applied a Date/Status/Project/Priority filter.
        const isCompleted = task.status === "Completed";
        const userExplicitlyFilteredStatus = appliedFilters.status !== "";
        const userExplicitlyFilteredProject = appliedFilters.project !== "";
        const userExplicitlyFilteredPriority = appliedFilters.priority !== "";

        const hasExplicitFilter = hasDateFilter || userExplicitlyFilteredStatus || userExplicitlyFilteredProject || userExplicitlyFilteredPriority;

        const shouldHideOlderCompletedByDefault = !isToday && isCompleted && !hasExplicitFilter;

        if (shouldHideOlderCompletedByDefault) {
            return false;
        }

        // Apply general filters
        return matchesProject && matchesPriority && matchesStatus && matchesFrom && matchesTo;
    });

    const getDateLabel = (dateStr) => {
        if (!dateStr) return "No Date";
        const getLocalDateString = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const today = getLocalDateString(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = getLocalDateString(yesterdayDate);

        const taskDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

        if (taskDateStr === today) return "TODAY";
        if (taskDateStr === yesterday) return "YESTERDAY";

        if (taskDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = taskDateStr.split('-');
            return `${d}-${m}-${y}`;
        }
        return taskDateStr;
    };

    const priorityOrder = {
        "Very High": 1,
        "High": 2,
        "Medium": 3,
        "Low": 4,
        "Very Low": 5
    };

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        // Primary sort: Date (Descending)
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        if (dateB - dateA !== 0) return dateB - dateA;

        // Secondary sort: Priority
        const pA = priorityOrder[a.priority] || 3;
        const pB = priorityOrder[b.priority] || 3;
        return pA - pB;
    });

    const groupedTasks = sortedTasks.reduce((groups, task) => {
        const label = getDateLabel(task.startDate);
        if (!groups[label]) groups[label] = [];
        groups[label].push(task);
        return groups;
    }, {});

    // Expand Group Tasks for Assigned by Me
    const processedAssignedByMe = useMemo(() => {
        let expanded = [];
        assignedByMeTasks.forEach(task => {
            if (task.taskType === "Group Task" && task.individualizedTasks && Object.keys(task.individualizedTasks).length > 0) {
                Object.entries(task.individualizedTasks).forEach(([memberId, details]) => {
                    expanded.push({
                        ...task,
                        _id: `${task._id}-${memberId}`,
                        originalTaskId: task._id,
                        displayMemberId: memberId,
                        displayDetails: details,
                        isExpandedGroupTask: true
                    });
                });
            } else {
                expanded.push(task);
            }
        });
        return expanded;
    }, [assignedByMeTasks]);

    // Assigned By Me Filtered Tasks
    const filteredAssignedByMeTasks = processedAssignedByMe.filter(task => {
        const matchesProject = assignedByMeAppliedFilters.project === "" || task.projectName === assignedByMeAppliedFilters.project;
        const matchesPriority = assignedByMeAppliedFilters.priority === "" || task.priority === assignedByMeAppliedFilters.priority;
        const matchesStatus = assignedByMeAppliedFilters.status === "" || task.status === assignedByMeAppliedFilters.status;

        // Use displayMemberId if it's an expanded row, otherwise check the array/single ID
        const matchesAssignedTo = assignedByMeAppliedFilters.assignedTo === "" ||
            (task.isExpandedGroupTask
                ? task.displayMemberId === assignedByMeAppliedFilters.assignedTo
                : (Array.isArray(task.assignedTo)
                    ? task.assignedTo.includes(assignedByMeAppliedFilters.assignedTo)
                    : task.assignedTo === assignedByMeAppliedFilters.assignedTo));

        const taskDateStr = task.startDate?.includes('T') ? task.startDate.split('T')[0] : (task.startDate || "");
        const isToday = taskDateStr === todayStr;

        const matchesFrom = assignedByMeAppliedFilters.fromDate === "" || taskDateStr >= assignedByMeAppliedFilters.fromDate;
        const matchesTo = assignedByMeAppliedFilters.toDate === "" || taskDateStr <= assignedByMeAppliedFilters.toDate;
        const hasDateFilter = assignedByMeAppliedFilters.fromDate !== "" || assignedByMeAppliedFilters.toDate !== "";

        const isActiveOrPending = ["Pending", "Hold", "In Progress"].includes(task.status);
        const userExplicitlyFilteredStatus = assignedByMeAppliedFilters.status !== "";
        const userExplicitlyFilteredProject = assignedByMeAppliedFilters.project !== "";
        const userExplicitlyFilteredPriority = assignedByMeAppliedFilters.priority !== "";
        const userExplicitlyFilteredAssignedTo = assignedByMeAppliedFilters.assignedTo !== "";

        const hasExplicitFilter = hasDateFilter || userExplicitlyFilteredStatus || userExplicitlyFilteredProject || userExplicitlyFilteredPriority || userExplicitlyFilteredAssignedTo;

        const shouldShowByDefault = isToday || isActiveOrPending;

        if (!shouldShowByDefault && !hasExplicitFilter) {
            return false;
        }

        return matchesProject && matchesPriority && matchesStatus && matchesAssignedTo && matchesFrom && matchesTo;
    });

    const sortedAssignedByMeTasks = [...filteredAssignedByMeTasks].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    const groupedAssignedByMeTasks = sortedAssignedByMeTasks.reduce((groups, task) => {
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
            fetchInvitations(user._id); // Changed user.id to user._id to match common pattern if needed, or keep user.id if that works.
        });

        socket.on("taskAccepted", (data) => {
            // If someone accepts a task that might be in my invitations, re-fetch
            fetchInvitations(user._id);
        });

        // Listen for task updates (Status changes, Timeline updates)
        socket.on("taskUpdated", (updatedTask) => {
            setMyTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setAssignedByMeTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));

            // Also update invitations if it's there
            setInvitations(prev => prev.map(inv => inv._id === updatedTask._id ? updatedTask : inv));

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
                }

                // Update Local Storage with ALL current IDs to mark them as seen
                localStorage.setItem(`seenInvitations_${userId}`, JSON.stringify(currentIds));

                setInvitations(data);
            }
        } catch (error) {
        }
    };

    const fetchMyTasks = async (userId) => {
        let serverData = [];
        let fetchSuccess = false;
        try {
            const res = await fetch(`${API_URL}/tasks/my-tasks?userId=${userId}`);
            if (res.ok) {
                serverData = await res.json();
                fetchSuccess = true;
            }
        } catch (error) {
        }

        // Merge with offline pending tasks from localStorage
        const offlineTasksStr = localStorage.getItem('offlineQuickTasks');
        let pendingLogs = [];
        if (offlineTasksStr) {
            try {
                const parsedTasks = JSON.parse(offlineTasksStr);
                pendingLogs = parsedTasks
                    .filter(t => t.employeeId === userId)
                    .map((t, i) => ({
                        ...t,
                        _id: `pending-${Date.now()}-${i}`,
                        isPendingOffline: true,
                        logType: "Offline Task Pending"
                    }));
            } catch (e) {
            }
        }

        // Merge with offline pending assignments from localStorage
        const offlineAssignmentsStr = localStorage.getItem('offlineAssignments');
        let pendingAssignments = [];
        if (offlineAssignmentsStr) {
            try {
                const parsedAssignments = JSON.parse(offlineAssignmentsStr);
                pendingAssignments = parsedAssignments
                    .filter(a => Array.isArray(a.assignee) && a.assignee.includes(userId)) // Only show if assigned to this user
                    .map((a, i) => ({
                        ...a,
                        _id: `pending-assign-${Date.now()}-${i}`,
                        isPendingOffline: true,
                        logType: "Offline Task Pending",
                        status: "Pending"
                    }));
            } catch (e) {
            }
        }

        if (fetchSuccess) {
            const combinedData = [...pendingLogs, ...pendingAssignments, ...serverData];
            setMyTasks(combinedData);
        } else {
            setMyTasks(prev => {
                const prevServerData = prev.filter(t => !t.isPendingOffline);
                const combinedData = [...pendingLogs, ...pendingAssignments, ...prevServerData];
                return combinedData;
            });
        }
        setIsTableLoading(false);
    };

    const fetchAssignedByMeTasks = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/assigned-by/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setAssignedByMeTasks(data);
            }
        } catch (error) {
        }
    };

    // Fetch data when user is set
    useEffect(() => {
        if (user) {
            fetchInvitations(user._id);
            fetchMyTasks(user._id);
            fetchAssignedByMeTasks(user._id);
        }
    }, [user]);

    // Listener for auto-refresh when offline tasks are synced or added
    useEffect(() => {
        const handleOfflineUpdate = () => {
            if (user && user._id) {
                fetchMyTasks(user._id);
            }
        };

        window.addEventListener('offlineTaskSynced', handleOfflineUpdate);
        window.addEventListener('offlineTaskAdded', handleOfflineUpdate);
        window.addEventListener('offlineAssignmentSynced', handleOfflineUpdate);
        window.addEventListener('offlineAssignmentAdded', handleOfflineUpdate);

        return () => {
            window.removeEventListener('offlineTaskSynced', handleOfflineUpdate);
            window.removeEventListener('offlineTaskAdded', handleOfflineUpdate);
            window.removeEventListener('offlineAssignmentSynced', handleOfflineUpdate);
            window.removeEventListener('offlineAssignmentAdded', handleOfflineUpdate);
        };
    }, [user]);

    const [showLogForm, setShowLogForm] = useState(false);
    const [logFormMode, setLogFormMode] = useState("Quick"); // "Quick" or "Meeting"
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
            timeAutomation: logFormData.duration || logFormData.timeAutomation,
            duration: logFormData.duration || logFormData.timeAutomation,
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
            try {
                const res = await fetch(`${API_URL}/tasks/check/active?userId=${user._id}`);
                const data = await res.json();

                if (data.hasActiveTask) {
                    setConflictingTask(data.task);
                    setPendingAcceptTaskId(targetTaskId);
                    setPendingActionType("respond"); // Mark as response action
                    setShowHoldConfirmation(true);
                    setIsSubmitting(false); // Unlock since we are waiting for user confirmation
                    return;
                }
            } catch (error) {
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
            alert("Server Error");
        }
    };

    const confirmSwitchToNewTask = async () => {
        if (!conflictingTask || !pendingAcceptTaskId) return;
        const now = new Date();
        const timeData = {
            clientTime: now.toISOString(),
            localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            localDateStr: now.toLocaleDateString('en-CA')
        };

        setIsSubmitting(true);
        try {
            // 1. Put current task on Hold
            let resHold;
            if (conflictingTask.type === "Main Task") {
                resHold = await fetch(`${API_URL}/tasks/${conflictingTask._id}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "Hold",
                        userId: user._id,
                        ...timeData
                    }),
                });
            } else {
                // Quick Task / Meeting
                resHold = await fetch(`${API_URL}/work-logs/${conflictingTask._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "Hold",
                        ...timeData
                    }),
                });
            }

            if (resHold.ok) {
                // Update local state if it's a main task
                if (conflictingTask.type === "Main Task") {
                    setMyTasks(prevTasks =>
                        prevTasks.map(task =>
                            task._id === conflictingTask._id ? { ...task, status: "Hold" } : task
                        )
                    );
                }

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
            alert("Error updating topic");
        }
    };

    const handleStatusChange = async (taskId, newStatus, overriddenUserId = null) => {
        // Find the task for checking logic
        const allTasks = [...myTasks, ...assignedByMeTasks];
        const task = allTasks.find(t => t._id === taskId || t.originalTaskId === taskId);

        // Auto-Hold Check: If switching TO "In Progress"
        if (newStatus === "In Progress") {
            try {
                const res = await fetch(`${API_URL}/tasks/check/active?userId=${overriddenUserId || user._id}`);
                const data = await res.json();

                if (data.hasActiveTask && data.task._id !== taskId && data.task._id !== task?.originalTaskId) {
                    setConflictingTask(data.task);
                    setPendingAcceptTaskId(taskId); // The task we WANT to switch to "In Progress"
                    setPendingActionType("status_change"); // Mark as manual status update
                    setShowHoldConfirmation(true);
                    return;
                }
            } catch (error) {
            }
        }

        // Direct update if no conflict
        await performStatusUpdate(taskId, newStatus, overriddenUserId);
    };

    const performStatusUpdate = async (taskId, newStatus, overriddenUserId = null) => {
        const now = new Date();
        const timeData = {
            clientTime: now.toISOString(),
            localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            localDateStr: now.toLocaleDateString('en-CA')
        };

        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    userId: overriddenUserId || user._id,
                    ...timeData
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
                setAssignedByMeTasks(prevTasks =>
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
            alert("Error updating status");
        }
    };



    const handlePriorityChange = async (taskId, newPriority) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/tasks/${taskId}/priority`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ priority: newPriority }),
            });

            if (res.ok) {
                // Update local state is handled by socket, but we can do it optimistically
                setMyTasks(prev => prev.map(t => t._id === taskId ? { ...t, priority: newPriority } : t));
                setAssignedByMeTasks(prev => prev.map(t => t._id === taskId ? { ...t, priority: newPriority } : t));
            } else {
                const data = await res.json();
                alert(data.message || "Failed to update priority");
            }
        } catch (error) {
            alert("Error updating priority");
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
            alert("Error navigating to chat");
        }
    };



    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <TableLoader />
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Initializing Portal...</p>
        </div>
    );

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
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Task Manager</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
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
                                    <div key={invitation._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 relative hover:shadow-md transition-all flex flex-col h-[220px]">
                                        {/* Top Section (Fixed) */}
                                        <div className="flex justify-between items-start mb-2 shrink-0">
                                            <div className="min-w-0 flex-1 pr-3">
                                                <span className="text-lg font-bold text-indigo-600 uppercase tracking-widest block truncate">{invitation.projectName}</span>
                                                <h3 className="text-lg font-bold text-gray-800 mt-1 leading-tight truncate">{invitation.taskTitle}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 -mr-1 shrink-0">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border ${invitation.priority === "Very High" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                        invitation.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                            invitation.priority === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                invitation.priority === "Low" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                    "bg-gray-50 text-gray-500 border-gray-100"
                                                    }`}>
                                                    {invitation.priority || "Medium"}
                                                </span>
                                                <button
                                                    onClick={() => setSelectedTaskForDetails(invitation)}
                                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                                    title="View Task Details"
                                                >
                                                    <FaEllipsisV size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Middle content (Scrollable) */}
                                        <div className="flex-1 overflow-y-auto mb-2 pr-1 custom-scrollbar">
                                            {invitation.individualizedTasks && Object.keys(invitation.individualizedTasks).length > 0 ? (
                                                <div className="space-y-4">
                                                    {Object.entries(invitation.individualizedTasks).map(([mId, details]) => {
                                                        const memberName = employees.find(e => e._id === mId || e.id === mId)?.name || mId;
                                                        return (
                                                            <div key={mId} className="bg-gray-50 rounded-xl p-3 border border-gray-100 shadow-sm">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1.5">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${details.status === 'Accepted' || details.status === 'In Progress' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                                                        {memberName}
                                                                        {details.status === 'Accepted' || details.status === 'In Progress' ?
                                                                            <span className="text-[8px] text-emerald-600 ml-1">(Accepted)</span> :
                                                                            details.status === 'Declined' ?
                                                                                <span className="text-[8px] text-rose-500 ml-1">(Declined)</span> :
                                                                                null
                                                                        }
                                                                    </span>
                                                                    {details.deadline && (
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase">
                                                                            {getDateLabel(details.deadline)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm font-bold text-gray-800 leading-tight truncate">{details.title}</p>
                                                                {details.description && <p className="text-xs text-gray-500 mt-1 line-clamp-3 break-words">{details.description}</p>}
                                                                <div className="flex gap-2 mt-2">
                                                                    {details.documentPath && (
                                                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                            <FaPaperPlane size={8} /> Attachment
                                                                        </span>
                                                                    )}
                                                                    {details.audioPath && (
                                                                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                            <FaMicrophone size={8} /> Audio
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic leading-relaxed">
                                                    {invitation.description || "No specific details provided for this assignment."}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom Section (Fixed) */}
                                        <div className="flex gap-3 mt-auto pt-2 border-t border-gray-50 shrink-0">
                                            <button
                                                onClick={() => handleRespond("Accepted", "", invitation._id)}
                                                className={`px-4 bg-indigo-600 text-white py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? "..." : <><FaCheck className="text-xs" /> Accept My Task</>}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedTaskIdForResponse(invitation._id); setShowDeclineModal(true); }}
                                                className="px-4 bg-white border border-gray-200 text-gray-500 py-1.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                                            >
                                                <FaTimes className="text-xs" /> Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header & Filters */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center uppercase">
                            <span className={`w-2 h-8 ${viewMode === 'my-tasks' ? 'bg-emerald-500' : viewMode === 'recurring-tasks' ? 'bg-rose-500' : 'bg-indigo-500'} rounded-full mr-3`}></span>
                            {viewMode === 'my-tasks' ? 'My Tasks' : viewMode === 'recurring-tasks' ? 'Recurring Tasks' : 'Tasks Assigned by Me'}
                        </h2>
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
                            <button
                                onClick={() => setViewMode("my-tasks")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "my-tasks" ? "bg-white text-emerald-600 shadow-md transform scale-110" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"}`}
                            >
                                My Tasks
                            </button>
                            <button
                                onClick={() => setViewMode("recurring-tasks")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "recurring-tasks" ? "bg-white text-rose-600 shadow-md transform scale-110" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"}`}
                            >
                                Recurring Tasks
                            </button>
                            <button
                                onClick={() => setViewMode("assigned-by-me")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "assigned-by-me" ? "bg-white text-indigo-600 shadow-md transform scale-110" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"}`}
                            >
                                Assigned by Me
                            </button>
                        </div>
                    </div>

                    {/* Filter Navbar */}
                    {viewMode !== 'recurring-tasks' && (
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                {/* From Date */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={viewMode === 'my-tasks' ? filters.fromDate : assignedByMeFilters.fromDate}
                                            max={viewMode === 'my-tasks' ? filters.toDate : assignedByMeFilters.toDate}
                                            onChange={(e) => {
                                                if (viewMode === 'my-tasks') setFilters({ ...filters, fromDate: e.target.value });
                                                else setAssignedByMeFilters({ ...assignedByMeFilters, fromDate: e.target.value });
                                            }}
                                            className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                        />
                                        <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                    </div>
                                </div>

                                {/* To Date */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">To Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={viewMode === 'my-tasks' ? filters.toDate : assignedByMeFilters.toDate}
                                            min={viewMode === 'my-tasks' ? filters.fromDate : assignedByMeFilters.fromDate}
                                            onChange={(e) => {
                                                if (viewMode === 'my-tasks') setFilters({ ...filters, toDate: e.target.value });
                                                else setAssignedByMeFilters({ ...assignedByMeFilters, toDate: e.target.value });
                                            }}
                                            className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                        />
                                        <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                    </div>
                                </div>

                                {/* Project Filter */}
                                <div>
                                    <CustomDropdown
                                        label="Project"
                                        value={viewMode === 'my-tasks' ? filters.project : assignedByMeFilters.project}
                                        onChange={(val) => {
                                            if (viewMode === 'my-tasks') setFilters({ ...filters, project: val });
                                            else setAssignedByMeFilters({ ...assignedByMeFilters, project: val });
                                        }}
                                        options={[
                                            { value: "", label: "All Projects" },
                                            ...uniqueProjects.map(p => ({ value: p, label: p }))
                                        ]}
                                        placeholder="All Projects"
                                    />
                                </div>

                                {/* Custom Filter based on viewMode */}
                                {viewMode === 'my-tasks' ? (
                                    /* Priority Filter for My Tasks */
                                    <div>
                                        <CustomDropdown
                                            label="Priority"
                                            value={filters.priority}
                                            onChange={(val) => setFilters({ ...filters, priority: val })}
                                            options={[
                                                { value: "", label: "All Priorities" },
                                                { value: "Very High", label: "Very High" },
                                                { value: "High", label: "High" },
                                                { value: "Medium", label: "Medium" },
                                                { value: "Low", label: "Low" },
                                                { value: "Very Low", label: "Very Low" }
                                            ]}
                                            placeholder="All Priorities"
                                        />
                                    </div>
                                ) : (
                                    /* Employee Filter for Assigned by Me */
                                    <div className="relative" ref={searchWrapperRef}>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Employee Profile</label>
                                        <div className="relative flex items-center w-full">
                                            <FaSearch className="absolute left-3 text-gray-400 text-xs" />
                                            <input
                                                type="text"
                                                className="w-full h-[38px] px-3 py-2 pl-8 pr-4 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium placeholder:text-gray-400"
                                                placeholder="Search Employee..."
                                                value={employeeSearch}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEmployeeSearch(val);
                                                    if (val === "") {
                                                        setAssignedByMeFilters({ ...assignedByMeFilters, assignedTo: "" });
                                                    }
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                            />
                                        </div>

                                        {isDropdownOpen && (
                                            <div className="absolute top-[60px] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
                                                {employees.filter(e => {
                                                    const query = employeeSearch.toLowerCase().trim();
                                                    if (!query) return true;
                                                    return e.name?.toLowerCase().includes(query) || e.employeeId?.toLowerCase().includes(query);
                                                }).map((emp, i) => (
                                                    <div
                                                        key={emp._id || i}
                                                        onClick={() => {
                                                            setEmployeeSearch(emp.name);
                                                            setAssignedByMeFilters({ ...assignedByMeFilters, assignedTo: emp._id });
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className="p-3 px-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                                    >
                                                        <span className="font-bold text-gray-800 text-[11px] uppercase whitespace-nowrap">{emp.name}</span>
                                                        <span className="text-gray-500 text-[10px] font-mono tracking-wider ml-auto">{emp.employeeId}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Status Filter */}
                                <div>
                                    <CustomDropdown
                                        label="Status"
                                        value={viewMode === 'my-tasks' ? filters.status : assignedByMeFilters.status}
                                        onChange={(val) => {
                                            if (viewMode === 'my-tasks') setFilters({ ...filters, status: val });
                                            else setAssignedByMeFilters({ ...assignedByMeFilters, status: val });
                                        }}
                                        options={[
                                            { value: "", label: "All Statuses" },
                                            { value: "In Progress", label: "In Progress" },
                                            { value: "Hold", label: "Hold" },
                                            { value: "Completed", label: "Completed" }
                                        ]}
                                        placeholder="All Statuses"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                {/* Reset Filters */}
                                <button
                                    onClick={handleResetFilters}
                                    className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                                    title="Reset Filters"
                                >
                                    <FaRedo className="text-sm" />
                                </button>

                                {/* Fetch Data */}
                                <button
                                    onClick={handleFetchData}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <FaSearch className="text-sm" /> Fetch Data
                                </button>
                            </div>
                        </div>
                    )}

                    {isTableLoading ? (
                        <div className="py-20 text-center">
                            <TableLoader />
                            <p className="text-gray-500 text-sm mt-4 animate-pulse">Loading your tasks...</p>
                        </div>
                    ) : viewMode === "recurring-tasks" ? (
                        <RecurringTasks isEmbedded={true} />
                    ) : (
                        <>
                            {/* Task Tables Grouped by Date */}
                            {Object.keys(viewMode === 'my-tasks' ? groupedTasks : groupedAssignedByMeTasks).map((dateLabel) => {
                                const tasksInGroup = viewMode === 'my-tasks' ? groupedTasks[dateLabel] : groupedAssignedByMeTasks[dateLabel];
                                return (
                                    <div key={dateLabel} className="mb-8">
                                        <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            {dateLabel} <span className="text-xs font-medium text-gray-400 normal-case">({tasksInGroup.length} tasks)</span>
                                        </h3>
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                            <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">T.No</th>
                                                            {!(viewMode === 'assigned-by-me' && assignedByMeAppliedFilters.assignedTo) && (
                                                                <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">
                                                                    {viewMode === 'my-tasks' ? 'Assigned By' : 'Assigned To'}
                                                                </th>
                                                            )}
                                                            {!(viewMode === 'my-tasks' ? appliedFilters.project : assignedByMeAppliedFilters.project) && (
                                                                <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">
                                                                    Project Name
                                                                </th>
                                                            )}
                                                            <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[22%]">Description</th>
                                                            <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Priority</th>
                                                            <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                                            <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">Chats</th>
                                                            {viewMode === 'assigned-by-me' && <th className="px-4 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">Edit</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {tasksInGroup.map((task, index) => (
                                                            <tr key={task._id}
                                                                onClick={() => setSelectedTaskForDetails(task)}
                                                                className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                                            >
                                                                {/* S.No */}
                                                                <td className="px-4 py-4 align-middle">
                                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                                        <span className="text-gray-400 font-mono text-xs font-medium">
                                                                            {(index + 1).toString().padStart(2, '0')}
                                                                        </span>
                                                                        <div
                                                                            className={`w-2 h-2 rounded-sm ${task.logType === 'Offline Task' || task.isPendingOffline ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                            title={task.logType === 'Offline Task' || task.isPendingOffline ? 'Offline Task' : 'Online Task'}
                                                                        ></div>
                                                                    </div>
                                                                </td>

                                                                {/* Assigned By (My Tasks) or Assigned To (Assigned by Me) */}
                                                                {!(viewMode === 'assigned-by-me' && assignedByMeAppliedFilters.assignedTo) && (
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            {viewMode === 'my-tasks' ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={task.assignedBy?.name}>
                                                                                        {task.assignedBy?.name || "Super Admin"}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[150px]" title={(() => {
                                                                                        if (task.isExpandedGroupTask) {
                                                                                            const emp = employees.find(e => e._id === task.displayMemberId || e.id === task.displayMemberId);
                                                                                            return emp ? emp.name : task.displayMemberId;
                                                                                        }
                                                                                        let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
                                                                                        if (!targets || targets.length === 0) {
                                                                                            return task.assignType === "Overall" ? "Overall (All)" : "Unassigned";
                                                                                        }
                                                                                        return targets.map(assigneeId => {
                                                                                            if (typeof assigneeId === 'object' && assigneeId.name) return assigneeId.name;
                                                                                            const emp = employees.find(e => e._id === assigneeId);
                                                                                            return emp ? emp.name : assigneeId;
                                                                                        }).join(", ");
                                                                                    })()}>
                                                                                        {(() => {
                                                                                            if (task.isExpandedGroupTask) {
                                                                                                const emp = employees.find(e => e._id === task.displayMemberId || e.id === task.displayMemberId);
                                                                                                return emp ? emp.name : task.displayMemberId;
                                                                                            }
                                                                                            let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
                                                                                            if (!targets || targets.length === 0) {
                                                                                                return <span className="text-gray-400 italic text-xs">{task.assignType === "Overall" ? "Overall (All)" : "Unassigned"}</span>;
                                                                                            }
                                                                                            return targets.map(assigneeId => {
                                                                                                if (typeof assigneeId === 'object' && assigneeId.name) return assigneeId.name;
                                                                                                const emp = employees.find(e => e._id === assigneeId);
                                                                                                return emp ? emp.name : assigneeId;
                                                                                            }).join(", ");
                                                                                        })()}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )}

                                                                {/* Project Name */}
                                                                {!(viewMode === 'my-tasks' ? appliedFilters.project : assignedByMeAppliedFilters.project) && (
                                                                    <td className="px-4 py-4 text-sm font-bold text-gray-800 truncate align-middle" title={task.projectName}>
                                                                        {task.projectName}
                                                                    </td>
                                                                )}

                                                                {/* Description / Individualized Details */}
                                                                <td className="px-4 py-4 align-middle">
                                                                    <div className="flex flex-col gap-1">
                                                                        {(() => {
                                                                            // Show specific individualized details for expanded group rows
                                                                            if (task.isExpandedGroupTask) {
                                                                                const displayDesc = task.displayDetails?.description || task.description || "—";
                                                                                return (
                                                                                    <span className="text-sm font-medium text-gray-600 line-clamp-2 whitespace-normal break-words max-w-full" title={displayDesc}>
                                                                                        {displayDesc}
                                                                                    </span>
                                                                                );
                                                                            }

                                                                            const userId = user?._id;
                                                                            const iTask = task.individualizedTasks && userId ? task.individualizedTasks[userId] : null;

                                                                            const displayDesc = iTask ? iTask.description : (task.description || task.taskTitle);

                                                                            return (
                                                                                <span className="text-sm font-medium text-gray-600 line-clamp-2 whitespace-normal break-words max-w-full" title={displayDesc}>
                                                                                    {displayDesc || "—"}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </td>

                                                                {/* Priority */}
                                                                <td className="px-4 py-4 align-middle text-[11px]">
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        <PriorityBadge
                                                                            priority={task.priority}
                                                                            task={task}
                                                                            user={user}
                                                                            onChange={(newP) => handlePriorityChange(task.originalTaskId || task._id, newP)}
                                                                        />
                                                                    </div>
                                                                </td>

                                                                {/* Status - Interactive */}
                                                                <td className="px-4 py-4 align-middle">
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        {task.isExpandedGroupTask ? (
                                                                            <div className="w-full">
                                                                                <StatusBadge
                                                                                    status={task.displayDetails?.status === "Accepted" ? "In Progress" : (task.displayDetails?.status || "Pending")}
                                                                                    onChange={(val) => handleStatusChange(task.originalTaskId || task._id, val, task.displayMemberId)}
                                                                                    readOnly={viewMode === 'assigned-by-me'}
                                                                                />
                                                                            </div>
                                                                        ) : (task.status === "Completed" || (viewMode === 'my-tasks' && task.individualizedTasks?.[user?._id]?.status === "Completed")) ? (
                                                                            <div
                                                                                className={`flex items-center justify-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 w-full transition-colors shadow-sm ring-1 ring-emerald-700/10 ${viewMode !== 'assigned-by-me' ? 'hover:bg-emerald-100 cursor-pointer' : 'cursor-default'}`}
                                                                                onClick={viewMode !== 'assigned-by-me' ? () => setReworkConfirmationId(task._id) : undefined}
                                                                                title={viewMode !== 'assigned-by-me' ? "Click to Rework" : ""}
                                                                            >
                                                                                <FaCheck className="text-emerald-500 size-3" /> Completed
                                                                            </div>
                                                                        ) : (
                                                                            <StatusBadge
                                                                                status={(() => {
                                                                                    if (viewMode === 'my-tasks' && task.individualizedTasks && user?._id && task.individualizedTasks[user._id]?.status) {
                                                                                        const s = task.individualizedTasks[user._id].status;
                                                                                        return s === "Accepted" ? "In Progress" : s;
                                                                                    }
                                                                                    return task.status;
                                                                                })()}
                                                                                onChange={(val) => handleStatusChange(task.originalTaskId || task._id, val)}
                                                                                readOnly={viewMode === 'assigned-by-me'}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Chats */}
                                                                <td className="px-4 py-4 text-center align-middle">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleChatClick(task._id); }}
                                                                        className="inline-flex items-center justify-center h-9 w-9 text-indigo-500 bg-white border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all shadow-sm hover:shadow active:scale-95 group-hover:border-indigo-200"
                                                                        title="Open Chat"
                                                                    >
                                                                        <FaPaperPlane size={14} />
                                                                    </button>
                                                                </td>

                                                                {/* Action */}
                                                                {viewMode === 'assigned-by-me' && (
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setConfirmNavigation(task); }}
                                                                            className="inline-flex items-center justify-center h-9 w-9 text-blue-500 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all shadow-sm hover:shadow active:scale-95 group-hover:border-blue-200"
                                                                            title="Navigate to Task Page"
                                                                        >
                                                                            <FaExternalLinkAlt size={14} />
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* No tasks empty state */}
                            {Object.keys(viewMode === 'my-tasks' ? groupedTasks : groupedAssignedByMeTasks).length === 0 && (
                                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                        <FaTasks className="text-gray-300 text-2xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">No tasks found</h3>
                                    <p className="text-gray-500 text-sm">No tasks match your selected filters.</p>
                                </div>
                            )}
                        </>
                    )}
                </main >
            </div >

            {/* Confirmation Modal */}
            {confirmNavigation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white rounded-[20px] shadow-2xl p-8 w-full max-w-[400px] transform transition-all scale-100 opacity-100 flex flex-col items-center text-center">

                        {confirmNavigation.status === "Pending" ? (
                            <>
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 mb-5 shadow-inner border border-blue-100/50">
                                    <FaExternalLinkAlt className="text-blue-600 text-2xl" />
                                </div>
                                <h3 className="text-[22px] font-bold text-slate-800 mb-2 tracking-tight">Edit Task ?</h3>
                                <p className="text-[15px] text-slate-500 mb-8 leading-relaxed px-2">
                                    Do you want to navigate to the page to edit this <span className="font-semibold text-slate-700">{confirmNavigation.taskType || "task"}</span>?
                                </p>

                                <div className="flex justify-center gap-4 w-full">
                                    <button
                                        onClick={() => setConfirmNavigation(null)}
                                        className="px-6 py-3 text-[15px] font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all duration-200 flex-1 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const type = confirmNavigation.taskType || "Individual Task";
                                            if (type.toLowerCase().includes("group")) {
                                                navigate(`/assign-group-task`, { state: { taskToEdit: confirmNavigation } });
                                            } else {
                                                navigate(`/assign-task`, { state: { taskToEdit: confirmNavigation } });
                                            }
                                            setConfirmNavigation(null);
                                        }}
                                        className="px-6 py-3 text-[15px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex-1 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Yes, Edit
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-50 mb-5 shadow-inner border border-rose-100/50">
                                    <FaExclamationCircle className="text-rose-500 text-2xl" />
                                </div>
                                <h3 className="text-[22px] font-extrabold text-slate-800 mb-2 tracking-tight">Editing Restricted</h3>

                                <div className="w-full bg-amber-50/80 rounded-xl p-4 border border-amber-200/60 mb-8 mt-2 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                    <p className="text-[14px] text-amber-800 font-medium leading-relaxed">
                                        You are already working on this task, so it cannot be updated at this time.
                                    </p>
                                </div>

                                <div className="flex justify-center w-full">
                                    <button
                                        onClick={() => setConfirmNavigation(null)}
                                        className="px-6 py-3 text-[15px] font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-all duration-200 shadow-md hover:shadow-lg w-full transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Task Details Modal */}
            {
                selectedTaskForDetails && (
                    <TaskDetailsModal
                        task={selectedTaskForDetails}
                        onClose={() => setSelectedTaskForDetails(null)}
                        onStatusChange={handleStatusChange}
                    />
                )
            }

            {/* Popup Form Overlay - Fixed height to enable internal scrolling */}
            <div className={`fixed bottom-6 right-6 w-full max-w-[500px] h-[85vh] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] z-50 rounded-2xl border border-gray-100 overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showLogForm ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="h-full flex flex-col">
                    <QuickTaskForm
                        key={showLogForm ? `open-${logFormMode}` : 'closed'}
                        user={user}
                        initialIsMeeting={logFormMode === "Meeting"}
                        onClose={() => setShowLogForm(false)}
                        onSuccess={() => {
                            setShowLogForm(false);
                            handleFetchData(); // Refresh table data on success
                        }}
                    />
                </div>
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
                    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-[360px] mx-4 border-l-4 border-amber-500">
                            <div className="flex items-start mb-4">
                                <div className="bg-amber-100 p-2 rounded-full mr-3 text-amber-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Active Task Conflict</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        You are already working on a <span className="font-bold text-indigo-600">
                                            {conflictingTask.type === 'Main Task' ? 'Main Task' : conflictingTask.logType === 'Meeting' ? 'Meeting' : 'Quick Task'}
                                        </span>.
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                                Do you want to put it on <span className="font-bold text-amber-600">Hold</span>?
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
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSwitchToNewTask}
                                    disabled={isSubmitting}
                                    className={`px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
