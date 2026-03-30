import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { FaGripHorizontal, FaTimes } from 'react-icons/fa';

const FloatingActionButtons = () => {
    const location = useLocation();
    const { openForm } = useUI();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);

    // Hide for Admin users
    const isAdmin = user?.role === "Super Admin" || (Array.isArray(user?.role) && user?.role.includes("Super Admin")) || user?.role === "Admin" || (Array.isArray(user?.role) && user?.role.includes("Admin"));
    if (isAdmin) return null;

    // Hide buttons on auth pages, root, and all chat pages
    const hideOnRoutes = ['/login', '/signup', '/'];
    if (hideOnRoutes.includes(location.pathname) || location.pathname.startsWith('/chat')) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col gap-4 z-[60] items-end pointer-events-none">
            {/* Action Buttons Group */}
            <div className={`flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
                }`}>
                {/* MT Button */}
                <div className="flex items-center gap-3 group cursor-pointer justify-end" onClick={() => openForm('MT')}>
                    <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Main Task</span>
                    <button className="w-10 h-10 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200/50 flex items-center justify-center font-bold text-[10px] transform transition-all duration-300 hover:scale-115 hover:rotate-6 hover:shadow-indigo-300/50 active:scale-90">
                        MT
                    </button>
                </div>
                {/* QT Button */}
                <div className="flex items-center gap-3 group cursor-pointer justify-end" onClick={() => openForm('QT')}>
                    <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Quick Task</span>
                    <button className="w-10 h-10 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-200/50 flex items-center justify-center font-bold text-[10px] transform transition-all duration-300 hover:scale-115 hover:-rotate-6 hover:shadow-purple-300/50 active:scale-90">
                        QT
                    </button>
                </div>
                {/* MEET Button */}
                <div className="flex items-center gap-3 group cursor-pointer justify-end" onClick={() => openForm('Meeting')}>
                    <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Meeting</span>
                    <button className="w-10 h-10 rounded-full bg-teal-600 text-white shadow-lg shadow-teal-200/50 flex items-center justify-center font-bold text-[10px] transform transition-all duration-300 hover:scale-115 hover:rotate-6 hover:shadow-teal-300/50 active:scale-90">
                        MEET
                    </button>
                </div>
                {/* RT Button */}
                <div className="flex items-center gap-3 group cursor-pointer justify-end" onClick={() => openForm('RT')}>
                    <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Recurring Task</span>
                    <button className="w-10 h-10 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-200/50 flex items-center justify-center font-bold text-[10px] transform transition-all duration-300 hover:scale-115 hover:-rotate-6 hover:shadow-rose-300/50 active:scale-90">
                        RT
                    </button>
                </div>
            </div>

            {/* Master Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 pointer-events-auto ${isOpen
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 rotate-[90deg] rounded-full'
                        : 'bg-[#1e293b] text-white hover:bg-slate-800 scale-100 hover:scale-105 shadow-slate-900/20'
                    } active:scale-90`}
                title={isOpen ? "Collapse Menu" : "Expand Menu"}
            >
                {isOpen ? <FaTimes size={18} /> : <FaGripHorizontal size={20} className="group-hover:rotate-12 transition-transform duration-300" />}
            </button>
        </div>
    );
};

export default FloatingActionButtons;
