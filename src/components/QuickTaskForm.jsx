import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/config';
import CustomDropdown from './CustomDropdown';
import { FaTimes } from 'react-icons/fa';

// Helper function to get current time in HH:MM format
const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const QuickTaskForm = ({ user, onClose, onSuccess, editLog }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Success Modal State
    const [showSuccess, setShowSuccess] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        let timer;
        if (showSuccess) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleCloseSuccess();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [showSuccess]);

    const [isMeeting, setIsMeeting] = useState(false);

    const defaultFormData = {
        date: editLog ? editLog.date : new Date().toISOString().split('T')[0],
        taskNo: editLog ? editLog.taskNo : "Auto",
        projectName: editLog ? (Array.isArray(editLog.projectName) ? editLog.projectName : (editLog.projectName ? editLog.projectName.split(',').map(s => s.trim()) : [])) : [],
        startTime: editLog ? editLog.startTime : getCurrentTime(),
        endTime: editLog ? editLog.endTime : getCurrentTime(),
        taskOwner: editLog ? (Array.isArray(editLog.taskOwner) ? editLog.taskOwner : (editLog.taskOwner ? editLog.taskOwner.split(',').map(s => s.trim()) : [])) : [],
        description: editLog ? editLog.description : "",
        taskType: editLog ? (Array.isArray(editLog.taskType) ? editLog.taskType : (editLog.taskType ? editLog.taskType.split(',').map(s => s.trim()) : [])) : [],
        timeAutomation: editLog ? (editLog.duration || editLog.timeAutomation) : "",
        status: editLog ? editLog.status : "In Progress",
        logType: editLog ? editLog.logType : (isMeeting ? "Meeting" : "Quick"),
        assignedBy: editLog ? (Array.isArray(editLog.assignedBy) ? editLog.assignedBy : (editLog.assignedBy ? editLog.assignedBy.split(',').map(s => s.trim()) : [])) : [],
        employeeId: editLog ? editLog.employeeId : ""
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        setTimeLeft(30);

        // Reset form data to default values
        setFormData({
            ...defaultFormData,
            employeeId: formData.employeeId // Preserve the populated employeeId
        });

        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    // Initial state with default values
    const [formData, setFormData] = useState(defaultFormData);

    const [projects, setProjects] = useState([]);
    const [owners, setOwners] = useState([]);
    const [types, setTypes] = useState([]);
    const [assignedByOptions, setAssignedByOptions] = useState([]); // Added state for Assigned By options

    // Fetch options
    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};

            const [projRes, ownRes, typeRes] = await Promise.all([
                fetch(`${API_URL}/options?category=Project`, { headers }),
                fetch(`${API_URL}/options?category=Owner`, { headers }),
                fetch(`${API_URL}/options?category=Type`, { headers })
            ]);

            if (projRes.ok) setProjects(await projRes.json());
            if (ownRes.ok) setOwners(await ownRes.json());
            if (typeRes.ok) setTypes(await typeRes.json());

            // Fetch Assigned By options (using same endpoint structure if available or filter from getFilterOptions)
            // The getFilterOptions endpoint returns { projects, owners, types, assignedBy }.
            // We should use that endpoint instead of multiple fetches if possible, but the current code uses separate fetches?
            // Wait, line 35-37 fetches from /options?category=... which is the 'Option' model.
            // But the backend getFilterOptions uses WorkLog.distinct.
            // The existing code at 34-38 fetches from `Option` model. 
            // So we need to support 'AssignedBy' category in Option model too.
            const assignedRes = await fetch(`${API_URL}/options?category=AssignedBy`, { headers });
            if (assignedRes.ok) setAssignedByOptions(await assignedRes.json());

        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    // Fetch Task Count for Date
    const fetchTaskCount = async (date) => {
        if (!date) return;
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/work-logs/count?date=${date}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, taskNo: data.count + 1 }));
            }
        } catch (error) {
            console.error("Error fetching task count:", error);
        }
    };

    useEffect(() => {
        fetchOptions();

        // Auto-populate employeeId from logged in user
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && (user._id || user.id)) {
                    setFormData(prev => ({ ...prev, employeeId: user._id || user.id }));
                }
            } catch (e) {
                console.error("Error parsing user from localStorage", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!editLog) {
            fetchTaskCount(formData.date);
        }
    }, [formData.date, editLog]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDataChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleProjectChange = (val) => {
        setFormData(prev => ({ ...prev, projectName: val }));
    };

    const handleAssignedByChange = (val) => {
        setFormData(prev => ({ ...prev, assignedBy: val }));
    };

    const handleAddNew = async (newValue, category) => {
        if (!newValue.trim()) return;

        // Helper to prevent duplicates in state
        const addUnique = (prev, newOpt) => {
            const exists = prev.some(p =>
                (p._id && newOpt._id && p._id === newOpt._id) ||
                (p.value === newOpt.value)
            );
            return exists ? prev : [...prev, newOpt];
        };

        if (isOffline) {
            const option = { _id: `offline-${Date.now()}`, value: newValue, category };
            if (category === 'Project') {
                setProjects(prev => addUnique(prev, option));
                handleDataChange('projectName', [...(Array.isArray(formData.projectName) ? formData.projectName : []), option.value]);
            } else if (category === 'Owner') {
                setOwners(prev => addUnique(prev, option));
                handleDataChange('taskOwner', [...(Array.isArray(formData.taskOwner) ? formData.taskOwner : []), option.value]);
            } else if (category === 'Type') {
                setTypes(prev => addUnique(prev, option));
                handleDataChange('taskType', [...(Array.isArray(formData.taskType) ? formData.taskType : []), option.value]);
            } else if (category === 'AssignedBy') {
                setAssignedByOptions(prev => addUnique(prev, option));
                handleDataChange('assignedBy', [...(Array.isArray(formData.assignedBy) ? formData.assignedBy : []), option.value]);
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/options`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ category, value: newValue })
            });

            if (res.ok) {
                const option = await res.json();

                if (category === 'Project') {
                    setProjects(prev => addUnique(prev, option));
                    handleDataChange('projectName', [...(Array.isArray(formData.projectName) ? formData.projectName : []), option.value]);
                } else if (category === 'Owner') {
                    setOwners(prev => addUnique(prev, option));
                    handleDataChange('taskOwner', [...(Array.isArray(formData.taskOwner) ? formData.taskOwner : []), option.value]);
                } else if (category === 'Type') {
                    setTypes(prev => addUnique(prev, option));
                    handleDataChange('taskType', [...(Array.isArray(formData.taskType) ? formData.taskType : []), option.value]);
                } else if (category === 'AssignedBy') {
                    setAssignedByOptions(prev => addUnique(prev, option));
                    handleDataChange('assignedBy', [...(Array.isArray(formData.assignedBy) ? formData.assignedBy : []), option.value]);
                }
            } else {
                const data = await res.json();
                alert(data.message || "Failed to add option. It may already exist.");
            }
        } catch (error) {
            console.error("Error adding option:", error);
        }
    };

    // Delete Confirmation State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const handleRequestDelete = (option) => {
        if (!option || !option._id) return;
        setItemToDelete(option);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/options/${itemToDelete._id}`, {
                method: "DELETE",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });

            if (res.ok) {
                const removeFilter = opt => (typeof opt === 'object' ? opt._id !== itemToDelete._id : true);
                if (itemToDelete.category === 'Project') {
                    setProjects(prev => prev.filter(removeFilter));
                    handleDataChange('projectName', Array.isArray(formData.projectName) ? formData.projectName.filter(v => v !== itemToDelete.value) : formData.projectName);
                }
                if (itemToDelete.category === 'Owner') {
                    setOwners(prev => prev.filter(removeFilter));
                    handleDataChange('taskOwner', Array.isArray(formData.taskOwner) ? formData.taskOwner.filter(v => v !== itemToDelete.value) : formData.taskOwner);
                }
                if (itemToDelete.category === 'Type') {
                    setTypes(prev => prev.filter(removeFilter));
                    handleDataChange('taskType', Array.isArray(formData.taskType) ? formData.taskType.filter(v => v !== itemToDelete.value) : formData.taskType);
                }
                if (itemToDelete.category === 'AssignedBy') {
                    setAssignedByOptions(prev => prev.filter(removeFilter));
                    handleDataChange('assignedBy', Array.isArray(formData.assignedBy) ? formData.assignedBy.filter(v => v !== itemToDelete.value) : formData.assignedBy);
                }
                setShowDeleteConfirm(false);
                setItemToDelete(null);
            } else {
                alert("Failed to delete option.");
            }
        } catch (error) {
            console.error("Error deleting option:", error);
        }
    };

    // Duration Logic
    const calculateDurationStr = (start, end) => {
        if (!start || !end) return "";
        const [startHours, startMins, startSecs = 0] = start.split(':').map(Number);
        const [endHours, endMins, endSecs = 0] = end.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startHours, startMins, startSecs);
        const endDate = new Date(0, 0, 0, endHours, endMins, endSecs);
        let diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) diff += 24 * 60 * 60 * 1000;

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

    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const duration = calculateDurationStr(formData.startTime, formData.endTime);
            setFormData(prev => ({ ...prev, timeAutomation: duration }));
        }
    }, [formData.startTime, formData.endTime]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.projectName.length === 0 || formData.taskOwner.length === 0 || formData.taskType.length === 0 || !formData.date || !formData.startTime || !formData.endTime || !formData.description) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!formData.timeAutomation || formData.timeAutomation === "0 sec" || formData.timeAutomation === "Auto") {
            setError("Duration cannot be 0 seconds. Please provide valid start and end times.");
            return;
        }

        setLoading(true);

        const payload = {
            employeeId: formData.employeeId || user._id, // Use populated employeeId
            date: formData.date,
            projectName: Array.isArray(formData.projectName) ? formData.projectName.join(", ") : formData.projectName,
            startTime: formData.startTime,
            endTime: formData.endTime,
            taskOwner: Array.isArray(formData.taskOwner) ? formData.taskOwner.join(", ") : formData.taskOwner,
            description: formData.description,
            taskType: Array.isArray(formData.taskType) ? formData.taskType.join(", ") : formData.taskType,
            timeAutomation: formData.timeAutomation,
            duration: formData.timeAutomation,
            status: formData.status,
            taskTitle: Array.isArray(formData.projectName) ? formData.projectName.join(", ") : formData.projectName,
            logType: isOffline ? "Offline Task" : formData.logType,
            assignedBy: Array.isArray(formData.assignedBy) ? formData.assignedBy.join(", ") : formData.assignedBy // Save as string
        };

        if (isOffline) {
            payload.offlineCreatedAt = new Date().toISOString();
            const offlineTasks = JSON.parse(localStorage.getItem('offlineQuickTasks') || '[]');
            offlineTasks.push(payload);
            localStorage.setItem('offlineQuickTasks', JSON.stringify(offlineTasks));

            // Notify components to update their lists
            window.dispatchEvent(new Event('offlineTaskAdded'));

            setShowSuccess(true);
            setLoading(false);
            return;
        }

        try {
            const url = editLog ? `${API_URL}/work-logs/${editLog._id}` : `${API_URL}/work-logs`;
            const method = editLog ? "PUT" : "POST";

            // If editing, we shouldn't send Date/Time if they aren't supposed to change, but let's just send what we have
            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setShowSuccess(true);
            } else {
                alert(data.message || `Failed to ${editLog ? 'update' : 'add'} task`);
            }
        } catch (error) {
            console.error(`Error ${editLog ? 'updating' : 'adding'} task:`, error);
            alert("Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex bg-gray-200/70 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => {
                            setIsMeeting(false);
                            setFormData(prev => ({ ...prev, logType: "Quick" }));
                        }}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-300 ${!isMeeting ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        New Quick Task
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsMeeting(true);
                            setFormData(prev => ({ ...prev, logType: "Meeting" }));
                        }}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-300 ${isMeeting ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Meeting
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                    <FaTimes />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {isOffline && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center text-sm shadow-sm font-medium">
                        <span className="font-bold mr-2">Offline Mode:</span> You are currently offline. Tasks will be saved locally and synchronized when you reconnect.
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Project Name</label>
                        <CustomDropdown
                            options={projects}
                            value={formData.projectName}
                            onChange={(val) => handleDataChange('projectName', val)}
                            placeholder="Select Project(s)"
                            allowAdd={formData.logType !== "QT Task" && formData.logType !== "QT"}
                            onAdd={(val) => handleAddNew(val, 'Project')}
                            multiple={true}
                            onDelete={handleRequestDelete}
                            disabled={!!editLog && (editLog.logType === 'Meeting' || ["QT Task", "QT", "Quick"].includes(editLog.logType))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned By</label>
                        <CustomDropdown
                            options={assignedByOptions}
                            value={formData.assignedBy}
                            onChange={(val) => handleDataChange('assignedBy', val)}
                            placeholder="Select Assigner(s)"
                            allowAdd={true}
                            onAdd={(val) => handleAddNew(val, 'AssignedBy')}
                            multiple={true}
                            onDelete={handleRequestDelete}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            readOnly={!!editLog}
                            className={`w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none ${editLog ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Task No</label>
                        <input
                            type="text"
                            value={formData.taskNo}
                            readOnly
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>


                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                readOnly={!!editLog}
                                step="1"
                                className={`w-full px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${editLog ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                readOnly={!!editLog}
                                step="1"
                                className={`w-full px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${editLog ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Duration</label>
                            <input
                                type="text"
                                value={formData.timeAutomation}
                                readOnly
                                className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                                placeholder="Auto"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Task Owner</label>
                        <CustomDropdown
                            options={owners}
                            value={formData.taskOwner}
                            onChange={(val) => handleDataChange('taskOwner', val)}
                            placeholder="Select Owner(s)"
                            allowAdd={true}
                            onAdd={(val) => handleAddNew(val, 'Owner')}
                            multiple={true}
                            onDelete={handleRequestDelete}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Type of Task</label>
                        <CustomDropdown
                            options={types}
                            value={formData.taskType}
                            onChange={(val) => handleDataChange('taskType', val)}
                            placeholder="Select Type(s)"
                            allowAdd={formData.logType !== "QT Task" && formData.logType !== "QT"}
                            onAdd={(val) => handleAddNew(val, 'Type')}
                            multiple={true}
                            onDelete={handleRequestDelete}
                            disabled={!!editLog && (editLog.logType === 'Meeting' || ["QT Task", "QT", "Quick"].includes(editLog.logType))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none scrollbar-hide"
                            placeholder="Brief description..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {["In Progress", "Hold", "Completed"].map(status => (
                                <div
                                    key={status}
                                    onClick={() => handleDataChange('status', status)}
                                    className={`cursor-pointer text-center py-2 rounded-lg border text-xs font-medium transition-colors ${formData.status === status
                                        ? (status === 'Completed' ? 'bg-green-100 border-green-500 text-green-700' : status === 'Hold' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-indigo-100 border-indigo-500 text-indigo-700')
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {status}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 sticky bottom-0 bg-white pb-2">
                        {error && (
                            <div className="mb-3 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium text-center shadow-sm">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full text-white font-bold py-3 rounded-lg transition shadow-lg ${isMeeting ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {loading ? "Saving..." : editLog ? "Update Task" : (isMeeting ? "Save Meeting Details" : "Save Quick Task")}
                        </button>
                    </div>
                </form>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-80 transform transition-all scale-100">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Delete Option?</h4>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-gray-800">"{itemToDelete?.value}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setItemToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Success Modal */}
            {showSuccess && (
                <div className="absolute inset-0 bg-white/90 z-[70] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-green-100 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ✓
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            {isOffline ? "Saved Offline!" : (editLog ? "Task Updated!" : (isMeeting ? "Meeting Created!" : "Task Created!"))}
                        </h3>
                        <p className="text-gray-500 mb-8">
                            {isOffline
                                ? "Your entry has been saved locally and will sync once you are back online."
                                : (editLog ? "Your task has been successfully updated." : (isMeeting ? "Your meeting has been successfully added to the system." : "Your quick task has been successfully added to the system."))}
                        </p>
                        <button
                            onClick={handleCloseSuccess}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-200 transform active:scale-95"
                        >
                            Continue
                        </button>
                        <p className="text-xs text-gray-400 mt-4">
                            Auto-closing in {timeLeft}s
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickTaskForm;
