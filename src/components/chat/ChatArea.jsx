import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Trash2, FileText, ExternalLink, Clock, Play, Square, Share2, Download, Search, X, Info, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, List, ListOrdered, Code, Plus, Smile, AtSign, Video, Pause, Users, Hash, Globe, Lock } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import ProfileModal from './ProfileModal';
import MediaModal from './MediaModal';
import VideoRecordModal from './VideoRecordModal';
import MentionSelector from './MentionSelector';
import EmojiPicker from 'emoji-picker-react';
import LinkInsertModal from './LinkInsertModal';
import TaskDetailsPopup from './TaskDetailsPopup';
import CreateChannelModal from './CreateChannelModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DeleteMessageModal from './DeleteMessageModal';
import SuccessModal from './SuccessModal';
import { API_URL } from '../../config';

const ProgressiveImage = ({ lowResSrc, highResSrc, alt, className, onClick }) => {
    const [src, setSrc] = useState(lowResSrc || highResSrc);

    useEffect(() => {
        if (lowResSrc && highResSrc && lowResSrc !== highResSrc) {
            const img = new Image();
            img.src = highResSrc;
            img.onload = () => {
                setSrc(highResSrc);
            };
        }
    }, [lowResSrc, highResSrc]);

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onClick={onClick}
            style={{
                transition: 'filter 0.5s ease-out',
                filter: src === lowResSrc && lowResSrc !== highResSrc ? 'blur(4px)' : 'none'
            }}
        />
    );
};

