import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            if (window.electronAPI && window.electronAPI.setAuthToken) {
                window.electronAPI.setAuthToken(storedToken, parsedUser);
            }
            if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
                // Determine if screenshot capture should be active. Default to true if undefined.
                const isCaptureActive = parsedUser.screenshotActivity !== false;
                window.electronAPI.setScreenshotActivity(isCaptureActive);
            }

            // Fresh background fetch to ensure the Toggle State didn't change while app was closed
            if (parsedUser.employeeId) {
                fetch(`${API_URL}/employee/${parsedUser.employeeId}`)
                    .then(res => res.json())
                    .then(freshUser => {
                        if (freshUser && freshUser.employeeId) {
                            setUser((prev) => ({ ...prev, ...freshUser }));
                            localStorage.setItem('user', JSON.stringify({ ...parsedUser, ...freshUser }));
                            if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
                                window.electronAPI.setScreenshotActivity(freshUser.screenshotActivity !== false);
                            }
                        }
                    })
            }
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        setUser(userData);
        setToken(token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);

        if (window.electronAPI && window.electronAPI.setAuthToken) {
            window.electronAPI.setAuthToken(token, userData);
        }

        if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
            const isCaptureActive = userData.screenshotActivity !== false;
            window.electronAPI.setScreenshotActivity(isCaptureActive);
        }

        if (userData.role.includes("Super Admin") || userData.role.includes("Admin")) {
            navigate("/dashboard");
        } else {
            navigate("/employee-dashboard");
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (window.electronAPI && window.electronAPI.setAuthToken) {
            window.electronAPI.setAuthToken(null);
        }
        if (window.electronAPI && window.electronAPI.setScreenshotActivity) {
            // Re-enable tracking contextually for the next generic login, though it forces token null anyway.
            window.electronAPI.setScreenshotActivity(true);
        }
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
