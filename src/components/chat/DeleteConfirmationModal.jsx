
import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, channelName }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-[#1E1F22] rounded-xl shadow-2xl w-full max-w-lg border border-[#2B2D31] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">

                {/* Header Section - High Contrast */}
                <div className="bg-gradient-to-r from-red-900/40 to-red-900/10 p-6 border-b border-red-500/10 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/20">
                        <Trash2 className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white leading-tight">Delete Channel</h3>
                        <p className="text-red-200/70 text-sm mt-1">This action is permanent and irreversible.</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 bg-[#1e1f22]">
                    <div className="bg-[#2B2D31]/50 rounded-lg p-4 border border-[#2B2D31] mb-6">
                        <p className="text-gray-300 text-base leading-relaxed">
                            Are you absolutely sure you want to delete the channel <strong className="text-white underline decoration-red-500/30 underline-offset-4">#{channelName}</strong>?
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-gray-400 list-disc list-inside">
                            <li>All messages will be lost immediately.</li>
                            <li>Files shared in this channel may become inaccessible.</li>
                            <li>Channel members will be removed.</li>
                        </ul>
                    </div>

                    <div className="flex gap-3 justify-end items-center mt-2">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg bg-transparent hover:bg-[#2B2D31] text-gray-300 font-medium transition-colors border border-transparent hover:border-[#3F4147]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={18} />
                            <span>Delete Channel</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
