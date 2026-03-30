import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../utils/config";
import Sidebar from "../components/Sidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { FaCloudUploadAlt, FaMicrophone, FaStop, FaTrash, FaCheckCircle, FaExclamationCircle, FaFileAlt, FaPaperclip, FaSearch, FaTimes, FaAngleDoubleUp, FaAngleUp, FaMinus, FaAngleDown, FaAngleDoubleDown } from "react-icons/fa";

import CustomDropdown from "../components/CustomDropdown";
import GroupTaskAssignment from "./GroupTaskAssignment";
import { syncPriorityToDate, syncDateToPriority } from "../utils/prioritySync";

const TaskAssignment = ({ isModal = false, onClose, onSuccess, onTabChange }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isStatusRestricted, setIsStatusRestricted] = useState(false);
    const [isRoleRestricted, setIsRoleRestricted] = useState(false);
    const [userDesignation, setUserDesignation] = useState("");
    const canAddOptions = true; // All authenticated users can add (private to themselves)

    // --- State ---
    const [formData, setFormData] = useState({
        projectName: "",
        taskTitle: "",
        description: "",
        taskType: "Individual Task",
        // workCategory: "", // Removed
        roles: [],
        assignType: "Single", // Single, Department, Project, Overall
        assignee: [], // Array of IDs or Names
        priority: syncDateToPriority(new Date().toISOString().split("T")[0]),
        startDate: "", // "YYYY-MM-DD"
        startTime: "", // "HH:MM"
        // taskLead: "", // Removed for Individual Tasks
        dueDate: "",
        documents: null,
        audioFile: null
    });

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [options, setOptions] = useState({ department: [] }); // For Department Dropdown
    const [departments, setDepartments] = useState([]);
    const [activeMediaTab, setActiveMediaTab] = useState("Description");
    const [assignSearchQuery, setAssignSearchQuery] = useState("");
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const [modalTab, setModalTab] = useState(() => {
        if (location.pathname.includes("group-task")) {
            return "Group Task";
        }
        return "Individual Task";
    });

    useEffect(() => {
        if (!isModal) {
            if (location.pathname.includes("group-task")) {
                setModalTab("Group Task");
            } else {
                setModalTab("Individual Task");
            }
        }
    }, [location.pathname, isModal]);

    const fileInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const assignDropdownRef = useRef(null);
    const assignInputRef = useRef(null);

    useEffect(() => {
        if (isModal && onTabChange) {
            onTabChange(modalTab);
        }
    }, [modalTab, isModal, onTabChange]);

    // --- Effects ---
    useEffect(() => {
        // Get User Role
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const usr = JSON.parse(storedUser);
                setUserRole(usr.role);
                setUserDesignation(usr.designation || "");
            } catch (e) { }
        }

        // Auto-fill Date and Time
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setFormData(prev => ({ ...prev, startDate: dateStr, startTime: timeStr, dueDate: dateStr }));

        // Close assign dropdown on click outside
        const handleClickOutside = (event) => {
            if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target)) {
                setShowAssignDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Prefill data if editing a task
    useEffect(() => {
        if (location.state && location.state.taskToEdit) {
            const task = location.state.taskToEdit;
            setIsEditing(true);

            // Need to process date strings properly
            let formattedStartDate = "";
            let formattedStartTime = "";
            if (task.startDate) {
                try {
                    const dateObj = new Date(task.startDate);
                    formattedStartDate = dateObj.toISOString().split("T")[0];
                    formattedStartTime = dateObj.toTimeString().slice(0, 5);
                } catch (e) { }
            }
            if (task.startTime) {
                formattedStartTime = task.startTime;
            }

            let formattedDueDate = "";
            if (task.dueDate) {
                try {
                    formattedDueDate = new Date(task.dueDate).toISOString().split("T")[0];
                } catch (e) { }
            }

            // Map task properties to formData structure
            setFormData({
                _id: task._id, // Keep ID for potential update logic
                projectName: task.projectName || "",
                taskTitle: task.taskTitle || "",
                description: task.description || "",
                taskType: task.taskType || "Individual Task",
                roles: Array.isArray(task.roles) ? task.roles : [],
                assignType: task.assignType || "Single",
                assignee: Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo.map(a => typeof a === 'object' ? a._id : a) : task.assignee || [],
                priority: task.priority || syncDateToPriority(task.dueDate || new Date().toISOString().split("T")[0]),
                startDate: formattedStartDate || "",
                startTime: formattedStartTime || "",
                // taskLead: typeof task.taskLead === 'object' ? task.taskLead?._id : (task.taskLead || ""), // Removed for Individual Tasks
                dueDate: formattedDueDate || "",
                documents: null,
                audioFile: null
            });

            // Check if status is Pending
            if (task.status && task.status !== "Pending") {
                setIsStatusRestricted(true);
            } else {
                setIsStatusRestricted(false);
            }

            // Check Role Restriction (Super Admin OR Creator)
            const storedUserStr = localStorage.getItem("user");
            let isCreator = false;
            let isSuperAdmin = false;
            if (storedUserStr) {
                try {
                    const usr = JSON.parse(storedUserStr);
                    const creatorId = typeof task.assignedBy === 'object' && task.assignedBy !== null ? task.assignedBy._id : task.assignedBy;
                    if (creatorId && usr._id === creatorId) isCreator = true;
                    if (usr.role === "Super Admin" || (Array.isArray(usr.role) && usr.role.includes("Super Admin"))) {
                        isSuperAdmin = true;
                    }
                } catch (e) { }
            }

            if (!isCreator && !isSuperAdmin) {
                setIsRoleRestricted(true);
            } else {
                setIsRoleRestricted(false);
            }

            // Clear state after reading so a page refresh doesn't trigger edit mode again if unintended
            window.history.replaceState({}, document.title)
        }
    }, [location.state]);


    // Fetch Employees
    useEffect(() => {
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
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/options/all`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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
                const cached = localStorage.getItem('cachedAssignmentOptions');
                if (cached) {
                    const data = JSON.parse(cached);
                    setOptions(data);
                    if (data.department) setDepartments(data.department.map(d => d.value));
                }
            }
        };
        fetchOptions();

        // Fetch Projects
        const fetchProjects = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_URL}/options?category=Project`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                }
            } catch (err) {
            }
        };
        fetchProjects();
    }, []);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDropdownChange = (name, value) => {
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === "priority") {
                newData.dueDate = syncPriorityToDate(value);
            }
            return newData;
        });
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




    // Assign To Handlers
    const handleAssignTypeChange = (type) => {
        setFormData(prev => ({ ...prev, assignType: type, assignee: [] }));
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
            alert("Could not access microphone. Please allow permissions.");
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAddProject = async (newProjectNameStr) => {
        if (!navigator.onLine) {
            alert("Cannot add project while offline.");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/options`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ category: "Project", value: newProjectNameStr })
            });
            const data = await res.json();
            if (res.ok) {
                setProjects(prev => [...prev, data]);
                setFormData(prev => ({ ...prev, projectName: data.value }));
            } else {
                alert(data.message || "Failed to add project");
            }
        } catch (err) {
            alert("Error adding project");
        }
    };

    const handleDeleteProject = async (option) => {
        if (!navigator.onLine) {
            alert("Cannot delete project while offline.");
            return;
        }
        if (!option._id) {
            alert("Cannot delete this project format.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete project: ${option.value}?`)) {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_URL}/options/${option._id}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    setProjects(prev => prev.filter(p => p._id !== option._id));
                    if (formData.projectName === option.value) {
                        setFormData(prev => ({ ...prev, projectName: "" }));
                    }
                } else {
                    const data = await res.json();
                    alert(data.message || "Failed to delete project");
                }
            } catch (err) {
                alert("Error deleting project");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isAssigneeValid = formData.assignType === "Overall" || (Array.isArray(formData.assignee) && formData.assignee.length > 0);

        // Strict Validation: Only Due Date, Documents, and Audio are optional
        if (!formData.projectName || !formData.taskTitle || !formData.description ||
            !formData.priority || !formData.startDate || !formData.startTime || !isAssigneeValid) {

            alert("Please fill all mandatory fields.");
            return;
        }


        // Ensure "Overall" has empty assignees (Backend handles this, but cleaner to send empty)
        let finalAssignee = formData.assignee;
        if (formData.assignType === "Overall") {
            finalAssignee = []; // Should be empty array, not just local var
        }

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

                // Save to Local Storage
                const existingOffline = JSON.parse(localStorage.getItem('offlineAssignments')) || [];
                existingOffline.push(offlinePayload);
                localStorage.setItem('offlineAssignments', JSON.stringify(existingOffline));

                // Dispatch global event for immediate local UI update
                window.dispatchEvent(new Event('offlineAssignmentAdded'));

                setShowSuccessModal(true);

                // Reset Form (keep date/time)
                setFormData(prev => ({
                    projectName: "",
                    taskTitle: "",
                    description: "",
                    taskType: "Individual Task",
                    roles: [],
                    assignType: "Single",
                    assignee: [],
                    priority: syncDateToPriority(new Date().toISOString().split("T")[0]),
                    startDate: new Date().toISOString().split("T")[0],
                    startTime: new Date().toTimeString().slice(0, 5),
                    // taskLead: "", // Removed for Individual Tasks
                    dueDate: "",
                    documents: null,
                    audioFile: null
                }));
                setAudioUrl(null);
                setAudioBlob(null);

            } catch (error) {
                alert("Failed to save assignment offline.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // --- ONLINE FLOW ---

        // Determine method based on whether we're editing or creating
        const isUpdate = !!formData._id && isEditing;
        const apiEndpoint = isUpdate ? `${API_URL}/tasks/${formData._id}` : `${API_URL}/tasks`;
        const apiMethod = isUpdate ? "PUT" : "POST";

        // Use FormData API for file uploads
        const payload = new FormData();

        // Get Current User ID for assignedBy
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            payload.append("assignedBy", user._id);
        }

        Object.keys(formData).forEach(key => {
            if (key === 'roles' || key === 'assignee') {
                // explicit handling for assignee based on type?
                // If assignType is overall, assignee is empty.
                const val = (key === 'assignee' && formData.assignType === 'Overall') ? [] : formData[key];
                payload.append(key, JSON.stringify(val));
            } else if (formData[key] !== null && formData[key] !== undefined) { // Check undefined too
                payload.append(key, formData[key]);
            }
        });

        try {
            setIsSubmitting(true);
            const res = await fetch(apiEndpoint, {
                method: apiMethod,
                body: payload,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to create task");
            }

            // Show Success Modal instead of Alert
            if (isModal && onSuccess) {
                onSuccess();
            } else {
                setShowSuccessModal(true);
            }

            // Reset Form (keep date/time)
            setFormData(prev => ({
                projectName: "",
                taskTitle: "",
                description: "",
                taskType: "Individual Task",
                // workCategory: "",
                roles: [],
                assignType: "Single",
                assignee: [],
                priority: syncDateToPriority(new Date().toISOString().split("T")[0]),
                startDate: new Date().toISOString().split("T")[0],
                startTime: new Date().toTimeString().slice(0, 5),
                department: [],
                // taskLead: "", // Removed for Individual Tasks
                projectLead: "",
                dueDate: "",
                documents: null,
                audioFile: null
            }));
            setAudioUrl(null);
            setAudioBlob(null);

        } catch (error) {
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

    const renderIndividualForm = () => (
        <form className="space-y-2" onSubmit={handleSubmit}>
            {/* Project Name */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800">Project Name</label>
                <CustomDropdown
                    options={projects}
                    value={formData.projectName}
                    onChange={(val) => handleDropdownChange("projectName", val)}
                    placeholder="Select Project"
                    searchable={true}
                    allowAdd={canAddOptions}
                    onAdd={handleAddProject}
                    onDelete={handleDeleteProject}
                    className="h-[50px]"
                />
            </div>

            {/* Task Title */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800">Task Title</label>
                <input type="text" name="taskTitle" value={formData.taskTitle} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition bg-gray-50/50 focus:bg-white text-sm text-gray-800 font-medium placeholder-gray-400 font-normal h-[50px]" placeholder="Enter task name..." required />
            </div>


            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800">Due Date</label>
                    <input type="date" name="dueDate" value={formData.dueDate || ""}
                        onChange={(e) => {
                            const newDate = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                dueDate: newDate,
                                priority: syncDateToPriority(newDate)
                            }));
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition bg-gray-50/50 focus:bg-white text-sm text-gray-800 font-medium h-[50px]" />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800">Priority</label>
                    <CustomDropdown
                        options={["Very High", "High", "Medium", "Low", "Very Low"].map(p => {
                            const configs = {
                                "Very High": { color: "text-rose-600", icon: <FaAngleDoubleUp /> },
                                "High": { color: "text-orange-600", icon: <FaAngleUp /> },
                                "Medium": { color: "text-amber-600", icon: <FaMinus /> },
                                "Low": { color: "text-blue-600", icon: <FaAngleDown /> },
                                "Very Low": { color: "text-slate-500", icon: <FaAngleDoubleDown /> }
                            };
                            const { color, icon } = configs[p];
                            return {
                                value: p,
                                label: p,
                                customLabel: (
                                    <div className={`flex items-center gap-2 ${color} font-bold text-[12px] uppercase tracking-wider py-0.5`}>
                                        <span className="text-xs">{icon}</span>
                                        {p}
                                    </div>
                                )
                            };
                        })}
                        value={formData.priority}
                        onChange={(val) => handleDropdownChange("priority", val)}
                        placeholder="Select Priority"
                        className="h-[50px]"
                    />
                </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800">Assign To</h3>
                    <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                        {[
                            { id: "Single", label: "Members" },
                            { id: "Department", label: "Team" },
                            { id: "Overall", label: "Everyone" }
                        ].map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => handleAssignTypeChange(type.id)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${formData.assignType === type.id
                                    ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
                {formData.assignType !== "Overall" && (
                    <div className="relative group" ref={assignDropdownRef}>
                        <div
                            className={`h-[50px] w-full p-2 pl-4 rounded-xl border transition-all duration-200 bg-white flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 cursor-pointer ${showAssignDropdown ? 'border-indigo-400 shadow-sm' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}
                            onMouseDown={(e) => {
                                if (e.button !== 0) return;
                                e.preventDefault();
                                setShowAssignDropdown(true);
                                if (assignInputRef.current) assignInputRef.current.focus();
                            }}
                            onClick={() => {
                                setShowAssignDropdown(true);
                                if (assignInputRef.current) assignInputRef.current.focus();
                            }}
                        >
                            <FaSearch className="text-gray-400 text-sm shrink-0" />
                            <div className="overflow-x-auto flex flex-nowrap gap-2 items-center scrollbar-hide py-1">
                                {(formData.assignee || []).map((val) => {
                                    const item = formData.assignType === "Single" ? employees.find(e => e._id === val) : { name: val };
                                    if (!item) return null;
                                    return (
                                        <div key={val} className="shrink-0 flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 shadow-sm">
                                            <span className="whitespace-nowrap">{item.name || item}</span>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, assignee: prev.assignee.filter(id => id !== val) })); }}>
                                                <FaTimes className="text-[10px]" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <input
                                ref={assignInputRef}
                                type="text"
                                value={assignSearchQuery}
                                onChange={(e) => { setAssignSearchQuery(e.target.value); setShowAssignDropdown(true); }}
                                onFocus={() => setShowAssignDropdown(true)}
                                placeholder={formData.assignee.length === 0 ? `Add ${formData.assignType === "Single" ? 'members' : 'teams'}...` : ""}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 font-medium pb-0.5 placeholder:text-gray-400 font-normal truncate"
                            />
                        </div>
                        {showAssignDropdown && (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-[60] max-h-[160px] overflow-y-auto custom-scrollbar">
                                {(formData.assignType === "Single" ? employees : departments)
                                    .filter(opt => {
                                        const label = formData.assignType === "Single" ? opt.name : opt;
                                        return label.toLowerCase().includes(assignSearchQuery.toLowerCase());
                                    })
                                    .map((opt) => {
                                        const val = formData.assignType === "Single" ? opt._id : opt;
                                        const isSelected = formData.assignee.includes(val);
                                        return (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => {
                                                        const exists = prev.assignee.includes(val);
                                                        return { ...prev, assignee: exists ? prev.assignee.filter(id => id !== val) : [...prev.assignee, val] };
                                                    });
                                                    setAssignSearchQuery("");
                                                }}
                                                className={`w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 ${isSelected ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                                            >
                                                {formData.assignType === "Single" ? (
                                                    <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                                                        <span className="shrink-0 font-semibold">{opt.name}</span>
                                                        <span className="shrink-0 text-gray-400">—</span>
                                                        <span className="truncate max-w-[180px] text-gray-500 text-xs">
                                                            {Array.isArray(opt.role) ? opt.role.join(", ") : (opt.role || "No Dept")}
                                                        </span>
                                                        <span className="shrink-0 text-gray-400">—</span>
                                                        <span className="shrink-0 font-mono text-xs text-indigo-600">{opt.employeeId}</span>
                                                    </div>
                                                ) : (
                                                    <span>{opt}</span>
                                                )}
                                                {isSelected && <FaCheckCircle className="text-indigo-500 text-sm ml-2 shrink-0" />}
                                            </button>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Media Tabs */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center border-b border-gray-100">
                    {[
                        { id: "Description", label: "Description", icon: FaFileAlt },
                        { id: "Attachments", label: "Attachments", icon: FaPaperclip },
                        { id: "Audio", label: "Audio", icon: FaMicrophone }
                    ].map((tab) => {
                        const isActive = activeMediaTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveMediaTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <tab.icon size={14} className={isActive ? 'text-indigo-500' : 'text-gray-300'} />
                                {tab.label}
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-indigo-600 rounded-full" />}
                            </button>
                        );
                    })}
                </div>

                <div className="min-h-[140px]">
                    {activeMediaTab === "Description" && (
                        <textarea
                            rows="4"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-indigo-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-purple-50/30 text-sm text-gray-800 font-medium"
                            placeholder="Describe the task details here..."
                            required
                        />
                    )}
                    {activeMediaTab === "Attachments" && (
                        <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center bg-indigo-50/20 hover:bg-indigo-50/40 transition-all cursor-pointer h-32">
                            {formData.documents ? (
                                <div className="text-center">
                                    <FaFileAlt size={20} className="text-indigo-600 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-gray-800 truncate max-w-[200px] mb-1">{formData.documents.name}</p>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, documents: null })); }} className="text-red-500 text-[10px] font-bold underline">Remove</button>
                                </div>
                            ) : (
                                <><FaCloudUploadAlt className="w-5 h-5 text-indigo-500 mb-2" /><span className="text-xs font-bold text-indigo-600">Upload Attachments</span></>
                            )}
                        </div>
                    )}
                    {activeMediaTab === "Audio" && (
                        <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/20 h-32 flex flex-col justify-center items-center">
                            {audioUrl ? (
                                <div className="w-full flex flex-col items-center">
                                    <audio src={audioUrl} controls className="w-full h-8 mb-3" />
                                    <button onClick={() => { setAudioUrl(null); setFormData(prev => ({ ...prev, audioFile: null })); }} className="text-xs font-bold text-red-500 underline flex items-center gap-1.5"><FaTrash size={10} /> Delete</button>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        {isRecording ? <FaStop size={20} /> : <FaMicrophone size={20} />}
                                    </button>
                                    <button type="button" onClick={() => audioInputRef.current.click()} className="w-14 h-14 bg-white text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-md"><FaCloudUploadAlt size={22} /></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg transition-all duration-300 text-sm ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 shadow-indigo-200"}`}
                >
                    {isSubmitting ? "Submitting..." : (isEditing ? "Update Task" : "Create Task")}
                </button>
            </div>
        </form>
    );



    return (
        <div className={`flex ${isModal ? 'h-full flex-col' : 'h-screen'} overflow-hidden bg-gray-50 font-sans relative`}>
            {/* Desktop Sidebar */}
            {!isModal && (
                userRole === "Super Admin" || (Array.isArray(userRole) && userRole.includes("Super Admin")) ? (
                    <Sidebar className="hidden md:flex" />
                ) : (
                    <EmployeeSidebar className="hidden md:flex" />
                )
            )}

            {/* Mobile Sidebar Overlay */}
            {!isModal && isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar container */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        {userRole === "Super Admin" || (Array.isArray(userRole) && userRole.includes("Super Admin")) ? (
                            <Sidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        ) : (
                            <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        )}
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
                {/* Modal Header */}
                {isModal && (
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Create Main Task</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all">
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Mobile Header */}
                {!isModal && (
                    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                        <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Task Manager</h1>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                    </header>
                )}

                <main className={`flex-1 ${isModal ? 'p-0' : 'p-4 sm:p-6'} overflow-y-auto flex justify-center custom-scrollbar`}>
                    <div className={`w-full ${isModal ? 'max-w-full shadow-none border-none' : 'max-w-[500px] shadow-2xl border border-gray-100'} bg-white rounded-2xl overflow-hidden h-fit`}>
                        <div className="p-8">
                            {/* Top Level Tabs */}
                            <div className="flex border-b border-gray-100 mb-8 sticky top-0 bg-white z-10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isModal) {
                                            setModalTab("Individual Task");
                                            if (onTabChange) onTabChange("Individual Task");
                                        } else {
                                            navigate(userRole === "Employee" ? "/employee/assign-task" : "/assign-task");
                                        }
                                    }}
                                    className={`flex-1 py-4 text-sm font-bold transition-all ${modalTab === "Individual Task" ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Individual Task
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isModal) {
                                            setModalTab("Group Task");
                                            if (onTabChange) onTabChange("Group Task");
                                        } else {
                                            navigate(userRole === "Employee" ? "/employee/assign-group-task" : "/assign-group-task");
                                        }
                                    }}
                                    className={`flex-1 py-4 text-sm font-bold transition-all ${modalTab === "Group Task" ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Group Task
                                </button>
                            </div>

                            {modalTab === "Individual Task" ? (
                                renderIndividualForm()
                            ) : (
                                <GroupTaskAssignment isModal={true} onClose={onClose} onSuccess={onSuccess} />
                            )}

                        </div>
                    </div>


                </main>

                {/* Hidden File Inputs */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <input
                    type="file"
                    accept="audio/*"
                    ref={audioInputRef}
                    onChange={handleAudioUpload}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default TaskAssignment;
