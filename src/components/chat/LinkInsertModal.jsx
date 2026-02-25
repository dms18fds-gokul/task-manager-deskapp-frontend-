import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Save } from 'lucide-react';

const LinkInsertModal = ({ isOpen, onClose, onInsert, initialText = '' }) => {
    const [text, setText] = useState(initialText);
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText(initialText);
            setUrl('');
        }
    }, [isOpen, initialText]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onInsert(text, url);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1F2226] border border-white/10 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <LinkIcon size={18} className="text-blue-400" />
                        Add Link
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-gray-400 block">Text</label>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full bg-[#1A1D21] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                            placeholder="Link text"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-400 block">Link</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-[#1A1D21] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LinkInsertModal;
