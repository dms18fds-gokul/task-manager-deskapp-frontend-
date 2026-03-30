import React, { useEffect, useState } from "react";
import { FaTimes, FaBriefcase, FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";
import { API_URL } from "../utils/config";
import axios from "axios";
import TableLoader from "./TableLoader";
import LogDetailsModal from "./LogDetailsModal";

const EmployeeDayLogsModal = ({ isOpen, onClose, employeeId, employeeName, date }) => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        if (isOpen && employeeId && date) {
            fetchLogs();
        }
    }, [isOpen, employeeId, date]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/work-logs?employeeId=${employeeId}&date=${date}`);
            setLogs(res.data);
        } catch (error) {
            console.error("Error fetching day logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (time24) => {
        if (!time24) return "";
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const parseDurationToMinutes = (durationStr) => {
        if (!durationStr) return 0;
        let totalMinutes = 0;
        const parts = durationStr.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('hr')) {
                totalMinutes += parseInt(parts[i - 1], 10) * 60;
            } else if (parts[i].includes('min')) {
                totalMinutes += parseInt(parts[i - 1], 10);
            }
        }
        return totalMinutes;
    };

    const formatTotalDuration = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        return `${hours} hr ${minutes} min`;
    };

    const totals = logs.reduce((acc, log) => {
        const mins = parseDurationToMinutes(log.duration || log.timeAutomation || "");
        const type = log.logType;

        if (["QT Task", "QT", "Quick"].includes(type)) {
            acc.qt += mins;
        } else if (type === "Meeting") {
            acc.meeting += mins;
        } else if (type === "RT" || type === "Recurring Task") {
            acc.rt += mins;
        } else {
            acc.main += mins;
        }
        acc.total += mins;
        return acc;
    }, { qt: 0, meeting: 0, rt: 0, main: 0, total: 0 });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] xl:max-w-7xl overflow-hidden flex flex-col max-h-[70vh] border border-gray-100 transform transition-all scale-100 opacity-100 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <FaBriefcase className="text-indigo-500 text-[10px]" />
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Employee Activity</label>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                            {employeeName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="bg-white px-4 py-1.5 rounded-xl border border-gray-100 flex items-center gap-3">
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                    <FaCalendarAlt className="text-emerald-500 text-[10px]" />
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
                                </div>
                                <p className="text-sm font-extrabold text-slate-700 tracking-tight">{date}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 rounded-xl shadow-sm active:scale-90 group"
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>
                </div>

                {/* Time Summary Row */}
                {!isLoading && logs.length > 0 && (
                    <div className="flex flex-wrap gap-2 md:gap-3 px-4 md:px-6 py-2.5 bg-gray-50/50 border-b border-gray-100 items-center">
                        <div className="flex items-center gap-2 mr-auto mb-2 md:mb-0 w-full md:w-auto">
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                {logs.length} {logs.length === 1 ? 'Log' : 'Logs'} Found
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <div className="bg-purple-50/50 px-3 py-1.5 rounded-lg border border-purple-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">QT:</span>
                                <span className="text-[12px] font-semibold text-purple-600">{formatTotalDuration(totals.qt)}</span>
                            </div>
                            <div className="bg-teal-50/50 px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Meet:</span>
                                <span className="text-[12px] font-semibold text-teal-600">{formatTotalDuration(totals.meeting)}</span>
                            </div>
                            <div className="bg-rose-50/50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">RT:</span>
                                <span className="text-[12px] font-semibold text-rose-600">{formatTotalDuration(totals.rt)}</span>
                            </div>
                            <div className="bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Main:</span>
                                <span className="text-[12px] font-semibold text-blue-600">{formatTotalDuration(totals.main)}</span>
                            </div>
                            <div className="bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2 shadow-sm">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total:</span>
                                <span className="text-[13px] font-semibold text-indigo-600">{formatTotalDuration(totals.total)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {isLoading ? (
                        <div className="py-32">
                            <TableLoader />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4 text-slate-400">
                            <FaExclamationCircle className="text-4xl text-slate-200" />
                            <p className="text-lg font-bold text-slate-500">No logs found for this day.</p>
                        </div>
                    ) : (
                        <div className="responsive-table-container">
                            <table className="w-full text-left border-collapse min-w-[1000px] xl:min-w-full table-fixed">
                                <thead className="bg-[#f8faff] sticky top-0 z-10">
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
                                    {logs.map((log, index) => {
                                        const mins = parseDurationToMinutes(log.duration || log.timeAutomation || "");
                                        const displayDuration = `${Math.floor(mins / 60)} hr ${mins % 60} min`;
                                        const displayTaskNo = (log.taskNo || "0").toString().padStart(2, '0');
                                        
                                        return (
                                            <tr 
                                                key={log._id} 
                                                className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                onClick={() => setSelectedLog({ ...log, displayTaskNo: (log.taskNo || "0").toString().padStart(2, '0') })}
                                            >
                                                <td className="p-4 text-xs font-bold text-gray-400 text-center">
                                                    <div className="flex flex-col justify-center items-center gap-1.5 mt-1">
                                                        <span>{(logs.length - index).toString().padStart(2, '0')}</span>
                                                        <span
                                                            className={`w-2 h-2 shrink-0 rounded-[2px] ${log.isPendingOffline || log.logType === 'Offline Task' ? 'bg-red-500' : 'bg-green-500'}`}
                                                            title={log.isPendingOffline ? 'Offline Task Pending' : log.logType === 'Offline Task' ? 'Offline Task' : 'Online Task'}
                                                        ></span>
                                                    </div>
                                                </td>

                                                {/* Employee Name */}
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">
                                                                {log.employeeId?.name || log.taskOwner || employeeName}
                                                            </span>
                                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">
                                                                #{displayTaskNo}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-400 font-medium truncate mt-0.5">
                                                            {log.employeeId?.role || log.employeeRole || ""}
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
                                                            {log.taskType || log.category || "Task"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Description */}
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={log.description || log.taskTitle}>
                                                            {log.description || log.taskTitle || "No description provided"}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Time & Duration */}
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800">
                                                            {displayDuration}
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
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                                        log.logType === 'Meeting' ? 'bg-teal-50 text-teal-700 border-teal-100' : 
                                                        ["QT Task", "QT", "Quick"].includes(log.logType) ? "bg-purple-50 text-purple-700 border-purple-100" : 
                                                        (log.logType === 'RT' || log.logType === 'Recurring Task') ? "bg-orange-50 text-orange-700 border-orange-100" : 
                                                        "bg-blue-50 text-blue-700 border-blue-100"
                                                    }`}>
                                                        {log.logType === 'Meeting' ? 'Meeting' : 
                                                         ["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : 
                                                         (log.logType === 'RT' || log.logType === 'Recurring Task') ? "RT" : "Main"}
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
                    )}
                </div>

            </div>

            <LogDetailsModal 
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
            />
        </div>
    );
};

export default EmployeeDayLogsModal;
