
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatArea from './ChatArea';
import NotificationToast from './NotificationToast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function ChatPopup({ isOpen, onClose }) {
    const [activeChannel, setActiveChannel] = useState(null);
    const [notification, setNotification] = useState(null);
    const { socket } = useSocket();
    const { user } = useAuth();

    // Handle channel selection from Sidebar
    const handleChannelSelect = (channel) => {
        setActiveChannel(channel);
    };

    useEffect(() => {
        if (socket) {
            socket.on('notification', (data) => {
                // Only show if not in the active channel or popup is closed
                if (!isOpen || activeChannel?._id !== data.channelId) {
                    setNotification(data);
                    // Play sound?
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => { });
                }
            });
            return () => socket.off('notification');
        }
    }, [socket, activeChannel, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Popup Container */}
            <div className="relative w-[90vw] h-[85vh] bg-[#1A1D21] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 animate-in zoom-in-95 duration-200">

                {/* Close Button (Absolute) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-red-500/80 text-white rounded-full transition-all duration-200 backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                {/* Chat Layout */}
                <div className="flex flex-1 h-full overflow-hidden">
                    <ChatSidebar
                        onSelectChannel={handleChannelSelect}
                        selectedChannelId={activeChannel?._id}
                        isPopup={true} // Optional prop to adjust styles if needed
                    />
                    <ChatArea activeChannel={activeChannel} />
                </div>

                {/* Toast Notification */}
                {notification && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                        <NotificationToast
                            notification={notification}
                            onClose={() => setNotification(null)}
                            onSelectChannel={(cId) => {
                                // We need to find the channel object or just pass ID if Sidebar accepts it
                                // For now, we assume sidebar handles selection by ID if passed, or we just notify user
                                // Ideally, we'd fetch the channel here, but let's just create a mock { _id: cId }
                                // which might be enough to trigger selection highlights
                                setActiveChannel({ _id: cId });
                                setNotification(null);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
