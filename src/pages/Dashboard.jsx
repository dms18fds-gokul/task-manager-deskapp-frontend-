import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import { FaUsers, FaProjectDiagram, FaTasks, FaClipboardList, FaCheckCircle, FaEllipsisV, FaEye, FaUserTag, FaEnvelope, FaIdCard, FaUser, FaCalendarAlt, FaExclamationCircle, FaTimes, FaCheck, FaHistory, FaRedo } from "react-icons/fa";
import { MdPendingActions, MdCheckCircle, MdCancel, MdDateRange } from "react-icons/md";
import io from "socket.io-client";
import { API_URL, getSocketUrl } from "../utils/config";

const formatDuration = (ms) => {
    if (!ms || ms <= 0) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
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

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    // viewMode: 'none', 'total', 'present', 'absent', 'total_projects', 'total_tasks', 'pending_tasks', 'active_tasks'
    const [viewMode, setViewMode] = useState('none');
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
    const [taskFilters, setTaskFilters] = useState({
        projectName: "",
        assignedTo: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const [employeeFilters, setEmployeeFilters] = useState({
        employeeId: "",
        name: "",
        role: "", // Department
        designation: "", // Role
        workType: "",
        email: ""
    });
    const [filteredEmployees, setFilteredEmployees] = useState([]);

    // Leave Management State
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [attendanceHistory, setAttendanceHistory] = useState([]); // New State for History

    // Attendance Filters State
    const [attendanceFilters, setAttendanceFilters] = useState({
        fromDate: "",
        toDate: "",
        name: "",
        employeeId: "",
        status: ""
    });

    // Leave History Filters State
    const [leaveHistoryFilters, setLeaveHistoryFilters] = useState({
        name: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    // Filter Logic for Leave History
    const filteredLeaves = leaves.filter(leave => {
        let matchDate = true;

        if (leaveHistoryFilters.fromDate) {
            // Check if appliedOn exists, fallback to createdAt or check if date string is valid
            const d = leave.appliedOn ? new Date(leave.appliedOn) : new Date();
            const leaveDate = d.toISOString().split('T')[0];
            matchDate = matchDate && leaveDate >= leaveHistoryFilters.fromDate;
        }
        if (leaveHistoryFilters.toDate) {
            const d = leave.appliedOn ? new Date(leave.appliedOn) : new Date();
            const leaveDate = d.toISOString().split('T')[0];
            matchDate = matchDate && leaveDate <= leaveHistoryFilters.toDate;
        }

        const matchName = !leaveHistoryFilters.name || leave.employeeId?.name.toLowerCase().includes(leaveHistoryFilters.name.toLowerCase());
        const matchStatus = !leaveHistoryFilters.status || leave.status === leaveHistoryFilters.status;

        return matchDate && matchName && matchStatus;
    });

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedLeaveToReject, setSelectedLeaveToReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);

    // Employee Filtering Logic
    useEffect(() => {
        let result = employees;
        if (employeeFilters.employeeId) {
            result = result.filter(e => e.employeeId?.toLowerCase().includes(employeeFilters.employeeId.toLowerCase()));
        }
        if (employeeFilters.name) {
            result = result.filter(e => e.name?.toLowerCase().includes(employeeFilters.name.toLowerCase()));
        }
        if (employeeFilters.role) {
            result = result.filter(e => e.role === employeeFilters.role);
        }
        if (employeeFilters.designation) {
            result = result.filter(e => e.designation === employeeFilters.designation);
        }
        if (employeeFilters.workType) {
            result = result.filter(e => e.workType === employeeFilters.workType);
        }
        if (employeeFilters.email) {
            result = result.filter(e => e.email?.toLowerCase().includes(employeeFilters.email.toLowerCase()));
        }
        setFilteredEmployees(result);
    }, [employees, employeeFilters]);

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
        if (taskFilters.projectName) {
            result = result.filter(t => t.projectName === taskFilters.projectName);
        }
        if (taskFilters.assignedTo) {
            result = result.filter(t => {
                if (Array.isArray(t.assignedTo)) return t.assignedTo.includes(taskFilters.assignedTo);
                return t.assignedTo === taskFilters.assignedTo;
            });
        }
        if (taskFilters.fromDate) {
            result = result.filter(t => t.startDate >= taskFilters.fromDate);
        }
        if (taskFilters.toDate) {
            result = result.filter(t => t.startDate <= taskFilters.toDate);
        }
        if (taskFilters.status) {
            result = result.filter(t => t.status === taskFilters.status);
        }

        setFilteredTasks(result);
        setFilteredTasks(result);
    }, [allTasks, taskFilters, viewMode]);

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

    // Unique Roles (Department) for Dropdown
    const uniqueRoles = [...new Set(employees.map(e => e.role).filter(Boolean))];
    // Unique Designations (Role in UI)
    const uniqueDesignations = [...new Set(employees.map(e => e.designation).filter(Boolean))];
    // Unique Work Types
    const uniqueWorkTypes = [...new Set(employees.map(e => e.workType).filter(Boolean))];

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
        let matchDate = true;
        if (attendanceFilters.fromDate) matchDate = matchDate && record.date >= attendanceFilters.fromDate;
        if (attendanceFilters.toDate) matchDate = matchDate && record.date <= attendanceFilters.toDate;

        const matchName = !attendanceFilters.name || record.employeeId?.name.toLowerCase().includes(attendanceFilters.name.toLowerCase());
        const matchId = !attendanceFilters.employeeId || record.employeeId?.employeeId.toLowerCase().includes(attendanceFilters.employeeId.toLowerCase());
        const matchStatus = !attendanceFilters.status || record.status === attendanceFilters.status;

        return matchDate && matchName && matchId && matchStatus;
    });



    // Filter Logic for Leave History


    // Calculate Dynamic Stats
    const presentCount = filteredHistory.filter(r => r.status === 'Present').length;
    const absentCount = filteredHistory.filter(r => r.status === 'Absent').length;

    const groupAttendanceByDate = (history) => {
        const groups = {
            Today: [],
            Yesterday: [],
            LastWeek: [],
            OldDays: []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        history.forEach(record => {
            if (!record.employeeId) return; // Skip if employee populated failed

            const recordDate = new Date(record.date); // record.date is YYYY-MM-DD string
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() === today.getTime()) {
                groups.Today.push(record);
            } else if (recordDate.getTime() === yesterday.getTime()) {
                groups.Yesterday.push(record);
            } else if (recordDate > lastWeek) {
                groups.LastWeek.push(record);
            } else {
                groups.OldDays.push(record);
            }
        });

        return groups;
    };

    const groupWorkingHoursByDate = (history) => {
        const groups = {};
        const presentOnly = history.filter(r => r.status === "Present" && r.employeeId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        presentOnly.forEach(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            let groupName = "";
            if (recordDate.getTime() === today.getTime()) {
                groupName = "Today";
            } else if (recordDate.getTime() === yesterday.getTime()) {
                groupName = "Yesterday";
            } else {
                const d = recordDate.getDate().toString().padStart(2, '0');
                const m = (recordDate.getMonth() + 1).toString().padStart(2, '0');
                const y = recordDate.getFullYear();
                groupName = `${d}-${m}-${y}`;
            }

            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(record);
        });

        const sortedGroups = {};
        if (groups["Today"]) sortedGroups["Today"] = groups["Today"];
        if (groups["Yesterday"]) sortedGroups["Yesterday"] = groups["Yesterday"];

        // Sort remaining dates descending
        const otherDates = Object.keys(groups).filter(k => k !== "Today" && k !== "Yesterday").sort((a, b) => {
            const [d1, m1, y1] = a.split('-');
            const [d2, m2, y2] = b.split('-');
            return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
        });

        otherDates.forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    };

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative">
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
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                            <div className="mt-3">
                                <p className="text-xl font-medium text-gray-500 mb-1">Hi, Welcome Back 👋</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-gray-800 tracking-tight leading-none">
                                        {user.name?.toUpperCase()}
                                    </h2>
                                    <p className="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-wide">
                                        {user.designation || (Array.isArray(user.role) ? user.role.join(" - ") : user.role)}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-1.5">
                                    <FaEnvelope /> {user.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-10">
                            {/* Attendance Section */}
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div
                                        onClick={() => setViewMode(viewMode === 'present' ? 'none' : 'present')}
                                        className="bg-gradient-to-r from-emerald-500 to-green-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div>
                                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Present</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {employees.filter(e => e.status === "Present").length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full">
                                            <MdCheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setViewMode(viewMode === 'absent' ? 'none' : 'absent')}
                                        className="bg-gradient-to-r from-rose-500 to-red-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div>
                                            <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">Absent</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {employees.filter(e => e.status === "Absent").length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full">
                                            <MdCancel className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setViewMode(viewMode === 'attendance_sheet' ? 'none' : 'attendance_sheet')}
                                        className="bg-gradient-to-r from-blue-500 to-indigo-400 rounded-lg shadow-sm p-4 text-white flex justify-between items-center transition hover:shadow-md cursor-pointer hover:scale-105"
                                    >
                                        <div>
                                            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Attendance</p>
                                            <h3 className="text-2xl font-bold mt-1">
                                                {employees.length}
                                            </h3>
                                        </div>
                                        <div className="p-2 bg-white bg-opacity-20 rounded-full">
                                            <FaClipboardList className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs font-mono bg-white border border-gray-200 px-5 py-5 rounded shadow-sm text-gray-600 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                        <div onClick={() => setViewMode(viewMode === 'total' ? 'none' : 'total')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Employees"
                                count={employees.length}
                                color="border-blue-500"
                                icon={<FaUsers />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'total_projects' ? 'none' : 'total_projects');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Projects"
                                count={stats.totalProjects}
                                color="border-purple-500"
                                icon={<FaProjectDiagram />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'total_tasks' ? 'none' : 'total_tasks');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Tasks"
                                count={stats.totalTasks}
                                color="border-indigo-500"
                                icon={<FaTasks />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'pending_tasks' ? 'none' : 'pending_tasks');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Pending Tasks"
                                count={stats.pendingTasks}
                                color="border-amber-500"
                                icon={<MdPendingActions />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'active_tasks' ? 'none' : 'active_tasks');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Active Tasks"
                                count={stats.activeTasks}
                                color="border-emerald-500"
                                icon={<FaCheckCircle />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'leave_requests' ? 'none' : 'leave_requests');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Leave Requests"
                                count={pendingLeaves.length}
                                color="border-rose-500"
                                icon={<FaClipboardList />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'all_leaves' ? 'none' : 'all_leaves');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Leaves"
                                count={leaves.length}
                                color="border-pink-500"
                                icon={<FaHistory />}
                            />
                        </div>

                        <div onClick={() => {
                            setViewMode(viewMode === 'working_hours' ? 'none' : 'working_hours');
                        }} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Working Hours"
                                count={employees.length}
                                color="border-teal-500"
                                icon={<MdDateRange />}
                            />
                        </div>
                    </div>

                    {/* Dynamic Employee Table Section */}
                    {['total', 'present', 'absent', 'attendance_sheet', 'working_hours'].includes(viewMode) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {viewMode === 'total' && "All Employees"}
                                    {viewMode === 'present' && "Present Employees"}
                                    {viewMode === 'absent' && "Absent Employees"}
                                    {viewMode === 'attendance_sheet' && "Daily Attendance Sheet"}
                                    {viewMode === 'working_hours' && "Working Hours"}
                                </h3>
                            </div>

                            {/* Filter Navbar (Only for Total View) */}
                            {viewMode === 'total' && (
                                <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:flex lg:items-end gap-2 lg:gap-4">
                                    {/* Employee ID */}
                                    <div className="w-full lg:flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Employee ID</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={employeeFilters.employeeId}
                                                onChange={(e) => setEmployeeFilters({ ...employeeFilters, employeeId: e.target.value })}
                                                placeholder="Search ID"
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                            />
                                            <FaIdCard className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Full Name */}
                                    <div className="w-full lg:flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={employeeFilters.name}
                                                onChange={(e) => setEmployeeFilters({ ...employeeFilters, name: e.target.value })}
                                                placeholder="Search Name"
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                            />
                                            <FaUser className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="w-full lg:flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email Address</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={employeeFilters.email}
                                                onChange={(e) => setEmployeeFilters({ ...employeeFilters, email: e.target.value })}
                                                placeholder="Search Email"
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                            />
                                            <FaEnvelope className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Department Filter */}
                                    <div className="w-full lg:flex-1">
                                        <CustomDropdown
                                            label="Department"
                                            options={[
                                                { value: "", label: "All Departments" },
                                                { value: "SM Developer", label: "SM Developer", icon: FaUserTag },
                                                { value: "SM SEO Specialist", label: "SM SEO Specialist", icon: FaUserTag },
                                                { value: "SM Designer", label: "SM Designer", icon: FaUserTag },
                                                { value: "Website Developer", label: "Website Developer", icon: FaUserTag },
                                                { value: "Full Stack Developer", label: "Full Stack Developer", icon: FaUserTag },
                                                { value: "Sales Team", label: "Sales Team", icon: FaUserTag }
                                            ]}
                                            value={employeeFilters.role}
                                            onChange={(val) => setEmployeeFilters({ ...employeeFilters, role: val })}
                                            placeholder="All Departments"
                                        />
                                    </div>

                                    {/* Role Filter (Designation) */}
                                    <div className="w-full lg:flex-1">
                                        <CustomDropdown
                                            label="Role"
                                            options={[
                                                { value: "", label: "All Roles" },
                                                ...uniqueDesignations.map(d => ({ value: d, label: d, icon: FaUserTag }))
                                            ]}
                                            value={employeeFilters.designation}
                                            onChange={(val) => setEmployeeFilters({ ...employeeFilters, designation: val })}
                                            placeholder="All Roles"
                                        />
                                    </div>

                                    {/* Work Type Filter */}
                                    <div className="w-full lg:flex-1">
                                        <CustomDropdown
                                            label="Work Type"
                                            options={[
                                                { value: "", label: "All Work Types" },
                                                ...uniqueWorkTypes.map(w => ({ value: w, label: w, icon: FaUserTag }))
                                            ]}
                                            value={employeeFilters.workType}
                                            onChange={(val) => setEmployeeFilters({ ...employeeFilters, workType: val })}
                                            placeholder="All Work Types"
                                        />
                                    </div>

                                    {/* Reset Button */}
                                    <div className="flex justify-end lg:justify-start lg:w-auto">
                                        <button
                                            onClick={() => setEmployeeFilters({ employeeId: "", name: "", role: "", designation: "", workType: "", email: "" })}
                                            className="h-[38px] w-[38px] bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                            title="Reset Filters"
                                        >
                                            <FaRedo />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {viewMode !== 'attendance_sheet' && viewMode !== 'working_hours' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
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
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Department</th>
                                                        {viewMode === 'absent' && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Email Address</th>}
                                                    </>
                                                )}

                                                {/* Columns specific to View Mode */}
                                                {viewMode === 'present' && (
                                                    <>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Login Time</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%] text-center">Login Hours</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-emerald-600 w-[10%] text-center">Active Hours</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-amber-600 w-[10%] text-center">Idle Hours</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%] text-center">Logout Time</th>
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
                                                                <td className="px-6 py-4 font-semibold text-gray-800 text-sm">{emp.name}</td>
                                                                <td className="px-6 py-4 align-middle">
                                                                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                        {Array.isArray(emp.role) ? emp.role.join(", ") : emp.role}
                                                                    </span>
                                                                </td>
                                                                {viewMode === 'absent' && <td className="px-6 py-4 text-blue-600 text-sm">{emp.email || "-"}</td>}
                                                            </>
                                                        )}

                                                        {/* Present View Extra Column */}
                                                        {viewMode === 'present' && (
                                                            <>
                                                                <td className="px-6 py-4 font-mono text-gray-600 text-sm text-center">
                                                                    {emp.loginTime ? new Date(emp.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-gray-700 font-bold text-sm text-center">
                                                                    {formatHHMMSS(emp.activeTime + emp.idleTime)}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-emerald-600 font-bold text-sm text-center">
                                                                    {emp.formattedActiveTime || "00:00:00"}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-amber-600 font-bold text-sm text-center">
                                                                    {emp.formattedIdleTime || "00:00:00"}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-indigo-600 font-bold text-sm text-center">
                                                                    {emp.logoutTime ? new Date(emp.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
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
                                            {viewMode === 'total' && employees.length === 0 && (
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
                            ) : (
                                // ATTENDANCE SHEET (GROUPED HISTORY VIEW - SIMPLIFIED)
                                <div className="flex flex-col gap-6 p-4">

                                    {/* Filter Navbar */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">

                                        <div className="flex flex-wrap items-end gap-4">
                                            {/* From Date */}
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
                                                <input
                                                    type="date"
                                                    value={attendanceFilters.fromDate || ""}
                                                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, fromDate: e.target.value })}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                                />
                                            </div>

                                            {/* To Date */}
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
                                                <input
                                                    type="date"
                                                    value={attendanceFilters.toDate || ""}
                                                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, toDate: e.target.value })}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                                />
                                            </div>

                                            {/* Name Filter */}
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Employee Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Search Name..."
                                                    value={attendanceFilters.name}
                                                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, name: e.target.value })}
                                                    className="w-[200px] px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                                />
                                            </div>

                                            {/* ID Filter */}
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Employee ID</label>
                                                <input
                                                    type="text"
                                                    placeholder="Search ID..."
                                                    value={attendanceFilters.employeeId}
                                                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, employeeId: e.target.value })}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                                />
                                            </div>

                                            {/* Status Filter */}
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                                <select
                                                    value={attendanceFilters.status}
                                                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, status: e.target.value })}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium appearance-none cursor-pointer h-[38px]"
                                                >
                                                    <option value="">All Statuses</option>
                                                    <option value="Present">Present</option>
                                                    <option value="Absent">Absent</option>
                                                </select>
                                            </div>

                                            {/* Reset Button */}
                                            <div className="flex flex-col">
                                                <div className="h-[21px] mb-1"></div> {/* Spacer for alignment with labels */}
                                                <button
                                                    onClick={() => setAttendanceFilters({ fromDate: "", toDate: "", name: "", employeeId: "", status: "" })}
                                                    className="px-4 h-[38px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                >
                                                    Reset Filters
                                                </button>
                                            </div>

                                            {/* Conditional Stats - Only show if any filter is active */}
                                            {(attendanceFilters.fromDate || attendanceFilters.toDate || attendanceFilters.name || attendanceFilters.employeeId || attendanceFilters.status) && (
                                                <>
                                                    <div className="w-px h-[38px] bg-gray-200 mx-2"></div> {/* Divider */}

                                                    {/* Present Box */}
                                                    <div className="flex flex-col">
                                                        <div className="h-[21px] mb-1"></div>
                                                        <div className="flex items-center justify-center gap-2 px-3 h-[38px] bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm min-w-[100px]">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            <span className="text-emerald-700 font-bold text-sm">Present: {presentCount}</span>
                                                        </div>
                                                    </div>

                                                    {/* Absent Box */}
                                                    <div className="flex flex-col">
                                                        <div className="h-[21px] mb-1"></div>
                                                        <div className="flex items-center justify-center gap-2 px-3 h-[38px] bg-rose-50 border border-rose-100 rounded-lg shadow-sm min-w-[100px]">
                                                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                            <span className="text-rose-700 font-bold text-sm">Absent: {absentCount}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {viewMode === 'attendance_sheet' && Object.entries(groupAttendanceByDate(filteredHistory)).map(([group, records]) => {
                                        if (records.length === 0) return null;
                                        return (
                                            <div key={group} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-4">
                                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                                    <h4 className="font-bold text-gray-700 uppercase tracking-widest text-xs">
                                                        {group === 'OldDays' ? 'Older Records' : group.replace(/([A-Z])/g, ' $1').trim()}
                                                    </h4>
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
                                                                <th className="p-4 font-medium">Department</th>
                                                                <th className="p-4 font-medium text-center">Login Time</th>
                                                                <th className="p-4 font-medium text-center">Login Hours</th>
                                                                <th className="p-4 font-medium text-center text-emerald-600">Active Hours</th>
                                                                <th className="p-4 font-medium text-center text-amber-600">Idle Hours</th>
                                                                <th className="p-4 font-medium text-center">Logout Time</th>
                                                                <th className="p-4 font-medium text-center text-indigo-600">Total Hours</th>
                                                                <th className="p-4 font-medium text-center text-purple-600">Log Hours</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {records.map(recordData => {
                                                                const emp = recordData.employeeId;
                                                                return (
                                                                    <tr key={`${recordData._id}`} className="hover:bg-blue-50/30 transition-colors text-sm text-gray-700">
                                                                        <td className="p-4">
                                                                            <div className="font-bold text-gray-800">{emp?.name || "Unknown"}</div>
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {Array.isArray(emp?.role) ? emp.role.map((r, i) => (
                                                                                    <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-normal">
                                                                                        {r}
                                                                                    </span>
                                                                                )) : (
                                                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-normal">{emp?.role}</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 font-mono text-gray-600 text-xs text-center">
                                                                            {recordData.loginTime ? new Date(recordData.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-gray-700 font-bold text-xs text-center">
                                                                            {formatHHMMSS(recordData.activeTime + recordData.idleTime)}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-emerald-600 font-bold text-xs text-center">
                                                                            {recordData.formattedActiveTime || "00:00:00"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-amber-600 font-bold text-xs text-center">
                                                                            {recordData.formattedIdleTime || "00:00:00"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-indigo-600 font-bold text-xs text-center">
                                                                            {recordData.logoutTime ? new Date(recordData.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-indigo-600 font-bold text-xs text-center">
                                                                            {calculateDayHours(recordData.loginTime, recordData.logoutTime)}
                                                                        </td>
                                                                        <td className="p-4 font-mono text-purple-600 font-bold text-xs text-center">
                                                                            {recordData.logHours || "-"}
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
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {viewMode === 'total_projects' && "All Project Tasks"}
                                        {viewMode === 'total_tasks' && "All Tasks"}
                                        {viewMode === 'pending_tasks' && "Pending Tasks"}
                                        {viewMode === 'active_tasks' && "Active Tasks"}
                                    </h3>
                                </div>

                                {/* Task Filter Navbar */}
                                <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                                    {/* From Date */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={taskFilters.fromDate}
                                                onChange={(e) => setTaskFilters({ ...taskFilters, fromDate: e.target.value })}
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
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
                                                value={taskFilters.toDate}
                                                onChange={(e) => setTaskFilters({ ...taskFilters, toDate: e.target.value })}
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium h-[38px]"
                                            />
                                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Project Filter */}
                                    <CustomDropdown
                                        label="Project"
                                        options={[
                                            { value: "", label: "All Projects" },
                                            ...uniqueProjects.map(p => ({ value: p, label: p, icon: FaProjectDiagram }))
                                        ]}
                                        value={taskFilters.projectName}
                                        onChange={(val) => setTaskFilters({ ...taskFilters, projectName: val })}
                                        placeholder="All Projects"
                                    />

                                    {/* Assigned To Filter */}
                                    <CustomDropdown
                                        label="Assigned To"
                                        options={[
                                            { value: "", label: "All Employees" },
                                            ...employees.map(e => ({ value: e._id, label: e.name, icon: FaUser }))
                                        ]}
                                        value={taskFilters.assignedTo}
                                        onChange={(val) => setTaskFilters({ ...taskFilters, assignedTo: val })}
                                        placeholder="All Employees"
                                    />

                                    {/* Status Filter (Only for Total Views) */}
                                    {(viewMode === 'total_projects' || viewMode === 'total_tasks') && (
                                        <CustomDropdown
                                            label="Status"
                                            options={[
                                                { value: "", label: "All Statuses" },
                                                ...uniqueTaskStatuses.map(s => ({ value: s, label: s, icon: FaTasks }))
                                            ]}
                                            value={taskFilters.status}
                                            onChange={(val) => setTaskFilters({ ...taskFilters, status: val })}
                                            placeholder="All Statuses"
                                        />
                                    )}

                                    {/* Reset Button */}
                                    <div className="flex justify-end lg:justify-start">
                                        <button
                                            onClick={() => setTaskFilters({ projectName: "", assignedTo: "", fromDate: "", toDate: "", status: "" })}
                                            className="h-[38px] w-[38px] bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                            title="Reset Filters"
                                        >
                                            <FaRedo />
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[3%] text-center">S.No</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Assigned By & To</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Project Name</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Task Title</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[20%]">Description</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[6%]">Start Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                        No tasks found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredTasks.map((task, index) => (
                                                    <tr key={task._id}
                                                        onClick={() => setSelectedTaskForDetails(task)}
                                                        className="hover:bg-indigo-50/30 transition-colors group cursor-pointer text-sm border-b border-gray-50 last:border-none">
                                                        <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 align-middle">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                                                                    <span className="text-gray-400 font-semibold uppercase text-[10px]">By</span>
                                                                    <span className="font-bold text-gray-700">{task.assignedBy?.name || "Admin"}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit">
                                                                    <span className="text-indigo-400 font-semibold uppercase text-[10px]">To</span>
                                                                    <span className="font-bold text-indigo-700">
                                                                        {(() => {
                                                                            const assignees = task.assignedTo || [];
                                                                            if (assignees.length === 0) return "UNASSIGNED";
                                                                            return assignees.map(item => {
                                                                                if (typeof item === 'object' && item !== null && item.name) return item.name;
                                                                                const emp = employees.find(e => e._id === item);
                                                                                return emp ? emp.name : "Unknown";
                                                                            }).join(", ");
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-gray-800 align-middle">{task.projectName}</td>
                                                        <td className="px-6 py-4 font-semibold text-gray-800 align-middle max-w-[150px] truncate" title={task.taskTitle}>{task.taskTitle}</td>
                                                        <td className="px-6 py-4 text-gray-500 align-middle min-w-[250px]" title={task.description}>
                                                            <div className="line-clamp-2 leading-relaxed text-xs">{task.description}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs align-middle whitespace-nowrap">{task.startDate}</td>
                                                        <td className="px-6 py-4 align-middle">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${task.status === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                                task.status === "In Progress" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                                                    task.status === "Overdue" ? "bg-red-50 text-red-600 border border-red-100" :
                                                                        "bg-gray-50 text-gray-600 border border-gray-100"
                                                                }`}>
                                                                {task.status}
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

                    {/* Leave Requests Table */}
                    {
                        viewMode === 'leave_requests' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 animate-fade-in-up">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800">Pending Leave Requests</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
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
                                    <h3 className="text-lg font-bold text-gray-800">All Leave History</h3>
                                </div>

                                {/* Leave History Filter Navbar */}
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap lg:flex-nowrap gap-4 items-end">
                                    {/* Name Filter */}
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Employee Name</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={leaveHistoryFilters.name}
                                                onChange={(e) => setLeaveHistoryFilters({ ...leaveHistoryFilters, name: e.target.value })}
                                                placeholder="Search Name"
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium"
                                            />
                                            <FaUser className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Status Filter */}
                                    <div className="flex-1 min-w-[180px]">
                                        <CustomDropdown
                                            label="Status"
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

                                    {/* From Date */}
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Applied From</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={leaveHistoryFilters.fromDate}
                                                onChange={(e) => setLeaveHistoryFilters({ ...leaveHistoryFilters, fromDate: e.target.value })}
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium"
                                            />
                                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* To Date */}
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Applied To</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={leaveHistoryFilters.toDate}
                                                onChange={(e) => setLeaveHistoryFilters({ ...leaveHistoryFilters, toDate: e.target.value })}
                                                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-700 font-medium"
                                            />
                                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Reset Button */}
                                    <div className="min-w-[120px]">
                                        <button
                                            onClick={() => setLeaveHistoryFilters({ name: "", fromDate: "", toDate: "", status: "" })}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 h-[38px]"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
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
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all bg-gray-50 min-h-[100px] resize-none text-sm"
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
