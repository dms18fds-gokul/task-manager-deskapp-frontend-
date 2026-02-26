import React from "react";
import { FaTimes, FaCalendarAlt, FaClock, FaInfoCircle, FaBriefcaseMedical, FaCheckCircle, FaExclamationCircle, FaTimesCircle } from "react-icons/fa";

const LeaveDetailsModal = ({ isOpen, onClose, leave }) => {
    if (!isOpen || !leave) return null;

    // Helper to determine status color and icon
    const getStatusStyle = (status) => {
        switch (status) {
            case "Approved":
                return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: <FaCheckCircle /> };
            case "Rejected":
                return { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", icon: <FaTimesCircle /> };
            default:
                return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: <FaExclamationCircle /> };
        }
    };

    const statusStyle = getStatusStyle(leave.status);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FaInfoCircle className="text-indigo-600" />
                        Leave Details
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Status Banner */}
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusStyle.bg} ${statusStyle.border}`}>
                        <span className={`text-xl ${statusStyle.color}`}>{statusStyle.icon}</span>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${statusStyle.color}`}>Status</p>
                            <p className="text-sm font-semibold text-gray-800">{leave.status}</p>
                        </div>
                    </div>

                    {/* Check if rejected, show rejection reason if available (future proofing) */}
                    {leave.status === "Rejected" && leave.rejectionReason && (
                        <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">
                            <span className="font-bold">Reason for Rejection:</span> {leave.rejectionReason}
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-xs text-gray-500 font-bold uppercase">Type of Leave</span>
                            <p className="text-gray-800 font-semibold mt-1">{leave.leaveCategory}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-xs text-gray-500 font-bold uppercase">Leave Category</span>
                            <p className="text-gray-800 font-semibold mt-1 flex items-center gap-2">
                                <FaBriefcaseMedical className="text-indigo-400 text-xs" />
                                {leave.leaveType}
                            </p>
                        </div>
                    </div>

                    {/* Dates Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaCalendarAlt className="text-indigo-500" />
                            <span className="font-medium">Applied Date:</span>
                            <span>{leave.appliedDate}</span>
                        </div>

                        {leave.leaveCategory === "Day Leave" ? (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <FaCalendarAlt className="text-rose-500" />
                                <span className="font-medium">Leave Date:</span>
                                <span>{leave.leaveDate}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <FaCalendarAlt className="text-rose-500" />
                                    <span className="font-medium">Permission Date:</span>
                                    <span>{leave.permissionDate}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <FaClock className="text-amber-500" />
                                    <span className="font-medium">Duration:</span>
                                    <span>{leave.startTime} - {leave.endTime}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Reason for Leave</h4>
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 leading-relaxed border border-gray-100">
                            {leave.reason}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeaveDetailsModal;
