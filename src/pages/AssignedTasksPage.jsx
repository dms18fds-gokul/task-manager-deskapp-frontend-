import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar"; // Changed Sidebar
import io from "socket.io-client";

import { FaSearch, FaFilter, FaEdit, FaTrash, FaCheck, FaTimes, FaEye, FaPlus, FaCalendarAlt, FaProjectDiagram, FaUser, FaUserTag, FaTasks, FaRedo, FaExclamationCircle, FaPaperPlane, FaBell, FaCheckCircle, FaTrashAlt, FaEllipsisV, FaComments } from "react-icons/fa";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import DownloadDropdown from "../components/DownloadDropdown";
import StatusBadge from "../components/StatusBadge";
import TableLoader from "../components/TableLoader";

import { API_URL, getSocketUrl } from "../utils/config";

const AssignedTasksPage = () => { // Renamed Component
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    // const [selectedEmployee, setSelectedEmployee] = useState(""); // Replaced by filter state
    const [allTasks, setAllTasks] = useState([]); // Store all tasks
    const [filteredTasks, setFilteredTasks] = useState([]); // Store displayed tasks
    const [notification, setNotification] = useState(null);
    const [isTableLoading, setIsTableLoading] = useState(false);

    const todayDate = new Date().toLocaleDateString('en-CA');

    const [filters, setFilters] = useState({
        projectName: "",
        assignedTo: "",
        priority: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        projectName: "",
        assignedTo: "",
        priority: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const handleFetchData = () => {
        setIsTableLoading(true);
        setAppliedFilters({ ...filters });
        setIsDropdownOpen(false);
        setTimeout(() => setIsTableLoading(false), 800);
    };

    const handleResetFilters = () => {
        setIsTableLoading(true);
        const resetState = {
            projectName: "",
            assignedTo: "",
            priority: "",
            fromDate: "",
            toDate: "",
            status: ""
        };
        setFilters(resetState);
        setAppliedFilters(resetState);
        setEmployeeSearch("");
        setTimeout(() => setIsTableLoading(false), 800);
    };

    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);
    const [noChannelModalOpen, setNoChannelModalOpen] = useState(false); // Modal State

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchWrapperRef = React.useRef(null);

    useEffect(() => {
        // Fetch Employees
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
    }, []); // Run once on mount for employees

    useEffect(() => {
        const socket = io(getSocketUrl(), {
            withCredentials: true,
        });
        socket.on("taskAccepted", (data) => {
            setNotification(`${data.employeeName} has taken the task.`);
            setTimeout(() => setNotification(null), 10000);
            // Refresh tasks to update status/assignee if needed
            fetchAllTasks();
        });

        // Listen for NEW TASKS (Real-time addition to table)
        socket.on("newInvitation", (newTask) => {
            // console.log("New Task Created (Real-time):", newTask);
            setAllTasks(prev => [newTask, ...prev]); // Add to top

            // If current filter is "All" or matches the new task, add it to visible list
            // Since filter state isn't easily accessible inside effect without ref/dep, 
            // and we used local filter logic... simpler to just call fetchAllTasks() OR update both.
            // If we update state, we need to respect the *current* filter.
            // But `selectedEmployee` is in dependency array? NO, this effect is [] (mount).
            // So `selectedEmployee` here will be stale (initial ""). 
            // FIX: Add `selectedEmployee` to dependency or use functional state updates CAREFULLY.
            // Better approach: Just re-fetch. It's safe and ensures consistency. 
            // OR checks logic. Let's stick to fetchAllTasks() for simplicity & correctness.
            // But user asked for "Immediate". Fetch is fast, but state injection is faster.
            // Let's try state injection for "All Employees" view at least.

            setFilteredTasks(prev => {
                // If we don't know the current filter mode inside this closure easily without complex hooks,
                // we can just PREPEND if the user is viewing "All". 
                // However, we can't easily check `selectedEmployee` state here if dep array is [].
                // Let's rely on fetchAllTasks() which we call below. 
                // Actually, wait, fetchAllTasks() is async.
                // Let's just call fetchAllTasks(), it will update both states.
                return [newTask, ...prev];
            });
            // Re-fetch ensures sorting and filtering logic runs if we move that logic out or use standard flow.
            // Actually, let's just trigger fetchAllTasks(). It's <100ms usually. 
            // BUT "Without delay" might imply optimistic UI. 
            // [newTask, ...prev] is instant. 
            // Let's do BOTH: Update state instantly (optimistic) then fetch (consistency).
        });

        const handleClickOutside = (event) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            socket.disconnect();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []); // Run once on mount

    const fetchAllTasks = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            let serverData = [];
            let fetchSuccess = false;

            try {
                const userId = user.id || user._id; // Ensure we get the ID correctly
                const res = await fetch(`${API_URL}/tasks/assigned-by/${userId}`);
                if (res.ok) {
                    serverData = await res.json();
                    fetchSuccess = true;
                }
            } catch (err) {
                console.error("Failed to fetch tasks from server", err);
            }

            // Merge with offline pending assignments from localStorage
            const offlineAssignmentsStr = localStorage.getItem('offlineAssignments');
            let pendingAssignments = [];
            if (offlineAssignmentsStr) {
                try {
                    const parsedAssignments = JSON.parse(offlineAssignmentsStr);
                    pendingAssignments = parsedAssignments
                        .filter(a => a.assignedBy === (user.id || user._id)) // Only show tasks assigned by this user
                        .map((a, i) => ({
                            ...a,
                            _id: `pending-assign-${Date.now()}-${i}`,
                            isPendingOffline: true,
                            logType: "Offline Task Pending",
                            status: "Pending"
                        }));
                } catch (e) {
                    console.error("Error parsing offline assignments", e);
                }
            }

            if (fetchSuccess) {
                const combinedData = [...pendingAssignments, ...serverData];
                setAllTasks(combinedData);
                setFilteredTasks(combinedData); // Initially show all
            } else {
                setAllTasks(prev => {
                    const prevServerData = prev.filter(t => !t.isPendingOffline);
                    const combinedData = [...pendingAssignments, ...prevServerData];
                    setFilteredTasks(combinedData);
                    return combinedData;
                });
            }

        } catch (err) {
            console.error("Error in fetchAllTasks", err);
        }
    };

    // Initial Fetch of Tasks
    useEffect(() => {
        fetchAllTasks();

        const handleOfflineUpdate = () => {
            fetchAllTasks();
        };

        window.addEventListener('offlineAssignmentSynced', handleOfflineUpdate);
        window.addEventListener('offlineAssignmentAdded', handleOfflineUpdate);

        return () => {
            window.removeEventListener('offlineAssignmentSynced', handleOfflineUpdate);
            window.removeEventListener('offlineAssignmentAdded', handleOfflineUpdate);
        };
    }, []);


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
                const updatedTasks = allTasks.map(t => t._id === taskId ? { ...t, chatTopic: topic } : t);
                setAllTasks(updatedTasks);
                // Also update filtered if needed, but effect will handle it or we update it too
                setFilteredTasks(prev => prev.map(t => t._id === taskId ? { ...t, chatTopic: topic } : t));
            } else {
                alert("Failed to update topic");
            }
        } catch (error) {
            console.error("Error updating topic:", error);
        }
    };

    // Filter Logic
    useEffect(() => {
        let result = allTasks;

        const filterFromDate = appliedFilters.fromDate || todayDate;
        const filterToDate = appliedFilters.toDate || todayDate;

        result = result.filter(task => {
            const taskDate = task.startDate?.includes('T') ? task.startDate.split('T')[0] : task.startDate;
            return taskDate >= filterFromDate && taskDate <= filterToDate;
        });

        if (appliedFilters.projectName) {
            result = result.filter(task => task.projectName === appliedFilters.projectName);
        }
        if (appliedFilters.assignedTo) {
            result = result.filter(task => {
                if (Array.isArray(task.assignedTo)) {
                    return task.assignedTo.includes(appliedFilters.assignedTo);
                }
                return task.assignedTo === appliedFilters.assignedTo;
            });
        }
        if (appliedFilters.priority) {
            result = result.filter(task => task.priority === appliedFilters.priority);
        }
        if (appliedFilters.status) {
            result = result.filter(task => task.status === appliedFilters.status);
        }

        setFilteredTasks(result);
    }, [allTasks, appliedFilters]);

    // Group Tasks Logic
    const getGroupedTasks = () => {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().split("T")[0];

        const grouped = {
            "Today": [],
            "Yesterday": [],
            "Last Week": [],
            "Old Tasks": []
        };

        filteredTasks.forEach(task => {
            if (!task.startDate) {
                grouped["Old Tasks"].push(task);
                return;
            }
            const dateStr = task.startDate; // Assuming YYYY-MM-DD string match

            if (dateStr === todayStr) {
                grouped["Today"].push(task);
            } else if (dateStr === yesterdayStr) {
                grouped["Yesterday"].push(task);
            } else if (dateStr >= lastWeekStr && dateStr < todayStr) {
                grouped["Last Week"].push(task);
            } else {
                grouped["Old Tasks"].push(task);
            }
        });

        return grouped;
    };

    const groupedTasks = getGroupedTasks();

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

    // Unique Values for Dropdowns
    const uniqueProjects = [...new Set(allTasks.map(t => t.projectName).filter(Boolean))];
    const uniquePriorities = ["High", "Medium", "Low"];
    const uniqueStatuses = ["In Progress", "Completed", "Hold", "Pending"];

    // Helper to resolve assignee names
    const getAssigneeNames = (task) => {
        let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
        if (!Array.isArray(targets)) return "Unknown";
        if (targets.length === 0) {
            return task.assignType === "Overall" ? "Overall (All)" : "Unassigned";
        }

        return targets.map(id => {
            if (typeof id === 'object' && id.name) return id.name;
            const emp = employees.find(e => e._id === id);
            return emp ? emp.name : id;
        }).join(", ");
    };

    const toggleTaskDropdown = (id) => {
        setOpenTaskDropdownId(openTaskDropdownId === id ? null : id);
    };

    // Columns for download
    const downloadColumns = [
        { header: "Project Name", accessor: "projectName" },
        { header: "Task Title", accessor: "taskTitle" },
        { header: "Employee Profile", accessor: (item) => getAssigneeNames(item) },
        { header: "Priority", accessor: "priority" },
        { header: "Start Date", accessor: "startDate" },
        { header: "Status", accessor: "status" }
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
                setNoChannelModalOpen(true);
            }
        } catch (error) {
            console.error("Error navigating to chat:", error);
            alert("Error navigating to chat");
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            const userStr = localStorage.getItem("user");
            const user = userStr ? JSON.parse(userStr) : {};
            const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    userId: user._id || user.id
                }),
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setAllTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
                setFilteredTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status");
        }
    };

    // Modal Component
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

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
            <EmployeeSidebar className="hidden md:flex" />

            {/* No Channel Modal */}
            <NoChannelModal />

            <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {/* Header / Selection */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Assigned Tasks</h1>
                    {JSON.parse(localStorage.getItem("user") || "{}")?.role === "Super Admin" && (
                        <DownloadDropdown
                            data={filteredTasks} // Use filteredTasks here
                            fileName="All_Tasks"
                            columns={downloadColumns}
                        />
                    )}
                </div>

                {/* Filter Navbar */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                        {/* From Date */}
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    max={filters.toDate || undefined}
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                    className="w-full h-[38px] px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium placeholder:text-gray-400"
                                />
                                <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            </div>
                        </div>

                        {/* To Date */}
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">To Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    min={filters.fromDate || undefined}
                                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                    className="w-full h-[38px] px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium placeholder:text-gray-400"
                                />
                                <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            </div>
                        </div>

                        <div className="w-full">
                            <CustomDropdown
                                label="Project"
                                options={[{ value: "", label: "All Projects" }, ...uniqueProjects.map(p => ({ value: p, label: p, icon: FaProjectDiagram }))]}
                                value={filters.projectName}
                                onChange={(val) => setFilters({ ...filters, projectName: val })}
                                placeholder="All Projects"
                                searchable={true}
                            />
                        </div>

                        <div className="w-full relative" ref={searchWrapperRef}>
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
                                            setFilters({ ...filters, assignedTo: "" });
                                        }
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                />
                            </div>

                            {/* Dropdown UI */}
                            {isDropdownOpen && (
                                <div className="absolute top-[60px] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto z-[999] custom-scrollbar">
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
                                                    setFilters({ ...filters, assignedTo: emp._id });
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="p-3 px-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-colors w-full overflow-hidden"
                                            >
                                                <span className="font-bold text-gray-800 text-[11px] uppercase whitespace-nowrap shrink-0">{emp.name}</span>
                                                <span className="text-gray-300 shrink-0">—</span>
                                                <span title={Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm truncate min-w-0">
                                                    {Array.isArray(emp.role) ? emp.role.join(', ') : (emp.role || 'No Dept')}
                                                </span>
                                                <span className="text-gray-300 shrink-0">—</span>
                                                <span className="text-gray-500 text-[10px] font-mono uppercase tracking-wider shrink-0">{emp.employeeId}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-[11px] text-gray-500 text-center flex flex-col items-center justify-center gap-1">
                                            <FaExclamationCircle className="text-gray-300 text-sm" />
                                            <p>No matches found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="w-full">
                            <CustomDropdown
                                label="Priority"
                                options={[{ value: "", label: "All Priorities" }, ...uniquePriorities.map(p => ({ value: p, label: p, icon: FaExclamationCircle }))]}
                                value={filters.priority}
                                onChange={(val) => setFilters({ ...filters, priority: val })}
                                placeholder="All Priorities"
                            />
                        </div>

                        <div className="w-full">
                            <CustomDropdown
                                label="Status"
                                options={[{ value: "", label: "All Statuses" }, ...uniqueStatuses.map(s => ({ value: s, label: s, icon: FaTasks }))]}
                                value={filters.status}
                                onChange={(val) => setFilters({ ...filters, status: val })}
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

                {/* Notification Card */}
                {notification && (
                    <div className="fixed top-10 right-10 bg-white border border-gray-200 shadow-2xl rounded-xl p-6 flex flex-col gap-4 animate-slide-in z-50 max-w-md w-full">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-full text-green-600">
                                <FaCheckCircle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">Task Accepted</h4>
                                <p className="text-gray-600">{notification}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                onClick={() => setNotification(null)}
                                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                {/* Task Components Grouped by Date */}
                <div className="space-y-8">
                    {isTableLoading ? (
                        <TableLoader />
                    ) : (
                        <>
                            {["Today", "Yesterday", "Last Week", "Old Tasks"].map(group => {
                                const tasks = groupedTasks[group];
                                if (tasks.length === 0) return null;

                                return (
                                    <div key={group}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <h2 className="text-xl font-bold text-gray-800">{group}</h2>
                                            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                                {tasks.length} tasks / {getUniqueEmployeeCount(tasks)} emp
                                            </span>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="w-full overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
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
                                                        {tasks.map((task, index) => (
                                                            <tr key={task._id}
                                                                onClick={() => setSelectedTaskForDetails(task)}
                                                                className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                                            >
                                                                {/* S.No */}
                                                                <td className="px-6 py-4 align-middle">
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
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-800 truncate align-middle" title={task.projectName}>
                                                                    {task.projectName}
                                                                </td>

                                                                {/* Description */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-sm font-medium text-gray-600 line-clamp-2" title={task.description}>
                                                                            {task.description || "—"}
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

                                                                {/* Status - Interactive */}
                                                                <td className="px-6 py-4 align-middle">
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        <StatusBadge
                                                                            status={task.status}
                                                                            onChange={(val) => handleStatusChange(task._id, val)}
                                                                        />
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
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredTasks.length === 0 && (
                                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                        <FaTasks className="text-gray-300 text-2xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">No tasks found</h3>
                                    <p className="text-gray-500 text-sm">Try adjusting your filters to see more tasks.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Task Details Modal */}
            {selectedTaskForDetails && (
                <TaskDetailsModal
                    task={selectedTaskForDetails}
                    onClose={() => setSelectedTaskForDetails(null)}
                    isAdmin={false}
                />
            )}
        </div>
    );
};

export default AssignedTasksPage;
