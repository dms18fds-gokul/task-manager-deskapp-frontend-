import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogDetailsModal from '../components/LogDetailsModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import DownloadDropdown from '../components/DownloadDropdown';
import {
    Search, Briefcase, FileText, CheckSquare, Clock, Users
} from 'lucide-react';
import { FaPaperPlane, FaExclamationCircle } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../utils/config';

const ProjectReportPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [projectData, setProjectData] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await axios.get(`${API_URL}/employee/all`);
                setEmployees(res.data);
            } catch (err) {
                console.error("Failed to fetch employees", err);
            }
        };
        fetchEmployees();
    }, []);

    const handleActionClick = (log, index) => {
        setSelectedLog({ ...log, displayTaskNo: (log.taskNo || log["Task No"] || "0").toString().padStart(2, '0') });
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            setError("Please enter a Project Name");
            return;
        }

        setLoading(true);
        setError('');
        setProjectData(null);

        try {
            const projectName = searchQuery.trim();

            const [tasksRes, logsRes] = await Promise.allSettled([
                axios.get(`${API_URL}/tasks/project/${encodeURIComponent(projectName)}`),
                axios.get(`${API_URL}/work-logs/project/${encodeURIComponent(projectName)}`)
            ]);

            const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];
            const logs = logsRes.status === 'fulfilled' ? logsRes.value.data : [];

            if (tasks.length === 0 && logs.length === 0) {
                setError("No data found for this Project Name. Please check the spelling or try another project.");
                setLoading(false);
                return;
            }

            setProjectData({
                projectName: projectName,
                tasks: tasks,
                logs: logs
            });

        } catch (err) {
            console.error("Error fetching project report data:", err);
            setError(err.response?.data?.message || "Failed to fetch project details.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const calculateDurationStr = (start, end) => {
        if (!start || !end) return "";
        const [startHours, startMins, startSecs = 0] = start.split(':').map(Number);
        const [endHours, endMins, endSecs = 0] = end.split(':').map(Number);

        const startDate = new Date(0, 0, 0, startHours, startMins, startSecs);
        const endDate = new Date(0, 0, 0, endHours, endMins, endSecs);

        let diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) { diff += 24 * 60 * 60 * 1000; }

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

    const calculateTotalHours = (logs) => {
        let totalMinutes = 0;
        logs.forEach(log => {
            const durationStr = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
            const hoursMatch = durationStr.match(/(\d+)\s*hr/);
            const minutesMatch = durationStr.match(/(\d+)\s*min/);

            if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
            if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours} hr ${minutes} min`;
    };

    const getUniqueEmployees = () => {
        if (!projectData) return [];
        const employeeMap = new Map();

        // Helper to add to map using lowercase key for case-insensitivity
        const addEmployee = (id, name, empId) => {
            if (!name) return;
            // Use ID if available, otherwise use lowercase name as the unique key
            const key = id ? id.toString() : name.toLowerCase().trim();
            if (!employeeMap.has(key)) {
                // Capitalize the first letter just for display purposes
                const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                employeeMap.set(key, { name: displayName, empId: empId || "" });
            }
        };

        // Check logs
        if (projectData.logs) {
            projectData.logs.forEach(log => {
                const emp = log.employeeId;
                const owner = log.taskOwner;

                if (emp && typeof emp === 'object' && emp.name) {
                    addEmployee(emp._id, emp.name, emp.employeeId || emp.empId);
                } else if (owner) {
                    addEmployee(null, owner, null);
                }
            });
        }

        // Check tasks
        if (projectData.tasks) {
            projectData.tasks.forEach(task => {
                if (Array.isArray(task.assignedTo)) {
                    task.assignedTo.forEach(emp => {
                        if (emp && typeof emp === 'object' && emp.name) {
                            addEmployee(emp._id, emp.name, emp.employeeId || emp.empId);
                        }
                    });
                }
            });
        }

        return Array.from(employeeMap.values());
    };

    // --- Search specific table logic ---
    const handleChatClick = (taskId) => {
        navigate(`/office-chat?task=${taskId}`);
    };

    // --- Format Download Columns ---
    const tasksDownloadColumns = [
        { header: "Assigned By", accessor: (item) => item.assignedBy?.name || "Admin" },
        { header: "Title Name", accessor: "taskTitle" },
        {
            header: "Assigned To", accessor: (item) => {
                let targets = item.assignedTo && item.assignedTo.length > 0 ? item.assignedTo : item.assignee;
                if (!targets || targets.length === 0) {
                    return item.assignType === "Overall" ? "Overall (All)" : "Unassigned";
                }
                return targets.map(u => {
                    if (typeof u === 'object' && u.name) return u.name;
                    const emp = employees.find(e => e._id === u);
                    return emp ? emp.name : u;
                }).join(", ");
            }
        },
        { header: "Priority", accessor: (item) => item.priority || "Normal" },
        { header: "Status", accessor: (item) => item.status || "Pending" }
    ];

    const logsDownloadColumns = [
        { header: "Date", accessor: (item) => formatDate(item.date || item.Date) },
        { header: "Task No", accessor: (item) => (item.taskNo || item["Task No"] || "0").toString().padStart(2, '0') },
        { header: "Employee", accessor: (item) => item.employeeId?.name || "Unknown" },
        { header: "Task Type", accessor: (item) => item.taskType || item["Task Type"] },
        { header: "Description", accessor: (item) => item.description || item["Task Description"] || "-" },
        { header: "Start Time", accessor: "startTime" },
        { header: "End Time", accessor: "endTime" },
        { header: "Duration", accessor: (item) => item.duration || item.timeAutomation || calculateDurationStr(item.startTime, item.endTime) || "0 min" },
        { header: "Log Type", accessor: "logType" },
        { header: "Status", accessor: "status" }
    ];

    const multiDownloadData = projectData ? [
        {
            title: `Assigned Tasks - ${projectData.projectName}`,
            data: projectData.tasks,
            columns: tasksDownloadColumns
        },
        {
            title: `Work Logs - ${projectData.projectName}`,
            data: projectData.logs,
            columns: logsDownloadColumns
        }
    ] : [];

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-10 text-slate-800 relative z-0">
                <div className="max-w-[1600px] mx-auto space-y-8">

                    {/* Header and Search */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 group">
                                Project Wise <span className="text-indigo-600">Report</span>
                            </h1>
                            <p className="text-slate-500 mt-2 text-sm max-w-xl leading-relaxed">
                                Enter a project name to view all linked assignments, logged hours, and related history.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
                            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
                                    placeholder="Enter Project Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="absolute inset-y-1.5 right-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : 'Search'}
                                </button>
                            </form>

                            {projectData && (
                                <div className="hidden sm:block">
                                    <DownloadDropdown
                                        multiData={multiDownloadData}
                                        filename={`Project_Report_${projectData.projectName.replace(/\s+/g, '_')}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Report Content */}
                    {projectData && (
                        <div className="space-y-6 animate-in fade-in duration-500">

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                                        <Briefcase size={20} />
                                    </div>
                                    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Project Name</h3>
                                    <p className="text-xl font-bold text-slate-800">{projectData.projectName}</p>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                        <CheckSquare size={20} />
                                    </div>
                                    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Tasks</h3>
                                    <p className="text-3xl font-bold text-slate-800">{projectData.tasks.length}</p>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3">
                                        <Clock size={20} />
                                    </div>
                                    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Hours Logged</h3>
                                    <p className="text-2xl font-bold text-slate-800">{calculateTotalHours(projectData.logs)}</p>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col group relative overflow-hidden">
                                    <div className="flex flex-col items-center justify-center text-center mb-3 border-b border-gray-100 pb-3">
                                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2">
                                            <Users size={18} />
                                        </div>
                                        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Team Members</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-2xl font-bold text-slate-800">{getUniqueEmployees().length}</p>
                                            <span className="text-xs text-slate-400 font-medium">Employees</span>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto max-h-[100px] scrollbar-hide w-full px-2 mt-2">
                                        {getUniqueEmployees().length > 0 ? (
                                            <ul className="space-y-2 align-middle flex flex-col items-center">
                                                {getUniqueEmployees().map((emp, i) => (
                                                    <li key={i} className="flex flex-col items-center justify-center p-1.5 w-full bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                                                        <span className="font-bold text-sm text-slate-800 tracking-tight" title={emp.name}>{emp.name}</span>
                                                        {emp.empId && (
                                                            <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">
                                                                ID: {emp.empId}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-slate-400 text-center italic py-2">No data yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-8">
                                {/* 1. All Assigned Tasks */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-blue-600" />
                                            Assigned Tasks
                                        </h2>
                                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                                            {projectData.tasks.length}
                                        </span>
                                    </div>

                                    {projectData.tasks && projectData.tasks.length > 0 ? (
                                        <div className="w-full overflow-x-auto overflow-y-auto max-h-[500px] flex-1 custom-scrollbar">
                                            <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
                                                <thead>
                                                    <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[20%]">Assigned By & To</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[35%]">Title Name</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Priority</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[16%]">Status</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%] text-center">Chats</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {projectData.tasks.map((task, idx) => (
                                                        <tr key={task._id}
                                                            onClick={() => setSelectedTaskForDetails(task)}
                                                            className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                                        >
                                                            {/* S.No */}
                                                            <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle font-medium">
                                                                {(idx + 1).toString().padStart(2, '0')}
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
                                                                        <div className="text-sm font-semibold text-indigo-900 truncate max-w-[150px]" title={(() => {
                                                                            let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
                                                                            if (!targets || targets.length === 0) {
                                                                                return task.assignType === "Overall" ? "Overall (All)" : "Unassigned";
                                                                            }
                                                                            return targets.map(u => {
                                                                                if (typeof u === 'object' && u.name) return u.name;
                                                                                const emp = employees.find(e => e._id === u);
                                                                                return emp ? emp.name : u;
                                                                            }).join(", ");
                                                                        })()}>
                                                                            {(() => {
                                                                                let targets = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo : task.assignee;
                                                                                if (!targets || targets.length === 0) {
                                                                                    return <span className="text-gray-400 italic text-xs">{task.assignType === "Overall" ? "Overall (All)" : "Unassigned"}</span>;
                                                                                }
                                                                                return targets.map(u => {
                                                                                    if (typeof u === 'object' && u.name) return u.name;
                                                                                    const emp = employees.find(e => e._id === u);
                                                                                    return emp ? emp.name : u;
                                                                                }).join(", ");
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
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
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${task.status === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                                    task.status === "In Progress" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                                        task.status === "Hold" ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                                            task.status === "Overdue" ? "bg-red-100 text-red-800 border-red-200" :
                                                                                "bg-gray-100 text-gray-800 border-gray-200"
                                                                    }`}>
                                                                    {task.status || "Pending"}
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
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                                            <div className="bg-slate-50 rounded-full h-12 w-12 flex items-center justify-center mb-3">
                                                <CheckSquare className="text-slate-300 h-6 w-6" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-700">No tasks found</h3>
                                            <p className="text-slate-400 text-xs mt-1">This project has no assigned tasks.</p>
                                        </div>
                                    )}
                                </div>

                                {/* 2. All WorkLogs */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-teal-600" />
                                            Work Logs History
                                        </h2>
                                        <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md">
                                            {projectData.logs.length}
                                        </span>
                                    </div>
                                    {projectData.logs && projectData.logs.length > 0 ? (
                                        <div className="w-full overflow-x-auto overflow-y-auto max-h-[500px] flex-1 custom-scrollbar">
                                            <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
                                                <thead>
                                                    <tr className="bg-white text-gray-500 text-xs border-b border-gray-100 uppercase tracking-wider">
                                                        <th className="p-4 font-semibold w-[5%] text-center text-gray-400">S.No</th>
                                                        <th className="p-4 font-semibold w-[20%]">Employee Name</th>
                                                        <th className="p-4 font-semibold w-[30%]">Description</th>
                                                        <th className="p-4 font-semibold w-[20%]">Time & Duration</th>
                                                        <th className="p-4 font-semibold w-[12%] text-center">Type</th>
                                                        <th className="p-4 font-semibold w-[13%] text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 bg-white">
                                                    {projectData.logs.map((log, index) => {
                                                        const displayDuration = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
                                                        const displayTaskNo = (log.taskNo || log["Task No"] || "0").toString().padStart(2, '0');
                                                        const rawDate = log.date || log.Date;

                                                        const formatTime = (time24) => {
                                                            if (!time24) return "";
                                                            const [hours, minutes] = time24.split(':');
                                                            const h = parseInt(hours, 10);
                                                            const ampm = h >= 12 ? 'PM' : 'AM';
                                                            const h12 = h % 12 || 12;
                                                            return `${h12}:${minutes} ${ampm}`;
                                                        };

                                                        return (
                                                            <tr
                                                                key={index}
                                                                className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                                onClick={() => handleActionClick(log, index)}
                                                            >
                                                                <td className="p-4 text-xs font-bold text-gray-400 text-center align-middle">
                                                                    {(index + 1).toString().padStart(2, '0')}
                                                                </td>

                                                                {/* Employee Name */}
                                                                <td className="p-4 align-middle">
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
                                                                            {formatDate(rawDate)}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                {/* Description */}
                                                                <td className="p-4 align-middle">
                                                                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={log.description || log["Task Description"]}>
                                                                        {log.description || log["Task Description"] || "-"}
                                                                    </p>
                                                                </td>

                                                                {/* Time & Duration */}
                                                                <td className="p-4 whitespace-nowrap align-middle">
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
                                                                <td className="p-4 text-center align-middle">
                                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${["QT Task", "QT", "Quick"].includes(log.logType)
                                                                        ? "bg-purple-50 text-purple-700 border-purple-100"
                                                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                                                        }`}>
                                                                        {["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
                                                                    </span>
                                                                </td>

                                                                {/* Status */}
                                                                <td className="p-4 text-center align-middle">
                                                                    {(() => {
                                                                        const effectiveStatus = (log.status || log.Status || 'In Progress');
                                                                        const isRework = effectiveStatus === 'Rework';
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
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                                            <div className="bg-slate-50 rounded-full h-12 w-12 flex items-center justify-center mb-3">
                                                <FileText className="text-slate-300 h-6 w-6" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-700">No logs found</h3>
                                            <p className="text-slate-400 text-xs mt-1">No time has been logged against this project yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <LogDetailsModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                logDetails={selectedLog}
            />
            {selectedTaskForDetails && (
                <TaskDetailsModal
                    task={selectedTaskForDetails}
                    onClose={() => setSelectedTaskForDetails(null)}
                />
            )}
        </div>
    );
};

export default ProjectReportPage;
