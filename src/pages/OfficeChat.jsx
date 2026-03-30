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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        <div className="flex h-screen bg-[#1A1D21] font-sans overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex shrink-0">
                <ChatSidebar
                    onSelectChannel={handleChannelSelect}
                    selectedChannelId={channelId}
                    refreshTrigger={refreshTrigger}
                    onNotification={setNotification}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    {/* Sidebar container */}
                    <div className="absolute inset-y-0 left-0 z-50">
                        <ChatSidebar
                            onSelectChannel={(channel) => {
                                handleChannelSelect(channel);
                                setIsSidebarOpen(false);
                            }}
                            selectedChannelId={channelId}
                            refreshTrigger={refreshTrigger}
                            onNotification={setNotification}
                            onClose={() => setIsSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="bg-[#1A1D21] border-b border-white/10 p-4 flex justify-between items-center md:hidden z-10 sticky top-0">
                    <h1 className="text-xl font-bold text-white uppercase tracking-tight">Office Chat</h1>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors border border-white/10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </header>

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
            </div>
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
