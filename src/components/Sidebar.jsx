import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FaChevronDown, FaChevronRight, FaChevronUp, FaUserPlus, FaUsers, FaTasks,
    FaComments, FaCog, FaStickyNote, FaThLarge, FaRegClock, FaFileAlt,
    FaShieldAlt, FaRegStickyNote, FaDesktop, FaChartBar, FaSignOutAlt
} from "react-icons/fa";
import { GiFox } from "react-icons/gi";
import axios from "axios";
import { API_URL } from "../utils/config";

const Sidebar = ({ className = "", onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isEmployeeMgmtOpen, setIsEmployeeMgmtOpen] = useState(
        location.pathname.includes("/employee/add") || location.pathname.includes("/employee/edit-role")
    );
    const [isMonitoringOpen, setIsMonitoringOpen] = useState(
        location.pathname.includes("/admin/auto-capture") || location.pathname.includes("/admin/activity-tracking")
    );
    const [isMonitoringReportOpen, setIsMonitoringReportOpen] = useState(
        location.pathname.includes("/admin/monitoring-report")
    );
    const [isSettingsOpen, setIsSettingsOpen] = useState(
        location.pathname.includes("/admin/settings") || location.pathname === "/settings"
    );





    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    const NavLink = ({ to, icon: Icon, name, active, count }) => (
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
            {count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2">
                    {count}
                </span>
            )}
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

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide custom-scrollbar">
                {/* 1. Dashboard */}
                <NavLink
                    to="/dashboard"
                    icon={FaThLarge}
                    name="Dashboard"
                    active={location.pathname === "/dashboard"}
                />

                {/* 2. Task Management */}
                <NavLink
                    to="/admin-tasks"
                    icon={FaTasks}
                    name="Task Management"
                    active={location.pathname === "/admin-tasks"}
                />

                {/* 3. Activity Logs & QT */}
                <NavLink
                    to="/employee-log-time"
                    icon={FaRegClock}
                    name="Activity Logs & QT"
                    active={location.pathname === "/employee-log-time"}
                />

                {/* 4. Office Chat */}
                <NavLink
                    to="/chat"
                    icon={FaComments}
                    name="Office Chat"
                    active={location.pathname.startsWith('/chat')}
                />

                {/* 5. Delegate Work */}
                <NavLink
                    to="/assign-task"
                    icon={FaUserPlus}
                    name="Delegate Work"
                    active={location.pathname === "/assign-task"}
                />



                {/* 7. Credential Vault */}
                <NavLink
                    to="/credentials-vault"
                    icon={FaShieldAlt}
                    name="Credential Vault"
                    active={location.pathname === "/credentials-vault"}
                />

                {/* 8. Discussion Notepad */}
                <NavLink
                    to="/discussion-notepad"
                    icon={FaRegStickyNote}
                    name="Discussion Notepad"
                    active={location.pathname === "/discussion-notepad"}
                />

                {/* 9. Monitoring */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsMonitoringOpen(!isMonitoringOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname.startsWith('/admin/auto-capture') || location.pathname === "/admin/device-ram" || location.pathname.includes('/admin/activity-tracking') || isMonitoringOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaDesktop size={16} className={isMonitoringOpen || location.pathname.startsWith('/admin/auto-capture') || location.pathname === "/admin/device-ram" || location.pathname.includes('/admin/activity-tracking') ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">Monitoring</span>
                        {isMonitoringOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isMonitoringOpen || location.pathname.startsWith('/admin/auto-capture') || location.pathname.includes('/admin/activity-tracking')) && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/admin/auto-capture"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/auto-capture"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Auto Capture</span>
                            </Link>
                            <Link
                                to="/admin/activity-tracking"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/activity-tracking"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Browser Tab History</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* 10. Monitoring Report */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsMonitoringReportOpen(!isMonitoringReportOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname.includes("/admin/monitoring-report") || isMonitoringReportOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaChartBar size={16} className={isMonitoringReportOpen || location.pathname.includes("/admin/monitoring-report") ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">Monitoring Report</span>
                        {isMonitoringReportOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isMonitoringReportOpen || location.pathname.includes("/admin/monitoring-report")) && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/admin/monitoring-report/employee"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/monitoring-report/employee"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Employee Wise Report</span>
                            </Link>
                            <Link
                                to="/admin/monitoring-report/project"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/monitoring-report/project"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Project Wise Report</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* 11. Employee Management */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsEmployeeMgmtOpen(!isEmployeeMgmtOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname.includes("/employee/") || isEmployeeMgmtOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaUsers size={16} className={isEmployeeMgmtOpen || location.pathname.includes("/employee/") ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">Employee Management</span>
                        {isEmployeeMgmtOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isEmployeeMgmtOpen || location.pathname.includes("/employee/")) && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/employee/add"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/employee/add"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Add Employee</span>
                            </Link>
                            <Link
                                to="/employee/edit-role"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/employee/edit-role"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Edit Employee Role</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 uppercase tracking-wider ${location.pathname.includes("/admin/settings") || isSettingsOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <FaCog size={16} className={isSettingsOpen || location.pathname.includes("/admin/settings") ? "text-white" : "text-indigo-400"} />
                        <span className="flex-1 text-left">Settings</span>
                        {isSettingsOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </button>

                    {(isSettingsOpen || location.pathname.includes("/admin/settings")) && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                            <Link
                                to="/admin/settings/employee-login-control"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/settings/employee-login-control"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Employee Login Control</span>
                            </Link>
                            <Link
                                to="/admin/settings/active-control"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/settings/active-control"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Active Control</span>
                            </Link>
                            <Link
                                to="/admin/settings/employee-logs-tasks"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/settings/employee-logs-tasks"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Employee Qt and Task Control</span>
                            </Link>
                            <Link
                                to="/admin/settings/screenshot-control"
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider ${location.pathname === "/admin/settings/screenshot-control"
                                    ? "text-indigo-400 bg-indigo-400/10"
                                    : "text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5"
                                    }`}
                            >
                                <span className="flex-1 text-left">Screenshot Control</span>
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

export default Sidebar;
