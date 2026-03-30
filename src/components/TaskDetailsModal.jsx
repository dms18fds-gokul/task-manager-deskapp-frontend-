import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getSocketUrl } from "../utils/config";
import { FaCalendarAlt, FaFileAlt, FaMicrophone, FaDownload, FaHistory, FaInfoCircle, FaLevelDownAlt, FaUser, FaCommentDots, FaClock, FaExclamationCircle } from 'react-icons/fa';
import StatusBadge from './StatusBadge';

// Recursive Read-Only Component for Task Tree
const ReadOnlyTaskNode = ({ node, level = 0, nodeNumber = "", employees = [] }) => {
    if (!node) return null;

    const hasAssignees = Array.isArray(node.assignee) ? node.assignee.length > 0 : !!node.assignee;

    // Map internal DB String Hash IDs to Human Names
    const getAssigneeNames = () => {
        if (!hasAssignees) return "None";
        const idList = Array.isArray(node.assignee) ? node.assignee : [node.assignee];

        // Fallback display if employee list takes a second to mount
        if (employees.length === 0) return `${idList.length} Member${idList.length !== 1 ? 's' : ''}`;

        const names = idList.map(id => {
            const emp = employees.find(e => e._id === id || e.id === id);
            return emp ? emp.name : "Unknown User";
        });

        return names.join(', ');
    };

    return (
        <div className={`mt-2 ${level > 0 ? 'ml-4 sm:ml-6 pl-4 border-l-2 border-indigo-100/50 relative text-sm' : ''}`}>

            {level > 0 && (
                <div className="absolute -left-[1.5px] top-4 w-3 sm:w-4 border-t-2 border-indigo-100/50"></div>
            )}

            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${level === 0 ? 'ring-1 ring-indigo-50/50' : ''}`}>
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                        <span className={`flex items-center justify-center min-w-[24px] px-1.5 h-6 rounded-full font-bold text-[11px] font-mono ${level === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {level === 0 ? "M" : nodeNumber}
                        </span>
                        <h4 className="font-bold text-slate-800 tracking-tight">{node.title || "Untitled Task"}</h4>
                    </div>

                    <div className="flex items-start gap-2 text-xs font-semibold text-gray-500 pl-8">
                        <FaUser className="mt-0.5 text-indigo-400 opacity-70" />
                        <span>
                            <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mr-1">Assignees:</span>
                            {hasAssignees ? (
                                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                    {getAssigneeNames()}
                                </span>
                            ) : (
                                "None"
                            )}
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-3 bg-white">
                    {node.description && (
                        <div>
                            <span className="text-gray-400 font-black uppercase tracking-widest text-[10px] block mb-1">Description</span>
                            <p className="text-gray-600 text-[13px] leading-relaxed whitespace-pre-wrap">{node.description}</p>
                        </div>
                    )}
                </div>
            </div>

            {node.subtasks && node.subtasks.length > 0 && (
                <div className="mt-2 space-y-3">
                    {node.subtasks.map((sub, index) => {
                        const childNumber = level === 0 ? `${index + 1}` : `${nodeNumber}.${index + 1}`;
                        return <ReadOnlyTaskNode key={sub.id || index} node={sub} level={level + 1} nodeNumber={childNumber} employees={employees} />;
                    })}
                </div>
            )}
        </div>
    );
};

const TaskDetailsModal = ({ task, onClose, isAdmin, onStatusChange }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('details');
    const [employees, setEmployees] = useState([]);
    const [openDeductionId, setOpenDeductionId] = useState(null); // To track which session's deduction is open

    React.useEffect(() => {
        const fetchEmployees = async () => {
            try {
                // Instantly load from previous Dashboard caches if available for zero-latency
                const cached = localStorage.getItem('cachedAssignmentEmployees');
                if (cached) {
                    setEmployees(JSON.parse(cached));
                }

                // If online, ping server to guarantee 100% up-to-date registry mapped safely
                if (navigator.onLine) {
                    const res = await fetch(`${API_URL}/employee/all`);
                    if (res.ok) {
                        const data = await res.json();
                        setEmployees(data);
                        localStorage.setItem('cachedAssignmentEmployees', JSON.stringify(data));
                    }
                }
            } catch (err) {
            }
        };
        fetchEmployees();
    }, []);

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

    // Helper for relative time (Smart Context)
    const getRelativeTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 0) {
            const absDays = Math.abs(diffDays);
            if (absDays === 1) return "Due tomorrow";
            return `Due in ${absDays} days`;
        }
        return `${diffDays} days ago`;
    };

    // Helper for Task Progress (Dummy logic or based on subtasks if Group)
    const getStatusColor = (s) => {
        switch (s) {
            case "Completed": return "emerald";
            case "In Progress": return "blue";
            case "Hold": return "amber";
            case "Overdue": return "rose";
            default: return "slate";
        }
    };

    const statusTheme = getStatusColor(task.status);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100%-2rem)] md:max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh] relative border border-gray-100">
                
                {/* Status Accent Bar [SMART] */}
                <div className={`h-1.5 w-full bg-${statusTheme}-600 ${task.status === "In Progress" ? "animate-pulse" : ""}`}></div>

                {/* Header */}
                {task.taskType === "Group Task" ? (
                    <div className="bg-white px-4 md:px-8 py-4 md:py-7 border-b border-gray-100 flex flex-col gap-5">
                        {/* Top Row: Project Name | Priority | Status | Chat */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="text-md font-black text-indigo-700 uppercase tracking-[0.2em]">{task.projectName}</h3>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm border ${
                                    task.priority === "Very High" ? "bg-red-50 text-red-600 border-red-200" :
                                    task.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-200" :
                                    task.priority === "Medium" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                    task.priority === "Low" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                    task.priority === "Very Low" ? "bg-gray-100 text-gray-600 border-gray-300" :
                                    "bg-gray-50 text-gray-600 border-gray-200"
                                }`}>
                                    {task.priority ? task.priority.toUpperCase() : "MEDIUM"}
                                </span>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <StatusBadge 
                                    status={task.status} 
                                    onChange={(val) => onStatusChange && onStatusChange(task._id, val)}
                                    readOnly={true}
                                />
                            </div>
                            <button 
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${API_URL}/channels/task/${task._id}`, {
                                            headers: { 'x-auth-token': token }
                                        });
                                        if (res.ok) {
                                            const channel = await res.json();
                                            navigate(`/chat/${channel._id}`);
                                            onClose();
                                        } else {
                                            alert("No channel found for this task yet.");
                                        }
                                    } catch (error) {
                                        alert("Error navigating to chat");
                                    }
                                }}
                                className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[13px] font-bold shadow-sm border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all hover:scale-105 active:scale-95"
                            >
                                <FaCommentDots className="text-indigo-500" /> Chat
                            </button>
                        </div>

                        {/* Next: Task Title */}
                        <div className="flex items-baseline gap-2 group/title">
                            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none group-hover/title:text-indigo-700 transition-colors">
                                {task.taskTitle}
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest shadow-sm bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md">
                                Group Task
                            </span>
                        </div>

                        {/* Next: Task Lead (Fallback to Project Lead) || Assigned By */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50 shadow-sm">
                                <span className="font-black text-gray-400 uppercase tracking-widest text-[9px]">Task Lead</span>
                                <span className="font-bold text-slate-800 text-[13px]">
                                    {task.taskLead ? task.taskLead.name : (task.projectLead && task.projectLead.length > 0 ? task.projectLead.map(p => p.name).join(", ") : "N/A")}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 shadow-sm transition-all hover:bg-indigo-100/50">
                                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px]">Assigned By</span>
                                <span className="font-extrabold text-indigo-800 text-[13px]">{task.assignedBy ? task.assignedBy.name : "Admin"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 shadow-sm transition-all hover:bg-indigo-100/50">
                                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px]">Type</span>
                                <span className="font-extrabold text-indigo-800 text-[13px]">Group Task</span>
                            </div>
                        </div>

                        {/* Next Row: Created Date */}
                        <div className="flex flex-wrap items-center gap-6 mt-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/60 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <FaCalendarAlt className="text-gray-400" size={14} />
                                </div>
                                <div>
                                    <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] block text-nowrap">Created Date</span>
                                    <span className="font-bold text-slate-800 text-[13px] inline-flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                        {task.startDate} <span className="text-gray-400 font-medium">at</span> {formatTo12Hour(task.startTime)}
                                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-slate-200/40">{getRelativeTime(task.startDate)}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white px-4 md:px-8 py-4 md:py-7 border-b border-gray-100 flex flex-col gap-5">
                        {/* Top Row: Project Name | Priority | Status | Chat */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="text-md font-black text-indigo-700 uppercase tracking-[0.2em]">{task.projectName}</h3>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm border ${
                                    task.priority === "Very High" ? "bg-red-50 text-red-600 border-red-200" :
                                    task.priority === "High" ? "bg-orange-50 text-orange-600 border-orange-200" :
                                    task.priority === "Medium" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                    task.priority === "Low" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                    task.priority === "Very Low" ? "bg-gray-100 text-gray-600 border-gray-300" :
                                    "bg-gray-50 text-gray-600 border-gray-200"
                                }`}>
                                    {task.priority ? task.priority.toUpperCase() : "MEDIUM"}
                                </span>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <StatusBadge 
                                    status={task.status} 
                                    onChange={(val) => onStatusChange && onStatusChange(task._id, val)}
                                    readOnly={true}
                                />
                            </div>
                            <button 
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${API_URL}/channels/task/${task._id}`, {
                                            headers: { 'x-auth-token': token }
                                        });
                                        if (res.ok) {
                                            const channel = await res.json();
                                            navigate(`/chat/${channel._id}`);
                                            onClose(); // Close modal after navigating
                                        } else {
                                            alert("No channel found for this task yet.");
                                        }
                                    } catch (error) {
                                        alert("Error navigating to chat");
                                    }
                                }}
                                className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[13px] font-bold shadow-sm border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all hover:scale-105 active:scale-95"
                            >
                                <FaCommentDots className="text-indigo-500" /> Chat
                            </button>
                        </div>
                        
                        {/* Next: Task Title */}
                        <div className="flex items-baseline gap-2 group/title">
                            <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none group-hover/title:text-indigo-700 transition-colors">
                                {task.taskTitle}
                            </h2>
                            {task.taskNumber && (
                                <span className="text-sm font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">#{task.taskNumber}</span>
                            )}
                        </div>

                        {/* Next Row: Task Lead (Fallback to Project Lead/Assigned By) */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 shadow-sm transition-all hover:bg-indigo-100/50">
                                <span className="font-black text-indigo-400 uppercase tracking-widest text-[9px]">Assigned By</span>
                                <span className="font-extrabold text-indigo-800 text-[13px]">{task.assignedBy ? task.assignedBy.name : "Admin"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/50 shadow-sm transition-all hover:bg-emerald-100/50">
                                <span className="font-black text-emerald-400 uppercase tracking-widest text-[9px]">Type</span>
                                <span className="font-extrabold text-emerald-800 text-[13px]">{task.taskType || "Individual Task"}</span>
                            </div>
                        </div>

                        {/* Next Row: Due Date | Created Date */}
                        <div className="flex flex-wrap items-center gap-6 mt-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/60 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <FaClock className="text-gray-400" size={14} />
                                </div>
                                <div>
                                    <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] block">Due Date</span>
                                    <span className={`font-bold text-[13px] inline-flex items-center gap-1.5 mt-0.5 ${task.deadline ? 'text-rose-600' : 'text-gray-500'}`}>
                                        {task.deadline || "Null"}
                                        {task.deadline && <span className="bg-rose-100/50 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-rose-200/40">{getRelativeTime(task.deadline)}</span>}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="h-8 w-px bg-gray-200"></div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <FaCalendarAlt className="text-gray-400" size={14} />
                                </div>
                                <div>
                                    <span className="font-black text-gray-400 uppercase tracking-widest text-[9px] block text-nowrap">Created Date</span>
                                    <span className="font-bold text-slate-800 text-[13px] inline-flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                        {task.startDate} <span className="text-gray-400 font-medium">at</span> {formatTo12Hour(task.startTime)}
                                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-slate-200/40">{getRelativeTime(task.startDate)}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Priority Alert Banner */}
                {task.priority === "Very High" && (
                    <div className="bg-rose-600 text-white px-6 py-3 flex items-center gap-3 animate-pulse shadow-lg z-20">
                        <FaExclamationCircle className="text-white text-xl" />
                        <span className="text-sm font-black uppercase tracking-wider">
                            ⚠️ Today is the last day to complete this task!
                        </span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
                    <button
                        className={`flex-1 py-4 text-sm font-black text-center transition-all duration-300 border-b-2 ${activeTab === 'details' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FaInfoCircle /> Details
                        </div>
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-black text-center transition-all duration-300 border-b-2 ${activeTab === 'timeline' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}
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

                            {/* INDIVIDUALIZED GROUP TASK VIEW */}
                            {task.taskType === "Group Task" && task.individualizedTasks && Object.keys(task.individualizedTasks).length > 0 ? (
                                <>
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6">
                                        <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FaUser className="opacity-70" /> Individualized Assignments
                                        </h3>
                                        <div className="space-y-4">
                                            {Object.entries(task.individualizedTasks).map(([mId, details]) => {
                                                const emp = employees.find(e => e._id === mId || e.id === mId);
                                                const isCurrentUser = JSON.parse(localStorage.getItem("user"))?._id === mId;
                                                
                                                return (
                                                    <div key={mId} className={`p-4 rounded-xl border shadow-sm transition-all ${isCurrentUser ? 'bg-white border-indigo-200 ring-2 ring-indigo-50' : 'bg-white/50 border-gray-100'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                {emp ? emp.name : mId} {isCurrentUser && "(You)"}
                                                            </span>
                                                            {details.deadline && (
                                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                                                    <FaClock size={10} />
                                                                    {formatDate(details.deadline)}
                                                                    <span className="text-[8px] bg-white/60 px-1 rounded ml-1 opacity-70">({getRelativeTime(details.deadline)})</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-[15px] font-bold text-slate-800 mb-1">{details.title}</h4>
                                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{details.description}</p>
                                                        
                                                        {/* Individual Files */}
                                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100/60">
                                                            {details.documentPath && (
                                                                <a
                                                                    href={`${getSocketUrl()}/uploads/${details.documentPath}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                                                                >
                                                                    <FaFileAlt size={12} /> Document
                                                                </a>
                                                            )}
                                                            {details.audioPath && (
                                                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg">
                                                                    <FaMicrophone size={12} />
                                                                    <audio controls className="h-6 w-32 opacity-80">
                                                                        <source src={`${getSocketUrl()}/uploads/${details.audioPath}`} type="audio/webm" />
                                                                    </audio>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* STANDARD VIEW (Individual Tasks Only) */}
                                    <div className="mb-4 animate-fade-in-up">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FaFileAlt className="opacity-50" size={10} /> Description
                                        </h3>
                                        <div className="text-slate-700 text-[15px] leading-relaxed bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm ring-1 ring-slate-100/50">
                                            <p className="whitespace-pre-wrap">{task.description || "No description provided."}</p>
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    {task.documentPath && (
                                        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FaDownload className="opacity-50" size={10} /> Attached Documents
                                            </h3>
                                            <div className="flex items-center justify-between p-5 bg-white hover:border-indigo-200 border border-slate-200/60 rounded-2xl transition-all group shadow-sm ring-1 ring-slate-100/50">
                                                <div className="flex items-center space-x-4 overflow-hidden">
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <FaFileAlt size={20} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <a
                                                            href={`${getSocketUrl()}/uploads/${task.documentPath}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[15px] font-extrabold text-slate-800 hover:text-indigo-600 truncate transition-colors"
                                                        >
                                                            {task.documentPath}
                                                        </a>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Click to preview</span>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`${API_URL}/tasks/download/${task.documentPath}`}
                                                    download
                                                    className="ml-3 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Download Document"
                                                >
                                                    <FaDownload size={18} />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Audio Instructions */}
                                    {task.audioPath && (
                                        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <FaMicrophone className="opacity-50" size={10} /> Audio Instructions
                                            </h3>
                                            <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white hover:border-emerald-200 border border-slate-200/60 rounded-2xl transition-all group shadow-sm ring-1 ring-slate-100/50 gap-4">
                                                <div className="flex items-center flex-1 space-x-4 overflow-hidden w-full">
                                                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                                                        <FaMicrophone size={20} />
                                                    </div>
                                                    <audio controls className="w-full h-10 max-w-sm rounded-lg opacity-90 hover:opacity-100 transition-opacity">
                                                        <source src={`${getSocketUrl()}/uploads/${task.audioPath}`} type="audio/webm" />
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                </div>
                                                <a
                                                    href={`${API_URL}/tasks/download/${task.audioPath}`}
                                                    download
                                                    className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="Download Audio"
                                                >
                                                    <FaDownload size={18} />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Recursive Group Task Tree Viewer */}
                            {task.taskType === "Group Task" && task.taskTree && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                            <FaLevelDownAlt className="text-indigo-400" />
                                            Group Task Hierarchy
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-2 shadow-sm font-medium">Mapped breakdown of the internal subtasks inside this block.</p>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/60">
                                        {Array.isArray(task.taskTree) ? (
                                            task.taskTree.map((rootNode, idx) => (
                                                <ReadOnlyTaskNode key={idx} node={rootNode} level={0} nodeNumber={`${idx + 1}`} employees={employees} />
                                            ))
                                        ) : (
                                            <ReadOnlyTaskNode node={task.taskTree} level={0} nodeNumber="1" employees={employees} />
                                        )}
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
                                                                <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/6">Duration / Deduction</th>
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
                                                                        <td className="px-4 py-3 text-xs text-rose-600 border-r border-gray-50 align-middle">
                                                                            {session.deduction ? (
                                                                                <div className="relative inline-block">
                                                                                    <button 
                                                                                        onClick={() => setOpenDeductionId(openDeductionId === `${version}-${index}` ? null : `${version}-${index}`)}
                                                                                        className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-100 hover:bg-rose-100 transition-colors"
                                                                                        title="Click to view deduction ranges"
                                                                                    >
                                                                                        Deduction: -{formatTotalDuration(session.deduction)}
                                                                                    </button>
                                                                                    
                                                                                    {/* Deduction Details Popup (Click) */}
                                                                                    {openDeductionId === `${version}-${index}` && (
                                                                                        <>
                                                                                            <div 
                                                                                                className="fixed inset-0 z-[55]" 
                                                                                                onClick={() => setOpenDeductionId(null)}
                                                                                            ></div>
                                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] min-w-[180px] animate-in fade-in zoom-in duration-200">
                                                                                                <div className="bg-gray-900 text-white text-[11px] rounded-xl p-3 shadow-2xl border border-gray-700">
                                                                                                    <p className="font-bold mb-2 border-b border-gray-700 pb-1.5 text-gray-300 uppercase tracking-widest text-[9px]">Deduction Intervals</p>
                                                                                                    <div className="space-y-2">
                                                                                                        {session.deductionDetails && session.deductionDetails.length > 0 ? (
                                                                                                            session.deductionDetails.map((d, i) => (
                                                                                                                <div key={i} className="flex justify-between items-center gap-4 bg-white/5 p-1.5 rounded-lg border border-white/5">
                                                                                                                    <span className="text-gray-400 font-bold uppercase text-[8px] truncate max-w-[80px]" title={d.title || "Meeting"}>{d.title || "Meeting"}</span>
                                                                                                                    <span className="font-mono text-rose-400 font-black">{d.start} - {d.end}</span>
                                                                                                                </div>
                                                                                                            ))
                                                                                                        ) : (
                                                                                                            <p className="italic text-gray-500 text-[10px] py-1">No range details available</p>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    {/* Arrow */}
                                                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ) : "-"}
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
