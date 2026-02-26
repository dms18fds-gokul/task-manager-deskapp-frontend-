import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { FaExclamationCircle } from "react-icons/fa";

const EmployeeLogSystemPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Auto-fill today's date
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        taskTitle: "",
        projectName: "",
        date: today,
        startTime: "",
        endTime: "",
        duration: "",
        description: ""
    });

    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            navigate("/login");
        } else {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role === "Super Admin") {
                navigate("/dashboard");
            } else {
                setUser(parsedUser);
                setFormData(prev => ({ ...prev, employeeId: parsedUser.id }));
            }
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: "", message: "" });

        try {
            const response = await fetch(`${API_URL}/work-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: "success", message: "Work log submitted successfully!" });
                setFormData({
                    taskTitle: "",
                    projectName: "",
                    date: today,
                    startTime: "",
                    endTime: "",
                    duration: "",
                    description: "",
                    employeeId: user.id
                });
            } else {
                setStatus({ type: "error", message: data.message || "Failed to submit work log." });
            }
        } catch (error) {
            setStatus({ type: "error", message: "Error connecting to server. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (user.qtActivity === false && user.role !== "Super Admin") {
        return (
            <div className="flex min-h-screen bg-gray-50 font-sans">
                <EmployeeSidebar className="hidden md:flex" />
                <div className="flex-1 flex flex-col justify-center items-center h-screen p-6 relative">
                    {/* Mobile Sidebar Overlay */}
                    {isSidebarOpen && (
                        <div className="fixed inset-0 z-40 md:hidden">
                            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                            <div className="absolute inset-y-0 left-0 z-50">
                                <EmployeeSidebar className="flex h-full shadow-xl" />
                            </div>
                        </div>
                    )}
                    {/* Header (Mobile toggle) */}
                    <header className="absolute top-0 left-0 right-0 bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                        <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                            </svg>
                        </button>
                    </header>

                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-rose-500 mt-16 md:mt-0">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaExclamationCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
                        <p className="text-gray-500 mb-6">
                            QT Activity has been disabled for your account by the Administrator. You no longer have access to this page or its data.
                        </p>
                        <button
                            onClick={() => navigate('/employee-dashboard')}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header (Mobile toggle) */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                        </svg>
                    </button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Log System</h1>
                            <p className="text-xs text-gray-500 mt-1">Submit your daily work logs below.</p>
                        </div>
                        {status.message && (
                            <div className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm animate-fade-in ${status.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                {status.message}
                            </div>
                        )}
                    </div>

                    {/* Log Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Task Title */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Task Title</label>
                                    <input
                                        type="text"
                                        name="taskTitle"
                                        value={formData.taskTitle}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter task title"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>

                                {/* Project Name */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Project Name</label>
                                    <input
                                        type="text"
                                        name="projectName"
                                        value={formData.projectName}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter project name"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>

                                {/* Start Time */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>

                                {/* End Time */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    />
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Duration (e.g., 2h 30m)</label>
                                    <input
                                        type="text"
                                        name="duration"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        placeholder="Calculated automatically in future"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                <textarea
                                    name="description"
                                    rows="4"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    placeholder="Describe your work done..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none"
                                ></textarea>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 hover:-translate-y-0.5"
                                        }`}
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Log"}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EmployeeLogSystemPage;
