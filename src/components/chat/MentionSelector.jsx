import { User } from 'lucide-react';

export default function MentionSelector({ users, onSelect, onClose, currentUser }) {
    // if (!users || users.length === 0) return null;

    return (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-white/5 bg-[#222529]">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Mention Member</span>
            </div>
            <div className="max-h-60 overflow-y-auto scrollbar-hide p-1">
                {(users && users.length > 0) ? users.map(user => {
                    return (
                        <button
                            key={user._id}
                            onClick={() => onSelect(user)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                        >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {user.name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                                    {user.name}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">{user.designation || user.role || 'Member'}</div>
                            </div>
                        </button>
                    );
                }) : (
                    <div className="p-3 text-center text-xs text-gray-500 italic">No members found to mention.</div>
                )}
            </div>
        </div>
    );
}
