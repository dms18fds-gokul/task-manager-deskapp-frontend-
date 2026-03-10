import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaChevronDown, FaChevronUp, FaUserPlus, FaUserEdit, FaTasks, FaComments, FaCog } from "react-icons/fa";
import ChatPopup from "./chat/ChatPopup"; // Import Popup

import axios from "axios";
import { API_URL } from "../utils/config";

const Sidebar = ({ className = "" }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isEmployeeMgmtOpen, setIsEmployeeMgmtOpen] = useState(
        location.pathname.includes("/employee/add") || location.pathname.includes("/employee/edit-role")
    );
    const [isMonitoringOpen, setIsMonitoringOpen] = useState(
        location.pathname.includes("/admin/auto-capture")
    );
    const [isMonitoringReportOpen, setIsMonitoringReportOpen] = useState(
        location.pathname.includes("/admin/monitoring-report")
    );
    const [isSettingsOpen, setIsSettingsOpen] = useState(
        location.pathname.includes("/admin/settings")
    );
    const [isChatOpen, setIsChatOpen] = useState(false); // Chat State

    const [pendingDocCount, setPendingDocCount] = useState(0);

    React.useEffect(() => {
        const fetchPendingRequests = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await axios.get(`${API_URL}/download-requests`, {
                    headers: { "x-auth-token": token }
                });
                const pendingCount = res.data.filter(req => req.status === "Pending").length;
                setPendingDocCount(pendingCount);
            } catch (error) {
                console.error("Error fetching download requests for sidebar:", error);
            }
        };

        fetchPendingRequests();
    }, [location.pathname]); // Refetch when route changes mildly or could set interval instead

    const menuItems = [
        { name: "Dashboard", path: "/dashboard", active: location.pathname === "/dashboard" },
        { name: "Assign Task", path: "/assign-task", icon: <FaTasks />, active: location.pathname === "/assign-task" },
        { name: "Tasks", path: "/admin-tasks", active: location.pathname === "/admin-tasks" },
        { name: "Documents Approval", path: "/admin/documents-approval", active: location.pathname === "/admin/documents-approval" },
        { name: "Work Logs & QT", path: "/employee-log-time", active: location.pathname === "/employee-log-time" },
        { name: "Credentials Vault", path: "/credentials-vault", active: location.pathname === "/credentials-vault" },
        { name: "RAM and Usage", path: "/admin/ram-usage", active: location.pathname === "/admin/ram-usage" },
        { name: "Device and RAM", path: "/admin/device-ram", active: location.pathname === "/admin/device-ram" },
        { name: "Discussion Notepad", path: "/discussion-notepad", active: location.pathname === "/discussion-notepad" },
    ];

    const employeeSubItems = [
        { name: "Add Employee", path: "/employee/add", active: location.pathname === "/employee/add" },
        { name: "Edit Employee Role", path: "/employee/edit-role", active: location.pathname === "/employee/edit-role" },
    ];

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    return (
        <div className={`w-64 bg-slate-900 text-white flex flex-col h-screen ${className}`}>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-indigo-400 tracking-wide">AdminPanel</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => (
                    <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${item.active
                            ? "bg-indigo-600 text-white shadow-lg"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                    >
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.name === "Documents Approval" && pendingDocCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                {pendingDocCount}
                            </span>
                        )}
                    </Link>
                ))}

                {/* Office Chat Link */}
                <Link
                    to="/chat"
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${location.pathname.startsWith('/chat')
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                >
                    <span className="flex-1 text-left">Office Chat</span>
                    <FaComments size={16} />
                </Link>





                {/* Employee Management Section */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsEmployeeMgmtOpen(!isEmployeeMgmtOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <span>Employee Management</span>
                        {isEmployeeMgmtOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>

                    {isEmployeeMgmtOpen && (
                        <div className="ml-4 space-y-1">
                            {employeeSubItems.map((subItem) => (
                                <Link
                                    key={subItem.name}
                                    to={subItem.path}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${subItem.active
                                        ? "text-indigo-400 bg-slate-800"
                                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                                        }`}
                                >
                                    {subItem.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Monitoring Section */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsMonitoringOpen(!isMonitoringOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <span>Monitoring</span>
                        {isMonitoringOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>

                    {isMonitoringOpen && (
                        <div className="ml-4 space-y-1">
                            <Link
                                to="/admin/auto-capture"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/auto-capture"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Auto Capture
                            </Link>
                        </div>
                    )}
                </div>

                {/* Monitoring Report Section */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsMonitoringReportOpen(!isMonitoringReportOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <span>Monitoring Report</span>
                        {isMonitoringReportOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>

                    {isMonitoringReportOpen && (
                        <div className="ml-4 space-y-1">
                            <Link
                                to="/admin/monitoring-report/employee"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/monitoring-report/employee"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Employee Wise Report
                            </Link>
                            <Link
                                to="/admin/monitoring-report/project"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/monitoring-report/project"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Project Wise Report
                            </Link>
                        </div>
                    )}
                </div>

                {/* Settings Section */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span>Settings</span>
                        </div>
                        {isSettingsOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </button>

                    {isSettingsOpen && (
                        <div className="ml-4 space-y-1">
                            <Link
                                to="/admin/settings/employee-login-control"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/settings/employee-login-control"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Employee Login Control
                            </Link>

                            <Link
                                to="/admin/settings/employee-logs-tasks"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/settings/employee-logs-tasks"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Employee Qt and Task Control
                            </Link>

                            <Link
                                to="/admin/settings/screenshot-control"
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/admin/settings/screenshot-control"
                                    ? "text-indigo-400 bg-slate-800"
                                    : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                Screenshot Control
                            </Link>

                        </div>
                    )}
                </div>
            </nav>

            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors"
                >
                    Logout
                </button>
            </div>
        </div >
    );
};

export default Sidebar;
