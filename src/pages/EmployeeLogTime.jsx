import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import LogDetailsModal from "../components/LogDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import { FaEllipsisV, FaCalendarAlt, FaProjectDiagram, FaUser, FaUserTag, FaTasks, FaTimes, FaRedo, FaSearch, FaSpinner } from "react-icons/fa";
import { API_URL } from '../utils/config';
import DownloadDropdown from "../components/DownloadDropdown";

const EmployeeLogTime = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [employees, setEmployees] = useState([]); // Store all employees for lookup
    const [projects, setProjects] = useState([]); // Store all projects

    const todayStr = new Date().toISOString().split('T')[0];
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        project: "",
        employeeId: "",
        role: "",
        status: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: todayStr,
        toDate: todayStr,
        project: "",
        employeeId: "",
        role: "",
        status: ""
    });

    useEffect(() => {
        setHasFetched(true);
        fetchLogs();
        fetchEmployees();
        fetchFilterOptions();
    }, []);

    // Listener for auto-refresh when offline tasks are synced or added
    useEffect(() => {
        const handleOfflineUpdate = () => {
            fetchLogs();
        };

        window.addEventListener('offlineTaskSynced', handleOfflineUpdate);
        window.addEventListener('offlineTaskAdded', handleOfflineUpdate);

        return () => {
            window.removeEventListener('offlineTaskSynced', handleOfflineUpdate);
            window.removeEventListener('offlineTaskAdded', handleOfflineUpdate);
        };
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const res = await fetch(`${API_URL}/work-logs/filters`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || []);
            }
        } catch (err) {
            console.error("Failed to fetch filter options", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employee/all`);
            if (res.ok) {
                const data = await res.json();
                console.log("Employees Data:", data); // Debugging
                setEmployees(data);
            }
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const fetchLogs = async () => {
        let serverData = [];
        let fetchSuccess = false;
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/work-logs`);
            if (res.ok) {
                serverData = await res.json();
                fetchSuccess = true;
                setError(null);
            } else {
                setError("Failed to fetch logs.");
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setError("Error connecting to server. Showing available logs.");
        } finally {
            setLoading(false);
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

        const applySort = (data) => {
            return [...data].sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                const taskA = parseInt(a.taskNo || "0", 10);
                const taskB = parseInt(b.taskNo || "0", 10);
                return taskB - taskA;
            });
        };

        if (fetchSuccess) {
            const combinedData = [...serverData, ...pendingLogs];
            setLogs(applySort(combinedData));
        } else {
            setLogs(prevLogs => {
                const prevServerData = prevLogs.filter(log => !log.isPendingOffline);
                const combinedData = [...prevServerData, ...pendingLogs];
                return applySort(combinedData);
            });
        }
    };

    // --- Helper Functions (Copied from LogTime.jsx) ---
    // ... (helper functions omitted for brevity in replace, assuming no change needed there) ...
    // Note: Since I'm using replace_file_content, I need to be careful with the range.
    // The previous block covers fetchLogs. I'll need a separate replace for the table rendering part.
    // But replace_file_content works on a single contiguous block.
    // The instruction implies I should update both.
    // fetchLogs is lines 28-52. Table rendering is lines 317-328.
    // They are far apart. I should use MULTI_REPLACE_FILE_CONTENT instead.


    // --- Helper Functions (Copied from LogTime.jsx) ---

    const formatTime = (time24) => {
        if (!time24) return "";
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const calculateDurationStr = (start, end) => {
        if (!start || !end) return "";
        const [startHours, startMins, startSecs = 0] = start.split(':').map(Number);
        const [endHours, endMins, endSecs = 0] = end.split(':').map(Number);

        const startDate = new Date(0, 0, 0, startHours, startMins, startSecs);
        const endDate = new Date(0, 0, 0, endHours, endMins, endSecs);

        let diff = endDate.getTime() - startDate.getTime();

        if (diff < 0) {
            diff += 24 * 60 * 60 * 1000;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        diff -= hours * 1000 * 60 * 60;
        const minutes = Math.floor(diff / (1000 * 60));
        diff -= minutes * 1000 * 60;
        const seconds = Math.floor(diff / 1000);

        let durationString = "";
        if (hours > 0) durationString += `${hours} hr${hours > 1 ? 's' : ''} `;
        if (minutes > 0) durationString += `${minutes} min${minutes > 1 ? 's' : ''} `;
        if (seconds > 0) durationString += `${seconds} sec${seconds > 1 ? 's' : ''}`;

        return durationString.trim() || "0 sec";
    };

    const parseDurationToMinutes = (durationStr) => {
        if (!durationStr) return 0;

        // Handle HH:MM format (from CSV)
        if (durationStr.includes(':') && !durationStr.includes('hr') && !durationStr.includes('min')) {
            const [hours, minutes] = durationStr.split(':').map(Number);
            return (hours || 0) * 60 + (minutes || 0);
        }

        let minutes = 0;
        const parts = durationStr.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('hr')) {
                minutes += parseInt(parts[i - 1], 10) * 60;
            } else if (parts[i].includes('min')) {
                minutes += parseInt(parts[i - 1], 10);
            } else if (parts[i].includes('sec')) {
                minutes += parseInt(parts[i - 1], 10) / 60;
            }
        }
        return minutes;
    };

    const formatTotalDuration = (totalMinutes) => {
        const totalSeconds = Math.round(totalMinutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours} Hrs ${minutes} Mins ${seconds} Sec.`;
    };

    const getGroupTitle = (dateStr) => {
        if (!dateStr || dateStr === "undefined") {
            // Should not happen with backend fallback, but just in case return empty or raw
            return "";
        }

        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (dateStr === today) return "TODAY";
        if (dateStr === yesterday) return "YESTERDAY";

        // Format date as DD-MM-YYYY for others
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateStr.split('-');
            return `${d}-${m}-${y}`;
        }

        return dateStr;
    };

    // --- Grouping Logic ---

    // Derived unique values from employees state
    const uniqueEmployeesMap = new Map(employees.map(e => [e._id, e.name]));
    // uniqueEmployees now uses all employees from state, not just those in logs
    const uniqueEmployees = employees.map(e => ({ value: e._id, label: e.name })).sort((a, b) => a.label.localeCompare(b.label));

    const getGroupedLogs = () => {
        const grouped = {};

        // Filter logs first
        const filteredLogs = logs.filter(log => {
            if (appliedFilters.fromDate || appliedFilters.toDate) {
                const logDateStr = log.date || log.Date;
                if (!logDateStr) return false;
                const d = new Date(logDateStr);
                d.setHours(0, 0, 0, 0);

                if (appliedFilters.fromDate) {
                    if (logDateStr < appliedFilters.fromDate) return false;
                }

                if (appliedFilters.toDate) {
                    if (logDateStr > appliedFilters.toDate) return false;
                }
            }

            if (appliedFilters.project && log.projectName !== appliedFilters.project) return false;

            if (appliedFilters.employeeId) {
                // appliedFilters.employeeId is the _id from the employees array
                const filterId = appliedFilters.employeeId;

                // 1. Check if log.employeeId matches (could be string or populated object)
                const logEmpId = typeof log.employeeId === 'object' && log.employeeId !== null
                    ? log.employeeId._id
                    : log.employeeId;
                const matchesId = logEmpId === filterId;

                // 2. Check if log.taskOwner (name) matches the name for this ID (support CSV logs without proper ref)
                const filterName = uniqueEmployeesMap.get(filterId);
                const matchesName = filterName && log.taskOwner && log.taskOwner.toLowerCase().trim() === filterName.toLowerCase().trim();

                if (!matchesId && !matchesName) return false;
            }

            if (appliedFilters.role && log.employeeId?.role !== appliedFilters.role) return false;
            if (appliedFilters.status && (log.status || "In Progress") !== appliedFilters.status) return false;
            return true;
        });

        filteredLogs.forEach(log => {
            const date = log.date || "Old Tasks";
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(log);
        });

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === "Old Tasks") return 1;
            if (b === "Old Tasks") return -1;
            return new Date(b) - new Date(a);
        });

        return { grouped, sortedDates, filteredCount: filteredLogs.length, filteredLogs };
    };

    const { grouped, sortedDates, filteredCount, filteredLogs } = getGroupedLogs();

    // Projects come from state now
    const uniqueRoles = [...new Set(employees.flatMap(e => {
        let roles = e.role || e.designation;

        // Handle array roles
        if (Array.isArray(roles)) {
            return roles.map(r => typeof r === 'string' ? r.trim() : "").filter(Boolean);
        }

        // Fallback to department if no role
        if (!roles) {
            roles = e.department;
        }

        return typeof roles === 'string' ? [roles.trim()] : [];
    }).filter(Boolean))].sort();

    const downloadColumns = [
        { header: "Date", accessor: "date" },
        { header: "Task No", accessor: (item) => (item.taskNo || "0").toString().padStart(2, '0') },
        { header: "Owner", accessor: (item) => item.taskOwner || item.employeeId?.name || "Unknown" },
        { header: "Project", accessor: "projectName" },
        { header: "Task Type", accessor: "taskType" },
        { header: "Description", accessor: "description" },
        { header: "Time", accessor: (item) => `${formatTime(item.startTime)} - ${formatTime(item.endTime)}` },
        { header: "Duration", accessor: (item) => item.duration || item.timeAutomation || calculateDurationStr(item.startTime, item.endTime) },
        { header: "Status", accessor: (item) => item.status || "In Progress" },
        { header: "Log Type", accessor: (item) => item.logType || "Main Task" }
    ];

    const handleActionClick = (log, index) => {
        setSelectedLog({ ...log, displayTaskNo: (log.taskNo || "0").toString().padStart(2, '0') });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            <Sidebar className="hidden md:flex" />

            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50 h-full shadow-xl">
                        <Sidebar className="flex h-full" />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Work Logs & QT</h2>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <DownloadDropdown
                                data={filteredLogs}
                                fileName="Employee_Work_Logs"
                                columns={downloadColumns}
                            />
                        </div>
                    </div>

                    {/* Filter Navbar */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100 flex flex-col gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">From Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.fromDate}
                                        onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                        className="w-full px-3 py-2 pl-9 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium h-[42px]"
                                    />
                                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 text-sm" />
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">To Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filters.toDate}
                                        onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                        className="w-full px-3 py-2 pl-9 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium h-[42px]"
                                    />
                                    <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 text-sm" />
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">Project</label>
                                <div className="[&>div>div:first-child]:h-[42px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border-gray-200 [&>div>div:first-child]:bg-gray-50 hover:[&>div>div:first-child]:bg-white transition-all [&>div>div:first-child]:shadow-none">
                                    <CustomDropdown
                                        options={[{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p, label: p, icon: FaProjectDiagram }))]}
                                        value={filters.project}
                                        onChange={(val) => setFilters({ ...filters, project: val })}
                                        placeholder="All Projects"
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">Employee</label>
                                <div className="[&>div>div:first-child]:h-[42px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border-gray-200 [&>div>div:first-child]:bg-gray-50 hover:[&>div>div:first-child]:bg-white transition-all [&>div>div:first-child]:shadow-none">
                                    <CustomDropdown
                                        options={[{ value: "", label: "All Employees" }, ...uniqueEmployees.map(e => ({ value: e.value, label: e.label, icon: FaUser }))]}
                                        value={filters.employeeId}
                                        onChange={(val) => setFilters({ ...filters, employeeId: val })}
                                        placeholder="All Employees"
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">Role</label>
                                <div className="[&>div>div:first-child]:h-[42px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border-gray-200 [&>div>div:first-child]:bg-gray-50 hover:[&>div>div:first-child]:bg-white transition-all [&>div>div:first-child]:shadow-none">
                                    <CustomDropdown
                                        options={[{ value: "", label: "All Roles" }, ...uniqueRoles.map(r => ({ value: r, label: r, icon: FaUserTag }))]}
                                        value={filters.role}
                                        onChange={(val) => setFilters({ ...filters, role: val })}
                                        placeholder="All Roles"
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">Status</label>
                                <div className="[&>div>div:first-child]:h-[42px] [&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border-gray-200 [&>div>div:first-child]:bg-gray-50 hover:[&>div>div:first-child]:bg-white transition-all [&>div>div:first-child]:shadow-none">
                                    <CustomDropdown
                                        options={[
                                            { value: "", label: "All Statuses" },
                                            { value: "In Progress", label: "In Progress", icon: FaTasks },
                                            { value: "Hold", label: "Hold", icon: FaTasks },
                                            { value: "Completed", label: "Completed", icon: FaTasks }
                                        ]}
                                        value={filters.status}
                                        onChange={(val) => setFilters({ ...filters, status: val })}
                                        placeholder="All Statuses"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => {
                                    setFilters({ fromDate: "", toDate: "", project: "", employeeId: "", role: "", status: "" });
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    setAppliedFilters({ fromDate: todayStr, toDate: todayStr, project: "", employeeId: "", role: "", status: "" });
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center font-bold text-sm gap-2"
                                title="Reset Filters"
                            >
                                <FaRedo className="text-sm" />
                            </button>
                            <button
                                onClick={() => {
                                    setAppliedFilters({ ...filters });
                                    // Make sure we have logs initially; if not fetch them, but usually they are already fetched.
                                    // You can optionally call fetchLogs() here if you want to ensure freshest data.
                                    fetchLogs();
                                }}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center font-bold text-sm gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <FaSpinner className="animate-spin text-sm" />
                                ) : (
                                    <FaSearch className="text-sm" />
                                )}
                                {loading ? "Fetching..." : "Fetch Data"}
                            </button>
                        </div>
                    </div>

                    {/* Grouped Logs Table */}
                    <div className="space-y-8 pb-32">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <FaSpinner className="animate-spin text-indigo-600 text-5xl mb-4" />
                                <p className="text-gray-500 font-medium">Fetching Data...</p>
                            </div>
                        ) : !hasFetched ? (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 font-medium text-lg">Please select filters and click "Fetch Data" to view logs.</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-10 text-rose-500 font-medium">{error}</div>
                        ) : sortedDates.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500 font-medium text-lg">No logs found based on the selected filters.</p>
                            </div>
                        ) : (
                            sortedDates.map(date => {
                                const groupLogs = grouped[date];
                                const groupMetrics = groupLogs.reduce((acc, log) => {
                                    const durationStr = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
                                    const mins = parseDurationToMinutes(durationStr);

                                    acc.total += mins;

                                    if (log.logType === 'Meeting') {
                                        acc.meeting += mins;
                                    } else if (["QT Task", "QT", "Quick"].includes(log.logType)) {
                                        acc.qt += mins;
                                    } else {
                                        acc.main += mins;
                                    }

                                    return acc;
                                }, { total: 0, meeting: 0, qt: 0, main: 0 });

                                // Calculate unique task owners by ID
                                const uniqueOwners = new Set(groupLogs.map(log => {
                                    if (log.employeeId && log.employeeId._id) return log.employeeId._id.toString();
                                    if (log.employeeId && typeof log.employeeId === 'string') return log.employeeId;
                                    // Fallback to name if ID is missing
                                    return log.taskOwner || "Unknown";
                                })).size;

                                return (
                                    <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                                    {getGroupTitle(date)}
                                                </h3>
                                                <span className="text-xs text-gray-400 font-medium">({groupLogs.length} tasks / {uniqueOwners} Emp)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 md:gap-3">
                                                <div className="bg-purple-50 px-3 py-1 rounded text-xs border border-purple-100 shadow-sm">
                                                    <span className="text-purple-500 font-semibold mr-1">QT Hrs:</span>
                                                    <span className="text-purple-700 font-bold">{formatTotalDuration(groupMetrics.qt)}</span>
                                                </div>
                                                <div className="bg-teal-50 px-3 py-1 rounded text-xs border border-teal-100 shadow-sm">
                                                    <span className="text-teal-500 font-semibold mr-1">Meeting Hrs:</span>
                                                    <span className="text-teal-700 font-bold">{formatTotalDuration(groupMetrics.meeting)}</span>
                                                </div>
                                                <div className="bg-blue-50 px-3 py-1 rounded text-xs border border-blue-100 shadow-sm">
                                                    <span className="text-blue-500 font-semibold mr-1">Main Task Hrs:</span>
                                                    <span className="text-blue-700 font-bold">{formatTotalDuration(groupMetrics.main)}</span>
                                                </div>
                                                <div className="bg-indigo-50 px-3 py-1 rounded text-xs border border-indigo-100 shadow-sm">
                                                    <span className="text-indigo-500 font-semibold mr-1">Total Hrs:</span>
                                                    <span className="text-indigo-700 font-bold">{formatTotalDuration(groupMetrics.total)} / {uniqueOwners} {uniqueOwners === 1 ? 'Emp' : 'Emps'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
                                                <thead>
                                                    <tr className="bg-white text-gray-500 text-xs border-b border-gray-100 uppercase tracking-wider">
                                                        <th className="p-4 font-semibold w-5 text-center text-gray-400">S.No</th>
                                                        <th className="p-4 font-semibold w-[15%]">Employee Name</th>
                                                        <th className="p-4 font-semibold w-[15%]">Project</th>
                                                        <th className="p-4 font-semibold w-[30%]">Description</th>
                                                        <th className="p-4 font-semibold w-[13%]">Time & Duration</th>
                                                        <th className="p-4 font-semibold w-[10%] text-center">Type</th>
                                                        <th className="p-4 font-semibold w-[10%] text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {groupLogs.map((log, index) => {
                                                        const displayDuration = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
                                                        const displayTaskNo = (log.taskNo || "0").toString().padStart(2, '0');

                                                        // Determine User Role
                                                        let userRole = log.employeeId?.role || "";
                                                        if (log.taskOwner && employees.length > 0) {
                                                            const found = employees.find(e => e.name?.toLowerCase() === log.taskOwner.toLowerCase());
                                                            if (found) userRole = found.role || found.designation;
                                                        }

                                                        return (
                                                            <tr
                                                                key={log._id}
                                                                className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                                onClick={() => handleActionClick(log, index)}
                                                            >
                                                                <td className="p-4 text-xs font-bold text-gray-400 text-center">
                                                                    <div className="flex flex-col justify-center items-center gap-1.5 mt-1">
                                                                        <span>{groupLogs.length - index}</span>
                                                                        <span
                                                                            className={`w-2 h-2 shrink-0 rounded-[2px] ${log.isPendingOffline || log.logType === 'Offline Task' ? 'bg-red-500' : 'bg-green-500'}`}
                                                                            title={log.isPendingOffline ? 'Offline Task Pending' : log.logType === 'Offline Task' ? 'Offline Task' : 'Online Task'}
                                                                        ></span>
                                                                    </div>
                                                                </td>

                                                                {/* Task Owner */}
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-bold text-gray-800">
                                                                                {log.employeeId?.name || log.taskOwner || "Unknown"}
                                                                            </span>
                                                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">
                                                                                #{displayTaskNo}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-400 font-medium truncate mt-0.5">
                                                                            {log.employeeRole}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Project */}
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-semibold text-indigo-900 truncate" title={log.projectName}>
                                                                            {log.projectName}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5 truncate">
                                                                            {log.taskType}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Description */}
                                                                <td className="p-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={log.description}>
                                                                            {log.description}
                                                                        </p>
                                                                    </div>
                                                                </td>

                                                                {/* Time & Duration */}
                                                                <td className="p-4 whitespace-nowrap">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-800">
                                                                            {displayDuration || "-"}
                                                                        </span>
                                                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                                            <span className="font-mono">{formatTime(log.startTime)}</span>
                                                                            <span className="text-gray-300 mx-1">➜</span>
                                                                            <span className="font-mono">{formatTime(log.endTime)}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                {/* Log Type */}
                                                                <td className="p-4 text-center">
                                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${log.logType === 'Meeting' ? 'bg-teal-50 text-teal-700 border-teal-100' : ["QT Task", "QT", "Quick"].includes(log.logType)
                                                                        ? "bg-purple-50 text-purple-700 border-purple-100"
                                                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                                                        }`}>
                                                                        {log.logType === 'Meeting' ? 'Meeting' : ["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
                                                                    </span>
                                                                </td>

                                                                {/* Status */}
                                                                <td className="p-4 text-center">
                                                                    {(() => {
                                                                        const effectiveStatus = (log.status && log.status !== 'In Progress') ? log.status : (log.endTime ? "Completed" : "In Progress");
                                                                        const isRework = log.status === 'Rework';
                                                                        const statusStyles = isRework ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                            effectiveStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                                (effectiveStatus === 'Hold' || effectiveStatus === 'Hold_RW' || effectiveStatus.startsWith('Hold_Re')) ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                                    'bg-sky-50 text-sky-700 border-sky-100';

                                                                        return (
                                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles}`}>
                                                                                {isRework ? 'Rework' : effectiveStatus}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>

                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>
            </div >

            <LogDetailsModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
                employees={employees}
            />
        </div >
    );
};

export default EmployeeLogTime;
