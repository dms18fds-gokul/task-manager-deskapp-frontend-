import React from "react";
import { 
    FaTimes, FaCalendarAlt, FaClock, FaInfoCircle, 
    FaBriefcaseMedical, FaCheckCircle, FaExclamationCircle, 
    FaTimesCircle, FaHourglassHalf, FaCalendarDay,
    FaFileAlt, FaUserEdit, FaHistory, FaUserClock, FaQuestionCircle
} from "react-icons/fa";

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
                return { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", icon: <FaHourglassHalf className="animate-pulse" /> };
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
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-2">Leave Category</span>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${leave.leaveCategory === "Day Leave" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                                    {leave.leaveCategory === "Day Leave" ? <FaCalendarDay size={14} /> : <FaClock size={14} />}
                                </div>
                                <p className="text-slate-800 font-black text-sm">{leave.leaveCategory}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-2">Leave Type</span>
                            <p className="text-slate-800 font-black text-sm flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    {leave.leaveType === "Health Issue" ? <FaBriefcaseMedical size={14} /> : 
                                     leave.leaveType === "Events" ? <FaCalendarCheck size={14} /> :
                                     leave.leaveType === "Personal Reasons" ? <FaUserClock size={14} /> :
                                     <FaQuestionCircle size={14} />}
                                </div>
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
