import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FaComments, FaBell, FaChevronDown, FaChevronRight, FaFileAlt,
    FaThLarge, FaTasks, FaRegClock, FaRegStickyNote, FaUserPlus,
    FaShieldAlt, FaPlaneDeparture, FaCog, FaSignOutAlt, FaHistory, FaVolumeUp, FaBook
} from "react-icons/fa";
import { GiFox } from "react-icons/gi";
import axios from "axios";
import { API_URL } from "../utils/config";

const EmployeeSidebar = ({ className = "", onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname === "/change-password" || location.pathname === "/guide" || location.pathname === "/settings");
    const [user, setUser] = useState(null);
    const [unreadDocApprovalCount, setUnreadDocApprovalCount] = useState(0);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await axios.get(`${API_URL}/notifications`, {
                    headers: { "x-auth-token": token }
                });
                const docApprovals = res.data.filter(n => !n.isRead && (n.type === "approval" || n.type === "rejection"));
                setUnreadDocApprovalCount(docApprovals.length);
            } catch (error) {
            }
        };

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            fetchNotifications();
        }
    }, [location.pathname]);

    const hasTaskAccess = user?.taskActivity !== false || user?.role === "Super Admin";
    const hasQTAccess = user?.qtActivity !== false || user?.role === "Super Admin";

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    const NavLink = ({ to, icon: Icon, name, active }) => (
        <Link
            to={to}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${active
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
        >
            <Icon size={16} className={active ? "text-white" : "text-indigo-400"} />
            <span className="flex-1">{name}</span>
        </Link>
    );

    return (
        <div className={`w-72 bg-[#0F172A] border-r border-slate-800 text-white flex flex-col h-screen ${className}`}>
            <div className="p-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <GiFox className="text-white text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-widest uppercase">FOX TASK</h1>
                        <p className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] uppercase">Manager</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar scrollbar-hide">
                {/* 1. DASHBOARD */}
                <NavLink
                    to="/employee-dashboard"
                    icon={FaThLarge}
                    name="DASHBOARD"
                    active={location.pathname === "/employee-dashboard"}
                />

                {/* 2. TASK MANAGEMENT */}
                {hasTaskAccess && (
                    <NavLink
                        to="/employee-tasks"
                        icon={FaTasks}
                        name="TASK MANAGEMENT"
                        active={location.pathname === "/employee-tasks"}
                    />
                )}

                {/* 3. OFFICE CHAT */}
                <NavLink
                    to="/chat"
                    icon={FaComments}
                    name="OFFICE CHAT"
                    active={location.pathname.startsWith('/chat')}
                />

                {/* 4. LOG TIME & QT */}
                {hasQTAccess && (
                    <NavLink
                        to="/log-time"
                        icon={FaRegClock}
                        name="LOG TIME & QT"
                        active={location.pathname === "/log-time"}
                    />
                )}


                {/* 5. DISCUSSION NOTEPAD */}
                <NavLink
                    to="/discussion-notepad"
                    icon={FaRegStickyNote}
                    name="DISCUSSION NOTEPAD"
                    active={location.pathname === "/discussion-notepad"}
                />

                {/* 6. DELEGATE WORK (Assign Task) */}
                {hasTaskAccess && (
                    <NavLink
                        to="/employee/assign-task"
                        icon={FaUserPlus}
                        name="DELEGATE WORK"
                        active={location.pathname === "/employee/assign-task"}
                    />
                )}

                {/* 7. CREDENTIALS VAULT */}
                <NavLink
                    to="/credentials-vault"
                    icon={FaShieldAlt}
                    name="CREDENTIALS VAULT"
                    active={location.pathname === "/credentials-vault"}
                />

                {/* 8. LEAVE REQUISITION (Apply for Leave) */}
                <NavLink
                    to="/apply-leave"
                    icon={FaPlaneDeparture}
                    name="LEAVE REQUISITION"
                    active={location.pathname === "/apply-leave"}
                />

                {/* 9. NOTIFICATIONS */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname === "/employee/document-approvals" || isNotificationsOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaBell size={16} className={isNotificationsOpen || location.pathname === "/employee/document-approvals" ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">NOTIFICATIONS</span>
                        {isNotificationsOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isNotificationsOpen || location.pathname === "/employee/document-approvals") && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/employee/document-approvals"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/employee/document-approvals"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <FaFileAlt size={12} />
                                <span className="flex-1 text-left">Document Approval</span>
                                {unreadDocApprovalCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {unreadDocApprovalCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    )}
                </div>

                {/* 10. SETTINGS */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname === "/change-password" || isSettingsOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaCog size={16} className={isSettingsOpen || location.pathname === "/change-password" ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">SETTINGS</span>
                        {isSettingsOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isSettingsOpen || location.pathname === "/change-password") && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/change-password"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/change-password"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Change Password</span>
                            </Link>
                            <Link
                                to="/guide"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/guide"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Guide</span>
                            </Link>
                            <Link
                                to="/settings"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/settings"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Notification Settings</span>
                            </Link>
                        </div>
                    )}
                </div>
            </nav>

            <div className="p-6 border-t border-slate-800 bg-[#0F172A]">
                <button
                    onClick={handleLogout}
                    className="group w-full flex items-center justify-center gap-3 px-4 py-3 text-xs font-black text-rose-400 bg-rose-400/10 rounded-xl hover:bg-rose-400/20 transition-all duration-300 uppercase tracking-widest border border-rose-400/20"
                >
                    <FaSignOutAlt className="group-hover:-translate-x-1 transition-transform" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default EmployeeSidebar;
