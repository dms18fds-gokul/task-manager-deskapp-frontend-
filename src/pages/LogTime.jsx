import React, { useState, useEffect, useRef } from 'react';
import EmployeeSidebar from '../components/EmployeeSidebar';
import { API_URL } from '../utils/config';
import { FaChevronDown, FaChevronUp, FaPlus, FaEllipsisV, FaTimes, FaCalendarAlt, FaTrash, FaRedo, FaSearch, FaEdit } from 'react-icons/fa';
import DownloadDropdown from "../components/DownloadDropdown";
import CustomDropdown from "../components/CustomDropdown";
import QuickTaskForm from "../components/QuickTaskForm.jsx";
import LogDetailsModal from "../components/LogDetailsModal";

const LogTime = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null); // For popup details
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // Edit Modal State
    const [editingLog, setEditingLog] = useState(null);

    const [popupPosition, setPopupPosition] = useState(null); // To create a menu near the click if needed, but requirements say "popup opens" -> Modal usually.
    // The requirement says "When that icon is clicked, a popup should open. In that popup, it should show..." -> This implies a Modal.

    // User data
    const user = JSON.parse(localStorage.getItem('user'));

    // State for options
    const [projects, setProjects] = useState([]);
    const [owners, setOwners] = useState([]);
    const [types, setTypes] = useState([]);

    // Success Popup State
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

    // Listener for auto-refresh when offline tasks are synced or added
    useEffect(() => {
        const handleOfflineUpdate = () => {
            fetchRecentLogs();
        };

        window.addEventListener('offlineTaskSynced', handleOfflineUpdate);
        window.addEventListener('offlineTaskAdded', handleOfflineUpdate); // If we add this event when saving offline

        return () => {
            window.removeEventListener('offlineTaskSynced', handleOfflineUpdate);
            window.removeEventListener('offlineTaskAdded', handleOfflineUpdate);
        };
    }, [user]);

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        setTimeLeft(30);
    };

    // State for logs
    const [recentLogs, setRecentLogs] = useState([]);

    const todayStr = new Date().toISOString().split('T')[0];
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        projectName: "",
        taskOwner: "",
        taskType: "",
        status: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: todayStr,
        toDate: todayStr,
        projectName: "",
        taskOwner: "",
        taskType: "",
        status: ""
    });

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Derive filter options from recentLogs for the Filter Navbar
    const filterOptions = React.useMemo(() => {
        if (!recentLogs) return { projects: [], owners: [], types: [], statuses: [] };

        const uniqueProjects = [...new Set(recentLogs.map(log => log.projectName))].filter(Boolean).sort();
        const uniqueOwners = [...new Set(recentLogs.map(log => log.taskOwner))].filter(Boolean).sort();
        const uniqueTypes = [...new Set(recentLogs.map(log => log.taskType))].filter(Boolean).sort();

        // Derive statuses from logs to ensure we cover all used statuses (including custom ones like 'Rework')
        const uniqueStatuses = [...new Set(recentLogs.map(log => log.status))].filter(Boolean);
        const standardStatuses = ['In Progress', 'Hold', 'Completed', 'Rework'];
        const allStatuses = [...new Set([...uniqueStatuses, ...standardStatuses])].sort();

        return {
            projects: uniqueProjects,
            owners: uniqueOwners,
            types: uniqueTypes,
            statuses: allStatuses
        };
    }, [recentLogs]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        taskNo: "Auto",
        projectName: [], // Array for multiple selection
        startTime: "",
        endTime: "",
        taskOwner: [], // Array for multiple selection
        description: "",
        taskType: [], // Array for multiple selection
        timeAutomation: "", // Duration
        status: "In Progress"
    });

    const fetchRecentLogs = async () => {
        if (!user) return;

        let serverData = [];
        let fetchSuccess = false;

        try {
            const res = await fetch(`${API_URL}/work-logs/employee/${user._id}`);
            if (res.ok) {
                serverData = await res.json();
                fetchSuccess = true;
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
        }

        // Merge with offline pending tasks from localStorage
        const offlineTasksStr = localStorage.getItem('offlineQuickTasks');
        let pendingLogs = [];
        if (offlineTasksStr) {
            try {
                const parsedTasks = JSON.parse(offlineTasksStr);
                // Filter for current user and map to expected format
                pendingLogs = parsedTasks
                    .filter(t => t.employeeId === user._id)
                    .map((t, i) => ({
                        ...t,
                        _id: `pending-${Date.now()}-${i}`,
                        isPendingOffline: true,
                        logType: "Offline Task Pending"
                    }));
            } catch (e) {
                console.error("Error parsing offline tasks", e);
            }
        }

        const applySort = (data) => {
            return [...data].sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                const taskA = parseInt(a.taskNo || "0", 10);
                const taskB = parseInt(b.taskNo || "0", 10);
                return taskB - taskA;
            });
        };

        if (fetchSuccess) {
            const combinedData = [...serverData, ...pendingLogs];
            setRecentLogs(applySort(combinedData));
        } else {
            // Apply to existing state if offline to ensure immediate UI feedback
            setRecentLogs(prevLogs => {
                const prevServerData = prevLogs.filter(log => !log.isPendingOffline);
                const combinedData = [...prevServerData, ...pendingLogs];
                return applySort(combinedData);
            });
        }
    };

    // Fetch options from new API
    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};

            // Fetch for each category
            const [projRes, ownRes, typeRes] = await Promise.all([
                fetch(`${API_URL}/options?category=Project`, { headers }),
                fetch(`${API_URL}/options?category=Owner`, { headers }),
                fetch(`${API_URL}/options?category=Type`, { headers })
            ]);

            if (projRes.ok) setProjects(await projRes.json());
            if (ownRes.ok) setOwners(await ownRes.json());
            if (typeRes.ok) setTypes(await typeRes.json());

        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchRecentLogs();
    }, []);

    // Helper to format time to 12-hour AM/PM
    const formatTime = (time24) => {
        if (!time24) return "";
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // ... durations helpers ...
    const calculateDurationStr = (start, end) => {
        // ... same ...
        if (!start || !end) return "";
        const [startHours, startMins, startSecs = 0] = start.split(':').map(Number);
        const [endHours, endMins, endSecs = 0] = end.split(':').map(Number);

        const startDate = new Date(0, 0, 0, startHours, startMins, startSecs);
        const endDate = new Date(0, 0, 0, endHours, endMins, endSecs);

        let diff = endDate.getTime() - startDate.getTime();

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

    // Auto-calculate duration
    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const duration = calculateDurationStr(formData.startTime, formData.endTime);
            setFormData(prev => ({ ...prev, timeAutomation: duration }));
        }
    }, [formData.startTime, formData.endTime]);

    // Auto-calculate Task No
    useEffect(() => {
        const logsForDate = recentLogs.filter(log => log.date === formData.date);
        const nextTaskNum = logsForDate.length + 1;
        const taskNoStr = nextTaskNum.toString().padStart(2, '0');
        setFormData(prev => ({ ...prev, taskNo: taskNoStr }));
    }, [recentLogs, formData.date]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            if (name === 'endTime' && value) {
                updates.status = 'Completed';
            }
            return { ...prev, ...updates };
        });
    };

    const handleDataChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleAddNew = async (newValue, category) => {
        try {
            const token = localStorage.getItem('token');
            // Try to find if it exists in local state first to avoid dups?
            // Backend handles dups.
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

                // Helper to prevent duplicates in state
                const addUnique = (prev, newOpt) => {
                    const exists = prev.some(p =>
                        (p._id && newOpt._id && p._id === newOpt._id) ||
                        (p.value === newOpt.value)
                    );
                    return exists ? prev : [...prev, newOpt];
                };

                // Update local state by appending new option object
                if (category === 'Project') {
                    setProjects(prev => addUnique(prev, option));
                    handleDataChange('projectName', [...(Array.isArray(formData.projectName) ? formData.projectName : []), option.value]);
                } else if (category === 'Owner') {
                    setOwners(prev => addUnique(prev, option));
                    handleDataChange('taskOwner', [...(Array.isArray(formData.taskOwner) ? formData.taskOwner : []), option.value]);
                } else if (category === 'Type') {
                    setTypes(prev => addUnique(prev, option));
                    handleDataChange('taskType', [...(Array.isArray(formData.taskType) ? formData.taskType : []), option.value]);
                }
            } else {
                alert("Failed to add option. It may already exist.");
            }
        } catch (error) {
            console.error("Error adding option:", error);
        }
    };

    // Delete Popup State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [optionToDelete, setOptionToDelete] = useState(null);

    const handleRequestDelete = (option) => {
        setOptionToDelete(option);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteOption = async () => {
        if (!optionToDelete || !optionToDelete._id) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/options/${optionToDelete._id}`, {
                method: "DELETE",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });

            if (res.ok) {
                // Remove from state
                const removeFilter = opt => (typeof opt === 'object' ? opt._id !== optionToDelete._id : true);
                if (optionToDelete.category === 'Project') setProjects(prev => prev.filter(removeFilter));
                if (optionToDelete.category === 'Owner') setOwners(prev => prev.filter(removeFilter));
                if (optionToDelete.category === 'Type') setTypes(prev => prev.filter(removeFilter));
                setDeleteConfirmOpen(false);
                setOptionToDelete(null);
            } else {
                alert("Failed to delete option.");
            }
        } catch (error) {
            console.error("Error deleting option:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (formData.projectName.length === 0 || formData.taskOwner.length === 0 || formData.taskType.length === 0 || !formData.startTime || !formData.endTime || !formData.description) {
            alert("Please fill in all required fields (Project, Owner, Type, Start/End Time, Description).");
            return;
        }

        setLoading(true);

        const payload = {
            employeeId: user._id,
            date: formData.date,
            // Join arrays to string for backend
            projectName: Array.isArray(formData.projectName) ? formData.projectName.join(", ") : formData.projectName,
            startTime: formData.startTime,
            endTime: formData.endTime,
            taskOwner: Array.isArray(formData.taskOwner) ? formData.taskOwner.join(", ") : formData.taskOwner,
            description: formData.description,
            taskType: Array.isArray(formData.taskType) ? formData.taskType.join(", ") : formData.taskType,
            timeAutomation: formData.timeAutomation,
            duration: formData.timeAutomation, // Save duration specifically
            status: formData.status,
            taskTitle: Array.isArray(formData.projectName) ? formData.projectName.join(", ") : formData.projectName // Title usually same as project or derived
        };

        try {
            const res = await fetch(`${API_URL}/work-logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setShowSuccess(true);
                setFormData({
                    ...formData,
                    projectName: [], // Reset to empty array
                    startTime: "",
                    endTime: "",
                    description: "",
                    timeAutomation: "",
                    taskOwner: [], // Reset
                    taskType: [] // Reset
                });
                fetchRecentLogs();
            } else {
                alert(data.message || "Failed to add log");
            }
        } catch (error) {
            console.error("Error adding log:", error);
            alert("Server error");
        } finally {
            setLoading(false);
        }
    };

    // Edit functions
    const openEditForm = (log) => {
        console.log("Edit icon clicked, log data received in openEditForm:", log);
        setEditingLog(log);
        setShowForm(true);
        setActiveDropdownLogId(null);
    };

    const parseDate = (dStr) => {
        if (!dStr) return 0;
        // Handle DD-MM-YYYY or DD/MM/YYYY
        const matchOpts = dStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (matchOpts) {
            const [_, d, m, y] = matchOpts;
            return new Date(`${y}-${m}-${d}`).getTime();
        }
        // Handle DD-MM-YY or DD/MM/YY
        const matchShort = dStr.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
        if (matchShort) {
            const [_, d, m, y] = matchShort;
            return new Date(`20${y}-${m}-${d}`).getTime();
        }
        const parsed = new Date(dStr).getTime();
        return isNaN(parsed) ? 0 : parsed;
    };

    const filteredLogs = recentLogs.filter(log => {
        // Parse dates for accurate comparison
        let isValid = true;
        const logDate = log.date || log.Date;

        if (appliedFilters.fromDate) {
            isValid = isValid && logDate && parseDate(logDate) >= parseDate(appliedFilters.fromDate);
        }

        if (appliedFilters.toDate) {
            isValid = isValid && logDate && parseDate(logDate) <= parseDate(appliedFilters.toDate);
        }

        if (appliedFilters.projectName && log.projectName !== appliedFilters.projectName) isValid = false;
        if (appliedFilters.taskOwner && log.taskOwner !== appliedFilters.taskOwner) isValid = false;
        if (appliedFilters.taskType && log.taskType !== appliedFilters.taskType) isValid = false;
        if (appliedFilters.status && log.status !== appliedFilters.status) isValid = false;

        return isValid;
    });

    // Grouping Logic
    const getGroupTitle = (dateStr) => {
        if (!dateStr || dateStr === "undefined") {
            return "";
        }

        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (dateStr === today) return "Today";
        if (dateStr === yesterday) return "Yesterday";

        // Format date as DD-MM-YYYY for others
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateStr.split('-');
            return `${d}-${m}-${y}`;
        }

        return dateStr;
    };

    const groupedLogs = filteredLogs.reduce((groups, log) => {
        const date = log.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {});

    // Sort dates descending for display
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

    // Action Popup Handler
    const handleActionClick = (log, index) => {
        // Find logs for this date to determine index
        const dayLogs = recentLogs.filter(l => l.date === log.date).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const taskIndex = dayLogs.findIndex(l => l._id === log._id);

        setSelectedLog({ ...log, displayTaskNo: (taskIndex + 1).toString().padStart(2, '0') });
        setIsPopupOpen(true);
    };

    const [showForm, setShowForm] = useState(false);

    // Helper to parse duration string to minutes
    const parseDurationToMinutes = (durationStr) => {
        if (!durationStr) return 0;

        // Handle HH:MM format (from CSV)
        if (durationStr.includes(':') && !durationStr.includes('hr') && !durationStr.includes('min')) {
            const [hours, minutes] = durationStr.split(':').map(Number);
            return (hours || 0) * 60 + (minutes || 0);
        }

        let minutes = 0;
        const parts = durationStr.split(' ');
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('hr')) {
                minutes += parseInt(parts[i - 1], 10) * 60;
            } else if (parts[i].includes('min')) {
                minutes += parseInt(parts[i - 1], 10);
            } else if (parts[i].includes('sec')) {
                minutes += parseInt(parts[i - 1], 10) / 60;
            }
        }
        return minutes;
    };

    // Calculate total duration for filtered logs
    const totalDurationMinutes = filteredLogs.reduce((acc, log) => {
        const durationStr = log.timeAutomation || log.duration || calculateDurationStr(log.startTime, log.endTime);
        return acc + parseDurationToMinutes(durationStr);
    }, 0);

    const [activeDropdownLogId, setActiveDropdownLogId] = useState(null);
    const [showReworkPopup, setShowReworkPopup] = useState(false);
    const [pendingReworkLog, setPendingReworkLog] = useState(null);

    const updateLogStatus = async (logId, newStatus, extraData = {}) => {
        try {
            const res = await fetch(`${API_URL}/work-logs/${logId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    ...extraData
                })
            });

            if (res.ok) {
                // Update local state
                setRecentLogs(prev => prev.map(log =>
                    log._id === logId ? { ...log, status: newStatus, ...extraData } : log
                ));
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status.");
        } finally {
            setActiveDropdownLogId(null);
        }
    };

    const formatTotalDuration = (totalMinutes) => {
        const totalSeconds = Math.round(totalMinutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours} Hrs ${minutes} Mins ${seconds} Sec.`;
    };

    // Define columns for download
    const downloadColumns = [
        { header: "Date", accessor: "date" },
        { header: "Task No", accessor: (item) => (item.taskNo || "0").toString().padStart(2, '0') },
        { header: "Project", accessor: "projectName" },
        { header: "Type", accessor: "taskType" },
        { header: "Owner", accessor: (item) => item.taskOwner || "Unknown" }, // owner is string in this file? check line 163
        { header: "Description", accessor: "description" },
        { header: "Start Time", accessor: (item) => formatTime(item.startTime) },
        { header: "End Time", accessor: (item) => formatTime(item.endTime) },
        { header: "Duration", accessor: (item) => item.duration || item.timeAutomation || calculateDurationStr(item.startTime, item.endTime) },
        { header: "Status", accessor: "status" }
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            <EmployeeSidebar className="hidden md:flex" />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </header>

                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {/* Delete Confirmation Modal */}
                    {deleteConfirmOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-xl p-6 w-96 transform transition-all scale-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Option?</h3>
                                <p className="text-gray-600 mb-6 text-sm">
                                    Are you sure you want to delete <span className="font-semibold text-gray-800">"{optionToDelete?.value}"</span>? This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteOption}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header & Add Button */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">My Work Logs & QT</h2>
                        <div className="flex gap-2">
                            {user?.role === "Super Admin" && (
                                <DownloadDropdown
                                    data={filteredLogs}
                                    fileName="My_Work_Logs"
                                    columns={downloadColumns}
                                />
                            )}
                            <button
                                onClick={() => {
                                    setEditingLog(null);
                                    setShowForm(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
                            >
                                <FaPlus /> Quick Task
                            </button>
                        </div>
                    </div>

                    {/* Filter Navbar */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4 border border-gray-100">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">From Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                    className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                />
                                <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase mb-1.5 block tracking-wider">To Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                    className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 hover:bg-white text-gray-700 font-medium"
                                />
                                <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                label="Project"
                                options={['All Projects', ...filterOptions.projects]}
                                value={filters.projectName === "" ? 'All Projects' : filters.projectName}
                                onChange={(val) => handleFilterChange('projectName', val === 'All Projects' ? "" : val)}
                                placeholder="All Projects"
                            />
                        </div>



                        <div className="flex-1 min-w-[180px]">
                            <CustomDropdown
                                label="Status"
                                options={['All Statuses', ...filterOptions.statuses]}
                                value={filters.status === "" ? 'All Statuses' : filters.status}
                                onChange={(val) => handleFilterChange('status', val === 'All Statuses' ? "" : val)}
                                placeholder="All Statuses"
                            />
                        </div>

                        <div className="flex-none pb-[1px] flex gap-2 w-full justify-end mt-2">
                            <button
                                onClick={() => {
                                    const tStr = new Date().toISOString().split('T')[0];
                                    const defaultFilters = { fromDate: "", toDate: "", projectName: "", taskOwner: "", taskType: "", status: "" };
                                    const defaultApplied = { fromDate: tStr, toDate: tStr, projectName: "", taskOwner: "", taskType: "", status: "" };
                                    setFilters(defaultFilters);
                                    setAppliedFilters(defaultApplied);
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center font-bold"
                                title="Reset Filters"
                            >
                                <FaRedo className="text-sm" />
                            </button>
                            <button
                                onClick={() => setAppliedFilters({ ...filters })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                <FaSearch className="text-xs" /> Fetch Data
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Form Overlay */}
                    <div className={`fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showForm ? 'translate-x-0' : 'translate-x-full'}`}>
                        {showForm && (
                            <QuickTaskForm
                                key={editingLog ? editingLog._id : 'new-form'}
                                user={user}
                                editLog={editingLog}
                                onClose={() => {
                                    setShowForm(false);
                                    setEditingLog(null);
                                }}
                                onSuccess={() => {
                                    fetchRecentLogs();
                                    setShowForm(false);
                                    setEditingLog(null);
                                }}
                            />
                        )}
                    </div>

                    {/* Full Width Table View with Grouping */}
                    <div className="w-full space-y-8">
                        {sortedDates.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                                <p className="text-lg">No logs found matching your criteria.</p>
                                <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline">
                                    Create a new log
                                </button>
                            </div>
                        ) : (
                            sortedDates.map(date => {
                                // Calculate categorized durations for this group
                                const groupMetrics = groupedLogs[date].reduce((acc, log) => {
                                    const durationStr = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
                                    const mins = parseDurationToMinutes(durationStr);

                                    acc.total += mins;

                                    if (log.logType === 'Meeting') {
                                        acc.meeting += mins;
                                    } else if (["QT Task", "QT", "Quick"].includes(log.logType)) {
                                        acc.qt += mins;
                                    } else {
                                        acc.main += mins;
                                    }

                                    return acc;
                                }, { total: 0, meeting: 0, qt: 0, main: 0 });

                                return (
                                    <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        {/* Group Header */}
                                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                                    {getGroupTitle(date)}
                                                </h3>
                                                <span className="text-xs text-gray-400 font-medium">({groupedLogs[date].length} tasks)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 md:gap-3">
                                                <div className="bg-purple-50 px-3 py-1 rounded text-xs border border-purple-100 shadow-sm">
                                                    <span className="text-purple-500 font-semibold mr-1">QT Hrs:</span>
                                                    <span className="text-purple-700 font-bold">{formatTotalDuration(groupMetrics.qt)}</span>
                                                </div>
                                                <div className="bg-teal-50 px-3 py-1 rounded text-xs border border-teal-100 shadow-sm">
                                                    <span className="text-teal-500 font-semibold mr-1">Meeting Hrs:</span>
                                                    <span className="text-teal-700 font-bold">{formatTotalDuration(groupMetrics.meeting)}</span>
                                                </div>
                                                <div className="bg-blue-50 px-3 py-1 rounded text-xs border border-blue-100 shadow-sm">
                                                    <span className="text-blue-500 font-semibold mr-1">Main Task Hrs:</span>
                                                    <span className="text-blue-700 font-bold">{formatTotalDuration(groupMetrics.main)}</span>
                                                </div>
                                                <div className="bg-indigo-50 px-3 py-1 rounded text-xs border border-indigo-100 shadow-sm">
                                                    <span className="text-indigo-500 font-semibold mr-1">Total Hrs:</span>
                                                    <span className="text-indigo-700 font-bold">{formatTotalDuration(groupMetrics.total)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                                                <thead>
                                                    <tr className="bg-white text-gray-500 text-xs border-b border-gray-100 uppercase tracking-wider">
                                                        <th className="p-4 font-semibold w-[8%] text-center text-gray-400">Task No</th>
                                                        <th className="p-4 font-semibold w-[10%]">Assigned By</th>
                                                        <th className="p-4 font-semibold w-[15%]">Project</th>
                                                        <th className="p-4 font-semibold w-[20%]">Description</th>
                                                        <th className="p-4 font-semibold w-[12%]">Time & Duration</th>
                                                        <th className="p-4 font-semibold w-[8%] text-center">Status</th>
                                                        <th className="p-4 font-semibold w-[8%] text-center">Type</th>
                                                        {date === new Date().toISOString().split('T')[0] && (
                                                            <th className="p-4 font-semibold w-[6%] text-center text-indigo-500">Edit</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {groupedLogs[date]
                                                        .map((log, index) => {
                                                            const displayDuration = log.duration || log.timeAutomation || calculateDurationStr(log.startTime, log.endTime);
                                                            const displayTaskNo = (log.taskNo || "0").toString().padStart(2, '0');

                                                            return (
                                                                <tr
                                                                    key={log._id}
                                                                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                                    onClick={() => handleActionClick(log, index)}
                                                                >
                                                                    <td className="p-4 text-xs font-bold text-gray-400 text-center">
                                                                        <div className="flex flex-col justify-center items-center gap-1.5 mt-1">
                                                                            <span>{displayTaskNo}</span>
                                                                            <span
                                                                                className={`w-2 h-2 shrink-0 rounded-[2px] ${log.isPendingOffline || log.logType === 'Offline Task' ? 'bg-red-500' : 'bg-green-500'}`}
                                                                                title={log.isPendingOffline ? 'Offline Task Pending' : log.logType === 'Offline Task' ? 'Offline Task' : 'Online Task'}
                                                                            ></span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Assigned By */}
                                                                    <td className="p-4">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-gray-800">
                                                                                {log.assignedBy || "Unknown"}
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
                                                                                {log.taskType}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Description */}
                                                                    <td className="p-4">
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" title={log.description}>
                                                                                {log.description}
                                                                            </p>
                                                                        </div>
                                                                    </td>

                                                                    {/* Time & Duration */}
                                                                    <td className="p-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-gray-800">
                                                                                {displayDuration || "-"}
                                                                            </span>
                                                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                                                <span className="font-mono">{formatTime(log.startTime)}</span>
                                                                                <span className="text-gray-300 mx-1">➜</span>
                                                                                <span className="font-mono">{formatTime(log.endTime)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Status */}
                                                                    <td className="p-4 text-sm relative text-center">
                                                                        {(() => {
                                                                            const isRework = log.status === 'Rework';
                                                                            const effectiveStatus = (log.status && log.status !== 'In Progress') ? log.status : (log.endTime ? "Completed" : "In Progress");

                                                                            const isHold = effectiveStatus.startsWith('Hold');
                                                                            const isInProgress = effectiveStatus === 'In Progress';
                                                                            const isCompleted = effectiveStatus === 'Completed';

                                                                            // Define dropdown options based on current status
                                                                            const renderDropdown = () => {
                                                                                if (activeDropdownLogId !== log._id) return null;

                                                                                return (
                                                                                    <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-left animate-fade-in-up">
                                                                                        {isInProgress && (
                                                                                            <>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'Hold'); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Hold
                                                                                                </div>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'Completed'); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Completed
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                        {isHold && (
                                                                                            <>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'In Progress', { endTime: null }); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> In Progress
                                                                                                </div>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'Completed'); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Completed
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                        {isRework && (
                                                                                            <>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'Hold'); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Hold
                                                                                                </div>
                                                                                                <div onClick={(e) => { e.stopPropagation(); updateLogStatus(log._id, 'Completed'); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                                                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Completed
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                        <div onClick={(e) => { e.stopPropagation(); setActiveDropdownLogId(null); }} className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer border-t border-gray-100 text-center">
                                                                                            Cancel
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            };

                                                                            return (
                                                                                <>
                                                                                    <span
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            // Allow opening if it's today's log even if completed (so they can Edit)
                                                                                            if (isCompleted && log.date !== new Date().toISOString().split('T')[0]) {
                                                                                                return;
                                                                                            }
                                                                                            setActiveDropdownLogId(activeDropdownLogId === log._id ? null : log._id);
                                                                                        }}
                                                                                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${(isCompleted && log.date !== new Date().toISOString().split('T')[0]) ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'} transition-all ${isRework ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                                            isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                                                isHold ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                                                    'bg-sky-50 text-sky-700 border-sky-100'
                                                                                            }`}
                                                                                    >
                                                                                        {isRework ? 'Rework' : effectiveStatus}
                                                                                    </span>
                                                                                    {renderDropdown()}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </td>

                                                                    {/* Log Type */}
                                                                    <td className="p-4 text-center">
                                                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${log.logType === 'Meeting' ? 'bg-teal-50 text-teal-700 border-teal-100' : ["QT Task", "QT", "Quick"].includes(log.logType) ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                                            {log.logType === 'Meeting' ? 'Meeting' : ["QT Task", "QT", "Quick"].includes(log.logType) ? "Quick" : "Main"}
                                                                        </span>
                                                                    </td>

                                                                    {/* Edit Action - ONLY FOR TODAY'S LOGS */}
                                                                    {date === new Date().toISOString().split('T')[0] && (
                                                                        <td className="p-4 text-center">
                                                                            {(log.logType === 'Meeting' || ["QT Task", "QT", "Quick"].includes(log.logType)) && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        openEditForm(log);
                                                                                    }}
                                                                                    className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50 transition-colors tooltip flex items-center justify-center mx-auto"
                                                                                    title="Edit Log"
                                                                                >
                                                                                    <FaEdit size={16} />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>

                {/* Details Modal */}
                <LogDetailsModal
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    log={selectedLog}
                    employees={[]} // User panel doesn't have full employee list with roles, which is fine
                />
                {/* Rework Confirmation Popup */}
                {showReworkPopup && pendingReworkLog && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Rework Project?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Do you want to mark this project for Rework?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowReworkPopup(false);
                                        setPendingReworkLog(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        updateLogStatus(pendingReworkLog._id, 'Rework', { reworkStartTime: new Date() });
                                        setShowReworkPopup(false);
                                        setPendingReworkLog(null);
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition shadow-lg"
                                >
                                    Yes, Rework
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-green-100 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ✓
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Log Added!</h3>
                        <p className="text-gray-500 mb-8">
                            Your work log has been successfully saved.
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

            {/* Extracted Edit Feature Form To Sidebar */}
        </div>
    );
};

export default LogTime;
