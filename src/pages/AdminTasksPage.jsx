import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import io from "socket.io-client";

import { FaSearch, FaFilter, FaEdit, FaTrash, FaCheck, FaTimes, FaEye, FaPlus, FaCalendarAlt, FaProjectDiagram, FaUser, FaUserTag, FaTasks, FaRedo, FaExclamationCircle, FaPaperPlane, FaBell, FaCheckCircle, FaTrashAlt, FaEllipsisV } from "react-icons/fa";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import DownloadDropdown from "../components/DownloadDropdown";
import TableLoader from "../components/TableLoader";

import { API_URL, getSocketUrl } from "../utils/config";

const AdminTasksPage = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    // const [selectedEmployee, setSelectedEmployee] = useState(""); // Replaced by filter state
    const [allTasks, setAllTasks] = useState([]); // Store all tasks
    const [filteredTasks, setFilteredTasks] = useState([]); // Store displayed tasks
    const [notification, setNotification] = useState(null);
    const [isTableLoading, setIsTableLoading] = useState(false);

    // Filter State
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

    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);

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
        let serverData = [];
        let fetchSuccess = false;
        try {
            const res = await fetch(`${API_URL}/tasks/all`);
            if (res.ok) {
                serverData = await res.json();
                fetchSuccess = true;
            }
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        }

        // Merge with offline pending tasks from localStorage
        const offlineTasksStr = localStorage.getItem('offlineQuickTasks');
        let pendingLogs = [];
        if (offlineTasksStr) {
            try {
                const parsedTasks = JSON.parse(offlineTasksStr);
                pendingLogs = parsedTasks.map((t, i) => ({
                    ...t,
                    _id: `pending-${Date.now()}-${i}`,
                    isPendingOffline: true,
                    logType: "Offline Task Pending"
                }));
            } catch (e) {
                console.error("Error parsing offline tasks", e);
            }
        }

        // Merge with offline pending assignments from localStorage
        const offlineAssignmentsStr = localStorage.getItem('offlineAssignments');
        let pendingAssignments = [];
        if (offlineAssignmentsStr) {
            try {
                const parsedAssignments = JSON.parse(offlineAssignmentsStr);
                pendingAssignments = parsedAssignments.map((a, i) => ({
                    ...a,
                    _id: `pending-assign-${Date.now()}-${i}`,
                    isPendingOffline: true,
                    logType: "Offline Task Pending",
                    status: "Pending" // Offline assignments haven't been accepted yet
                }));
            } catch (e) {
                console.error("Error parsing offline assignments", e);
            }
        }

        if (fetchSuccess) {
            const combinedData = [...pendingLogs, ...pendingAssignments, ...serverData];
            setAllTasks(combinedData);
            setFilteredTasks(combinedData); // Initially show all
        } else {
            setAllTasks(prev => {
                const prevServerData = prev.filter(t => !t.isPendingOffline);
                const combinedData = [...pendingLogs, ...pendingAssignments, ...prevServerData];
                setFilteredTasks(combinedData);
                return combinedData;
            });
        }
    };

    // Listener for auto-refresh when offline tasks are synced or added
    useEffect(() => {
        const handleOfflineUpdate = () => {
            fetchAllTasks();
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
    }, []);

    // Initial Fetch of Tasks
    useEffect(() => {
        fetchAllTasks();
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
            return emp ? emp.name : id; // Return name if found, else original ID (e.g. "Designer")
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
                // If 404, maybe alert or just go to chat general?
                // For now, let's just go to chat
                alert("No channel found for this task yet.");
                // navigate('/chat'); 
            }
        } catch (error) {
            console.error("Error navigating to chat:", error);
            alert("Error navigating to chat");
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
            <Sidebar className="hidden md:flex" />

            <div className="flex-1 min-w-0 flex flex-col h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {/* Header / Selection */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Employee Task Monitor</h1>
                    <DownloadDropdown
                        data={filteredTasks} // Use filteredTasks here
                        fileName="All_Tasks"
                        columns={downloadColumns}
                    />
                </div>

                {/* Filter Navbar */}
                <div className="p-5 bg-white border border-gray-100 flex flex-col gap-5 shadow-sm rounded-xl mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* From Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">From Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    max={filters.toDate || undefined}
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                    className="w-full h-[38px] px-3 py-2 pl-9 rounded text-[13px] border border-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium cursor-pointer placeholder:text-gray-400 bg-gray-50"
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
                                    value={filters.toDate}
                                    min={filters.fromDate || undefined}
                                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                    className="w-full h-[38px] px-3 py-2 pl-9 rounded text-[13px] border border-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium cursor-pointer placeholder:text-gray-400 bg-gray-50"
                                />
                                <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            </div>
                        </div>

                        {/* Project Name */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project</label>
                            <CustomDropdown
                                options={[{ value: "", label: "All Projects" }, ...uniqueProjects.map(p => ({ value: p, label: p }))]}
                                value={filters.projectName}
                                onChange={(val) => setFilters({ ...filters, projectName: val })}
                                placeholder="All Projects"
                                className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                                searchable={true}
                            />
                        </div>

                        {/* Employee Profile Filter */}
                        <div className="flex flex-col gap-1.5 lg:col-span-1 relative" ref={searchWrapperRef}>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee Profile</label>
                            <div className="relative flex items-center w-full">
                                <FaSearch className="absolute left-3 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    className="w-full h-[38px] px-3 py-2 pl-8 pr-4 rounded text-[13px] border border-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium bg-gray-50 placeholder:text-gray-400"
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

                        {/* Priority */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                            <CustomDropdown
                                options={[{ value: "", label: "All Priorities" }, ...uniquePriorities.map(p => ({ value: p, label: p }))]}
                                value={filters.priority}
                                onChange={(val) => setFilters({ ...filters, priority: val })}
                                placeholder="All Priorities"
                                className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                            />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                            <CustomDropdown
                                options={[{ value: "", label: "All Statuses" }, ...uniqueStatuses.map(s => ({ value: s, label: s }))]}
                                value={filters.status}
                                onChange={(val) => setFilters({ ...filters, status: val })}
                                placeholder="All Statuses"
                                className="border-gray-200 text-[13px] font-medium h-[38px] hover:border-gray-300 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex justify-end items-center gap-3 border-t border-gray-50 pt-4 mt-1">
                        <button
                            onClick={() => {
                                setIsTableLoading(true);
                                const resetFilters = { projectName: "", assignedTo: "", priority: "", fromDate: "", toDate: "", status: "" };
                                setFilters(resetFilters);
                                setAppliedFilters(resetFilters);
                                setEmployeeSearch("");
                                setTimeout(() => setIsTableLoading(false), 800);
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 rounded-lg h-[38px] text-[13px] font-bold transition-all shadow-sm flex items-center justify-center transform active:scale-95 duration-200"
                            title="Reset Filters"
                        >
                            <FaRedo className="text-sm" />
                        </button>
                        <button
                            onClick={() => {
                                setIsTableLoading(true);
                                setAppliedFilters(filters);
                                setIsDropdownOpen(false);
                                setTimeout(() => setIsTableLoading(false), 800);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg h-[38px] text-[13px] font-bold transition-all shadow-md flex items-center justify-center gap-2 transform active:scale-95 duration-200"
                        >
                            <FaSearch /> Fetch Data
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
                                <h4 className="font-bold text-gray-800 text-lg">Logged Out</h4>
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

                {/* Task Tables Grouped by Date */}
                <div className="mb-18">
                    {isTableLoading ? (
                        <TableLoader />
                    ) : (
                        Object.keys(groupedTasks).map((dateLabel) => {
                            const tasksInGroup = groupedTasks[dateLabel];
                            return (
                                <div key={dateLabel} className="mb-8">
                                    <h3 className="text-md font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        {dateLabel} <span className="text-xs font-medium text-gray-400 normal-case">({tasksInGroup.length} tasks / {getUniqueEmployeeCount(tasksInGroup)} emp)</span>
                                    </h3>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="w-full overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                <thead>
                                                    <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%] text-center">Assigned By & To</th>
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
                                                            <td className="px-4 py-4 align-middle">
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
                    )}
                </div>
                {/* Empty State */}
                {Object.keys(groupedTasks).length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
                        <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <FaTasks className="text-gray-300 text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No tasks found</h3>
                        <p className="text-gray-500 text-sm">Try adjusting your filters to see more tasks.</p>
                    </div>
                )}
            </div>

            {/* Task Details Modal */}
            {selectedTaskForDetails && (
                <TaskDetailsModal
                    task={selectedTaskForDetails}
                    onClose={() => setSelectedTaskForDetails(null)}
                    isAdmin={true}
                />
            )}
        </div>
    );
};

export default AdminTasksPage;
