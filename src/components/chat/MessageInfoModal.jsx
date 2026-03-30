import React from 'react';
import { X, Check, CheckCheck, Clock } from 'lucide-react';

const MessageInfoModal = ({ isOpen, onClose, message, allUsers = [], currentUserId }) => {
    if (!isOpen || !message) return null;

    const getRelativeTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - new Date(date);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    };

    const getUserName = (id) => {
        const user = allUsers.find(u => (u._id === id || u.id === id));
        return user ? user.name : 'Unknown User';
    };

    // 1. Exclude the sender (current user) from the "Read By" list
    const readers = (message.readBy || []).filter(item => {
        const userId = item.user || item;
        return userId && userId.toString() !== currentUserId?.toString();
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#222529] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1A1D21]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <CheckCheck className="text-blue-400" size={20} />
                        Message Info
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Message Preview */}
                    <div className="bg-[#1A1D21] p-3 rounded-xl border border-white/5 opacity-80">
                        <p className="text-sm text-gray-300 italic mb-1">Message Preview:</p>
                        <p className="text-sm text-white line-clamp-3" dangerouslySetInnerHTML={{ __html: message.content }}></p>
                    </div>

                    {/* Read By Section */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <CheckCheck className="text-blue-400" size={14} />
                            Read By ({readers.length})
                        </h4>
                        <div className="space-y-2">
                            {readers.length > 0 ? (
                                readers.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-200 font-medium">{getUserName(item.user || item)}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500">{getRelativeTime(item.at)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-600 italic">No one else has read this yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#1A1D21] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageInfoModal;
