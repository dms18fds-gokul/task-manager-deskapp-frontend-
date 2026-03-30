import React, { useState, useEffect, useRef } from 'react';
import { FaLock, FaSignOutAlt, FaUnlockAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/config';

const IdleLock = () => {
    const { user, token, logout } = useAuth();
    const [isLocked, setIsLocked] = useState(() => {
        return localStorage.getItem('idle_system_locked') === 'true';
    });
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    
    useEffect(() => {
        if (!user || !token) {
            setIsLocked(false);
            localStorage.removeItem('idle_system_locked');
            return;
        }

        // Listen for System-Level Idle Lock from Electron
        if (window.electronAPI && window.electronAPI.onLockSystem) {
            window.electronAPI.onLockSystem(() => {
                if (!isLocked) {
                    setIsLocked(true);
                    localStorage.setItem('idle_system_locked', 'true');
                }
            });
        }
    }, [user, token, isLocked]);

    useEffect(() => {
        if (isLocked) {
            localStorage.setItem('idle_system_locked', 'true');
        } else {
            localStorage.removeItem('idle_system_locked');
        }
    }, [isLocked]);

    const handleUnlock = async (e) => {
        if (e) e.preventDefault();
        const trimmedPassword = password.trim();
        if (!trimmedPassword) return;

        setVerifying(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/v1/app/auth/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: trimmedPassword })
            });

            if (response.ok) {
                setIsLocked(false);
                setPassword('');
                setError('');
            } else {
                const data = await response.json();
                if (response.status === 401) {
                    setError('Session expired. Please log in again.');
                    // Optional: could trigger logout() here if token is actually invalid
                } else {
                    setError(data.message || 'Incorrect password');
                }
            }
        } catch (err) {
            setError('System error. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            {/* Simple Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl animate-fade-in" />
            
            {/* Clean Lock Screen Card */}
            <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-zoom-in">
                <div className="p-4 flex flex-col items-center">
                    
                    {/* Small Icon */}
                    <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <FaLock className="text-indigo-600 text-xl" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase">System Locked</h2>
                    <p className="text-slate-500 text-sm mb-4 text-center leading-relaxed">
                        Since the device has been inactive for some time, <br/>
                        please enter your password to confirm it’s you.
                    </p>

                    <form onSubmit={handleUnlock} className="w-full space-y-4">
                        <div className="space-y-1">
                            <input 
                                type="password" 
                                placeholder="Enter Password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full px-2 py-2 bg-slate-50 border-2 rounded-xl outline-none transition-all font-medium text-center tracking-[0.2em] ${
                                    error ? 'border-rose-100 bg-rose-50 text-rose-900 focus:border-rose-300' : 'border-slate-100 focus:border-indigo-500 focus:bg-white'
                                }`}
                                autoFocus
                            />
                            {error && (
                                <p className="text-rose-600 text-[12px] font-bold text-center mt-2 px-2 italic">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button 
                            type="submit"
                            disabled={verifying}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-100"
                        >
                            {verifying ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FaUnlockAlt size={14} />
                                    Unlock System
                                </>
                            )}
                        </button>
                    </form>

                    <div className="w-full h-px bg-slate-100 my-2" />

                    <button 
                        onClick={() => logout()}
                        className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition-all uppercase tracking-wider"
                    >
                        <FaSignOutAlt size={14} />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IdleLock;
