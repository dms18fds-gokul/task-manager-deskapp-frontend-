import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Device } from '@capacitor/device';
import ProfileModal from './ProfileModal';
import MediaModal from './MediaModal';
import { Send, Paperclip, Mic, Trash2, FileText, ExternalLink, Clock, Play, Square, Share2, Download, Search, X, Info, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, List, ListOrdered, Code, Plus, Smile, AtSign, Video, Pause, Users, Hash, Globe, Lock, Check, CheckCheck, MoreVertical, Edit2, Image as ImageIcon, Music, CheckCircle, ChevronDown, Reply, Pin, Copy, CornerUpLeft } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import LinkInsertModal from './LinkInsertModal';
import MessageInfoModal from './MessageInfoModal';
import TaskDetailsPopup from './TaskDetailsPopup';
import CreateChannelModal from './CreateChannelModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DeleteMessageModal from './DeleteMessageModal';
import SuccessModal from './SuccessModal';
import { API_URL, LOCAL_UPLOAD_URL } from '../../utils/config';
import DownloadHistoryModal from './DownloadHistoryModal';


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

const linkify = (text) => {
    if (!text) return text;
    // Basic URL regex
    const urlPattern = /(https?:\/\/[^\s<]+)/g;

    // Split by existing anchor tags to avoid double-linkifying
    const parts = text.split(/(<a\s+[^>]*>.*?<\/a>)/gi);

    return parts.map(part => {
        if (part.startsWith('<a')) return part;
        return part.replace(urlPattern, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline cursor-pointer font-bold">${url}</a>`;
        });
    }).join('');
};

