import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/config";
import EmployeeSidebar from "../components/EmployeeSidebar";
import CustomDropdown from "../components/CustomDropdown";
import LeaveDetailsModal from "../components/LeaveDetailsModal";
import { FaCalendarAlt, FaPaperPlane, FaBriefcaseMedical, FaCalendarCheck, FaUserClock, FaQuestionCircle, FaClipboardList } from "react-icons/fa";

const ApplyLeave = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [leaveCategory, setLeaveCategory] = useState("Day Leave"); // "Day Leave" or "Hour Permission"
    const [leavesList, setLeavesList] = useState([]);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [formData, setFormData] = useState({
        leaveType: "Health Issue",
        appliedDate: new Date().toISOString().split('T')[0],
        leaveDate: new Date().toISOString().split('T')[0],
        permissionDate: new Date().toISOString().split('T')[0],
        startTime: "10:00",
        endTime: "12:00",
        reason: ""
    });

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

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        setTimeLeft(30);
    };

    useEffect(() => {
        // Update permissionDate to current time on mount/render if not set 
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setFormData(prev => ({
            ...prev,
            permissionDate: now.toISOString().split('T')[0],
            appliedDate: now.toISOString().split('T')[0],
            leaveDate: now.toISOString().split('T')[0]
        }));

        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser && (storedUser._id || storedUser.id)) {
            fetchLeaves(storedUser.id || storedUser._id);
        }
    }, []);

    const fetchLeaves = async (employeeId) => {
        try {
            const res = await fetch(`${API_URL}/leave/my-leaves/${employeeId}`);
            if (res.ok) {
                const data = await res.json();
                setLeavesList(data);
            }
        } catch (error) {
            console.error("Error fetching leaves:", error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLeaveTypeChange = (val) => {
        setFormData({ ...formData, leaveType: val });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser || (!storedUser._id && !storedUser.id)) {
            alert("User not found. Please log in.");
            return;
        }

        const payload = {
            employeeId: storedUser._id || storedUser.id,
            leaveCategory,
            leaveType: formData.leaveType,
            appliedDate: formData.appliedDate,
            reason: formData.reason,
            // Conditional fields
            leaveDate: leaveCategory === "Day Leave" ? formData.leaveDate : null,
            permissionDate: leaveCategory === "Hour Permission" ? formData.permissionDate : null,
            startTime: leaveCategory === "Hour Permission" ? formData.startTime : null,
            endTime: leaveCategory === "Hour Permission" ? formData.endTime : null,
        };

        try {
            const res = await fetch(`${API_URL}/leave/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setShowSuccess(true);
                setFormData({ ...formData, reason: "", startTime: "10:00", endTime: "12:00" }); // Reset some fields
                fetchLeaves(storedUser.id || storedUser._id); // Refresh list
            } else {
                alert(data.message || "Failed to submit leave application.");
            }
        } catch (error) {
            console.error("Error submitting leave:", error);
            alert("Server Error");
        }
    };

    const leaveOptions = [
        { value: "Health Issue", label: <div className="flex items-center gap-2"><FaBriefcaseMedical className="text-red-500" /> Health Issue</div> },
        { value: "Events", label: <div className="flex items-center gap-2"><FaCalendarCheck className="text-purple-500" /> Events</div> },
        { value: "Personal Reasons", label: <div className="flex items-center gap-2"><FaUserClock className="text-blue-500" /> Personal Reasons</div> },
        { value: "Other", label: <div className="flex items-center gap-2"><FaQuestionCircle className="text-gray-500" /> Other</div> }
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans relative">
            {/* Desktop Sidebar */}
            <EmployeeSidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        <EmployeeSidebar className="flex h-full shadow-xl" />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10">
                    <h1 className="text-xl font-bold text-gray-800">UserPanel</h1>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-2 rounded hover:bg-gray-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">

                        {/* Apply Leave Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    <FaCalendarAlt className="text-indigo-600" />
                                    Apply for Leave
                                </h2>
                                <p className="text-gray-500 mt-1">Submit your leave request for approval.</p>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Category Toggle */}
                                <div className="flex p-1 bg-gray-100 rounded-xl">
                                    <button
                                        onClick={() => setLeaveCategory("Day Leave")}
                                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${leaveCategory === "Day Leave" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Day Leave
                                    </button>
                                    <button
                                        onClick={() => setLeaveCategory("Hour Permission")}
                                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${leaveCategory === "Hour Permission" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Hour Permission
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Leave Type Custom Dropdown */}
                                    <div>
                                        <CustomDropdown
                                            label=""
                                            value={formData.leaveType}
                                            onChange={handleLeaveTypeChange}
                                            options={leaveOptions}
                                        />
                                    </div>

                                    {leaveCategory === "Day Leave" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Applied Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.appliedDate}
                                                    readOnly
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Date</label>
                                                <input
                                                    type="date"
                                                    name="leaveDate"
                                                    value={formData.leaveDate}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-gray-50/30"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Applied Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.appliedDate}
                                                    readOnly
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Permission Date</label>
                                                <input
                                                    type="date"
                                                    name="permissionDate"
                                                    value={formData.permissionDate}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-gray-50/30"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
                                                <input
                                                    type="time"
                                                    name="startTime"
                                                    value={formData.startTime}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-gray-50/30"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
                                                <input
                                                    type="time"
                                                    name="endTime"
                                                    value={formData.endTime}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-gray-50/30"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Reason */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Leave</label>
                                        <textarea
                                            name="reason"
                                            value={formData.reason}
                                            onChange={handleChange}
                                            required
                                            rows="4"
                                            placeholder="Please provide a brief reason..."
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-gray-50/30 resize-none"
                                        ></textarea>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 active:transform active:scale-95 transition-all shadow-lg shadow-indigo-200"
                                        >
                                            <FaPaperPlane />
                                            Submit Application
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* My Leave History Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FaClipboardList className="text-indigo-600" />
                                    My Leave History
                                </h3>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                                    {leavesList.length} Records
                                </span>
                            </div>

                            <div className="w-full overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[800px] xl:min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 text-xs font-extrabold uppercase tracking-wider">
                                            <th className="px-6 py-4 w-[5%] text-center">S.No</th>
                                            <th className="px-6 py-4 w-[20%]">Type of Leave</th>
                                            <th className="px-6 py-4 w-[25%]">Leave Category</th>
                                            <th className="px-6 py-4 w-[15%]">Applied On</th>
                                            <th className="px-6 py-4 w-[20%]">Date / Time</th>
                                            <th className="px-6 py-4 w-[15%]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leavesList.length > 0 ? (
                                            leavesList.map((leave, index) => (
                                                <tr key={leave._id}
                                                    onClick={() => setSelectedLeave(leave)}
                                                    className="group hover:bg-indigo-50/20 transition-all duration-200 cursor-pointer h-16 border-l-4 border-transparent hover:border-indigo-500"
                                                >
                                                    {/* S.No */}
                                                    <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs align-middle">
                                                        {(index + 1).toString().padStart(2, '0')}
                                                    </td>

                                                    {/* Type of Leave */}
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <span className="p-1.5 bg-gray-100 text-gray-400 rounded group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                                <FaClipboardList size={12} />
                                                            </span>
                                                            {leave.leaveCategory}
                                                        </div>
                                                    </td>

                                                    {/* Leave Category/Type */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 align-middle">
                                                        {leave.leaveType}
                                                    </td>

                                                    {/* Applied On */}
                                                    <td className="px-6 py-4 text-sm text-gray-500 font-medium font-mono align-middle">
                                                        {leave.appliedDate}
                                                    </td>

                                                    {/* Date / Time */}
                                                    <td className="px-6 py-4 text-sm text-gray-500 align-middle">
                                                        {leave.leaveCategory === "Day Leave" ? (
                                                            <span className="font-mono">{leave.leaveDate}</span>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className="font-mono">{leave.permissionDate}</span>
                                                                <span className="text-xs text-gray-400">{leave.startTime} - {leave.endTime}</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4 align-middle">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${leave.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                            leave.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                                "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${leave.status === "Approved" ? "bg-emerald-500" :
                                                                leave.status === "Rejected" ? "bg-rose-500" :
                                                                    "bg-amber-500"
                                                                }`}></span>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center py-8 text-gray-500">
                                                    No leave history found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* Leave Details Modal */}
            {selectedLeave && (
                <LeaveDetailsModal
                    isOpen={!!selectedLeave}
                    onClose={() => setSelectedLeave(null)}
                    leave={selectedLeave}
                />
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-green-100 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ✓
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Leave Applied!</h3>
                        <p className="text-gray-500 mb-8">
                            Your leave application has been successfully submitted for approval.
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

export default ApplyLeave;
