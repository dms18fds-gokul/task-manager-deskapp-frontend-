import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/config';
import { FaDesktop, FaUser, FaClock, FaExpand, FaSync, FaArrowLeft, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TableLoader from '../components/TableLoader';
import CustomDropdown from '../components/CustomDropdown';

const AutoCapturePage = () => {
    const [screenshots, setScreenshots] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedShot, setSelectedShot] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [failedImages, setFailedImages] = useState({});

    // Filter State
    const [filters, setFilters] = useState({
        dateFilter: "Particular Date",
        fromDate: "2026-03-25",
        toDate: "2026-03-25",
        time: "", // Using 'time' as 'fromTime' for backend compatibility
        toTime: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        dateFilter: "Particular Date",
        fromDate: "2026-03-25",
        toDate: "2026-03-25",
        time: "",
        toTime: ""
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await axios.get(`${API_URL}/employee/all`);
                setEmployees(res.data);
            } catch (err) {
                console.error("Failed to fetch employees", err);
            }
        };
        fetchEmployees();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSafeString = (val) => Array.isArray(val) ? val.join(', ') : (val || '');

    const filteredEmployees = employees.filter(emp => {
        const query = searchQuery.toLowerCase();
        const dept = getSafeString(emp.department);
        const role = getSafeString(emp.role);
        const desig = getSafeString(emp.designation);
        const deptStr = dept || role || desig || 'No Dept';

        const fullString = `${emp.name} – ${deptStr} – ${emp.employeeId}`.toLowerCase();
        return (
            fullString.includes(query) ||
            (emp.name || '').toLowerCase().includes(query) ||
            (emp.employeeId || '').toLowerCase().includes(query) ||
            dept.toLowerCase().includes(query) ||
            role.toLowerCase().includes(query) ||
            desig.toLowerCase().includes(query)
        );
    });

    const isShotMatchingSearch = (shot, query) => {
        if (!query) return true;
        const q = query.toLowerCase();
        let searchId = q;
        if (q.includes('–') || q.includes('-')) {
            const parts = q.split(/–|-/);
            searchId = parts[parts.length - 1].trim(); 
        }

        const eName = (shot.employeeName || '').toLowerCase();
        const eId = (shot.employeeId || '').toLowerCase();
        const device = (shot.deviceSerial || '').toLowerCase();

        return eName.includes(searchId) || eId.includes(searchId) || device.includes(searchId) ||
               eName.includes(q) || eId.includes(q) || device.includes(q);
    };

    const baseUrl = API_URL.replace('/api', '');

    // Grouping Logic
    // Using a Map to keep only the newest screenshot per device since the array is sorted newest first.
    const groupedDevices = new Map();
    screenshots.forEach(shot => {
        if (!groupedDevices.has(shot.deviceSerial)) {
            groupedDevices.set(shot.deviceSerial, shot);
        }
    });

    const latestDeviceShots = Array.from(groupedDevices.values());

    // Filtered specific view
    // Since the backend handles the filtering, we just map them when viewing a specific device
    const specificDeviceShots = selectedDevice
        ? screenshots.filter(shot => shot.deviceSerial === selectedDevice)
        : [];

    const finalSpecificDeviceShots = specificDeviceShots.filter(shot => isShotMatchingSearch(shot, submittedSearchQuery));
    const finalLatestDeviceShots = latestDeviceShots.filter(shot => isShotMatchingSearch(shot, submittedSearchQuery));

    const deviceEmployeeInfo = finalSpecificDeviceShots.find(shot => shot.employeeName || shot.employeeId) || {};

    // Robustly find the role from the employees list if not in shot data
    const matchedEmployee = employees.find(e => e.employeeId === deviceEmployeeInfo.employeeId);
    const displayRole = matchedEmployee?.role || (Array.isArray(deviceEmployeeInfo.user?.role) ? deviceEmployeeInfo.user.role.join(", ") : deviceEmployeeInfo.user?.role);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSubmittedSearchQuery(searchQuery);
        setIsDropdownOpen(false);
    };

    useEffect(() => {
        fetchScreenshots();
    }, [appliedFilters, selectedDevice]);

    const fetchScreenshots = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const token = localStorage.getItem('token');
            // Only apply the extensive date/time filters if we are viewing a specific device.
            // When viewing the global overview, we want to see the latest for ALL devices regardless of these UI filters.
            let queryParams = "";
            if (selectedDevice) {
                queryParams = `?${new URLSearchParams(appliedFilters).toString()}&deviceSerial=${selectedDevice}`;
            }

            const response = await axios.get(`${API_URL}/sessions/all-screenshots${queryParams}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setScreenshots(response.data);
            setFailedImages({}); // Reset fallback state on new fetch
        } catch (error) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const handleApplyFilters = () => {
        setAppliedFilters({ ...filters });
    };

    const handleNavigate = (direction) => {
        if (!selectedShot) return;
        
        const currentList = finalSpecificDeviceShots;
        if (!currentList.length) return;

        const currentIndex = currentList.findIndex(s => s._id === selectedShot._id);
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % currentList.length;
        } else {
            newIndex = (currentIndex - 1 + currentList.length) % currentList.length;
        }
        
        setSelectedShot(currentList[newIndex]);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedShot) return;
            if (e.key === 'ArrowRight') handleNavigate('next');
            if (e.key === 'ArrowLeft') handleNavigate('prev');
            if (e.key === 'Escape') setSelectedShot(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedShot, finalSpecificDeviceShots]);


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

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

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight font-sans">Monitoring</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-6 text-slate-800 relative custom-scrollbar">
                    <div className="max-w-7xl mx-auto">

                        {/* Header Top Bar */}
                        <div className="flex flex-col gap-8 mb-10">
                            {selectedDevice ? (
                                /* --- DEVICE DETAILS HEADER (MULTIPLE ROWS) --- */
                                <div className="space-y-6">
                                    {/* ROW 1: LEFT (TITLE+ID+ROLE) | RIGHT (DEVICE ID) */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setSelectedDevice(null)}
                                                    className="bg-white text-slate-500 hover:text-indigo-600 transition-all p-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md active:scale-95"
                                                    title="Back to Devices"
                                                >
                                                    <FaArrowLeft size={18} />
                                                </button>
                                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none whitespace-nowrap">
                                                    <span className="text-indigo-600">{deviceEmployeeInfo.employeeName ? deviceEmployeeInfo.employeeName.toUpperCase() : 'UNKNOWN'}</span>’S <span className="text-slate-400 font-bold">AUTO CAPTURES</span>
                                                </h1>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                {deviceEmployeeInfo.employeeId && (
                                                    <div className="bg-indigo-50 border border-indigo-100 flex items-center px-3 py-1.5 rounded-lg text-indigo-700 font-bold text-sm shadow-sm whitespace-nowrap">
                                                        <FaUser className="mr-2 opacity-50" size={12} />
                                                        {deviceEmployeeInfo.employeeId}
                                                    </div>
                                                )}
                                                {displayRole && (
                                                    <div className="uppercase bg-amber-50 border border-amber-100 flex items-center px-4 py-1.5 rounded-lg text-amber-700 font-bold text-sm shadow-sm whitespace-nowrap">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                                                        {displayRole}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center self-start md:self-auto">
                                            <div className="bg-slate-100 border border-slate-200 flex items-center px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs shadow-inner">
                                                <FaDesktop className="mr-2 opacity-50" size={12} />
                                                <span className="font-mono tracking-wider">DEVICE ID: {selectedDevice}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ROW 3: DATE/TIME FILTERS */}
                                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap items-end gap-5">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Filter Type</label>
                                                <CustomDropdown
                                                    options={[
                                                        { label: 'Today', value: 'Today' },
                                                        { label: 'Last 7 days', value: 'Last 7 days' },
                                                        { label: 'Last 30 days', value: 'Last 30 days' },
                                                        { label: 'Particular Date', value: 'Particular Date' },
                                                        { label: 'Particular Date with Time', value: 'Particular Date with Time' }
                                                    ]}
                                                    value={filters.dateFilter}
                                                    onChange={(val) => setFilters({ ...filters, dateFilter: val })}
                                                    className="w-full"
                                                />
                                            </div>

                                            {(filters.dateFilter === 'Particular Date' || filters.dateFilter === 'Particular Date with Time') && (
                                                <>
                                                    <div className="flex-1 min-w-[160px]">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">From Date</label>
                                                        <div className="relative group">
                                                            <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                                            <input
                                                                type="date"
                                                                value={filters.fromDate}
                                                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-[160px]">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">To Date</label>
                                                        <div className="relative group">
                                                            <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                                            <input
                                                                type="date"
                                                                value={filters.toDate}
                                                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700"
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {filters.dateFilter === 'Particular Date with Time' && (
                                                <>
                                                    <div className="flex-1 min-w-[140px]">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">From Time</label>
                                                        <div className="relative group">
                                                            <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                                            <input
                                                                type="time"
                                                                value={filters.time}
                                                                onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700 hover:border-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-[140px]">
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">To Time</label>
                                                        <div className="relative group">
                                                            <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                                            <input
                                                                type="time"
                                                                value={filters.toTime}
                                                                onChange={(e) => setFilters({ ...filters, toTime: e.target.value })}
                                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700 hover:border-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div className="flex items-center gap-3 h-[44px]">
                                                <button
                                                    onClick={handleApplyFilters}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <FaSync className={refreshing ? "animate-spin" : ""} size={14} />
                                                    <span>APPLY FILTERS</span>
                                                </button>
                                                <button
                                                    onClick={() => fetchScreenshots(true)}
                                                    className="bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 p-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                    title="Refresh Feed"
                                                    disabled={refreshing || loading}
                                                >
                                                    <FaSync className={`${refreshing ? 'animate-spin' : ''}`} size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* --- GLOBAL MONITORING HEADER --- */
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex-1">
                                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 group">
                                            Real-time <span className="text-indigo-600">Monitoring</span>
                                        </h1>
                                        <p className="mt-2 text-slate-500 font-medium tracking-wide">Live feed of all auto captured screenshots across devices.</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                        <div className="relative w-full sm:w-80" ref={dropdownRef}>
                                            <form onSubmit={handleSearchSubmit} className="flex w-full items-center bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-indigo-500 transition-all duration-300 overflow-hidden pl-2 pr-1.5 py-1.5 relative z-20">
                                                <div className="pl-3 pr-2 flex items-center pointer-events-none">
                                                    <Search className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 outline-none sm:text-sm font-medium px-2"
                                                    placeholder="Search Employee..."
                                                    value={searchQuery}
                                                    onChange={(e) => {
                                                        setSearchQuery(e.target.value);
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    onClick={() => setIsDropdownOpen(true)}
                                                />
                                                <button type="submit" className="px-5 py-1.5 text-sm font-bold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all">Search</button>
                                            </form>

                                            {isDropdownOpen && employees.length > 0 && (
                                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-80 overflow-y-auto custom-scrollbar">
                                                    {filteredEmployees.length > 0 ? (
                                                        filteredEmployees.map((emp) => (
                                                            <div
                                                                key={emp._id}
                                                                className="px-5 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors flex items-center gap-3"
                                                                onClick={() => {
                                                                    setSearchQuery(`${emp.name} – ${emp.employeeId}`);
                                                                    setSubmittedSearchQuery(`${emp.name} – ${emp.employeeId}`);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                            >
                                                                <span className="font-bold text-slate-800 text-sm whitespace-nowrap">{emp.name}</span>
                                                                <span className="text-slate-500 font-mono text-xs">{emp.employeeId}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-5 text-center text-slate-400 text-sm">No results</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => fetchScreenshots(true)}
                                            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all shadow-sm active:scale-95"
                                            title="Refresh"
                                            disabled={refreshing || loading}
                                        >
                                            <FaSync className={`${refreshing ? 'animate-spin' : ''}`} size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <TableLoader />
                        ) : screenshots.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <FaDesktop className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">No screenshots found</h3>
                                <p className="mt-1 text-slate-500">Auto captures will appear here once tracked devices upload them.</p>
                            </div>
                        ) : selectedDevice ? (
                            /* Specific Device View */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {finalSpecificDeviceShots.map((shot) => (
                                    <div key={shot._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                                        <div className="relative aspect-video group cursor-pointer bg-slate-900" onClick={() => setSelectedShot(shot)}>
                                            <img
                                                src={
                                                    (() => {
                                                        const cleanUrl = (shot.url || '').replace(/\\/g, '/');
                                                        const parts = cleanUrl.split('/');
                                                        const screenIdx = parts.indexOf('Screenshots');
                                                        
                                                        if (screenIdx !== -1 && screenIdx < parts.length - 1) {
                                                            const subPaths = parts.slice(screenIdx + 1, -1).map(p => encodeURIComponent(p)).join('/');
                                                            const filename = parts[parts.length - 1];
                                                            return `${baseUrl}/files/FdsTaskManager/Screenshots/${subPaths ? subPaths + '/' : ''}${filename}`;
                                                        }
                                                        return `${baseUrl}${shot.url}`;
                                                    })()
                                                }
                                                alt="Screenshot"
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                onError={(e) => {
                                                    const dbUrl = `${baseUrl}${shot.url}`;
                                                    if (e.target.src !== dbUrl) {
                                                        // Fallback 1: Database Cloud URL
                                                        e.target.onerror = null;
                                                        e.target.src = dbUrl;
                                                        setFailedImages(prev => ({ ...prev, [shot._id]: true }));
                                                    } else {
                                                        // Fallback 2: Not found placeholder
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Found';
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full text-white">
                                                    <FaExpand size={20} />
                                                </div>
                                            </div>
                                            {!shot.employeeId && (
                                                <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                                    Pre-Login
                                                </div>
                                            )}
                                            <div className={`absolute bottom-3 right-3 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur ${failedImages[shot._id] ? 'bg-blue-600/90' : 'bg-emerald-600/90'}`}>
                                                {failedImages[shot._id] ? 'Cloud DB' : 'LAN'}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-slate-50 flex items-center justify-center border-t border-slate-100">
                                            <div className="flex items-center text-sm text-slate-600 font-medium">
                                                <FaClock className="mr-2 text-slate-400" size={14} />
                                                {formatDate(shot.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Main Grouped By Device View */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {finalLatestDeviceShots.map((shot) => (
                                    <div
                                        key={`group-${shot.deviceSerial}`}
                                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
                                        onClick={() => setSelectedDevice(shot.deviceSerial)}
                                    >
                                        <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                            <div className="absolute inset-0 bg-slate-900 p-2 z-10 flex justify-end items-end opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-slate-900/60 to-transparent">
                                            </div>
                                            <img
                                                src={
                                                    (() => {
                                                        const cleanUrl = (shot.url || '').replace(/\\/g, '/');
                                                        const parts = cleanUrl.split('/');
                                                        const screenIdx = parts.indexOf('Screenshots');
                                                        
                                                        if (screenIdx !== -1 && screenIdx < parts.length - 1) {
                                                            const subPaths = parts.slice(screenIdx + 1, -1).map(p => encodeURIComponent(p)).join('/');
                                                            const filename = parts[parts.length - 1];
                                                            return `${baseUrl}/files/FdsTaskManager/Screenshots/${subPaths ? subPaths + '/' : ''}${filename}`;
                                                        }
                                                        return `${baseUrl}${shot.url}`;
                                                    })()
                                                }
                                                alt="Latest Screenshot"
                                                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity blur-[1px] hover:blur-none"
                                                onError={(e) => {
                                                    const dbUrl = `${baseUrl}${shot.url}`;
                                                    if (e.target.src !== dbUrl) {
                                                        // Fallback 1: Database Cloud URL
                                                        e.target.onerror = null;
                                                        e.target.src = dbUrl;
                                                        setFailedImages(prev => ({ ...prev, [shot._id]: true }));
                                                    } else {
                                                        // Fallback 2: Not found placeholder
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Found';
                                                    }
                                                }}
                                            />
                                            <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center shadow-lg">
                                                View All
                                            </div>
                                            <div className={`absolute bottom-3 right-3 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur z-20 ${failedImages[shot._id] ? 'bg-blue-600/90' : 'bg-emerald-600/90'}`}>
                                                {failedImages[shot._id] ? 'Cloud DB' : 'LAN'}
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col flex-1 border-t-2 border-slate-50">
                                            <div className="flex items-center font-semibold text-slate-900 mb-2 truncate" title={shot.deviceSerial}>
                                                <FaDesktop className="mr-2 text-slate-400" size={16} />
                                                {shot.deviceSerial || "Unknown Device"}
                                            </div>

                                            <div className="space-y-1 mt-auto">
                                                <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                                    <span className="w-20 font-medium">Last Active:</span>
                                                    <span className="truncate flex-1 font-medium text-slate-700">{shot.employeeName || "Anonymous User"}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-slate-500 pt-2 float-right mt-1">
                                                    <FaClock className="mr-1.5" size={12} />
                                                    Updated {formatDate(shot.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Image Modal for Detail View */}
                {selectedShot && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md" onClick={() => setSelectedShot(null)}>
                        {/* Global Close Button (Top-Right of Screen) */}
                        <button 
                            className="absolute top-6 right-6 z-[120] p-3 text-white/70 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 shadow-2xl active:scale-95"
                            onClick={(e) => { e.stopPropagation(); setSelectedShot(null); }}
                            title="Close (Esc)"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Navigation Buttons */}
                        <button 
                            className="absolute left-4 md:left-8 z-[110] p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm group active:scale-90"
                            onClick={(e) => { e.stopPropagation(); handleNavigate('prev'); }}
                        >
                            <svg className="w-8 h-8 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button 
                            className="absolute right-4 md:right-8 z-[110] p-4 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm group active:scale-90"
                            onClick={(e) => { e.stopPropagation(); handleNavigate('next'); }}
                        >
                            <svg className="w-8 h-8 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <div className="relative max-w-7xl max-h-[90vh] w-full flex justify-center flex-col items-center px-12" onClick={(e) => e.stopPropagation()}>
                            <div className="w-full h-full flex items-center justify-center">
                                <img
                                    src={
                                        (() => {
                                            const cleanUrl = (selectedShot.url || '').replace(/\\/g, '/');
                                            const parts = cleanUrl.split('/');
                                            const screenIdx = parts.indexOf('Screenshots');
                                            
                                            if (screenIdx !== -1 && screenIdx < parts.length - 1) {
                                                const subPaths = parts.slice(screenIdx + 1, -1).map(p => encodeURIComponent(p)).join('/');
                                                const filename = parts[parts.length - 1];
                                                return `${baseUrl}/files/FdsTaskManager/Screenshots/${subPaths ? subPaths + '/' : ''}${filename}`;
                                            }
                                            return `${baseUrl}${selectedShot.url}`;
                                        })()
                                    }
                                    alt="Screenshot Enlarged"
                                    className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border-4 border-white/10 ring-1 ring-black/50"
                                    onError={(e) => {
                                        const dbUrl = `${baseUrl}${selectedShot.url}`;
                                        if (e.target.src !== dbUrl) {
                                            e.target.onerror = null;
                                            e.target.src = dbUrl;
                                        }
                                    }}
                                />
                            </div>

                            <div className="mt-6 flex flex-col items-center text-white space-y-2">
                                <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold tracking-wider border border-white/10 shadow-xl">
                                    {finalSpecificDeviceShots.findIndex(s => s._id === selectedShot._id) + 1} OF {finalSpecificDeviceShots.length}
                                </div>
                                <div className="text-white/60 text-xs font-semibold flex items-center gap-2">
                                    <FaClock size={10} className="opacity-50" />
                                    {formatDate(selectedShot.timestamp)}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoCapturePage;
