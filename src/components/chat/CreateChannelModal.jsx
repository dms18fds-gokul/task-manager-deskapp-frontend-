import React, { useState, useEffect } from 'react';
import { X, Hash, Globe, Lock, LayoutGrid, Layers } from 'lucide-react';
import MultiUserSelect from './MultiUserSelect';

export default function CreateChannelModal({ isOpen, onClose, onCreate, onAddMembers, channel = null, users = [], initialType = null, currentUser }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Global'); // 'Global' (Main) or 'Private' (Department)
    const [selectedUsers, setSelectedUsers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            if (channel) {
                // Edit Mode (Add Members)
                setName(channel.name);
                setType(channel.type === 'Private' ? 'Department' : channel.type); // Normalize for UI

                // Pre-select existing members
                if (channel.allowedUsers && users.length > 0) {
                    const existingMemberIds = users.filter(u =>
                        channel.allowedUsers.includes(u._id) ||
                        channel.allowedUsers.some(member => typeof member === 'object' && member._id === u._id)
                    ).map(u => u._id);
                    setSelectedUsers(existingMemberIds);
                } else {
                    setSelectedUsers([]);
                }
            } else {
                // Create Mode
                if (initialType) setType(initialType);
                else setType('Global');
                setName('');
                setSelectedUsers([]);
            }
        }
    }, [isOpen, initialType, channel, users]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (channel) {
            if (onAddMembers && selectedUsers.length > 0) {
                onAddMembers(channel._id, selectedUsers);
            }
            onClose();
            return;
        }

        if (!name.trim()) return;

        // Validation: "Main Channel" (UI: Global) -> Backend: 'Private' (for member restriction)
        // Validation: "Department" (UI: Department) -> Backend: 'Department'

        let effectiveType = type;
        if (type === 'Global') {
            effectiveType = 'Private'; // Main channels are Private groups
        } else if (type === 'Department') {
            effectiveType = 'Department';
        } else if (type === 'Private') {
            // Fallback if UI sets 'Private' directly
            effectiveType = 'Department';
        }

        onCreate({ name, type: effectiveType, allowedUsers: selectedUsers });
        onClose();
    };

    // Filter out current user from selectable list if needed
    const selectableUsers = currentUser ? users.filter(u => u._id !== currentUser._id) : users;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1E1F22] rounded-lg shadow-2xl w-full max-w-[440px] border border-[#2B2D31] ring-1 ring-white/5 font-sans relative">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-[#2B2D31]">
                    <h3 className="text-lg font-bold text-gray-100 tracking-wide flex items-center gap-2">
                        {type === 'Global' ? <LayoutGrid size={18} className="text-blue-400" /> : <Layers size={18} className="text-orange-400" />}
                        {channel ? 'Add Members' : (type === 'Global' ? 'Create Main Channel' : 'Create Department Channel')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 hover:bg-[#2B2D31] p-1.5 rounded transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Channel Type Selector (Segmented Control) */}
                    {!initialType && !channel && (
                        <div className="bg-[#111214] p-1 rounded-lg flex shadow-inner">
                            <button
                                type="button"
                                onClick={() => setType('Global')}
                                className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${type === 'Global'
                                    ? 'bg-[#35373C] text-gray-100 shadow-md transform scale-[1.02]'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#2B2D31]/50'
                                    }`}
                            >
                                Main Channel
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('Private')}
                                className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${type === 'Private'
                                    ? 'bg-[#35373C] text-gray-100 shadow-md transform scale-[1.02]'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#2B2D31]/50'
                                    }`}
                            >
                                Department
                            </button>
                        </div>
                    )}

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">
                            {type === 'Global' ? 'Main Channel Name' : 'Department Channel Name'}
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                                <Hash size={15} />
                            </div>
                            <input
                                autoFocus
                                className="w-full bg-[#111214] text-gray-100 rounded-[4px] py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 transition-all font-medium border-none shadow-inner"
                                placeholder={type === 'Global' ? "e.g. general-announcements" : "e.g. design-team"}
                                value={name}
                                onChange={e => setName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                                disabled={!!channel}
                            />
                        </div>
                        {channel && <p className="text-[10px] text-yellow-500/80 mt-1 pl-0.5">Channel name cannot be changed while adding members.</p>}
                        <p className="text-[11px] text-gray-500 pl-0.5">
                            {type === 'Global'
                                ? "Visible to everyone in the organization."
                                : "Private channel. Only added members can view."}
                        </p>
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-0.5 flex justify-between">
                            <span>Add Members</span>
                            {selectedUsers.length > 0 && <span className="text-indigo-400 normal-case tracking-normal">{selectedUsers.length} selected</span>}
                        </label>
                        <MultiUserSelect
                            users={selectableUsers}
                            selectedUsers={selectedUsers}
                            onChange={setSelectedUsers}
                            placeholder="Select employees or search..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className={`w-full py-2.5 rounded-[4px] text-sm font-semibold transition-all duration-200 transform active:scale-[0.98] ${name.trim()
                                ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shadow-indigo-900/20'
                                : 'bg-[#35373C] text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {channel ? 'Add Selected Members' : (type === 'Global' ? 'Create Main Channel' : 'Create Department Channel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
