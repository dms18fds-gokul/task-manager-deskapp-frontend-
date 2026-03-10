import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/config';
import { format } from 'date-fns';
import { Bell, Check, Clock, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function NotificationsView() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'x-auth-token': token }
            });
            setNotifications(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { 'x-auth-token': token }
            });
            setNotifications(prev =>
                prev.map(notif => notif._id === id ? { ...notif, isRead: true } : notif)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/read-all`, {}, {
                headers: { 'x-auth-token': token }
            });
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const toggleExpand = (id, isRead) => {
        setExpandedId(prev => prev === id ? null : id);
        if (!isRead) {
            markAsRead(id);
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'approval': return <div className="p-2 bg-green-100 rounded-lg text-green-600"><Check size={20} /></div>;
            case 'rejection': return <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20} /></div>;
            default: return <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Bell size={20} /></div>;
        }
    };

    const handleDownload = (metaData) => {
        if (!metaData?.fileUrl) return;

        // Auto download trigger via frontend
        const a = document.createElement("a");
        a.href = metaData.fileUrl;
        a.download = metaData.fileName || "downloaded_file";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-120px)] w-full mx-auto overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="text-indigo-600" /> Document Approvals
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
                                {unreadCount} New
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Updates on your document requests and system alerts.</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100 bg-white shadow-sm"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane - List */}
                <div className="w-1/3 min-w-[300px] border-r border-gray-100 bg-gray-50/30 overflow-y-auto custom-scrollbar flex flex-col">
                    {loading ? (
                        <div className="flex justify-center items-center py-12 flex-1">
                            <div className="animate-spin h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16 px-4 flex-1">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Bell className="text-gray-400 w-6 h-6" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900">All caught up!</h3>
                            <p className="text-sm text-gray-500 mt-1">You don't have any notifications.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map(notif => {
                                const isSelected = expandedId === notif._id;
                                return (
                                    <div
                                        key={notif._id}
                                        onClick={() => toggleExpand(notif._id, notif.isRead)}
                                        className={`p-4 cursor-pointer transition-colors relative flex gap-3
                                            ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}
                                            ${!notif.isRead ? 'bg-white font-medium' : 'bg-transparent text-gray-600'}
                                        `}
                                    >
                                        {!notif.isRead && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                        )}

                                        <div className="flex-shrink-0 mt-1">
                                            {getIconForType(notif.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm truncate pr-2 ${!notif.isRead ? 'text-gray-900 font-bold' : 'text-gray-800 font-semibold'}`}>
                                                    {notif.title}
                                                </h4>
                                            </div>
                                            <p className={`text-xs truncate ${!notif.isRead ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-2">
                                                <Clock size={10} /> {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right Pane - Details */}
                <div className="flex-1 bg-white overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    {expandedId ? (
                        (() => {
                            const selectedNotif = notifications.find(n => n._id === expandedId);
                            if (!selectedNotif) return null;

                            const isApproval = selectedNotif.type === 'approval';
                            const isRejection = selectedNotif.type === 'rejection';
                            const hasFile = !!selectedNotif.metaData?.fileName;

                            return (
                                <div className="max-w-2xl animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            {getIconForType(selectedNotif.type)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{selectedNotif.title}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                                                <Clock size={14} /> Received {format(new Date(selectedNotif.createdAt), 'MMMM d, yyyy \at h:mm a')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 mb-8 text-gray-700 text-base leading-relaxed">
                                        {selectedNotif.message}
                                    </div>

                                    {(isApproval || isRejection) && (
                                        <div className="mb-8">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Request Status Details</h4>

                                            <div className={`rounded-xl border p-6 flex flex-col md:flex-row items-center gap-6 justify-between
                                                ${isApproval ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'}
                                            `}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-4 rounded-full flex-shrink-0
                                                        ${isApproval ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
                                                    `}>
                                                        {isApproval ? <Check size={32} /> : <AlertCircle size={32} />}
                                                    </div>
                                                    <div>
                                                        <h5 className={`text-xl font-bold ${isApproval ? 'text-emerald-800' : 'text-rose-800'}`}>
                                                            {isApproval ? 'Request ACCEPTED' : 'Request REJECTED'}
                                                        </h5>
                                                        <p className={`text-sm mt-1 ${isApproval ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {isApproval ? 'The Admin has approved your download request.' : 'The Admin has denied your download request.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasFile && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Requested File</h4>

                                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="truncate pr-4">
                                                        <p className="text-base font-bold text-gray-800 truncate" title={selectedNotif.metaData.fileName}>
                                                            {selectedNotif.metaData.fileName}
                                                        </p>
                                                        <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">
                                                            {selectedNotif.metaData.fileType || 'Document Attachment'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isApproval && (
                                                    <button
                                                        onClick={() => handleDownload(selectedNotif.metaData)}
                                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 flex-shrink-0"
                                                    >
                                                        Download File
                                                    </button>
                                                )}

                                                {isRejection && (
                                                    <div className="px-4 py-2 bg-gray-100 text-gray-500 font-medium rounded-lg text-sm flex-shrink-0">
                                                        Download Unavailable
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                <Bell size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Select a Notification</h3>
                            <p className="text-gray-500 mt-2 max-w-sm">
                                Choose a notification from the list on the left to view its complete details and download documents.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