export default function ChatArea({ activeChannel, user, isSidebarOpen, onChannelCreated, onChannelUpdated }) {
    const { socket, lastMessage } = useSocket();
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
    const [isFormattingOpen, setIsFormattingOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkModalInitialText, setLinkModalInitialText] = useState('');
    const [activeFormats, setActiveFormats] = useState([]);

    const [inspectUser, setInspectUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [taskInfo, setTaskInfo] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Members Panel State
    const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]); // Cache for member details


    // Create Channel Modal
    const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
    const [createChannelInitialType, setCreateChannelInitialType] = useState(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [addMemberChannel, setAddMemberChannel] = useState(null); // Channel to add members to

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // { _id, content, senderName }
    const [messageInfo, setMessageInfo] = useState(null); // Specific message for "Message Info"
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const chatContainerRef = useRef(null);

    // Media Preview State
    const [pendingFiles, setPendingFiles] = useState([]);

    // Offline Sync State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingMessages, setPendingMessages] = useState([]);
    const [isApprovalMode, setIsApprovalMode] = useState(false);

    // Scroll ref
    const messageRefs = useRef({});
    const isInitialLoad = useRef(true);
    const [historyItem, setHistoryItem] = useState(null);






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
                const res = await axios.get(`${API_URL}/auth/users`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setAllUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
            } catch (err) {
            }
        };
        // Fetch users if they haven't been fetched yet
        if (allUsers.length === 0) {
            fetchUsers();
        }
    }, []); // Run on mount to ensure user details are available for Message Info

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
            await axios.delete(`${API_URL}/channels/${activeChannel._id}`, {
                headers: { 'x-auth-token': token }
            });

            setIsDeleteModalOpen(false);
            setIsSuccessModalOpen(true);

            // Note: We'll trigger the parent update/navigation AFTER the success modal closes or user clicks continue
            // But we can also do it immediately if we want the UI to update behind the modal. 
            // Let's do it after so the user sees "Success" while still ostensibly "in" the context (or over overlay).

        } catch (err) {
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

            const res = await axios.post(`${API_URL}/channels/${channelId}/members`, {
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
            alert("Failed to add members. Please try again.");
        }
    };

    const handleConfirmDeleteMessage = async () => {
        if (!messageToDelete) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/messages/${messageToDelete._id}`, { headers: { 'x-auth-token': token } });
            const { messageData } = res.data;
            if (messageData) {
                setMessages(current => current.map(m =>
                    m._id === messageData.messageId ? { ...m, ...messageData } : m
                ));
            }
            setMessageToDelete(null);
        } catch (err) {
            alert("Failed to delete message");
            setMessageToDelete(null);
        }
    };

    const handleApprove = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/messages/${messageId}/approval`, { status: 'approved' }, {
                headers: { 'x-auth-token': token }
            });
            // Automated reply is now handled by the backend (editing the "Waiting..." message)
        } catch (err) {
            alert("Failed to approve message");
        }
    };

    const handleReject = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/messages/${messageId}/approval`, { status: 'rejected' }, {
                headers: { 'x-auth-token': token }
            });
            // Automated reply is now handled by the backend (editing the "Waiting..." message)
        } catch (err) {
            alert("Failed to reject message");
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
                handleFileUpload(file, isApprovalMode);

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
                    const res = await axios.get(`${API_URL}/tasks/${activeChannel.taskId}`, {
                        headers: { 'x-auth-token': token }
                    });
                    setTaskInfo({
                        project: res.data.projectName,
                        title: res.data.taskTitle
                    });
                } catch (err) {
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
                await axios.post(`${API_URL}/messages`, {
                    content: msg.content,
                    channelId: msg.channelId,
                    type: msg.type,
                    localId: msg.localId || msg._id, // Ensure ID is passed
                    isOffline: true // Flag for server logging
                }, {
                    headers: { 'x-auth-token': token }
                });
            } catch (err) {
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

        const handleMessageParam = async (message) => {
            // Check against ref to access latest state inside callback
            if (activeChannelRef.current && message.channel === activeChannelRef.current._id) {
                setMessages((prev) => {
                    // Dedup based on localId
                    if (message.localId) {
                        const existingIndex = prev.findIndex(m => m.localId === message.localId);
                        if (existingIndex !== -1) {
                            const newMessages = [...prev];
                            const currentMsg = newMessages[existingIndex];

                            // Merge real-time arrays to prevent race conditions
                            const mergedDeliveredTo = Array.from(new Set([
                                ...(message.deliveredTo || []),
                                ...(currentMsg.deliveredTo || [])
                            ]));
                            const mergedReadBy = Array.from(new Set([
                                ...(message.readBy || []),
                                ...(currentMsg.readBy || [])
                            ]));

                            newMessages[existingIndex] = {
                                ...message,
                                deliveredTo: mergedDeliveredTo,
                                readBy: mergedReadBy
                            };
                            return newMessages;
                        }
                    }
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });

                // Mark as delivered if not the sender
                if (user && message.sender && (message.sender._id !== user._id && message.sender._id !== user.id && message.sender !== user._id && message.sender !== user.id)) {
                    try {
                        const token = localStorage.getItem('token');
                        await axios.put(`${API_URL}/messages/delivered/${message._id}`, {}, {
                            headers: { 'x-auth-token': token }
                        });
                    } catch (err) {
                    }
                }
            }
        };

        const handleDeleted = ({ messageId, isDeleted, deletedBy, deletedAt }) => {
            const isSuperAdmin = user?.role?.includes('Super Admin');
            setMessages((prev) => {
                if (!isSuperAdmin) {
                    // Remove message for non-super admins
                    return prev.filter(msg => msg._id !== messageId);
                }
                // Update message with deletion metadata for super admins
                return prev.map(msg =>
                    msg._id === messageId ? { ...msg, isDeleted, deletedBy, deletedAt } : msg
                );
            });
        };

        const handleDelivered = ({ messageId, userId }) => {
            setMessages((prev) => {
                let updated = false;
                const next = prev.map(msg => {
                    if (String(msg._id) === String(messageId)) {
                        updated = true;
                        const deliveredSet = new Set(msg.deliveredTo || []);
                        deliveredSet.add(userId);
                        return { ...msg, deliveredTo: Array.from(deliveredSet) };
                    }
                    return msg;
                });
                return next;
            });
        };

        const handleRead = ({ channelId, userId }) => {
            if (activeChannelRef.current && String(channelId) === String(activeChannelRef.current._id)) {
                setMessages((prev) => {
                    let updated = 0;
                    const next = prev.map(msg => {
                        const senderId = msg.sender?._id || msg.sender;
                        if (msg.sender && String(senderId) !== String(userId)) {
                            updated++;
                            const readSet = new Set(msg.readBy || []);
                            readSet.add(userId);
                            return { ...msg, readBy: Array.from(readSet) };
                        }
                        return msg;
                    });
                    return next;
                });
            } else {
            }
        };

        const handleEdited = ({ messageId, content, fileUrl, thumbnailUrl, fileName, type, isEdited }) => {
            setMessages((prev) => prev.map(msg =>
                msg._id === messageId ? { ...msg, content, fileUrl, thumbnailUrl, fileName, type, isEdited } : msg
            ));
        };

        const handleApprovalUpdated = ({ messageId, approvalStatus, approvedBy }) => {
            setMessages((prev) => prev.map(msg =>
                msg._id === messageId ? { ...msg, approvalStatus, approvedBy } : msg
            ));
        };

        const handleReactionUpdated = ({ messageId, reactions }) => {
            setMessages((prev) => prev.map(msg =>
                msg._id === messageId ? { ...msg, reactions } : msg
            ));
        };

        const handlePinUpdated = ({ messageId, isPinned }) => {
            setMessages((prev) => prev.map(msg =>
                msg._id === messageId ? { ...msg, isPinned } : msg
            ));
        };

        socket.on('message_deleted', handleDeleted);
        socket.on('message_delivered', handleDelivered);
        socket.on('messages_read', handleRead);
        socket.on('message_edited', handleEdited);
        socket.on('message_approval_updated', handleApprovalUpdated);
        socket.on('message_reaction_updated', handleReactionUpdated);
        socket.on('message_pinned_updated', handlePinUpdated);

        return () => {
            socket.off('message_deleted', handleDeleted);
            socket.off('message_delivered', handleDelivered);
            socket.off('messages_read', handleRead);
            socket.off('message_edited', handleEdited);
            socket.off('message_approval_updated', handleApprovalUpdated);
            socket.off('message_reaction_updated', handleReactionUpdated);
            socket.off('message_pinned_updated', handlePinUpdated);
        };
    }, [socket, user]); // Added user to dependencies to ensure user ref is active for marking delivered

    useEffect(() => {
        if (lastMessage) {
            handleMessageParam(lastMessage);
        }
    }, [lastMessage]);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToBottom = (behavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messages.length > 0) {
            const behavior = isInitialLoad.current ? 'auto' : 'smooth';
            // Immediate scroll
            scrollToBottom(behavior);
            // Secondary scroll after a short delay to catch images/renders
            const timeoutId = setTimeout(() => scrollToBottom(behavior), 100);

            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            }
            return () => clearTimeout(timeoutId);
        }
    }, [messages]);

    // Force scroll to bottom when channel changes
    useEffect(() => {
        if (activeChannel) {
            isInitialLoad.current = true;
            // Immediate jump
            scrollToBottom('auto');
            // Secondary jump after a short delay
            const timeoutId = setTimeout(() => scrollToBottom('auto'), 50);
            return () => clearTimeout(timeoutId);
        }
    }, [activeChannel]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Show button if we are more than 300px from the bottom
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);

        // Clear active menu only if the scroll event is from the main container
        // and NOT from within the menu itself
        if (activeMenuId && e.target === e.currentTarget) {
            setActiveMenuId(null);
        }
    };

    const fetchMessages = async (channelId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/messages/${channelId}`, {
                headers: { 'x-auth-token': token }
            });
            setMessages(res.data);
            setPinnedMessages(res.data.filter(m => m.isPinned));
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    // Keep pinned messages in sync
    useEffect(() => {
        setPinnedMessages(messages.filter(m => m.isPinned));
    }, [messages]);

    const handleNextPinned = () => {
        if (pinnedMessages.length === 0) return;
        setCurrentPinnedIndex((prev) => (prev + 1) % pinnedMessages.length);
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
            await axios.post(`${API_URL}/messages`, messageData, { headers: { 'x-auth-token': token } });
        } catch (err) {
        }
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
            const res = await axios.get(`${API_URL}/messages/${activeChannel._id}/export`, {
                headers: { 'x-auth-token': token }
            });
            const allMessages = res.data;

            let textContentArr = [`Chat Export: #${activeChannel.name}`, `Exported on: ${new Date().toLocaleString()}`, ''];

            allMessages.forEach(msg => {
                const date = new Date(msg.createdAt).toLocaleString();
                const sender = msg.sender?.name || 'Unknown';
                const content = msg.content || (msg.fileUrl ? `[File: ${msg.fileName}]` : '[No Content]');
                textContentArr.push(`[${date}] ${sender}:\n${content}\n`);
            });

            const blob = new Blob([textContentArr.join('\n')], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeChannel.name}_chat_export.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Failed to export chat.");
        }
    };

    const handleCopy = (content) => {
        const temp = document.createElement('div');
        temp.innerHTML = content;
        const text = temp.textContent || temp.innerText || '';
        navigator.clipboard.writeText(text);
    };

    const initiateReply = (msg) => {
        setReplyingTo({
            _id: msg._id,
            content: msg.content,
            senderName: msg.sender?.name || 'Unknown'
        });
        if (editorRef.current) editorRef.current.focus();
    };

    const togglePinMessage = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/messages/${messageId}/pin`, {}, { headers: { 'x-auth-token': token } });
            if (res.data.success) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned: res.data.isPinned } : m));
            }
        } catch (err) {
            console.error('Error pinning message:', err);
        }
    };

    const handleReact = async (messageId, emoji) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/messages/${messageId}/react`, { emoji }, { headers: { 'x-auth-token': token } });
            if (res.data.success) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
            }
        } catch (err) {
            console.error('Error reacting to message:', err);
        }
    };

    const handleSend = async (e, forcedContent = null) => {
        if (e && e.preventDefault) e.preventDefault();

        const contentToSend = forcedContent !== null ? forcedContent : (editorRef.current?.innerHTML || newMessage);
        const isApproval = isApprovalMode; // Re-enabled approval mode capture
        const tempTextDiv = document.createElement('div');
        tempTextDiv.innerHTML = contentToSend;
        const textContent = tempTextDiv.textContent || tempTextDiv.innerText || '';

        if ((!textContent.trim() && !contentToSend.includes('<img') && pendingFiles.length === 0) || !activeChannel) return;

        try {
            const token = localStorage.getItem('token');
            if (editingMessageId) {
                // Editing an existing message
                const payload = { content: contentToSend };
                await axios.put(`${API_URL}/messages/${editingMessageId}`, payload, { headers: { 'x-auth-token': token } });
                setEditingMessageId(null);
                setEditingMessage(null);
                if (editorRef.current) editorRef.current.innerHTML = '';
                setNewMessage('');
                return;
            }

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

            // Send the text message if there is any
            if (textContent.trim() || contentToSend.includes('<img')) {
                const messageData = {
                    content: contentToSend,
                    channelId: activeChannel._id,
                    type: 'text',
                    localId: localId,
                    isApproval: isApproval,
                    relatedMessageId: replyingTo?._id || null
                };
                const optimMsg = {
                    _id: localId,
                    localId: localId,
                    content: contentToSend,
                    channelId: activeChannel._id,
                    type: 'text',
                    sender: user,
                    createdAt: new Date().toISOString(),
                    status: 'sending',
                    isApproval: isApproval,
                    approvalStatus: 'pending',
                    relatedMessageId: replyingTo ? {
                        _id: replyingTo._id,
                        content: replyingTo.content,
                        sender: { name: replyingTo.senderName }
                    } : null
                };
                setMessages(prev => [...prev, optimMsg]);
                await axios.post(`${API_URL}/messages`, messageData, { headers: { 'x-auth-token': token } });
            }

            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewMessage('');
            setReplyingTo(null); // Reset reply state after sending

            // Handle pending files
            if (pendingFiles.length > 0) {
                // We send them sequentially to maintain order and avoid overloading the local server
                for (const file of pendingFiles) {
                    await handleFileUpload(file, isApproval); // Use the captured isApproval status
                }
                setPendingFiles([]);
            }

            setIsApprovalMode(false); // Reset mode after everything is sent
        } catch (err) {
            if (!editingMessageId) {
                // setMessages(prev => prev.filter(m => m.localId !== localId));
            }
            alert("Failed to send message");
        }
    };

    const initiateEdit = (msg) => {
        setEditingMessageId(msg._id);
        setEditingMessage(msg); // Store full object for media check
        if (editorRef.current) {
            // If content is just placeholder 'Attachment', clear it for fresh text
            const initialContent = msg.content === 'Attachment' ? '' : msg.content;
            editorRef.current.innerHTML = initialContent;
            setNewMessage(initialContent);

            editorRef.current.focus();
            // Move cursor to the end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    const handleFileUpload = async (file, isApproval = false) => {
        if (!file) return;
        if (!activeChannel?._id) {
            alert("Please select a channel before uploading files.");
            return;
        }
        const formData = new FormData();
        formData.append('file', file);

        // Fetch the hardware serial name for routing LAN media to specific folders
        let deviceSerial = "Unknown_Device";
        if (window.electronAPI && window.electronAPI.getDeviceId) {
            try {
                deviceSerial = await window.electronAPI.getDeviceId();
            } catch (err) {
            }
        } else {
            try {
                const info = await Device.getId();
                if (info && info.identifier) {
                    deviceSerial = info.identifier.substring(0, 8);
                }
            } catch (e) {
            }
        }
        formData.append('deviceSerial', deviceSerial);

        try {
            const token = localStorage.getItem('token');
            const localId = `optim-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            if (!editingMessageId) {
                const optimMsg = {
                    _id: localId,
                    localId: localId,
                    content: 'Attachment',
                    type: file.type || 'file',
                    sender: user,
                    channel: activeChannel._id,
                    createdAt: new Date().toISOString(),
                    status: 'uploading',
                    fileName: file.name,
                    fileUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                    isApproval: isApproval
                };
                setMessages(prev => [...prev, optimMsg]);
            }

            // Upload to Local File Server instead of Render Backend
            const uploadRes = await axios.post(`${LOCAL_UPLOAD_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { fileUrl, thumbnailUrl, fileName, fileType } = uploadRes.data;
            const messageData = {
                content: editingMessageId ? (editingMessage?.content || 'Attachment') : 'Attachment',
                channelId: activeChannel._id,
                type: fileType || file.type || 'unknown',
                fileUrl: fileUrl,
                thumbnailUrl: thumbnailUrl,
                fileName: fileName || file.name,
                isApproval: isApproval,
                localId: localId
            };

            if (editingMessageId) {
                // Update existing message media
                await axios.put(`${API_URL}/messages/${editingMessageId}`, messageData, { headers: { 'x-auth-token': token } });
                setEditingMessageId(null);
                setEditingMessage(null);
            } else {
                // Create new message
                await axios.post(`${API_URL}/messages`, messageData, { headers: { 'x-auth-token': token } });
            }

            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewMessage('');
        } catch (err) {
            const errMsg = err.code === 'ERR_NETWORK' || err.message === 'Network Error'
                ? "Local File Server not running! Please start it on your machine."
                : (err.response?.data?.message || err.message || "Unknown error");
            alert(`Upload Error: ${errMsg}`);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setPendingFiles(prev => [...prev, ...files]);
            e.target.value = null;
        }
    };

    const removePendingFile = (index) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
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

    const handleTogglePin = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/messages/${messageId}/pin`, {}, {
                headers: { 'x-auth-token': token }
            });
        } catch (err) {
            console.error('Error toggling pin:', err);
            alert('Failed to toggle pin status');
        }
    };

    const handleCreateChannel = async (channelData) => {
        try {
            const res = await axios.post(`${API_URL}/channels`, channelData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setIsCreateChannelModalOpen(false);
            if (onChannelCreated) onChannelCreated();
            alert(`Channel #${channelData.name} created successfully!`);
        } catch (err) {
            alert(err.response?.data?.msg || 'Error creating channel');
        }
    };

    // Helper to format date headings
    const formatDateHeading = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

        const formatDDMMYYYY = (date) => {
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        };

        const dateFormatted = formatDDMMYYYY(d);

        if (d.toDateString() === today.toDateString()) {
            return `Today ${dateFormatted} ${dayName}`;
        } else if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${dateFormatted} ${dayName}`;
        } else {
            return `${dateFormatted} ${dayName}`;
        }
    };

    // Helper to render message content
    const renderMessageContent = (msg, isOwn) => {
        const bubbleText = isOwn ? 'text-white' : 'text-gray-200';
        const subText = isOwn ? 'text-blue-100' : 'text-gray-400';

        // Rewrite old 'localhost' URLs to the current hostname so they work cross-device
        const getFixedUrl = (url) => {
            if (!url) return url;
            // Only rewrite localhost if we have a real hostname (web) and it's NOT the local-file-server itself
            if (window.location.hostname && window.location.hostname !== 'localhost' && url.includes('localhost:5001')) {
                return url.replace('http://localhost:5001', `http://${window.location.hostname}:5001`);
            }
            return url;
        };

        const fileUrlOriginal = getFixedUrl(msg.fileUrl);
        const thumbnailUrlOriginal = getFixedUrl(msg.thumbnailUrl);

        // Force refetch by adding timestamp if message was edited
        const cacheBuster = msg.isEdited ? `?t=${new Date(msg.updatedAt || msg.createdAt).getTime()}` : '';
        const fileUrl = fileUrlOriginal ? `${fileUrlOriginal}${cacheBuster}` : null;
        const thumbnailUrl = thumbnailUrlOriginal ? `${thumbnailUrlOriginal}${cacheBuster}` : null;

        const mediaElement = (() => {
            if (msg.type?.startsWith('image/') || fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                return (
                    <div className="relative group">
                        <ProgressiveImage
                            lowResSrc={thumbnailUrl}
                            highResSrc={fileUrl}
                            alt="Shared image"
                            className="rounded-lg max-w-full h-auto mb-1 border border-black/10 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity bg-[#222529]"
                            onClick={() => setSelectedMedia({ src: fileUrl, type: 'image', fileName: msg.fileName })}
                        />
                    </div>
                );
            } else if (msg.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|mov|mkv)$/i) || (fileUrl?.match(/\.webm$/i) && msg.type !== 'audio/webm')) {
                return (
                    <div className="relative group cursor-pointer" onClick={() => setSelectedMedia({ src: fileUrl, type: 'video', fileName: msg.fileName })}>
                        <video className="rounded-lg max-w-full mb-1 border border-black/10 max-h-64 pointer-events-none bg-black">
                            <source src={fileUrl} />
                        </video>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                <ExternalLink size={24} className="text-white" />
                            </div>
                        </div>
                    </div>
                );
            } else if (msg.type?.startsWith('audio/') || fileUrl?.match(/\.(mp3|wav|ogg)$/i) || (fileUrl?.match(/\.webm$/i) && msg.type === 'audio/webm')) {
                return (
                    <div className="min-w-[200px] max-w-[300px] mt-1">
                        <audio controls className="w-full h-10 rounded-lg">
                            <source src={fileUrl} />
                        </audio>
                    </div>
                );
            } else if (fileUrl) {
                return (
                    <div
                        className={`flex items-center gap-3 p-3 rounded-lg border mb-1 backdrop-blur-sm cursor-pointer transition-colors ${isOwn ? 'bg-white/20 border-white/20 hover:bg-white/30' : 'bg-[#2b2f33] border-white/5 hover:bg-[#34383c]'}`}
                        onClick={() => {
                            const isSuperAdmin = user?.role?.includes('Super Admin');
                            
                            // Track and Download
                            const performDownload = async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
                                    const roles = user?.role || [];
                                    const roleArr = Array.isArray(roles) ? roles : [roles];
                                    const department = roleArr.find(r => !systemRoles.includes(r)) || 'General';

                                    await axios.post(`${API_URL}/downloads`, {
                                        employeeName: user?.name,
                                        employeeId: user?.employeeId,
                                        department: department,
                                        fileName: msg.fileName,
                                        fileUrl: fileUrl,
                                        fileType: 'file'
                                    }, {
                                        headers: { 'x-auth-token': token }
                                    });
                                } catch (err) { console.error(err); }

                                try {
                                    const response = await fetch(fileUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a'); link.href = url;
                                    link.setAttribute('download', msg.fileName || 'file');
                                    document.body.appendChild(link); link.click();
                                    link.parentNode.removeChild(link); window.URL.revokeObjectURL(url);
                                } catch (error) { window.open(fileUrl, '_blank'); }
                            };

                            performDownload();

                            if (isSuperAdmin) {
                                setHistoryItem({ url: fileUrl, name: msg.fileName, type: msg.type || 'file' });
                            } else {
                                setSelectedMedia({ src: fileUrl, type: msg.type || 'file', fileName: msg.fileName });
                            }
                        }}

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
            }
            return null;
        })();

        return (
            <div className="flex flex-col gap-1">
                {msg.relatedMessageId && (
                    <div
                        className={`mb-2 p-2 rounded-lg border-l-4 border-blue-500 bg-black/10 text-xs cursor-pointer hover:bg-black/20 transition-colors`}
                        onClick={() => {
                            const element = document.getElementById(`msg-${msg.relatedMessageId._id || msg.relatedMessageId}`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('animate-highlight');
                                setTimeout(() => element.classList.remove('animate-highlight'), 2000);
                            }
                        }}
                    >
                        <div className="font-bold text-blue-400 mb-1">{msg.relatedMessageId.sender?.name || 'Original Message'}</div>
                        <div className="opacity-70 truncate">{msg.relatedMessageId.content || 'Attachment'}</div>
                    </div>
                )}

                {mediaElement}

                {msg.content && msg.content !== 'Attachment' && (
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${bubbleText}`} dangerouslySetInnerHTML={{ __html: linkify(msg.content) }} />
                )}

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([emoji, count]) => (
                            <div
                                key={emoji}
                                onClick={() => handleReact(msg._id, emoji)}
                                className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 cursor-pointer hover:bg-white/20 transition-colors border border-white/5"
                            >
                                <span>{emoji}</span>
                                <span className="text-gray-300">{count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {msg.isApproval && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        {msg.approvalStatus === 'pending' ? (
                            <div className="flex flex-col gap-2.5">
                                {user?.role?.includes('Super Admin') ? (
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleApprove(msg._id); }}
                                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-green-900/20 active:scale-95 border border-green-400/20 outline-none"
                                        >
                                            <Check size={13} strokeWidth={3} /> Approve
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleReject(msg._id); }}
                                            className="px-4 py-1.5 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-red-900/20 active:scale-95 border border-red-400/20 outline-none"
                                        >
                                            <X size={13} strokeWidth={3} /> Reject
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-[10px] text-amber-400/90 font-semibold italic bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10 w-fit">
                                        <Clock size={12} className="animate-pulse" />
                                        Waiting for Super Admin approval...
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border backdrop-blur-md transition-all ${msg.approvalStatus === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-900/10' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-lg shadow-rose-900/10'}`}>
                                <div className={`p-1 rounded-full ${msg.approvalStatus === 'approved' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                    {msg.approvalStatus === 'approved' ? <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-500" /> : <X size={14} strokeWidth={2.5} className="text-rose-500" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{msg.approvalStatus}</span>
                                    {msg.approvedBy && (
                                        <span className="text-[9px] font-medium opacity-60">by {msg.approvedBy.name || 'Admin'}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
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
            if (taskInfo.taskLead) {
                const u = resolveUser(taskInfo.taskLead);
                if (u) users.push(u);
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
        const linkHtml = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline"><b>${text}</b></a>`;

        // Insert into editor
        document.execCommand('insertHTML', false, linkHtml);
        editorRef.current?.focus();

        // Capture content and send immediately
        const finalContent = editorRef.current?.innerHTML || linkHtml;

        // Direct call to handleSend with explicit content
        handleSend(null, finalContent);

        // Also cleanup editor
        if (editorRef.current) editorRef.current.innerHTML = '';
        setNewMessage('');
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
                {isSuccessModalOpen && <SuccessModal onClose={handleSuccessClose} />}

                <MessageInfoModal
                    isOpen={!!messageInfo}
                    onClose={() => setMessageInfo(null)}
                    message={messageInfo}
                    allUsers={allUsers}
                    currentUserId={user?._id || user?.id}
                />

                {/* Modals */}
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} isEditable={true} />
                {selectedMedia && <MediaModal src={selectedMedia.src} type={selectedMedia.type} fileName={selectedMedia.fileName} onClose={() => setSelectedMedia(null)} />}
                <ProfileModal isOpen={!!inspectUser} onClose={() => setInspectUser(null)} user={inspectUser} isEditable={false} />

                {/* Header */}
                <div className="h-16 flex items-center px-6 justify-between bg-[#1A1D21] border-b border-white/5 shadow-sm z-20">
                    <div className="flex-1 min-w-0 pr-4">
                        <h3
                            className="text-lg font-bold text-gray-200 truncate"
                            title={taskInfo ? `${taskInfo.project} - ${taskInfo.title}` : activeChannel?.headerTitle || activeChannel?.name}
                        >
                            {taskInfo ? (
                                <span>{taskInfo.project} - {taskInfo.title}</span>
                            ) : (
                                activeChannel ? (
                                    activeChannel.headerTitle ? (
                                        <span>{activeChannel.headerTitle}</span>
                                    ) : (
                                        <><span className="text-gray-500 mr-1">#</span>{activeChannel.name}</>
                                    )
                                ) : 'Select a channel'
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">Team discussion and updates</p>
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
                <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 custom-scrollbar"
                >
                    {/* Pinned Messages Bar */}
                    {pinnedMessages.length > 0 && (
                        <div className="sticky top-0 z-30 mb-4 animate-in slide-in-from-top-4 duration-300">
                            <div
                                onClick={handleNextPinned}
                                className="bg-[#1A1D21]/90 backdrop-blur-md border border-amber-500/20 rounded-xl p-3 shadow-lg flex items-center justify-between group overflow-hidden relative cursor-pointer hover:bg-[#1A1D21] transition-colors"
                            >
                                <div className="absolute inset-0 bg-amber-500/5 opacity-20 pointer-events-none"></div>
                                <div className="flex items-center gap-3 min-w-0 relative z-10">
                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                        <Pin size={16} fill="currentColor" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-0.5">Pinned Message {pinnedMessages.length > 1 ? `(${currentPinnedIndex + 1}/${pinnedMessages.length})` : ''}</p>
                                        <p className="text-sm text-gray-200 truncate font-medium" dangerouslySetInnerHTML={{ __html: pinnedMessages[currentPinnedIndex % pinnedMessages.length]?.content || '' }}></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    {pinnedMessages.length > 1 && (
                                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-gray-500 font-bold">Click to cycle</span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Don't cycle when clicking the jump button
                                            const targetedPinned = pinnedMessages[currentPinnedIndex % pinnedMessages.length];
                                            const element = document.getElementById(`msg-${targetedPinned._id}`);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                element.classList.add('animate-highlight');
                                                setTimeout(() => element.classList.remove('animate-highlight'), 2000);
                                            }
                                        }}
                                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-60">
                            <div className="h-20 w-20 bg-[#222529] rounded-full flex items-center justify-center mb-4">
                                <Send size={32} className="text-gray-500 ml-1" />
                            </div>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages.map((msg, index) => {
                        const isOwn = msg.sender?.name === user?.name || msg.sender?._id === user?.id || msg.sender === user?.id;

                        // Date Grouping Logic
                        const prevMsg = messages[index - 1];
                        const msgDate = new Date(msg.createdAt).toDateString();
                        const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
                        const showDateHeading = msgDate !== prevMsgDate;

                        return (
                            <React.Fragment key={msg._id || msg.id}>
                                {showDateHeading && (
                                    <div className="flex items-center gap-4 my-8 first:mt-2">
                                        <div className="h-px bg-white/5 flex-1"></div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] bg-[#1A1D21] px-4 py-1.5 rounded-full border border-white/5 shadow-sm">
                                            {formatDateHeading(msg.createdAt)}
                                        </div>
                                        <div className="h-px bg-white/5 flex-1"></div>
                                    </div>
                                )}
                                <div
                                    ref={(el) => (messageRefs.current[msg._id || msg.id] = el)}
                                    id={`msg-${msg._id || msg.id}`}
                                    className={`flex group ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                                >

                                    {/* Avatar for others */}
                                    {!isOwn && (
                                        <div
                                            className={`h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold shadow-sm mr-2 mt-1 transition-shadow ${msg.sender?.isActive !== false ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'}`}
                                            onClick={() => {
                                                if (msg.sender?.isActive !== false && msg.sender?.isProfileActive !== false) {
                                                    setInspectUser(msg.sender);
                                                }
                                            }}
                                            title={msg.sender?.name}
                                        >
                                            {msg.sender?.name?.[0] || '?'}
                                        </div>
                                    )}

                                    <div className={`relative max-w-[70%] shadow-sm ${msg.type === 'session_start' || msg.type === 'session_end' ? 'w-full max-w-none shadow-none' : 'rounded-2xl px-5 py-3'} 
                                ${isOwn ? 'bg-[#007a5a] text-white rounded-br-sm' : 'bg-[#222529] text-gray-200 border border-white/5 rounded-bl-sm'} 
                                ${msg.status === 'pending' ? 'opacity-70' : ''}
                                ${msg.isDeleted ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_10px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30' : ''}`}
                                    >
                                        {/* Delete Button */}


                                        {/* Sender Name for others in group chats (optional, redundant with avatar but good for clarity) */}
                                        {!isOwn && msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                            <div
                                                className={`text-[10px] font-bold mb-1 ${msg.sender?.isActive !== false ? 'text-indigo-400 cursor-pointer hover:underline' : 'text-gray-500'}`}
                                                onClick={() => {
                                                    if (msg.sender?.isActive !== false && msg.sender?.isProfileActive !== false) {
                                                        setInspectUser(msg.sender);
                                                    }
                                                }}
                                            >
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
                                        ) : (
                                            <>
                                                {renderMessageContent(msg, isOwn)}
                                                {msg.isDeleted && (
                                                    <div className={`mt-2 pt-2 border-t text-[11px] font-medium ${isOwn ? 'border-white/10 text-white/70' : 'border-white/5 text-gray-400 italic'}`}>
                                                        <div className="flex items-center gap-1 text-rose-500 font-bold">
                                                            <Trash2 size={12} className="shrink-0" fill="currentColor" />
                                                            <span>
                                                                Deleted by {
                                                                    msg.deletedBy?.name === 'Super Admin' ? 'Super Admin 01' :
                                                                        msg.deletedBy?.name === 'System Admin' ? 'Super Admin 02' :
                                                                            (msg.deletedBy?.name || 'Super Admin')
                                                                }
                                                                {msg.deletedAt && ` (${new Date(msg.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${new Date(msg.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')})`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Action Menu (3 dots) - Standard for All Messages (WhatsApp Style) */}
                                        {msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                            <div className={`absolute top-2 right-2 transition-all bg-[#006e51] p-0.5 rounded shadow-sm z-10 flex scale-90 group-hover:scale-100 transform origin-top-right duration-200 ${activeMenuId === msg._id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                                                <button
                                                    className="text-white hover:text-gray-200 transition-colors rounded p-1"
                                                    title="More actions"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (activeMenuId === msg._id) {
                                                            setActiveMenuId(null);
                                                        } else {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            // For "others" messages (left side), open to the right
                                                            // For "own" messages (right side), open to the left
                                                            setMenuPosition({
                                                                top: rect.bottom + 4,
                                                                left: isOwn ? rect.right - 140 : rect.left,
                                                                isUp: rect.bottom > window.innerHeight - 250 // Rough height of menu
                                                            });
                                                            setActiveMenuId(msg._id);
                                                        }
                                                    }}
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                                {activeMenuId === msg._id && createPortal(
                                                    <div
                                                        style={{
                                                            position: 'fixed',
                                                            top: menuPosition.isUp ? 'auto' : menuPosition.top,
                                                            bottom: menuPosition.isUp ? (window.innerHeight - menuPosition.top + 28) : 'auto',
                                                            left: menuPosition.left,
                                                            zIndex: 9999
                                                        }}
                                                        className="bg-[#222529] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px] animate-in slide-in-from-top-2 duration-150"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {/* 1. Message Info - Only for messages sent by the current user */}
                                                        {isOwn && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setMessageInfo(msg); setActiveMenuId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                                                            >
                                                                <Info size={12} className="text-blue-400" /> Message Info
                                                            </button>
                                                        )}

                                                        {/* 2. Reply */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); initiateReply(msg); setActiveMenuId(null); }}
                                                            className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                                                        >
                                                            <Reply size={12} className="text-emerald-400" /> Reply
                                                        </button>

                                                        {/* 3. Edit (Own only) */}
                                                        {isOwn && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); initiateEdit(msg); setActiveMenuId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                            >
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                        )}

                                                        {/* 4. Copy Text (Text messages only) */}
                                                        {!msg.fileUrl && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCopy(msg.content); setActiveMenuId(null); }}
                                                                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                            >
                                                                <Copy size={12} className="text-gray-400" /> Copy Text
                                                            </button>
                                                        )}

                                                        {/* 5. Pin/Unpin (Available for all) */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleTogglePin(msg._id); setActiveMenuId(null); }}
                                                            className="w-full text-left px-3 py-2 text-xs text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                        >
                                                            <Pin size={12} fill={msg.isPinned ? "currentColor" : "none"} /> {msg.isPinned ? 'Unpin Message' : 'Pin Message'}
                                                        </button>

                                                        {/* 6. Delete (Super Admin only) */}
                                                        {user?.role?.includes('Super Admin') && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setMessageToDelete(msg); setActiveMenuId(null); }}
                                                                    className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                                >
                                                                    <Trash2 size={12} /> Delete Message
                                                                </button>
                                                                
                                                                {msg.fileUrl && (
                                                                    <button
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            setHistoryItem({ url: msg.fileUrl, name: msg.fileName, type: msg.fileType || 'file' }); 
                                                                            setActiveMenuId(null); 
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-400/10 transition-colors flex items-center gap-2 border-t border-white/5"
                                                                    >
                                                                        <Download size={12} /> Download History
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}


                                                        {/* 5. React (Common Emojis) */}
                                                        <div className="border-t border-white/5 px-2 py-2 flex items-center justify-between bg-black/20">
                                                            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={(e) => { e.stopPropagation(); handleReact(msg._id, emoji); setActiveMenuId(null); }}
                                                                    className="hover:scale-125 transition-transform p-0.5 text-sm"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        )}

                                        {/* Timestamp and Status */}
                                        {msg.type !== 'session_start' && msg.type !== 'session_end' && (
                                            <div className={`text-[9px] mt-1 flex justify-end items-center gap-1 ${isOwn ? 'text-emerald-100' : 'text-gray-500'}`}>
                                                {msg.isEdited && <span className="italic mr-1">(edited)</span>}
                                                {msg.status === 'pending' && <Clock size={8} className="animate-pulse" />}
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isOwn && msg.status !== 'pending' && (
                                                    <span className="ml-1 flex">
                                                        {(() => {
                                                            // Calculate read receipts - converting both to String for safe comparison
                                                            const readCount = msg.readBy ? msg.readBy.filter(id => String(id) !== String(user.id) && String(id) !== String(user._id)).length : 0;
                                                            const deliveredCount = msg.deliveredTo ? msg.deliveredTo.filter(id => String(id) !== String(user.id) && String(id) !== String(user._id)).length : 0;

                                                            // DM vs Group logic to determine if "everyone" has read/delivered
                                                            const targetCount = activeChannel?.type === 'DM' ? 1 :
                                                                (activeChannel?.allowedUsers ? Math.max(1, activeChannel.allowedUsers.length - 1) : 1);

                                                            if (readCount > 0) {
                                                                return <CheckCheck size={14} strokeWidth={1.5} className="text-blue-400" />;
                                                            } else if (deliveredCount > 0) {
                                                                return <CheckCheck size={14} strokeWidth={1.5} className="text-gray-400" />;
                                                            } else {
                                                                return <Check size={14} strokeWidth={1.5} className="text-gray-400" />; // Single gray tick (Sent)
                                                            }
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollBottom && (
                    <button
                        onClick={() => scrollToBottom('smooth')}
                        className="fixed bottom-20 right-8 bg-[#006e51] text-white p-3 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] animate-in zoom-in duration-200 border border-white/10 flex items-center justify-center group"
                        title="Scroll to latest"
                    >
                        <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </button>
                )}

                {/* Input Area */}
                <div className="p-4 bg-[#1A1D21] border-t border-white/5 z-20 relative">
                    {/* Editing Banner */}
                    {editingMessageId && (
                        <div className="mb-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center gap-2">
                                <Edit2 size={12} className="text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                    {editingMessage?.fileUrl ? 'Replacing Media' : 'Editing Message'}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingMessage(null);
                                    if (editorRef.current) editorRef.current.innerHTML = '';
                                    setNewMessage('');
                                }}
                                className="p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-[#222529] flex flex-col transition-colors focus-within:border-white/30">
                        {replyingTo && (
                            <div className="bg-black/20 border-b border-white/5 p-3 flex items-start justify-between animate-in slide-in-from-bottom-2 duration-200">
                                <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Replying to {replyingTo.senderName}</p>
                                        <p className="text-xs text-gray-400 truncate max-w-md italic">{replyingTo.content}</p>
                                    </div>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
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

                        {/* Media Preview Section */}
                        {pendingFiles.length > 0 && (
                            <div className="px-4 py-3 bg-[#202c33]/50 backdrop-blur-md border-t border-white/5 flex gap-3 overflow-x-auto scrollbar-hide animate-in slide-in-from-bottom-2 duration-200">
                                {pendingFiles.map((file, index) => {
                                    const isImage = file.type.startsWith('image/');
                                    const isVideo = file.type.startsWith('video/');
                                    return (
                                        <div key={index} className="relative group shrink-0">
                                            <div
                                                className="h-20 w-20 rounded-xl border border-white/10 overflow-hidden bg-[#2a3942] shadow-lg transition-transform hover:scale-105 cursor-pointer"
                                                onClick={() => {
                                                    const url = URL.createObjectURL(file);
                                                    setSelectedMedia({
                                                        src: url,
                                                        type: file.type,
                                                        fileName: file.name
                                                    });
                                                }}
                                            >
                                                {isImage ? (
                                                    <img src={URL.createObjectURL(file)} alt="preview" className="h-full w-full object-cover" />
                                                ) : isVideo ? (
                                                    <div className="h-full w-full flex items-center justify-center bg-slate-800">
                                                        <Play size={24} className="text-white/50" />
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-slate-800">
                                                        <FileText size={24} className="text-white/50" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removePendingFile(index)}
                                                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:scale-110 active:scale-90"
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-[2px] px-1.5 py-0.5 pointer-events-none">
                                                <p className="text-[8px] text-white truncate max-w-full font-medium">{file.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                onPaste={async (e) => {
                                    e.preventDefault();

                                    // Check if there are files (like pasted screenshots)
                                    const items = e.clipboardData.items;
                                    let hasFile = false;
                                    const pastedFiles = [];
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
                                            const file = items[i].getAsFile();
                                            if (file) {
                                                pastedFiles.push(file);
                                                hasFile = true;
                                            }
                                        }
                                    }

                                    if (hasFile) {
                                        setPendingFiles(prev => [...prev, ...pastedFiles]);
                                    } else {
                                        const text = e.clipboardData.getData('text/plain');
                                        if (text) {
                                            document.execCommand('insertText', false, text);
                                        }
                                    }
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        const droppedFiles = Array.from(e.dataTransfer.files);
                                        setPendingFiles(prev => [...prev, ...droppedFiles]);
                                    } else {
                                        // Allow text drops if needed, but block HTML elements
                                        const text = e.dataTransfer.getData('text/plain');
                                        if (text) {
                                            document.execCommand('insertText', false, text);
                                        }
                                    }
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
                                suppressContentEditableWarning={true}
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
                                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                                <button type="button" onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.removeAttribute('accept');
                                        fileInputRef.current.click();
                                    }
                                }} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors bg-white/5" title="Attach File">
                                    <Paperclip size={16} />
                                </button>


                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                                        className={`h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors bg-white/5 ${isCreateMenuOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white'}`}
                                        title="Attachments"
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
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.accept = 'image/*,video/*';
                                                                fileInputRef.current.click();
                                                            }
                                                            setIsCreateMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-[#35373C] text-gray-200 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <ImageIcon size={16} className="text-gray-400" />
                                                        <span>Photos & Videos</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.accept = 'audio/*';
                                                                fileInputRef.current.click();
                                                            }
                                                            setIsCreateMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-[#35373C] text-gray-200 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <Music size={16} className="text-gray-400" />
                                                        <span>Audio</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
                                                                fileInputRef.current.click();
                                                            }
                                                            setIsCreateMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-[#35373C] text-gray-200 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <FileText size={16} className="text-gray-400" />
                                                        <span>Documents</span>
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

                                <button
                                    type="button"
                                    onClick={() => setIsApprovalMode(!isApprovalMode)}
                                    className={`h-8 px-2 flex items-center justify-center rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${isApprovalMode ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/20' : 'hover:bg-white/10 text-gray-400 hover:text-white bg-white/5 border-white/10'}`}
                                    title="Toggle Approval Mode"
                                >
                                    Approval
                                </button>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim() && pendingFiles.length === 0}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${(newMessage.trim() || pendingFiles.length > 0) ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'text-gray-600 cursor-not-allowed'}`}
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
            <DownloadHistoryModal
                isOpen={!!historyItem}
                onClose={() => setHistoryItem(null)}
                fileUrl={historyItem?.url}
                fileName={historyItem?.name}
            />
        </div>
    );
}

