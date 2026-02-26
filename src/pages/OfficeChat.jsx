import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatArea from '../components/chat/ChatArea';
import NotificationToast from '../components/chat/NotificationToast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function OfficeChat() {
    const { channelId } = useParams();
    const navigate = useNavigate();
    const [activeChannel, setActiveChannel] = useState(null);
    const [notification, setNotification] = useState(null);
    const { socket } = useSocket();
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#1A1D21] text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }


    // State to trigger sidebar refresh
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Session Recovery / Auth Check
    useEffect(() => {
        if (!loading && !user) {
            const token = localStorage.getItem('token');
            if (token) {
                // If token exists but user state is missing, try reloading to recover session
                // This handles the "Refresh works" scenario
                window.location.reload();
            } else {
                // No token, redirect to login
                navigate('/login');
            }
        }
    }, [loading, user, navigate]);

    // Handle channel selection from Sidebar
    const handleChannelSelect = (channel) => {
        // If we select a channel, update the URL
        if (channel && channel._id !== channelId) {
            navigate(`/chat/${channel._id}`);
        }
        setActiveChannel(channel);
    };

    const handleChannelCreated = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // State for notification resides here, but triggered by Sidebar
    // (Sidebar has the channel list to look up names)

    return (
        <div className="flex h-screen bg-[#1A1D21] font-sans overflow-hidden">
            <ChatSidebar
                onSelectChannel={handleChannelSelect}
                selectedChannelId={channelId} // Pass URL param to sidebar to set initial active state
                refreshTrigger={refreshTrigger}
                onNotification={setNotification}
            />
            <ChatArea
                activeChannel={activeChannel}
                user={user}
                onChannelCreated={handleChannelCreated}
                onChannelUpdated={(updatedChannel) => {
                    // Start sidebar refresh
                    setRefreshTrigger(prev => prev + 1);

                    // If deleted, clear active channel if it matches
                    if (updatedChannel && updatedChannel.deleted) {
                        if (activeChannel && activeChannel._id === updatedChannel._id) {
                            setActiveChannel(null);
                            navigate('/chat');
                        }
                    } else if (updatedChannel && activeChannel && activeChannel._id === updatedChannel._id) {
                        // Update active channel data immediately (e.g. for member list)
                        setActiveChannel(updatedChannel);
                    }
                }}
            />
            {notification && (
                <NotificationToast
                    notification={notification}
                    onClose={() => setNotification(null)}
                    onClick={() => {
                        if (notification?.channelId) {
                            navigate(`/chat/${notification.channelId}`);
                            setNotification(null);
                        }
                    }}
                />
            )}
        </div>
    );
}
