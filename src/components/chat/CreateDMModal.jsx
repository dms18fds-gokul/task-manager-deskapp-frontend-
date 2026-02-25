import React, { useState } from 'react';
import { X, Search, MessageSquarePlus } from 'lucide-react';

export default function CreateDMModal({ isOpen, onClose, onCreate, users, currentUser }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    if (!isOpen) return null;

    // Filter users: exclude current user and search by name
    const filteredUsers = users.filter(u =>
        u._id !== currentUser._id &&
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = () => {
        if (!selectedUserId) return;
        onCreate(selectedUserId);
        setSearchTerm('');
        setSelectedUserId(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-primary-900 rounded-2xl shadow-2xl w-full max-w-md border border-primary-700/50 overflow-hidden ring-1 ring-white/10">
                <div className="p-5 border-b border-primary-800/50 flex justify-between items-center bg-gradient-to-r from-primary-800 to-primary-900">
                    <h3 className="font-bold flex items-center gap-2 text-lg text-white">
                        <MessageSquarePlus size={20} className="text-purple-400" /> New Message
                    </h3>
                    <button onClick={onClose} className="text-primary-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-primary-800/30">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" />
                        <input
                            autoFocus
                            className="w-full bg-black/20 border border-primary-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder-primary-600/50 text-white"
                            placeholder="Find a user to message..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                    {filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map(user => (
                                <button
                                    key={user._id}
                                    onClick={() => setSelectedUserId(user._id)}
                                    className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left ${selectedUserId === user._id
                                        ? 'bg-purple-900/40 border border-purple-500/30 text-white'
                                        : 'hover:bg-white/5 text-gray-300'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-xs font-bold text-white border border-primary-600">
                                        {user.name?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{user.name}</div>
                                        <div className="text-xs text-primary-400">{user.role}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-primary-500 text-sm italic">
                            No users found.
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-primary-800/50">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedUserId}
                        className={`w-full py-3 rounded-lg text-sm font-bold transition-all shadow-lg text-white ${selectedUserId
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/20 transform active:scale-95'
                            : 'bg-primary-800 text-primary-500 cursor-not-allowed'}`}
                    >
                        Start Conversation
                    </button>
                </div>
            </div>
        </div>
    );
}
