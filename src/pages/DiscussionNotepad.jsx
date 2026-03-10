import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { FaEdit, FaSave, FaTrash, FaStickyNote } from "react-icons/fa";

const DiscussionNotepad = () => {
    const [notes, setNotes] = useState("");
    const [user, setUser] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Load notes from localStorage based on user ID
            const savedNotes = localStorage.getItem(`discussion_notes_${parsedUser.id || parsedUser._id}`);
            if (savedNotes) {
                setNotes(savedNotes);
            }
        }
    }, []);

    const handleNotesChange = (e) => {
        const val = e.target.value;
        setNotes(val);
        // Auto-save to localStorage
        if (user) {
            localStorage.setItem(`discussion_notes_${user.id || user._id}`, val);
        }
    };

    const clearNotes = () => {
        if (window.confirm("Are you sure you want to clear all notes?")) {
            setNotes("");
            if (user) {
                localStorage.removeItem(`discussion_notes_${user.id || user._id}`);
            }
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const isAdmin = user.role === "Super Admin" || (Array.isArray(user.role) && user.role.includes("Super Admin"));

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans relative">
            {/* Desktop Sidebar */}
            {isAdmin ? (
                <Sidebar className="hidden md:flex" />
            ) : (
                <EmployeeSidebar className="hidden md:flex" />
            )}

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute inset-y-0 left-0 z-50">
                        {isAdmin ? (
                            <Sidebar className="flex h-full shadow-xl" />
                        ) : (
                            <EmployeeSidebar className="flex h-full shadow-xl" />
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header (Mobile toggle & Page Title) */}
                <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden text-gray-600 focus:outline-none p-2 rounded hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FaStickyNote className="text-indigo-600" />
                            Discussion Notepad
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearNotes}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Clear Notes"
                        >
                            <FaTrash size={18} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-hidden flex flex-col">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FaEdit /> Write your discussion notes below
                            </span>
                            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded">
                                AUTO-SAVING
                            </span>
                        </div>
                        <textarea
                            value={notes}
                            onChange={handleNotesChange}
                            placeholder="Type your notes here... They will be saved automatically as you type."
                            className="flex-1 p-6 outline-none text-gray-700 leading-relaxed resize-none text-lg font-medium placeholder-gray-300 custom-scrollbar"
                        />
                    </div>
                    <p className="mt-4 text-xs text-gray-400 text-center italic">
                        Notes are stored locally on this browser.
                    </p>
                </main>
            </div>
        </div>
    );
};

export default DiscussionNotepad;
