import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogDetailsModal from '../components/LogDetailsModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import CustomDropdown from '../components/CustomDropdown';
import DownloadDropdown from '../components/DownloadDropdown';
import {
    Search, User, Briefcase, Calendar, Clock, Image as ImageIcon,
    CheckCircle, XCircle, AlertCircle, FileText, CheckSquare, Coffee,
    Camera, Filter
} from 'lucide-react';
import { FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../utils/config';

const EmployeeReportPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [employeeData, setEmployeeData] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [selectedTaskForDetails, setSelectedTaskForDetails] = useState(null);

    // Filter State
    const [dateFilterType, setDateFilterType] = useState('Last 30 Days / Month');
    const [particularDate, setParticularDate] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const handleActionClick = (log, index) => {
        setSelectedLog({ ...log, displayTaskNo: (log.taskNo || log["Task No"] || "0").toString().padStart(2, '0') });
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            setError("Please enter an Employee ID");
            return;
        }

        setLoading(true);
        setError('');
        setEmployeeData(null);

        try {
            // 1. Fetch Core Profile
            const profileRes = await axios.get(`${API_URL}/employee/${searchQuery.trim()}`);
            const profile = profileRes.data;

            if (!profile || !profile._id) {
                setError("Employee not found.");
                setLoading(false);
                return;
            }

            const mongoId = profile._id;

            // 2. Fetch everything else in parallel
            const [tasksRes, logsRes, attendanceHistoryRes, leavesRes, screenshotsRes] = await Promise.allSettled([
                axios.get(`${API_URL}/tasks/employee/${mongoId}`),
                axios.get(`${API_URL}/work-logs/employee/${mongoId}`),
                axios.get(`${API_URL}/attendance/history/${mongoId}`),
                axios.get(`${API_URL}/leave/my-leaves/${mongoId}`),
                axios.get(`${API_URL}/sessions/employee/${searchQuery.trim()}/screenshots`)
            ]);

            // Construct full data object
            setEmployeeData({
                profile,
                tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data : [],
                logs: logsRes.status === 'fulfilled' ? logsRes.value.data : [],
                attendanceHistory: attendanceHistoryRes.status === 'fulfilled' ? attendanceHistoryRes.value.data : [],
                leaves: leavesRes.status === 'fulfilled' ? leavesRes.value.data : [],
                screenshots: screenshotsRes.status === 'fulfilled' ? screenshotsRes.value.data : []
            });

        } catch (err) {
            console.error("Error fetching employee report data:", err);
            setError(err.response?.data?.message || "Failed to fetch employee details. Please verify the ID.");
        } finally {
            setLoading(false);
        }
    };

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

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = parseCustomDate(dateStr);
        if (!d || isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

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

    const isDateInRange = (dateString, filterType) => {
        if (!dateString) return true;

        const d = parseCustomDate(dateString);
        if (!d || isNaN(d.getTime())) return true; // Keep visible if unparseable

        d.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterType === 'Today') {
            return d.getTime() === today.getTime();
        } else if (filterType === 'Particular Date') {
            if (!particularDate) return true;
            const target = new Date(particularDate);
            target.setHours(0, 0, 0, 0);
            return d.getTime() === target.getTime();
        } else if (filterType === 'From Date to To Date') {
            let start = fromDate ? new Date(fromDate) : new Date(-8640000000000000);
            start.setHours(0, 0, 0, 0);
            let end = toDate ? new Date(toDate) : new Date(8640000000000000);
            end.setHours(23, 59, 59, 999);
            return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
        } else if (filterType === 'Last 7 Days / Week') {
            const past = new Date(today);
            past.setDate(today.getDate() - 7);
            return d.getTime() >= past.getTime() && d.getTime() <= today.getTime();
        } else if (filterType === 'Last 30 Days / Month') {
            const past = new Date(today);
            past.setDate(today.getDate() - 30);
            return d.getTime() >= past.getTime() && d.getTime() <= today.getTime();
        } else if (filterType === 'All Time') {
            return true;
        }
        return true;
    };

    const filteredAttendance = employeeData?.attendanceHistory?.filter(record => isDateInRange(record.date, dateFilterType)) || [];
    const filteredLogs = employeeData?.logs?.filter(log => isDateInRange(log.date || log.Date, dateFilterType)) || [];
    const filteredTasks = employeeData?.tasks?.filter(task => isDateInRange(task.startDate || task.createdAt, dateFilterType)) || [];

    // --- Download Columns Definition ---
    const attendanceDownloadColumns = [
        { header: "Date", accessor: (item) => item.date ? new Date(item.date).toLocaleDateString() : '-' },
        { header: "Status", accessor: "status" },
        { header: "Login Time", accessor: (item) => item.loginTime ? new Date(item.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-" },
        { header: "Login Hours", accessor: (item) => formatHHMMSS((item.activeTime || 0) + (item.idleTime || 0)) },
        { header: "Active Hours", accessor: (item) => item.formattedActiveTime || "00:00:00" },
        { header: "Idle Hours", accessor: (item) => item.formattedIdleTime || "00:00:00" },
        { header: "Logout Time", accessor: (item) => item.logoutTime ? new Date(item.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-" }
    ];

    const tasksDownloadColumns = [
        { header: "Assigned By", accessor: (item) => item.assignedBy?.name || "Admin" },
        { header: "Project Name", accessor: "projectName" },
        { header: "Title Name", accessor: "taskTitle" },
        { header: "Priority", accessor: (item) => item.priority || "Normal" },
        { header: "Status", accessor: (item) => item.status || "Pending" }
    ];

    const logsDownloadColumns = [
        { header: "Date", accessor: (item) => formatDate(item.date || item.Date) },
        { header: "Task No", accessor: (item) => (item.taskNo || item["Task No"] || "0").toString().padStart(2, '0') },
        { header: "Project", accessor: (item) => item.projectName || item["Project Name"] },
        { header: "Task Type", accessor: (item) => item.taskType || item["Task Type"] },
        { header: "Description", accessor: (item) => item.description || item["Task Description"] },
        { header: "Time", accessor: (item) => `${formatTime(item.startTime || item["Start Time"])} - ${formatTime(item.endTime || item["End Time"])}` },
        { header: "Duration", accessor: (item) => item.timeAutomation || item.duration || calculateDurationStr(item.startTime, item.endTime) },
        { header: "Log Type", accessor: (item) => ["QT Task", "QT", "Quick"].includes(item.logType) ? "Quick" : "Main" },
        {
            header: "Status", accessor: (item) => {
                const rawStatus = item.status || item.Status;
                const effectiveStatus = (rawStatus && rawStatus !== 'In Progress') ? rawStatus : ((item.endTime || item["End Time"]) ? "Completed" : "In Progress");
                return rawStatus === 'Rework' ? 'Rework' : effectiveStatus;
            }
        }
    ];

    // --- Multi-Table Download Data ---
    const multiDownloadData = [
        {
            title: "Attendance and Working Hours",
            data: filteredAttendance,
            columns: attendanceDownloadColumns
        },
        {
            title: "All Assigned Tasks",
            data: filteredTasks,
            columns: tasksDownloadColumns
        },
        {
            title: "All Work Logs",
            data: filteredLogs,
            columns: logsDownloadColumns
        }
    ];

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 overflow-auto p-8 relative">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Header & Search */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Employee Wise Report</h1>
                                <p className="text-sm text-slate-500 mt-1">Search and view comprehensive analytics for any employee.</p>
                            </div>

                            <form onSubmit={handleSearch} className="flex w-full max-w-md items-center bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300 overflow-hidden pl-2 pr-1.5 py-1.5">
                                <div className="pl-3 pr-2 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 outline-none sm:text-sm font-medium px-2"
                                    placeholder="Enter Employee ID (e.g. FOXIAN001)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                                >
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                        </div>
                        {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}

                        {/* Date Filter & Downloads Top Navbar */}
                        {employeeData && (
                            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-end justify-between animate-in fade-in duration-300">

                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex flex-col relative z-20">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                            <Filter className="h-3 w-3" /> Date Filter
                                        </label>
                                        <div className="w-[220px]">
                                            <CustomDropdown
                                                options={[
                                                    "Today",
                                                    "Particular Date",
                                                    "From Date to To Date",
                                                    "Last 7 Days / Week",
                                                    "Last 30 Days / Month",
                                                    "All Time"
                                                ]}
                                                value={dateFilterType}
                                                onChange={(val) => setDateFilterType(val)}
                                                placeholder="Select Filter"
                                            />
                                        </div>
                                    </div>

                                    {dateFilterType === 'Particular Date' && (
                                        <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> Select Date
                                            </label>
                                            <input
                                                type="date"
                                                value={particularDate}
                                                onChange={(e) => setParticularDate(e.target.value)}
                                                className="w-[160px] px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-[38px] bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    {dateFilterType === 'From Date to To Date' && (
                                        <div className="flex gap-4 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> From Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-[38px] bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> To Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                    className="w-[160px] px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-[38px] bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Download Dropdowns */}
                                <div className="flex flex-wrap gap-2 items-end">
                                    <div className="flex flex-col">
                                        <div className="h-[38px] flex items-center">
                                            <DownloadDropdown
                                                multiData={multiDownloadData}
                                                fileName={`${employeeData.profile.name.replace(/\s+/g, '_')}_Complete_Report`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!employeeData && !loading && !error && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <User className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Waiting for Search</h3>
                            <p className="mt-1 text-slate-500">Enter an Employee ID above to view their complete report.</p>
                        </div>
                    )}

                    {/* Data Dashboard */}
                    {employeeData && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* 1. Profile Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    Employee Profile
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Name</p>
                                        <p className="mt-1 text-base font-medium text-slate-900">{employeeData.profile.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Employee ID</p>
                                        <p className="mt-1 text-base font-medium text-slate-900">{employeeData.profile.employeeId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Designation</p>
                                        <p className="mt-1 text-base font-medium text-slate-900">{employeeData.profile.designation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</p>
                                        <p className="mt-1 text-base font-medium text-slate-900">{employeeData.profile.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* 2. Attendance & Working Hours */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-3">
                                    <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-green-600" />
                                        Attendance and Working Hours
                                    </h2>
                                    {filteredAttendance && filteredAttendance.length > 0 ? (
                                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Date</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%] text-center">Login Time</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%] text-center">Login Hours</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-emerald-600 uppercase tracking-wider w-[12%] text-center">Active Hours</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-amber-600 uppercase tracking-wider w-[12%] text-center">Idle Hours</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%] text-center">Logout Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredAttendance.map((record, index) => (
                                                        <tr key={record._id || index} className="hover:bg-gray-50 transition-colors py-4">
                                                            <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle font-medium border-r border-gray-50 min-w-[50px]">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>
                                                            <td className="px-6 py-4 align-middle font-bold text-gray-900 text-sm">
                                                                {record.date ? new Date(record.date).toLocaleDateString() : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 align-middle">
                                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                                                                    record.status.includes('Absent') ? 'bg-rose-100 text-rose-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {record.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-gray-600 text-sm text-center align-middle">
                                                                {record.loginTime ? new Date(record.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-gray-700 font-bold text-sm text-center align-middle">
                                                                {formatHHMMSS((record.activeTime || 0) + (record.idleTime || 0))}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-emerald-600 font-bold text-sm text-center align-middle">
                                                                {record.formattedActiveTime || "00:00:00"}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-amber-600 font-bold text-sm text-center align-middle">
                                                                {record.formattedIdleTime || "00:00:00"}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-indigo-600 font-bold text-sm text-center align-middle">
                                                                {record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                                            <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                                <Clock className="text-gray-300 text-2xl h-8 w-8" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-1">No attendance records found</h3>
                                            <p className="text-gray-500 text-sm">This employee has no attendance history recorded.</p>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Tasks Table */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-3">
                                    <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                                        All Assigned Tasks
                                    </h2>
                                    {filteredTasks && filteredTasks.length > 0 ? (
                                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-gray-50/50 text-left border-b border-gray-200">
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[5%] text-center">S.No</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Assigned By</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[15%]">Project Name</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[20%]">Title Name</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[10%]">Priority</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[12%]">Status</th>
                                                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-[8%] text-center">Chats</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredTasks.map((task, index) => (
                                                        <tr key={task._id || index}
                                                            onClick={() => setSelectedTaskForDetails(task)}
                                                            className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-pointer h-20 border-l-4 border-transparent hover:border-indigo-500 bg-white"
                                                        >
                                                            {/* S.No */}
                                                            <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle font-medium">
                                                                {(index + 1).toString().padStart(2, '0')}
                                                            </td>

                                                            {/* Assigned By */}
                                                            <td className="px-6 py-4 align-middle">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] uppercase font-bold text-gray-400 w-6">By:</span>
                                                                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={task.assignedBy?.name}>
                                                                            {task.assignedBy?.name || "Admin"}
                                                                        </span>
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
                                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                                            <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                                <CheckSquare className="text-gray-300 text-2xl h-8 w-8" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-1">No tasks found</h3>
                                            <p className="text-gray-500 text-sm">This employee has no assigned tasks.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. All WorkLogs */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                    All Work Logs
                                </h2>
                                {filteredLogs && filteredLogs.length > 0 ? (
                                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-hide">
                                        <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-white text-gray-500 text-xs border-b border-gray-100 uppercase tracking-wider">
                                                    <th className="p-4 font-semibold w-5 text-center text-gray-400">S.No</th>
                                                    <th className="p-4 font-semibold w-[15%]">Date & Task No</th>
                                                    <th className="p-4 font-semibold w-[15%]">Project</th>
                                                    <th className="p-4 font-semibold w-[30%]">Description</th>
                                                    <th className="p-4 font-semibold w-[15%]">Time & Duration</th>
                                                    <th className="p-4 font-semibold w-[10%] text-center">Type</th>
                                                    <th className="p-4 font-semibold w-[10%] text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredLogs.map((log, idx) => {
                                                    const displayDuration = log.timeAutomation || log.duration || calculateDurationStr(log.startTime, log.endTime);
                                                    const displayTaskNo = (log.taskNo || log["Task No"] || "0").toString().padStart(2, '0');
                                                    const taskType = log.taskType || log["Task Type"];
                                                    const projectName = log.projectName || log["Project Name"];
                                                    const description = log.description || log["Task Description"];
                                                    const rawDate = log.date || log.Date;

                                                    return (
                                                        <tr
                                                            key={idx}
                                                            className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                            onClick={() => handleActionClick(log, idx)}
                                                        >
                                                            <td className="p-4 text-xs font-bold text-gray-400 text-center">
                                                                {idx + 1}
                                                            </td>

                                                            {/* Date & Task No */}
                                                            <td className="p-4 border-b border-gray-50">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-gray-800">
                                                                            {formatDate(rawDate)}
                                                                        </span>
                                                                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">
                                                                            #{displayTaskNo}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Project */}
                                                            <td className="p-4 border-b border-gray-50">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-semibold text-indigo-900 truncate" title={projectName}>
                                                                        {projectName}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5 truncate">
                                                                        {taskType}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Description */}
                                                            <td className="p-4 border-b border-gray-50">
                                                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={description}>
                                                                    {description}
                                                                </p>
                                                            </td>

                                                            {/* Time & Duration */}
                                                            <td className="p-4 whitespace-nowrap border-b border-gray-50">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-gray-800">
                                                                        {displayDuration || "-"}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                                        <span className="font-mono">{formatTime(log.startTime || log["Start Time"])}</span>
                                                                        <span className="text-gray-300 mx-1">➜</span>
                                                                        <span className="font-mono">{formatTime(log.endTime || log["End Time"])}</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Log Type */}
                                                            <td className="p-4 text-center border-b border-gray-50">
                                                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${["QT Task", "QT", "Quick"].includes(log.logType)
                                                                    ? "bg-purple-50 text-purple-700 border-purple-100"
                                                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                                                    }`}>
                                                                    {["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
                                                                </span>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="p-4 text-center border-b border-gray-50">
                                                                {(() => {
                                                                    const rawStatus = log.status || log.Status;
                                                                    const effectiveStatus = (rawStatus && rawStatus !== 'In Progress') ? rawStatus : ((log.endTime || log["End Time"]) ? "Completed" : "In Progress");
                                                                    const isRework = rawStatus === 'Rework';
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
                                    <p className="text-sm text-slate-500 text-center py-8">No work logs found for this employee.</p>
                                )}
                            </div>

                            {/* 5. Auto Screenshots */}
                            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 p-6 md:p-8">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <Camera className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        Auto Screenshots
                                    </h2>
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                                        {employeeData.screenshots?.length || 0} Captures
                                    </span>
                                </div>

                                {employeeData.screenshots && employeeData.screenshots.length > 0 ? (
                                    <div className="max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {employeeData.screenshots.map((shot, idx) => (
                                                <div key={idx} className="group flex flex-col bg-white border border-slate-200 hover:border-indigo-300 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5">

                                                    {/* Image Container */}
                                                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                                                        <a
                                                            href={shot.url.startsWith('http') ? shot.url : `${API_URL.replace('/api', '')}${shot.url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="block w-full h-full"
                                                        >
                                                            <img
                                                                src={shot.url.startsWith('http') ? shot.url : `${API_URL.replace('/api', '')}${shot.url}`}
                                                                alt="Screenshot capture"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    // Optional fallback if needed, but primarily rely on the active API_URL
                                                                    e.target.src = `https://task-manager-fox-frontend.onrender.com${shot.url}`;
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors duration-300"></div>
                                                        </a>
                                                    </div>

                                                    {/* Details Container */}
                                                    <div className="p-4 flex-1 flex flex-col">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold tracking-wider uppercase">
                                                                <Calendar size={12} className="text-indigo-400" />
                                                                {new Date(shot.timestamp).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-slate-600 text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                                                <Clock size={12} />
                                                                {new Date(shot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                                                            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                                                                Serial No
                                                            </span>
                                                            <span className="font-mono text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 px-2 py-1 rounded truncate max-w-[120px]" title={shot.deviceSerial}>
                                                                {shot.deviceSerial || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                            <ImageIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-700 mb-1">No Captures Found</h3>
                                        <p className="text-xs text-slate-500 max-w-sm">There are no automated screenshots recorded for this employee in the system yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* 5. Leaves */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-pink-600" />
                                    Leave Applications
                                </h2>
                                {employeeData.leaves && employeeData.leaves.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {employeeData.leaves.slice(0, 6).map((leave, idx) => (
                                            <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative overflow-hidden">
                                                <div className={`absolute top-0 left-0 w-1 h-full ${leave.status === 'Approved' ? 'bg-green-500' :
                                                    leave.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`}></div>
                                                <div className="flex justify-between items-start pl-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 text-sm">{leave.leaveType}</h4>
                                                        <p className="text-xs text-slate-500 mt-1">{leave.leaveCategory}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                        leave.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {leave.status}
                                                    </span>
                                                </div>
                                                <div className="mt-3 pl-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                    <p>Applied: <span className="font-medium text-slate-900">{formatDate(leave.appliedDate)}</span></p>
                                                    <p>Target: <span className="font-medium text-slate-900">{formatDate(leave.leaveDate || leave.permissionDate)}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">No leave requests found.</p>
                                )}
                            </div>

                        </div>
                    )}

                </div>
            </div>

            <LogDetailsModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
                employees={[]}
            />

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

export default EmployeeReportPage;
