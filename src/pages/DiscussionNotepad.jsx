import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { FaEdit, FaSave, FaTrash, FaStickyNote, FaSync, FaCalendarAlt, FaCheckCircle, FaCheck, FaTimes, FaCircle, FaVolumeUp, FaCloudUploadAlt, FaMicrophone, FaTasks } from "react-icons/fa";
import axios from "axios";
import { API_URL, getSocketUrl } from "../utils/config";
import { io } from "socket.io-client";

const DiscussionNotepad = () => {
    const [notes, setNotes] = useState("");
    const [checklist, setChecklist] = useState([]);
    const [audioFiles, setAudioFiles] = useState([]);
    const [format, setFormat] = useState(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            const userId = parsed.id || parsed._id;
            return localStorage.getItem(`discussion_format_${userId}`) || "paragraph";
        }
        return "paragraph";
    });
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef(null);
    const [allEmployeesData, setAllEmployeesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [lastSaved, setLastSaved] = useState(null);
    const mediaRecorderRef = React.useRef(null);

    useEffect(() => {
        let timer;
        if (isRecording) {
            timer = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    // Auto-save logic for Paragraph and Checklist
    useEffect(() => {
        if (!user || isPastDate()) return;

        // Save to LocalStorage immediately for instant refresh protection
        const draftKey = `discussion_draft_${user.id || user._id}_${selectedDate}`;
        localStorage.setItem(draftKey, JSON.stringify({ notes, checklist, format, timestamp: Date.now() }));

        const timer = setTimeout(() => {
            if (notes || (checklist.length > 0 && checklist.some(item => item.text.trim() !== ""))) {
                performSave();
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [notes, checklist, format]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isSaving || isUploading) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaving, isUploading]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isAdmin = user?.role === "Super Admin" || (Array.isArray(user?.role) && user?.role.includes("Super Admin"));

    // Default to today's local date in YYYY-MM-DD format
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const displayDateObj = new Date(selectedDate);
    // Add timezone adjustment so it doesn't shift back a day if UTC midnight falls on previous day locally
    const userTimezoneOffset = displayDateObj.getTimezoneOffset() * 60000;
    const adjustedDateObj = new Date(displayDateObj.getTime() + userTimezoneOffset);

    const todayDate = adjustedDateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const [selectedAdminDate, setSelectedAdminDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const [empFilterDates, setEmpFilterDates] = useState({}); // { [employeeId]: "YYYY-MM-DD" }

    const isPastDate = (dateStr = selectedDate) => {
        if (!dateStr) return false;
        const today = new Date();
        const selected = new Date(dateStr);
        today.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        return selected < today;
    };

    const fetchDiscussionData = async (userId, isAdminRole = false, dateToFetchStr = selectedDate) => {
        setIsLoading(true);
        try {
            // 1. Fetch Today's Notes for Current User
            const res = await axios.get(`${API_URL}/discussion?employeeId=${userId}&date=${dateToFetchStr}`);

            if (res.data.format) {
                setFormat(res.data.format);
            }

            // ALWAYS set notes, even if empty, to clear the previous view
            setNotes(res.data.notes || "");
            setAudioFiles((res.data.audioFiles || []).map(file => ({
                ...file,
                status: file.status || "Pending"
            })));

            if (res.data.checklist && res.data.checklist.length > 0) {
                const fetchedChecklist = [...res.data.checklist];
                // Always ensure there is an empty row at the bottom to continue typing if not past date
                const isPast = isPastDate(); // Check based on the target date string

                if (!isPast && fetchedChecklist[fetchedChecklist.length - 1].text.trim() !== '') {
                    fetchedChecklist.push({ id: Date.now(), text: "", completed: false, status: "Pending" });
                }
                // Normalize fetched items to ensure status exists
                setChecklist(fetchedChecklist.map(item => ({
                    ...item,
                    status: item.status || (item.completed ? "Completed" : "Pending")
                })));
            } else {
                setChecklist([{ id: Date.now(), text: "", completed: false, status: "Pending" }]);
            }

            if (isAdminRole) {
                await fetchAdminData(userId, dateToFetchStr);
            }

            // After fetching from DB, check for any unsaved local drafts that might be newer
            const draftKey = `discussion_draft_${userId}_${dateToFetchStr}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const { notes: draftNotes, checklist: draftChecklist, timestamp } = JSON.parse(savedDraft);
                // If draft is newer than ~2 minutes or if DB is empty, consider using draft
                // Actually, if it's there and different, let's just trust it for now to avoid data loss
                if (draftNotes !== (res.data.notes || "") || JSON.stringify(draftChecklist) !== JSON.stringify(res.data.checklist || [])) {
                     // Optionally could show a "Restore draft?" toast, but user asked for it to "never be removed"
                     if (draftNotes) setNotes(draftNotes);
                     if (draftChecklist && draftChecklist.length > 0) setChecklist(draftChecklist);
                }
            }

        } catch (error) {
            if (checklist.length === 0) {
                setChecklist([{ id: Date.now(), text: "", completed: false, status: "Pending" }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAdminData = async (userId, isoDate = new Date().toISOString()) => {
        try {
            const allRes = await axios.get(`${API_URL}/discussion/all?date=${isoDate}`);
            const data = allRes.data.filter(emp => String(emp.employeeId) !== String(userId)).map(emp => ({
                ...emp,
                checklist: (emp.checklist || []).map(item => ({
                    ...item,
                    status: item.status || (item.completed ? "Completed" : "Pending")
                })),
                audioFiles: (emp.audioFiles || []).map(file => ({
                    ...file,
                    status: file.status || "Pending"
                }))
            }));
            setAllEmployeesData(data);

            // Initialize filter dates for each employee if not already set
            setEmpFilterDates(prev => {
                const newDates = { ...prev };
                data.forEach(emp => {
                    if (!newDates[emp.employeeId]) {
                        newDates[emp.employeeId] = isoDate.split('T')[0];
                    }
                });
                return newDates;
            });
        } catch (error) {
        }
    };

    const fetchSingleEmployeeForAdmin = async (empId, dateStr) => {
        try {
            const res = await axios.get(`${API_URL}/discussion?employeeId=${empId}&date=${dateStr}`);
            setAllEmployeesData(prev => prev.map(emp =>
                String(emp.employeeId) === String(empId)
                    ? { 
                        ...emp, 
                        notes: res.data.notes, 
                        checklist: (res.data.checklist || []).map(item => ({
                            ...item,
                            status: item.status || (item.completed ? "Completed" : "Pending")
                        })),
                        audioFiles: (res.data.audioFiles || []).map(file => ({
                            ...file,
                            status: file.status || "Pending"
                        }))
                    }
                    : emp
            ));
        } catch (error) {
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        let parsedUser = null;
        let isAdminRole = false;

        if (storedUser) {
            parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            const userId = parsedUser.id || parsedUser._id;
            isAdminRole = parsedUser.role === "Super Admin" || (Array.isArray(parsedUser.role) && parsedUser.role.includes("Super Admin"));

            // Load today's data from DB by default on mount
            const todayStrForInit = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
            fetchDiscussionData(userId, isAdminRole, todayStrForInit);
        }

        // Setup Socket for auto-refresh Admin Dashboard
        const newSocket = io(getSocketUrl());

        newSocket.on("taskAdded", () => {
            // Re-fetch data silently if Admin, so they see employee updates live
            if (parsedUser && isAdminRole) {
                const currentUserId = parsedUser.id || parsedUser._id;
                fetchAdminData(currentUserId, selectedAdminDate);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [selectedAdminDate]);

    const handleFormatChange = (newFormat) => {
        setFormat(newFormat);
        if (user) {
            localStorage.setItem(`discussion_format_${user.id || user._id}`, newFormat);
        }
    };

    const handleNotesChange = (e) => {
        setNotes(e.target.value);
    };

    const updateChecklistItem = (id, field, value) => {
        let newChecklist = checklist.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );

        // Automation: If typing in the last row and it's not empty, add a new row
        if (field === "text" && value.trim() !== "") {
            const index = checklist.findIndex(item => item.id === id);
            if (index === checklist.length - 1) {
                newChecklist.push({ id: Date.now(), text: "", completed: false, status: "Pending" });
            }
        }

        // Logic sync: if status is changed to Completed, set completed: true
        if (field === "status") {
            newChecklist = newChecklist.map(item => {
                if (item.id === id) {
                    return { ...item, completed: value === "Completed" };
                }
                return item;
            });
        }

        setChecklist(newChecklist);
    };

    const deleteChecklistItem = (id) => {
        const newChecklist = checklist.filter(item => item.id !== id);
        // Ensure at least one empty task exists
        const finalChecklist = newChecklist.length === 0 ? [{ id: Date.now(), text: "", completed: false, status: "Pending" }] : newChecklist;
        setChecklist(finalChecklist);
    };

    const startRecording = async () => {
        if (isPastDate()) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            
            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
                await handleDirectUpload(file);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            setToastMessage("Microphone access denied or not available.");
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleDirectUpload = async (file) => {
        setIsUploading(true);
        const newAudioFiles = [...audioFiles];

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await axios.post(`${API_URL}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            newAudioFiles.push({
                id: res.data.id,
                fileUrl: res.data.fileUrl,
                fileName: res.data.fileName,
                fileType: res.data.fileType,
                size: res.data.size,
                status: "Pending",
                uploadedAt: new Date()
            });

            setAudioFiles(newAudioFiles);
            await performSave({ audioFiles: newAudioFiles, format: "audio" });
        } catch (error) {
            setToastMessage("Failed to upload recording.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e) => {
        if (isPastDate()) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        const newAudioFiles = [...audioFiles];

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                const res = await axios.post(`${API_URL}/upload`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                newAudioFiles.push({
                    id: res.data.id,
                    fileUrl: res.data.fileUrl,
                    fileName: res.data.fileName,
                    fileType: res.data.fileType,
                    size: res.data.size,
                    status: "Pending",
                    uploadedAt: new Date()
                });
            }

            setAudioFiles(newAudioFiles);
            // Auto save after upload
            await performSave({ audioFiles: newAudioFiles, format: "audio" });
        } catch (error) {
            setToastMessage("Failed to upload audio file.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const deleteAudioFile = async (id) => {
        if (isPastDate()) return;
        const newAudioFiles = audioFiles.filter(file => file.id !== id);
        setAudioFiles(newAudioFiles);
        await performSave({ audioFiles: newAudioFiles, format: "audio" });
    };

    const updateAudioFileStatus = async (id, newStatus) => {
        if (isPastDate()) return;
        const newAudioFiles = audioFiles.map(file => 
            file.id === id ? { ...file, status: newStatus } : file
        );
        setAudioFiles(newAudioFiles);
        await performSave({ audioFiles: newAudioFiles, format: "audio" });
    };

    const handleSave = async () => {
        await performSave();
    };

    const performSave = async (overrides = {}) => {
        if (!user) return;
        setIsSaving(true);
        const currentFormat = overrides.format || format;
        try {
            const roleStr = Array.isArray(user.role) ? user.role.join(", ") : (user.role || "N/A");
            const payload = {
                format: currentFormat,
                notes: currentFormat === "paragraph" ? notes : undefined,
                checklist: currentFormat === "checklist" ? checklist.filter(item => item.text.trim() !== "") : undefined,
                audioFiles: currentFormat === "audio" ? (overrides.audioFiles || audioFiles) : undefined,
                employeeId: user.id || user._id,
                employeeName: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Unknown Employee"),
                department: user.designation || roleStr,
                designation: user.designation || "",
                date: selectedDate
            };

            await axios.post(`${API_URL}/discussion`, payload);

            // Re-fetch to ensure sync
            await fetchDiscussionData(user.id || user._id, isAdmin, selectedDate);
            setToastMessage("Data saved successfully!");
            setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setTimeout(() => setToastMessage(null), 3000);
        } catch (error) {
            setToastMessage("Failed to save data.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const clearNotes = () => {
        if (format === "paragraph") {
            setNotes("");
        } else if (format === "checklist") {
            setChecklist([{ id: Date.now(), text: "", completed: false, status: "Pending" }]);
        } else {
            setAudioFiles([]);
        }
    };


    // ADMIN LOGIC
    const updateAdminEmployeeTask = async (employeeId, taskId, field, value, recordDate) => {
        const empIndex = allEmployeesData.findIndex(e => String(e.employeeId) === String(employeeId));
        if (empIndex === -1) return;

        const empData = allEmployeesData[empIndex];
        let newChecklist = [...(empData.checklist || [])];

        const existingTaskIndex = newChecklist.findIndex(item => item.id === taskId);
        if (existingTaskIndex > -1) {
            newChecklist[existingTaskIndex] = { ...newChecklist[existingTaskIndex], [field]: value };
            
            // Logic sync: if status is changed, update completed boolean
            if (field === "status") {
                newChecklist[existingTaskIndex].completed = value === "Completed";
            }

            // Auto add empty row if typing in last task and NOT a past date
            if (field === "text" && value.trim() !== "" && existingTaskIndex === newChecklist.length - 1 && !isPastDate(recordDate)) {
                newChecklist.push({ id: Date.now(), text: "", completed: false, status: "Pending" });
            }
        } else {
            // New task
            newChecklist.push({
                id: taskId,
                text: field === "text" ? value : "New Task",
                completed: field === "status" ? value === "Completed" : (field === "completed" ? value : false),
                status: field === "status" ? value : "Pending"
            });
        }

        try {
            await axios.post(`${API_URL}/discussion`, {
                format: "checklist",
                checklist: newChecklist.filter(item => item.text.trim() !== "" || item.id === newChecklist[newChecklist.length - 1].id),
                employeeId: employeeId,
                employeeName: empData.employeeName,
                department: empData.department,
                designation: empData.department,
                date: recordDate
            });

            setAllEmployeesData(prev => prev.map(e =>
                String(e.employeeId) === String(employeeId) ? { ...e, checklist: newChecklist } : e
            ));
        } catch (error) {
            alert("Failed to update employee task.");
        }
    };

    const deleteAdminEmployeeTask = async (employeeId, taskId, recordDate) => {
        const empIndex = allEmployeesData.findIndex(e => String(e.employeeId) === String(employeeId));
        if (empIndex === -1) return;

        const empData = allEmployeesData[empIndex];
        const newChecklist = empData.checklist.filter(item => item.id !== taskId);
        const finalChecklist = newChecklist.length === 0 ? [{ id: Date.now(), text: "", completed: false, status: "Pending" }] : newChecklist;

        try {
            await axios.post(`${API_URL}/discussion`, {
                format: "checklist",
                checklist: finalChecklist.filter(item => item.text.trim() !== "" || item.id === finalChecklist[finalChecklist.length - 1].id),
                employeeId: employeeId,
                employeeName: empData.employeeName,
                department: empData.department,
                designation: empData.department,
                date: recordDate
            });

            setAllEmployeesData(prev => prev.map(e =>
                String(e.employeeId) === String(employeeId) ? { ...e, checklist: finalChecklist } : e
            ));
        } catch (error) {
            alert("Failed to delete employee task.");
        }
    };

    const updateAdminAudioFileStatus = async (employeeId, fileId, newStatus, recordDate) => {
        const empIndex = allEmployeesData.findIndex(e => String(e.employeeId) === String(employeeId));
        if (empIndex === -1) return;

        const empData = allEmployeesData[empIndex];
        const newAudioFiles = empData.audioFiles.map(file => 
            file.id === fileId ? { ...file, status: newStatus } : file
        );

        try {
            await axios.post(`${API_URL}/discussion`, {
                format: "audio",
                audioFiles: newAudioFiles,
                employeeId: employeeId,
                employeeName: empData.employeeName,
                department: empData.department,
                designation: empData.department,
                date: recordDate
            });

            setAllEmployeesData(prev => prev.map(e =>
                String(e.employeeId) === String(employeeId) ? { ...e, audioFiles: newAudioFiles } : e
            ));
        } catch (error) {
            alert("Failed to update audio task status.");
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans relative">
            {/* Desktop Sidebar */}
            {isAdmin ? (
                <Sidebar className="hidden md:flex" />
            ) : (
                <EmployeeSidebar className="hidden md:flex" />
            )}

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        {isAdmin ? (
                            <Sidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        ) : (
                            <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden relative">

                {/* Toast Notification */}
                {toastMessage && (
                    <div className="absolute bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all animate-bounce">
                        {toastMessage.includes("Failed") ? <FaTrash className="text-red-400" /> : <FaCheckCircle className="text-green-400" />}
                        <span className="font-medium text-sm">{toastMessage}</span>
                    </div>
                )}

                {/* Header (Mobile toggle & Page Title) */}
                {/* Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                            <FaStickyNote className="text-indigo-600 hidden sm:block" />
                            <span className="hidden sm:block">Discussion Notepad</span>
                            <span className="sm:hidden">Notepad</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Format Toggles */}
                        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => handleFormatChange("paragraph")}
                                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${format === "paragraph"
                                    ? "bg-white text-indigo-600 shadow-md transform scale-105"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Paragraph
                            </button>
                            <button
                                onClick={() => handleFormatChange("checklist")}
                                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${format === "checklist"
                                    ? "bg-white text-indigo-600 shadow-md transform scale-105"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Checklist
                            </button>
                            <button
                                onClick={() => handleFormatChange("audio")}
                                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all ${format === "audio"
                                    ? "bg-white text-indigo-600 shadow-md transform scale-105"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Audio
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[70vh] flex-shrink-0">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <FaEdit /> {
                                        format === "paragraph" ? "Write your discussion notes below" : 
                                        format === "checklist" ? "Manage your tasks below" : 
                                        "Manage your audio records below"
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Date Display / Picker */}
                                {/* Date Display / Picker */}
                                <div className="flex bg-gray-100 rounded shadow-sm overflow-hidden group">
                                    <div
                                        className="relative flex items-center px-3 py-1.5 cursor-pointer hover:bg-gray-200 transition-colors"
                                        onClick={() => document.getElementById('notepadDatePicker').showPicker()}
                                    >
                                        <FaCalendarAlt className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                        <span className="text-xs font-bold text-gray-500 pl-2 whitespace-nowrap group-hover:text-indigo-600 transition-colors">
                                            {todayDate}
                                        </span>
                                        <input
                                            id="notepadDatePicker"
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                setSelectedDate(e.target.value);
                                            }}
                                            className="absolute invisible w-0 h-0"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (user) {
                                                const isAdminRole = user.role === "Super Admin" || (Array.isArray(user.role) && user.role.includes("Super Admin"));
                                                fetchDiscussionData(user.id || user._id, isAdminRole, selectedDate);
                                            }
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 text-xs font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Go
                                    </button>
                                </div>
                            </div>
                        </div>

                        {format === "paragraph" ? (
                            isPastDate() && !notes ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400 bg-gray-50 opacity-80">
                                    <FaStickyNote className="text-4xl mb-3 text-gray-300" />
                                    <p className="text-lg font-medium">No notes available for this date.</p>
                                </div>
                            ) : (
                                <textarea
                                    value={notes}
                                    onChange={handleNotesChange}
                                    placeholder="Type your notes here... They will be saved automatically as you type."
                                    disabled={isPastDate()}
                                    className={`flex-1 w-full h-full p-6 outline-none text-gray-700 leading-relaxed resize-none text-lg font-medium placeholder-gray-300 custom-scrollbar ${isPastDate() ? "bg-gray-50 opacity-70 cursor-not-allowed" : ""}`}
                                />
                            )
                        ) : format === "checklist" ? (
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {isPastDate() && (!checklist || checklist.length === 0 || checklist.every(item => item.text.trim() === '')) ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 opacity-80 rounded-xl">
                                        <FaCheckCircle className="text-4xl mb-3 text-gray-300" />
                                        <p className="text-lg font-medium">No tasks available for this date.</p>
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse">
                                        <thead className="sticky top-0 bg-white">
                                            <tr className="border-b-2 border-gray-100">
                                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                                                <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Task Description</th>
                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Status</th>
                                                <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklist.map((item, index) => (
                                                <tr 
                                                    key={item.id} 
                                                    className={`border-b transition-colors group ${
                                                        item.status === 'Completed' ? 'bg-green-100 border-green-200' : 
                                                        item.status === 'Cancelled' ? 'bg-red-100 border-red-200' : 
                                                        'bg-white border-gray-50 hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <td className="py-2 px-4 text-gray-400 font-mono text-sm">{index + 1}</td>
                                                    <td className="py-2 px-4">
                                                        <input
                                                            type="text"
                                                            value={item.text}
                                                            onChange={(e) => updateChecklistItem(item.id, "text", e.target.value)}
                                                            placeholder={`Task ${index + 1}`}
                                                            disabled={isPastDate()}
                                                            className={`w-full bg-transparent outline-none text-gray-700 font-medium ${
                                                                item.status === 'Completed' ? 'line-through text-green-700/60' : 
                                                                item.status === 'Cancelled' ? 'line-through text-red-700/60' : 
                                                                ''
                                                            } ${isPastDate() ? 'cursor-not-allowed opacity-70' : ''}`}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-4 text-right relative">
                                                        <div className="flex justify-end items-center gap-1">
                                                            {/* Status Selector Dropdown Logic Link */}
                                                            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                                                <button
                                                                    onClick={() => updateChecklistItem(item.id, "status", item.status === "Completed" ? "Pending" : "Completed")}
                                                                    title="Mark as Completed"
                                                                    className={`p-1.5 rounded transition-all ${item.status === "Completed" ? "bg-green-500 text-white shadow-sm" : "text-gray-400 hover:text-green-500 hover:bg-white"}`}
                                                                >
                                                                    <FaCheck size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => updateChecklistItem(item.id, "status", item.status === "Cancelled" ? "Pending" : "Cancelled")}
                                                                    title="Mark as Cancelled"
                                                                    className={`p-1.5 rounded transition-all ${item.status === "Cancelled" ? "bg-red-500 text-white shadow-sm" : "text-gray-400 hover:text-red-500 hover:bg-white"}`}
                                                                >
                                                                    <FaTimes size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-4 text-right">
                                                        {!isPastDate() && (
                                                            <button
                                                                onClick={() => deleteChecklistItem(item.id)}
                                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                            >
                                                                <FaTrash size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        ) : format === "audio" ? (
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col h-full bg-white">
                                {/* Audio Checklist Table */}
                                <div className="flex-1 overflow-y-auto">
                                    {isPastDate() && (!audioFiles || audioFiles.length === 0) ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 opacity-80 rounded-xl">
                                            <FaVolumeUp className="text-4xl mb-3 text-gray-300" />
                                            <p className="text-lg font-medium">No audio records for this date.</p>
                                        </div>
                                    ) : audioFiles.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-indigo-300 opacity-50">
                                            <FaMicrophone size={64} className="mb-4" />
                                            <p className="text-lg font-medium">No voice tasks added yet.</p>
                                            <p className="text-sm italic">Use the icons below to record or upload.</p>
                                        </div>
                                    ) : (
                                        <table className="w-full border-collapse">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="border-b-2 border-gray-100">
                                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                                                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Voice Task (Player)</th>
                                                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Time</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Status</th>
                                                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {audioFiles.map((file, index) => (
                                                    <tr 
                                                        key={file.id} 
                                                        className={`border-b transition-colors group ${
                                                            file.status === 'Completed' ? 'bg-green-100 border-green-200' : 
                                                            file.status === 'Cancelled' ? 'bg-red-100 border-red-200' : 
                                                            'bg-white border-gray-50 hover:bg-gray-50/50'
                                                        }`}
                                                    >
                                                        <td className="py-2 px-4 text-gray-400 font-mono text-sm">{index + 1}</td>
                                                        <td className="py-2 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <audio controls className="h-8 max-w-[200px] md:max-w-xs scale-90 -ml-4">
                                                                    <source src={file.fileUrl} type={file.fileType} />
                                                                </audio>
                                                                <span className="text-[10px] text-gray-400 truncate hidden md:inline">{file.fileName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-4 text-center">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                                {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-4 text-right">
                                                            <div className="flex justify-end items-center gap-1">
                                                                <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 shadow-sm">
                                                                    <button
                                                                        onClick={() => updateAudioFileStatus(file.id, file.status === "Completed" ? "Pending" : "Completed")}
                                                                        title="Mark as Completed"
                                                                        className={`p-1.5 rounded transition-all ${file.status === "Completed" ? "bg-green-500 text-white shadow-sm" : "text-gray-400 hover:text-green-500 hover:bg-white"}`}
                                                                    >
                                                                        <FaCheck size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateAudioFileStatus(file.id, file.status === "Cancelled" ? "Pending" : "Cancelled")}
                                                                        title="Mark as Cancelled"
                                                                        className={`p-1.5 rounded transition-all ${file.status === "Cancelled" ? "bg-red-500 text-white shadow-sm" : "text-gray-400 hover:text-red-500 hover:bg-white"}`}
                                                                    >
                                                                        <FaTimes size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-4 text-right">
                                                            {!isPastDate() && (
                                                                <button
                                                                    onClick={() => deleteAudioFile(file.id)}
                                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                >
                                                                    <FaTrash size={14} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Compact Controls Card at the Bottom */}
                                {!isPastDate() && (
                                    <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-6 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            {/* Recorder Toggle */}
                                            <button
                                                onClick={isRecording ? stopRecording : startRecording}
                                                className={`flex items-center gap-3 px-6 py-2 rounded-xl text-sm font-bold transition-all transform hover:scale-105 shadow-md ${
                                                    isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white'
                                                }`}
                                            >
                                                <FaMicrophone size={18} />
                                                {isRecording ? `Stop (${formatTime(recordingTime)})` : "Record Voice"}
                                            </button>

                                            {/* Upload Trigger */}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="flex items-center gap-3 px-6 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold transition-all hover:bg-indigo-50 shadow-sm"
                                            >
                                                <FaCloudUploadAlt size={20} />
                                                {isUploading ? "Uploading..." : "Upload Audio"}
                                            </button>
                                            <input ref={fileInputRef} type="file" className="hidden" accept="audio/*" multiple onChange={handleFileUpload} />
                                        </div>
                                        
                                        <div className="hidden lg:flex flex-col text-right">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">New Task Mode</p>
                                            <p className="text-xs text-indigo-500 italic">Record voice to add a new task</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Save Button Footer */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                        <p className="text-xs text-gray-400 italic flex items-center gap-2">
                            Data is stored securely in the database per day.
                            {lastSaved && <span className="text-indigo-400 font-bold not-italic ml-2 animate-pulse">● Last saved at {lastSaved}</span>}
                        </p>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-md transition-all ${isSaving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5"
                                }`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    Save to Database
                                </>
                            )}
                        </button>
                    </div>


                    {/* Admin Dashboard Section */}
                    {isAdmin && (
                        <div className="mt-8 border-t border-gray-200 pt-8 pb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FaEdit className="text-indigo-600" />
                                Subordinate Discussions
                            </h2>


                            {allEmployeesData.length === 0 ? (
                                <p className="text-gray-500 italic text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No subordinate data found for today.
                                </p>
                            ) : (
                                <div className="space-y-6">
                                    {allEmployeesData.map(emp => {
                                        const empDate = empFilterDates[emp.employeeId] || selectedDate;
                                        const displayDate = new Date(empDate).toLocaleDateString('en-US', {
                                            weekday: 'short', month: 'short', day: 'numeric'
                                        });

                                        return (
                                            <div key={emp.employeeId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                                {/* Employee Header */}
                                                <div className="p-4 bg-indigo-50/50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 text-lg">{emp.employeeName}</h3>
                                                        <p className="text-xs text-indigo-600 font-semibold">{emp.department} • {emp.role} • ID: {emp.displayId || emp.employeeId}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                                        <div
                                                            className="relative flex items-center px-2 py-1 cursor-pointer hover:bg-gray-50 rounded transition-colors group"
                                                            onClick={() => document.getElementById(`adminDatePicker-${emp.employeeId}`).showPicker()}
                                                        >
                                                            <FaCalendarAlt className="text-indigo-400 text-xs" />
                                                            <span className="text-[11px] font-bold text-gray-600 pl-2 whitespace-nowrap">
                                                                {displayDate}
                                                            </span>
                                                            <input
                                                                id={`adminDatePicker-${emp.employeeId}`}
                                                                type="date"
                                                                value={empDate}
                                                                onChange={(e) => {
                                                                    if (!e.target.value) return;
                                                                    setEmpFilterDates(prev => ({ ...prev, [emp.employeeId]: e.target.value }));
                                                                }}
                                                                className="absolute invisible w-0 h-0"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => fetchSingleEmployeeForAdmin(emp.employeeId, empDate)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                                                        >
                                                            Go
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                                    {/* Paragraph Section */}
                                                    <div className="p-4 bg-gray-50/30">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <FaEdit /> Notes
                                                        </h4>
                                                        {emp.notes ? (
                                                            <div className="bg-white rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 shadow-sm leading-relaxed">
                                                                {emp.notes}
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center">
                                                                <p className="text-xs text-gray-400 italic">No notes created.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Audio Section */}
                                                    <div className="p-4 bg-gray-50/10">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                                                            <span className="flex items-center gap-2"><FaVolumeUp /> Voice Tasks</span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                                                {emp.audioFiles?.length || 0} Files
                                                            </span>
                                                        </h4>
                                                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                                                            {emp.audioFiles && emp.audioFiles.length > 0 ? (
                                                                <table className="w-full border-collapse text-[11px]">
                                                                    <tbody>
                                                                        {emp.audioFiles.map((file, idx) => (
                                                                            <tr key={file.id} className={`border-b border-gray-100 ${file.status === 'Completed' ? 'bg-green-50' : file.status === 'Cancelled' ? 'bg-red-50' : 'bg-white'}`}>
                                                                                <td className="py-1 px-1 text-gray-400 font-mono">{idx + 1}</td>
                                                                                <td className="py-1 px-1">
                                                                                    <audio controls className="h-6 w-32 scale-75 -ml-4">
                                                                                        <source src={file.fileUrl} type={file.fileType} />
                                                                                    </audio>
                                                                                </td>
                                                                                <td className="py-1 px-1 text-right">
                                                                                    <div className="flex justify-end items-center gap-0.5">
                                                                                        <button
                                                                                            onClick={() => updateAdminAudioFileStatus(emp.employeeId, file.id, file.status === "Completed" ? "Pending" : "Completed", empDate)}
                                                                                            className={`p-1 rounded ${file.status === "Completed" ? "bg-green-500 text-white" : "text-gray-300 hover:text-green-500"}`}
                                                                                        >
                                                                                            <FaCheck size={10} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => updateAdminAudioFileStatus(emp.employeeId, file.id, file.status === "Cancelled" ? "Pending" : "Cancelled", empDate)}
                                                                                            className={`p-1 rounded ${file.status === "Cancelled" ? "bg-red-500 text-white" : "text-gray-300 hover:text-red-500"}`}
                                                                                        >
                                                                                            <FaTimes size={10} />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div className="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center">
                                                                    <p className="text-xs text-gray-400 italic">No audio recorded.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Checklist Section (View Only) */}
                                                    <div className="p-4 bg-white">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                                                            <span className="flex items-center gap-2"><FaTasks /> Task Checklist</span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                                                {emp.checklist?.length || 0} Items
                                                            </span>
                                                        </h4>
                                                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                            {(emp.checklist && emp.checklist.length > 0 ? emp.checklist : []).map((task, idx) => (
                                                                <div 
                                                                    key={task.id} 
                                                                    className="p-2 border-b border-gray-50 bg-white"
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        {/* Read-Only Status Indicator */}
                                                                        <div className="flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
                                                                            {task.status === 'Completed' && <FaCheck className="text-green-500 text-sm" />}
                                                                            {task.status === 'Cancelled' && <FaTimes className="text-red-500 text-sm" />}
                                                                            {(!task.status || task.status === 'Pending') && (
                                                                                <div className="w-4 h-4 border border-gray-300 rounded-sm" />
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="flex-1">
                                                                            <p className={`text-[11px] font-medium ${
                                                                                task.status === 'Completed' ? 'text-gray-400 line-through' : 
                                                                                task.status === 'Cancelled' ? 'text-red-400 line-through' : 
                                                                                'text-gray-700'
                                                                            }`}>
                                                                                {task.text}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!emp.checklist || emp.checklist.length === 0 || emp.checklist.every(t => !t.text)) && (
                                                                <div className="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center">
                                                                    <p className="text-xs text-gray-400 italic">No tasks added.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default DiscussionNotepad;
