import { X } from 'lucide-react';
import { useEffect } from 'react';

const NotificationToast = ({ notification, onClose, onClick }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification, onClose]);

    if (!notification) return null;

    return (
        <div
            onClick={onClick}
            className="fixed bottom-4 right-4 bg-[#222529] border border-white/10 rounded-2xl p-4 flex items-start space-x-3 max-w-sm z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 border-l-4 border-l-purple-500 cursor-pointer hover:bg-[#2b2f33] transition-colors shadow-2xl"
        >
            <div className="flex-1">
                <h4 className="font-bold text-gray-200 text-sm">New Message</h4>
                <div className="text-xs text-purple-400 font-bold mb-1 flex items-center gap-1">
                    <span>#{notification.channelName}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    <span>{notification.senderName}</span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{notification.content}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export default NotificationToast;
