import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const { user, logout } = useAuth();
    const location = useLocation();
    const locationRef = useRef(location);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        if (user) {
            const newSocket = io(SOCKET_URL);

            newSocket.on('connect', () => {
                newSocket.emit("setup", user);
            });

            newSocket.on('connect_error', (err) => {
                console.error("Socket Connect Error:", err);
            });

            newSocket.on("session_terminated", (data) => {
                alert(data.message || "Your account was logged in from another device. You will be logged out.");
                logout();
            });

            // Global Message Listener (Ensures real-time updates even if chat is closed)
            newSocket.on('message', (message) => {
                setLastMessage(message);
            });

            // --- Desktop Notification Listeners ---
            const showDesktopNotification = (title, body, targetPage) => {
                const notificationsEnabled = localStorage.getItem('desktopNotifications') !== 'false';
                if (!notificationsEnabled) return;

                if (window.electronAPI && window.electronAPI.showNotification) {
                    window.electronAPI.showNotification({
                        title,
                        body,
                        targetPage
                    });
                }
            };



            newSocket.on('message_approved', (data) => {
                showDesktopNotification("Message Approved", `Your message has been approved by the Admin.`, `/chat/${data.channelId}`);
            });

            newSocket.on('message_rejected', (data) => {
                showDesktopNotification("Message Rejected", `Your message was rejected.`, `/chat/${data.channelId}`);
            });

            newSocket.on('new_message', (data) => {
                // Play notification sound
                try {
                    const audio = new Audio("/assets/notification.mp3");
                    audio.play().catch(e => console.error("Error playing sound:", e));
                } catch (soundErr) {
                    console.error("Notification sound error:", soundErr);
                }

                // Don't show if user is the sender (Backend handles this)
                // Don't show if user is already in the channel
                const currentPathname = locationRef.current.pathname;
                const currentChannelId = currentPathname.split('/').pop();
                if (currentPathname.startsWith('/chat') && currentChannelId === data.channel) {
                    return;
                }

                let body = data.content || "You received a new message.";
                if (body === 'Attachment') {
                    if (data.type?.startsWith('image/')) body = "Sent an image";
                    else if (data.type?.startsWith('video/')) body = "Sent a video";
                    else if (data.type?.startsWith('audio/')) body = "Sent a voice note";
                    else if (data.fileName) body = `Sent a file: ${data.fileName}`;
                    else body = "Sent an attachment";
                }

                showDesktopNotification(`New Message from ${data.sender?.name || 'Someone'}`, body, `/chat/${data.channel}`);
            });

            newSocket.on('new_notification', (data) => {
                showDesktopNotification(data.title || "New Notification", data.message || "You have a new update.", `/notifications`);
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            }
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]); // Removed location.pathname to keep socket persistent across pages

    return (
        <SocketContext.Provider value={{ socket, lastMessage }}>
            {children}
        </SocketContext.Provider>
    );
};
