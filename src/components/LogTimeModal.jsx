import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/config";
import { FaTimes, FaCalendarAlt, FaClock, FaUser } from "react-icons/fa";
import CustomDropdown from "./CustomDropdown";

const LogTimeModal = ({ task, employees = [], currentUserId = null, onClose, onSuccess }) => {
    // Default to the first assignee if available, OR currentUserId if passed
    const initialEmployee = currentUserId || (task && Array.isArray(task.assignedTo) && task.assignedTo.length > 0
        ? task.assignedTo[0]
        : "");

    const [formData, setFormData] = useState({
        employeeId: initialEmployee,
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "10:00",
        description: "",
        status: "In Progress"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData(prev => ({
                ...prev,
                status: task.status || "In Progress",
                employeeId: (task.assignedTo && task.assignedTo.length > 0) ? task.assignedTo[0] : prev.employeeId
            }));
        }
    }, [task]);

    // Calculate duration for display
    const calculateDuration = () => {
        if (!formData.startTime || !formData.endTime) return "";
        const start = new Date(`2000-01-01T${formData.startTime}`);
        const end = new Date(`2000-01-01T${formData.endTime}`);
        let diff = (end - start) / 1000 / 60 / 60; // hours
        if (diff < 0) diff += 24; // Handle overnight? Assume logs are same day for now.
        return diff.toFixed(1);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const durationStr = calculateDuration() + "h";

        const payload = {
            employeeId: formData.employeeId,
            taskTitle: task.taskTitle,
            projectName: task.projectName,
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            duration: durationStr, // Sending formatted string e.g. "4.5h"
            priority: task.priority, // Include task priority
            description: formData.description
        };

        try {
            const res = await fetch(`${API_URL}/work-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Time logged successfully!");
                if (onSuccess) onSuccess();
                onClose();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to log time");
            }
        } catch (error) {
            alert("Server Error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backbone-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Task Login</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Task Info (Read Only) */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Task</p>
                        <p className="text-sm font-bold text-gray-800">{task.taskTitle}</p>
                        <p className="text-xs text-gray-500">{task.projectName}</p>
                    </div>

                    {/* Employee Select (Only show if multiple employees passed) */}
                    {employees.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                            <div className="relative">
                                {/* FaUser icon is inside CustomDropdown, we can pass it as icon in options or just rely on CustomDropdown styling */}
                                <CustomDropdown
                                    label="Employee"
                                    value={formData.employeeId}
                                    onChange={(val) => handleChange({ target: { name: 'employeeId', value: val } })}
                                    options={employees.map(emp => ({ value: emp._id, label: emp.name, icon: FaUser }))}
                                    placeholder="Select Employee"
                                />
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                required
                            />
                        </div>
                    </div>
                    {/* Duration Display */}
                    <div className="text-right text-xs font-bold text-gray-500">
                        Duration: <span className="text-blue-600">{calculateDuration()} hrs</span>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Work summary..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            required
                        ></textarea>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Log Time"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LogTimeModal;
