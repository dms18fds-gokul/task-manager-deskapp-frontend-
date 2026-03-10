import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaComments, FaBell, FaChevronDown, FaChevronRight, FaFileAlt } from "react-icons/fa"; // Import Icon
import ChatPopup from "./chat/ChatPopup"; // Import Popup
import axios from "axios";
import { API_URL } from "../utils/config";

const EmployeeSidebar = ({ className = "" }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isChatOpen, setIsChatOpen] = useState(false); // Chat State
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Notifications dropdown state
    const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname === "/change-password"); // Settings dropdown state
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

                // Assuming document approval notifications are unread and exist
                // Users might have other types, filter relevant ones based on format
                const docApprovals = res.data.filter(n => !n.isRead && (n.type === "approval" || n.type === "rejection"));
                setUnreadDocApprovalCount(docApprovals.length);
            } catch (error) {
                console.error("Error fetching notifications for sidebar:", error);
            }
        };

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            fetchNotifications();
        }
    }, [location.pathname]);

    // Default all true if not explicitly set to false (backward compatibility)
    const hasTaskAccess = user?.taskActivity !== false || user?.role === "Super Admin";
    const hasQTAccess = user?.qtActivity !== false || user?.role === "Super Admin";

    const menuItems = [
        { name: "Dashboard", path: "/employee-dashboard", active: location.pathname === "/employee-dashboard", show: true },
        { name: "Task Page", path: "/employee-tasks", active: location.pathname === "/employee-tasks", show: hasTaskAccess },
        { name: "Log Time & QT", path: "/log-time", active: location.pathname === "/log-time", show: hasQTAccess },
        { name: "Apply for Leave", path: "/apply-leave", active: location.pathname === "/apply-leave", show: true },
        { name: "Assign Task", path: "/employee/assign-task", active: location.pathname === "/employee/assign-task", show: hasTaskAccess },
        { name: "Assigned Task", path: "/assigned-tasks", active: location.pathname === "/assigned-tasks", show: hasTaskAccess }, // Added
        { name: "Credentials Vault", path: "/credentials-vault", active: location.pathname === "/credentials-vault", show: true },
        { name: "Discussion Notepad", path: "/discussion-notepad", active: location.pathname === "/discussion-notepad", show: true },
        // { name: "Office Chat", path: "/chat", active: location.pathname === "/chat" }, // Removed from map
    ].filter(item => item.show);

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    return (
        <div className={`w-64 bg-slate-900 text-white flex flex-col h-screen ${className}`}>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-indigo-400 tracking-wide">UserPanel</h1>
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
                        {item.name}
                    </Link>
                ))}

                {/* Notifications Dropdown */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/employee/document-approvals" || isNotificationsOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                    >
                        <span className="flex-1 text-left">Notifications</span>
                        <div className="flex items-center gap-2">
                            {isNotificationsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                        </div>
                    </button>

                    {/* Dropdown Items */}
                    {(isNotificationsOpen || location.pathname === "/employee/document-approvals") && (
                        <div className="pl-6 space-y-1 animate-fade-in">
                            <Link
                                to="/employee/document-approvals"
                                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/employee/document-approvals"
                                    ? "bg-indigo-600/20 text-indigo-400"
                                    : "text-slate-400 hover:bg-indigo-600/10 hover:text-indigo-400"
                                    }`}
                            >
                                <span className="flex-1 text-left">Document Approval</span>
                                {unreadDocApprovalCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                        {unreadDocApprovalCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Settings Dropdown */}
                <div className="space-y-1">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/change-password" || isSettingsOpen
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                    >
                        <span className="flex-1 text-left">Settings</span>
                        <div className="flex items-center gap-2">
                            {isSettingsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                        </div>
                    </button>

                    {/* Dropdown Items */}
                    {(isSettingsOpen || location.pathname === "/change-password") && (
                        <div className="pl-6 space-y-1 animate-fade-in">
                            <Link
                                to="/change-password"
                                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === "/change-password"
                                    ? "bg-indigo-600/20 text-indigo-400"
                                    : "text-slate-400 hover:bg-indigo-600/10 hover:text-indigo-400"
                                    }`}
                            >
                                <span className="flex-1 text-left">Change Password</span>
                            </Link>
                        </div>
                    )}
                </div>

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

export default EmployeeSidebar;
