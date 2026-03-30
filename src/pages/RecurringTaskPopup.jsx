import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/config";
import { FaTimes, FaHistory, FaPlus } from "react-icons/fa";

const RecurringTaskPopup = ({ onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [conflictingTask, setConflictingTask] = useState(null);
    const [showHoldConfirmation, setShowHoldConfirmation] = useState(false);
    const [pendingTimeAction, setPendingTimeAction] = useState(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const [timeModal, setTimeModal] = useState({ isOpen: false, taskId: null, type: null });

    const user = JSON.parse(localStorage.getItem("user"));
    const primaryRed = "#E11D48";

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/recurring-tasks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Error fetching recurring tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTimeClick = async (id, type) => {
        if (type === "start") {
            try {
                const res = await fetch(`${API_URL}/tasks/check/active?userId=${user._id}`);
                const data = await res.json();

                if (data.hasActiveTask) {
                    if (data.task.type === "Meeting") {
                        setTimeModal({ isOpen: true, taskId: id, type: type });
                        return;
                    }
                    setConflictingTask(data.task);
                    setPendingTimeAction({ taskId: id, type });
                    setShowHoldConfirmation(true);
                    return;
                }
            } catch (error) {
                console.error("Error checking active task:", error);
            }
        }
        setTimeModal({ isOpen: true, taskId: id, type: type });
    };

    const confirmSwitchToNewTask = async () => {
        if (!conflictingTask || !pendingTimeAction) return;
        if (isSubmittingTask) return;

        setIsSubmittingTask(true);
        try {
            const now = new Date();
            const timeData = {
                clientTime: now.toISOString(),
                localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                localDateStr: now.toLocaleDateString('en-CA')
            };

            let resHold;
            if (conflictingTask.type === "Main Task") {
                resHold = await fetch(`${API_URL}/tasks/${conflictingTask._id}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        status: "Hold", 
                        userId: user._id,
                        ...timeData 
                    }),
                });
            } else {
                resHold = await fetch(`${API_URL}/work-logs/${conflictingTask._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        status: "Hold",
                        ...timeData 
                    }),
                });
            }

            if (resHold.ok) {
                const { taskId, type } = pendingTimeAction;
                const token = localStorage.getItem("token");
                const now = new Date();
                const res = await fetch(`${API_URL}/recurring-tasks/${taskId}/time`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ 
                        type,
                        clientTime: now.toISOString(),
                        localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                        localDateStr: now.toLocaleDateString('en-CA')
                    }),
                });

                if (res.ok) {
                    const updatedTask = await res.json();
                    setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));
                    setShowHoldConfirmation(false);
                    setConflictingTask(null);
                    setPendingTimeAction(null);
                }
            }
        } catch (error) {
            console.error("Error switching tasks:", error);
        } finally {
            setIsSubmittingTask(false);
        }
    };

    const confirmTimeUpdate = async () => {
        const { taskId, type } = timeModal;
        setTimeModal({ isOpen: false, taskId: null, type: null });

        try {
            const token = localStorage.getItem("token");
            const now = new Date();
            const res = await fetch(`${API_URL}/recurring-tasks/${taskId}/time`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    type,
                    clientTime: now.toISOString(),
                    localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    localDateStr: now.toLocaleDateString('en-CA')
                }),
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));
            }
        } catch (error) {
            console.error(`Error updating ${type} time:`, error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                        <FaHistory size={14} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 tracking-tight text-center flex-1">Recurring Tasks</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <FaTimes />
                </button>
            </div>

            {/* Content - Matches the existing table style exactly */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                    </div>
                ) : tasks.length > 0 ? (
                    <div className="bg-white rounded-3xl overflow-hidden">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-rose-50/50 border-b border-gray-100">
                                    <th className="px-2 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[25%]">Project Name</th>
                                    <th className="px-2 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[55%]">Description</th>
                                    <th className="px-2 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[20%] text-center">St / End</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tasks.map((task) => (
                                    <tr key={task._id} className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                                        <td className="px-2 py-4">
                                            <span className="text-sm font-bold text-gray-800">{task.projectName}</span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <p className="text-xs text-gray-600 line-clamp-2 font-medium leading-relaxed" title={task.description}>
                                                {task.description}
                                            </p>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            {!task.startTime ? (
                                                <button
                                                    onClick={() => handleTimeClick(task._id, "start")}
                                                    className="px-6 py-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:brightness-110 transition-all active:scale-95 shadow-sm shadow-rose-100 uppercase"
                                                    style={{ backgroundColor: primaryRed }}
                                                >
                                                    Start
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleTimeClick(task._id, "end")}
                                                    className="px-6 py-1.5 bg-gray-800 text-white text-[10px] font-bold rounded-lg hover:bg-gray-700 transition-all active:scale-95 shadow-sm shadow-gray-100 uppercase"
                                                >
                                                    End
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                            <FaHistory className="text-gray-300 text-2xl" />
                        </div>
                        <h3 className="font-bold text-gray-800">No tasks found</h3>
                    </div>
                )}
            </div>

            {/* Modals for Conflict and Time confirmation */}
            {showHoldConfirmation && conflictingTask && (
                <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-[360px] mx-4 border-l-4 border-amber-500">
                        <div className="flex items-start mb-4">
                            <div className="bg-amber-100 p-2 rounded-full mr-3 text-amber-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Active Task Conflict</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    You are already working on a <span className="font-bold text-indigo-600">
                                        {conflictingTask.type === 'Main Task' ? 'Main Task' : conflictingTask.logType === 'Meeting' ? 'Meeting' : 'Quick Task'}
                                    </span>.
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                            Do you want to put it on <span className="font-bold text-amber-600">Hold</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowHoldConfirmation(false);
                                    setConflictingTask(null);
                                    setPendingTimeAction(null);
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSwitchToNewTask}
                                disabled={isSubmittingTask}
                                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition ${isSubmittingTask ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmittingTask ? "Switching..." : "Yes, Switch Task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {timeModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full border border-rose-50 transform scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 text-center underline">Confirm {timeModal.type === "start" ? "Start" : "End"}</h3>
                        <p className="text-gray-500 mb-8 text-center text-sm font-medium">Set <strong>{timeModal.type} time</strong> to now?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setTimeModal({ isOpen: false, taskId: null, type: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-all">CANCEL</button>
                            <button onClick={confirmTimeUpdate} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95" style={{ backgroundColor: primaryRed }}>CONFIRM</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurringTaskPopup;
