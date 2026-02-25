import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, User } from 'lucide-react';

export default function MultiUserSelect({ users, selectedUsers, onChange, placeholder = "Select users..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const role = Array.isArray(user.role) ? user.role.join(' ') : (user.role || '');
        const roleMatch = role.toLowerCase().includes(searchLower);
        return nameMatch || roleMatch;
    });

    const toggleUser = (userId) => {
        const newSelection = selectedUsers.includes(userId)
            ? selectedUsers.filter(id => id !== userId)
            : [...selectedUsers, userId];
        onChange(newSelection);
        setSearchTerm('');
        inputRef.current?.focus();
    };

    const removeUser = (e, userId) => {
        e.stopPropagation();
        onChange(selectedUsers.filter(id => id !== userId));
    };

    return (
        <div className="relative font-sans" ref={containerRef}>
            {/* Input Container */}
            <div
                className={`w-full bg-[#111214] rounded-[4px] min-h-[42px] px-2 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text transition-all duration-200 border border-transparent shadow-inner ${isOpen ? 'ring-1 ring-indigo-500 bg-[#1E1F22]' : 'hover:bg-[#1E1F22]'}`}
                onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
            >
                {/* Selected Chips */}
                {selectedUsers.map(userId => {
                    const user = users.find(u => u._id === userId);
                    if (!user) return null;
                    return (
                        <div key={userId} className="bg-[#5865F2] text-white text-[11px] font-medium px-2 py-0.5 rounded-[3px] flex items-center gap-1 select-none animate-in fade-in zoom-in duration-100">
                            <span className="max-w-[100px] truncate">{user.name}</span>
                            <button
                                onClick={(e) => removeUser(e, userId)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    );
                })}

                {/* Input Field */}
                <input
                    ref={inputRef}
                    className="bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-600 flex-1 min-w-[80px] h-6 py-0 focus:ring-0"
                    placeholder={selectedUsers.length === 0 ? placeholder : ""}
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-[#2B2D31] rounded-[4px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100 ring-1 ring-black/20">
                    <div className="max-h-60 overflow-y-auto scrollbar-hide p-1">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => {
                                const isSelected = selectedUsers.includes(user._id);
                                const role = Array.isArray(user.role) ? user.role.join(', ') : (user.role || 'Member');

                                return (
                                    <div
                                        key={user._id}
                                        onClick={() => toggleUser(user._id)}
                                        className={`px-2 py-2 rounded-[3px] flex items-center justify-between cursor-pointer transition-colors group ${isSelected ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {/* Avatar Area */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isSelected ? 'bg-[#5865F2] text-white' : 'bg-[#1E1F22] text-gray-400 group-hover:text-gray-200'}`}>
                                                {user.name?.[0]}
                                            </div>

                                            <div className="flex flex-col overflow-hidden">
                                                <span className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100'}`}>
                                                    {user.name}
                                                </span>
                                                <span className="text-[11px] text-gray-500 truncate group-hover:text-gray-400">
                                                    {role}
                                                </span>
                                            </div>
                                        </div>

                                        {isSelected && <Check size={16} className="text-[#5865F2] ml-2 shrink-0 animate-in zoom-in duration-200" />}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm flex flex-col items-center">
                                <User size={20} className="mb-2 opacity-50" />
                                <span>No members found</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
