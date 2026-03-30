import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Settings, FileText, Search, AlertCircle, Users, Lock, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/config';

const EmployeeScreenshotControlPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Password Modal State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
    const [selectedToggleType, setSelectedToggleType] = useState('screenshot'); // 'screenshot'
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${API_URL}/employee/all?includeInactiveProfiles=true`);
            setEmployees(res.data);
            setError('');
        } catch (err) {
            setError("Failed to load employees");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActivity = async (employeeId, type, currentStatus) => {
        // If currently true (active), we are trying to deactivate it -> require password
        if (currentStatus === true) {
            const emp = employees.find(e => e.employeeId === employeeId);
            setSelectedEmployeeId(employeeId);
            setSelectedEmployeeName(emp?.name || employeeId);
            setSelectedToggleType(type);
            setIsPasswordModalOpen(true);
            return;
        }

        // If currently false (inactive), we are activating it -> no password required
        executeToggle(employeeId, type, currentStatus);
    };

    const handleConfirmDeactivation = async (e) => {
        e.preventDefault();
        if (!adminPassword.trim()) {
            setPasswordError('Password is required');
            return;
        }

        setIsProcessing(true);
        setPasswordError('');

        // Find current status
        const emp = employees.find(e => e.employeeId === selectedEmployeeId);
        const currentStatus = emp?.screenshotActivity;

        await executeToggle(selectedEmployeeId, 'screenshot', currentStatus ?? true, adminPassword);
    };

    const executeToggle = async (employeeId, type, currentStatus, password = null) => {
        const previousEmployees = [...employees];
        try {
            // Optimistic update
            setEmployees(prev => prev.map(emp => {
                if (emp.employeeId === employeeId) {
                    return { ...emp, screenshotActivity: !currentStatus };
                }
                return emp;
            }));

            const payload = { type };
            if (password) {
                const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
                payload.adminId = adminUser._id || adminUser.id;
                payload.password = password;
            }

            await axios.patch(`${API_URL}/employee/${employeeId}/toggle-specific`, payload);

            if (password) {
                setIsPasswordModalOpen(false);
                setAdminPassword('');
                setSelectedEmployeeId(null);
                setSelectedToggleType(null);
            }
        } catch (err) {
            // Revert on failure
            setEmployees(previousEmployees);

            if (err.response?.status === 401 || err.response?.status === 400 || err.response?.status === 403) {
                setPasswordError(err.response.data.message || "Invalid password");
            } else {
                if (password) {
                    setPasswordError(`Failed to update ${type.toUpperCase()} Activity status`);
                } else {
                    alert(`Failed to update ${type.toUpperCase()} Activity status`);
                }
            }
        } finally {
            if (password) setIsProcessing(false);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Custom Toggle Component matching the requested design and theme
    const ThemeToggle = ({ isActive, onClick, title }) => (
        <button
            onClick={onClick}
            title={title}
            className="relative inline-flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
            style={{ width: '56px', height: '32px' }}
        >
            {/* Track */}
            <div
                className="absolute inset-0 bg-[#e8eaef] rounded-md transition-colors"
                style={{ width: '100%', height: '100%' }}
            />
            {/* Thumb */}
            <div
                className={`absolute left-1 h-6 w-6 rounded-md flex transition-all duration-300 ease-in-out shadow-sm ${isActive ? 'translate-x-6 bg-indigo-600' : 'translate-x-0 bg-white shadow-sm'
                    }`}
            />
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans relative">
            {/* Desktop Sidebar */}
            <Sidebar className="w-64 flex-shrink-0 hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar container */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <Sidebar className="flex h-full shadow-2xl" onClose={() => setIsSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-x-hidden overflow-y-auto w-full flex flex-col">
                {/* Mobile Header */}
                <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Settings className="h-5 w-5" />
                        <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Screenshot Control</h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                {/* Desktop Header Content */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
                    <div className="flex flex-col gap-1 max-w-7xl mx-auto">
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                            <Settings className="h-5 w-5" />
                            <span className="font-semibold text-sm tracking-wide uppercase">Settings</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-indigo-500" />
                            Employee Screenshot Control
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Review and manage automatic screenshot capture access for employees
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-8 max-w-7xl mx-auto">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                        {/* Table Tools */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                            <span className="text-sm font-semibold text-slate-500">
                                Total Employees: <span className="text-indigo-600">{filteredEmployees.length}</span>
                            </span>
                        </div>

                        {/* Data Table */}
                        <div className="overflow-x-auto w-full">
                            {loading ? (
                                <div className="flex justify-center items-center py-20 text-slate-400">
                                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                                            <th className="px-6 py-4 font-bold w-[12%]">Employee ID</th>
                                            <th className="px-6 py-4 font-bold w-[20%]">Full Name</th>
                                            <th className="px-6 py-4 font-bold w-[25%]">Email Address</th>
                                            <th className="px-6 py-4 font-bold w-[25%]">Department</th>
                                            <th className="px-6 py-4 font-bold w-[18%]">Device Serial</th>
                                            <th className="px-6 py-4 font-bold text-center w-[10%]">Screenshot Capture</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map((emp) => (
                                            <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 align-middle">
                                                    <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                        {emp.employeeId}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className="text-sm font-bold text-slate-800">
                                                        {emp.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-middle text-sm text-slate-500 font-medium">
                                                    {emp.email}
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-wrap gap-1">
                                                        {emp.role.map((r, i) => (
                                                            <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        {emp.devices && emp.devices.length > 0 ? (
                                                            emp.devices.map((device, i) => (
                                                                <span key={i} className="text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded tracking-wide truncate max-w-[120px]" title={device}>
                                                                    {device}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No Devices</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Action Columns */}
                                                <td className="px-6 py-4 align-middle text-center">
                                                    <div className="flex justify-center w-full">
                                                        <ThemeToggle
                                                            isActive={emp.screenshotActivity ?? true}
                                                            onClick={() => handleToggleActivity(emp.employeeId, 'screenshot', emp.screenshotActivity ?? true)}
                                                            title={emp.screenshotActivity !== false ? "Capture Active" : "Capture Inactive"}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!loading && filteredEmployees.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="bg-slate-50 rounded-full h-16 w-16 flex items-center justify-center mb-4 border border-slate-100">
                                        <Users className="text-slate-300 h-8 w-8" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-700">No employees found</h3>
                                    <p className="text-slate-400 text-sm mt-1 max-w-sm">No employee records match your search criteria.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Deactivation Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Lock size={18} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Admin Authentication</h3>
                            </div>
                            <button
                                onClick={() => { setIsPasswordModalOpen(false); setPasswordError(''); }}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                You are about to <span className="font-bold text-red-600">deactivate</span> <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">Screenshot Capture</span> for employee <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedEmployeeName}</span>. This action will immediately block their access to these features. Please enter your admin password to confirm.
                            </p>

                            <form onSubmit={handleConfirmDeactivation}>
                                <div className="space-y-2 mb-2">
                                    <label className="text-sm font-semibold text-slate-700">Enter Admin Password</label>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(''); }}
                                        placeholder="••••••••••••"
                                        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:outline-none transition-all ${passwordError ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500/50 focus:border-indigo-500'
                                            }`}
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle size={14} />
                                            {passwordError}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsPasswordModalOpen(false); setPasswordError(''); }}
                                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                        disabled={isProcessing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessing || !adminPassword.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            'Confirm Deactivation'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default EmployeeScreenshotControlPage;
