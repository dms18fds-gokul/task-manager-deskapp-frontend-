import { useState, useEffect, useRef } from 'react';
import { Hash, Lock, LogOut, Plus, X, MoreVertical, User, Briefcase, CornerDownRight, Trash2, UserPlus, UserMinus, GitBranch, ChevronRight, ChevronDown, Clock, Database, ArrowLeft, Home, Layers, MessageCircle, LayoutGrid, MessagesSquare, Power, CornerUpLeft, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { IoReturnDownBack } from "react-icons/io5";
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { API_URL } from '../../config';

import ProfileModal from './ProfileModal';
import MediaHistoryModal from './MediaHistoryModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

import CreateChannelModal from './CreateChannelModal';


// ...
export default function ChatSidebar({ onSelectChannel, onChannelsLoaded, selectedChannelId, isPopup = false, refreshTrigger, onNotification }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalType, setCreateModalType] = useState(null); // 'Global' or 'Private'
    const [activeView, setActiveView] = useState('home');

    // New Features
    const [showMediaHistory, setShowMediaHistory] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set()); // IDs of expanded branches

    // Notifications
    const [unreadCounts, setUnreadCounts] = useState({});
    const [recentNotifications, setRecentNotifications] = useState([]);

    const [allUsers, setAllUsers] = useState([]);

    // Global Managers/Users Menu
    const [showGlobalMenu, setShowGlobalMenu] = useState(false);
    const [showGlobalUsersModal, setShowGlobalUsersModal] = useState(false);
    const [inspectUser, setInspectUser] = useState(null);
    const [managerSelectedUser, setManagerSelectedUser] = useState(null);

    // Channel Deletion
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState(null);

    const fetchChannels = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/channels`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setChannels(res.data);
            if (onChannelsLoaded) onChannelsLoaded(res.data);
        } catch (err) {
            console.error(err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
            }
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/users`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setAllUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
        } catch (err) {
            console.error(err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
            }
        }
    };

    const fetchUnreadCounts = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/messages/unread/counts`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setUnreadCounts(res.data);
        } catch (err) {
            console.error("Failed to fetch unread counts", err);
        }
    };

    const markChannelAsRead = async (channelId) => {
        try {
            await axios.put(`${API_URL}/api/messages/read/${channelId}`, {}, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[channelId];
                return newCounts;
            });

            // Remove relevant notifications from the Activity view
            setRecentNotifications(prev => prev.filter(n => n.channel !== channelId));

        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateChannel = async (channelData) => {
        try {
            const res = await axios.post(`${API_URL}/api/channels`, channelData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setChannels([...channels, res.data]);
            setIsCreateModalOpen(false);
            setCreateModalType(null);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || 'Error creating channel');
        }
    };

    const handleCreateDM = async (targetUserId) => {
        const existingDM = channels.find(c =>
            c.type === 'DM' &&
            c.allowedUsers &&
            c.allowedUsers.some(u => (u._id || u) === targetUserId) &&
            c.allowedUsers.some(u => (u._id || u) === (user._id || user.id))
        );

        if (existingDM) {
            setActiveChannel(existingDM);
            // Prepare channel with header title
            const headerTitle = getChannelHeaderTitle(existingDM);
            onSelectChannel({ ...existingDM, headerTitle });

            return;
        }

        try {
            const res = await axios.post(`${API_URL}/api/channels`, {
                type: 'DM',
                targetUserId: targetUserId,
                name: 'dm-temp'
            }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });

            const newChannel = res.data;
            if (!channels.find(c => c._id === newChannel._id)) {
                setChannels([...channels, newChannel]);
            }

            setActiveChannel(newChannel);
            // Prepare channel with header title
            const headerTitle = getChannelHeaderTitle(newChannel);
            onSelectChannel({ ...newChannel, headerTitle });

        } catch (err) {
            console.error(err);
        }
    };

    const toggleNode = (id) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedNodes(newExpanded);
    };

    const confirmDeleteChannel = async () => {
        if (!channelToDelete) return;

        try {
            await axios.delete(`${API_URL}/api/channels/${channelToDelete._id}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });

            // Update local state immediately
            setChannels(prev => prev.filter(c => c._id !== channelToDelete._id));

            // If the deleted channel is currently active, clear it
            if (activeChannel?._id === channelToDelete._id) {
                setActiveChannel(null);
                if (onSelectChannel) onSelectChannel(null);
                localStorage.removeItem('lastActiveChannelId');
            }

            setIsDeleteModalOpen(false);
            setChannelToDelete(null);
        } catch (err) {
            console.error("Failed to delete channel", err);
            alert(err.response?.data?.message || err.message || "Failed to delete channel");
        }
    };
    // Use refs to access latest state in socket listeners without re-binding
    const activeChannelRef = useRef(activeChannel);
    const channelsRef = useRef(channels);
    const userRef = useRef(user);

    useEffect(() => {
        activeChannelRef.current = activeChannel;
    }, [activeChannel]);

    useEffect(() => {
        channelsRef.current = channels;
    }, [channels]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Socket Notification Listener
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            const currentUser = userRef.current;
            const currentActiveChannel = activeChannelRef.current;
            const currentChannels = channelsRef.current;

            // Don't notify if message is from self
            if (message.sender?._id === currentUser?._id || message.sender === currentUser?._id) return;

            // Don't notify if looking at that channel
            if (currentActiveChannel && message.channel === currentActiveChannel._id) {
                markChannelAsRead(message.channel);
                return;
            }

            // Play Sound
            const audio = new Audio('/assets/notification.mp3');
            audio.play().catch(e => console.log('Audio playback failed:', e));

            // Trigger Toast Notification via Parent
            if (onNotification) {
                const channel = currentChannels.find(c => c._id === message.channel);
                onNotification({
                    channelId: message.channel,
                    channelName: channel ? getChannelName(channel) : 'Unknown Channel',
                    senderName: message.sender?.name || 'User',
                    content: message.content
                });
            }

            // Update Counts
            setUnreadCounts(prev => ({
                ...prev,
                [message.channel]: (prev[message.channel] || 0) + 1
            }));

            // Add to recent list
            setRecentNotifications(prev => [message, ...prev].slice(0, 20)); // Keep last 20
        };

        const handleChannelUpdate = () => {
            fetchChannels();
        };

        socket.on('message', handleNewMessage);
        socket.on('channelUpdated', handleChannelUpdate);
        socket.on('newChannel', handleChannelUpdate);

        return () => {
            socket.off('message', handleNewMessage);
            socket.off('channelUpdated', handleChannelUpdate);
            socket.off('newChannel', handleChannelUpdate);
        };
    }, [socket]); // Only depend on socket to avoid re-binding loops

    useEffect(() => {
        fetchChannels();
        fetchUnreadCounts(); // Fetch unread counts on refresh
    }, [refreshTrigger]);

    useEffect(() => {
        fetchChannels();
        fetchAllUsers(); // Fetch all users on mount for DM list
        fetchUnreadCounts(); // Fetch unread counts on mount
    }, []);

    // ... (rest of useEffects)

    // Helper: Merge existing DMs with all users
    const getDMChannels = () => {
        if (!user) return [];
        if (!allUsers.length) return channels.filter(c => c.type === 'DM');

        const existingDMs = channels.filter(c => c.type === 'DM');
        const dmUserIds = new Set();
        const uniqueDMs = [];

        // Map existing DMs to their target user IDs and deduplicate existing DMs if necessary
        existingDMs.forEach(dm => {
            const otherUser = dm.allowedUsers.find(u => (u._id || u).toString() !== (user._id || user.id).toString());
            if (otherUser) {
                const otherUserId = (otherUser._id || otherUser).toString();
                if (!dmUserIds.has(otherUserId)) {
                    dmUserIds.add(otherUserId);
                    uniqueDMs.push(dm);
                }
            }
        });

        const potentialDMs = allUsers
            .filter(u => u._id !== user._id && !dmUserIds.has(u._id.toString()))
            .map(u => ({
                _id: `temp_${u._id}`,
                isTemp: true,
                targetUserId: u._id,
                name: u.name, // Display name
                type: 'DM',
                allowedUsers: [user, u] // Mock structure for rendering
            }));

        return [...uniqueDMs, ...potentialDMs];
    };

    const handleChannelClick = (channel) => {
        if (channel.isTemp) {
            handleCreateDM(channel.targetUserId);
        } else {
            setActiveChannel(channel);
            // Prepare channel with header title
            const headerTitle = getChannelHeaderTitle(channel);
            onSelectChannel({ ...channel, headerTitle });
            // Mark as read
            markChannelAsRead(channel._id);

            // Save to localStorage
            localStorage.setItem('lastActiveChannelId', channel._id);
        }
    };

    // Restore last active channel on load if no channel is selected
    useEffect(() => {
        if (!selectedChannelId && channels.length > 0 && !activeChannel) {
            const lastChannelId = localStorage.getItem('lastActiveChannelId');
            if (lastChannelId) {
                const channelToRestore = channels.find(c => c._id === lastChannelId);
                if (channelToRestore) {
                    handleChannelClick(channelToRestore);
                }
            }
        }
    }, [channels, selectedChannelId, activeChannel]);

    // Handle initial selection from URL (selectedChannelId prop)
    useEffect(() => {
        if (selectedChannelId && channels.length > 0) {
            const channel = channels.find(c => c._id === selectedChannelId);
            if (channel && (!activeChannel || activeChannel._id !== channel._id)) {
                handleChannelClick(channel);
                // Also expand parent if needed? Using expand logic might be complex, let's just select it first.
            }
        }
    }, [channels, selectedChannelId, activeChannel]);

    // Helper to get the header title (Name - Role)
    const getChannelHeaderTitle = (channel) => {
        if (!user || !channel) return '';

        if (channel.type === 'DM') {
            const otherUser = channel.allowedUsers.find(u => (u._id || u).toString() !== (user._id || user.id).toString());

            let targetUser = otherUser;
            if (otherUser && (typeof otherUser === 'string' || !otherUser.role)) {
                const found = allUsers.find(u => u._id === (otherUser._id || otherUser));
                if (found) targetUser = found;
            }

            if (targetUser) {
                const roleStr = targetUser.role || targetUser.designation || '';
                return `${targetUser.name}${roleStr ? ` - ${roleStr}` : ''}`;
            }

            return 'Unknown User';
        }
        return channel.name;
    };

    // ... (rest of functions)

    // --- Rendering ---

    const getIcon = (channel) => {
        if (channel.name === 'Offline History') return <Database size={16} className="text-yellow-400" />;
        if (channel.type === 'DM') return <User size={16} className="text-emerald-400" />;
        if (channel.taskId) return <Briefcase size={16} className="text-indigo-400" />; // Task Channel Icon

        // Department Check (New Type OR Legacy Role matching)
        const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
        const departmentNames = new Set(
            allUsers.flatMap(u => Array.isArray(u.role) ? u.role : [u.role])
                .filter(r => r && !systemRoles.includes(r))
        );
        const isLegacyDept = departmentNames.has(channel.name);

        if (channel.type === 'Department' || (channel.type === 'Private' && isLegacyDept)) {
            return <Layers size={16} className="text-orange-400" />; // Department Icon
        }

        // Main Channel (Global or Private Group)
        return <LayoutGrid size={16} className="text-blue-400" />;
    };



    const getChannelName = (channel) => {
        if (channel.type === 'DM') {
            const otherUser = channel.allowedUsers.find(u => (u._id || u).toString() !== (user._id || user.id).toString());

            // Try to find full user object from allUsers if possible to get role
            let targetUser = otherUser;
            if (otherUser && (typeof otherUser === 'string' || !otherUser.role)) {
                const found = allUsers.find(u => u._id === (otherUser._id || otherUser));
                if (found) targetUser = found;
            }

            if (targetUser) {
                return targetUser.name;
            }

            return 'Unknown User';
        }
        return channel.name;
    };

    const renderChannelNode = (channel, level = 0) => {
        const hasChildren = channel.children && channel.children.length > 0;
        const isExpanded = expandedNodes.has(channel._id);
        const displayName = getChannelName(channel);

        return (
            <div key={channel._id} className="relative">
                <div className={`group relative flex items-center px-2 py-1.5 rounded-lg transition-all duration-200 ${activeChannel?._id === channel._id
                    ? 'bg-gradient-to-r from-[#611f69] to-[#541f5a] text-white shadow-md'
                    : 'hover:bg-white/10 hover:text-white text-gray-400'
                    } ${level === 0 ? 'mb-1 mt-2 text-sm font-bold tracking-wide uppercase' : 'text-xs font-medium'}`}
                >
                    {/* Toggle Arrow */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleNode(channel._id); }}
                        className={`p-1 mr-1 hover:text-white transition-opacity ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    <button
                        onClick={() => handleChannelClick(channel)}
                        className="flex-1 flex items-center text-left min-w-0"
                    >
                        {/* Branch Indicator for deep levels */}
                        {level > 0 && <CornerDownRight size={14} className="mr-2 text-primary-600/70 shrink-0" />}
                        <span className={`mr-2 shrink-0 ${activeChannel?._id === channel._id ? 'text-white' : level === 0 ? 'text-gray-300' : 'opacity-70'}`}>{getIcon(channel)}</span>
                        <div className="flex flex-1 items-center w-full min-w-0">
                            <span className="w-[80%] truncate">
                                {displayName}
                            </span>
                            <span className="w-[20%] text-right pl-1 truncate flex items-center justify-end gap-1">
                                {unreadCounts[channel._id] > 0 && (
                                    <span className="text-primary-400 font-bold">
                                        ({String(unreadCounts[channel._id]).padStart(2, '0')})
                                    </span>
                                )}
                                {channel.taskId && (user?.role?.includes('Super Admin') || user?.role?.includes('Admin')) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChannelToDelete(channel);
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all ml-1 shrink-0"
                                        title="Delete Channel"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </span>
                        </div>
                    </button>


                </div>
                {/* Recursively render children */}
                {hasChildren && isExpanded && (
                    <div className="ml-4 pl-2 border-l border-primary-700/30 mt-1 space-y-1">
                        {channel.children.map(child => renderChannelNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const buildTree = (list) => {
        const map = {}, roots = [];
        // Deep clone to avoid mutating state
        const nodes = list.map(c => ({ ...c, children: [] }));
        nodes.forEach(c => map[c._id] = c);

        nodes.forEach(c => {
            if (c.parent && map[c.parent]) {
                map[c.parent].children.push(c);
            } else {
                // If parent is null OR parent ID exists but lookup failed (orphan), treat as root
                roots.push(c);
            }
        });
        return roots;
    };



    const renderRailItem = (id, icon, label, count = 0) => (
        <button
            onClick={() => setActiveView(id)}
            className={`group relative flex flex-col items-center justify-center w-full py-2 transition-all ${activeView === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            title={label}
        >
            <div className={`relative p-2 rounded-xl transition-all duration-300 mb-1 ${activeView === id ? 'bg-primary-600 shadow-lg shadow-primary-900/50' : 'group-hover:bg-white/10'}`}>
                {icon}
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-[#120f1d] animate-pulse">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </div>
            <span className="text-[9px] font-medium tracking-wide uppercase">{label}</span>
            {activeView === id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-500 rounded-r-full" />
            )}
        </button>
    );

    if (!user) {
        return (
            <div className="flex flex-col h-full w-96 bg-[#080610] border-r border-white/5 animate-pulse">
                {/* Skeleton Header */}
                <div className="p-6 bg-[#120f1d] flex items-center gap-3 border-b border-white/5 shrink-0 h-[89px]">
                    <div className="h-10 w-10 rounded-lg bg-white/5" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-white/5 rounded" />
                        <div className="h-3 w-16 bg-white/5 rounded" />
                    </div>
                </div>
                {/* Skeleton Body */}
                <div className="flex-1 flex">
                    <div className="w-20 bg-[#120f1d] border-r border-white/5" />
                    <div className="flex-1 bg-gradient-to-b from-[#1a1528] via-[#100c1d] to-[#080610]" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-96 bg-[#080610] border-r border-white/5">
            {/* 1. User Profile (Full Width) */}
            <div className="p-6 bg-[#120f1d] flex items-center gap-3 border-b border-white/5 shrink-0 z-30">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                    {user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-bold truncate text-white uppercase tracking-wide">{user?.name}</div>
                    <div className="text-[10px] uppercase font-medium text-gray-400 truncate tracking-wider">{user?.designation || user?.role}</div>
                </div>
            </div>



            {/* 3. Split Body: Rail + Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Navigation Rail */}
                <div className="w-20 bg-[#120f1d] flex flex-col items-center py-2 border-r border-white/5 z-20 overflow-y-auto scrollbar-hide">
                    <div className="flex-1 w-full flex flex-col items-center gap-2">
                        {renderRailItem('home', <Home size={20} />, "Home")}
                        {renderRailItem('main', <LayoutGrid size={20} />, "Main")}

                        {renderRailItem('dept', <Layers size={20} />, "Dept")}
                        {renderRailItem('task', <Briefcase size={20} />, "Tasks")}
                        {renderRailItem('dm', <MessagesSquare size={20} />, "DM")}

                        <button
                            onClick={() => {
                                setActiveView('history');
                                const historyChannel = channels.find(c => c.name === 'Offline History');
                                if (historyChannel) {
                                    handleChannelClick(historyChannel);
                                }
                            }}
                            className={`group relative flex flex-col items-center justify-center w-full py-2 transition-all ${activeView === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Offline History"
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 mb-1 ${activeView === 'history' ? 'bg-primary-600 shadow-lg shadow-primary-900/50' : 'group-hover:bg-white/10'}`}>
                                <Database size={20} />
                            </div>
                            <span className="text-[9px] font-medium tracking-wide uppercase">Offline</span>
                            {activeView === 'history' && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-500 rounded-r-full" />
                            )}
                        </button>

                        {renderRailItem('activity', <Bell size={20} />, "Activity", recentNotifications.length)}
                    </div>

                    <div className="mt-auto pb-4 w-full flex flex-col items-center gap-2">
                        <button
                            onClick={() => {
                                // Only Super Admin goes to Admin Dashboard
                                const isSuperAdmin = Array.isArray(user?.role)
                                    ? user.role.includes('Super Admin')
                                    : user?.role === 'Super Admin';

                                if (isSuperAdmin) {
                                    navigate('/dashboard');
                                } else {
                                    navigate('/employee-dashboard');
                                }
                            }}
                            className="group relative flex flex-col items-center justify-center w-full py-2 text-gray-500 hover:text-white transition-all"
                            title="Back to Task Manager"
                        >
                            <div className="p-2 rounded-xl transition-all duration-300 mb-1 group-hover:bg-white/10">
                                <IoReturnDownBack size={20} />
                            </div>
                            <span className="text-[9px] font-medium tracking-wide uppercase">Back</span>
                        </button>

                        <button
                            onClick={logout}
                            className="group relative flex flex-col items-center justify-center w-full py-2 text-gray-500 hover:text-red-400 transition-all"
                            title="Sign Out"
                        >
                            <div className="p-2 rounded-xl transition-all duration-300 mb-1 group-hover:bg-white/10 group-hover:text-red-400">
                                <LogOut size={20} />
                            </div>
                            <span className="text-[9px] font-medium tracking-wide uppercase">Log out</span>
                        </button>
                    </div>
                </div>

                {/* Channel List Content */}
                <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#1a1528] via-[#100c1d] to-[#080610] relative overflow-hidden">

                    {/* Channels List - Filtered */}
                    <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">


                        {/* Main Channel Section */}
                        {(activeView === 'home' || activeView === 'main') && (
                            <>
                                <div className="px-2 mb-1 mt-2 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>Main Channels</span>
                                    {(user?.role?.includes('Super Admin') || user?.role?.includes('Admin')) && (
                                        <button onClick={() => { fetchAllUsers(); setCreateModalType('Global'); setIsCreateModalOpen(true); }} className="hover:text-white transition-colors">
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>
                                {buildTree(channels.filter(c => {
                                    // Main includes: 
                                    // 1. Explicit Global type
                                    // 2. The specific "Fox Digital One Team"
                                    // 3. Private channels that are NOT identified departments (Legacy check)
                                    // AND that are NOT explicit Department type
                                    // AND NOT 'Offline History'
                                    // AND NOT Task Channels (c.taskId)

                                    const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
                                    const departmentNames = new Set(
                                        allUsers.flatMap(u => Array.isArray(u.role) ? u.role : [u.role])
                                            .filter(r => r && !systemRoles.includes(r))
                                    );

                                    const isLegacyDept = departmentNames.has(c.name);

                                    return (c.type === 'Global' || c.name === 'Fox Digital One Team' || (c.type === 'Private' && !isLegacyDept))
                                        && c.type !== 'Department'
                                        && c.name !== 'Offline History'
                                        && !c.taskId; // Exclude Task Channels
                                })).map(node => renderChannelNode(node))}
                            </>
                        )}

                        {/* Department Channels Section */}
                        {(activeView === 'home' || activeView === 'dept') && (
                            <>
                                <div className="px-2 mb-1 mt-4 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>Department Channels</span>
                                    {(user?.role?.includes('Super Admin') || user?.role?.includes('Admin')) && (
                                        <button onClick={() => { fetchAllUsers(); setCreateModalType('Department'); setIsCreateModalOpen(true); }} className="hover:text-white transition-colors">
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>
                                {/* Create Modal */}
                                <CreateChannelModal
                                    isOpen={isCreateModalOpen}
                                    onClose={() => { setIsCreateModalOpen(false); setCreateModalType(null); }}
                                    onCreate={handleCreateChannel}
                                    users={allUsers}
                                    currentUser={user}
                                    initialType={createModalType}
                                />
                                {/* Render Department Channels */}
                                {buildTree(channels.filter(c => {
                                    const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
                                    const departmentNames = new Set(
                                        allUsers.flatMap(u => Array.isArray(u.role) ? u.role : [u.role])
                                            .filter(r => r && !systemRoles.includes(r))
                                    );

                                    const isLegacyDept = departmentNames.has(c.name);
                                    // Include channels that match Department type explicit OR legacy check
                                    return (c.type === 'Department' || (c.type === 'Private' && isLegacyDept && c.type !== 'DM')) && c.name !== 'Offline History';
                                })).map(node => renderChannelNode(node))}
                            </>
                        )}

                        {/* Task Channels Section */}
                        {(activeView === 'home' || activeView === 'task') && (
                            <>
                                <div className="px-2 mb-1 mt-4 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>Task Channels</span>
                                </div>
                                {buildTree(channels.filter(c => c.taskId)).map(node => renderChannelNode(node))}
                            </>
                        )}

                        {/* History Channel Section */}
                        {(activeView === 'home' || activeView === 'history') && (
                            <>
                                <div className="px-2 mb-1 mt-4 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>OFFLINE HISTORY</span>
                                </div>
                                {buildTree(channels.filter(c => c.name === 'Offline History')).map(node => renderChannelNode(node))}
                            </>
                        )}

                        {/* DM Channels Section */}
                        {(activeView === 'home' || activeView === 'dm') && (
                            <>
                                <div className="px-2 mb-1 mt-4 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>Direct Messages</span>
                                </div>
                                {getDMChannels().map(node => renderChannelNode(node))}
                            </>
                        )}

                        {/* Activity View Section */}
                        {activeView === 'activity' && (
                            <>
                                <div className="px-2 mb-1 mt-2 flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                                    <span>Recent Activity</span>
                                    {recentNotifications.length > 0 && (
                                        <button
                                            onClick={() => setRecentNotifications([])}
                                            className="text-[10px] text-red-500 hover:text-white transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {(() => {
                                    const uniqueMap = new Map();
                                    recentNotifications.forEach(msg => {
                                        if (!uniqueMap.has(msg.channel)) {
                                            uniqueMap.set(msg.channel, msg);
                                        }
                                    });

                                    const uniqueActivities = Array.from(uniqueMap.values());

                                    if (uniqueActivities.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-2 opacity-50">
                                                <Bell size={32} />
                                                <span className="text-xs uppercase tracking-widest">No recent activity</span>
                                            </div>
                                        );
                                    }

                                    return uniqueActivities.map((msg, idx) => {
                                        const channel = channels.find(c => c._id === msg.channel);
                                        if (!channel) return null;

                                        const displayName = getChannelName(channel);
                                        const count = unreadCounts[channel._id] || 0;

                                        return (
                                            <div
                                                key={msg.channel}
                                                onClick={() => handleChannelClick(channel)}
                                                className="group relative flex items-start px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all mx-2 mb-2 border border-white/5 hover:border-white/10 hover:shadow-lg"
                                            >
                                                {/* Icon */}
                                                <div className="mr-3 shrink-0 p-2 rounded-lg bg-[#120f1d] mt-1 group-hover:bg-primary-900/40 transition-colors">
                                                    {getIcon(channel)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    {/* Row 1: Channel Name */}
                                                    <div className="mb-1">
                                                        <span className="text-gray-200 font-bold text-sm truncate group-hover:text-white tracking-wide block">
                                                            {displayName}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: Message Count (White) */}
                                                    {count > 0 && (
                                                        <div className="mb-1">
                                                            <span className="text-white font-bold text-xs">
                                                                {count} new message{count > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Row 3: Time with Date */}
                                                    <div>
                                                        <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                                                            {new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </>
                        )}
                    </div>

                    {/* Footer Links (Dashboard) */}
                    {!isPopup && (
                        <div className="p-2 border-t border-white/5">
                            <Link
                                to={(user?.role?.includes('Super Admin') || user?.role?.includes('Admin') || user?.role?.includes('Manager')) ? "/dashboard" : "/employee-dashboard"}
                                className="flex items-center justify-center text-xs text-gray-500 hover:text-white gap-2 w-full p-2 hover:bg-white/5 rounded-lg transition-all"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft size={14} /> <span>Dashboard</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals placed outside overflow container */}
            <ProfileModal isOpen={!!inspectUser} onClose={() => setInspectUser(null)} user={inspectUser} isEditable={false} />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setChannelToDelete(null); }}
                onConfirm={confirmDeleteChannel}
                channelName={getChannelName(channelToDelete || {})}
            />



            {/* Global Users Modal (Manager Only) */}
            {
                showGlobalUsersModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-primary-900 rounded-2xl shadow-2xl w-full max-w-lg border border-primary-700/50 flex flex-col max-h-[85vh] relative">
                            <div className="p-4 border-b border-primary-800 flex justify-between items-center bg-primary-950/50">
                                <h3 className="font-bold text-white flex items-center text-lg">
                                    <User size={18} className="mr-2 text-blue-400" /> Global Directory
                                </h3>
                                <button onClick={() => { setShowGlobalUsersModal(false); setManagerSelectedUser(null); }} className="text-primary-400 hover:text-white">
                                    <X size={22} />
                                </button>
                            </div>

                            {/* Manager Actions Popup */}
                            {managerSelectedUser && (
                                <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in rounded-2xl">
                                    <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-xs text-center relative animate-in zoom-in-95 duration-200">
                                        <button onClick={() => setManagerSelectedUser(null)} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors bg-gray-200 hover:bg-gray-400 rounded-full p-1"><X size={14} /></button>
                                        <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold mb-3 shadow-lg">
                                            {managerSelectedUser.name?.[0]}
                                        </div>
                                        <h4 className="font-bold text-gray-800 text-xl mb-1">{managerSelectedUser.name}</h4>
                                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full mb-4 uppercase">{managerSelectedUser.role}</span>

                                        <div className="space-y-2 mt-4">
                                            {user?.role === 'Super Admin' && (
                                                <button
                                                    onClick={async () => {
                                                        const newRole = managerSelectedUser.role === 'User' ? 'Manager' : 'User';
                                                        if (confirm(`Change role to ${newRole}?`)) {
                                                            await axios.put(`${API_URL}/api/auth/users/${managerSelectedUser._id}/role`, { role: newRole }, { headers: { 'x-auth-token': localStorage.getItem('token') } });
                                                            fetchAllUsers(); setManagerSelectedUser(null);
                                                        }
                                                    }}
                                                    className={`w-full py-2.5 rounded-lg font-bold text-white transition-all shadow-md active:scale-95 ${managerSelectedUser.role === 'User' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}
                                                >
                                                    {managerSelectedUser.role === 'User' ? 'Promote to Manager' : 'Demote to User'}
                                                </button>
                                            )}
                                            <button onClick={() => setInspectUser(managerSelectedUser)} className="w-full py-2.5 border-2 border-gray-100 hover:border-gray-300 text-gray-600 hover:text-gray-800 rounded-lg font-bold transition-all bg-gray-50 hover:bg-gray-100">
                                                View Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative">
                                {allUsers.map(u => (
                                    <div key={u._id} onClick={() => setManagerSelectedUser(u)} className="flex items-center p-3 rounded-xl border border-primary-700/50 bg-primary-800/20 cursor-pointer hover:bg-primary-800 transition-colors">
                                        <div className="h-9 w-9 rounded-lg bg-primary-700 flex items-center justify-center font-bold mr-3 text-primary-200 border border-primary-600">{u.name?.[0]}</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-gray-200">{u.name}</div>
                                            <div className="text-xs text-primary-400">{u.email}</div>
                                        </div>
                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${u.role === 'Super Admin' ? 'bg-purple-500/20 text-purple-300' : u.role === 'Manager' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-800 text-gray-500'}`}>{u.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
