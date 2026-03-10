import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/config';
import { FaDesktop, FaUser, FaClock, FaExpand, FaSync, FaArrowLeft } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';

const AutoCapturePage = () => {
    const [screenshots, setScreenshots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const [failedImages, setFailedImages] = useState({});

    // Filter State
    const [filters, setFilters] = useState({
        dateFilter: "Today",
        fromDate: "",
        toDate: "",
        time: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        dateFilter: "Today",
        fromDate: "",
        toDate: "",
        time: ""
    });

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
            console.error("Error fetching screenshots", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
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

    const deviceEmployeeInfo = specificDeviceShots.find(shot => shot.employeeName || shot.employeeId) || {};

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 overflow-auto p-6 text-slate-800 relative">
                <div className="max-w-7xl mx-auto">

                    {/* Header Top Bar */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            {selectedDevice ? (
                                <div className="flex items-start space-x-4">
                                    <button
                                        onClick={() => setSelectedDevice(null)}
                                        className="text-slate-500 hover:text-indigo-600 transition-colors p-2.5 rounded-full hover:bg-slate-200 mt-1"
                                        title="Back to Devices"
                                    >
                                        <FaArrowLeft size={20} />
                                    </button>
                                    <div className="flex flex-col">
                                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-5">Device Details</h1>

                                        <div className="flex flex-wrap items-center gap-4">
                                            {deviceEmployeeInfo.employeeName && (
                                                <div className="flex items-center text-[1.05rem] font-bold text-slate-800 tracking-wide uppercase">
                                                    <div className="flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full p-1.5 mr-2">
                                                        <FaUser size={14} />
                                                    </div>
                                                    {deviceEmployeeInfo.employeeName}
                                                </div>
                                            )}

                                            {deviceEmployeeInfo.employeeId && (
                                                <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-2 w-fit text-sm text-slate-700 font-medium">
                                                    <span className="text-slate-500 mr-2 flex items-center"><FaUser className="mr-1.5 text-slate-400" size={12} /> Emp ID:</span>
                                                    <span className="font-semibold text-slate-800">{deviceEmployeeInfo.employeeId}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-2 w-fit text-sm text-slate-700 font-medium">
                                                <span className="text-slate-500 mr-2 flex items-center"><FaDesktop className="mr-1.5 text-slate-400" size={12} /> Device ID:</span>
                                                <span className="font-mono font-semibold text-slate-800 tracking-tight">{selectedDevice}</span>
                                            </div>
                                        </div>

                                        {/* Filter Navbar for Specific Device View */}
                                        <div className="mt-8 bg-white border border-slate-200 rounded-xl shadow-sm p-4 w-full">
                                            <div className="flex flex-wrap items-end gap-5">

                                                {/* Date Filter Selection */}
                                                <div className="flex flex-col min-w-[200px]">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
                                                        <FaClock className="mr-1.5 text-slate-400" /> Date Range
                                                    </label>
                                                    <select
                                                        value={filters.dateFilter}
                                                        onChange={(e) => setFilters({ ...filters, dateFilter: e.target.value })}
                                                        className="h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="Today">Today</option>
                                                        <option value="Particular Date">Particular Date</option>
                                                        <option value="From Date and To Date">From Date and To Date</option>
                                                        <option value="Last 7 Days">Last 7 Days</option>
                                                        <option value="Last 30 Days">Last 30 Days</option>
                                                    </select>
                                                </div>

                                                {/* Conditional Date Inputs */}
                                                {(filters.dateFilter === 'Particular Date' || filters.dateFilter === 'From Date and To Date') && (
                                                    <div className="flex flex-col min-w-[150px]">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                            {filters.dateFilter === 'Particular Date' ? 'Select Date' : 'From Date'}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={filters.fromDate}
                                                            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                                            className="h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                                        />
                                                    </div>
                                                )}

                                                {filters.dateFilter === 'From Date and To Date' && (
                                                    <div className="flex flex-col min-w-[150px]">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Date</label>
                                                        <input
                                                            type="date"
                                                            value={filters.toDate}
                                                            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                                            className="h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                                        />
                                                    </div>
                                                )}

                                                {/* Exact Time Input */}
                                                <div className="flex flex-col min-w-[150px]">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
                                                        Time
                                                    </label>
                                                    <input
                                                        type="time"
                                                        step="60"
                                                        value={filters.time}
                                                        onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                                                        className="h-[42px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                                    />
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <button
                                                        onClick={() => {
                                                            const reset = { dateFilter: "Today", fromDate: "", toDate: "", time: "" };
                                                            setFilters(reset);
                                                            setAppliedFilters(reset);
                                                        }}
                                                        className="h-[42px] px-4 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg font-bold text-sm transition-colors"
                                                        title="Reset Filters"
                                                    >
                                                        <FaSync className="text-sm" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAppliedFilters({ ...filters })}
                                                        disabled={loading}
                                                        className="h-[42px] px-6 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-75"
                                                    >
                                                        Fetch Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Auto Capture Monitoring</h1>
                                    <p className="mt-2 text-slate-500">View automated screenshots grouped by device.</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => fetchScreenshots(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-75"
                            disabled={refreshing || loading}
                        >
                            <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : screenshots.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <FaDesktop className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No screenshots found</h3>
                            <p className="mt-1 text-slate-500">Auto captures will appear here once tracked devices upload them.</p>
                        </div>
                    ) : selectedDevice ? (
                        /* Specific Device View */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {specificDeviceShots.map((shot) => (
                                <div key={shot._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
                                    <div className="relative aspect-video group cursor-pointer bg-slate-900" onClick={() => setSelectedImage(`${baseUrl}${shot.url}`)}>
                                        <img
                                            src={
                                                (() => {
                                                    const parts = shot.url.split('/');
                                                    if (parts.length > 4) {
                                                        const subPaths = parts.slice(3, -1).map(p => encodeURIComponent(p)).join('/');
                                                        return `http://192.168.1.34:5001/files/FdsTaskManager/Screenshots/${subPaths}/${parts[parts.length - 1]}`;
                                                    }
                                                    return `http://192.168.1.34:5001/files/FdsTaskManager/Screenshots/${parts[parts.length - 1]}`;
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
                            {latestDeviceShots.map((shot) => (
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
                                                    const parts = shot.url.split('/');
                                                    if (parts.length > 4) {
                                                        const subPaths = parts.slice(3, -1).map(p => encodeURIComponent(p)).join('/');
                                                        return `http://192.168.1.34:5001/files/FdsTaskManager/Screenshots/${subPaths}/${parts[parts.length - 1]}`;
                                                    }
                                                    return `http://192.168.1.34:5001/files/FdsTaskManager/Screenshots/${parts[parts.length - 1]}`;
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

                {/* Image Modal for Detail View */}
                {selectedImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                        <div className="relative max-w-7xl max-h-[90vh] w-full flex justify-center flex-col items-center">
                            <img
                                src={selectedImage}
                                alt="Screenshot Enlarged"
                                className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <button
                                className="absolute -top-12 right-0 text-white hover:text-slate-300 bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full transition-colors"
                                onClick={() => setSelectedImage(null)}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoCapturePage;