export default function ChatArea({ activeChannel, user, isSidebarOpen, onChannelCreated, onChannelUpdated }) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const editorRef = useRef(null);

    // Modal & Selection States
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);

    // UI States
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isMentionOpen, setIsMentionOpen] = useState(false);
    const [isFormattingOpen, setIsFormattingOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkModalInitialText, setLinkModalInitialText] = useState('');
    const [activeFormats, setActiveFormats] = useState([]);

    const [inspectUser, setInspectUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [taskInfo, setTaskInfo] = useState(null);

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Members Panel State
    const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]); // Cache for member details

    // Video Record Modal
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    // Create Channel Modal
    const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
    const [createChannelInitialType, setCreateChannelInitialType] = useState(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [addMemberChannel, setAddMemberChannel] = useState(null); // Channel to add members to

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);

    // Offline Sync State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingMessages, setPendingMessages] = useState([]);

    // Scroll ref
    const messageRefs = useRef({});





    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const onEmojiClick = (emojiObject) => {
        editorRef.current?.focus();
        document.execCommand('insertText', false, emojiObject.emoji);
        setNewMessage(editorRef.current?.innerHTML || '');
        setIsEmojiPickerOpen(false);
    };

    useEffect(() => {
        let interval;
        if (isRecording && !isPaused) {
            interval = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else if (!isRecording) {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording, isPaused]);

    // Fetch all users for member lookup
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/users`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setAllUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        if ((isMembersPanelOpen || isMentionOpen) && allUsers.length === 0) {
            fetchUsers();
        }
    }, [isMembersPanelOpen, isMentionOpen]); // Only fetch when panel or mention opens first time

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Audio Recording Refs
    const audioRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            };

            recorder.start();
            audioRecorderRef.current = recorder;
            setIsRecording(true);
            setIsPaused(false);
            setIsPaused(false);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const handleDeleteClick = () => {
        if (!activeChannel) return;
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!activeChannel) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/channels/${activeChannel._id}`, {
                headers: { 'x-auth-token': token }
            });

            setIsDeleteModalOpen(false);
            setIsSuccessModalOpen(true);

            // Note: We'll trigger the parent update/navigation AFTER the success modal closes or user clicks continue
            // But we can also do it immediately if we want the UI to update behind the modal. 
            // Let's do it after so the user sees "Success" while still ostensibly "in" the context (or over overlay).

        } catch (err) {
            console.error("Error deleting channel:", err);
            setIsDeleteModalOpen(false); // Close confirmation
            alert(err.response?.data?.message || "Failed to delete channel");
        }
    };

    const handleSuccessClose = () => {
        setIsSuccessModalOpen(false);
        // Update UI - clear active channel and refresh list
        if (onChannelUpdated && activeChannel) {
            onChannelUpdated({ _id: activeChannel._id, deleted: true });
        }
        setIsMembersPanelOpen(false);
    };

    const handleAddMember = async (channelId, selectedUsers) => {
        try {
            const token = localStorage.getItem('token');
            const userIds = selectedUsers.map(u => (typeof u === 'object' ? u._id : u));

            const res = await axios.post(`${API_URL}/api/channels/${channelId}/members`, {
                userIds
            }, {
                headers: { 'x-auth-token': token }
            });

            // Close modal
            setAddMemberChannel(null);

            // Optionally refresh channel data or rely on socket
            if (activeChannel && activeChannel._id === channelId) {
                if (onChannelUpdated) onChannelUpdated(res.data);
            }

        } catch (err) {
            console.error("Error adding members:", err);
            alert("Failed to add members. Please try again.");
        }
    };

    const handleConfirmDeleteMessage = async () => {
        if (!messageToDelete) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/messages/${messageToDelete._id}`, { headers: { 'x-auth-token': token } });
            setMessages(current => current.filter(m => m._id !== messageToDelete._id));
            setMessageToDelete(null);
        } catch (err) {
            console.error(err);
            alert("Failed to delete message");
            setMessageToDelete(null);
        }
    };



    const handleStopRecording = () => {
        if (audioRecorderRef.current && isRecording) {
            // Assign handler BEFORE stopping to ensure it captures the event
            audioRecorderRef.current.onstop = () => {
                const tracks = audioRecorderRef.current.stream?.getTracks() || [];
                tracks.forEach(track => track.stop());

                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], "voice_message.webm", { type: 'audio/webm' });
                handleFileUpload(file);

                setIsRecording(false);
                setRecordingTime(0);
                audioChunksRef.current = [];
                audioRecorderRef.current = null;
            };
            audioRecorderRef.current.stop();
        }
    };

    const handleCancelRecording = () => {
        if (audioRecorderRef.current) {
            if (audioRecorderRef.current.state !== 'inactive') audioRecorderRef.current.stop();
            // We also need to stop the stream tracks to release the mic
            if (audioRecorderRef.current.stream) {
                audioRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        }
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
        audioRecorderRef.current = null;
    };

    const handleTogglePause = () => {
        if (audioRecorderRef.current) {
            if (isPaused) {
                audioRecorderRef.current.resume();
            } else {
                audioRecorderRef.current.pause();
            }
            setIsPaused(!isPaused);
        }
    };

    const filteredMessages = searchQuery
        ? messages.filter(msg =>
            msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    // Session Logic
    const lastSessionMsg = [...messages].reverse().find(m => m.type === 'session_start' || m.type === 'session_end');
    const isSessionActive = lastSessionMsg?.type === 'session_start';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (activeChannel?.taskId) {
            const fetchTaskInfo = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${API_URL}/api/tasks/${activeChannel.taskId}`, {
                        headers: { 'x-auth-token': token }
                    });
                    setTaskInfo({
                        project: res.data.projectName,
                        title: res.data.taskTitle
                    });
                } catch (err) {
                    console.error("Failed to fetch task info", err);
                    setTaskInfo(null);
                }
            };
            fetchTaskInfo();
        } else {
            setTaskInfo(null);
        }
    }, [activeChannel]);

    // Offline Detection & Sync
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingMessages();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Load pending on mount
        const savedPending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        setPendingMessages(savedPending);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const syncPendingMessages = async () => {
        const savedPending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        if (savedPending.length === 0) return;

        const token = localStorage.getItem('token');
        const remainingPending = [];

        for (const msg of savedPending) {
            try {
                await axios.post(`${API_URL}/api/messages`, {
                    content: msg.content,
                    channelId: msg.channelId,
                    type: msg.type,
                    localId: msg.localId || msg._id, // Ensure ID is passed
                    isOffline: true // Flag for server logging
                }, {
                    headers: { 'x-auth-token': token }
                });
            } catch (err) {
                console.error("Failed to sync message", err);
                remainingPending.push(msg); // Keep if failed
            }
        }

        localStorage.setItem('pendingMessages', JSON.stringify(remainingPending));
        setPendingMessages(remainingPending);
        if (remainingPending.length === 0 && activeChannel) {
            // Refresh messages to show correct timestamps/IDs
            fetchMessages(activeChannel._id);
        }
    };

    useEffect(() => {
        if (activeChannel) {
            fetchMessages(activeChannel._id);
            if (socket) {
                socket.emit('join_channel', activeChannel._id);
            }
        }
    }, [activeChannel, socket]);

    // Use a ref to track activeChannel without triggering re-renders in the effect
    const activeChannelRef = useRef(activeChannel);

    useEffect(() => {
        activeChannelRef.current = activeChannel;
    }, [activeChannel]);

    useEffect(() => {
        if (!socket) return;

        const handleMessageParam = (message) => {
            // Check against ref to access latest state inside callback
            if (activeChannelRef.current && message.channel === activeChannelRef.current._id) {
                setMessages((prev) => {
                    // Dedup based on localId
                    if (message.localId) {
                        const existingIndex = prev.findIndex(m => m.localId === message.localId);
                        if (existingIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[existingIndex] = message; // Replace pending with real
                            return newMessages;
                        }
                    }
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            }
        };

        const handleDeleted = (deletedMsgId) => {
            setMessages((prev) => prev.filter(msg => msg._id !== deletedMsgId));
        };

        socket.on('message', handleMessageParam);
        socket.on('message_deleted', handleDeleted);

        return () => {
            socket.off('message', handleMessageParam);
            socket.off('message_deleted', handleDeleted);
        };
    }, [socket]); // Remove activeChannel from dependency to avoid re-binding constantly

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async (channelId) => {
        // console.log("ChatArea: fetching messages for channelId", channelId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/${channelId}`, {
                headers: { 'x-auth-token': token }
            });
            // console.log("ChatArea: messages fetched", res.data);
            setMessages(res.data);
        } catch (err) {
            console.error("ChatArea: fetchMessages error", err);
        }
    };

    const handleSessionAction = async (action) => {
        if (!activeChannel) return;
        try {
            const token = localStorage.getItem('token');
            const messageData = {
                content: action === 'start' ? 'Session Started' : 'Session Ended',
                channelId: activeChannel._id,
                type: action === 'start' ? 'session_start' : 'session_end'
            };
            await axios.post(`${API_URL}/api/messages`, messageData, { headers: { 'x-auth-token': token } });
        } catch (err) { console.error(err); }
    };

    const handleShareSession = (endMsg) => {
        const endIndex = messages.findIndex(m => m._id === endMsg._id);
        if (endIndex === -1) return;

        let startMsg = null;
        for (let i = endIndex - 1; i >= 0; i--) {
            if (messages[i].type === 'session_start') {
                startMsg = messages[i];
                break;
            }
        }

        if (startMsg) {
            const link = `${window.location.origin}/session/${activeChannel._id}/${startMsg._id}/${endMsg._id}`;
            navigator.clipboard.writeText(link);
            alert("Session Link Copied to Clipboard!");
        } else {
            alert("Could not find the start of this session.");
        }
    };

    const handleExportChat = async () => {
        if (!activeChannel) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/${activeChannel._id}/export`, {
                headers: { 'x-auth-token': token }
            });
            const allMessages = res.data;

            let textContent = `Chat Export: #${activeChannel.name}\nExported on: ${new Date().toLocaleString()}\n\n`;

            allMessages.forEach(msg => {
                const date = new Date(msg.createdAt).toLocaleString();
                const sender = msg.sender?.name || 'Unknown';
                const content = msg.content || (msg.fileUrl ? `[File: ${msg.fileName}]` : '[No Content]');
                textContent += `[${date}] ${sender}:\n${content}\n\n`;
            });

            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeChannel.name}_chat_export.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export chat.");
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();

        const contentToSend = editorRef.current?.innerHTML || newMessage;
        const tempTextDiv = document.createElement('div');
        tempTextDiv.innerHTML = contentToSend;
        const textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';

        if ((!textContent.trim() && !contentToSend.includes('<img')) || !activeChannel) return;

        if (!isOnline) {
            // Offline Mode
            const tempId = Date.now().toString();
            const tempMsg = {
                _id: tempId,
                localId: tempId,
                content: contentToSend,
                channelId: activeChannel._id,
                type: 'text',
                sender: user,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            setMessages(prev => [...prev, tempMsg]);
            const updatedPending = [...pendingMessages, tempMsg];
            setPendingMessages(updatedPending);
            localStorage.setItem('pendingMessages', JSON.stringify(updatedPending));
            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewMessage('');
            return;
        }

        const localId = Date.now().toString();
        try {
            const token = localStorage.getItem('token');
            const messageData = {
                content: contentToSend,
                channelId: activeChannel._id,
                type: 'text',
                localId: localId
            };
            const optimMsg = {
                _id: localId,
                localId: localId,
                content: contentToSend,
                channelId: activeChannel._id,
                type: 'text',
                sender: user,
                createdAt: new Date().toISOString(),
                status: 'sending'
            };
            setMessages(prev => [...prev, optimMsg]);
            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewMessage('');
            await axios.post(`${API_URL}/api/messages`, messageData, { headers: { 'x-auth-token': token } });
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m.localId !== localId));
            alert("Failed to send message");
        }
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const token = localStorage.getItem('token');
            const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
            });
            const { fileUrl, thumbnailUrl, fileName, fileType } = uploadRes.data;
            const messageData = {
                content: 'Attachment',
                channelId: activeChannel._id,
                type: fileType || file.type || 'unknown',
                fileUrl: fileUrl,
                thumbnailUrl: thumbnailUrl,
                fileName: fileName || file.name
            };
            await axios.post(`${API_URL}/api/messages`, messageData, { headers: { 'x-auth-token': token } });
        } catch (err) {
            console.error("Upload failed", err);
            const errMsg = err.response?.data?.message || err.message || "Unknown error";
            alert(`Upload Error: ${errMsg}`);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await handleFileUpload(file);
            e.target.value = null;
        }
    };

    const handleScrollToMessage = (messageId) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        const element = messageRefs.current[messageId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.transition = 'background-color 0.5s';
            element.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Blue tint
            setTimeout(() => {
                element.style.backgroundColor = 'transparent';
            }, 2000);
        }
    };

    const handleCreateChannel = async (channelData) => {
        try {
            const res = await axios.post(`${API_URL}/api/channels`, channelData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setIsCreateChannelModalOpen(false);
            if (onChannelCreated) onChannelCreated();
            alert(`Channel #${channelData.name} created successfully!`);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || 'Error creating channel');
        }
    };

    // Helper to render message content
    const renderMessageContent = (msg, isOwn) => {
        const bubbleText = isOwn ? 'text-white' : 'text-gray-200';
        const subText = isOwn ? 'text-blue-100' : 'text-gray-400';

        if (msg.type?.startsWith('image/') || msg.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return (
                <div className="relative group">
                    <ProgressiveImage
                        lowResSrc={msg.thumbnailUrl}
                        highResSrc={msg.fileUrl}
                        alt="Shared image"
                        className="rounded-lg max-w-full h-auto mb-1 border border-black/10 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity bg-[#222529]"
                        onClick={() => setSelectedMedia({ src: msg.fileUrl, type: 'image', fileName: msg.fileName })}
                    />
                </div>
            );
        } else if (msg.type?.startsWith('video/') || msg.fileUrl?.match(/\.(mp4|mov|mkv)$/i) || (msg.fileUrl?.match(/\.webm$/i) && msg.type !== 'audio/webm')) {
            return (
                <div className="relative group cursor-pointer" onClick={() => setSelectedMedia({ src: msg.fileUrl, type: 'video', fileName: msg.fileName })}>
                    <video className="rounded-lg max-w-full mb-1 border border-black/10 max-h-64 pointer-events-none bg-black">
                        <source src={msg.fileUrl} />
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                            <ExternalLink size={24} className="text-white" />
                        </div>
                    </div>
                </div>
            );
        } else if (msg.type?.startsWith('audio/') || msg.fileUrl?.match(/\.(mp3|wav|ogg)$/i) || (msg.fileUrl?.match(/\.webm$/i) && msg.type === 'audio/webm')) {
            return (
                <div className="min-w-[200px] max-w-[300px] mt-1">
                    <audio controls className="w-full h-10 rounded-lg">
                        <source src={msg.fileUrl} />
                    </audio>
                </div>
            );
        } else if (msg.fileUrl) {
            return (
                <div
                    className={`flex items-center gap-3 p-3 rounded-lg border mb-1 backdrop-blur-sm cursor-pointer transition-colors ${isOwn ? 'bg-white/20 border-white/20 hover:bg-white/30' : 'bg-[#2b2f33] border-white/5 hover:bg-[#34383c]'}`}
                    onClick={() => setSelectedMedia({ src: msg.fileUrl, type: msg.type || 'file', fileName: msg.fileName })}
                >
                    <div className={`h-10 w-10 rounded flex items-center justify-center ${isOwn ? 'bg-black/20 text-white' : 'bg-white/10 text-gray-300'}`}>
                        <FileText size={20} />
                    </div>
                    <div className="flex-1 overflow-hidden min-w-[150px]">
                        <div className={`text-sm font-medium truncate mb-0.5 ${isOwn ? 'text-white' : 'text-gray-200'}`}>{msg.fileName || 'Attachment'}</div>
                        <span className={`text-[10px] ${subText}`}>Click to download</span>
                    </div>
                </div>
            );
        } else {
            return <div className={`text-sm leading-relaxed whitespace-pre-wrap ${bubbleText}`} dangerouslySetInnerHTML={{ __html: msg.content }} />;
        }
    };

    const getMentionUsers = () => {
        if (!activeChannel) return [];
        let users = [];

        // Helper to resolve user ID or Object to full User Object from allUsers cache
        const resolveUser = (u) => {
            if (!u) return null;
            if (typeof u === 'object' && u._id) return u; // Already an object
            // Assume it's an ID
            const found = allUsers.find(au => au._id === u || au.id === u);
            if (found) return found;
            // Fallback if u is object but not fully populated
            if (typeof u === 'object') return u;
            return null;
        };

        // 1. One Team Global Channel - Show EVERYONE
        if (activeChannel.name === 'Fox Digital One Team') {
            users = [...allUsers];
        }
        // 2. Normal Channel Members
        else if (activeChannel.allowedUsers && activeChannel.allowedUsers.length > 0) {
            // resolve IDs
            users = activeChannel.allowedUsers.map(resolveUser).filter(Boolean);
        }

        // 3. Task Specific Members
        if (taskInfo) {
            if (taskInfo.assignedTo) {
                const u = resolveUser(taskInfo.assignedTo);
                if (u) users.push(u);
            }
            if (taskInfo.teamLeads && Array.isArray(taskInfo.teamLeads)) {
                users.push(...taskInfo.teamLeads.map(resolveUser).filter(Boolean));
            }
            if (taskInfo.projectLeads && Array.isArray(taskInfo.projectLeads)) {
                users.push(...taskInfo.projectLeads.map(resolveUser).filter(Boolean));
            }
        }

        // Deduplicate
        const usersMap = new Map();
        users.forEach(u => {
            if (u && (u._id || u.id)) usersMap.set(u._id || u.id, u);
        });

        // Filter out self - ALLOW SELF MENTION
        // if (user) usersMap.delete(user._id || user.id);

        let uniqueUsers = Array.from(usersMap.values());

        // Check current content and filtering
        const currentContent = editorRef.current?.innerText || '';
        if (currentContent) {
            uniqueUsers = uniqueUsers.filter(u => !currentContent.includes(`@${u.name}`));
        }

        return uniqueUsers;
    };

    const handleMentionSelect = (selectedUser) => {
        editorRef.current?.focus();
        // Insert as HTML for bold
        document.execCommand('insertHTML', false, `<b>@${selectedUser.name}</b>&nbsp;`);
        setNewMessage(editorRef.current?.innerHTML || '');
        setIsMentionOpen(false);
    };

    const checkActiveFormats = () => {
        if (!editorRef.current) return;
        const formats = [];
        if (document.queryCommandState('bold')) formats.push('bold');
        if (document.queryCommandState('italic')) formats.push('italic');
        if (document.queryCommandState('underline')) formats.push('underline');
        if (document.queryCommandState('strikeThrough')) formats.push('strikeThrough');
        if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList')) formats.push('insertOrderedList');
        if (document.queryCommandValue('formatBlock') === 'blockquote') formats.push('blockquote');
        if (document.queryCommandValue('formatBlock') === 'pre') formats.push('pre');
        setActiveFormats(formats);
    };



    const execCommand = (command, value = null) => {
        if (command === 'createLink') {
            const selection = window.getSelection();
            if (selection.toString()) {
                setLinkModalInitialText(selection.toString());
            } else {
                setLinkModalInitialText('');
            }
            setIsLinkModalOpen(true);
            return;
        }
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        setNewMessage(editorRef.current?.innerHTML || '');
        checkActiveFormats();
    };

    const handleInsertLink = (text, url) => {
        // Ensure URL has protocol
        const fullUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
        const linkHtml = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline"><b>${text}</b></a>`; // Bold as per requirement
        document.execCommand('insertHTML', false, linkHtml);
        editorRef.current?.focus();
        setNewMessage(editorRef.current?.innerHTML || '');
    };

    const isActive = (format) => activeFormats.includes(format);


    const toggleCodeBlock = () => {
        // Check directly if we are in a pre block (case insensitive just in case)
        const currentFormat = document.queryCommandValue('formatBlock');
        const isPre = currentFormat && currentFormat.toLowerCase() === 'pre';

        editorRef.current?.focus(); // Ensure focus

        if (isPre) {
            const selection = window.getSelection();
            if (selection.isCollapsed) {
                // If caret is inside code block, user wants to "break out" to a new line
                // We purposefully create a new line, then format it as a DIV to strip the PRE styling
                document.execCommand('insertParagraph');
                document.execCommand('formatBlock', false, 'div');
            } else {
                // If text is selected, convert current selection to normal text (div)
                document.execCommand('formatBlock', false, 'div');
            }
        } else {
            // Start code block
            document.execCommand('formatBlock', false, 'pre');
        }

        // Force update of toolbar state
        checkActiveFormats();
    };

    return (
        <div className="flex-1 flex flex-row h-full relative overflow-hidden bg-[#1A1D21] text-gray-200 font-sans">
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">

                {/* Members Off-Canvas Panel (WhatsApp Style) */}
                {isMembersPanelOpen && (
                    <div className="absolute top-0 right-0 h-full w-80 bg-[#111b21] border-l border-white/10 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">

                        {/* Header */}
                        <div className="h-14 flex items-center px-4 bg-[#202c33] shrink-0 gap-3">
                            <button onClick={() => setIsMembersPanelOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-base font-medium text-white">Contact Info</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#111b21]">

                            {/* Profile Section */}
                            <div className="bg-[#111b21] flex flex-col items-center py-8 border-b border-[#202c33]">
                                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4 shadow-lg shrink-0">
                                    {activeChannel?.type === 'DM' ? (
                                        <span className="text-4xl font-bold text-white uppercase">
                                            {(activeChannel.headerTitle?.[0] || activeChannel.name?.[0] || 'U')}
                                        </span>
                                    ) : (
                                        <Users size={48} className="text-white/80" />
                                    )}
                                </div>
                                <h2 className="text-xl font-medium text-gray-100 text-center px-6 break-words">
                                    {activeChannel?.headerTitle || activeChannel?.name}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    {activeChannel?.type === 'Global' ? 'Global Channel' :
                                        activeChannel?.type === 'DM' ? 'Direct Message' : 'Group Channel'}
                                </p>
                            </div>

                            {/* Separator */}
                            <div className="h-2 bg-[#0b141a]"></div>

                            {/* Members Section */}
                            <div className="bg-[#111b21] pb-4">
                                <div className="p-4 pb-2 text-gray-400 text-sm font-medium">
                                    {activeChannel?.name === 'Fox Digital One Team'
                                        ? `${allUsers.length} members`
                                        : `${activeChannel?.allowedUsers?.length || 0} members`
                                    }
                                </div>

                                {/* Add Member Action */}
                                {(() => {
                                    const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
                                    const departmentNames = new Set(
                                        allUsers.flatMap(u => Array.isArray(u.role) ? u.role : [u.role])
                                            .filter(r => r && !systemRoles.includes(r))
                                    );
                                    const isDepartmentChannel = departmentNames.has(activeChannel?.name);
                                    const isGlobalChannel = activeChannel?.name === 'Fox Digital One Team';

                                    // Allow for Department channels too now
                                    // Logic: Show if NOT DM and NOT Global (except One Team is treated potentially differently, but requirement says Add Members needed)
                                    // Actually, One Team might be auto-managed, but let's allow manual add if needed or keep it restricted.
                                    // User said "Add Members" button... implies for Group/Department channels.

                                    if (activeChannel?.type !== 'DM' && !isGlobalChannel && user?.role?.includes('Super Admin')) {
                                        return (
                                            <button
                                                onClick={() => setAddMemberChannel(activeChannel)}
                                                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#202c33] transition-colors text-left group"
                                            >
                                                <div className="h-10 w-10 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                                                    <Plus size={20} className="text-white" />
                                                </div>
                                                <div className="text-base text-gray-200 group-hover:text-white">Add members</div>
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Member List */}
                                <div className="mt-2">
                                    {/* Global Channel Logic - ONLY for Fox Digital One Team */}
                                    {activeChannel?.name === 'Fox Digital One Team' ? (
                                        allUsers.map(u => (
                                            <div key={u._id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors group border-b border-[#202c33]/50 last:border-0">
                                                <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center font-medium text-white shrink-0 uppercase">
                                                    {u.name?.[0]}
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <div className="text-base text-gray-200 truncate">{u.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{u.role || u.designation || 'Employee'}</div>
                                                </div>
                                                {u.role && u.role.includes('Admin') && (
                                                    <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded border border-[#00a884]/30">Admin</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        activeChannel?.allowedUsers?.length > 0 ? (
                                            activeChannel.allowedUsers.map(memberId => {
                                                const member = typeof memberId === 'object' ? memberId : allUsers.find(u => u._id === memberId);
                                                if (!member) return null;

                                                return (
                                                    <div key={member._id || member} className="flex items-center gap-4 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors group border-b border-[#202c33]/50 last:border-0">
                                                        <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center font-medium text-white shrink-0 uppercase">
                                                            {member.name?.[0]}
                                                        </div>
                                                        <div className="overflow-hidden flex-1">
                                                            <div className="text-base text-gray-200 truncate">{member.name}</div>
                                                            <div className="text-xs text-gray-500 truncate">{member.role || member.designation || 'Employee'}</div>
                                                        </div>
                                                        {member.role && member.role.includes('Admin') && (
                                                            <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded border border-[#00a884]/30">Admin</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center text-gray-500 text-sm py-4 italic">
                                                No other members
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Delete Channel Option */}

                                {activeChannel?.isManual === true && // Strict check for manually created channels
                                    (user?.role?.includes('Super Admin') || user?.role?.includes('Admin')) && (
                                        <div className="mt-6 px-4 pb-8 border-t border-[#202c33] pt-6">
                                            <button
                                                onClick={handleDeleteClick}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/20"
                                            >
                                                <Trash2 size={16} />
                                                Delete Channel
                                            </button>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} isEditable={true} />
                {selectedMedia && <MediaModal src={selectedMedia.src} type={selectedMedia.type} fileName={selectedMedia.fileName} onClose={() => setSelectedMedia(null)} />}
                <ProfileModal isOpen={!!inspectUser} onClose={() => setInspectUser(null)} user={inspectUser} isEditable={false} />
                <VideoRecordModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} onSend={handleFileUpload} />

                {/* Header */}
                <div className="h-16 flex items-center px-6 justify-between bg-[#1A1D21] border-b border-white/5 shadow-sm z-20">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                            {taskInfo ? (
                                <span>{taskInfo.project} - {taskInfo.title}</span>
                            ) : (
                                activeChannel ? (
                                    activeChannel.headerTitle ? (
                                        <span>{activeChannel.headerTitle}</span>
                                    ) : (
                                        <><span className="text-gray-500">#</span> {activeChannel.name}</>
                                    )
                                ) : 'Select a channel'
                            )}
                        </h3>
                        <p className="text-xs text-gray-500">Team discussion and updates</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Export */}
                        {activeChannel?.parent && (user?.role?.includes('Super Admin') || user?.role?.includes('Admin') || user?.role?.includes('Manager')) && (
                            <button onClick={handleExportChat} className="p-2 mr-1 rounded-lg bg-[#222529] text-gray-400 hover:bg-[#2b2f33] hover:text-emerald-400 transition-colors" title="Export Chat">
                                <Download size={20} />
                            </button>
                        )}

                        {/* Task Details Popup Trigger */}
                        {activeChannel?.taskId && (
                            <button
                                onClick={() => setIsTaskDetailsOpen(true)}
                                className="p-2 mr-1 rounded-lg bg-[#222529] text-gray-400 hover:bg-[#2b2f33] hover:text-indigo-400 transition-colors"
                                title="Task Details"
                            >
                                <Info size={20} />
                            </button>
                        )}



                        {/* Search */}
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className={`p-2 mr-2 rounded-lg transition-colors ${isSearchOpen ? 'bg-blue-900/40 text-blue-400' : 'bg-[#222529] text-gray-400 hover:bg-[#2b2f33]'}`}
                            title="Search Chats"
                        >
                            <Search size={20} />
                        </button>

                        {/* Channel/DM Profile & Members Toggle */}
                        <button onClick={() => setIsMembersPanelOpen(!isMembersPanelOpen)} className={`h-9 w-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center font-bold hover:brightness-110 transition-all shadow-sm text-sm ${isMembersPanelOpen ? 'ring-2 ring-blue-400' : ''}`} title="View Members">
                            {(activeChannel?.headerTitle?.[0] || activeChannel?.name?.[0] || 'C').toUpperCase()}
                        </button>
                    </div>
                </div>

                {/* Search Popup */}
                {
                    isSearchOpen && (
                        <div className="absolute top-20 right-6 w-80 bg-[#222529] border border-white/10 rounded-xl shadow-2xl z-30 flex flex-col max-h-[60%] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-[#1A1D21]">
                                <Search size={16} className="text-gray-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search messages..."
                                    className="bg-transparent border-none text-gray-200 text-sm focus:ring-0 flex-1 outline-none placeholder-gray-600"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-700 max-h-64">
                                {searchQuery === '' ? (
                                    <div className="text-center text-gray-600 text-xs py-8">Type to find messages...</div>
                                ) : filteredMessages.length > 0 ? (
                                    filteredMessages.map(msg => (
                                        <div key={msg._id || msg.id} className="p-3 hover:bg-[#2b2f33] cursor-pointer border-b border-white/5 last:border-0 transition-colors group" onClick={() => handleScrollToMessage(msg._id || msg.id)}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-gray-300">{msg.sender?.name || 'Unknown'}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 line-clamp-2">{msg.content}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 text-xs py-8">No matching messages found</div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Session Bar */}
                {
                    activeChannel?.parent && (
                        <div className="h-10 bg-[#1A1D21] border-b border-white/5 flex items-center justify-between px-6 z-10 text-xs shadow-sm">
                            <div className="flex items-center gap-4 text-gray-400 font-mono">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-600" />
                                    <span>{currentTime.toLocaleDateString()}</span>
                                    <span className="w-px h-3 bg-gray-700 mx-1"></span>
                                    <span>{currentTime.toLocaleTimeString([], { hour12: false })}</span>
                                </div>
                            </div>
                            {(user?.role?.includes('Super Admin') || user?.role?.includes('Admin') || user?.role?.includes('Manager')) && (
                                <div>
                                    {!isSessionActive ? (
                                        <button onClick={() => handleSessionAction('start')} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded shadow-sm text-[10px] font-bold uppercase tracking-wider transition-all">
                                            <Play size={10} fill="currentColor" /> Start Session
                                        </button>
                                    ) : (
                                        <button onClick={() => handleSessionAction('stop')} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow-sm text-[10px] font-bold uppercase tracking-wider transition-all">
                                            <Square size={10} fill="currentColor" /> Stop Session
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-60">
                            <div className="h-20 w-20 bg-[#222529] rounded-full flex items-center justify-center mb-4">
                                <Send size={32} className="text-gray-500 ml-1" />
                            </div>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isOwn = msg.sender?.name === user?.name || msg.sender?._id === user?.id || msg.sender === user?.id;
                        return (
                            <div key={msg._id || msg.id} ref={(el) => (messageRefs.current[msg._id || msg.id] = el)} className={`flex group ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>

                                {/* Avatar for others */}
                                {!isOwn && (
                                    <div
                                        className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-sm mr-2 mt-1 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => setInspectUser(msg.sender)}
                                        title={msg.sender?.name}
                                    >
                                        {msg.sender?.name?.[0] || '?'}
                                    </div>
                                )}

                                <div className={`relative max-w-[70%] shadow-sm ${msg.type === 'session_start' || msg.type === 'session_end' ? 'w-full max-w-none shadow-none' : 'rounded-2xl px-5 py-3'} 
                                ${isOwn ? 'bg-[#007a5a] text-white rounded-br-sm' : 'bg-[#222529] text-gray-200 border border-white/5 rounded-bl-sm'} 
                                ${msg.status === 'pending' ? 'opacity-70' : ''}`}
                                >
                                    {/* Delete Button */}
                                    {(user?.role?.includes('Manager') || user?.role?.includes('Super Admin') || user?.role?.includes('Admin')) && msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                        <button
                                            onClick={() => setMessageToDelete(msg)}
                                            className={`absolute -top-2 ${isOwn ? '-left-2' : '-right-2'} hidden group-hover:flex bg-red-900/80 text-red-200 border border-red-800 rounded-full p-1 shadow-sm hover:bg-red-800 transition-colors z-10`}
                                            title="Delete Message"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}

                                    {/* Sender Name for others in group chats (optional, redundant with avatar but good for clarity) */}
                                    {!isOwn && msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                        <div className="text-[10px] font-bold text-indigo-400 mb-1 cursor-pointer hover:underline" onClick={() => setInspectUser(msg.sender)}>
                                            {msg.sender?.name || 'Unknown'}
                                        </div>
                                    )}

                                    {/* Content */}
                                    {msg.type === 'session_start' ? (
                                        <div className="flex items-center gap-4 my-2 opacity-80">
                                            <div className="h-px bg-emerald-800 flex-1"></div>
                                            <div className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-800">
                                                Session Started • {new Date(msg.createdAt).toLocaleTimeString()}
                                            </div>
                                            <div className="h-px bg-emerald-800 flex-1"></div>
                                        </div>
                                    ) : msg.type === 'session_end' ? (
                                        <div className="flex items-center gap-4 my-2 opacity-80">
                                            <div className="h-px bg-red-800 flex-1"></div>
                                            <div className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-800 flex items-center gap-2">
                                                <span>Session Ended • {new Date(msg.createdAt).toLocaleTimeString()}</span>
                                                <button onClick={() => handleShareSession(msg)} className="text-red-400 hover:text-red-300 transition-colors"><Share2 size={12} /></button>
                                            </div>
                                            <div className="h-px bg-red-800 flex-1"></div>
                                        </div>
                                    ) : renderMessageContent(msg, isOwn)}

                                    {/* Timestamp */}
                                    {msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                        <div className={`text-[9px] mt-1 flex justify-end items-center gap-1 ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                                            {msg.status === 'pending' && <Clock size={8} className="animate-pulse" />}
                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#1A1D21] border-t border-white/5 z-20 relative">
                    <div className="rounded-xl border border-white/10 bg-[#222529] flex flex-col transition-colors focus-within:border-white/30">
                        {/* Top Formatting Toolbar */}
                        {isFormattingOpen && (
                            <div className="flex items-center gap-0.5 p-1.5 overflow-x-auto scrollbar-hide animate-in slide-in-from-top-2 fade-in duration-200 border-b border-white/5 bg-[#1F2226]">
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')} className={`p-1.5 rounded transition-colors ${isActive('bold') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Bold"><Bold size={14} /></button>
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')} className={`p-1.5 rounded transition-colors ${isActive('italic') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Italic"><Italic size={14} /></button>
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('underline')} className={`p-1.5 rounded transition-colors ${isActive('underline') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Underline"><Underline size={14} /></button>
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('strikeThrough')} className={`p-1.5 rounded transition-colors ${isActive('strikeThrough') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Strikethrough"><Strikethrough size={14} /></button>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('createLink')} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Link"><LinkIcon size={14} /></button>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                {/* Numbered List Icon */}
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className={`p-1.5 rounded transition-colors ${isActive('insertOrderedList') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Numbered List">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g opacity="0.9">
                                            <path d="M1.5 3.5H2.5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M1.5 8.5H3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            <rect x="5" y="4" width="8" height="1.5" rx="0.75" fill="currentColor" />
                                            <rect x="5" y="7" width="6" height="1.5" rx="0.75" fill="currentColor" />
                                            <rect x="1.5" y="11" width="11.5" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.5" />
                                        </g>
                                    </svg>
                                </button>

                                {/* Bullet List Icon */}
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className={`p-1.5 rounded transition-colors ${isActive('insertUnorderedList') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Bullet List">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g opacity="0.9">
                                            <circle cx="2.5" cy="4.75" r="1.5" fill="currentColor" />
                                            <rect x="5.5" y="4" width="7.5" height="1.5" rx="0.75" fill="currentColor" />

                                            <circle cx="2.5" cy="8.75" r="1.5" fill="currentColor" />
                                            <rect x="5.5" y="8" width="5.5" height="1.5" rx="0.75" fill="currentColor" />

                                            <rect x="2.5" y="11.5" width="9" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.5" />
                                        </g>
                                    </svg>
                                </button>

                                {/* Vertical Line (Quote) Icon */}
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('formatBlock', 'blockquote')} className={`p-1.5 rounded transition-colors ${isActive('blockquote') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Quote">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="1.5" y="2" width="1.5" height="10" rx="0.75" fill="currentColor" />
                                        <rect x="4.5" y="3" width="8" height="1.5" rx="0.75" fill="currentColor" />
                                        <rect x="4.5" y="6" width="6" height="1.5" rx="0.75" fill="currentColor" />
                                        <rect x="4.5" y="9" width="7" height="1.5" rx="0.75" fill="currentColor" />
                                    </svg>
                                </button>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                {/* Code Block Icon: </> */}
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={toggleCodeBlock} className={`p-1.5 rounded transition-colors ${isActive('pre') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title="Code Block">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 9.5L2 7L4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9.5 4.5L12 7L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8.5 2.5L5.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Text Input */}
                        <div className="p-2 relative">
                            <div
                                ref={editorRef}
                                contentEditable
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-gray-200 placeholder-gray-500 min-h-[40px] max-h-[200px] p-2 text-sm scrollbar-hide font-sans leading-relaxed transition-all overflow-y-auto empty:before:content-[attr(placeholder)] empty:before:text-gray-500 empty:before:cursor-text"
                                placeholder={`Message ${activeChannel?.name ? '#' + activeChannel.name : 'Saarathi'}`}
                                onInput={(e) => {
                                    const content = e.currentTarget.innerText; // Use innerText to get plain text content
                                    // Check if the user just typed "1. " at the start or after a newline
                                    // We need to be careful not to trigger if it's already a list item.
                                    // A simple check is if the text content *ends* with "1. " or matches "1. " exactly
                                    // But contentEditable can be tricky.

                                    // Let's try a regex on the current selection's text node
                                    const selection = window.getSelection();
                                    if (selection.rangeCount > 0) {
                                        const range = selection.getRangeAt(0);
                                        const node = range.startContainer;

                                        // Ensure we are in a text node
                                        if (node.nodeType === Node.TEXT_NODE) {
                                            const text = node.textContent;
                                            // Check if the text matches "1. " exactly (and user just typed space)
                                            // But "1. " might be "1.&nbsp;" depending on browser

                                            // Better approach: Check if the *current line* text is "1. "
                                            // And if we are NOT already in a list.
                                            if ((text === '1. ' || text === '1.\u00A0') && !document.queryCommandState('insertOrderedList')) {
                                                // Clear the "1. " text
                                                node.textContent = '';
                                                // Execute ordered list command
                                                document.execCommand('insertOrderedList');
                                            }
                                        }
                                    }
                                    setNewMessage(e.currentTarget.innerHTML);
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                }}
                                onKeyUp={checkActiveFormats}
                                onMouseUp={checkActiveFormats}
                                onClick={checkActiveFormats}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        // If in a list, Let browser handle Enter (creates new list item)
                                        if (document.queryCommandState('insertOrderedList') || document.queryCommandState('insertUnorderedList')) {
                                            return;
                                        }
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                style={{ minHeight: '60px' }}
                            />
                        </div>

                        {/* Emoji Picker */}
                        {isEmojiPickerOpen && (
                            <div className="absolute bottom-16 left-4 z-50 emoji-picker-container">
                                <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                            </div>
                        )}

                        {/* Bottom Toolbar */}
                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-1">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors bg-white/5" title="Attach File">
                                    <Paperclip size={16} />
                                </button>


                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                                        className={`h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors bg-white/5 ${isCreateMenuOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                                        title="Create Channel"
                                    >
                                        <Plus size={16} />
                                    </button>

                                    {isCreateMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsCreateMenuOpen(false)} />
                                            <div className="absolute bottom-10 left-0 bg-[#2B2D31] border border-[#1E1F22] rounded-lg shadow-xl z-50 w-56 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-100 ring-1 ring-black/20">
                                                <div className="py-1">
                                                    <button
                                                        onClick={() => {
                                                            setCreateChannelInitialType('Global');
                                                            setIsCreateChannelModalOpen(true);
                                                            setIsCreateMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-[#35373C] text-gray-200 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <Globe size={16} className="text-gray-400" />
                                                        <span>Create Main Channel</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCreateChannelInitialType('Private');
                                                            setIsCreateChannelModalOpen(true);
                                                            setIsCreateMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-[#35373C] text-gray-200 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <Lock size={16} className="text-gray-400" />
                                                        <span>Create Department Channel</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button type="button" onClick={() => setIsFormattingOpen(!isFormattingOpen)} className={`h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors ${isFormattingOpen ? 'bg-white/10 text-white' : ''}`}>
                                    <span className="font-serif font-bold text-sm">Aa</span>
                                </button>
                                <button type="button" onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                                    <Smile size={18} />
                                </button>
                                <div className="relative">
                                    {isMentionOpen && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                                            <MentionSelector
                                                users={getMentionUsers()}
                                                onSelect={handleMentionSelect}
                                                onClose={() => setIsMentionOpen(false)}
                                                currentUser={user}
                                            />
                                        </div>
                                    )}
                                    <button type="button" onClick={() => setIsMentionOpen(!isMentionOpen)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                                        <AtSign size={18} />
                                    </button>
                                </div>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button type="button" onClick={() => setIsVideoModalOpen(true)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                                    <Video size={18} />
                                </button>
                                {isRecording ? (
                                    <div className="flex items-center gap-4 bg-red-950/40 pl-4 pr-2 py-1.5 rounded-full border border-red-500/20 animate-in fade-in zoom-in duration-200">
                                        <div className="flex items-center gap-3 mr-2">
                                            <div className={`h-2.5 w-2.5 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : 'opacity-50'}`} />
                                            <span className="text-red-200 font-mono text-sm font-medium w-[40px]">{formatTime(recordingTime)}</span>

                                            {/* Visualizer Placeholder */}
                                            <div className="flex items-center gap-0.5 h-4 w-12 mx-2">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div
                                                        key={i}
                                                        className={`w-1 bg-red-500/50 rounded-full transition-all duration-300 ${!isPaused ? 'animate-pulse' : ''}`}
                                                        style={{
                                                            height: !isPaused ? `${Math.random() * 100}%` : '20%',
                                                            animationDelay: `${i * 0.1}s`
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                                            <button
                                                type="button"
                                                onClick={handleTogglePause}
                                                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full text-red-300 transition-colors"
                                                title={isPaused ? "Resume" : "Pause"}
                                            >
                                                {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsRecording(false);
                                                    setIsPaused(false);
                                                    // handleSendRecording() logic here
                                                    handleStopRecording();
                                                }}
                                                className="h-8 w-8 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg shadow-red-900/20 transition-all mx-1"
                                                title="Send Voice Message"
                                            >
                                                <Send size={14} fill="currentColor" className="ml-0.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleCancelRecording}
                                                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleStartRecording}
                                        className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                        title="Record Voice Message"
                                    >
                                        <Mic size={18} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${newMessage.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'text-gray-600 cursor-not-allowed'}`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div >

            {/* Toggle delete modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                channelName={activeChannel?.name || 'Channel'}
            />

            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessClose}
                message="Channel Deleted Successfully"
            />

            <DeleteMessageModal
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={handleConfirmDeleteMessage}
            />

            {/* Task Details Popup */}
            {
                isTaskDetailsOpen && activeChannel?.taskId && (
                    <TaskDetailsPopup
                        taskId={activeChannel.taskId}
                        onClose={() => setIsTaskDetailsOpen(false)}
                    />
                )
            }

            <LinkInsertModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onInsert={handleInsertLink}
                initialText={linkModalInitialText}
            />

            <CreateChannelModal
                isOpen={isCreateChannelModalOpen}
                onClose={() => setIsCreateChannelModalOpen(false)}
                onCreate={handleCreateChannel}
                users={allUsers}
                currentUser={user}
                initialType={createChannelInitialType}
            />

            {
                addMemberChannel && (
                    <CreateChannelModal
                        isOpen={!!addMemberChannel}
                        onClose={() => setAddMemberChannel(null)}
                        channel={addMemberChannel}
                        users={allUsers}
                        currentUser={user}
                        onAddMembers={handleAddMember}
                    />
                )
            }
        </div >
    );
}
