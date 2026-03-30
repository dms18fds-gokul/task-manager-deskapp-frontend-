import React, { useState, useEffect } from "react";
import EmployeeSidebar from "../components/EmployeeSidebar";
import CustomDropdown from "../components/CustomDropdown";
import { API_URL } from "../utils/config";
import { FaPlus, FaSave, FaHistory, FaTimes, FaTrash } from "react-icons/fa";

const RecurringTasks = ({ isEmbedded = false }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");
    const [recurringTasks, setRecurringTasks] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null });
    const [timeModal, setTimeModal] = useState({ isOpen: false, taskId: null, type: null });
    const [successTask, setSuccessTask] = useState(null);
    const [projects, setProjects] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [owners, setOwners] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [conflictingTask, setConflictingTask] = useState(null);
    const [showHoldConfirmation, setShowHoldConfirmation] = useState(false);
    const [pendingTimeAction, setPendingTimeAction] = useState(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const user = JSON.parse(localStorage.getItem("user"));

    // Specific red color from user reference
    const primaryRed = "#E11D48";

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [projRes, typeRes, ownRes] = await Promise.all([
                fetch(`${API_URL}/options?category=Project`, { headers }),
                fetch(`${API_URL}/options?category=Type`, { headers }),
                fetch(`${API_URL}/options?category=Owner`, { headers }),
            ]);

            if (projRes.ok) setProjects(await projRes.json());
            if (typeRes.ok) setTaskTypes(await typeRes.json());
            if (ownRes.ok) setOwners(await ownRes.json());
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const fetchRecurringTasks = async () => {
        setFetching(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/recurring-tasks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRecurringTasks(data);
            }
        } catch (error) {
            console.error("Error fetching recurring tasks:", error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchRecurringTasks();
    }, []);

    const [formData, setFormData] = useState({
        projectName: [],
        taskType: [],
        assignedBy: [],
        description: "",
    });

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddOption = async (newValue, category) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/options`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ category, value: newValue }),
            });

            if (res.ok) {
                const option = await res.json();
                if (category === "Project") setProjects((prev) => [...prev, option]);
                if (category === "Type") setTaskTypes((prev) => [...prev, option]);
                if (category === "Owner") setOwners((prev) => [...prev, option]);

                const fieldName = category === "Project" ? "projectName" : category === "Type" ? "taskType" : "assignedBy";
                const currentVals = Array.isArray(formData[fieldName]) ? formData[fieldName] : [];
                handleChange(fieldName, [...currentVals, option.value]);
            }
        } catch (error) {
            console.error("Error adding option:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (formData.projectName.length === 0 || formData.taskType.length === 0 || formData.assignedBy.length === 0 || !formData.description.trim()) {
            setError("Please fill in all 4 required fields.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/recurring-tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    projectName: formData.projectName.join(", "),
                    taskType: formData.taskType.join(", "),
                    assignedBy: formData.assignedBy.join(", "),
                    description: formData.description,
                }),
            });

            if (res.ok) {
                const newTask = await res.json();
                setRecurringTasks((prev) => [newTask, ...prev]);
                setSuccessTask(newTask);
                setFormData({
                    projectName: [],
                    taskType: [],
                    assignedBy: [],
                    description: "",
                });

                setTimeout(() => {
                    setSuccessTask(null);
                    setIsFormOpen(false);
                }, 3000);
            } else {
                const data = await res.json();
                setError(data.message || "Failed to create recurring task");
            }
        } catch (error) {
            console.error("Error creating recurring task:", error);
            setError("Server error: Could not save task");
        } finally {
            setLoading(false);
        }
    };

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
            const token = localStorage.getItem("token");
            let resHold;
            if (conflictingTask.type === "Main Task") {
                resHold = await fetch(`${API_URL}/tasks/${conflictingTask._id}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Hold", userId: user._id }),
                });
            } else {
                resHold = await fetch(`${API_URL}/work-logs/${conflictingTask._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Hold" }),
                });
            }

            if (resHold.ok) {
                const now = new Date();
                const localTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const localDateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

                const res = await fetch(`${API_URL}/recurring-tasks/${pendingTimeAction.taskId}/time`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ 
                        type: pendingTimeAction.type,
                        clientTime: now.toISOString(),
                        localTimeStr,
                        localDateStr
                    }),
                });

                if (res.ok) {
                    const updatedTask = await res.json();
                    setRecurringTasks((prev) =>
                        prev.map((t) => (t._id === pendingTimeAction.taskId ? updatedTask : t))
                    );
                    setShowHoldConfirmation(false);
                    setConflictingTask(null);
                    setPendingTimeAction(null);
                } else {
                    setError(`Failed to update ${pendingTimeAction.type} time`);
                }
            } else {
                setError("Failed to put current task on Hold.");
            }
        } catch (error) {
            console.error("Error switching tasks:", error);
            setError("Error switching tasks");
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
            const localTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const localDateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            const res = await fetch(`${API_URL}/recurring-tasks/${taskId}/time`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    type,
                    clientTime: now.toISOString(),
                    localTimeStr,
                    localDateStr
                }),
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setRecurringTasks((prev) =>
                    prev.map((t) => (t._id === taskId ? updatedTask : t))
                );
            } else {
                setError(`Failed to update ${type} time`);
            }
        } catch (error) {
            console.error(`Error updating ${type} time:`, error);
            setError(`Server error: Could not update ${type} time`);
        }
    };

    const confirmDelete = async () => {
        const id = deleteModal.taskId;
        setDeleteModal({ isOpen: false, taskId: null });

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/recurring-tasks/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setRecurringTasks((prev) => prev.filter((task) => task._id !== id));
            } else {
                setError("Failed to delete task");
            }
        } catch (error) {
            console.error("Error deleting recurring task:", error);
            setError("Server error: Could not delete task");
        }
    };

    const renderContent = () => (
        <main className={`flex-1 ${isEmbedded ? 'p-0 pt-4' : 'p-6 md:p-8'} overflow-y-auto w-full h-full relative`}>
            {!isEmbedded && (
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Recurring Tasks</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage and automate your regular task cycles.</p>
                    </div>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="uppercase text-white px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg active:scale-95 hover:brightness-110"
                        style={{ backgroundColor: primaryRed, boxShadow: `0 8px 20px -6px ${primaryRed}60` }}
                    >
                        <FaPlus className="text-xs" /> Create New RT
                    </button>
                </div>
            )}
            
            {/* Header for Embedded Mode */}
            {isEmbedded && (
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">Manage and automate your regular task cycles.</p>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="uppercase text-white px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg active:scale-95 hover:brightness-110"
                        style={{ backgroundColor: primaryRed, boxShadow: `0 8px 20px -6px ${primaryRed}60` }}
                    >
                        <FaPlus className="text-[10px]" /> Create New RT
                    </button>
                </div>
            )}

            {fetching ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
                </div>
            ) : recurringTasks.length > 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-rose-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[7%]">T No</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[14%]">Project Name</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[14%]">Assigned By</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[14%]">Type of Task</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[35%]">Description</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider w-[15%] text-center">St / End</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recurringTasks.map((task) => (
                                    <tr key={task._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-gray-800">{String(task.taskNo).padStart(2, '0')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-gray-800">{task.projectName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-600 uppercase">{task.assignedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase inline-flex items-center gap-1">
                                                {task.taskType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-600 line-clamp-2 font-medium leading-relaxed" title={task.description}>
                                                {task.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!task.startTime ? (
                                                <button
                                                    onClick={() => handleTimeClick(task._id, "start")}
                                                    className="px-6 py-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:brightness-110 transition-all active:scale-95 shadow-sm shadow-rose-100 uppercase"
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
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[500px] flex items-center justify-center relative overflow-hidden">
                    <div className="text-center p-8">
                        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
                            <FaHistory className="text-rose-300 text-3xl animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">No Recurring Tasks Found</h3>
                        <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                            Your personal recurring task library is empty. Click on
                            <span style={{ color: primaryRed }} className="font-bold mx-1">Create New RT</span>
                            to start automating your workflow.
                        </p>
                    </div>
                </div>
            )}

            {/* Float Popup Form */}
            <div
                className={`fixed bottom-6 right-6 w-full max-w-[380px] h-[82vh] bg-white shadow-[0_20px_80px_-15px_rgba(0,0,0,0.3)] z-[100] rounded-3xl border border-rose-100 overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFormOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-rose-50/30 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight">New Recurring Task</h2>
                        </div>
                        <button
                            onClick={() => setIsFormOpen(false)}
                            type="button"
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Project Name</label>
                                <CustomDropdown
                                    options={projects.map(p => p.value)}
                                    value={formData.projectName}
                                    onChange={(val) => handleChange("projectName", val)}
                                    placeholder="Select Project(s)"
                                    allowAdd={true}
                                    onAdd={(val) => handleAddOption(val, "Project")}
                                    multiple={true}
                                    searchable={true}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Assigned By</label>
                                <CustomDropdown
                                    options={owners.map(o => o.value)}
                                    value={formData.assignedBy}
                                    onChange={(val) => handleChange("assignedBy", val)}
                                    placeholder="Select Assigner(s)"
                                    allowAdd={true}
                                    onAdd={(val) => handleAddOption(val, "Owner")}
                                    multiple={true}
                                    searchable={true}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Type of Task</label>
                                <CustomDropdown
                                    options={taskTypes.map(t => t.value)}
                                    value={formData.taskType}
                                    onChange={(val) => handleChange("taskType", val)}
                                    placeholder="Select Type(s)"
                                    allowAdd={true}
                                    onAdd={(val) => handleAddOption(val, "Type")}
                                    multiple={true}
                                    searchable={true}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    placeholder="Brief task overview..."
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all placeholder:text-gray-400 text-gray-600 font-medium resize-none custom-scrollbar h-24"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-2">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                                {error}
                            </div>
                        )}
                        {successTask && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                Task Created: RT-{String(successTask.taskNo).padStart(3, '0')}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-white shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg active:scale-[0.98] flex items-center justify-center gap-3 hover:brightness-110"
                            style={{
                                backgroundColor: primaryRed,
                                boxShadow: `0 12px 24px -8px ${primaryRed}80`
                            }}
                        >
                            <FaSave />
                            {loading ? "SAVING..." : "CREATE RECURRING TASK"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modals */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-rose-50 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <FaTrash />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Delete Task?</h3>
                        <p className="text-gray-500 mb-8 text-center text-sm font-medium leading-relaxed">
                            Are you sure you want to remove this recurring task? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, taskId: null })}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-2xl transition-all active:scale-95"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-rose-100 active:scale-95"
                            >
                                DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {timeModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-rose-50 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <FaHistory />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Confirm {timeModal.type === "start" ? "Start" : "End"} Time</h3>
                        <p className="text-gray-500 mb-8 text-center text-sm font-medium leading-relaxed">
                            Are you sure you want to set the <strong>{timeModal.type} time</strong> to now?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTimeModal({ isOpen: false, taskId: null, type: null })}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-2xl transition-all active:scale-95"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmTimeUpdate}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-rose-100 active:scale-95"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </main>
    );

    if (isEmbedded) {
        return renderContent();
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Recurring Tasks</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                {renderContent()}
            </div>
        </div>
    );
};

export default RecurringTasks;
