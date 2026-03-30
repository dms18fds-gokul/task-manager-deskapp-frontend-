import React, { useEffect, useState } from "react";
import { API_URL } from "../utils/config";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import StatCard from "../components/StatCard";
import TaskDetailsModal from "../components/TaskDetailsModal";
import LogEntryModal from "../components/LogEntryModal";
import LeaveDetailsModal from "../components/LeaveDetailsModal"; // Verified Import
import CustomDropdown from "../components/CustomDropdown";
import TableLoader from "../components/TableLoader";
import { FaTasks, FaClipboardList, FaEllipsisV, FaEye, FaCheck, FaTimes, FaExclamationCircle, FaEnvelope, FaCalendarAlt, FaRedo, FaSignInAlt, FaSignOutAlt, FaClock, FaSearch, FaExternalLinkAlt, FaComments, FaPaperPlane } from "react-icons/fa";
import { MdPendingActions, MdCheckCircle, MdCancel } from "react-icons/md";

const getDateLabel = (dateStr) => {
    if (!dateStr) return "-";
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

    if (taskDateStr === today) return "Today";
    if (taskDateStr === yesterday) return "Yesterday";

    if (taskDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = taskDateStr.split('-');
        return `${d}-${m}-${y}`;
    }
    return taskDateStr;
};

const EmployeeDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [invitationsList, setInvitationsList] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [leavesList, setLeavesList] = useState([]); // Store list of leaves
    const [stats, setStats] = useState({
        total: 0,
        hold: 0,
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
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [confirmNavigation, setConfirmNavigation] = useState(null);
    const [noChannelModalOpen, setNoChannelModalOpen] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultFilter = { project: "", priority: "", status: "", fromDate: "", toDate: "" };

    // Filter State keyed by activeCard
    const [filters, setFilters] = useState({
        total: { ...defaultFilter },
        hold: { ...defaultFilter },
        completed: { ...defaultFilter },
        invitations: { ...defaultFilter },
        today: { ...defaultFilter }
    });

    const [appliedFilters, setAppliedFilters] = useState({
        total: { ...defaultFilter },
        hold: { ...defaultFilter },
        completed: { ...defaultFilter },
        invitations: { ...defaultFilter },
        today: { ...defaultFilter }
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
                fetchEmployees();
            }
        }
    }, [navigate]);

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
                setNoChannelModalOpen(true);
            }
        } catch (error) {
            alert("Error navigating to chat");
        }
    };

    const NoChannelModal = () => {
        if (!noChannelModalOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
                <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center transform transition-all scale-100">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
                        <FaComments className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Chat Channel</h3>
                    <p className="text-gray-500 mb-8">
                        There is no chat channel created for this task yet. Channels are usually created when a task is accepted.
                    </p>
                    <button
                        onClick={() => setNoChannelModalOpen(false)}
                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-3 bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
                    >
                        Got it
                    </button>
                </div>
            </div>
        );
    };

    const fetchAttendanceStatus = async (employeeId) => {
        try {
            const res = await fetch(`${API_URL}/attendance/status/${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setAttendance(data);
            }
        } catch (error) {
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
                const hold = data.filter(t => t.status === "Hold").length;
                const completed = data.filter(t => t.status === "Completed").length;

                // Today's tasks (StartDate is today OR Deadline is today? Or Logged work today?)
                // Usually "Today's Tasks" means tasks scheduled for today.
                const todayStr = new Date().toISOString().split('T')[0];
                const todayCount = data.filter(t => t.startDate === todayStr || t.deadline === todayStr).length;

                setStats(prev => ({ ...prev, total, hold, completed, today: todayCount }));
            }
        } catch (error) {
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
            setIsTableLoading(true);
            setActiveCard(cardType);
            setTimeout(() => setIsTableLoading(false), 800);
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
                    userId: user._id,
                    ...timeData
                }),
            });

            if (res.ok) {
                // Update tasks state
                setTasks(prevTasks => {
                    const updatedTasks = prevTasks.map(task =>
                        task._id === taskId ? { ...task, status: newStatus } : task
                    );

                    // Also need to recalculate stats based on updatedTasks
                    const total = updatedTasks.length;
                    const hold = updatedTasks.filter(t => t.status === "Hold").length;
                    const completed = updatedTasks.filter(t => t.status === "Completed").length;
                    // Invitations is separate list
                    // Today needs check
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayCount = updatedTasks.filter(t => t.startDate === todayStr || t.deadline === todayStr).length;

                    setStats(prev => ({
                        ...prev,
                        total,
                        hold,
                        completed,
                        today: todayCount
                    }));

                    return updatedTasks;
                });
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
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
            case 'hold':
                currentList = tasks.filter(t => t.status === "Hold");
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

        // 2. Apply Manual Filters for the currently active card
        const currentAppliedFilters = appliedFilters[activeCard] || defaultFilter;

        if (currentAppliedFilters.project) {
            currentList = currentList.filter(t => t.projectName?.toLowerCase().includes(currentAppliedFilters.project.toLowerCase()));
        }
        if (currentAppliedFilters.priority) {
            currentList = currentList.filter(t => t.priority === currentAppliedFilters.priority);
        }
        if (currentAppliedFilters.status) {
            currentList = currentList.filter(t => t.status === currentAppliedFilters.status);
        }
        if (currentAppliedFilters.fromDate) {
            currentList = currentList.filter(t => {
                if (!t.startDate) return false;
                return new Date(t.startDate) >= new Date(currentAppliedFilters.fromDate);
            });
        }
        if (currentAppliedFilters.toDate) {
            currentList = currentList.filter(t => {
                if (!t.startDate) return false;
                return new Date(t.startDate) <= new Date(currentAppliedFilters.toDate);
            });
        }

        // 2.1 Default to Today's tasks if no dates selected, unless another explicit filter is applied
        const hasExplicitFilter = currentAppliedFilters.project || currentAppliedFilters.priority || currentAppliedFilters.status;
        if (!currentAppliedFilters.fromDate && !currentAppliedFilters.toDate && !hasExplicitFilter) {
            const todayStr = new Date().toISOString().split('T')[0];
            currentList = currentList.filter(t => t.startDate === todayStr);
        }

        // 3. Group by Date using getDateLabel for dynamic groupings
        const grouped = {};

        currentList.forEach(task => {
            const label = getDateLabel(task.startDate);
            if (!grouped[label]) {
                grouped[label] = [];
            }
            grouped[label].push(task);
        });

        // Ensure "Today" and "Yesterday" come first if they exist
        const sortedGrouped = {};
        if (grouped["Today"]) {
            sortedGrouped["Today"] = grouped["Today"];
            delete grouped["Today"];
        }
        if (grouped["Yesterday"]) {
            sortedGrouped["Yesterday"] = grouped["Yesterday"];
            delete grouped["Yesterday"];
        }

        // Add dates sorted descending
        Object.keys(grouped).sort((a, b) => {
            if (a === "-") return 1;
            if (b === "-") return -1;
            const parseDateLabel = (str) => {
                const [d, m, y] = str.split('-');
                return new Date(`${y}-${m}-${d}`);
            };
            return parseDateLabel(b) - parseDateLabel(a);
        }).forEach(key => {
            sortedGrouped[key] = grouped[key];
        });

        return sortedGrouped;
    };

    const groupedTasks = getGroupedTasks();
    const uniqueProjects = [...new Set(tasks.map(t => t.projectName))];

    const getTableTitle = () => {
        switch (activeCard) {
            case 'total': return "Your Total Tasks";
            case 'hold': return "Hold Tasks";
            case 'completed': return "Completed Tasks";
            case 'invitations': return "New Task Invitations";
            case 'today': return "Today's Tasks";
            default: return "";
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

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
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Dashboard</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto w-full h-full relative space-y-4">
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 uppercase">Dashboard</h1>
                            <div className="mt-3">
                                <p className="text-md font-medium text-gray-500 mb-1 uppercase">Hi, Welcome Back 👋</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-gray-800 tracking-tight leading-none uppercase">
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
                        <div className="flex flex-col items-end gap-3">
                            {/* Date Badge */}
                            <div className="text-xs font-mono bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm text-gray-600 flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${attendance?.status === "Present" ? "bg-emerald-400 animate-pulse" : "bg-gray-300"}`}></span>
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>

                            {/* Compact Attendance Card */}
                            <div className="bg-white border border-gray-100 px-5 py-3 rounded-xl shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shadow-sm border border-blue-100">
                                        <FaSignInAlt size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">In Time</span>
                                        <span className={`text-sm font-black ${attendance?.loginTime ? "text-gray-800" : "text-gray-300"}`}>
                                            {attendance?.loginTime ? new Date(attendance.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-gray-200"></div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-50 text-rose-500 rounded-lg shadow-sm border border-rose-100">
                                        <FaSignOutAlt size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Out Time</span>
                                        <span className={`text-sm font-black ${attendance?.logoutTime ? "text-gray-800" : "text-gray-300"}`}>
                                            {attendance?.logoutTime ? new Date(attendance.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                        </span>
                                    </div>
                                </div>
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

                        <div onClick={() => handleCardClick('hold')} className="cursor-pointer transition-transform hover:scale-105">
                            <StatCard
                                title="Hold Tasks"
                                count={stats.hold}
                                color="border-purple-500"
                                icon={<FaExclamationCircle />}
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
                            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-lg font-bold text-gray-800">{getTableTitle()}</h3>
                            </div>

                            {/* Filter Navbar */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-5 mb-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                                    {/* From Date */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">From Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={filters[activeCard]?.fromDate || ""}
                                                max={filters[activeCard]?.toDate || ""}
                                                onChange={(e) => setFilters({ ...filters, [activeCard]: { ...filters[activeCard], fromDate: e.target.value } })}
                                                className="w-full px-3 py-2 pl-9 rounded text-[13px] border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium h-[38px] cursor-pointer"
                                            />
                                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* To Date */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">To Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={filters[activeCard]?.toDate || ""}
                                                min={filters[activeCard]?.fromDate || ""}
                                                onChange={(e) => setFilters({ ...filters, [activeCard]: { ...filters[activeCard], toDate: e.target.value } })}
                                                className="w-full px-3 py-2 pl-9 rounded text-[13px] border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium h-[38px] cursor-pointer"
                                            />
                                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                                        </div>
                                    </div>

                                    {/* Project Name */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project</label>
                                        <CustomDropdown
                                            searchable={true}
                                            options={[{ value: "", label: "All Projects" }, ...uniqueProjects.map(p => ({ value: p, label: p }))]}
                                            value={filters[activeCard]?.project || ""}
                                            onChange={(val) => setFilters({ ...filters, [activeCard]: { ...filters[activeCard], project: val } })}
                                            placeholder="All Projects"
                                            className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                                        />
                                    </div>


                                    {/* Priority */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                                        <CustomDropdown
                                            options={[
                                                { value: "", label: "All Priorities" },
                                                { value: "Very High", label: "Very High" },
                                                { value: "High", label: "High" },
                                                { value: "Medium", label: "Medium" },
                                                { value: "Low", label: "Low" },
                                                { value: "Very Low", label: "Very Low" }
                                            ]}
                                            value={filters[activeCard]?.priority || ""}
                                            onChange={(val) => setFilters({ ...filters, [activeCard]: { ...filters[activeCard], priority: val } })}
                                            placeholder="All Priorities"
                                            className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                                        <CustomDropdown
                                            options={[{ value: "", label: "All Statuses" }, { value: "In Progress", label: "In Progress" }, { value: "Hold", label: "Hold" }, { value: "Completed", label: "Completed" }]}
                                            value={filters[activeCard]?.status || ""}
                                            onChange={(val) => setFilters({ ...filters, [activeCard]: { ...filters[activeCard], status: val } })}
                                            placeholder="All Statuses"
                                            className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex justify-end items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const resetFilters = { project: "", priority: "", status: "", fromDate: todayStr, toDate: todayStr };
                                            setFilters({ ...filters, [activeCard]: resetFilters });
                                            setAppliedFilters({ ...appliedFilters, [activeCard]: resetFilters });
                                            setIsTableLoading(true);
                                            setTimeout(() => setIsTableLoading(false), 800);
                                        }}
                                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 rounded-lg h-[38px] text-[13px] font-bold transition-all shadow-sm flex items-center justify-center transform active:scale-95 duration-200 cursor-pointer"
                                        title="Reset Filters"
                                    >
                                        <FaRedo className="text-sm" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsTableLoading(true);
                                            setAppliedFilters({ ...appliedFilters, [activeCard]: filters[activeCard] });
                                            setTimeout(() => setIsTableLoading(false), 800);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg h-[38px] text-[13px] font-bold transition-all shadow-md flex items-center justify-center gap-2 transform active:scale-95 duration-200 whitespace-nowrap"
                                    >
                                        <FaSearch /> Fetch Data
                                    </button>
                                </div>
                            </div>

                            {isTableLoading ? (
                                <div className="py-12">
                                    <TableLoader />
                                </div>
                            ) : (
                                <div className="space-y-8 px-6 pb-6 py-4">
                                    {Object.entries(groupedTasks).map(([group, tasks]) => {
                                        if (tasks.length === 0) return null;

                                        return (
                                            <div key={group}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <h2 className="text-md font-bold text-gray-800">{group}</h2>
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{tasks.length}</span>
                                                </div>

                                                <div className="w-full overflow-x-auto custom-scrollbar rounded-xl border border-gray-100">
                                                    <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
                                                        <thead>
                                                            <tr className="bg-slate-50/80 text-left border-b border-slate-200">
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[5%] text-center">T.No</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[14%]">Assigned By & To</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">Project Name</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Description</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[10%]">Priority</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[10%]">Status</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[5%] text-center">Chats</th>
                                                                <th className="px-4 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-[5%] text-center">Edit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {tasks.map((task, index) => (
                                                                <tr key={task._id}
                                                                    onClick={() => setSelectedTaskForDetails(task)}
                                                                    className="hover:bg-indigo-50/20 transition-all duration-200 group cursor-pointer h-16 border-l-4 border-transparent hover:border-indigo-500"
                                                                >
                                                                    {/* T.No */}
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                                            <span className="text-gray-400 font-mono text-xs font-medium">
                                                                                {(tasks.length - index).toString().padStart(2, '0')}
                                                                            </span>
                                                                            <div
                                                                                className={`w-2 h-2 rounded-sm ${task.logType === 'Offline Task' || task.isPendingOffline ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                                title={task.logType === 'Offline Task' || task.isPendingOffline ? 'Offline Task' : 'Online Task'}
                                                                            ></div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Assigned By & To */}
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] uppercase font-bold text-gray-400 w-6">By:</span>
                                                                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={task.assignedBy?.name}>
                                                                                    {task.assignedBy?.name || "Super Admin"}
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
                                                                        </div>
                                                                    </td>

                                                                    {/* Project Name */}
                                                                    <td className="px-4 py-4 text-sm font-bold text-gray-800 truncate align-middle" title={task.projectName}>
                                                                        {task.projectName}
                                                                    </td>

                                                                    {/* Description */}
                                                                    <td className="px-4 py-4 text-sm text-gray-600 align-middle max-w-xs" title={task.description}>
                                                                        <div className="line-clamp-2 whitespace-normal break-words">
                                                                            {task.description}
                                                                        </div>
                                                                    </td>

                                                                    {/* Priority */}
                                                                    <td className="px-4 py-4 align-middle">
                                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-sm border ${task.priority === "Very High" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                                                task.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                                                    task.priority === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                                        task.priority === "Low" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                                            task.priority === "Very Low" ? "bg-gray-50 text-gray-500 border-gray-100" :
                                                                                                "bg-gray-50 text-gray-600 border-gray-100"
                                                                            }`}>
                                                                            {(task.priority === "High" || task.priority === "Very High") && <FaExclamationCircle className="mr-1.5 text-[10px]" />}
                                                                            {task.priority || "Medium"}
                                                                        </span>
                                                                    </td>

                                                                    {/* Status */}
                                                                    <td className="px-4 py-4 align-middle">
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

                                                                    {/* Edit */}
                                                                    <td className="px-4 py-4 text-center align-middle">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setConfirmNavigation(task); }}
                                                                            className="inline-flex items-center justify-center h-9 w-9 text-blue-500 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all shadow-sm hover:shadow active:scale-95 group-hover:border-blue-200"
                                                                            title="Navigate to Task Page"
                                                                        >
                                                                            <FaExternalLinkAlt size={14} />
                                                                        </button>
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
                            )}
                        </div>
                    )}

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

                                <div className="w-full overflow-x-auto custom-scrollbar pb-40">
                                    <table className="w-full text-left border-collapse min-w-[800px] xl:min-w-full">
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

            <NoChannelModal />

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
                                                navigate(`/employee/assign-group-task`, { state: { taskToEdit: confirmNavigation } });
                                            } else {
                                                navigate(`/employee/assign-task`, { state: { taskToEdit: confirmNavigation } });
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
                                        The employee is already working on this task, so it cannot be updated at this time.
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
        </div >
    );
};

export default EmployeeDashboard;
