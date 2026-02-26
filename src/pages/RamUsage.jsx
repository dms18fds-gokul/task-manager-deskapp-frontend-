import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../utils/config";
import { FaMemory, FaClock, FaNetworkWired, FaServer, FaFileDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RamUsage = () => {
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [latestRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/system-logs/latest`, { headers }),
                axios.get(`${API_URL}/system-logs/history`, { headers })
            ]);

            setStats(latestRes.data);
            setHistory(historyRes.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching system stats:", err);
            // Even if API fails, we might want to show error or retry
            setError("Failed to load system statistics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 2000); // Auto-refresh every 2 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
                <div className="text-xl">Loading System Stats...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-900 text-red-400">
                <div className="text-xl">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8 text-indigo-400 flex items-center gap-3">
                <FaServer /> Server Statistics
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* RAM Usage Card */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                        <FaMemory /> RAM Usage
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">RSS (Resident Set Size)</span>
                            <span className="font-mono text-emerald-300">{stats.ramUsage.rss}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Heap Total</span>
                            <span className="font-mono text-emerald-300">{stats.ramUsage.heapTotal}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Heap Used</span>
                            <span className="font-mono text-emerald-300">{stats.ramUsage.heapUsed}</span>
                        </div>
                    </div>
                </div>

                {/* System Time Card */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center gap-2">
                        <FaClock /> System Time
                    </h2>
                    <div className="text-center py-4">
                        <div className="text-4xl font-mono text-white tracking-widest">
                            {new Date(stats.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-slate-400 mt-2">
                            {new Date(stats.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Network Info Card */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center gap-2">
                        <FaNetworkWired /> Network Info
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Hostname</span>
                            <span className="font-mono text-purple-300">{stats.hostname}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Public IP</span>
                            <span className="font-mono text-purple-300">{stats.publicIP}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-slate-400 block mb-1">Local IPs:</span>
                            <div className="space-y-1">
                                {stats.localIPs && stats.localIPs.map((ip, index) => (
                                    <div key={index} className="text-sm font-mono text-slate-300 bg-slate-700 px-2 py-1 rounded">
                                        {ip.name}: {ip.address}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="mt-8 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-indigo-400 flex items-center gap-2">
                        <FaServer /> System Log History
                    </h2>
                    <button
                        onClick={() => {
                            const doc = new jsPDF();
                            doc.text("System Log History", 14, 15);

                            const tableColumn = ["Time", "Hostname", "Public IP", "Local IPs", "RAM (RSS)"];
                            const tableRows = [];

                            history.forEach(log => {
                                const logData = [
                                    new Date(log.timestamp).toLocaleString(),
                                    log.hostname,
                                    log.publicIP,
                                    log.localIPs.map(ip => ip.address).join(", "),
                                    log.ramUsage?.rss || "N/A"
                                ];
                                tableRows.push(logData);
                            });

                            autoTable(doc, {
                                head: [tableColumn],
                                body: tableRows,
                                startY: 20,
                                theme: 'grid',
                                styles: { fontSize: 8 },
                                headStyles: { fillColor: [79, 70, 229] } // Indigo color
                            });

                            doc.save(`system_logs_${new Date().toISOString()}.pdf`);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <FaFileDownload /> Download PDF
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                                <th className="p-3">Time</th>
                                <th className="p-3">Hostname</th>
                                <th className="p-3">Public IP</th>
                                <th className="p-3">Local IPs</th>
                                <th className="p-3">RAM (RSS)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((log) => (
                                <tr key={log._id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                    <td className="p-3 font-mono text-sm">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-3">{log.hostname}</td>
                                    <td className="p-3 font-mono text-sm text-purple-300">{log.publicIP}</td>
                                    <td className="p-3">
                                        {log.localIPs && log.localIPs.map((ip, i) => (
                                            <div key={i} className="text-xs font-mono text-slate-400">
                                                {ip.address}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="p-3 font-mono text-emerald-300">
                                        {log.ramUsage?.rss || "N/A"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RamUsage;
