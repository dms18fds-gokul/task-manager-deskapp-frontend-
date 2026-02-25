import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../utils/config";
import Sidebar from "../components/Sidebar";
import DownloadDropdown from "../components/DownloadDropdown";
import { FaSearch, FaRedo, FaChevronLeft, FaChevronRight, FaDownload } from "react-icons/fa";

const DeviceRamTable = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [averageRam, setAverageRam] = useState(0);

    // Pagination and Filtering State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 50;

    const [filters, setFilters] = useState({
        serialNumber: "",
        fromDate: "",
        toDate: "",
        fromTime: "",
        toTime: ""
    });

    const [appliedFilters, setAppliedFilters] = useState({
        serialNumber: "",
        fromDate: "",
        toDate: "",
        fromTime: "",
        toTime: ""
    });

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page,
                    limit,
                    ...(appliedFilters.serialNumber && { serialNumber: appliedFilters.serialNumber }),
                    ...(appliedFilters.fromDate && { fromDate: appliedFilters.fromDate }),
                    ...(appliedFilters.toDate && { toDate: appliedFilters.toDate }),
                    ...(appliedFilters.fromTime && { fromTime: appliedFilters.fromTime }),
                    ...(appliedFilters.toTime && { toTime: appliedFilters.toTime }),
                });

                const response = await axios.get(`${API_URL}/metrics/ram?${params}`);
                setLogs(response.data.logs || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalRecords(response.data.total || 0);
                const avg = Number(response.data.averageRam) || 0;
                setAverageRam(avg);
                setError("");
            } catch (err) {
                console.error("Error fetching Device RAM logs:", err);
                setError("Failed to load device RAM data.");
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [page, appliedFilters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const applyFilters = () => {
        setPage(1); // Reset to first page on search
        setAppliedFilters(filters);
    };

    const resetFilters = () => {
        const emptyFilters = { serialNumber: "", fromDate: "", toDate: "", fromTime: "", toTime: "" };
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setPage(1);
    };

    const isFiltered = appliedFilters.serialNumber || appliedFilters.fromDate || appliedFilters.toDate || appliedFilters.fromTime || appliedFilters.toTime;

    const handleDownloadPdf = async () => {
        try {
            const params = new URLSearchParams({
                fetchAll: 'true',
                ...(appliedFilters.serialNumber && { serialNumber: appliedFilters.serialNumber }),
                ...(appliedFilters.fromDate && { fromDate: appliedFilters.fromDate }),
                ...(appliedFilters.toDate && { toDate: appliedFilters.toDate }),
                ...(appliedFilters.fromTime && { fromTime: appliedFilters.fromTime }),
                ...(appliedFilters.toTime && { toTime: appliedFilters.toTime }),
            });
            const response = await axios.get(`${API_URL}/metrics/ram?${params}`);
            return response.data.logs || [];
        } catch (err) {
            console.error("Failed to fetch all data for PDF:", err);
            alert("Failed to fetch data for PDF download.");
            return [];
        }
    };

    // Columns config for DownloadDropdown
    const exportColumns = [
        { header: "S.No", accessor: (item, i) => i + 1 }, // Index isn't available easily here, we could just remove it or rely on array index
        { header: "Device Serial Number", accessor: "serialNumber" },
        { header: "RAM Usage (MB)", accessor: "ramUsageMB" },
        { header: "OS Platform", accessor: "osPlatform" },
        { header: "Date & Time", accessor: (item) => `${new Date(item.timestamp).toLocaleDateString()} ${new Date(item.timestamp).toLocaleTimeString()}` }
    ];

    // Helper wrapper component for the PDF download to inject the dynamically fetched data
    const PDFButton = () => {
        const [isDownloading, setIsDownloading] = useState(false);
        const [allData, setAllData] = useState([]);

        const handleClick = async () => {
            setIsDownloading(true);
            const data = await handleDownloadPdf();
            setAllData(data);
            setIsDownloading(false);
            // After state updates, we want the default DownloadDropdown behavior to trigger.
            // A simple implementation trick is to render the DownloadDropdown with `data` instantly available.
        };

        if (allData.length > 0) {
            return (
                <DownloadDropdown
                    data={allData}
                    fileName="Device_RAM_Logs"
                    columns={exportColumns}
                    isOpenDefault={true}
                    summaryInfo={[
                        `Total Filtered Logs: ${totalRecords}`,
                        `Average RAM Usage: ${isFiltered ? (Number(averageRam) || 0).toFixed(2) : "0.00"} MB`
                    ]}
                />
            );
        }

        return (
            <button
                onClick={handleClick}
                disabled={isDownloading}
                className={`w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-all duration-300 transform active:scale-95 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Export PDF"
            >
                {isDownloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                    <FaDownload className="text-sm" />
                )}
            </button>
        );
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans">
            {/* Sidebar */}
            <Sidebar className="hidden md:flex flex-col w-64 fixed h-full shadow-xl z-20" />

            {/* Main Content */}
            <div className="flex-1 md:ml-64 p-6 lg:p-8 overflow-y-auto w-full max-w-full">
                <div className="max-w-[1400px] mx-auto w-full">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Device & RAM Logs</h1>
                            <p className="text-sm text-gray-500 mt-1">View the history of RAM usage for all connected desktop devices.</p>
                        </div>
                        <div className="flex justify-end pr-4 gap-2">
                            <button
                                onClick={applyFilters}
                                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                title="Refresh Table"
                            >
                                <FaRedo className="text-gray-500 text-xs" />
                                <span>Refresh</span>
                            </button>
                            <PDFButton />
                        </div>
                    </div>

                    {/* Filter Navbar */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4 lg:items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Device Serial Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <FaSearch />
                                </span>
                                <input
                                    type="text"
                                    name="serialNumber"
                                    value={filters.serialNumber}
                                    onChange={handleFilterChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                                    placeholder="Search serial number..."
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">From Date</label>
                            <input
                                type="date"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">To Date</label>
                            <input
                                type="date"
                                name="toDate"
                                value={filters.toDate}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">From Time</label>
                            <input
                                type="time"
                                name="fromTime"
                                value={filters.fromTime}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">To Time</label>
                            <input
                                type="time"
                                name="toTime"
                                value={filters.toTime}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                            />
                        </div>
                        <div className="flex gap-2 min-w-[200px]">
                            <button
                                onClick={applyFilters}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-sm transition-colors flex justify-center items-center h-[38px]"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={resetFilters}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 h-[38px] flex items-center justify-center min-w-[100px]"
                            >
                                <span className="mr-2"><FaRedo className="text-xs" /></span> Reset
                            </button>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average RAM Usage</p>
                                <p className="text-2xl font-extrabold text-gray-800">
                                    {isFiltered ? (Number(averageRam) || 0).toFixed(2) : "0.00"}{" "}
                                    <span className="text-sm font-medium text-gray-400 font-sans">MB</span>
                                </p>
                                {!isFiltered && <p className="text-[10px] text-gray-400 mt-0.5">* Apply filters to see average</p>}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Filtered Logs</p>
                                <p className="text-2xl font-extrabold text-gray-800">{totalRecords} <span className="text-sm font-medium text-gray-400 font-sans">Entries</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                            <p className="text-gray-500 font-medium animate-pulse">Loading RAM logs...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-r-lg" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">
                                    Logged Entries <span className="ml-2 bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-xs">{totalRecords} Total</span>
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="bg-gray-100/80 text-gray-500 text-[10px] uppercase tracking-[0.15em] font-black border-b border-gray-200">
                                        <tr>
                                            <th className="py-4 px-6 w-[80px] text-center">S.No</th>
                                            <th className="py-4 px-6 min-w-[200px]">Device Serial Number</th>
                                            <th className="py-4 px-6 min-w-[160px]">Used RAM</th>
                                            <th className="py-4 px-6 min-w-[140px]">OS Platform</th>
                                            <th className="py-4 px-6 text-right min-w-[180px]">Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {logs.length === 0 ? (
                                            <tr><td colSpan="5" className="p-12 text-center text-gray-400 italic">No logs found matching your criteria.</td></tr>
                                        ) : (
                                            logs.map((log, index) => (
                                                <tr key={log._id} className="hover:bg-indigo-50/20 transition-all duration-200 group">
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="text-gray-400 font-mono text-[10px] font-bold bg-gray-50 px-2 py-1 rounded group-hover:bg-white transition-colors border border-gray-100">
                                                            {((page - 1) * limit + index + 1).toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100 shadow-sm group-hover:bg-white transition-colors">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                                                </svg>
                                                            </div>
                                                            <span className="font-bold text-gray-800 font-mono tracking-tight text-sm">{log.serialNumber}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap shadow-sm">
                                                            <span className="mr-1">{log.ramUsageMB}</span>
                                                            <span className="opacity-60 text-[9px]">MB</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${log.osPlatform?.toLowerCase().includes('win') ? 'bg-blue-400' : 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}></span>
                                                            <span className="text-gray-600 text-[13px] font-semibold">{log.osPlatform}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="inline-block text-right">
                                                            <div className="text-gray-900 font-bold text-sm leading-tight">
                                                                {new Date(log.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </div>
                                                            <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-80">
                                                                {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                                    <span className="text-sm text-gray-600">
                                        Showing <span className="font-semibold text-gray-900">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * limit, totalRecords)}</span> of <span className="font-semibold text-gray-900">{totalRecords}</span> Entries
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className={`flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-colors ${page === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'}`}
                                        >
                                            <FaChevronLeft className="mr-1" /> Prev
                                        </button>
                                        <span className="text-sm font-medium text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg">
                                            Page {page} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className={`flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-colors ${page === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'}`}
                                        >
                                            Next <FaChevronRight className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceRamTable;
