import React from 'react';
import {
    FaTimes, FaFileAlt, FaFileAudio, FaBriefcase, FaCalendarAlt,
    FaHashtag, FaInfoCircle, FaTag, FaAlignLeft, FaUserShield, FaUser,
    FaClock, FaExclamationCircle
} from "react-icons/fa";
import { API_URL } from "../utils/config";

const LogDetailsModal = ({ isOpen, onClose, log, employees = [] }) => {
    if (!isOpen || !log) return null;

    // --- Helper Functions ---
    const formatTime = (time24) => {
        if (!time24) return "";
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const parseTimeStr = (timeStr) => {
        if (!timeStr) return 0;
        const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
        if (!match) return 0;
        let [_, hStr, mStr, modifier] = match;
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (modifier) {
            modifier = modifier.toUpperCase();
            if (modifier === 'PM' && h < 12) h += 12;
            if (modifier === 'AM' && h === 12) h = 0;
        }
        return h * 60 + m;
    };

    const calculateDurationStr = (start, end) => {
        if (!start || !end) return "";
        const startMins = parseTimeStr(start);
        const endMins = parseTimeStr(end);
        let diff = endMins - startMins;
        if (diff < 0) diff += 1440;

        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;

        let durationString = "";
        if (hours > 0) durationString += `${hours} hr${hours > 1 ? 's' : ''} `;
        if (minutes > 0) durationString += `${minutes} min${minutes > 1 ? 's' : ''}`;

        return durationString.trim() || "0 min";
    };

    const calculateDurationMins = (start, end) => {
        if (!start || !end) return 0;
        const startMins = parseTimeStr(start);
        const endMins = parseTimeStr(end);
        let diff = endMins - startMins;
        if (diff < 0) diff += 1440;
        return diff;
    };

    const downloadFile = (e, path) => {
        e.stopPropagation();
        if (!path) return;
        const link = document.createElement('a');
        link.href = `${API_URL}/uploads/${path}`;
        link.download = path;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const displayDuration = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
    const effectiveStatus = (log.status && log.status !== 'In Progress') ? log.status : (log.endTime ? "Completed" : "In Progress");
    const isRework = log.status === 'Rework';
    const isMeeting = log.logType === 'Meeting';
    const isQT = ["QT Task", "QT", "Quick"].includes(log.logType);
    const isRT = log.logType === "RT";

    const getDynamicLabel = () => {
        if (isMeeting) return "Meeting";
        if (isQT) return "QT Task No";
        if (isRT) return "RT Task No";
        return "Main Task";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[calc(100%-2rem)] md:max-w-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-200">

                {/* 1. Header: Project Name (left) & Date (right) */}
                <div className="px-4 md:px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <FaBriefcase className="text-gray-400 text-xs" />
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project</label>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 line-clamp-1">
                            {log.projectName}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                            {log.logType === 'Meeting' ? "Discussion" :
                            (["QT Task", "QT", "Quick", "RT"].includes(log.logType) ? (log.taskType || "Discussion") : (log.taskTitle || "Discussion"))}
                        </p>
                    </div>
                    <div className="text-right flex items-center gap-3 md:gap-6">
                        <div>
                            <div className="flex items-center justify-end gap-2 mb-0.5">
                                <FaCalendarAlt className="text-gray-400 text-xs" />
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                            </div>
                            <p className="text-xs md:text-sm font-semibold text-gray-700">{log.date}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                            <FaTimes size={18} />
                        </button>
                    </div>
                </div>

                <div className="px-4 md:px-8 py-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">

                    {/* Log Type & Task Type */}
                    <div className="pb-2 flex items-center gap-3">
                        {!isRT && (
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${log.logType === 'Meeting' ? 'bg-teal-50 text-teal-700 border-teal-100' : ["QT Task", "QT", "Quick"].includes(log.logType) ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                {log.logType === 'Meeting' ? 'Meeting' : ["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
                            </span>
                        )}
                        {log.taskType && (
                            <span className={`text-[10px] text-gray-400 uppercase tracking-widest font-extrabold ${!isRT ? 'border-l border-gray-200 pl-3' : ''}`}>
                                {log.taskType}
                            </span>
                        )}
                    </div>

                    {/* 3. Task No || Status Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-4">
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                                <FaHashtag className="text-gray-400 text-sm" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{getDynamicLabel()}</label>
                                <p className="text-[14px] font-semibold text-gray-800"># {log.displayTaskNo || log.taskNo || "01"}</p>
                            </div>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-4">
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                                <FaInfoCircle className={`${isRework ? 'text-red-400' :
                                    effectiveStatus === 'Completed' ? 'text-green-400' :
                                        effectiveStatus.startsWith('Hold') ? 'text-orange-400' :
                                            'text-blue-400'
                                    } text-sm`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</label>
                                <p className={`text-[12px] font-bold uppercase ${isRework ? 'text-red-600' :
                                    effectiveStatus === 'Completed' ? 'text-green-600' :
                                        effectiveStatus.startsWith('Hold') ? 'text-orange-600' :
                                            'text-blue-600'
                                    }`}>
                                    {isRework ? 'Rework' : effectiveStatus}
                                </p>
                            </div>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-4">
                            <div className="p-2.5 bg-gray-50 rounded-lg">
                                <FaExclamationCircle className={`${log.priority === 'Very High' ? 'text-red-500' :
                                    log.priority === 'High' ? 'text-orange-500' :
                                        log.priority === 'Medium' ? 'text-yellow-500' :
                                            log.priority === 'Low' ? 'text-blue-500' :
                                                log.priority === 'Very Low' ? 'text-gray-400' :
                                                    'text-gray-500'
                                    } text-sm`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Priority</label>
                                <p className={`text-[12px] font-bold uppercase ${log.priority === 'Very High' ? 'text-red-600' :
                                    log.priority === 'High' ? 'text-orange-600' :
                                        log.priority === 'Medium' ? 'text-yellow-600' :
                                            log.priority === 'Low' ? 'text-blue-600' :
                                                log.priority === 'Very Low' ? 'text-gray-500' :
                                                    'text-gray-600'
                                    }`}>
                                    {log.priority || "Medium"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4. Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FaAlignLeft className="text-gray-400 text-[10px]" />
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-[150px] overflow-y-auto custom-scrollbar">
                            <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                                {log.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {/* 5. Assigned By || Task Owner row (Card Style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                <FaUserShield size={16} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    {isMeeting ? "Conducted By" : "Assigned By"}
                                </label>
                                <p className="text-[13px] font-bold text-gray-800 uppercase">
                                    {isMeeting
                                        ? (Array.isArray(log.participants) ? log.participants.map(p => typeof p === 'object' ? p.value : p).join(", ") : (log.participants || "Unknown"))
                                        : (log.assignedBy || "Unknown")}
                                </p>
                            </div>
                        </div>

                        <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                <FaUser size={16} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Task Owner</label>
                                <p className="text-[13px] font-bold text-gray-800 uppercase">{log.taskOwner || "Unknown"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table Format for Session Details */}
                    <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <FaClock className="text-gray-400 text-[10px]" />
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session Details</label>
                        </div>
                        <div className="responsive-table-container">
                            <table className="w-full text-left bg-white min-w-[300px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Time</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Time</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                                        {log.deductedMins > 0 && <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deduction</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors text-sm font-medium text-gray-700">
                                        <td className="px-4 py-3">{formatTime(log.startTime)}</td>
                                        <td className="px-4 py-3">{formatTime(log.endTime)}</td>
                                        <td className="px-4 py-3 text-blue-600 font-bold">
                                            {displayDuration}
                                        </td>
                                        {log.deductedMins > 0 && (
                                            <td className="px-4 py-3 text-rose-600 font-bold">-{log.deductedMins}m</td>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {log.deductedMins > 0 && (
                        <div className="pt-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <FaExclamationCircle className="text-rose-500 text-[10px]" />
                                <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Deduction Details</label>
                            </div>
                            <div className="responsive-table-container">
                                <table className="w-full text-left bg-white min-w-[500px] border border-rose-100 rounded-xl overflow-hidden shadow-sm">
                                    <thead className="bg-rose-50 border-b border-rose-100">
                                        <tr>
                                            <th className="px-3 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-wider w-10 text-center border-r border-rose-100/50">#</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-wider border-r border-rose-100/50">Project / Title</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-wider border-r border-rose-100/50">Description</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-wider border-r border-rose-100/50">Time Range</th>
                                            <th className="px-3 py-2 text-[10px] font-bold text-rose-500 uppercase tracking-wider text-right">Mins</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {log.deductionDetails && log.deductionDetails.map((d, i) => (
                                            <tr key={i} className="border-b border-rose-50/50 last:border-0 hover:bg-rose-50/30 transition-colors text-sm font-medium text-gray-700">
                                                <td className="px-3 py-3 text-center text-rose-300 font-mono text-xs border-r border-rose-50/50">{(i + 1).toString().padStart(2, '0')}</td>
                                                <td className="px-3 py-3 border-r border-rose-50/50">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[120px]">{d.projectName || "N/A"}</p>
                                                    <p className="font-bold text-gray-800 uppercase text-[11px] truncate max-w-[150px]">{d.title || "Meeting"}</p>
                                                </td>
                                                <td className="px-3 py-3 border-r border-rose-50/50">
                                                    <p className="text-[11px] text-gray-600 line-clamp-2 min-w-[150px] leading-relaxed">
                                                        {d.description || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3 font-mono text-rose-600 text-[11px] border-r border-rose-50/50 whitespace-nowrap">{d.start} - {d.end}</td>
                                                <td className="px-3 py-3 text-right font-bold text-rose-600 text-[12px]">
                                                    {d.duration || calculateDurationMins(d.start, d.end)}m
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-rose-50/50">
                                            <td colSpan="4" className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-rose-400 border-r border-rose-100">Total Deduction</td>
                                            <td className="px-3 py-2 text-right text-rose-600 font-black text-xs">-{log.deductedMins}m</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Optional Downloads if any */}
                    {(log.documentPath || log.audioPath) && (
                        <div className="flex flex-wrap gap-4 pt-2">
                            {log.documentPath && (
                                <button
                                    onClick={(e) => downloadFile(e, log.documentPath)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs font-bold border border-gray-200"
                                >
                                    <FaFileAlt size={14} className="text-gray-400" /> View Document
                                </button>
                            )}
                            {log.audioPath && (
                                <button
                                    onClick={(e) => downloadFile(e, log.audioPath)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs font-bold border border-gray-200"
                                >
                                    <FaFileAudio size={14} className="text-gray-400" /> Play Audio
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogDetailsModal;
