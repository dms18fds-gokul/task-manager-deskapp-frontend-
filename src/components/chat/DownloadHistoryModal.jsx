import { useState, useEffect } from 'react';
import { X, User, Clock, Layers, FileText, Info } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../utils/config';
import { Download } from 'lucide-react';


export default function DownloadHistoryModal({ isOpen, onClose, fileUrl, fileName }) {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        if (isOpen && fileUrl) {
            fetchLogs();
        }
    }, [isOpen, fileUrl]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/downloads`, {
                params: { fileUrl },
                headers: { 'x-auth-token': token }
            });
            setLogs(res.data || []);
        } catch (err) {
            console.error("Error fetching download history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        // Track download
        try {
            const token = localStorage.getItem('token');
            const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
            const roles = user?.role || [];
            const roleArr = Array.isArray(roles) ? roles : [roles];
            const department = roleArr.find(r => !systemRoles.includes(r)) || 'General';

            await axios.post(`${API_URL}/downloads`, {
                employeeName: user?.name,
                employeeId: user?.employeeId,
                department: department,
                fileName: fileName || 'download',
                fileUrl: fileUrl,
                fileType: 'file' // Generic
            }, {
                headers: { 'x-auth-token': token }
            });
            
            // Refresh logs after tracking
            fetchLogs();
        } catch (trackErr) {
            console.error("Failed to track download:", trackErr);
        }

        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'download');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            window.open(fileUrl, '_blank');
        }
    };


    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-[#1e1e2d] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 flex flex-col max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#252538]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Info size={22} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base">Download History</h3>
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px] font-medium">{fileName || 'File history'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-all p-2 rounded-xl hover:bg-white/5">
                        <X size={22} />
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#1e1e2d]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-500/20 border-t-blue-500"></div>
                            <span className="text-xs text-gray-400 font-medium">Loading history...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3 opacity-60">
                            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
                                <FileText size={32} />
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-widest px-4 py-1.5 bg-white/5 rounded-full">No downloads yet</span>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log._id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex flex-col gap-3 group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                                            {log.employeeName?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-100 group-hover:text-blue-400 transition-colors">{log.employeeName}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">ID: {log.employeeId}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1.5 text-[11px] text-gray-400 font-medium bg-black/20 px-2 py-0.5 rounded-md mb-1">
                                            <Clock size={11} className="text-blue-500" />
                                            {new Date(log.downloadTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                                            {new Date(log.downloadTime).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pl-2 border-l-2 border-blue-500/30 py-0.5 mt-1 ml-3">
                                    <Layers size={11} className="text-blue-400" />
                                    <span className="text-[11px] text-gray-300 font-medium">{log.department}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-[#252538] border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest opacity-60">
                        Activity Tracking System 
                    </p>
                </div>
            </div>


        </div>
    );
}
