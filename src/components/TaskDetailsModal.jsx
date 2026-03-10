import React, { useState } from 'react';
import { API_URL, getSocketUrl } from "../utils/config";
import { FaCalendarAlt, FaFileAlt, FaMicrophone, FaDownload, FaHistory, FaInfoCircle } from 'react-icons/fa';

const TaskDetailsModal = ({ task, onClose, isAdmin = false }) => {
    const [activeTab, setActiveTab] = useState('details');

    if (!task) return null;

    // Helper to format time to "hh:mm AM/PM" from Date string
    const formatTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Helper to format HH:mm or HH:mm:ss string to 12-hour AM/PM format
    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        const [hoursStr, minutesStr] = timeStr.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10) || 0;

        if (isNaN(hours) || isNaN(minutes)) return timeStr;

        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12; // Convert 0 to 12
        const formattedMinutes = minutes.toString().padStart(2, '0');

        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    // Helper to format date "DD-MM-YYYY"
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    // Group sessions by reworkVersion
    const groupedSessions = (task.sessions || []).reduce((acc, session) => {
        const version = session.reworkVersion || 0;
        if (!acc[version]) acc[version] = [];
        acc[version].push(session);
        return acc;
    }, {});

    // Sort versions (0, 1, 2...)
    const versions = Object.keys(groupedSessions).sort((a, b) => Number(a) - Number(b));


    // Helper to calculate duration
    const calculateDuration = (start, end) => {
        if (!start) return "-";
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date(); // If running, use now
        const diffMs = endTime - startTime;

        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    // Calculate total duration for all sessions
    const totalDurationMs = (task.sessions || []).reduce((acc, session) => {
        if (!session.startTime) return acc;
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : new Date();
        return acc + (end - start);
    }, 0);

    const formatTotalDuration = (ms) => {
        if (ms <= 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex flex-col gap-3">
                    {/* First Row: Priority & Task Type | Start Date, Time & Deadline */}
                    <div className="flex justify-between items-center w-full">
                        {/* Left Side: Priority & Type */}
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide ${task.priority === "High" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                task.priority === "Medium" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                    "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                }`}>
                                {task.priority ? task.priority.toUpperCase() : "NORMAL"}
                            </span>

                            {task.taskType && (
                                <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {task.taskType}
                                </span>
                            )}
                        </div>

                        {/* Right Side: Date/Time */}
                        <div className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400 mr-0.5" />
                            <span>{task.startDate}</span>
                            <span className="text-gray-300 font-light">|</span>
                            <span>{formatTo12Hour(task.startTime)}</span>

                            {task.deadline && (
                                <>
                                    <span className="text-gray-300 font-light">|</span>
                                    <span className="text-rose-600 font-bold">Due: <span className="font-medium ml-1">{task.deadline}</span></span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Second Line: Project Title */}
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mt-1">
                        {task.projectName}
                    </h3>

                    {/* Third Line: Task Title */}
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight mt-[-4px]">{task.taskTitle}</h2>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white">
                    <button
                        className={`flex-1 py-3 text-sm font-bold text-center transition border-b-2 ${activeTab === 'details' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FaInfoCircle /> Details
                        </div>
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold text-center transition border-b-2 ${activeTab === 'timeline' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FaHistory /> Timeline
                        </div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-6 custom-scrollbar">

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Description</h3>
                                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {task.description}
                                </p>
                            </div>

                            {/* Hierarchy Info */}
                            <div className="grid grid-cols-1 md:grid-cols-4 ml-1 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Department</h3>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {task.department && task.department.length > 0 ? task.department.join(", ") : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Assigned By</h3>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {task.assignedBy ? task.assignedBy.name : "Admin"}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Team Lead</h3>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {task.teamLead ? task.teamLead.name : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Project Lead</h3>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {task.projectLead && task.projectLead.length > 0
                                            ? task.projectLead.map(l => l.name).join(", ")
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>

                            {/* Documents */}
                            {task.documentPath && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Attached Documents</h3>
                                    <div className="flex items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                        <FaFileAlt className="text-indigo-600 mr-3" size={20} />
                                        <div className="flex-1 overflow-hidden">
                                            <a
                                                href={`${getSocketUrl()}/uploads/${task.documentPath}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-indigo-700 hover:text-indigo-900 truncate block"
                                            >
                                                {task.documentPath}
                                            </a>
                                        </div>
                                        <a
                                            href={`${API_URL}/tasks/download/${task.documentPath}`}
                                            download
                                            className="ml-3 p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition"
                                            title="Download Document"
                                        >
                                            <FaDownload size={16} />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Audio Instructions */}
                            {task.audioPath && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Audio Instructions</h3>
                                    <div className="flex items-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                        <FaMicrophone className="text-amber-600 mr-3" size={20} />
                                        <audio controls className="w-full h-8 mr-3">
                                            <source src={`${getSocketUrl()}/uploads/${task.audioPath}`} type="audio/webm" />
                                            Your browser does not support the audio element.
                                        </audio>
                                        <a
                                            href={`${API_URL}/tasks/download/${task.audioPath}`}
                                            download
                                            className="p-2 text-amber-600 hover:bg-amber-100 rounded-full transition"
                                            title="Download Audio"
                                        >
                                            <FaDownload size={16} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div>
                            {versions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <FaHistory className="mx-auto text-gray-300 mb-2" size={30} />
                                    <p>No timeline data available yet. Start the task to see history.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {versions.map((version) => {
                                        const sessions = groupedSessions[version];
                                        const isRework = Number(version) > 0;
                                        const title = isRework ? `Rework ${version}` : `Original Task`;

                                        return (
                                            <div key={version} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden animate-fade-in-up">
                                                <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                                                    <h4 className="font-bold text-indigo-800 flex items-center gap-2 text-sm">
                                                        <span className={`w-2 h-2 rounded-full ${isRework ? 'bg-purple-500' : 'bg-indigo-500'}`}></span>
                                                        {title}
                                                    </h4>
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                                        {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Start</th>
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Hold/End</th>
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Complete</th>
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Duration</th>
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Deduction</th>
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right w-1/6">Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {sessions.map((session, index) => {
                                                                const isLast = index === sessions.length - 1;
                                                                const isCompletedStatus = task.status === 'Completed';
                                                                const showAsCompleted = isLast && isCompletedStatus && session.endTime;
                                                                const showAsHold = session.endTime && !showAsCompleted;

                                                                return (
                                                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                                                        <td className="px-4 py-3 text-xs font-bold text-gray-900 border-r border-gray-50">
                                                                            {formatTime(session.startTime)}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-gray-600 border-r border-gray-50">
                                                                            {showAsHold ? (
                                                                                <span className="text-amber-600 font-medium">
                                                                                    {formatTime(session.endTime)}
                                                                                </span>
                                                                            ) : "-"}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs font-bold border-r border-gray-50">
                                                                            {showAsCompleted ? (
                                                                                <span className="text-emerald-600">
                                                                                    {formatTime(session.endTime)}
                                                                                </span>
                                                                            ) : "-"}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs font-medium text-indigo-600 border-r border-gray-50">
                                                                            {calculateDuration(session.startTime, session.endTime)}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-rose-600 border-r border-gray-50">
                                                                            {session.deduction ? formatTotalDuration(session.deduction) : "-"}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs text-gray-400 text-right">
                                                                            {formatDate(session.startTime)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Admin ONLY: Grand Total Footer */}
                            {isAdmin && versions.length > 0 && (
                                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex justify-between items-center">
                                    <span className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Total Working Hours</span>
                                    <span className="text-lg font-extrabold text-indigo-700 font-mono">
                                        {formatTotalDuration(totalDurationMs)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailsModal;
