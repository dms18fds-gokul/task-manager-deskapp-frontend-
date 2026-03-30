import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../utils/config";
import Sidebar from "../components/Sidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { v4 as uuidv4 } from "uuid";
import { FaCloudUploadAlt, FaMicrophone, FaStop, FaTimes, FaPlus, FaTrash, FaUser, FaUsers, FaGlobe, FaChevronDown } from "react-icons/fa";

import CustomDropdown from "../components/CustomDropdown";
import { syncPriorityToDate, syncDateToPriority } from "../utils/prioritySync";

const getEmployeeOptions = (employees) => employees.map(e => {
    const dept = Array.isArray(e.role) ? e.role.join(", ") : (e.role || "No Dept");
    const empId = e.employeeId || e.empId || e._id;
    return {
        value: e._id,
        label: `${e.name} – ${empId} – ${dept}`,
        customLabel: (
            <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-gray-800 shrink-0">{e.name}</span>
                <span className="text-gray-400 shrink-0">—</span>
                <span className="text-[11px] font-mono text-indigo-600 font-bold shrink-0">{empId}</span>
                <span className="text-gray-400 shrink-0">—</span>
                <span className="text-[11px] text-gray-500 truncate">{dept}</span>
            </div>
        )
    };
});

const TaskNode = ({ task, path, onChange, onDelete, level, employees, nodeNumber = "" }) => {
    // This component is kept for nested subtasks if still needed, 
    // but the main task title/desc/priority are now in the ProjectTaskBlock tabs.
    // For now, let's keep it but it might be integrated into the tabs.
    const [taskError, setTaskError] = useState("");

    const validateNode = (node) => {
        const hasNodeAssignees = Array.isArray(node.assignee) ? node.assignee.length > 0 : !!node.assignee;
        if (!node.title || !hasNodeAssignees || !node.description) return false;
        for (const child of node.subtasks || []) {
            if (!validateNode(child)) return false;
        }
        return true;
    };

    const handleAddSubtask = () => {
        if (!validateNode(task)) {
            setTaskError("Please fill Task Title, Assign To, and Description for this task and all its current subtasks before adding a new one.");
            return;
        }
        setTaskError("");
        const newTask = {
            id: uuidv4(),
            title: "",
            assignee: [],
            description: "",
            subtasks: []
        };
        onChange(path, { ...task, subtasks: [...task.subtasks, newTask] });
    };

    const handleUpdate = (field, value) => {
        if (taskError) setTaskError("");
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
                        <span className={`flex items-center justify-center min-w-[24px] px-1 h-6 rounded-full font-bold text-xs ${level === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                            {level === 0 ? "M" : nodeNumber || level}
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
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Subtask Title</label>
                        <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleUpdate('title', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                            placeholder="e.g., Create API Endpoint"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Assign To</label>
                        <CustomDropdown
                            options={getEmployeeOptions(employees)}
                            value={task.assignee}
                            onChange={(val) => handleUpdate('assignee', val)}
                            placeholder="Select Assignee"
                            multiple={true}
                            searchable={true}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                        <textarea
                            rows={1}
                            value={task.description || ""}
                            onChange={(e) => handleUpdate('description', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all outline-none scrollbar-hide resize-y max-h-32"
                            placeholder="Subtask details..."
                        ></textarea>
                    </div>
                </div>

                {taskError && (
                    <div className="text-red-500 text-xs mt-2 font-medium">
                        {taskError}
                    </div>
                )}

                {task.subtasks.length > 0 && (
                    <div className="ml-2 md:ml-4 mt-3 pl-3 md:pl-4 border-l-2 border-solid border-gray-200 flex flex-col relative gap-1">
                        {task.subtasks.map((subtask, index) => (
                            <TaskNode
                                key={subtask.id}
                                task={subtask}
                                level={level + 1}
                                nodeNumber={level === 0 ? `${index + 1}` : `${nodeNumber}.${index + 1}`}
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



const ProjectTaskBlock = ({
    form,
    index,
    updateForm,
    handleTaskChange,
    handleAddProject,
    handleDeleteProject,
    onRemove,
    showRemove,
    projects,
    departments,
    employees,
    activeRecordingId,
    startRecording,
    stopRecording,
    handleFileChange,
    handleAudioUpload,
    handleRemoveFile,
    handleRemoveAudio,
    canAddOptions,
    updateMemberTaskField
}) => {
    const fileInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const assignToDropdownRef = useRef(null);
    const [isLocalModeOpen, setIsLocalModeOpen] = useState(false);
    const modeDropdownRef = useRef(null);
    const priorityDropdownRef = useRef(null);
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);

    // Close local mode dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target)) {
                setIsLocalModeOpen(false);
            }
            if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
                setIsPriorityOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const selectedEmployees = employees.filter(emp =>
        (Array.isArray(form.selectedMembers) ? form.selectedMembers : []).includes(emp._id)
    );

    const employeeOptions = getEmployeeOptions(employees);

    const isRecording = activeRecordingId === `${form.id}:${form.activeMemberId}`;

    const handleAssignModeSelect = (mode) => {
        const newMemberTasks = {};
        let newActiveId = "";

        if (mode === "Everyone") {
            const id = "Everyone";
            newActiveId = id;
            newMemberTasks[id] = {
                title: "",
                description: "",
                deadline: form.deadline || new Date().toISOString().split("T")[0],
                priority: "Very High",
                activeTab: "Description",
                documents: null,
                audioFile: null,
                audioUrl: null,
                taskTree: {
                    id: uuidv4(),
                    title: "",
                    description: "",
                    assignee: ["Everyone"],
                    subtasks: []
                }
            };
        }

        updateForm(form.id, "assignMode", mode);
        updateForm(form.id, "selectedMembers", []);
        updateForm(form.id, "memberTasks", newMemberTasks);
        updateForm(form.id, "activeMemberId", newActiveId);

        setIsLocalModeOpen(false);
        setTimeout(() => {
            if (assignToDropdownRef.current && mode !== "Everyone") {
                assignToDropdownRef.current.focus();
            }
        }, 50);
    };

    const toggleMember = (memberId) => {
        const current = Array.isArray(form.selectedMembers) ? form.selectedMembers : [];
        if (form.assignMode === "Everyone") return;

        const isRemoving = current.includes(memberId);
        const updated = isRemoving
            ? current.filter(id => id !== memberId)
            : [...current, memberId];

        const newMemberTasks = { ...form.memberTasks };
        if (!isRemoving) {
            // Initialize new member task with defaults from the template or empty
            newMemberTasks[memberId] = {
                title: "",
                description: "",
                deadline: form.deadline || new Date().toISOString().split("T")[0],
                priority: "Very High",
                activeTab: "Description",
                documents: null,
                audioFile: null,
                audioUrl: null,
                taskTree: {
                    id: uuidv4(),
                    title: "",
                    description: "",
                    assignee: [memberId],
                    subtasks: []
                }
            };
        } else {
            delete newMemberTasks[memberId];
        }

        updateForm(form.id, "selectedMembers", updated);
        updateForm(form.id, "memberTasks", newMemberTasks);

        // Auto-set active member if we just added one and none is active
        if (!isRemoving && (!form.activeMemberId || !updated.includes(form.activeMemberId))) {
            updateForm(form.id, "activeMemberId", memberId);
        } else if (isRemoving && form.activeMemberId === memberId) {
            updateForm(form.id, "activeMemberId", updated.length > 0 ? updated[0] : "");
        }
    };

    const navbarOptions = (form.assignMode === "Team" ? departments : (form.assignMode === "Everyone" ? [] : employees.map(e => ({ _id: e._id, name: e.name }))))
        .filter(opt => {
            const id = typeof opt === 'string' ? opt : opt._id;
            return (Array.isArray(form.selectedMembers) ? form.selectedMembers : []).includes(id);
        });

    return (
        <div className={`space-y-6 ${index > 0 ? 'pt-10 border-t-2 border-gray-100 mt-8' : ''}`}>
            <div className="space-y-4">
                {/* Row for Project Name and Task Lead */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-bold text-gray-700">Project Name</label>
                            {showRemove && (
                                <button type="button" onClick={() => onRemove(form.id)} className="text-gray-400 hover:text-red-500 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                                    <FaTrash size={10} /> Remove Block
                                </button>
                            )}
                        </div>
                        <CustomDropdown
                            options={projects}
                            value={form.projectName}
                            onChange={(val) => updateForm(form.id, "projectName", val)}
                            placeholder="Select Project"
                            searchable={true}
                            allowAdd={true}
                            onAdd={(val) => handleAddProject(form.id, val)}
                            onDelete={handleDeleteProject}
                            className="shadow-sm h-[46px]"
                        />
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="block text-sm font-bold text-gray-700">Task Lead</label>
                        <CustomDropdown
                            options={employeeOptions}
                            value={form.taskLead}
                            onChange={(val) => updateForm(form.id, "taskLead", val)}
                            placeholder="Select Lead"
                            searchable={true}
                            className="shadow-sm h-[46px]"
                        />
                    </div>
                </div>

                {/* Combined Row for Assign To and Selected Members */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="block text-sm font-bold text-gray-700">Assign To</label>
                        <div className="flex w-full rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 overflow-visible shadow-sm transition-all h-[46px]">
                            {/* Mode Prefix Selector */}
                            <div className="relative shrink-0 border-r border-gray-200" ref={modeDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsLocalModeOpen(!isLocalModeOpen)}
                                    className="h-full px-4 flex items-center gap-2 hover:bg-white transition-colors text-indigo-600 rounded-l-xl font-bold text-sm"
                                >
                                    {form.assignMode === "Single" && <FaUser size={14} />}
                                    {form.assignMode === "Team" && <FaUsers size={16} />}
                                    {form.assignMode === "Everyone" && <FaGlobe size={14} />}
                                    <FaChevronDown size={10} className={`text-gray-400 transition-transform ${isLocalModeOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isLocalModeOpen && (
                                    <div className="absolute top-full left-0 z-[60] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 w-fit min-w-[50px]">
                                        <button type="button" onClick={() => handleAssignModeSelect("Single")} className="w-full px-4 py-3 text-center hover:bg-indigo-50 transition-colors" title="Single Employee">
                                            <FaUser className="text-gray-400 mx-auto" />
                                        </button>
                                        <button type="button" onClick={() => handleAssignModeSelect("Team")} className="w-full px-4 py-3 text-center hover:bg-indigo-50 transition-colors" title="Department">
                                            <FaUsers className="text-gray-400 mx-auto" />
                                        </button>
                                        <button type="button" onClick={() => handleAssignModeSelect("Everyone")} className="w-full px-4 py-3 text-center hover:bg-indigo-50 transition-colors" title="Everyone">
                                            <FaGlobe className="text-gray-400 mx-auto" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Selection Dropdown */}
                            <div className="flex-1 h-full px-4 flex items-center">
                                <CustomDropdown
                                    ref={assignToDropdownRef}
                                    options={form.assignMode === "Team" ? departments : employeeOptions}
                                    value={form.assignMode === "Everyone" ? "Everyone" : ""}
                                    onChange={(val) => {
                                        if (form.assignMode === "Everyone") return;
                                        toggleMember(val);
                                    }}
                                    placeholder={form.assignMode === "Single" ? "Select Employee..." : form.assignMode === "Team" ? "Select Department..." : "Everyone"}
                                    disabled={form.assignMode === "Everyone"}
                                    searchable={true}
                                    variant="bare"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                        <label className="block text-sm font-bold text-gray-700">Selected Members</label>
                        <div className="w-full px-4 border border-gray-200 bg-gray-50 rounded-xl flex flex-nowrap gap-2 h-[46px] items-center shadow-sm overflow-x-auto scrollbar-hide shrink-0">
                            {(Array.isArray(form.selectedMembers) ? form.selectedMembers : []).length === 0 && form.assignMode !== "Everyone" ? (
                                <span className="text-xs text-gray-400 italic">No one selected</span>
                            ) : form.assignMode === "Everyone" ? (
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-bold shadow-sm border border-indigo-100 flex items-center gap-2">
                                    <FaGlobe size={10} /> Everyone
                                </span>
                            ) : (
                                <>
                                    {selectedEmployees.map(emp => (
                                        <span key={emp._id} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-2 border border-indigo-100">
                                            <FaUser size={10} className="text-indigo-400" /> {emp.name}
                                            <button type="button" onClick={() => toggleMember(emp._id)} className="hover:text-red-500 font-bold ml-1 text-base">×</button>
                                        </span>
                                    ))}
                                    {form.assignMode === "Team" && (Array.isArray(form.selectedMembers) ? form.selectedMembers : []).map(dept => (
                                        <span key={dept} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-2 border border-indigo-100">
                                            <FaUsers size={10} className="text-indigo-400" /> {dept}
                                            <button type="button" onClick={() => toggleMember(dept)} className="hover:text-red-500 font-bold ml-1 text-base">×</button>
                                        </span>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>


                {/* Member Selection Navbar (Tabs) */}
                <div className="space-y-2">
                    <div className="w-full py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-6 min-w-max">
                            {form.assignMode === "Everyone" ? (
                                <button
                                    type="button"
                                    onClick={() => updateForm(form.id, "activeMemberId", "Everyone")}
                                    className={`pb-2 text-sm font-bold transition-all relative ${form.activeMemberId === "Everyone" ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {form.activeMemberId === "Everyone" && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                                        Everyone
                                    </div>
                                    {form.activeMemberId === "Everyone" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
                                </button>
                            ) : (
                                navbarOptions.map((opt) => {
                                    const id = typeof opt === 'string' ? opt : opt._id;
                                    const label = typeof opt === 'string' ? opt : opt.name;
                                    const isActive = form.activeMemberId === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => updateForm(form.id, "activeMemberId", id)}
                                            className={`pb-2 text-sm font-bold transition-all relative ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isActive && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                                                {label}
                                            </div>
                                            {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Individual Task Fields (Rendered only if a member is active) */}
                {form.activeMemberId && form.memberTasks[form.activeMemberId] && (() => {
                    const memberTask = form.memberTasks[form.activeMemberId];
                    return (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Task Title and Due Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">TASK TITLE</label>
                                    <input
                                        type="text"
                                        value={memberTask.title}
                                        onChange={(e) => updateMemberTaskField(form.id, form.activeMemberId, 'title', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                        placeholder="e.g., Initial Design Review"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">DUE DATE</label>
                                    <input
                                        type="date"
                                        value={memberTask.deadline}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            updateMemberTaskField(form.id, form.activeMemberId, "deadline", newDate);
                                            updateMemberTaskField(form.id, form.activeMemberId, "priority", syncDateToPriority(newDate));
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Detail Tabs */}
                            <div className="space-y-4">
                                <div className="flex border-b border-gray-100">
                                    {["Description", "Attachments", "Audio"].map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => updateMemberTaskField(form.id, form.activeMemberId, "activeTab", tab)}
                                            className={`px-6 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${memberTask.activeTab === tab ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                                        >
                                            {tab === "Description" && <FaUser size={12} />}
                                            {tab === "Attachments" && <FaCloudUploadAlt size={14} />}
                                            {tab === "Audio" && <FaMicrophone size={12} />}
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="min-h-[80px]">
                                    {memberTask.activeTab === "Description" && (
                                        <div className="relative group">
                                            <textarea
                                                value={memberTask.description}
                                                onChange={(e) => updateMemberTaskField(form.id, form.activeMemberId, 'description', e.target.value)}
                                                className="w-full p-4 pb-12 rounded-xl bg-gray-50 border border-gray-100 min-h-[100px] outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-gray-700"
                                                placeholder="Describe the task details here..."
                                            />
                                            <div className="absolute bottom-2 right-2" ref={priorityDropdownRef}>
                                                <div
                                                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                                                    className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm cursor-pointer hover:bg-white transition-colors"
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${memberTask.priority === 'Very High' ? 'bg-red-500' : memberTask.priority === 'High' ? 'bg-orange-500' : memberTask.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{memberTask.priority}</span>
                                                    <FaChevronDown className={`text-[8px] text-gray-400 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                {isPriorityOpen && (
                                                    <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-100 rounded-lg shadow-xl z-20 w-32 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200">
                                                        {["Very High", "High", "Medium", "Low", "Very Low"].map(p => (
                                                            <button
                                                                key={p}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateMemberTaskField(form.id, form.activeMemberId, "priority", p);
                                                                    updateMemberTaskField(form.id, form.activeMemberId, "deadline", syncPriorityToDate(p));
                                                                    setIsPriorityOpen(false);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-gray-700 transition-colors"
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {memberTask.activeTab === "Attachments" && (
                                        <div
                                            onClick={() => fileInputRef.current.click()}
                                            className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer min-h-[80px]"
                                        >
                                            {memberTask.documents ? (
                                                <div className="text-center">
                                                    <FaCloudUploadAlt className="w-8 h-8 text-indigo-500 mb-1 mx-auto" />
                                                    <p className="text-sm font-bold text-gray-800">{memberTask.documents.name}</p>
                                                    <p className="text-xs text-gray-500">{(memberTask.documents.size / 1024).toFixed(1)} KB</p>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(form.id, form.activeMemberId); }} className="mt-1 text-red-500 hover:text-red-700 text-xs font-bold underline">Remove</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <FaCloudUploadAlt className="w-6 h-6 text-gray-300" />
                                                    <span className="text-sm font-bold text-gray-400">Click to upload files</span>
                                                </div>
                                            )}
                                            <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(form.id, form.activeMemberId, e)} className="hidden" />
                                        </div>
                                    )}

                                    {memberTask.activeTab === "Audio" && (
                                        <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 min-h-[80px] flex flex-col justify-center items-center shadow-inner">
                                            {memberTask.audioUrl ? (
                                                <div className="w-full flex flex-col items-center p-2 bg-white rounded-xl shadow-sm">
                                                    <audio controls src={memberTask.audioUrl} className="w-full h-8 mb-2" />
                                                    <button type="button" onClick={() => handleRemoveAudio(form.id, form.activeMemberId)} className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider underline">Delete Audio</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-6">
                                                    <button type="button" onClick={() => isRecording ? stopRecording() : startRecording(form.id, form.activeMemberId)}
                                                        className={`p-3 rounded-full transition shadow-xl ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110 transform'}`}>
                                                        {isRecording ? <FaStop size={16} /> : <FaMicrophone size={16} />}
                                                    </button>
                                                    <button type="button" onClick={() => audioInputRef.current.click()}
                                                        className="p-3 bg-white text-gray-400 border border-gray-200 rounded-full hover:bg-white hover:text-indigo-600 hover:border-indigo-400 transition shadow-md hover:scale-110 transform" title="Upload Audio File">
                                                        <FaCloudUploadAlt size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            {!memberTask.audioUrl && <p className="mt-2 text-[10px] font-bold text-gray-400 tracking-wide">{isRecording ? "RECORDING..." : "Record or Upload Audio"}</p>}
                                            <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => handleAudioUpload(form.id, form.activeMemberId, e)} className="hidden" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

        </div>
    );
};

const GroupTaskAssignment = ({ isModal = false, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userDesignation, setUserDesignation] = useState("");
    const [isStatusRestricted, setIsStatusRestricted] = useState(false);
    const [isRoleRestricted, setIsRoleRestricted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const isAdminOrSuperAdmin = userRole && (
        (Array.isArray(userRole) ? userRole.includes("Super Admin") : userRole === "Super Admin") ||
        (Array.isArray(userRole) ? userRole.includes("Admin") : userRole === "Admin")
    );
    const isTechLead = userDesignation && userDesignation.toLowerCase().includes("lead");
    const canAddOptions = isAdminOrSuperAdmin || isTechLead;

    // --- State ---
    const initialFormState = () => {
        const defaultMemberId = "Everyone"; // Default entry for Everyone mode or initial state
        return {
            id: uuidv4(),
            projectName: "",
            assignMode: "Single", // Single person, Team, Everyone
            selectedMembers: [],
            activeMemberId: "",
            taskLead: "",
            priority: "Very High",
            startDate: new Date().toISOString().split("T")[0],
            startTime: new Date().toTimeString().slice(0, 5),
            deadline: new Date().toISOString().split("T")[0],
            memberTasks: {}, // Maps memberId (or "Everyone") to task details
            activeTab: "Description", // Global tab state for new members or general UI
        };
    };

    const [forms, setForms] = useState([initialFormState()]);

    const [employees, setEmployees] = useState([]);
    const [options, setOptions] = useState({ department: [] });
    const [departments, setDepartments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [validationError, setValidationError] = useState("");

    const isFormValid = React.useMemo(() => {
        return forms.every(f => {
            if (!f.projectName || !f.taskLead) return false;
            const hasMembers = f.assignMode === "Everyone" || (Array.isArray(f.selectedMembers) && f.selectedMembers.length > 0);
            if (!hasMembers) return false;
            const membersToCheck = f.assignMode === "Everyone" ? ["Everyone"] : f.selectedMembers;
            return membersToCheck.every(mId => {
                const mt = f.memberTasks[mId];
                return mt && mt.title && mt.description;
            });
        });
    }, [forms]);

    const mediaRecorderRef = useRef(null);
    const [activeRecordingId, setActiveRecordingId] = useState(null);

    // --- Effects ---
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const usr = JSON.parse(storedUser);
                setUserRole(usr.role);
                setUserDesignation(usr.designation || "");
            } catch (e) { }
        }

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
                    if (data.department) setDepartments(data.department.map(d => d.value));
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

    // Check for edit mode and status restriction
    useEffect(() => {
        if (location.state && location.state.taskToEdit) {
            const task = location.state.taskToEdit;
            setIsEditing(true);
            if (task.status && task.status !== "Pending") {
                setIsStatusRestricted(true);
            } else {
                setIsStatusRestricted(false);
            }

            // Check Role Restriction
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

            // Prefill data for Group Tasks
            let formattedStartDate = "";
            let formattedStartTime = "";
            if (task.startDate) {
                try {
                    const dateObj = new Date(task.startDate);
                    formattedStartDate = dateObj.toISOString().split("T")[0];
                    formattedStartTime = dateObj.toTimeString().slice(0, 5);
                } catch (e) { }
            }
            if (task.startTime) formattedStartTime = task.startTime;

            let formattedDueDate = "";
            if (task.deadline || task.dueDate) {
                try {
                    formattedDueDate = new Date(task.deadline || task.dueDate).toISOString().split("T")[0];
                } catch (e) { }
            }

            const mId = typeof task.assignee === 'string' ? task.assignee : (Array.isArray(task.assignee) && task.assignee[0] ? (typeof task.assignee[0] === 'object' ? task.assignee[0]._id : task.assignee[0]) : "Everyone");

            const initialMemberTasks = {};
            const selectedMembers = Array.isArray(task.selectedMembers) ? task.selectedMembers : (Array.isArray(task.assignee) ? task.assignee.map(a => typeof a === 'object' ? a._id : a) : [mId]);

            selectedMembers.forEach(id => {
                initialMemberTasks[id] = {
                    title: task.taskTitle || "",
                    description: task.description || "",
                    priority: "Very High",
                    deadline: formattedDueDate || new Date().toISOString().split("T")[0],
                    activeTab: "Description",
                    documents: task.documentPath ? { name: task.documentPath } : null,
                    audioFile: null,
                    audioUrl: task.audioPath ? `${API_URL.replace('/api', '')}/uploads/${task.audioPath}` : null,
                    taskTree: task.taskTree || {
                        id: uuidv4(),
                        title: task.taskTitle || "",
                        description: task.description || "",
                        assignee: [id],
                        subtasks: []
                    }
                };
            });

            setForms([{
                id: task._id || uuidv4(),
                projectName: task.projectName || "",
                assignMode: task.assignMode || "Single",
                selectedMembers: selectedMembers,
                activeMemberId: selectedMembers[0] || "",
                taskLead: typeof task.taskLead === 'object' && task.taskLead !== null ? task.taskLead._id : (task.taskLead || ""),
                startDate: formattedStartDate || new Date().toISOString().split("T")[0],
                startTime: formattedStartTime || new Date().toTimeString().slice(0, 5),
                memberTasks: initialMemberTasks
            }]);

            // Clear state after reading so a page refresh doesn't trigger edit mode again if unintended
            window.history.replaceState({}, document.title)
        }
    }, [location.state]);

    // --- Handlers ---
    const updateForm = (formId, field, value) => {
        setForms(prev => prev.map(f => f.id === formId ? { ...f, [field]: value } : f));
    };

    const updateNodeAtPath = (tree, path, newValue) => {
        if (path.length === 0) return newValue;
        const newTree = { ...tree };
        let current = newTree;
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = Array.isArray(current[path[i]]) ? [...current[path[i]]] : { ...current[path[i]] };
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newValue;
        return newTree;
    };

    const handleTaskChange = (formId, memberId, path, newValue) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            const memberTask = f.memberTasks[memberId];
            if (!memberTask) return f;

            return {
                ...f,
                memberTasks: {
                    ...f.memberTasks,
                    [memberId]: {
                        ...memberTask,
                        taskTree: updateNodeAtPath(memberTask.taskTree, path, newValue)
                    }
                }
            };
        }));
    };

    const updateMemberTaskField = (formId, memberId, field, value) => {
        setForms(prev => prev.map(f => {
            if (f.id !== formId) return f;
            const memberTask = f.memberTasks[memberId];
            if (!memberTask) return f;

            return {
                ...f,
                memberTasks: {
                    ...f.memberTasks,
                    [memberId]: { ...memberTask, [field]: value }
                }
            };
        }));
    };

    const isTaskTreeValid = (node) => {
        if (!node.title || !node.description) return false;
        for (const sub of node.subtasks) {
            if (!isTaskTreeValid(sub)) return false;
        }
        return true;
    };

    const handleAddProjectBlock = () => {
        // Find the last form to validate
        if (forms.length > 0) {
            const lastForm = forms[forms.length - 1];
            // Validate minimal required fields: Project Name
            if (!lastForm.projectName) {
                setValidationError("Please fill Project Name in the current form before adding another.");
                return;
            }

            // Create a fresh new form instead of cloning
            const newForm = initialFormState();

            setValidationError("");
            setForms(prev => [...prev, newForm]);
        } else {
            setForms([initialFormState()]);
        }
    };

    const handleRemoveProjectBlock = (formId) => {
        setForms(prev => prev.filter(f => f.id !== formId));
    };

    const handleAddProject = async (formId, newProjectNameStr) => {
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
                updateForm(formId, "projectName", data.value);
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
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setProjects(prev => prev.filter(p => p._id !== option._id));
                    setForms(prev => prev.map(f => f.projectName === option.value ? { ...f, projectName: "" } : f));
                } else {
                    const data = await res.json();
                    alert(data.message || "Failed to delete project");
                }
            } catch (err) {
                alert("Error deleting project");
            }
        }
    };
    const handleFileChange = (formId, memberId, e) => {
        const file = e.target.files[0];
        if (file) {
            updateMemberTaskField(formId, memberId, 'documents', file);
        }
    };

    const handleAudioUpload = (formId, memberId, e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateMemberTaskField(formId, memberId, 'audioFile', file);
            updateMemberTaskField(formId, memberId, 'audioUrl', url);
        }
    };

    const handleRemoveFile = (formId, memberId) => {
        updateMemberTaskField(formId, memberId, 'documents', null);
    };

    const handleRemoveAudio = (formId, memberId) => {
        updateMemberTaskField(formId, memberId, 'audioFile', null);
        updateMemberTaskField(formId, memberId, 'audioUrl', null);
    };

    const startRecording = async (formId, memberId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                const file = new File([blob], "recording.webm", { type: "audio/webm" });
                const url = URL.createObjectURL(blob);

                updateMemberTaskField(formId, memberId, 'audioFile', file);
                updateMemberTaskField(formId, memberId, 'audioUrl', url);

                setActiveRecordingId(null);
            };

            setActiveRecordingId(`${formId}:${memberId}`);
            mediaRecorderRef.current.start();
        } catch (err) {
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation for each individualized task
        const isAllValid = forms.every(f => {
            if (!f.projectName || !f.taskLead || !f.startDate || !f.startTime) return false;
            if (f.assignMode !== "Everyone" && (!f.selectedMembers || f.selectedMembers.length === 0)) return false;

            // Every member must have at least a title and description
            const mTasks = Object.values(f.memberTasks);
            if (mTasks.length === 0) return false; // Ensure there's at least one member task if members are selected
            return mTasks.every(t => t.title && t.description);
        });

        if (!isAllValid) {
            setValidationError("Please ensure all members have a Task Title and Description, and Project details are complete.");
            return;
        }
        setValidationError("");

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

        setIsSubmitting(true);
        const batchId = uuidv4();
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const assignedBy = user ? (user.id || user._id) : null;

        try {
            for (const form of forms) {
                const payload = new FormData();

                if (assignedBy) payload.append("assignedBy", assignedBy);
                payload.append('batchId', batchId);
                payload.append('assignType', 'GroupHierarchy');
                payload.append('taskType', 'Group Task');
                payload.append('projectName', form.projectName);
                payload.append('startDate', form.startDate);
                payload.append('startTime', form.startTime);
                payload.append('taskLead', form.taskLead);
                payload.append('assignMode', form.assignMode);

                // Group All Member Tasks for this project block
                const individualizedTasks = {};
                for (const memberId of Object.keys(form.memberTasks)) {
                    const mTask = form.memberTasks[memberId];
                    individualizedTasks[memberId] = {
                        title: mTask.title,
                        description: mTask.description,
                        priority: "Very High",
                        deadline: mTask.deadline,
                        // Files will be handled separately in FormData with unique prefixes
                    };

                    if (mTask.documents) {
                        payload.append(`documents_${memberId}`, mTask.documents);
                    }
                    if (mTask.audioFile) {
                        payload.append(`audioFile_${memberId}`, mTask.audioFile);
                    }
                }

                payload.append('individualizedTasks', JSON.stringify(individualizedTasks));
                // Representative title for logs/previews
                const firstMemberId = Object.keys(form.memberTasks)[0];
                payload.append('taskTitle', form.memberTasks[firstMemberId].title);
                payload.append('description', "Group Task with individualized assignments.");
                payload.append('assignee', JSON.stringify(Object.keys(form.memberTasks)));
                payload.append('selectedMembers', JSON.stringify(Object.keys(form.memberTasks)));

                if (navigator.onLine) {
                    const endpoint = `${API_URL}/tasks`;
                    await fetch(endpoint, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                        body: payload
                    });
                } else {
                    // Offline Logic for Grouped Tasks
                    const existingOffline = JSON.parse(localStorage.getItem('offlineAssignments')) || [];
                    const offlineEntry = {
                        assignType: "GroupHierarchy",
                        taskType: "Group Task",
                        projectName: form.projectName,
                        startDate: form.startDate,
                        startTime: form.startTime,
                        taskLead: form.taskLead,
                        assignMode: form.assignMode,
                        selectedMembers: Object.keys(form.memberTasks),
                        assignee: Object.keys(form.memberTasks),
                        individualizedTasks,
                        batchId: batchId,
                        assignedBy: assignedBy,
                        offlineCreatedAt: new Date().toISOString()
                    };

                    // Handle files for offline storage (converted to Base64)
                    for (const memberId of Object.keys(form.memberTasks)) {
                        const mTask = form.memberTasks[memberId];
                        if (mTask.documents instanceof File) {
                            individualizedTasks[memberId].documentsData = await fileToBase64(mTask.documents);
                        }
                        if (mTask.audioFile instanceof (File || Blob)) {
                            const fileObj = mTask.audioFile instanceof File ? mTask.audioFile : new File([mTask.audioFile], "recording.webm", { type: mTask.audioFile.type });
                            individualizedTasks[memberId].audioFileData = await fileToBase64(fileObj);
                        }
                    }

                    existingOffline.push(offlineEntry);
                    localStorage.setItem('offlineAssignments', JSON.stringify(existingOffline));
                }
            }
            if (!navigator.onLine) window.dispatchEvent(new Event('offlineAssignmentAdded'));
            setShowSuccessModal(true);
            if (isModal && onSuccess) {
                setShowSuccessModal(true);
            }
            // setForms([initialFormState()]); // Keep this or reset inside modal onClose

        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit one or more tasks.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Tasks Created!</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        The group tasks have been successfully assigned.
                    </p>
                    <button onClick={() => {
                        onClose && onClose();
                        if (isModal && onSuccess) onSuccess();
                        setShowSuccessModal(false);
                    }} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:text-sm">
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    const renderMainForm = () => (
        <form className="space-y-6" onSubmit={handleSubmit}>
            {forms.map((form, index) => (
                <ProjectTaskBlock
                    key={form.id}
                    index={index}
                    form={form}
                    updateForm={updateForm}
                    handleTaskChange={handleTaskChange}
                    handleAddProject={handleAddProject}
                    handleDeleteProject={handleDeleteProject}
                    onRemove={handleRemoveProjectBlock}
                    showRemove={forms.length > 1}
                    projects={projects}
                    departments={departments}
                    employees={employees}
                    activeRecordingId={activeRecordingId}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    handleFileChange={handleFileChange}
                    handleAudioUpload={handleAudioUpload}
                    handleRemoveFile={handleRemoveFile}
                    handleRemoveAudio={handleRemoveAudio}
                    canAddOptions={canAddOptions}
                    updateMemberTaskField={updateMemberTaskField}
                />
            ))}

            {/* Add Additional Project Task Control */}
            <div className="mt-2 relative h-12">
                <button
                    type="button"
                    onClick={handleAddProjectBlock}
                    className="absolute right-0 top-0 w-full sm:w-[260px] h-full border-2 border-dashed border-gray-200 rounded-xl bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 group"
                >
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-indigo-600 flex items-center justify-center text-gray-400 group-hover:text-white transition-all">
                        <FaPlus size={10} />
                    </div>
                    <span className="text-sm font-semibold text-gray-400 group-hover:text-indigo-600">Add Another Project Task</span>
                </button>
            </div>

            {validationError && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-2 text-sm font-medium animate-pulse flex items-center justify-between">
                    <span>{validationError}</span>
                    <button type="button" onClick={() => setValidationError("")} className="text-red-400 hover:text-red-600">
                        <FaTimes size={14} />
                    </button>
                </div>
            )}

            {/* Form Submission Actions */}
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || isStatusRestricted || isRoleRestricted || !isFormValid}
                    className={`w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg transition-all duration-300 text-sm ${(isSubmitting || isStatusRestricted || isRoleRestricted || !isFormValid)
                        ? "opacity-40 grayscale blur-[1px] cursor-not-allowed shadow-none"
                        : "hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5"
                        }`}
                >
                    {isSubmitting ? "Submitting..." : (isEditing ? "Update All Group Tasks" : "Submit All Group Tasks")}
                </button>
            </div>
        </form>
    );

    if (isModal) {
        return (
            <div className="bg-white h-full overflow-hidden font-sans">
                <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
                {renderMainForm()}
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans relative">
            {userRole === "Super Admin" || (Array.isArray(userRole) && userRole.includes("Super Admin")) ? (
                <Sidebar className="hidden md:flex" />
            ) : (
                <EmployeeSidebar className="hidden md:flex" />
            )}

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
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

            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {!navigator.onLine && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 absolute top-0 left-0 right-0 z-50 shadow-md animate-pulse">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 font-semibold">
                                    Offline Mode: You are currently offline. Task assignments will be saved locally.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Header */}
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

                <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex justify-center">
                    <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden h-fit">
                        <div className="p-8">
                            {/* Top Level Tabs */}
                            <div className="flex border-b border-gray-100 mb-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const role = userRole === "Super Admin" || (Array.isArray(userRole) && userRole.includes("Super Admin")) ? "" : "employee/";
                                        navigate(`/${role}assign-task`);
                                    }}
                                    className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-all"
                                >
                                    Individual Task
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 py-4 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition-all"
                                >
                                    Group Task
                                </button>
                            </div>


                            {isStatusRestricted && (
                                <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700 font-semibold italic">
                                                You are already working on this task, so it cannot be updated.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isRoleRestricted && !isStatusRestricted && (
                                <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md shadow-sm">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-amber-700 font-semibold italic">
                                                You can only edit tasks that you created.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {renderMainForm()}
                        </div>
                    </div>
                </main>
                <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
            </div>
        </div>
    );
};

export default GroupTaskAssignment;
