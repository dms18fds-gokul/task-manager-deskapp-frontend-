import React from "react";
import { FaTimes, FaDownload, FaFileAlt, FaFileAudio } from "react-icons/fa";
import { API_URL } from "../utils/config";

const LogDetailsModal = ({ isOpen, onClose, log, employees = [] }) => {
    if (!isOpen || !log) return null;

    // Resolve Employee Name and Role from log data (backend enriched)
    const employeeName = log.employeeName || log.employeeId?.name || "N/A";
    const employeeRole = log.employeeRole || log.employeeId?.role || "N/A";

    // --- Helper Functions ---
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

        const startDate = new Date(0, 0, 0, endHours, endMins, endSecs); // Changed to end date for correct calculation
        const endDate = new Date(0, 0, 0, startHours, startMins, startSecs); // Changed to start date for correct calculation

        let diff = startDate.getTime() - endDate.getTime(); // Swapped startDate and endDate for correct diff

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

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                {/* Header Section */}
                <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-start sticky top-0 z-10">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 py-5">
                            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold border border-indigo-100 uppercase tracking-wide">
                                Task #{log.displayTaskNo || log.taskNo || "N/A"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm text-gray-500 font-medium">{log.date}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {log.projectName}
                        </h3>
                        <div className="mt-2 text-sm text-gray-500 font-medium flex items-center gap-3">
                            <span>{log.taskType || "General Task"}</span>
                            {(() => {
                                const effectiveStatus = (log.status && log.status !== 'In Progress') ? log.status : (log.endTime ? "Completed" : "In Progress");
                                const isRework = log.status === 'Rework';
                                return (
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${isRework ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        effectiveStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            (effectiveStatus === 'Hold' || effectiveStatus === 'Hold_RW' || effectiveStatus.startsWith('Hold_Re')) ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-sky-50 text-sky-700 border-sky-100'
                                        }`}>
                                        {isRework ? 'Rework' : effectiveStatus}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                            <FaTimes size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* People Section - Clean Grid */}
                    <div className="grid grid-cols-3 gap-y-4 gap-x-8">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Assigned By</label>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {(log.assignedBy || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{log.assignedBy || "Unknown"}</p>
                                    <p className="text-[10px] text-gray-400">{log.assignedByRole || "Assigner"}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Task Owner</label>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                    {(log.taskOwner || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{log.taskOwner || "Unknown"}</p>
                                    <p className="text-[10px] text-gray-400">{log.taskOwnerRole || "Owner"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Employee Field - Only show if different from Owner or strictly required */}
                        {/* Assuming Employee = Task Owner mostly, but if needed specifically: */}
                        {/* Employee Field */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Employee Name</label>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                                    {(employeeName || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{employeeName}</p>
                                    <p className="text-[10px] text-gray-400">{employeeRole}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Description</label>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 group hover:border-indigo-100 transition-colors">
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                                {log.description || "No description provided for this task."}
                            </p>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    {(log.documentPath || log.audioPath) && (
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Attachments</label>
                            <div className="flex flex-wrap gap-2">
                                {log.documentPath && (
                                    <button
                                        onClick={(e) => downloadFile(e, log.documentPath)}
                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-xs font-bold border border-indigo-100"
                                    >
                                        <FaFileAlt /> Document
                                    </button>
                                )}
                                {log.audioPath && (
                                    <button
                                        onClick={(e) => downloadFile(e, log.audioPath)}
                                        className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-xs font-bold border border-purple-100"
                                    >
                                        <FaFileAudio /> Audio
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Timeline Section */}
                    <div>
                        <div className="flex border border-gray-100 rounded-xl p-4 shadow-sm bg-white text-center divide-x divide-gray-100">
                            <div className="flex-1 px-2">
                                <span className="block text-xs font-bold text-gray-400 mb-1">Start</span>
                                <span className="text-base font-bold text-blue-600 font-mono">{formatTime(log.startTime)}</span>
                            </div>
                            <div className="flex-1 px-2">
                                <span className="block text-xs font-bold text-gray-400 mb-1">End</span>
                                <span className="text-base font-bold text-purple-600 font-mono">{formatTime(log.endTime)}</span>
                            </div>
                            <div className="flex-1 px-2">
                                <span className="block text-xs font-bold text-gray-400 mb-1">Duration</span>
                                <span className="text-base font-bold text-emerald-600">{displayDuration}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogDetailsModal;
