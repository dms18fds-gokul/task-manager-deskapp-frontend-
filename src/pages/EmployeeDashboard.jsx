import React, { useEffect, useState } from "react";
import { API_URL } from "../utils/config";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import StatCard from "../components/StatCard";
import TaskDetailsModal from "../components/TaskDetailsModal";
import LogEntryModal from "../components/LogEntryModal";
import LeaveDetailsModal from "../components/LeaveDetailsModal"; // Verified Import
import CustomDropdown from "../components/CustomDropdown";
import { FaTasks, FaClipboardList, FaEllipsisV, FaEye, FaCheck, FaTimes, FaExclamationCircle, FaEnvelope, FaCalendarAlt, FaRedo } from "react-icons/fa";
import { MdPendingActions, MdCheckCircle, MdCancel } from "react-icons/md";

const EmployeeDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [invitationsList, setInvitationsList] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [leavesList, setLeavesList] = useState([]); // Store list of leaves
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        completed: 0,
        invitations: 0,
        today: 0,
        leaves: 0
    });
    const [activeCard, setActiveCard] = useState(null); // 'total', 'inProgress', 'completed', 'invitations', 'today', 'leaves'
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [selectedLeave, setSelectedLeave] = useState(null); // For Leave Details Modal
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);
    const [openLeaveDropdownId, setOpenLeaveDropdownId] = useState(null); // For Leave Table Dropdown
    const [selectedRejectionReason, setSelectedRejectionReason] = useState(null);

    // Filter State
    const [filters, setFilters] = useState({
        project: "",
        priority: "",
        status: "",
        fromDate: "",
        toDate: ""
    });

    // Log Modal State

    const [showLogModal, setShowLogModal] = useState(false);
    const [taskForLog, setTaskForLog] = useState(null);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            navigate("/login");
        } else {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role === "Super Admin") {
                navigate("/dashboard"); // Redirect Super Admin to admin dashboard
            } else {
                setUser(parsedUser);
                fetchAttendanceStatus(parsedUser.id || parsedUser._id);
                fetchTasks(parsedUser.id || parsedUser._id);
                fetchInvitations(parsedUser.id || parsedUser._id);
                fetchLeaves(parsedUser.id || parsedUser._id);
            }
        }
    }, [navigate]);

    const fetchAttendanceStatus = async (employeeId) => {
        try {
            const res = await fetch(`${API_URL}/attendance/status/${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setAttendance(data);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    const fetchLeaves = async (employeeId) => {
        try {
            const res = await fetch(`${API_URL}/leave/my-leaves/${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setLeavesList(data); // Save full list
                setStats(prev => ({ ...prev, leaves: data.length }));
            }
        } catch (error) {
            console.error("Error fetching leaves:", error);
        }
    };

    const fetchTasks = async (employeeId) => {
        try {
            // Using getTasksByEmployee to get all assigned tasks (History + Active)
            // Or use my-tasks for current active ones. 
            // Requests says "Total Tasks card... count of tasks assigned". Usually implies All.
            const res = await fetch(`${API_URL}/tasks/employee/${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);

                // Calculate stats
                const total = data.length;
                const inProgress = data.filter(t => t.status === "In Progress").length;
                const completed = data.filter(t => t.status === "Completed").length;

                // Today's tasks (StartDate is today OR Deadline is today? Or Logged work today?)
                // Usually "Today's Tasks" means tasks scheduled for today.
                const todayStr = new Date().toISOString().split('T')[0];
                const todayCount = data.filter(t => t.startDate === todayStr || t.deadline === todayStr).length;

                setStats(prev => ({ ...prev, total, inProgress, completed, today: todayCount }));
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    const fetchInvitations = async (employeeId) => {
        try {
            const res = await fetch(`${API_URL}/tasks/my-invitations?userId=${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setInvitationsList(data);
                setStats(prev => ({ ...prev, invitations: data.length }));
            }
        } catch (error) {
            console.error("Error fetching invitations:", error);
        }
    };

    const handleAttendanceAction = async (action) => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/attendance/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId: user.id || user._id }),
            });
            if (res.ok) {
                const data = await res.json();
                setAttendance(data.attendance); // Update state with latest attendance object
            } else {
                const err = await res.json();
                alert(err.message);
            }
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTaskDropdown = (id) => {
        setOpenTaskDropdownId(openTaskDropdownId === id ? null : id);
        setOpenLeaveDropdownId(null);
    };

    const toggleLeaveDropdown = (e, id) => {
        e.stopPropagation();
        setOpenLeaveDropdownId(prev => prev === id ? null : id);
        setOpenTaskDropdownId(null);
        setSelectedLeave(null); // Ensure modal is closed when toggling dropdown
    };

    const handleCardClick = (cardType) => {
        if (activeCard === cardType) {
            setActiveCard(null); // Toggle off if already active
        } else {
            setActiveCard(cardType);
        }
    };

    const handleStatusChange = (taskId, newStatus) => {
        const task = tasks.find(t => t._id === taskId);
        setTaskForLog(task);
        setPendingStatusUpdate({ taskId, newStatus });
        setShowLogModal(true);
    };

    const confirmStatusUpdate = async () => {
        if (!pendingStatusUpdate) return;
        const { taskId, newStatus } = pendingStatusUpdate;

        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                // Update tasks state
                setTasks(prevTasks => {
                    const updatedTasks = prevTasks.map(task =>
                        task._id === taskId ? { ...task, status: newStatus } : task
                    );

                    // Also need to recalculate stats based on updatedTasks
                    const total = updatedTasks.length;
                    const inProgress = updatedTasks.filter(t => t.status === "In Progress").length;
                    const completed = updatedTasks.filter(t => t.status === "Completed").length;
                    // Invitations is separate list
                    // Today needs check
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayCount = updatedTasks.filter(t => t.startDate === todayStr || t.deadline === todayStr).length;

                    setStats(prev => ({
                        ...prev,
                        total,
                        inProgress,
                        completed,
                        today: todayCount
                    }));

                    return updatedTasks;
                });
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status");
        }
    };

    const getGroupedTasks = () => {
        let currentList = [];
        if (!activeCard) return {};

        // 1. Filter by Card Type
        switch (activeCard) {
            case 'total':
                currentList = tasks;
                break;
            case 'inProgress':
                currentList = tasks.filter(t => t.status === "In Progress");
                break;
            case 'completed':
                currentList = tasks.filter(t => t.status === "Completed");
                break;
            case 'invitations':
                currentList = invitationsList;
                break;
            case 'today':
                const todayStr = new Date().toISOString().split('T')[0];
                currentList = tasks.filter(t => t.startDate === todayStr || t.deadline === todayStr);
                break;
            default:
                currentList = [];
        }

        // 2. Apply Manual Filters
        if (filters.project) {
            currentList = currentList.filter(t => t.projectName?.toLowerCase().includes(filters.project.toLowerCase()));
        }
        if (filters.priority) {
            currentList = currentList.filter(t => t.priority === filters.priority);
        }
        if (filters.status) {
            currentList = currentList.filter(t => t.status === filters.status);
        }
        if (filters.fromDate) {
            currentList = currentList.filter(t => {
                if (!t.startDate) return false;
                return new Date(t.startDate) >= new Date(filters.fromDate);
            });
        }
        if (filters.toDate) {
            currentList = currentList.filter(t => {
                if (!t.startDate) return false;
                return new Date(t.startDate) <= new Date(filters.toDate);
            });
        }

        // 3. Group by Date
        const grouped = {
            "Today": [],
            "Yesterday": [],
            "Last Week": [],
            "Old Tasks": []
        };

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        currentList.forEach(task => {
            if (!task.startDate) {
                grouped["Old Tasks"].push(task);
                return;
            }

            const taskDate = new Date(task.startDate);
            const isToday = taskDate.toDateString() === today.toDateString();
            const isYesterday = taskDate.toDateString() === yesterday.toDateString();
            const isLastWeek = taskDate > lastWeek && taskDate < yesterday;

            if (isToday) {
                grouped["Today"].push(task);
            } else if (isYesterday) {
                grouped["Yesterday"].push(task);
            } else if (isLastWeek) {
                grouped["Last Week"].push(task);
            } else {
                grouped["Old Tasks"].push(task);
            }
        });

        return grouped;
    };

    const groupedTasks = getGroupedTasks();
    const uniqueProjects = [...new Set(tasks.map(t => t.projectName))];

    const getTableTitle = () => {
        switch (activeCard) {
            case 'total': return "Your Total Tasks";
            case 'inProgress': return "In-Progress Tasks";
            case 'completed': return "Completed Tasks";
            case 'invitations': return "New Task Invitations";
            case 'today': return "Today's Tasks";
            default: return "";
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header (Mobile toggle) */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
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
                        <div className="text-xs font-mono bg-white border border-gray-200 px-5 py-5 rounded shadow-sm text-gray-600 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-green-50 mr-2"></span>
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Attendance Box */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 transition-all hover:shadow-md">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <FaClipboardList size={20} />
                                    </span>
                                    Attendance Tracker
                                </h2>
                                <p className="text-gray-500 text-xs mt-1 ml-10">Manage your daily work schedule efficiently.</p>
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                <span className="text-gray-500 text-sm font-medium">Current Status:</span>
                                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide shadow-sm ${attendance?.status === "Present" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-200 text-gray-600 border border-gray-300"}`}>
                                    {attendance?.status || "Absent"}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center mb-6">
                            <button
                                onClick={() => {
                                    if (!attendance?.loginTime) {
                                        handleAttendanceAction("login");
                                    } else if (!attendance?.logoutTime) {
                                        handleAttendanceAction("logout");
                                    }
                                }}
                                disabled={loading || !!attendance?.logoutTime}
                                className={`relative w-full md:w-2/3 group overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl border ${attendance?.logoutTime
                                    ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-70"
                                    : !attendance?.loginTime
                                        ? "bg-white border-indigo-100 hover:border-indigo-300"
                                        : "bg-white border-rose-100 hover:border-rose-300"
                                    }`}
                            >
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${attendance?.logoutTime ? ""
                                    : !attendance?.loginTime ? "bg-indigo-600"
                                        : "bg-rose-600"
                                    }`}></div>

                                <div className="flex items-center justify-between z-10 relative">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-xl shadow-md transition-all duration-300 group-hover:scale-110 ${attendance?.logoutTime
                                            ? "bg-gray-200 text-gray-400"
                                            : !attendance?.loginTime
                                                ? "bg-indigo-100 text-indigo-600"
                                                : "bg-rose-100 text-rose-600"
                                            }`}>
                                            {attendance?.logoutTime ? <MdCheckCircle size={32} />
                                                : !attendance?.loginTime ? <FaClipboardList size={32} />
                                                    : <MdCancel size={32} />
                                            }
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">
                                                {attendance?.logoutTime ? "Day Completed"
                                                    : !attendance?.loginTime ? "Morning Login"
                                                        : "Logout"
                                                }
                                            </h3>
                                            <p className="text-gray-500 mt-1 font-medium text-sm">
                                                {attendance?.logoutTime ? "See you tomorrow! 👋"
                                                    : !attendance?.loginTime ? "Start your day by logging in."
                                                        : "Click to end your work day."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {!attendance?.logoutTime && (
                                        <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 group-hover:bg-white transition-colors border border-gray-100">
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Status Details Footer */}
                        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">LOGIN TIME</span>
                                <span className={`text-sm font-medium ${attendance?.loginTime ? "text-gray-800" : "text-gray-400 italic"}`}>
                                    {attendance?.loginTime ? new Date(attendance.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">LOGOUT TIME</span>
                                <span className={`text-sm font-medium ${attendance?.logoutTime ? "text-gray-800" : "text-gray-400 italic"}`}>
                                    {attendance?.logoutTime ? new Date(attendance.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid - 6 columns */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                        <div onClick={() => handleCardClick('total')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Total Tasks"
                                count={stats.total}
                                color="border-indigo-500"
                                icon={<FaTasks />}
                            />
                        </div>

                        <div onClick={() => handleCardClick('inProgress')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="In-Progress"
                                count={stats.inProgress}
                                color="border-purple-500"
                                icon={<MdPendingActions />}
                            />
                        </div>

                        <div onClick={() => handleCardClick('completed')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Completed"
                                count={stats.completed}
                                color="border-emerald-500"
                                icon={<MdCheckCircle />}
                            />
                        </div>

                        <div onClick={() => handleCardClick('invitations')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Invitations"
                                count={stats.invitations}
                                color="border-blue-500"
                                icon={<FaClipboardList />}
                            />
                        </div>

                        <div onClick={() => handleCardClick('today')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Today’s Tasks"
                                count={stats.today}
                                color="border-amber-500"
                                icon={<FaClipboardList />}
                            />
                        </div>

                        {/* New Leaves Card */}
                        <div onClick={() => handleCardClick('leaves')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Leaves"
                                count={stats.leaves}
                                color="border-red-500"
                                icon={<FaClipboardList className="text-red-500" />}
                            />
                        </div>
                    </div>

                    {/* Task Table Section (Visible only when filtering is active) */}
                    {activeCard && activeCard !== 'leaves' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 animate-fade-in-up">
                            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-lg font-bold text-gray-800">{getTableTitle()}</h3>
                            </div>

                            {/* Filter Navbar */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 items-end">
                                {/* From Date */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
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
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
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
                                <div>
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
                                <div>
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
                                <div>
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

                                {/* Reset Button */}
                                <div className="flex justify-start"> {/* Align left or center? User said "fixed in the same row", Inputs are full width. Let's align it to start to match left alignment of labels, or maybe just center it. Admin has it flexible. Let's try to make it look good. Standard inputs are ~42px high. This button with p-3 is also around that. */}
                                    <button
                                        onClick={() => setFilters({ project: "", priority: "", status: "", fromDate: "", toDate: "" })}
                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center transform hover:rotate-180 duration-500"
                                        title="Reset Filters"
                                    >
                                        <FaRedo className="text-sm" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8 px-6 pb-6 py-4">
                                {Object.entries(groupedTasks).map(([group, tasks]) => {
                                    if (tasks.length === 0) return null;

                                    return (
                                        <div key={group}>
                                            <div className="flex items-center gap-2 mb-4">
                                                <h2 className="text-md font-bold text-gray-800">{group}</h2>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{tasks.length}</span>
                                            </div>

                                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                                <table className="w-full text-left border-collapse table-fixed">
                                                    <thead className="bg-gray-50/50 text-left border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Assigned By</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Project Name</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Task Title</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[20%]">Description</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Start Date</th>
                                                            <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {tasks.map((task, index) => (
                                                            <tr key={task._id}
                                                                onClick={() => setSelectedTaskForDetails(task)}
                                                                className="hover:bg-indigo-50/20 transition-all duration-200 group cursor-pointer h-16 border-l-4 border-transparent hover:border-indigo-500"
                                                            >
                                                                {/* S.No */}
                                                                <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle">
                                                                    {(index + 1).toString().padStart(2, '0')}
                                                                </td>

                                                                {/* Assigned By */}
                                                                <td className="px-6 py-4 text-sm text-gray-700 font-medium align-middle">
                                                                    {task.assignedBy?.name || "Super Admin"}
                                                                </td>

                                                                {/* Project Name */}
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-800 truncate align-middle" title={task.projectName}>
                                                                    {task.projectName}
                                                                </td>

                                                                {/* Task Title */}
                                                                <td className="px-6 py-4 text-sm font-semibold text-gray-800 truncate align-middle" title={task.taskTitle}>
                                                                    {task.taskTitle}
                                                                </td>

                                                                {/* Description */}
                                                                <td className="px-6 py-4 text-sm text-gray-600 truncate align-middle max-w-xs" title={task.description}>
                                                                    {task.description}
                                                                </td>

                                                                {/* Start Date */}
                                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium align-middle whitespace-nowrap">
                                                                    {task.startDate ? new Date(task.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                                                </td>

                                                                {/* Status */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                                                                            ${task.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                                                                                task.status === "Hold" ? "bg-amber-100 text-amber-700" :
                                                                                    task.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                                                                                        task.status === "Overdue" ? "bg-red-100 text-red-700" :
                                                                                            "bg-gray-100 text-gray-700"}`}>
                                                                            {task.status}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}

                                {Object.values(groupedTasks).every(group => group.length === 0) && (
                                    <div className="p-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                                        No items found in this category matching your filters.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Leave History Table (Visible only when 'leaves' card is active) */}
                    {/* Leave History Table (Visible only when 'leaves' card is active) */}
                    {
                        activeCard === 'leaves' && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8 animate-fade-in-up">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <FaClipboardList size={18} />
                                        </div>
                                        Leave History
                                    </h3>
                                    <span className="text-xs font-medium px-3 py-1 bg-gray-100 text-gray-500 rounded-full">
                                        {leavesList.length} Records
                                    </span>
                                </div>

                                <div className="overflow-x-auto pb-40">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 text-xs font-extrabold uppercase tracking-wider">
                                                <th className="px-6 py-4 w-[5%] text-center">S.No</th>
                                                <th className="px-6 py-4 w-[20%]">Type of Leave</th>
                                                <th className="px-6 py-4 w-[25%]">Leave Category</th>
                                                <th className="px-6 py-4 w-[15%]">Applied On</th>
                                                <th className="px-6 py-4 w-[20%]">Date / Time</th>
                                                <th className="px-6 py-4 w-[15%]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {leavesList.length > 0 ? (
                                                leavesList.map((leave, index) => (
                                                    <tr key={leave._id}
                                                        onClick={() => setSelectedLeave(leave)}
                                                        className="group hover:bg-indigo-50/20 transition-all duration-200 cursor-pointer h-16 border-l-4 border-transparent hover:border-indigo-500"
                                                    >
                                                        {/* S.No */}
                                                        <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </td>

                                                        {/* Type of Leave */}
                                                        <td className="px-6 py-4 text-sm font-semibold text-gray-800 align-middle">
                                                            <div className="flex items-center gap-3">
                                                                <span className="p-1.5 bg-gray-100 text-gray-400 rounded group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                                    <FaClipboardList size={12} />
                                                                </span>
                                                                {leave.leaveCategory}
                                                            </div>
                                                        </td>

                                                        {/* Leave Category/Type */}
                                                        <td className="px-6 py-4 text-sm text-gray-600 align-middle">
                                                            {leave.leaveType}
                                                        </td>

                                                        {/* Applied On */}
                                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium font-mono align-middle">
                                                            {leave.appliedDate}
                                                        </td>

                                                        {/* Date / Time */}
                                                        <td className="px-6 py-4 text-sm text-gray-500 align-middle">
                                                            {leave.leaveCategory === "Day Leave" ? (
                                                                <span className="font-mono">{leave.leaveDate}</span>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="font-mono">{leave.permissionDate}</span>
                                                                    <span className="text-xs text-gray-400">{leave.startTime} - {leave.endTime}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-6 py-4 align-middle">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${leave.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                leave.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                                    "bg-amber-50 text-amber-700 border-amber-200"
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${leave.status === "Approved" ? "bg-emerald-500" :
                                                                    leave.status === "Rejected" ? "bg-rose-500" :
                                                                        "bg-amber-500"
                                                                    }`}></span>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                                        No leave history found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }
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

            {/* Leave Details Modal */}
            {
                selectedLeave && (
                    <LeaveDetailsModal
                        isOpen={!!selectedLeave}
                        onClose={() => setSelectedLeave(null)}
                        leave={selectedLeave}
                    />
                )
            }

            {/* Log Entry Modal */}
            <LogEntryModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                task={taskForLog}
                targetStatus={pendingStatusUpdate?.newStatus}
                onSuccess={confirmStatusUpdate}
            />
            {/* Rejection Reason Modal */}
            {
                selectedRejectionReason && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-rose-50/50">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FaExclamationCircle className="text-rose-500" />
                                    Rejection Reason
                                </h3>
                                <button onClick={() => setSelectedRejectionReason(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <MdCancel size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 text-sm italic relative">
                                    <span className="absolute top-2 left-2 text-3xl text-gray-200 font-serif leading-none">“</span>
                                    <p className="relative z-10 px-2">{selectedRejectionReason}</p>
                                    <span className="absolute bottom-[-10px] right-2 text-3xl text-gray-200 font-serif leading-none">”</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedRejectionReason(null)}
                                    className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-gray-800 hover:bg-gray-900 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default EmployeeDashboard;
