import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/config";
import Sidebar from "../components/Sidebar";
import { v4 as uuidv4 } from "uuid";
import { FaCloudUploadAlt, FaMicrophone, FaStop, FaTimes, FaPlus, FaChevronDown } from "react-icons/fa";

const CustomDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper to extract value since options can be objects or strings
    const getOptionValue = (opt) => (valueKey ? opt[valueKey] : opt);
    const getOptionLabel = (opt) => (displayKey ? opt[displayKey] : opt);

    const selectedOption = options.find(opt => getOptionValue(opt) === value);
    const displayValue = selectedOption ? getOptionLabel(selectedOption) : placeholder;

    return (
        <div className={`relative w-full ${className || ""}`} ref={dropdownRef}>
            <div
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white flex justify-between items-center cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={!value ? "text-gray-400" : "text-gray-800"}>
                    {displayValue}
                </span>
                <FaChevronDown className={`text-gray-500 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                    {options.length > 0 ? (
                        options.map((opt, idx) => (
                            <div
                                key={idx}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm border-b last:border-none border-gray-100"
                                onClick={() => {
                                    onChange(getOptionValue(opt));
                                    setIsOpen(false);
                                }}
                            >
                                {getOptionLabel(opt)}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-gray-400 text-sm">No options available</div>
                    )}
                </div>
            )}
        </div>
    );
};

const TaskNode = ({ task, path, onChange, onDelete, level, employees }) => {
    const handleAddSubtask = () => {
        const newTask = {
            id: uuidv4(),
            title: "",
            assignee: "",
            subtasks: []
        };
        onChange(path, { ...task, subtasks: [...task.subtasks, newTask] });
    };

    const handleUpdate = (field, value) => {
        onChange(path, { ...task, [field]: value });
    };

    const handleDeleteSubtask = (index) => {
        const newSubtasks = task.subtasks.filter((_, i) => i !== index);
        onChange(path, { ...task, subtasks: newSubtasks });
    };

    return (
        <div
            className={`
                bg-white border rounded-xl p-3 md:p-4 mb-3 transition-all duration-300
                ${level === 0 ? "border-gray-200 shadow-sm" : "border-gray-100 mt-3 shadow-sm"}
            `}
        >
            <div className="flex flex-col gap-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${level === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                            {level === 0 ? "M" : level}
                        </span>
                        <h3 className="text-sm font-bold text-gray-800">
                            {level === 0 ? "Main Task" : `Subtask`}
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleAddSubtask}
                            title="Add Subtask"
                            className="text-xs flex items-center gap-1 px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                            <FaPlus /> Add Sub
                        </button>
                        {level > 0 && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                title="Remove Subtask"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                </div>

                {/* Input Fields */}
                <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Task Title</label>
                        <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleUpdate('title', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                            placeholder={level === 0 ? "e.g., Build Login Page" : "e.g., Create API Endpoint"}
                            required
                        />
                    </div>

                    <div className="space-y-1 overflow-hidden">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Assign To</label>
                        <div className="w-full flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                            {employees.map(emp => (
                                <button
                                    key={emp._id}
                                    type="button"
                                    onClick={() => handleUpdate('assignee', emp._id)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${task.assignee === emp._id
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    {emp.name}
                                </button>
                            ))}
                            {employees.length === 0 && (
                                <span className="text-xs text-gray-400 italic px-2">No employees found...</span>
                            )}
                        </div>
                    </div>

                    {/* Universal Description Field */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                        <textarea
                            rows={level === 0 ? 2 : 1}
                            value={task.description || ""}
                            onChange={(e) => handleUpdate('description', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none scrollbar-hide resize-y max-h-32"
                            placeholder="Task details and requirements..."
                        ></textarea>
                    </div>
                </div>

                {task.subtasks.length > 0 && (
                    <div className="ml-2 md:ml-4 mt-3 pl-3 md:pl-4 border-l-2 border-solid border-gray-200 flex flex-col relative gap-1">
                        {task.subtasks.map((subtask, index) => (
                            <TaskNode
                                key={subtask.id}
                                task={subtask}
                                level={level + 1}
                                path={[...path, 'subtasks', index]}
                                onChange={onChange}
                                onDelete={() => handleDeleteSubtask(index)}
                                employees={employees}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const GroupTaskAssignment = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- State ---
    const [taskTree, setTaskTree] = useState({
        id: uuidv4(),
        title: "",
        description: "",
        assignee: "",
        subtasks: []
    });

    const [formData, setFormData] = useState({
        projectName: "",
        priority: "Medium",
        startDate: "", // "YYYY-MM-DD"
        startTime: "", // "HH:MM"
        deadline: "", // "YYYY-MM-DD"
        department: [], // Changed to Array for Multi-select
        teamLead: "", // Selected Team Lead ID
        projectLead: "", // Selected Project Lead ID

        documents: null,
        audioFile: null
    });

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [options, setOptions] = useState({ department: [] }); // For Department Dropdown
    const [departments, setDepartments] = useState([]); // List of department names
    const [teamLeads, setTeamLeads] = useState([]);
    const [teams, setTeams] = useState([]); // If Teams exist
    const [projectLeads, setProjectLeads] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const fileInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        // Auto-fill Date and Time
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setFormData(prev => ({ ...prev, startDate: dateStr, startTime: timeStr }));

        // Fetch Employees
        const fetchEmployees = async () => {
            if (!navigator.onLine) {
                const cached = localStorage.getItem('cachedAssignmentEmployees');
                if (cached) setEmployees(JSON.parse(cached));
                return;
            }
            try {
                const res = await fetch(`${API_URL}/employee/all`);
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                    localStorage.setItem('cachedAssignmentEmployees', JSON.stringify(data));
                } else {
                    const cached = localStorage.getItem('cachedAssignmentEmployees');
                    if (cached) setEmployees(JSON.parse(cached));
                }
            } catch (err) {
                console.error("Failed to fetch employees", err);
                const cached = localStorage.getItem('cachedAssignmentEmployees');
                if (cached) setEmployees(JSON.parse(cached));
            }
        };
        fetchEmployees();

        // Fetch Options for Departments
        const fetchOptions = async () => {
            if (!navigator.onLine) {
                const cached = localStorage.getItem('cachedAssignmentOptions');
                if (cached) {
                    const data = JSON.parse(cached);
                    setOptions(data);
                    if (data.department) setDepartments(data.department.map(d => d.value));
                }
                return;
            }
            try {
                const res = await fetch(`${API_URL}/options/all`);
                if (res.ok) {
                    const data = await res.json();
                    setOptions(data);
                    // Extract department values for the dropdown
                    if (data.department) {
                        setDepartments(data.department.map(d => d.value));
                    }
                    localStorage.setItem('cachedAssignmentOptions', JSON.stringify(data));
                } else {
                    const cached = localStorage.getItem('cachedAssignmentOptions');
                    if (cached) {
                        const data = JSON.parse(cached);
                        setOptions(data);
                        if (data.department) setDepartments(data.department.map(d => d.value));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch options", err);
                const cached = localStorage.getItem('cachedAssignmentOptions');
                if (cached) {
                    const data = JSON.parse(cached);
                    setOptions(data);
                    if (data.department) setDepartments(data.department.map(d => d.value));
                }
            }
        };
        fetchOptions();
    }, []);

    // Filter Leads based on selected Department(s)
    useEffect(() => {
        if (formData.department.length > 0 && employees.length > 0) {
            // Filter employees belonging to ANY of the selected departments
            const deptMembers = employees.filter(emp =>
                emp.role && emp.role.some(r => formData.department.includes(r))
            );

            // Team Leads: Show only users with "Lead" in their designation (Team Lead, Tech Lead, etc.)
            const tLeads = deptMembers.filter(emp =>
                (emp.designation || "").toLowerCase().includes("lead")
            );

            // User requirement: "Project Leads dropdown should show all the members from that department"
            const pLeads = deptMembers;

            setTeamLeads(tLeads);
            setProjectLeads(pLeads);

            // Auto-select Team Lead if available (take the first one)
            if (tLeads.length > 0) {
                setFormData(prev => ({ ...prev, teamLead: tLeads[0]._id }));
            } else {
                setFormData(prev => ({ ...prev, teamLead: "" }));
            }
        } else {
            setTeamLeads([]);
            setProjectLeads([]);
        }
    }, [formData.department, employees]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDropdownChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDepartmentToggle = (dept) => {
        setFormData(prev => {
            const current = prev.department;
            const updated = current.includes(dept)
                ? current.filter(d => d !== dept)
                : [...current, dept];
            return { ...prev, department: updated };
        });
    };

    const handleProjectLeadToggle = (leadId) => {
        setFormData(prev => {
            const current = Array.isArray(prev.projectLead) ? prev.projectLead : [];
            const updated = current.includes(leadId)
                ? current.filter(id => id !== leadId)
                : [...current, leadId];
            return { ...prev, projectLead: updated };
        });
    };




    const updateNodeAtPath = (tree, path, newValue) => {
        if (path.length === 0) return newValue;
        const newTree = { ...tree };
        let current = newTree;
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = Array.isArray(current[path[i]])
                ? [...current[path[i]]]
                : { ...current[path[i]] };
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newValue;
        return newTree;
    };

    const handleTaskChange = (path, newValue) => {
        setTaskTree(updateNodeAtPath(taskTree, path, newValue));
    };

    // File Handlers
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFormData(prev => ({ ...prev, documents: e.target.files[0] }));
        }
    };
    const handleAudioUpload = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({ ...prev, audioFile: file }));
            setAudioUrl(URL.createObjectURL(file));
        }
    };

    // Audio Recorder
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks = [];
            mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                const file = new File([blob], "recording.webm", { type: "audio/webm" });
                setFormData(prev => ({ ...prev, audioFile: file }));
                setAudioUrl(URL.createObjectURL(blob));
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.projectName || !taskTree.title) {
            alert("Project Name and Main Task Title are required!");
            return;
        }

        // We will send the nested assignment data inside the payload.
        // We override old assigning mechanism with tree mechanism:
        // By setting assignType="GroupHierarchy" (a new flag the backend can use to identify)
        // And passing `hierarchyData: JSON.stringify(taskTree)` 
        // Or if backend expects it differently, we pass the tree.

        // Convert File to Base64
        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    base64: reader.result
                });
                reader.onerror = error => reject(error);
            });
        };

        // Offline Handling
        if (!navigator.onLine) {
            try {
                setIsSubmitting(true);

                // Prepare offline payload
                const offlinePayload = {
                    ...formData,
                    offlineCreatedAt: new Date().toISOString(), // Original timestamp
                    assignedBy: null
                };

                // Add Current User ID
                const userStr = localStorage.getItem("user");
                if (userStr) {
                    const user = JSON.parse(userStr);
                    offlinePayload.assignedBy = user._id;
                }

                // Handle Files
                if (formData.documents instanceof File) {
                    offlinePayload.documentsData = await fileToBase64(formData.documents);
                    offlinePayload.documents = null; // Don't try to stringify File
                }
                if (formData.audioFile instanceof File || formData.audioFile instanceof Blob) {
                    // Blobs don't always have a name, so provide a default
                    const fileObj = formData.audioFile instanceof File ? formData.audioFile : new File([formData.audioFile], "recording.webm", { type: formData.audioFile.type });
                    offlinePayload.audioFileData = await fileToBase64(fileObj);
                    offlinePayload.audioFile = null;
                }

                // Add Hierarchy Data
                offlinePayload.assignType = "GroupHierarchy";
                offlinePayload.taskTree = taskTree; // Stored as is for offline

                // Save to Local Storage
                const existingOffline = JSON.parse(localStorage.getItem('offlineAssignments')) || [];
                existingOffline.push(offlinePayload);
                localStorage.setItem('offlineAssignments', JSON.stringify(existingOffline));

                // Dispatch global event for immediate local UI update
                window.dispatchEvent(new Event('offlineAssignmentAdded'));

                setShowSuccessModal(true);

                // Reset Form (keep date/time)
                setTaskTree({
                    id: uuidv4(),
                    title: "",
                    description: "",
                    assignee: "",
                    subtasks: []
                });
                setFormData(prev => ({
                    projectName: "",
                    priority: "Medium",
                    startDate: new Date().toISOString().split("T")[0],
                    startTime: new Date().toTimeString().slice(0, 5),
                    deadline: "",
                    department: [],
                    teamLead: "",
                    projectLead: "",
                    documents: null,
                    audioFile: null
                }));
                setAudioUrl(null);
                setAudioBlob(null);

            } catch (error) {
                console.error("Error saving offline assignment:", error);
                alert("Failed to save assignment offline.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // --- ONLINE FLOW ---

        // Use FormData API for file uploads
        const payload = new FormData();

        // Get Current User ID for assignedBy
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            payload.append("assignedBy", user.id || user._id); // Assuming Admin might have .id or ._id
        }

        Object.keys(formData).forEach(key => {
            if (key === 'roles' || key === 'assignee' || key === 'department' || key === 'projectLead') {
                // explicit handling for assignee based on type?
                // If assignType is overall, assignee is empty.
                const val = (key === 'assignee' && formData.assignType === 'Overall') ? [] : formData[key];
                payload.append(key, JSON.stringify(val));
            } else if (key === 'assignType' || key === 'taskType') {
                // Skip these, they are manually appended below
            } else if (formData[key] !== null && formData[key] !== undefined) { // Check undefined too
                payload.append(key, formData[key]);
            }
        });

        // Append the new hierarchical payload fields mimicking standard format
        payload.append('assignType', 'GroupHierarchy');
        payload.append('taskType', 'Group Task');
        payload.append('taskTitle', taskTree.title);
        payload.append('description', taskTree.description || "");
        payload.append('taskTree', JSON.stringify(taskTree));

        try {
            setIsSubmitting(true);
            const res = await fetch(`${API_URL}/tasks`, {
                method: "POST",
                body: payload,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to create task");
            }

            // Show Success Modal instead of Alert
            setShowSuccessModal(true);

            // Reset Form (keep date/time)
            setTaskTree({
                id: uuidv4(),
                title: "",
                description: "",
                assignee: "",
                subtasks: []
            });
            setFormData(prev => ({
                projectName: "",
                priority: "Medium",
                startDate: new Date().toISOString().split("T")[0],
                startTime: new Date().toTimeString().slice(0, 5),
                deadline: "",
                department: [],
                teamLead: "",
                projectLead: "",
                documents: null,
                audioFile: null
            }));
            setAudioUrl(null);
            setAudioBlob(null);

        } catch (error) {
            console.error(error);
            alert(error.message || "Error submitting task");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success Modal Component
    const SuccessModal = ({ isOpen, onClose }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full text-center transform transition-all scale-100">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Task Created!</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        The task has been successfully assigned and notifications sent.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    const filteredEmployees = formData.department.length > 0
        ? employees.filter(emp => emp.role && emp.role.some(r => formData.department.includes(r)))
        : employees;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans relative">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        <Sidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {!navigator.onLine && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 absolute top-0 left-0 right-0 z-50 shadow-md animate-pulse">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 font-semibold">
                                    Offline Mode: You are currently offline. Task assignments will be saved locally and synchronized when you reconnect.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Header */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">Task Manager</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-2 rounded hover:bg-gray-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </header>

                <main className="flex-1 p-4 sm:p-6 overflow-y-auto w-full max-w-full overflow-x-hidden">
                    <div className="w-full max-w-full lg:max-w-5xl mx-auto bg-white rounded-[24px] shadow-sm ring-1 ring-gray-200 overflow-hidden">
                        <div className="p-8 sm:p-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-100 pb-6 gap-4">
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Create New Group Task</h2>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/assign-task')}
                                        className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-indigo-600 hover:bg-white transition-colors"
                                    >
                                        Create New Individual Task
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-indigo-600 text-white"
                                    >
                                        Create New Group Task
                                    </button>
                                </div>
                            </div>

                            <form className="space-y-10" onSubmit={handleSubmit}>
                                {/* Basic Info Section */}
                                <div className="space-y-6">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 mb-2 tracking-wide">Project Name</label>
                                            <input type="text" name="projectName" value={formData.projectName} onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition bg-gray-50 hover:bg-white focus:bg-white shadow-sm" placeholder="e.g. Website Redesign" required />
                                        </div>
                                    </div>

                                    {/* New Hierarchy Fields - Chip Selection */}
                                    <div className="space-y-6">
                                        {/* Department Column */}
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Related Departments</label>
                                            <div className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white transition h-auto max-h-64 overflow-y-auto scrollbar-hide shadow-sm">
                                                <div className="flex flex-wrap gap-2">
                                                    {departments.length > 0 ? (
                                                        departments.map((dept) => (
                                                            <button
                                                                key={dept}
                                                                type="button"
                                                                onClick={() => handleDepartmentToggle(dept)}
                                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${formData.department.includes(dept)
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                                    }`}
                                                            >
                                                                {dept}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-400 text-sm italic">Loading departments...</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Leads Column */}
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Team Lead</label>
                                            <div className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white transition h-auto max-h-64 overflow-y-auto scrollbar-hide shadow-sm">
                                                <div className="flex flex-wrap gap-2">
                                                    {teamLeads.length > 0 ? (
                                                        teamLeads.map((lead) => (
                                                            <div
                                                                key={lead._id}
                                                                className="px-4 py-2 rounded-full text-sm font-medium border bg-gray-50 text-gray-700 border-gray-200 cursor-default shadow-sm"
                                                            >
                                                                {lead.name}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-400 text-sm italic">
                                                            {formData.department.length > 0 ? "No Team Leads found" : "Select a department first"}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Project Leads (All Members) Column */}
                                        <div className="flex flex-col">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Project Leads</label>
                                            <div className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white transition h-auto max-h-64 overflow-y-auto scrollbar-hide shadow-sm">
                                                <div className="flex flex-wrap gap-2">
                                                    {projectLeads.length > 0 ? (
                                                        projectLeads.map((lead) => (
                                                            <button
                                                                key={lead._id}
                                                                type="button"
                                                                onClick={() => handleProjectLeadToggle(lead._id)}
                                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${formData.projectLead.includes(lead._id)
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                                    }`}
                                                            >
                                                                {lead.name}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-400 text-sm italic">
                                                            {formData.department.length > 0 ? "No members found" : "Select a department first"}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Task Hierarchy UI */}
                                    <div className="pt-6 border-t border-gray-100 mt-6">
                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-gray-800 mb-1">Task Breakdown</h3>
                                            <p className="text-sm text-gray-500">Construct the main task and organize nested subtasks.</p>
                                        </div>

                                        <TaskNode
                                            task={taskTree}
                                            path={[]}
                                            onChange={handleTaskChange}
                                            onDelete={() => { }} // Main task cannot be deleted
                                            level={0}
                                            employees={filteredEmployees}
                                        />
                                    </div>
                                </div>

                                {/* Priority & Date Section */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-6 border-t border-gray-100 mt-8">
                                    <div className="w-full">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                            {["Low", "Medium", "High"].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                                    className={`flex-1 py-2.5 rounded-xl font-medium border transition-all duration-200 ${formData.priority === p
                                                        ? p === "High" ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                                                            : p === "Medium" ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                                                                : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date (Auto)</label>
                                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none" readOnly />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time (Auto)</label>
                                        <input type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none" readOnly />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date (Optional)</label>
                                        <input type="date" name="deadline" value={formData.deadline} onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition bg-white hover:bg-gray-50 focus:bg-white shadow-sm" />
                                    </div>

                                </div>

                                {/* Attachments Section */}
                                <div className="grid grid-cols-1 gap-8 pt-6 border-t border-gray-100">
                                    {/* Document Upload */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Documents</label>
                                        <div onClick={() => fileInputRef.current.click()}
                                            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer h-40">
                                            {formData.documents ? (
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-gray-800">{formData.documents.name}</p>
                                                    <p className="text-xs text-gray-500">{(formData.documents.size / 1024).toFixed(1)} KB</p>
                                                    <button onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, documents: null })); }} className="mt-2 text-red-500 hover:text-red-700 text-xs underline">Remove</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <FaCloudUploadAlt className="w-10 h-10 text-gray-400 mb-2" />
                                                    <span className="text-sm text-gray-600">Click to upload files</span>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    </div>

                                    {/* Audio Recording/Upload */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Audio Instructions</label>
                                        <div className="border border-gray-200 rounded-xl p-4 bg-white h-40 flex flex-col justify-center items-center relative">
                                            {audioUrl ? (
                                                <div className="w-full flex flex-col items-center">
                                                    <audio controls src={audioUrl} className="w-full mb-2 h-10" />
                                                    <button onClick={() => { setAudioUrl(null); setFormData(prev => ({ ...prev, audioFile: null })); }} className="text-xs text-red-500 hover:text-red-700 underline">Delete Audio</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-4">
                                                    <button type="button" onClick={isRecording ? stopRecording : startRecording}
                                                        className={`p-4 rounded-full transition shadow-lg ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                                        {isRecording ? <FaStop size={20} /> : <FaMicrophone size={20} />}
                                                    </button>
                                                    <button type="button" onClick={() => audioInputRef.current.click()}
                                                        className="p-4 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition shadow-sm" title="Upload Audio File">
                                                        <FaCloudUploadAlt size={20} />
                                                    </button>
                                                </div>
                                            )}
                                            {!audioUrl && <p className="mt-3 text-xs text-gray-500">{isRecording ? "Recording..." : "Record or Upload Audio"}</p>}
                                        </div>
                                        <input type="file" accept="audio/*" ref={audioInputRef} onChange={handleAudioUpload} className="hidden" />
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end pt-6 border-t">
                                    <button type="button" onClick={() => setFormData({ ...formData, projectName: "", taskTitle: "", description: "" })} className="mr-4 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition">Cancel</button>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.projectName || !taskTree.title || formData.department.length === 0}
                                        className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition transform ${(isSubmitting || !formData.projectName || !taskTree.title || formData.department.length === 0)
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:translate-y-[-2px]'
                                            }`}
                                    >
                                        {isSubmitting ? "Creating..." : "Create Group Task"}
                                    </button>
                                </div>
                            </form>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default GroupTaskAssignment;
