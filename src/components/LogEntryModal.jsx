import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/config";
import { FaTimes, FaCloudUploadAlt } from "react-icons/fa";

const LogEntryModal = ({ isOpen, onClose, task, onSuccess, targetStatus }) => {
    const today = new Date().toISOString().split('T')[0];
    const user = JSON.parse(localStorage.getItem("user"));

    const [formData, setFormData] = useState({
        taskTitle: "",
        projectName: "",
        date: today, // Required by DB but might be "Hold Date"
        taskStartDate: "",
        logEndDate: "",

        duration: "",
        description: "",
        employeeId: user?.id || user?._id,
        priority: "" // Add priority field
    });

    const [files, setFiles] = useState({
        document: null,
        audio: null
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (task) {
            const startDate = task.startDate || today;
            const startTime = task.startTime ? ` ${task.startTime} ` : "";
            const endDate = targetStatus === "Completed" ? today : "";

            setFormData(prev => ({
                ...prev,
                taskTitle: task.taskTitle || "",
                projectName: task.projectName || "",
                taskStartDate: `${startDate}${startTime} `,
                logEndDate: endDate,
                priority: task.priority || "Medium"
            }));

            // Auto-calculate Duration formatted string if we have both dates
            calculateDuration(startDate, endDate);
        }
    }, [task, targetStatus]);

    const calculateDuration = (start, end) => {
        if (!start || !end) return;

        const startDate = new Date(start);
        const endDate = new Date(end);

        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day

        // Placeholder for time, user can edit
        setFormData(prev => ({
            ...prev,
            duration: `${start} to ${end} (${diffDays} days), Time: 0 hours`
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        setFiles(prev => ({
            ...prev,
            [name]: selectedFiles[0]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const data = new FormData();
            const now = new Date();
            data.append("clientTime", now.toISOString());
            data.append("localTimeStr", now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            data.append("localDateStr", now.toLocaleDateString('en-CA'));

            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            data.append("status", targetStatus); // Send target status
            if (files.document) data.append("document", files.document);
            if (files.audio) data.append("audio", files.audio);

            const logRes = await fetch(`${API_URL}/work-logs`, {
                method: "POST",
                body: data, // No Content-Type header (browser sets multipart boundary)
            });

            if (!logRes.ok) {
                const resData = await logRes.json();
                throw new Error(resData.message || "Failed to submit log");
            }

            if (onSuccess) {
                await onSuccess();
            }
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Log Your Work</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Required before changing status to <span className="font-bold text-indigo-600">{targetStatus}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Read-only Context */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project</label>
                                <input type="text" value={formData.projectName} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Task</label>
                                <input type="text" value={formData.taskTitle} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium cursor-not-allowed" />
                            </div>

                            {/* Dates */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Task Start Date & Time</label>
                                <input type="text" value={formData.taskStartDate} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium cursor-not-allowed" />
                            </div>

                            {targetStatus === "Completed" && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date (Auto)</label>
                                    <input type="date" value={formData.logEndDate} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium cursor-not-allowed" />
                                </div>
                            )}

                            {/* Regular Date for Hold/Other */}
                            {(targetStatus !== "Completed") && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Log Date</label>
                                    <input type="date" name="date" value={formData.date} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed" />
                                </div>
                            )}

                            {/* Duration String */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Duration Description</label>
                                <input
                                    type="text"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    placeholder="e.g. 02-02-2026 to 04-02-2026 (3 days), Time: 24 hours"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Format: From date to date (days), Time: hours</p>
                            </div>

                            {/* Traditional Time Inputs (Keeping as optional or fallback) */}

                        </div>

                        {/* Files */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Upload Document</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer">
                                    <input type="file" name="document" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center">
                                        <FaCloudUploadAlt className="text-gray-400 text-2xl mb-1" />
                                        <span className="text-sm text-gray-600">{files.document ? files.document.name : "Choose File"}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Upload Audio</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer">
                                    <input type="file" name="audio" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="flex flex-col items-center">
                                        <FaCloudUploadAlt className="text-gray-400 text-2xl mb-1" />
                                        <span className="text-sm text-gray-600">{files.audio ? files.audio.name : "Choose Audio"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                            <textarea
                                name="description"
                                rows="3"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                placeholder="Describe the work, reasons, etc..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                            ></textarea>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className={`px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 hover:-translate-y-0.5"}`}>{isSubmitting ? "Uploading..." : "Submit Log & Update Status"}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LogEntryModal;
