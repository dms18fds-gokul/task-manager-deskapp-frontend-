import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import TableLoader from "../components/TableLoader";
import { FaUsers, FaProjectDiagram, FaTasks, FaClipboardList, FaCheckCircle, FaEllipsisV, FaEye, FaUserTag, FaEnvelope, FaIdCard, FaUser, FaCalendarAlt, FaExclamationCircle, FaTimes, FaCheck, FaHistory, FaRedo, FaSearch, FaPaperPlane, FaUserCheck } from "react-icons/fa";
import { MdPendingActions, MdCheckCircle, MdCancel, MdDateRange } from "react-icons/md";
import io from "socket.io-client";
import { API_URL, getSocketUrl } from "../utils/config";

const formatDuration = (ms) => {
    if (!ms || ms <= 0) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds} s`;
};

const formatHHMMSS = (totalSeconds) => {
    if (!totalSeconds) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');
};

const addTimes = (time1, time2) => {
    const parse = (t) => {
        if (!t || t === "-" || t === "00:00:00") return 0;
        const [h, m, s] = t.split(':').map(Number);
        return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    };
    return formatHHMMSS(parse(time1) + parse(time2));
};

const calculateDayHours = (login, logout) => {
    if (!login || !logout) return "-";
    return formatDuration(new Date(logout) - new Date(login));
};

const calculateWorkingHours = (login, logout, lunchStart, lunchEnd) => {
    if (!login || !logout) return "-";
    let total = new Date(logout) - new Date(login);
    if (lunchStart && lunchEnd) {
        total -= (new Date(lunchEnd) - new Date(lunchStart));
    }
    return formatDuration(total);
};

const calculateInactiveHours = (activeTimeStr, idleTimeStr) => {
    const parseTimeToHours = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m, s] = timeStr.split(':').map(Number);
        return h + (m / 60) + (s / 3600);
    };

    const activeH = parseTimeToHours(activeTimeStr);
    const idleH = parseTimeToHours(idleTimeStr);

    const inactiveH = 24 - (activeH + idleH);
    if (inactiveH <= 0 || isNaN(inactiveH)) return "00:00:00";

    const hrs = Math.floor(inactiveH);
    const mins = Math.floor((inactiveH - hrs) * 60);
    const secs = Math.floor(Math.round((inactiveH - hrs - mins / 60) * 3600));

    return [
        hrs.toString().padStart(2, '0'),
        mins.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
    ].join(':');
};

const LiveDuration = ({ loginTime, logoutTime }) => {
    const [duration, setDuration] = useState("00:00:00");

    useEffect(() => {
        if (!loginTime) {
            setDuration("00:00:00");
            return;
        }

        const updateDate = () => {
            const start = new Date(loginTime).getTime();
            const end = logoutTime ? new Date(logoutTime).getTime() : new Date().getTime();
            const diff = Math.floor((end - start) / 1000);
            setDuration(formatHHMMSS(diff > 0 ? diff : 0));
        };

        updateDate();

        if (logoutTime) return;

        const interval = setInterval(updateDate, 1000);
        return () => clearInterval(interval);
    }, [loginTime, logoutTime]);

    return <span>{duration}</span>;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    // viewMode: 'none', 'total', 'present', 'absent', 'total_projects', 'total_tasks', 'pending_tasks', 'active_tasks'
    const [viewMode, setViewMode] = useState('none');
    const [isTableLoading, setIsTableLoading] = useState(false);

    const handleViewChange = (newMode) => {
        if (newMode === viewMode) {
            setViewMode('none');
            return;
        }

        // Reset search filter when explicitly clicking "Total Employees" card
        if (newMode === 'total') {
            setEmployeeSearch("");
            setAppliedEmployeeSearch("");
        }

        setIsTableLoading(true);
        setViewMode(newMode);
        setTimeout(() => setIsTableLoading(false), 800);
    };

    const [stats, setStats] = useState({
        totalProjects: 0,
        totalTasks: 0,
        pendingTasks: 0,
        activeTasks: 0
    });
    const [allTasks, setAllTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);

    // Task Filter State
    const todayDate = new Date().toLocaleDateString('en-CA');

    const [taskFilters, setTaskFilters] = useState({
        projectName: "",
        assignedTo: "",
        fromDate: "",
        toDate: "",
        status: ""
    });
    const [appliedTaskFilters, setAppliedTaskFilters] = useState({
        projectName: "",
        assignedTo: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [appliedEmployeeSearch, setAppliedEmployeeSearch] = useState("");
    const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
    const searchWrapperRef = useRef(null);

    const [taskEmployeeSearch, setTaskEmployeeSearch] = useState("");
    const [isTaskEmployeeDropdownOpen, setIsTaskEmployeeDropdownOpen] = useState(false);
    const taskSearchWrapperRef = useRef(null);

    const [attendanceEmployeeSearch, setAttendanceEmployeeSearch] = useState("");
    const [isAttendanceEmployeeDropdownOpen, setIsAttendanceEmployeeDropdownOpen] = useState(false);
    const attendanceSearchWrapperRef = useRef(null);

    const [leaveEmployeeSearch, setLeaveEmployeeSearch] = useState("");
    const [isLeaveEmployeeDropdownOpen, setIsLeaveEmployeeDropdownOpen] = useState(false);
    const leaveSearchWrapperRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setIsEmployeeDropdownOpen(false);
            }
            if (taskSearchWrapperRef.current && !taskSearchWrapperRef.current.contains(event.target)) {
                setIsTaskEmployeeDropdownOpen(false);
            }
            if (attendanceSearchWrapperRef.current && !attendanceSearchWrapperRef.current.contains(event.target)) {
                setIsAttendanceEmployeeDropdownOpen(false);
            }
            if (leaveSearchWrapperRef.current && !leaveSearchWrapperRef.current.contains(event.target)) {
                setIsLeaveEmployeeDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [filteredEmployees, setFilteredEmployees] = useState([]);

    // Leave Management State
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [attendanceHistory, setAttendanceHistory] = useState([]); // New State for History

    const [attendanceFilters, setAttendanceFilters] = useState({
        fromDate: "",
        toDate: "",
        employee: "",
        status: ""
    });
    const [appliedAttendanceFilters, setAppliedAttendanceFilters] = useState({
        fromDate: "",
        toDate: "",
        employee: "",
        status: ""
    });

    const workingHoursSummary = React.useMemo(() => {
        const todayRecords = attendanceHistory.filter(r => r.date === todayDate && r.status === "Present" && r.employeeId);
        let totalSeconds = 0;

        const parseToSeconds = (t) => {
            if (!t || t === "-" || t === "00:00:00") return 0;
            const parts = t.split(':').map(Number);
            if (parts.length !== 3) return 0;
            const [h, m, s] = parts;
            return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
        };

        todayRecords.forEach(r => {
            totalSeconds += parseToSeconds(r.formattedActiveTime);
            totalSeconds += parseToSeconds(r.meetingHours);
        });

        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);

        return {
            display: `${hrs}.${mins.toString().padStart(2, '0')} hr / ${todayRecords.length}`,
            count: todayRecords.length
        };
    }, [attendanceHistory, todayDate]);

    const [leaveHistoryFilters, setLeaveHistoryFilters] = useState({
        employee: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const [appliedLeaveHistoryFilters, setAppliedLeaveHistoryFilters] = useState({
        employee: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    // Filter Logic for Leave History
    const filteredLeaves = leaves.filter(leave => {
        let matchDate = true;

        if (appliedLeaveHistoryFilters.fromDate) {
            const d = leave.appliedOn ? new Date(leave.appliedOn) : new Date();
            const leaveDate = d.toISOString().split('T')[0];
            matchDate = matchDate && leaveDate >= appliedLeaveHistoryFilters.fromDate;
        }
        if (appliedLeaveHistoryFilters.toDate) {
            const d = leave.appliedOn ? new Date(leave.appliedOn) : new Date();
            const leaveDate = d.toISOString().split('T')[0];
            matchDate = matchDate && leaveDate <= appliedLeaveHistoryFilters.toDate;
        }

        const query = appliedLeaveHistoryFilters.employee?.toLowerCase().trim();
        const matchEmployee = !query ||
            leave.employeeId?.name.toLowerCase().includes(query) ||
            leave.employeeId?.employeeId.toLowerCase().includes(query) ||
            (Array.isArray(leave.employeeId?.role) ? leave.employeeId?.role.some(r => r.toLowerCase().includes(query)) : leave.employeeId?.role?.toLowerCase().includes(query));

        const matchStatus = !appliedLeaveHistoryFilters.status || leave.status === appliedLeaveHistoryFilters.status;

        return matchDate && matchEmployee && matchStatus;
    });

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedLeaveToReject, setSelectedLeaveToReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);

    // Employee Filtering Logic
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

    useEffect(() => {
        let result = employees;
        const searchVal = appliedEmployeeSearch;

        if (searchVal && searchVal.trim() !== "") {
            const query = searchVal.trim().toLowerCase();

            result = result.filter(e => {
                return (
                    e.name?.toLowerCase().includes(query) ||
                    e.employeeId?.toLowerCase().includes(query) ||
                    (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query))
                );
            });
        }

        setFilteredEmployees(result);
    }, [employees, appliedEmployeeSearch]);

    // Task Filtering Logic
    useEffect(() => {
        let result = allTasks;

        // 1. Filter based on View Mode first
        if (viewMode === 'pending_tasks') {
            result = result.filter(t => t.status === 'Pending');
        } else if (viewMode === 'active_tasks') {
            result = result.filter(t => t.status === 'In Progress');
        }
        // 'total_projects' and 'total_tasks' show everything initially

        // 2. Apply Manual Filters
        const filterFromDate = appliedTaskFilters.fromDate || todayDate;
        const filterToDate = appliedTaskFilters.toDate || todayDate;

        result = result.filter(t => {
            const taskDate = t.startDate?.includes('T') ? t.startDate.split('T')[0] : t.startDate;
            return taskDate >= filterFromDate && taskDate <= filterToDate;
        });

        if (appliedTaskFilters.projectName) {
            result = result.filter(t => t.projectName === appliedTaskFilters.projectName);
        }
        if (appliedTaskFilters.assignedTo) {
            result = result.filter(t => {
                if (Array.isArray(t.assignedTo)) return t.assignedTo.includes(appliedTaskFilters.assignedTo);
                return t.assignedTo === appliedTaskFilters.assignedTo;
            });
        }
        if (appliedTaskFilters.status) {
            result = result.filter(t => t.status === appliedTaskFilters.status);
        }

        setFilteredTasks(result);
    }, [allTasks, appliedTaskFilters, viewMode]);

    useEffect(() => {
        const defaultTaskFilters = {
            projectName: "",
            assignedTo: "",
            fromDate: "",
            toDate: "",
            status: ""
        };
        setTaskFilters(defaultTaskFilters);
        setAppliedTaskFilters(defaultTaskFilters);
    }, [viewMode]);

    // Leave Actions
    const handleLeaveAction = async (id, status, reason = null) => {
        try {
            const res = await fetch(`${API_URL}/leave/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, rejectionReason: reason })
            });

            if (res.ok) {
                // Refresh local state to reflect change instantly
                const updatedLeaves = leaves.map(l =>
                    l._id === id ? { ...l, status, rejectionReason: reason } : l
                );
                setLeaves(updatedLeaves);
                setPendingLeaves(updatedLeaves.filter(l => l.status === "Pending"));

                // Close modal if open
                setIsRejectModalOpen(false);
                setRejectionReason("");
                setSelectedLeaveToReject(null);
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating leave:", error);
            alert("Error updating leave");
        }
    };

    const openRejectModal = (leave) => {
        setSelectedLeaveToReject(leave);
        setIsRejectModalOpen(true);
    };

    // Unique Values for Task Dropdowns
    const uniqueProjects = [...new Set(allTasks.map(t => t.projectName).filter(Boolean))];
    const uniqueTaskStatuses = ["In Progress", "Completed", "Hold", "Pending"];

    // Date grouping logic for tasks
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

    const getUniqueEmployeeCount = (tasks) => {
        const uniqueEmps = new Set();
        tasks.forEach(task => {
            let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : (task.assignee || []);
            if (Array.isArray(targets)) {
                targets.forEach(item => {
                    const id = typeof item === 'object' && item !== null ? (item._id || item.id) : item;
                    if (id) uniqueEmps.add(id);
                });
            } else if (targets) {
                const id = typeof targets === 'object' ? (targets._id || targets.id) : targets;
                if (id) uniqueEmps.add(id);
            }
        });
        return uniqueEmps.size;
    };

    const sortedTasks = [...filteredTasks].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    const groupedTasks = sortedTasks.reduce((groups, task) => {
        const label = getDateLabel(task.startDate);
        if (!groups[label]) groups[label] = [];
        groups[label].push(task);
        return groups;
    }, {});

    // Unique Roles (Department) for Dropdown
    const uniqueRoles = [...new Set(employees.flatMap(e => Array.isArray(e.role) ? e.role : (e.role ? [e.role] : [])).map(s => s.trim()))];
    // Unique Designations (Role in UI)
    const uniqueDesignations = [...new Set(employees.flatMap(e => Array.isArray(e.designation) ? e.designation : (e.designation ? [e.designation] : [])).map(s => s.trim()))];
    // Unique Work Types
    const uniqueWorkTypes = [...new Set(employees.flatMap(e => Array.isArray(e.workType) ? e.workType : (e.workType ? [e.workType] : [])).map(s => s.trim()))];
    // Unique Employee IDs
    const uniqueEmployeeIds = [...new Set(employees.map(e => e.employeeId).filter(Boolean))];
    // Unique Full Names
    const uniqueNames = [...new Set(employees.map(e => e.name).filter(Boolean))];
    // Unique Emails
    const uniqueEmails = [...new Set(employees.map(e => e.email).filter(Boolean))];

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch(`${API_URL}/attendance/all`);
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                }
            } catch (error) {
                console.error("Error fetching employees:", error);
            }
        };

        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_URL}/tasks/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        const fetchAllTasks = async () => {
            try {
                const res = await fetch(`${API_URL}/tasks/all`);
                if (res.ok) {
                    const data = await res.json();
                    setAllTasks(data);
                }
            } catch (error) {
                console.error("Error fetching all tasks:", error);
            }
        };

        const fetchLeaves = async () => {
            try {
                const res = await fetch(`${API_URL}/leave/all`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaves(data);
                    setPendingLeaves(data.filter(l => l.status === "Pending"));
                }
            } catch (error) {
            }
        };

        const fetchAttendanceHistory = async () => {
            try {
                const res = await fetch(`${API_URL}/attendance/history`);
                if (res.ok) {
                    const data = await res.json();
                    setAttendanceHistory(data);
                }
            } catch (error) {
                console.error("Error fetching attendance history:", error);
            }
        };

        fetchEmployees();
        fetchStats();
        fetchAllTasks();
        fetchLeaves();
        fetchAttendanceHistory();

        // Socket.IO Connection
        const socket = io(getSocketUrl());

        socket.on("connect", () => {
            // console.log("Connected to socket server");
        });

        socket.on("attendanceUpdate", (data) => {
            const { employeeId, attendance } = data;
            setEmployees((prevEmployees) => {
                return prevEmployees.map((emp) => {
                    if (emp._id === employeeId) {
                        return {
                            ...emp,
                            status: attendance.status,
                            loginTime: attendance.loginTime,
                            logoutTime: attendance.logoutTime
                        };
                    }
                    return emp;
                });
            });
        });

        // Listen for system session updates (Real-time active/idle time)
        socket.on("sessionUpdate", (data) => {
            const { userId, activeTime, idleTime, formattedActiveTime, formattedIdleTime } = data;
            setEmployees((prevEmployees) => {
                return prevEmployees.map((emp) => {
                    if (emp._id === userId) {
                        return {
                            ...emp,
                            activeTime,
                            idleTime,
                            formattedActiveTime,
                            formattedIdleTime
                        };
                    }
                    return emp;
                });
            });
        });

        // Listen for new leave applications
        socket.on("newLeave", (newLeave) => {
            setLeaves((prev) => [newLeave, ...prev]);
            if (newLeave.status === "Pending") {
                setPendingLeaves((prev) => [newLeave, ...prev]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            navigate("/login");
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    // Filter Logic for Attendance History
    const filteredHistory = attendanceHistory.filter(record => {
        const filterFromDate = appliedAttendanceFilters.fromDate || todayDate;
        const filterToDate = appliedAttendanceFilters.toDate || todayDate;

        let matchDate = record.date >= filterFromDate && record.date <= filterToDate;

        const query = appliedAttendanceFilters.employee?.toLowerCase().trim();
        const matchEmployee = !query ||
            record.employeeId?.name.toLowerCase().includes(query) ||
            record.employeeId?.employeeId.toLowerCase().includes(query) ||
            (Array.isArray(record.employeeId?.role) ? record.employeeId?.role.some(r => r.toLowerCase().includes(query)) : record.employeeId?.role?.toLowerCase().includes(query));

        const matchStatus = !appliedAttendanceFilters.status || record.status === appliedAttendanceFilters.status;

        return matchDate && matchEmployee && matchStatus;
    });

    // Filter Logic for Leave History


    // Calculate Dynamic Stats
    const presentCount = filteredHistory.filter(r => r.status === 'Present').length;
    const absentCount = filteredHistory.filter(r => r.status === 'Absent').length;

    const groupAttendanceByDate = (history) => {
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

        const groups = sortedHistory.reduce((acc, record) => {
            if (!record.employeeId) return acc;
            const label = getDateLabel(record.date);
            if (!acc[label]) acc[label] = [];
            acc[label].push(record);
            return acc;
        }, {});

        return groups;
    };

    const groupWorkingHoursByDate = (history) => {
        const presentOnly = history.filter(r => r.status === "Present" && r.employeeId);
        const sortedHistory = [...presentOnly].sort((a, b) => new Date(b.date) - new Date(a.date));

        const groups = sortedHistory.reduce((acc, record) => {
            const label = getDateLabel(record.date);
            if (!acc[label]) acc[label] = [];
            acc[label].push(record);
            return acc;
        }, {});

        return groups;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <Sidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Header (Mobile toggle) */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">AdminPanel</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="mb-6 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                            <div className="mt-3">
                                <p className="text-xl font-medium text-gray-500 mb-1">Hi, Welcome Back 👋</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-gray-800 tracking-tight leading-none">
                                        {user.name?.toUpperCase()}
                                    </h2>
                                    <p className="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-wide break-words">
                                        {user.designation || (Array.isArray(user.role) ? user.role.join(" - ") : user.role)}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-1.5 break-all">
                                    <FaEnvelope className="shrink-0" /> {user.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 xl:gap-10 w-full xl:w-auto">
                            {/* Attendance Section */}
                            <div className="w-full lg:w-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div
                                        onClick={() => handleViewChange('present')}
                                        className="bg-gradient-to-r from-emerald-500 to-green-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-emerald-100 text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Present</p>
                                            <h3 className="text-xl sm:text-2xl font-bold mt-1">
                                                {employees.filter(e => e.status === "Present").length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full shrink-0">
                                            <MdCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => handleViewChange('absent')}
                                        className="bg-gradient-to-r from-rose-500 to-red-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-rose-100 text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Absent</p>
                                            <h3 className="text-xl sm:text-2xl font-bold mt-1">
                                                {employees.filter(e => e.status === "Absent").length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full shrink-0">
                                            <MdCancel className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => handleViewChange('attendance_sheet')}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-blue-100 text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Attendance</p>
                                            <h3 className="text-xl sm:text-2xl font-bold mt-1">
                                                {employees.length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full shrink-0">
                                            <FaClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs font-mono bg-white border border-gray-200 px-5 py-4 sm:py-5 rounded shadow-sm text-gray-600 flex items-center w-full lg:w-auto justify-center">
                                <span className="w-2 h-2 shrink-0 rounded-full bg-green-500 mr-2"></span>
                                <span className="truncate">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-6 w-full">
                        <div onClick={() => handleViewChange('total')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Employees"
                                count={employees.length}
                                color="border-blue-500"
                                icon={<FaUsers />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('present')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Active Employees"
                                count={employees.filter(e => e.status === "Present").length}
                                color="border-emerald-500"
                                icon={<FaUserCheck />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('total_projects')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Projects"
                                count={stats.totalProjects}
                                color="border-purple-500"
                                icon={<FaProjectDiagram />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('total_tasks')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Tasks"
                                count={stats.totalTasks}
                                color="border-indigo-500"
                                icon={<FaTasks />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('pending_tasks')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Pending Tasks"
                                count={stats.pendingTasks}
                                color="border-amber-500"
                                icon={<MdPendingActions />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('active_tasks')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Active Tasks"
                                count={stats.activeTasks}
                                color="border-emerald-500"
                                icon={<FaCheckCircle />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('leave_requests')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Leave Requests"
                                count={pendingLeaves.length}
                                color="border-rose-500"
                                icon={<FaClipboardList />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('all_leaves')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Leaves"
                                count={leaves.length}
                                color="border-pink-500"
                                icon={<FaHistory />}
                            />
                        </div>

                        <div onClick={() => handleViewChange('working_hours')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Working Hours"
                                count={<span className="text-[15px] sm:text-[18px] leading-tight block truncate" title={workingHoursSummary.display}>{workingHoursSummary.display}</span>}
                                color="border-teal-500"
                                icon={<MdDateRange />}
                            />
                        </div>
                    </div>

                    {/* Dynamic Employee Table Section */}
                    {['total', 'present', 'absent', 'attendance_sheet', 'working_hours'].includes(viewMode) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-extrabold text-slate-800 tracking-wider uppercase">
                                    {viewMode === 'total' && "TOTAL EMPLOYEES"}
                                    {viewMode === 'present' && "PRESENT EMPLOYEES"}
                                    {viewMode === 'absent' && "ABSENT EMPLOYEES"}
                                    {viewMode === 'attendance_sheet' && "ATTENDANCE"}
                                    {viewMode === 'working_hours' && "WORKING HOURS"}
                                </h3>
                            </div>

                            {/* Filter Navbar (Only for Total View) */}
                            {viewMode === 'total' && (
                                <div className="p-6 bg-gray-50/50 border-b border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                        {/* Employee Search */}
                                        <div className="relative" ref={searchWrapperRef}>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                                                Employee Search
                                            </label>
                                            <div className="relative">
                                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                                <input
                                                    type="text"
                                                    className="w-full h-[40px] pl-10 pr-4 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white placeholder:text-gray-400 font-medium"
                                                    placeholder="Search by Name, ID, or Dept..."
                                                    value={employeeSearch}
                                                    onChange={(e) => {
                                                        setEmployeeSearch(e.target.value);
                                                        setIsEmployeeDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                                                />
                                            </div>

                                            {/* Dropdown UI */}
                                            {isEmployeeDropdownOpen && (
                                                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
                                                    {employees.filter(e => {
                                                        const query = employeeSearch.toLowerCase().trim();
                                                        if (!query) return true;
                                                        return e.name?.toLowerCase().includes(query) ||
                                                            e.employeeId?.toLowerCase().includes(query) ||
                                                            (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                    }).length > 0 ? (
                                                        employees.filter(e => {
                                                            const query = employeeSearch.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return e.name?.toLowerCase().includes(query) ||
                                                                e.employeeId?.toLowerCase().includes(query) ||
                                                                (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                        }).map((emp, i) => (
                                                            <div
                                                                key={emp._id || i}
                                                                onClick={() => {
                                                                    setEmployeeSearch(emp.name);
                                                                    setIsEmployeeDropdownOpen(false);
                                                                }}
                                                                className="p-3 px-5 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                                            >
                                                                <span className="font-bold text-gray-800 text-[13px] uppercase whitespace-nowrap shrink-0">{emp.name}</span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span title={Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm truncate min-w-0">
                                                                    {Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')}
                                                                </span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span className="text-gray-500 text-[12px] font-mono uppercase tracking-wider shrink-0">{emp.employeeId}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-6 text-sm text-gray-500 text-center flex flex-col items-center justify-center gap-2">
                                                            <FaExclamationCircle className="text-gray-300 text-2xl" />
                                                            <p>No matching employees found for "<span className="font-semibold text-gray-700">{employeeSearch}</span>"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setIsTableLoading(true);
                                                    setAppliedEmployeeSearch(employeeSearch);
                                                    setIsEmployeeDropdownOpen(false);
                                                    setTimeout(() => setIsTableLoading(false), 800);
                                                }}
                                                className="h-[40px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                                title="Fetch Data"
                                            >
                                                <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                Fetch Data
                                            </button>

                                            {appliedEmployeeSearch && (
                                                <button
                                                    onClick={() => {
                                                        setEmployeeSearch("");
                                                        setAppliedEmployeeSearch("");
                                                    }}
                                                    className="h-[40px] w-[40px] shrink-0 bg-red-50 hover:bg-red-100 text-red-500 rounded-md flex items-center justify-center font-bold text-sm transition-all shadow-sm active:scale-95"
                                                    title="Clear Search"
                                                >
                                                    <FaRedo />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode !== 'attendance_sheet' && viewMode !== 'working_hours' ? (
                                isTableLoading ? (
                                    <TableLoader />
                                ) : (
                                    <div className="w-full overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[800px] xl:min-w-[1000px]">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[3%] text-center">S.No</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Employee ID</th>

                                                    {viewMode === 'total' ? (
                                                        <>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Full Name</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%]">Email Address</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Department</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Role</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Work Type</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Joining Date</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Full Name</th>
                                                            {viewMode !== 'present' && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Department</th>}
                                                            {viewMode === 'absent' && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Email Address</th>}
                                                        </>
                                                    )}

                                                    {/* Columns specific to View Mode */}
                                                    {viewMode === 'present' && (
                                                        <>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Login Time</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%] text-center">Logout Time</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-emerald-600 w-[10%] text-center">Active Hours</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-amber-600 w-[10%] text-center">Idle Hours</th>
                                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-rose-600 w-[10%] text-center">Inactive Hours</th>
                                                        </>
                                                    )}
                                                    {viewMode === 'absent' && (
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(
                                                    viewMode === 'total' ? filteredEmployees :
                                                        viewMode === 'present' ? employees.filter(e => e.status === "Present") :
                                                            viewMode === 'absent' ? employees.filter(e => e.status === "Absent") : []
                                                ).map((emp, index) => {
                                                    return (
                                                        <tr key={emp._id} className="hover:bg-gray-50 transition-colors py-4">
                                                            <td className="px-6 py-4 text-center text-gray-400 font-medium text-xs border-r border-gray-50 min-w-[50px]">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>
                                                            <td className="px-6 py-4 font-semibold text-gray-800 text-sm">{emp.employeeId || "-"}</td>

                                                            {viewMode === 'total' ? (
                                                                <>
                                                                    <td className="px-6 py-4 align-middle font-bold text-gray-900 text-sm">
                                                                        {emp.name}
                                                                    </td>
                                                                    <td className="px-6 py-4 align-middle text-sm text-gray-500 break-all">
                                                                        {emp.email}
                                                                    </td>
                                                                    <td className="px-6 py-4 align-middle">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {Array.isArray(emp.role) ? emp.role.map((r, i) => (
                                                                                <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-normal">
                                                                                    {r}
                                                                                </span>
                                                                            )) : (
                                                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-normal">{emp.role}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-700 align-middle text-sm">{emp.designation || ""}</td>
                                                                    <td className="px-6 py-4 text-gray-700 align-middle text-sm">{emp.workType || ""}</td>
                                                                    <td className="px-6 py-4 text-gray-500 align-middle text-sm whitespace-nowrap">
                                                                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "-"}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-6 py-4 align-middle">
                                                                        <div className="font-semibold text-gray-800 text-sm">{emp.name}</div>
                                                                        {viewMode === 'present' && (
                                                                            <div className="mt-1">
                                                                                <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                                    {Array.isArray(emp.role) ? emp.role.join(", ") : emp.role}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    {viewMode !== 'present' && (
                                                                        <td className="px-6 py-4 align-middle">
                                                                            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                                {Array.isArray(emp.role) ? emp.role.join(", ") : emp.role}
                                                                            </span>
                                                                        </td>
                                                                    )}
                                                                    {viewMode === 'absent' && <td className="px-6 py-4 text-blue-600 text-sm">{emp.email || "-"}</td>}
                                                                </>
                                                            )}

                                                            {/* Present View Extra Column */}
                                                            {viewMode === 'present' && (
                                                                <>
                                                                    <td className="px-6 py-4 font-mono text-gray-600 text-sm text-center">
                                                                        {emp.loginTime ? new Date(emp.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono text-indigo-600 font-bold text-sm text-center">
                                                                        {emp.logoutTime ? new Date(emp.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono text-emerald-600 font-bold text-sm text-center">
                                                                        {emp.formattedActiveTime || "00:00:00"}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono text-amber-600 font-bold text-sm text-center">
                                                                        {emp.formattedIdleTime || "00:00:00"}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-mono text-rose-600 font-bold text-sm text-center">
                                                                        {calculateInactiveHours(emp.formattedActiveTime, emp.formattedIdleTime)}
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* Absent View Extra Column */}
                                                            {viewMode === 'absent' && (
                                                                <td className="p-4 text-red-500 font-medium italic">
                                                                    {(() => {
                                                                        const todayStr = new Date().toISOString().split('T')[0];
                                                                        const leave = leaves.find(l => {
                                                                            if (l.employeeId?._id !== emp._id || l.status !== "Approved") return false;
                                                                            if (l.leaveCategory === "Day Leave") {
                                                                                return l.leaveDate === todayStr;
                                                                            } else {
                                                                                return l.permissionDate === todayStr;
                                                                            }
                                                                        });
                                                                        return leave ? `${leave.leaveCategory} - ${leave.reason || "No Reason"}` : "Not yet logged in";
                                                                    })()}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}

                                                {/* Empty States */}
                                                {viewMode === 'total' && filteredEmployees.length === 0 && (
                                                    <tr><td colSpan="10" className="p-6 text-center text-gray-500">No employees found.</td></tr>
                                                )}
                                                {viewMode === 'present' && employees.filter(e => e.status === "Present").length === 0 && (
                                                    <tr><td colSpan="10" className="p-6 text-center text-gray-500">No employees present today.</td></tr>
                                                )}
                                                {viewMode === 'absent' && employees.filter(e => e.status === "Absent").length === 0 && (
                                                    <tr><td colSpan="10" className="p-6 text-center text-gray-500">No employees absent today.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                // ATTENDANCE SHEET (GROUPED HISTORY VIEW - SIMPLIFIED)
                                <div className="flex flex-col gap-6 p-4">

                                    {/* Filter Navbar */}
                                    <div className="p-5 bg-white border border-gray-100 flex flex-col gap-5 shadow-sm rounded-xl mb-6">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full items-end">
                                            {/* From Date */}
                                            <div className="w-full">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={attendanceFilters.fromDate || ""}
                                                        max={attendanceFilters.toDate || undefined}
                                                        onChange={(e) => setAttendanceFilters({ ...attendanceFilters, fromDate: e.target.value })}
                                                        className="w-full h-[40px] px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 placeholder:text-gray-400"
                                                    />
                                                    <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                                </div>
                                            </div>

                                            {/* To Date */}
                                            <div className="w-full">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">To Date</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={attendanceFilters.toDate || ""}
                                                        min={attendanceFilters.fromDate || undefined}
                                                        onChange={(e) => setAttendanceFilters({ ...attendanceFilters, toDate: e.target.value })}
                                                        className="w-full h-[40px] px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 placeholder:text-gray-400"
                                                    />
                                                    <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                                </div>
                                            </div>

                                            {/* Unified Employee Search */}
                                            <div className="w-full relative col-span-2" ref={attendanceSearchWrapperRef}>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Employee Search</label>
                                                <div className="relative flex items-center w-full">
                                                    <FaSearch className="absolute left-3 text-gray-400 text-xs" />
                                                    <input
                                                        type="text"
                                                        className="w-full h-[40px] pl-8 pr-4 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 font-medium placeholder:text-gray-400"
                                                        placeholder="Search Name, ID, or Dept..."
                                                        value={attendanceEmployeeSearch}
                                                        onChange={(e) => {
                                                            setAttendanceEmployeeSearch(e.target.value);
                                                            setAttendanceFilters({ ...attendanceFilters, employee: e.target.value });
                                                            setIsAttendanceEmployeeDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setIsAttendanceEmployeeDropdownOpen(true)}
                                                    />
                                                </div>

                                                {/* Dropdown UI */}
                                                {isAttendanceEmployeeDropdownOpen && (
                                                    <div className="absolute top-[65px] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
                                                        {employees.filter(e => {
                                                            const query = attendanceEmployeeSearch.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return e.name?.toLowerCase().includes(query) ||
                                                                e.employeeId?.toLowerCase().includes(query) ||
                                                                (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                        }).length > 0 ? (
                                                            employees.filter(e => {
                                                                const query = attendanceEmployeeSearch.toLowerCase().trim();
                                                                if (!query) return true;
                                                                return e.name?.toLowerCase().includes(query) ||
                                                                    e.employeeId?.toLowerCase().includes(query) ||
                                                                    (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                            }).map((emp, i) => (
                                                                <div
                                                                    key={emp._id || i}
                                                                    onClick={() => {
                                                                        setAttendanceEmployeeSearch(emp.name);
                                                                        setAttendanceFilters({ ...attendanceFilters, employee: emp.name });
                                                                        setIsAttendanceEmployeeDropdownOpen(false);
                                                                    }}
                                                                    className="p-3 px-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                                                >
                                                                    <span className="font-bold text-gray-800 text-[12px] uppercase whitespace-nowrap shrink-0">{emp.name}</span>
                                                                    <span className="text-gray-300 shrink-0">—</span>
                                                                    <span title={Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm truncate min-w-0">
                                                                        {Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')}
                                                                    </span>
                                                                    <span className="text-gray-300 shrink-0">—</span>
                                                                    <span className="text-gray-500 text-[11px] font-mono uppercase tracking-wider shrink-0">{emp.employeeId}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-xs text-gray-500 text-center">No matching employees found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Filter */}
                                            <div className="w-full">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                                                <CustomDropdown
                                                    options={[
                                                        { value: "", label: "All Statuses" },
                                                        { value: "Present", label: "Present" },
                                                        { value: "Absent", label: "Absent" }
                                                    ]}
                                                    value={attendanceFilters.status}
                                                    onChange={(val) => setAttendanceFilters({ ...attendanceFilters, status: val })}
                                                    placeholder="All Statuses"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-3 w-full">
                                            <button
                                                onClick={() => {
                                                    const emptyFilters = { fromDate: "", toDate: "", employee: "", status: "" };
                                                    setAttendanceFilters(emptyFilters);
                                                    setAppliedAttendanceFilters(emptyFilters);
                                                    setAttendanceEmployeeSearch("");
                                                }}
                                                className="h-[40px] px-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-md text-base font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                                                title="Reset Filters"
                                            >
                                                <FaRedo />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAppliedAttendanceFilters(attendanceFilters);
                                                    setIsAttendanceEmployeeDropdownOpen(false);
                                                }}
                                                className="h-[40px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                                title="Fetch Data"
                                            >
                                                <FaSearch className="w-4 h-4 font-bold" />
                                                Fetch Data
                                            </button>
                                        </div>
                                    </div>

                                    {viewMode === 'attendance_sheet' && Object.entries(groupAttendanceByDate(filteredHistory)).map(([group, records]) => {
                                        if (records.length === 0) return null;
                                        const groupPresentCount = records.filter(r => r.status === "Present").length;
                                        const groupAbsentCount = records.filter(r => r.status === "Absent").length;

                                        return (
                                            <div key={group} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-4">
                                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                                    <h4 className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                                                        {group}
                                                    </h4>
                                                    <div className="flex gap-4">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                            Present: <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{groupPresentCount.toString().padStart(2, '0')}</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                                                            Absent: <span className="bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{groupAbsentCount.toString().padStart(2, '0')}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                                            <tr>
                                                                <th className="p-4 font-medium">Date</th>
                                                                <th className="p-4 font-medium">Employee ID</th>
                                                                <th className="p-4 font-medium">Full Name</th>
                                                                <th className="p-4 font-medium">Role</th>
                                                                <th className="p-4 font-medium">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {records.map(record => (
                                                                <tr key={record._id} className="hover:bg-blue-50/30 transition-colors text-sm text-gray-700">
                                                                    <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-xs text-blue-600 cursor-pointer">{record.date}</td>
                                                                    <td className="p-4">
                                                                        <div className="text-xs text-gray-500 font-mono">{record.employeeId?.employeeId}</div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="font-bold text-gray-800">{record.employeeId?.name || "Unknown"}</div>
                                                                    </td>
                                                                    <td className="p-4 text-xs text-indigo-600 font-medium">{record.employeeId?.role}</td>
                                                                    <td className="p-4">
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${record.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                                                            {record.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {viewMode === 'working_hours' && Object.entries(groupWorkingHoursByDate(filteredHistory)).map(([group, records]) => {
                                        if (records.length === 0) return null;
                                        return (
                                            <div key={group} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-4">
                                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                                    <h4 className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                                                        {group}
                                                    </h4>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                                            <tr>
                                                                <th className="p-4 font-medium">Full Name</th>
                                                                <th className="p-4 font-medium text-center bg-slate-100/40">Login Time</th>
                                                                <th className="p-4 font-medium text-center bg-slate-100/40">Logout Time</th>
                                                                <th className="p-4 font-medium text-center text-rose-600 bg-slate-100/40">Inactive Hours</th>
                                                                <th className="p-4 font-medium text-center text-amber-600 bg-indigo-100/40">Idle Hours</th>
                                                                <th className="p-4 font-medium text-center text-purple-600 bg-indigo-100/40">QT Hours</th>
                                                                <th className="p-4 font-medium text-center text-emerald-600 bg-teal-100/40">Active Hours</th>
                                                                <th className="p-4 font-medium text-center text-rose-600 bg-teal-100/40">Meeting Hours</th>
                                                                <th className="font-medium text-center text-indigo-600 bg-teal-100/40">Total Working Hours</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {records.map(recordData => {
                                                                const emp = recordData.employeeId;
                                                                return (
                                                                    <tr key={`${recordData._id}`} className="hover:bg-blue-50/30 transition-colors text-sm text-gray-700">
                                                                        <td className="p-4">
                                                                            <div className="font-bold text-gray-800">{emp?.name || "Unknown"}</div>
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {Array.isArray(emp?.role) ? emp.role.map((r, i) => (
                                                                                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-normal">
                                                                                        {r}
                                                                                    </span>
                                                                                )) : (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-normal">{emp?.role}</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 font-mono text-gray-600 text-xs text-center bg-slate-100/40">
                                                                            {recordData.loginTime ? new Date(recordData.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-gray-500 font-bold text-xs text-center bg-slate-100/40">
                                                                            {recordData.logoutTime ? new Date(recordData.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-rose-600 font-bold text-xs text-center bg-slate-100/40">
                                                                            {calculateInactiveHours(recordData.formattedActiveTime, recordData.formattedIdleTime)}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-amber-600 font-bold text-xs text-center bg-indigo-100/40">
                                                                            {recordData.formattedIdleTime || "00:00:00"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-purple-600 font-bold text-xs text-center bg-indigo-100/40">
                                                                            {recordData.qtHours || "00:00:00"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-emerald-600 font-bold text-xs text-center bg-teal-100/40">
                                                                            {recordData.formattedActiveTime || "00:00:00"}
                                                                        </td>
                                                                        <td className="font-mono text-rose-600 font-bold text-xs text-center bg-teal-100/40">
                                                                            {recordData.meetingHours || "00:00:00"}
                                                                        </td>
                                                                        <td className="font-mono text-indigo-600 font-bold text-xs text-center bg-teal-100/40">
                                                                            {addTimes(recordData.formattedActiveTime, recordData.meetingHours)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {viewMode === 'attendance_sheet' && attendanceHistory.length === 0 && <p className="text-center text-gray-500 p-8">No attendance records found.</p>}
                                    {viewMode === 'working_hours' && filteredHistory.filter(r => r.status === "Present" && r.employeeId).length === 0 && <p className="text-center text-gray-500 p-8">No history records found.</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dynamic Task Table Section */}
                    {
                        ['total_projects', 'total_tasks', 'pending_tasks', 'active_tasks'].includes(viewMode) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-extrabold text-slate-800 tracking-wider uppercase">
                                        {viewMode === 'total_projects' && "TOTAL PROJECTS"}
                                        {viewMode === 'total_tasks' && "TOTAL TASKS"}
                                        {viewMode === 'pending_tasks' && "PENDING TASKS"}
                                        {viewMode === 'active_tasks' && "ACTIVE TASKS"}
                                    </h3>
                                </div>

                                {/* Task Filter Navbar */}
                                <div className="p-5 bg-white border border-gray-100 flex flex-col gap-5 shadow-sm rounded-xl mb-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full items-end">
                                        {/* From Date */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={taskFilters.fromDate}
                                                    max={taskFilters.toDate || undefined}
                                                    onChange={(e) => setTaskFilters({ ...taskFilters, fromDate: e.target.value })}
                                                    className="w-full h-[40px] px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 placeholder:text-gray-400"
                                                />
                                                <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                            </div>
                                        </div>

                                        {/* To Date */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">To Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={taskFilters.toDate}
                                                    min={taskFilters.fromDate || undefined}
                                                    onChange={(e) => setTaskFilters({ ...taskFilters, toDate: e.target.value })}
                                                    className="w-full h-[40px] px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 placeholder:text-gray-400"
                                                />
                                                <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                            </div>
                                        </div>

                                        {/* Project Filter */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Project Name</label>
                                            <CustomDropdown
                                                options={[
                                                    { value: "", label: "All Projects" },
                                                    ...uniqueProjects.map(p => ({ value: p }))
                                                ]}
                                                value={taskFilters.projectName}
                                                onChange={(val) => setTaskFilters({ ...taskFilters, projectName: val })}
                                                placeholder="All Projects"
                                                searchable={true}
                                            />
                                        </div>

                                        {/* Employee Profile Filter */}
                                        <div className="w-full relative col-span-2 md:col-span-1 lg:col-span-2" ref={taskSearchWrapperRef}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Employee Profile</label>
                                            <div className="relative flex items-center w-full">
                                                <FaSearch className="absolute left-3 text-gray-400 text-xs" />
                                                <input
                                                    type="text"
                                                    className="w-full h-[40px] px-3 py-2 pl-8 pr-4 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 font-medium placeholder:text-gray-400"
                                                    placeholder="Search Employee..."
                                                    value={taskEmployeeSearch}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTaskEmployeeSearch(val);
                                                        if (val === "") {
                                                            setTaskFilters({ ...taskFilters, assignedTo: "" });
                                                        }
                                                        setIsTaskEmployeeDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsTaskEmployeeDropdownOpen(true)}
                                                />
                                            </div>

                                            {/* Dropdown UI */}
                                            {isTaskEmployeeDropdownOpen && (
                                                <div className="absolute top-[65px] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
                                                    {employees.filter(e => {
                                                        const query = taskEmployeeSearch.toLowerCase().trim();
                                                        if (!query) return true;
                                                        return e.name?.toLowerCase().includes(query) ||
                                                            e.employeeId?.toLowerCase().includes(query) ||
                                                            (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                    }).length > 0 ? (
                                                        employees.filter(e => {
                                                            const query = taskEmployeeSearch.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return e.name?.toLowerCase().includes(query) ||
                                                                e.employeeId?.toLowerCase().includes(query) ||
                                                                (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                        }).map((emp, i) => (
                                                            <div
                                                                key={emp._id || i}
                                                                onClick={() => {
                                                                    setTaskEmployeeSearch(emp.name);
                                                                    setTaskFilters({ ...taskFilters, assignedTo: emp._id });
                                                                    setIsTaskEmployeeDropdownOpen(false);
                                                                }}
                                                                className="p-3 px-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                                            >
                                                                <span className="font-bold text-gray-800 text-[12px] uppercase whitespace-nowrap shrink-0">{emp.name}</span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span title={Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm truncate min-w-0">
                                                                    {Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')}
                                                                </span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span className="text-gray-500 text-[11px] font-mono uppercase tracking-wider shrink-0 break-keep">{emp.employeeId}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-xs text-gray-500 text-center flex flex-col items-center justify-center gap-2">
                                                            <FaExclamationCircle className="text-gray-300 text-xl" />
                                                            <p>No matches for "<span className="font-semibold text-gray-700">{taskEmployeeSearch}</span>"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Filter (Only for Total Views) */}
                                        {(viewMode === 'total_projects' || viewMode === 'total_tasks') && (
                                            <div className="w-full">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                                                <CustomDropdown
                                                    options={[
                                                        { value: "", label: "All Statuses" },
                                                        ...uniqueTaskStatuses.map(s => ({ value: s }))
                                                    ]}
                                                    value={taskFilters.status}
                                                    onChange={(val) => setTaskFilters({ ...taskFilters, status: val })}
                                                    placeholder="All Statuses"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 w-full">
                                        <button
                                            onClick={() => {
                                                const emptyFilters = { projectName: "", assignedTo: "", fromDate: "", toDate: "", status: "" };
                                                setTaskFilters(emptyFilters);
                                                setAppliedTaskFilters(emptyFilters);
                                                setTaskEmployeeSearch("");
                                            }}
                                            className="h-[40px] px-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-md text-base font-bold transition-all flex items-center justify-center shrink-0"
                                            title="Reset Filters"
                                        >
                                            <FaRedo />
                                        </button>
                                        <button
                                            onClick={() => setAppliedTaskFilters(taskFilters)}
                                            className="h-[40px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                            title="Apply Filters"
                                        >
                                            <svg className="w-4 h-4 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            Fetch Data
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-18">
                                    {isTableLoading ? (
                                        <TableLoader />
                                    ) : (
                                        Object.keys(groupedTasks).length === 0 ? (
                                            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 mt-4">
                                                No tasks found.
                                            </div>
                                        ) : (
                                            Object.keys(groupedTasks).map((dateLabel) => {
                                                const tasksInGroup = groupedTasks[dateLabel];
                                                return (
                                                    <div key={dateLabel} className="mb-8 mt-4">
                                                        <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 ml-7">
                                                            {dateLabel} <span className="text-xs font-medium text-gray-400 normal-case">({tasksInGroup.length} tasks / {getUniqueEmployeeCount(tasksInGroup)} emp)</span>
                                                        </h3>
                                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                                            <div className="w-full overflow-x-auto custom-scrollbar">
                                                                <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                                    <thead>
                                                                        <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Assigned By & To</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Project Name</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[25%]">Description</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Priority</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[8%] text-center">Chats</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {tasksInGroup.map((task, index) => (
                                                                            <tr key={task._id}
                                                                                onClick={() => setSelectedTaskForDetails(task)}
                                                                                className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                                                            >
                                                                                {/* S.No */}
                                                                                <td className="px-6 py-4 align-middle text-center w-[5%]">
                                                                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                                                                        <span className="text-gray-400 font-mono text-xs font-medium">
                                                                                            {(index + 1).toString().padStart(2, '0')}
                                                                                        </span>
                                                                                        <div
                                                                                            className={`w-2 h-2 rounded-sm shadow-sm ${task.logType === 'Offline Task' || task.isPendingOffline
                                                                                                ? 'bg-rose-500' // Red for Offline
                                                                                                : 'bg-emerald-500' // Green for Online
                                                                                                }`}
                                                                                            title={task.logType === 'Offline Task' || task.isPendingOffline ? 'Offline Task' : 'Online Task'}
                                                                                        ></div>
                                                                                    </div>
                                                                                </td>

                                                                                {/* Assigned By & To */}
                                                                                <td className="px-6 py-4 align-middle">
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] uppercase font-bold text-gray-400 w-6">By:</span>
                                                                                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={task.assignedBy?.name}>
                                                                                                {task.assignedBy?.name || "Admin"}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] uppercase font-bold text-gray-400 w-6">To:</span>
                                                                                            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[150px]" title={(() => {
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
                                                                                                    let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
                                                                                                    if (!targets || targets.length === 0) {
                                                                                                        return task.assignType === "Overall" ? "Overall (All)" : "Unassigned";
                                                                                                    }
                                                                                                    return targets.map(assigneeId => {
                                                                                                        if (typeof assigneeId === 'object' && assigneeId.name) return assigneeId.name;
                                                                                                        const emp = employees.find(e => e._id === assigneeId);
                                                                                                        return emp ? emp.name : assigneeId;
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

                                                                                {/* Description */}
                                                                                <td className="px-6 py-4 align-middle">
                                                                                    <div className="flex flex-col gap-1.5 items-start">
                                                                                        <span className="text-sm font-medium text-gray-600 truncate max-w-[300px]" title={task.description || task.taskTitle}>
                                                                                            {task.description || task.taskTitle}
                                                                                        </span>
                                                                                    </div>
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

                                                                                {/* Status */}
                                                                                <td className="px-6 py-4 align-middle">
                                                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${task.status === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                                                        task.status === "In Progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                                                            task.status === "Hold" ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                                                                task.status === "Overdue" ? "bg-red-100 text-red-800 border-red-200" :
                                                                                                    "bg-gray-100 text-gray-800 border-gray-200"
                                                                                        }`}>
                                                                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${task.status === "Completed" ? "bg-emerald-500" :
                                                                                            task.status === "In Progress" ? "bg-blue-500" :
                                                                                                task.status === "Hold" ? "bg-amber-500" :
                                                                                                    task.status === "Overdue" ? "bg-red-500" :
                                                                                                        "bg-gray-500"
                                                                                            }`}></span>
                                                                                        {task.status}
                                                                                    </span>
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
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* Leave Requests Table */}
                    {
                        viewMode === 'leave_requests' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 animate-fade-in-up">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-extrabold text-slate-800 tracking-wider uppercase">LEAVE REQUESTS</h3>
                                </div>
                                <div className="w-full overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead className="bg-gray-50 text-gray-700 text-sm uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 font-bold border-b w-[5%] text-center">S.No</th>
                                                <th className="p-4 font-bold border-b">Employee</th>
                                                <th className="p-4 font-bold border-b">Category</th>
                                                <th className="p-4 font-bold border-b">Reason</th>
                                                <th className="p-4 font-bold border-b">Date/Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pendingLeaves.length === 0 ? (
                                                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No pending leave requests.</td></tr>
                                            ) : (
                                                pendingLeaves.map((leave, index) => (
                                                    <tr key={leave._id}
                                                        onClick={() => setSelectedLeaveForDetails(leave)}
                                                        className="hover:bg-gray-50 transition-colors text-sm text-gray-700 cursor-pointer">
                                                        <td className="p-4 text-center text-gray-400 font-mono text-xs">{(index + 1).toString().padStart(2, '0')}</td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-800">{leave.employeeId?.name || "Unknown"}</div>
                                                            <div className="text-xs text-gray-500">{leave.employeeId?.role}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="font-medium text-indigo-600">{leave.leaveCategory}</span>
                                                            <div className="text-xs text-gray-500">{leave.leaveType}</div>
                                                        </td>
                                                        <td className="p-4 text-gray-600 max-w-xs truncate" title={leave.reason}>
                                                            {leave.reason}
                                                        </td>
                                                        <td className="p-4 text-gray-500 font-mono text-xs">
                                                            {leave.leaveCategory === "Day Leave" ? (
                                                                <div>Date: {leave.leaveDate}</div>
                                                            ) : (
                                                                <div>
                                                                    <div>Date: {leave.permissionDate}</div>
                                                                    <div>{leave.startTime} - {leave.endTime}</div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }

                    {/* All Leaves Table */}
                    {
                        viewMode === 'all_leaves' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 animate-fade-in-up">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-extrabold text-slate-800 tracking-wider uppercase">TOTAL LEAVES</h3>
                                </div>

                                {/* Leave History Filter Navbar */}
                                <div className="p-5 bg-white border border-gray-100 flex flex-col gap-5 shadow-sm rounded-xl mb-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full items-end">
                                        {/* From Date */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Applied From</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={leaveHistoryFilters.fromDate}
                                                    max={leaveHistoryFilters.toDate || undefined}
                                                    onChange={(e) => setLeaveHistoryFilters({ ...leaveHistoryFilters, fromDate: e.target.value })}
                                                    className="w-full px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 h-[40px] placeholder:text-gray-400"
                                                />
                                                <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                            </div>
                                        </div>

                                        {/* To Date */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Applied To</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={leaveHistoryFilters.toDate}
                                                    min={leaveHistoryFilters.fromDate || undefined}
                                                    onChange={(e) => setLeaveHistoryFilters({ ...leaveHistoryFilters, toDate: e.target.value })}
                                                    className="w-full px-3 py-2 pl-9 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-gray-700 h-[40px] placeholder:text-gray-400"
                                                />
                                                <FaCalendarAlt className="absolute left-3 top-[12px] text-gray-400 text-xs" />
                                            </div>
                                        </div>

                                        {/* Employee Profile Filter */}
                                        <div className="w-full lg:col-span-2 relative" ref={leaveSearchWrapperRef}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Employee Profile</label>
                                            <div className="relative flex items-center">
                                                <FaSearch className="absolute left-3 text-gray-400 text-[10px]" />
                                                <input
                                                    type="text"
                                                    className="w-full h-[40px] pl-8 pr-3 rounded-md border border-gray-200 text-sm bg-gray-50 text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-500 transition-all font-medium"
                                                    placeholder="Search Employee..."
                                                    value={leaveEmployeeSearch}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setLeaveEmployeeSearch(val);
                                                        if (val === "") {
                                                            setLeaveHistoryFilters({ ...leaveHistoryFilters, employee: "" });
                                                        }
                                                        setIsLeaveEmployeeDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsLeaveEmployeeDropdownOpen(true)}
                                                />
                                            </div>

                                            {/* Dropdown UI */}
                                            {isLeaveEmployeeDropdownOpen && (
                                                <div className="absolute top-[65px] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
                                                    {employees.filter(e => {
                                                        const query = leaveEmployeeSearch.toLowerCase().trim();
                                                        if (!query) return true;
                                                        return e.name?.toLowerCase().includes(query) ||
                                                            e.employeeId?.toLowerCase().includes(query) ||
                                                            (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                    }).length > 0 ? (
                                                        employees.filter(e => {
                                                            const query = leaveEmployeeSearch.toLowerCase().trim();
                                                            if (!query) return true;
                                                            return e.name?.toLowerCase().includes(query) ||
                                                                e.employeeId?.toLowerCase().includes(query) ||
                                                                (Array.isArray(e.role) ? e.role.some(r => r.trim().toLowerCase().includes(query)) : e.role?.trim().toLowerCase().includes(query));
                                                        }).map((emp, i) => (
                                                            <div
                                                                key={emp._id || i}
                                                                onClick={() => {
                                                                    setLeaveEmployeeSearch(emp.name);
                                                                    setLeaveHistoryFilters({ ...leaveHistoryFilters, employee: emp._id });
                                                                    setIsLeaveEmployeeDropdownOpen(false);
                                                                }}
                                                                className="p-3 px-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                                            >
                                                                <span className="font-bold text-gray-800 text-[12px] uppercase whitespace-nowrap shrink-0">{emp.name}</span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span title={Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm truncate min-w-0">
                                                                    {Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')}
                                                                </span>
                                                                <span className="text-gray-300 shrink-0">—</span>
                                                                <span className="text-gray-500 text-[11px] font-mono uppercase tracking-wider shrink-0 break-keep">{emp.employeeId}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-xs text-gray-500 text-center flex flex-col items-center justify-center gap-2">
                                                            <FaExclamationCircle className="text-gray-300 text-xl" />
                                                            <p>No matches for "<span className="font-semibold text-gray-700">{leaveEmployeeSearch}</span>"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Filter */}
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Status</label>
                                            <CustomDropdown
                                                options={[
                                                    { value: "", label: "All Statuses" },
                                                    { value: "Pending", label: "Pending", icon: FaExclamationCircle },
                                                    { value: "Approved", label: "Approved", icon: FaCheckCircle },
                                                    { value: "Rejected", label: "Rejected", icon: FaTimes }
                                                ]}
                                                value={leaveHistoryFilters.status}
                                                onChange={(val) => setLeaveHistoryFilters({ ...leaveHistoryFilters, status: val })}
                                                placeholder="All Statuses"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 w-full">
                                        <button
                                            onClick={() => {
                                                const emptyFilters = { name: "", employeeId: "", fromDate: "", toDate: "", status: "" };
                                                setLeaveHistoryFilters(emptyFilters);
                                                setAppliedLeaveHistoryFilters(emptyFilters);
                                            }}
                                            className="h-[40px] px-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-md text-base font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                                            title="Reset Filters"
                                        >
                                            <FaRedo />
                                        </button>
                                        <button
                                            onClick={() => setAppliedLeaveHistoryFilters(leaveHistoryFilters)}
                                            className="h-[40px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                            title="Fetch Data"
                                        >
                                            <FaSearch className="w-4 h-4 font-bold" />
                                            Fetch Data
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead className="bg-gray-50 text-gray-700 text-sm uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 font-bold border-b w-[5%] text-center">S.No</th>
                                                <th className="p-4 font-bold border-b">Name & Role</th>
                                                <th className="p-4 font-bold border-b">Applied On</th>
                                                <th className="p-4 font-bold border-b">Leave Category</th>
                                                <th className="p-4 font-bold border-b">Date/Time</th>
                                                <th className="p-4 font-bold border-b">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredLeaves.length === 0 ? (
                                                <tr><td colSpan="6" className="p-6 text-center text-gray-500">No leave records found.</td></tr>
                                            ) : (
                                                filteredLeaves.map((leave, index) => (
                                                    <tr key={leave._id}
                                                        onClick={() => setSelectedLeaveForDetails(leave)}
                                                        className="hover:bg-gray-50 transition-colors text-sm text-gray-700 cursor-pointer">
                                                        <td className="p-4 text-center text-gray-400 font-mono text-xs">{(index + 1).toString().padStart(2, '0')}</td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-800">{leave.employeeId?.name || "Unknown"}</div>
                                                            <div className="text-xs text-gray-500">{leave.employeeId?.role || "-"}</div>
                                                        </td>
                                                        <td className="p-4 text-gray-500">
                                                            {new Date(leave.appliedOn || leave.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4 text-indigo-600 font-medium">
                                                            {leave.leaveCategory}
                                                            <div className="text-xs text-gray-400 font-normal">{leave.leaveType}</div>
                                                        </td>
                                                        <td className="p-4 text-gray-500 font-mono text-xs">
                                                            {leave.leaveCategory === "Day Leave" ? (
                                                                <div>{leave.leaveDate}</div>
                                                            ) : (
                                                                <div>
                                                                    <div>{leave.permissionDate}</div>
                                                                    <div className="text-xs text-gray-400">{leave.startTime} - {leave.endTime}</div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${leave.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                                                                leave.status === "Rejected" ? "bg-rose-100 text-rose-700" :
                                                                    "bg-amber-100 text-amber-700"
                                                                }`}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }

                    {/* Rejection Reason Modal */}
                    {
                        isRejectModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="text-lg font-bold text-gray-800">Reject Leave Request</h3>
                                        <button onClick={() => setIsRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                            <MdCancel size={24} />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-600 text-sm mb-4">
                                            Please provide a reason for rejecting the leave request from <span className="font-bold text-gray-800">{selectedLeaveToReject?.employeeId?.name}</span>.
                                        </p>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Enter rejection reason..."
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-gray-50 min-h-[100px] resize-none text-sm placeholder:text-gray-400"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="p-4 bg-gray-50 flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsRejectModalOpen(false)}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleLeaveAction(selectedLeaveToReject._id, "Rejected", rejectionReason)}
                                            disabled={!rejectionReason.trim()}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Informed Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Leave Details Modal */}
                    {selectedLeaveForDetails && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h3 className="text-xl font-bold text-gray-800">Leave Details</h3>
                                    <button onClick={() => setSelectedLeaveForDetails(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <FaTimes size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="bg-indigo-100 text-indigo-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                                            {selectedLeaveForDetails.employeeId?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800">{selectedLeaveForDetails.employeeId?.name}</h4>
                                            <p className="text-sm text-gray-500">{selectedLeaveForDetails.employeeId?.role} • {selectedLeaveForDetails.employeeId?.employeeId}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Status</p>
                                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-bold uppercase ${selectedLeaveForDetails.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                                                selectedLeaveForDetails.status === "Rejected" ? "bg-rose-100 text-rose-700" :
                                                    "bg-amber-100 text-amber-700"
                                                }`}>
                                                {selectedLeaveForDetails.status}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Applied On</p>
                                            <p className="font-semibold text-gray-700 text-sm mt-1">{new Date(selectedLeaveForDetails.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Category</p>
                                            <p className="font-semibold text-gray-700 text-sm mt-1">{selectedLeaveForDetails.leaveCategory}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Type</p>
                                            <p className="font-semibold text-gray-700 text-sm mt-1">{selectedLeaveForDetails.leaveType}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-100 p-4 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Leave Duration</p>
                                        {selectedLeaveForDetails.leaveCategory === "Day Leave" ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <FaCalendarAlt className="text-indigo-500" />
                                                <span className="font-bold">{selectedLeaveForDetails.leaveDate}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <FaCalendarAlt className="text-indigo-500" />
                                                    <span className="font-bold">{selectedLeaveForDetails.permissionDate}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 pl-6">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{selectedLeaveForDetails.startTime} - {selectedLeaveForDetails.endTime}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white border border-gray-100 p-4 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reason</p>
                                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">"{selectedLeaveForDetails.reason}"</p>
                                    </div>

                                    {selectedLeaveForDetails.status === "Rejected" && selectedLeaveForDetails.rejectionReason && (
                                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg mt-4">
                                            <p className="text-xs font-bold text-rose-500 uppercase mb-2">Rejection Reason</p>
                                            <p className="text-sm text-rose-700">{selectedLeaveForDetails.rejectionReason}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons for Pending Leaves */}
                                    {selectedLeaveForDetails.status === 'Pending' && (
                                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                                            <button
                                                onClick={() => {
                                                    openRejectModal(selectedLeaveForDetails);
                                                    setSelectedLeaveForDetails(null); // Close details modal
                                                }}
                                                className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                <FaTimes /> Reject
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleLeaveAction(selectedLeaveForDetails._id, "Approved");
                                                    setSelectedLeaveForDetails(null); // Close details modal
                                                }}
                                                className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                <FaCheck /> Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Task Details Modal */}
                    {
                        selectedTaskForDetails && (
                            <TaskDetailsModal
                                task={selectedTaskForDetails}
                                onClose={() => setSelectedTaskForDetails(null)}
                                isAdmin={true}
                            />
                        )
                    }

                </main >            </div >
        </div >
    );
};

export default Dashboard;
