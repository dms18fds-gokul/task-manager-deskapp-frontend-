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

    useEffect(() => {
        fetchScreenshots();
    }, []);

    const fetchScreenshots = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/sessions/all-screenshots`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setScreenshots(response.data);
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
    const specificDeviceShots = selectedDevice
        ? screenshots.filter(shot => shot.deviceSerial === selectedDevice)
        : [];

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 overflow-auto p-6 text-slate-800 relative">
                <div className="max-w-7xl mx-auto">

                    {/* Header Top Bar */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            {selectedDevice ? (
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setSelectedDevice(null)}
                                        className="text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-slate-200"
                                        title="Back to Devices"
                                    >
                                        <FaArrowLeft size={20} />
                                    </button>
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Device Details</h1>
                                        <p className="mt-1 text-sm text-slate-500 font-mono">{selectedDevice}</p>
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
                                            src={`${baseUrl}${shot.url}`}
                                            alt="Screenshot"
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Found';
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
                                    </div>

                                    <div className="p-4 flex flex-col flex-1">
                                        <div className="flex items-center space-x-2 text-sm font-medium text-slate-900 mb-2">
                                            <FaUser className={shot.employeeId ? "text-indigo-500" : "text-amber-500"} size={14} />
                                            <span className="truncate">
                                                {shot.employeeName || "Anonymous User"}
                                            </span>
                                        </div>

                                        <div className="space-y-1 mt-auto">
                                            {shot.employeeId && (
                                                <div className="flex items-center text-xs text-slate-500">
                                                    <span className="w-16 font-medium">Emp ID:</span>
                                                    <span className="truncate flex-1">{shot.employeeId}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                                                <FaClock className="mr-1.5" size={12} />
                                                {formatDate(shot.timestamp)}
                                            </div>
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
                                            src={`${baseUrl}${shot.url}`}
                                            alt="Latest Screenshot"
                                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity blur-[1px] hover:blur-none"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Found';
                                            }}
                                        />
                                        <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center shadow-lg">
                                            View All
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
