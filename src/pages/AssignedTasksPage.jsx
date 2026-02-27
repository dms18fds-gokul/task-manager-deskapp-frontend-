import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar"; // Changed Sidebar
import io from "socket.io-client";

import { FaSearch, FaFilter, FaEdit, FaTrash, FaCheck, FaTimes, FaEye, FaPlus, FaCalendarAlt, FaProjectDiagram, FaUser, FaUserTag, FaTasks, FaRedo, FaExclamationCircle, FaPaperPlane, FaBell, FaCheckCircle, FaTrashAlt, FaEllipsisV, FaComments } from "react-icons/fa";
import TaskDetailsModal from "../components/TaskDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import DownloadDropdown from "../components/DownloadDropdown";

import { API_URL, getSocketUrl } from "../utils/config";

const AssignedTasksPage = () => { // Renamed Component
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    // const [selectedEmployee, setSelectedEmployee] = useState(""); // Replaced by filter state
    const [allTasks, setAllTasks] = useState([]); // Store all tasks
    const [filteredTasks, setFilteredTasks] = useState([]); // Store displayed tasks
    const [notification, setNotification] = useState(null);

    // Filter State
    const [filters, setFilters] = useState({
        projectName: "",
        assignedTo: "",
        priority: "",
        fromDate: "",
        toDate: "",
        status: ""
    });

    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [openTaskDropdownId, setOpenTaskDropdownId] = useState(null);
    const [noChannelModalOpen, setNoChannelModalOpen] = useState(false); // Modal State

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

        return () => socket.disconnect();
    }, []); // Run once on mount

    const fetchAllTasks = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            let serverData = [];
            let fetchSuccess = false;

            try {
                const res = await fetch(`${API_URL}/tasks/assigned-by/${user.id}`);
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
                        .filter(a => a.assignedBy === user.id) // Only show tasks assigned by this user
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

        if (filters.projectName) {
            result = result.filter(task => task.projectName === filters.projectName);
        }
        if (filters.assignedTo) {
            result = result.filter(task => {
                if (Array.isArray(task.assignedTo)) {
                    return task.assignedTo.includes(filters.assignedTo);
                }
                return task.assignedTo === filters.assignedTo;
            });
        }
        if (filters.priority) {
            result = result.filter(task => task.priority === filters.priority);
        }
        if (filters.fromDate) {
            result = result.filter(task => task.startDate >= filters.fromDate);
        }
        if (filters.toDate) {
            result = result.filter(task => task.startDate <= filters.toDate);
        }
        if (filters.status) {
            result = result.filter(task => task.status === filters.status);
        }

        setFilteredTasks(result);
    }, [allTasks, filters]);

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

    // Unique Values for Dropdowns
    const uniqueProjects = [...new Set(allTasks.map(t => t.projectName).filter(Boolean))];
    const uniquePriorities = ["High", "Medium", "Low"];
    const uniqueStatuses = ["In Progress", "Completed", "Hold"];

    // Helper to resolve assignee names
    const getAssigneeNames = (assignees) => {
        if (!Array.isArray(assignees)) return "Unknown";
        if (assignees.length === 0) return "Unassigned";

        return assignees.map(id => {
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
        { header: "Assigned To", accessor: (item) => getAssigneeNames(item.assignedTo) },
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
        <div className="flex min-h-screen bg-gray-50 font-sans">
            <EmployeeSidebar className="hidden md:flex" />

            {/* No Channel Modal */}
            <NoChannelModal />

            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                {/* Header / Selection */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Assigned Tasks</h1>
                    <DownloadDropdown
                        data={filteredTasks} // Use filteredTasks here
                        fileName="All_Tasks"
                        columns={downloadColumns}
                    />
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

                    <div className="flex-1 min-w-[180px]">
                        <CustomDropdown
                            label="Project"
                            options={[{ value: "", label: "All Projects" }, ...uniqueProjects.map(p => ({ value: p, label: p, icon: FaProjectDiagram }))]}
                            value={filters.projectName}
                            onChange={(val) => setFilters({ ...filters, projectName: val })}
                            placeholder="All Projects"
                        />
                    </div>

                    <div className="flex-1 min-w-[180px]">
                        <CustomDropdown
                            label="Assigned To"
                            options={[{ value: "", label: "All Employees" }, ...employees.map(e => ({ value: e._id, label: e.name, icon: FaUser }))]}
                            value={filters.assignedTo}
                            onChange={(val) => setFilters({ ...filters, assignedTo: val })}
                            placeholder="All Employees"
                        />
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <CustomDropdown
                            label="Priority"
                            options={[{ value: "", label: "All Priorities" }, ...uniquePriorities.map(p => ({ value: p, label: p, icon: FaExclamationCircle }))]}
                            value={filters.priority}
                            onChange={(val) => setFilters({ ...filters, priority: val })}
                            placeholder="All Priorities"
                        />
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <CustomDropdown
                            label="Status"
                            options={[{ value: "", label: "All Statuses" }, ...uniqueStatuses.map(s => ({ value: s, label: s, icon: FaTasks }))]}
                            value={filters.status}
                            onChange={(val) => setFilters({ ...filters, status: val })}
                            placeholder="All Statuses"
                        />
                    </div>

                    <div className="flex-none pb-[1px]">
                        <button
                            onClick={() => setFilters({ projectName: "", assignedTo: "", priority: "", fromDate: "", toDate: "", status: "" })}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center transform hover:rotate-180 duration-500"
                            title="Reset Filters"
                        >
                            <FaRedo className="text-sm" />
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
                    {["Today", "Yesterday", "Last Week", "Old Tasks"].map(group => {
                        const tasks = groupedTasks[group];
                        if (tasks.length === 0) return null;

                        return (
                            <div key={group}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">{group}</h2>
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">{tasks.length}</span>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Assigned By & To</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Project Name</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Title Name</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[8%]">Priority</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                                    <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">Chats</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {tasks.map((task, index) => (
                                                    <tr key={task._id}
                                                        onClick={() => setSelectedTaskForDetails(task)}
                                                        className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white">

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
                                                                        {task.assignedBy?.name || "Admin"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] uppercase font-bold text-gray-400 w-6">To:</span>
                                                                    <div className="text-sm font-semibold text-indigo-900 truncate max-w-[150px]" title={(() => {
                                                                        if (!task.assignedTo || task.assignedTo.length === 0) return "Unassigned";
                                                                        return task.assignedTo.map(assigneeId => {
                                                                            const emp = employees.find(e => e._id === assigneeId);
                                                                            return emp ? emp.name : "Unknown";
                                                                        }).join(", ");
                                                                    })()}>
                                                                        {(() => {
                                                                            if (!task.assignedTo || task.assignedTo.length === 0) return <span className="text-gray-400 italic text-xs">Unassigned</span>;
                                                                            return task.assignedTo.map(assigneeId => {
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

                                                        {/* Status */}
                                                        <td className="px-6 py-4 align-middle">
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${task.status === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                                task.status === "In Progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                                    task.status === "Overdue" ? "bg-red-100 text-red-800 border-red-200" :
                                                                        "bg-gray-100 text-gray-800 border-gray-200"
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${task.status === "Completed" ? "bg-emerald-500" :
                                                                    task.status === "In Progress" ? "bg-blue-500" :
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
