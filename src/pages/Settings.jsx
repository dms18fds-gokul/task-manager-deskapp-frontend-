import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmployeeSidebar from '../components/EmployeeSidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Shield, Smartphone, Globe } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(
        localStorage.getItem('desktopNotifications') !== 'false'
    );

    const handleToggleNotifications = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        localStorage.setItem('desktopNotifications', newValue.toString());
    };

    const isAdmin = user?.role?.includes('Admin') || user?.role?.includes('Super Admin');

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative">
            {/* Desktop Sidebar */}
            {isAdmin ? <Sidebar className="hidden md:flex" /> : <EmployeeSidebar className="hidden md:flex" />}

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        {isAdmin ? (
                            <Sidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        ) : (
                            <EmployeeSidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Settings</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-full">
                    <div className="bg-white border-b border-slate-200 px-8 py-6">
                    <div className="flex flex-col gap-1 max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                            <Bell className="h-5 w-5" />
                            <span className="font-semibold text-sm tracking-wide uppercase">Preferences</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                            Notification Settings
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Manage your application preferences and notification settings.
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-4 sm:p-6 lg:p-8 w-full max-w-3xl mx-auto">
                    <div className="space-y-6">
                        {/* Notification Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-indigo-500" /> Notifications
                                </h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700">Desktop Notifications</h3>
                                        <p className="text-xs text-slate-500 mt-1">Receive real-time alerts on your desktop for approvals and messages.</p>
                                    </div>
                                    <button
                                        onClick={handleToggleNotifications}
                                        className="relative inline-flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
                                        style={{ width: '56px', height: '32px' }}
                                    >
                                        <div
                                            className={`absolute inset-0 rounded-full transition-colors ${notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                        <div
                                            className={`absolute h-6 w-6 rounded-full bg-white transition-all duration-300 ease-in-out shadow-md ${notificationsEnabled ? 'translate-x-3' : '-translate-x-3'}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* App Information Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-indigo-500" /> App Information
                                </h2>
                            </div>
                            <div className="p-6 space-y-4 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-slate-500 font-medium italic">Version</span>
                                    <span className="text-slate-800 font-bold">1.0.0</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="text-slate-500 font-medium italic">Environment</span>
                                    <span className="text-slate-800 font-bold">Production (Electron)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default Settings;
