import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import LogDetailsModal from "../components/LogDetailsModal";
import CustomDropdown from "../components/CustomDropdown";
import { FaEllipsisV, FaCalendarAlt, FaProjectDiagram, FaUser, FaUserTag, FaTasks, FaTimes, FaRedo } from "react-icons/fa";
import { API_URL } from '../utils/config';
import DownloadDropdown from "../components/DownloadDropdown";

const EmployeeLogTime = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [employees, setEmployees] = useState([]); // Store all employees for lookup
    const [projects, setProjects] = useState([]); // Store all projects

    // Filter State
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        project: "",
        employeeId: "",
        role: "",
        status: ""
    });

    useEffect(() => {
        fetchLogs();
        fetchEmployees();
        fetchFilterOptions();
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
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/work-logs`);
            if (res.ok) {
                const data = await res.json();
                // Sort by date desc, then by taskNo ascending (to match user request)
                const sorted = data.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;

                    // Sort by taskNo descending (e.g. 3, 2, 1...)
                    // taskNo can be string or number, parse to int
                    const taskA = parseInt(a.taskNo || "0", 10);
                    const taskB = parseInt(b.taskNo || "0", 10);
                    return taskB - taskA;
                });
                setLogs(sorted);
                setError(null);
            } else {
                setError("Failed to fetch logs.");
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            setError("Error connecting to server.");
        } finally {
            setLoading(false);
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
        const [startHours, startMins] = start.split(':').map(Number);
        const [endHours, endMins] = end.split(':').map(Number);

        const startDate = new Date(0, 0, 0, startHours, startMins, 0);
        const endDate = new Date(0, 0, 0, endHours, endMins, 0);

        let diff = endDate.getTime() - startDate.getTime();

        if (diff < 0) {
            diff += 24 * 60 * 60 * 1000;
        }

        const hours = Math.floor(diff / 1000 / 60 / 60);
        const minutes = Math.floor((diff / 1000 / 60 / 60 - hours) * 60);

        let durationString = "";
        if (hours > 0) durationString += `${hours} hr${hours > 1 ? 's' : ''} `;
        if (minutes > 0) durationString += `${minutes} min${minutes > 1 ? 's' : ''}`;

        return durationString.trim() || "0 min";
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
                minutes += parseInt(parts[i - 1]) * 60;
            } else if (parts[i].includes('min')) {
                minutes += parseInt(parts[i - 1]);
            }
        }
        return minutes;
    };

    const formatTotalDuration = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours} Hrs ${minutes} Mins`;
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

    const parseCustomDate = (dateString) => {
        if (!dateString) return null;
        const str = String(dateString).trim();
        if (str.includes('T') || str.includes(':')) {
            return new Date(str);
        }
        const parts = str.split(/[\.\-\/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return new Date(str);
            }
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(str);
    };

    const getGroupedLogs = () => {
        const grouped = {};

        // Filter logs first
        const filteredLogs = logs.filter(log => {
            const d = parseCustomDate(log.date || log.Date);
            const fromDate = parseCustomDate(filters.fromDate);
            const toDate = parseCustomDate(filters.toDate);

            const isAfterFrom = (!fromDate || isNaN(fromDate.getTime()) || !d || isNaN(d.getTime()))
                ? (!filters.fromDate || log.date >= filters.fromDate)
                : (d.getTime() >= fromDate.getTime());

            const isBeforeTo = (!toDate || isNaN(toDate.getTime()) || !d || isNaN(d.getTime()))
                ? (!filters.toDate || log.date <= filters.toDate)
                : (d.getTime() <= toDate.getTime());

            if (!isAfterFrom) return false;
            if (!isBeforeTo) return false;
            if (filters.project && log.projectName !== filters.project) return false;

            if (filters.employeeId) {
                const matchesId = log.employeeId?._id === filters.employeeId;
                // Case-insensitive name match for CSV logs
                const filterName = uniqueEmployeesMap.get(filters.employeeId);
                const matchesName = filterName && log.taskOwner && log.taskOwner.toLowerCase().trim() === filterName.toLowerCase().trim();

                if (!matchesId && !matchesName) return false;
            }

            if (filters.role && log.employeeId?.role !== filters.role) return false;
            if (filters.status && (log.status || "In Progress") !== filters.status) return false;
            return true;
        });

        filteredLogs.forEach(log => {
            let rawDate = log.date || log.Date || "Old Tasks";
            let date = rawDate;

            if (typeof date === 'string' && date !== "Old Tasks") {
                if (date.includes('T')) {
                    date = date.split('T')[0];
                } else if (date.includes(' ')) {
                    date = date.split(' ')[0];
                }
                date = date.trim();
            }

            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(log);
        });

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === "Old Tasks") return 1;
            if (b === "Old Tasks") return -1;
            const da = parseCustomDate(a);
            const db = parseCustomDate(b);
            return db.getTime() - da.getTime();
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
        { header: "Duration", accessor: (item) => item.timeAutomation || item.duration || calculateDurationStr(item.startTime, item.endTime) },
        { header: "Status", accessor: (item) => item.status || "In Progress" },
        { header: "Log Type", accessor: (item) => item.logType || "Main Task" }
    ];

    const handleActionClick = (log, index) => {
        setSelectedLog({ ...log, displayTaskNo: (log.taskNo || "0").toString().padStart(2, '0') });
    };

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative">
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
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Employee Work Logs & QT</h2>
                        <div className="flex gap-2">
                            <DownloadDropdown
                                data={filteredLogs}
                                fileName="Employee_Work_Logs"
                                columns={downloadColumns}
                            />
                            <button
                                onClick={() => fetchLogs()}
                                className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm hover:bg-indigo-100 transition"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filter Navbar */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4 border border-gray-100">
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
                                options={[{ value: "", label: "All Projects" }, ...projects.map(p => ({ value: p, label: p, icon: FaProjectDiagram }))]}
                                value={filters.project}
                                onChange={(val) => setFilters({ ...filters, project: val })}
                                placeholder="All Projects"
                            />
                        </div>

                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                label="Employee"
                                options={[{ value: "", label: "All Employees" }, ...uniqueEmployees.map(e => ({ value: e.value, label: e.label, icon: FaUser }))]}
                                value={filters.employeeId}
                                onChange={(val) => setFilters({ ...filters, employeeId: val })}
                                placeholder="All Employees"
                            />
                        </div>

                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                label="Role"
                                options={[{ value: "", label: "All Roles" }, ...uniqueRoles.map(r => ({ value: r, label: r, icon: FaUserTag }))]}
                                value={filters.role}
                                onChange={(val) => setFilters({ ...filters, role: val })}
                                placeholder="All Roles"
                            />
                        </div>

                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                label="Status"
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

                        <div className="flex-none pb-[1px]">
                            <button
                                onClick={() => setFilters({ fromDate: "", toDate: "", project: "", employeeId: "", role: "", status: "" })}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3 rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center transform hover:rotate-180 duration-500"
                                title="Reset Filters"
                            >
                                <FaRedo className="text-sm" />
                            </button>
                        </div>
                    </div>

                    {/* Grouped Logs Table */}
                    <div className="space-y-8 pb-32">
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Loading logs...</div>
                        ) : error ? (
                            <div className="text-center py-10 text-red-500">{error}</div>
                        ) : sortedDates.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No logs found.</div>
                        ) : (
                            sortedDates.map(date => {
                                const groupLogs = grouped[date];
                                const groupTotalMinutes = groupLogs.reduce((acc, log) => {
                                    const durationStr = log.timeAutomation || log.duration || calculateDurationStr(log.startTime, log.endTime);
                                    return acc + parseDurationToMinutes(durationStr);
                                }, 0);

                                // Calculate unique task owners
                                const uniqueOwners = new Set(groupLogs.map(log => log.taskOwner || log.employeeId?.name || "Unknown")).size;

                                return (
                                    <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                                    {getGroupTitle(date)}
                                                </h3>
                                                <span className="text-xs text-gray-400 font-medium">({groupLogs.length} tasks)</span>
                                            </div>
                                            <div className="bg-indigo-50 px-3 py-1 rounded text-xs">
                                                <span className="text-indigo-500 font-semibold mr-1">Log Hrs:</span>
                                                <span className="text-indigo-700 font-bold">
                                                    {formatTotalDuration(groupTotalMinutes)} / {uniqueOwners} Employees
                                                </span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
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
                                                        const displayDuration = log.timeAutomation || log.duration || calculateDurationStr(log.startTime, log.endTime);
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
                                                                    {index + 1}
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
                                                                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={log.description}>
                                                                        {log.description}
                                                                    </p>
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
                                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${["QT Task", "QT", "Quick"].includes(log.logType)
                                                                        ? "bg-purple-50 text-purple-700 border-purple-100"
                                                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                                                        }`}>
                                                                        {["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
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
