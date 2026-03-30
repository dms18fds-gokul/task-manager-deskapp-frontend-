import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/config';
import CustomDropdown from './CustomDropdown';
import { FaTimes } from 'react-icons/fa';

// Helper function to get current time in HH:MM format
const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const QuickTaskForm = ({ user, onClose, onSuccess, editLog, initialIsMeeting = false }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const canAddOptions = !!user; // All authenticated users can add (private to themselves)

    // Debugging (Remove in production)


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

    const [isMeeting, setIsMeeting] = useState(initialIsMeeting);

    const defaultFormData = {
        date: editLog ? editLog.date : new Date().toISOString().split('T')[0],
        taskNo: editLog ? editLog.taskNo : "Auto",
        projectName: editLog ? (Array.isArray(editLog.projectName) ? editLog.projectName : (editLog.projectName ? editLog.projectName.split(',').map(s => s.trim()) : [])) : [],
        startTime: editLog ? editLog.startTime : (isMeeting ? getCurrentTime() : getCurrentTime()), // Keep start time auto-filled
        endTime: editLog ? editLog.endTime : (isMeeting ? getCurrentTime() : ""),
        taskOwner: editLog ? (Array.isArray(editLog.taskOwner) ? editLog.taskOwner : (editLog.taskOwner ? editLog.taskOwner.split(',').map(s => s.trim()) : [])) : [],
        description: editLog ? editLog.description : "",
        taskType: editLog ? (Array.isArray(editLog.taskType) ? editLog.taskType : (editLog.taskType ? editLog.taskType.split(',').map(s => s.trim()) : [])) : [],
        timeAutomation: editLog ? (editLog.duration || editLog.timeAutomation) : "",
        status: editLog ? editLog.status : "In Progress",
        logType: editLog ? editLog.logType : (isMeeting ? "Meeting" : "Quick"),
        assignedBy: editLog ? (Array.isArray(editLog.assignedBy) ? editLog.assignedBy : (editLog.assignedBy ? editLog.assignedBy.split(',').map(s => s.trim()) : [])) : [],
        employeeId: editLog ? editLog.employeeId : "",
        participants: editLog ? (Array.isArray(editLog.participants) ? editLog.participants.map(p => typeof p === 'object' ? p.value : p) : (editLog.participants ? editLog.participants.split(',').map(s => s.trim()) : [])) : [],
        priority: editLog ? editLog.priority : "Medium"
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
    const [assignedByOptions, setAssignedByOptions] = useState([]);
    const [participantOptions, setParticipantOptions] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("All");

    const [conflictingTask, setConflictingTask] = useState(null);
    const [showHoldConfirmation, setShowHoldConfirmation] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

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

            const assignedRes = await fetch(`${API_URL}/options?category=AssignedBy`, { headers });
            if (assignedRes.ok) setAssignedByOptions(await assignedRes.json());


        } catch (error) {
        }
    };

    const fetchParticipants = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/employee/all-with-admins`, { headers });
            if (res.ok) {
                const data = await res.json();
                setParticipantOptions(data.map(u => ({
                    _id: u._id,
                    value: u.name,
                    role: u.role,
                    employeeId: u.employeeId,
                    category: 'Participant'
                })));
            }
        } catch (error) {
        }
    };

    // Fetch Task/Meeting Count for Date
    const fetchTaskCount = async (date) => {
        if (!date) return;
        try {
            const tokens = localStorage.getItem('token');
            const headers = tokens ? { "Authorization": `Bearer ${tokens}` } : {};
            const typeParam = isMeeting ? '&type=Meeting' : '';
            const res = await fetch(`${API_URL}/work-logs/count?date=${date}${typeParam}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, taskNo: data.count + 1 }));
            }
        } catch (error) {
        }
    };

    useEffect(() => {
        fetchOptions();

        // Auto-populate employeeId from logged in user
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                if (userObj && (userObj._id || userObj.id)) {
                    setFormData(prev => ({ ...prev, employeeId: userObj._id || userObj.id }));
                }
            } catch (e) {
            }
        }
    }, []);

    useEffect(() => {
        if (isMeeting && participantOptions.length === 0) {
            fetchParticipants();
        }
    }, [isMeeting]);

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

        let durationString = "";
        if (hours > 0) durationString += `${hours} hr${hours > 1 ? 's' : ''} `;
        if (minutes > 0) durationString += `${minutes} min${minutes > 1 ? 's' : ''}`;

        return durationString.trim() || "0 min";
    };

    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const duration = calculateDurationStr(formData.startTime, formData.endTime);
            setFormData(prev => ({ ...prev, timeAutomation: duration }));
        } else if (!formData.endTime) {
            // Reset duration if end time is cleared (important for Quick Task creation flow)
            setFormData(prev => ({ ...prev, timeAutomation: "" }));
        }
    }, [formData.startTime, formData.endTime]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation - Filter empty fields
        const isMeetingTask = isMeeting || formData.logType === "Meeting";
        const errors = [];
        if (formData.projectName.length === 0) errors.push("Project Name");
        if (isMeetingTask && (!formData.startTime || !formData.endTime)) errors.push("Time range");
        if (!isMeetingTask && formData.assignedBy.length === 0) errors.push("Assigned By");
        if (!isMeetingTask && formData.taskType.length === 0) errors.push("Type of Task");
        if (!formData.description) errors.push("Description");

        if (errors.length > 0) {
            setError(`Error: Please provide ${errors.join(", ")}`);
            return;
        }

        // Check duration for Meetings
        if (isMeetingTask && formData.startTime === formData.endTime) {
            setError("Error: Start time and End time cannot be the same");
            return;
        }

        setLoading(true);

        // Standardize data (trimming)
        const cleanedData = {
            ...formData,
            description: formData.description.trim(),
        };

        // Strict Validation
        let validationError = null;

        if (cleanedData.projectName.length === 0) validationError = "Project Name is required";
        else if (!isMeeting && cleanedData.assignedBy.length === 0) validationError = "Assigned By is required";
        else if (isMeeting && !cleanedData.date) validationError = "Date is required";
        else if (isMeeting && !cleanedData.startTime) validationError = "Start Time is required";
        else if (isMeeting && !cleanedData.endTime) validationError = "End Time is required";
        else if (!isMeeting && cleanedData.taskType.length === 0) validationError = "Type of Task is required";
        else if (!cleanedData.description) validationError = `${isMeeting ? 'Discussion Summary' : 'Description'} is required`;
        else if (isMeeting && cleanedData.participants.length === 0) validationError = "At least one Participant is required";
        else if (isMeeting && (!cleanedData.timeAutomation || ["0 sec", "Auto", ""].includes(cleanedData.timeAutomation))) {
            validationError = "Duration cannot be 0 seconds";
        }

        if (validationError) {
            setError(`Error: ${validationError}`);
            setLoading(false);
            return;
        }

        setLoading(true);

        const payload = {
            employeeId: cleanedData.employeeId || user._id,
            date: cleanedData.date,
            projectName: Array.isArray(cleanedData.projectName) ? cleanedData.projectName.join(", ") : cleanedData.projectName,
            startTime: cleanedData.startTime,
            endTime: cleanedData.endTime,
            taskOwner: !isMeeting ? (user?.name || "") : (Array.isArray(cleanedData.taskOwner) ? cleanedData.taskOwner.join(", ") : cleanedData.taskOwner),
            description: cleanedData.description,
            taskType: Array.isArray(cleanedData.taskType) ? cleanedData.taskType.join(", ") : cleanedData.taskType,
            timeAutomation: cleanedData.timeAutomation,
            duration: cleanedData.timeAutomation,
            status: !isMeeting ? (editLog ? cleanedData.status : "In Progress") : cleanedData.status,
            taskTitle: Array.isArray(cleanedData.projectName) ? cleanedData.projectName.join(", ") : cleanedData.projectName,
            logType: isOffline ? "Offline Task" : cleanedData.logType,
            assignedBy: Array.isArray(cleanedData.assignedBy) ? cleanedData.assignedBy.join(", ") : cleanedData.assignedBy,
            meetingTitle: cleanedData.meetingTitle,
            participants: isMeeting
                ? formData.participants.map(name => participantOptions.find(p => p.value === name)).filter(Boolean)
                : (Array.isArray(cleanedData.participants) ? cleanedData.participants.join(", ") : cleanedData.participants),
            priority: cleanedData.priority,
            clientTime: new Date().toISOString(),
            localTimeStr: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            localDateStr: new Date().toLocaleDateString('en-CA')
        };

        if (isOffline) {
            payload.offlineCreatedAt = new Date().toISOString();
            const offlineTasks = JSON.parse(localStorage.getItem('offlineQuickTasks') || '[]');
            offlineTasks.push(payload);
            localStorage.setItem('offlineQuickTasks', JSON.stringify(offlineTasks));
            window.dispatchEvent(new Event('offlineTaskAdded'));
            setShowSuccess(true);
            setLoading(false);
            return;
        }

        // Auto-Hold Check: If starting a NEW task as "In Progress"
        if (payload.status === "In Progress" && !editLog) {
            try {
                const res = await fetch(`${API_URL}/tasks/check/active?userId=${user._id}`);
                const data = await res.json();

                if (data.hasActiveTask) {
                    // Check if meeting exception applies:
                    // Rule: Meetings only hold Main Task. QT/RT can remain In Progress.
                    if (initialIsMeeting) {
                        if (data.task.type === "Main Task") {
                            // Rule: Meetings only hold Main Task. Perform auto-hold without popup.
                            try {
                                await fetch(`${API_URL}/tasks/${data.task._id}/status`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "Hold", userId: user._id }),
                                });
                                // Fall through to performSubmit
                            } catch (err) {
                                console.error("Auto-hold failed:", err);
                                // Fallback to popup if automation fails
                                setConflictingTask(data.task);
                                setPendingPayload(payload);
                                setShowHoldConfirmation(true);
                                setLoading(false);
                                return;
                            }
                        } else {
                            // Skip hold for non-main tasks (QT/RT) when starting a meeting
                            await performSubmit(payload);
                            return;
                        }
                    } else {
                        // For non-meeting tasks (QT), always show the conflict popup
                        setConflictingTask(data.task);
                        setPendingPayload(payload);
                        setShowHoldConfirmation(true);
                        setLoading(false);
                        return;
                    }
                }
            } catch (error) {
            }
        }

        await performSubmit(payload);
    };

    const performSubmit = async (payload) => {
        try {
            const url = editLog ? `${API_URL}/work-logs/${editLog._id}` : `${API_URL}/work-logs`;
            const method = editLog ? "PUT" : "POST";
            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setShowSuccess(true);
            } else {
                setError(`Error: ${data.message || 'Failed to save'}`);
            }
        } catch (error) {
            setError("Error: Server error");
        } finally {
            setLoading(false);
        }
    };

    const confirmSwitchToNewTask = async () => {
        if (!conflictingTask || !pendingPayload) return;
        const now = new Date();
        const timeData = {
            clientTime: now.toISOString(),
            localTimeStr: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            localDateStr: now.toLocaleDateString('en-CA')
        };

        setIsSubmittingTask(true);
        try {
            // 1. Put current task on Hold
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
                // Quick Task / Meeting
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
                // 2. Perform the pending submission
                await performSubmit(pendingPayload);

                setShowHoldConfirmation(false);
                setConflictingTask(null);
                setPendingPayload(null);
            } else {
                alert("Failed to put current task on Hold. Operation cancelled.");
            }
        } catch (error) {
            alert("Error switching tasks");
        } finally {
            setIsSubmittingTask(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="flex flex-col bg-white relative font-sans h-full max-h-full overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div className="flex items-center">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight">
                            {editLog ? 'Edit Quick Task' : (isMeeting ? 'New Meeting Form' : ' New Quick Task')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {isOffline && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center text-sm shadow-sm font-medium">
                            <span className="font-bold mr-2">Offline Mode:</span> You are currently offline. Tasks will be saved locally.
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Name</label>
                            <CustomDropdown
                                options={projects}
                                value={formData.projectName}
                                onChange={(val) => handleDataChange('projectName', val)}
                                placeholder="Select Project(s)"
                                allowAdd={canAddOptions}
                                onAdd={(val) => handleAddNew(val, 'Project')}
                                multiple={true}
                                onDelete={handleRequestDelete}
                                disabled={!!editLog && (editLog.logType === 'Meeting' || ["QT Task", "QT", "Quick"].includes(editLog.logType))}
                            />
                        </div>

                        {/* Meeting Title removed per user instruction */}

                        {!isMeeting && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assigned By</label>
                                <CustomDropdown
                                    options={assignedByOptions}
                                    value={formData.assignedBy}
                                    onChange={(val) => handleDataChange('assignedBy', val)}
                                    placeholder="Select Assigner(s)"
                                    allowAdd={canAddOptions}
                                    onAdd={(val) => handleAddNew(val, 'AssignedBy')}
                                    multiple={true}
                                    onDelete={handleRequestDelete}
                                />
                            </div>
                        )}


                        {isMeeting && (
                            <div className="space-y-4">
                                <div className="pt-2">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        Conducted By
                                    </h3>

                                    <div className="space-y-4 pl-3.5 border-l-2 border-gray-100">
                                        {formData.participants.length > 0 && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wide opacity-80">Selected Members ({formData.participants.length})</label>
                                                <div className="flex flex-wrap gap-1.5 p-1 bg-teal-50/30 rounded-lg">
                                                    {formData.participants.map((name) => {
                                                        const person = participantOptions.find(p => p.value === name);
                                                        const rawId = person?.employeeId || "";
                                                        const displayId = rawId ? String(rawId).slice(-3) : "";
                                                        return (
                                                            <button
                                                                key={`selected-${name}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleDataChange('participants', formData.participants.filter(p => p !== name));
                                                                }}
                                                                className="px-2 py-1 rounded-full border border-teal-600 bg-teal-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:bg-teal-700 transition-colors"
                                                            >
                                                                {name} {displayId ? `- ${displayId}` : ""}
                                                                <span className="text-[10px] opacity-70">×</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wide opacity-80">Department</label>
                                            <div className="flex flex-wrap gap-1.5 p-1">
                                                {["All", ...new Set(participantOptions.flatMap(opt => Array.isArray(opt.role) ? opt.role : [opt.role]).filter(Boolean))].map((dept) => (
                                                    <button
                                                        key={dept}
                                                        type="button"
                                                        onClick={() => setSelectedDepartment(dept)}
                                                        className={`px-2 py-1 rounded-full border transition-all duration-200 text-[9px] font-bold uppercase tracking-wider ${selectedDepartment === dept
                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                            : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300"
                                                            }`}
                                                    >
                                                        {dept}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wide opacity-80">Team Members</label>
                                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 border border-gray-100 rounded-xl bg-gray-50/30 font-sans">
                                                {participantOptions
                                                    .filter(opt => selectedDepartment === "All" || (Array.isArray(opt.role) ? opt.role.includes(selectedDepartment) : opt.role === selectedDepartment))
                                                    .map((option) => {
                                                        const isSelected = formData.participants.includes(option.value);
                                                        const rawId = option.employeeId ? String(option.employeeId).trim() : "";
                                                        const displayId = rawId ? rawId.slice(-3) : `?(${Object.keys(option).filter(k => k !== 'value' && k !== '_id' && k !== 'category').join(',')})`;

                                                        return (
                                                            <button
                                                                key={option._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newParticipants = isSelected
                                                                        ? formData.participants.filter(p => p !== option.value)
                                                                        : [...formData.participants, option.value];
                                                                    handleDataChange('participants', newParticipants);
                                                                }}
                                                                className={`px-2 py-1 rounded-full border transition-all duration-200 text-[9px] font-bold uppercase tracking-wider ${isSelected
                                                                    ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                                                    : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300 shadow-sm"
                                                                    }`}
                                                            >
                                                                {option.value} - {displayId}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Time</label>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleChange}
                                            readOnly={!!editLog}
                                            className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-gray-800 font-medium ${editLog ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : ''}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Time</label>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            readOnly={!!editLog}
                                            className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-gray-800 font-medium ${editLog ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : ''}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isMeeting && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type of Task</label>
                                <CustomDropdown
                                    options={types}
                                    value={formData.taskType}
                                    onChange={(val) => handleDataChange('taskType', val)}
                                    placeholder="Select Type(s)"
                                    allowAdd={canAddOptions}
                                    onAdd={(val) => handleAddNew(val, 'Type')}
                                    multiple={true}
                                    onDelete={handleRequestDelete}
                                    disabled={!!editLog && (editLog.logType === 'Meeting' || ["QT Task", "QT", "Quick"].includes(editLog.logType))}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{isMeeting ? 'Discussion Summary' : 'Description'}</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                required
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 text-gray-600 font-medium resize-none custom-scrollbar"
                                placeholder="Brief description..."
                            ></textarea>
                        </div>


                        {/* Status selection removed for Meetings per user instruction */}

                    </div>
                </div>

                <div className="p-4 md:p-6 border-t bg-white shrink-0 z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                    {error && (
                        <div className="mb-4 text-red-600 text-sm font-semibold">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg active:scale-[0.98] ${isMeeting ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? "Saving..." : editLog ? "Update Task" : (isMeeting ? "Save Meeting Details" : "Create New Quick Task")}
                    </button>
                </div>
            </form>


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

            {/* Auto-Hold Confirmation Modal */}
            {showHoldConfirmation && conflictingTask && (
                <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 ">
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
                                    setPendingPayload(null);
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
        </>
    );
};

export default QuickTaskForm;
