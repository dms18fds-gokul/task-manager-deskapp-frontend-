import React from 'react';
import { FaTimes, FaHistory } from 'react-icons/fa';

const TaskTimelineModal = ({ task, onClose }) => {
    if (!task) return null;

    // Helper to format time to "hh:mm AM/PM"
    const formatTime = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <FaHistory className="text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Task Timeline</h3>
                            <p className="text-sm text-gray-500 font-medium">History for: <span className="text-indigo-600">{task.taskTitle}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {versions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No timeline data available for this task.
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {versions.map((version) => {
                                const sessions = groupedSessions[version];
                                const isRework = Number(version) > 0;
                                const title = isRework ? `Rework ${version}` : `Original Task`;

                                return (
                                    <div key={version} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden animate-fade-in-up">
                                        <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
                                            <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${isRework ? 'bg-purple-500' : 'bg-indigo-500'}`}></span>
                                                {title}
                                            </h4>
                                            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                                {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/5">Start Time</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/5">Hold Time / End Time</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/5">Completed Time</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/5">Duration</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {sessions.map((session, index) => {
                                                        const isLast = index === sessions.length - 1;
                                                        const isCompletedStatus = task.status === 'Completed';

                                                        // Determine if this session represents the "Completion" event
                                                        // It counts as "Completed Time" if it's the LAST session AND the task status is Completed.
                                                        const showAsCompleted = isLast && isCompletedStatus && session.endTime;

                                                        // "Hold Time" logic: If session ended but task NOT completed (or not last session), it's a Hold/Pause.
                                                        const showAsHold = session.endTime && !showAsCompleted;

                                                        return (
                                                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-50">
                                                                    {formatTime(session.startTime)}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-50">
                                                                    {showAsHold ? (
                                                                        <span className="text-amber-600 font-medium">
                                                                            {formatTime(session.endTime)}
                                                                        </span>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold border-r border-gray-50">
                                                                    {showAsCompleted ? (
                                                                        <span className="text-emerald-600">
                                                                            {formatTime(session.endTime)}
                                                                        </span>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-medium text-indigo-600 border-r border-gray-50">
                                                                    {calculateDuration(session.startTime, session.endTime)}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-400 text-right">
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
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskTimelineModal;
