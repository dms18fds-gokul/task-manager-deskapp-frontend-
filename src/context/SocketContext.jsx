import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            // console.log("SocketContext: Initializing socket for user", user.name);
            const newSocket = io(SOCKET_URL);

            newSocket.on('connect', () => {
                // console.log("SocketContext: Connected to socket server:", newSocket.id);
                newSocket.emit("setup", user);
            });

            newSocket.on('connect_error', (err) => {
                console.error("SocketContext: Connection error:", err);
            });

            setSocket(newSocket);

            return () => {
                // console.log("SocketContext: Closing socket");
                newSocket.close();
            }
        } else {
            if (socket) {
                // console.log("SocketContext: User logged out, closing socket");
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
