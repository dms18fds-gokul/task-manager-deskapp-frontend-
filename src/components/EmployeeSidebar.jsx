import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaComments } from "react-icons/fa"; // Import Icon
import ChatPopup from "./chat/ChatPopup"; // Import Popup

const EmployeeSidebar = ({ className = "" }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isChatOpen, setIsChatOpen] = useState(false); // Chat State
    const [user, setUser] = useState(null);

    React.useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [location]);

    // Default all true if not explicitly set to false (backward compatibility)
    const hasTaskAccess = user?.taskActivity !== false || user?.role === "Super Admin";
    const hasQTAccess = user?.qtActivity !== false || user?.role === "Super Admin";

    const menuItems = [
        { name: "Dashboard", path: "/employee-dashboard", active: location.pathname === "/employee-dashboard", show: true },
        { name: "Task Page", path: "/employee-tasks", active: location.pathname === "/employee-tasks", show: hasTaskAccess },
        { name: "Log Time & QT", path: "/log-time", active: location.pathname === "/log-time", show: hasQTAccess },
        { name: "Apply for Leave", path: "/apply-leave", active: location.pathname === "/apply-leave", show: true },
        { name: "Assign Task", path: "/employee-task-assignment", active: location.pathname === "/employee-task-assignment", show: hasTaskAccess },
        { name: "Assigned Task", path: "/assigned-tasks", active: location.pathname === "/assigned-tasks", show: hasTaskAccess }, // Added
        { name: "Credentials Vault", path: "/credentials-vault", active: location.pathname === "/credentials-vault", show: true },
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
