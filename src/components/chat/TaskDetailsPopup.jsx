import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config'; // Adjust path if needed, check imports in ChatArea
import TaskDetailsModal from '../TaskDetailsModal'; // Adjust path
import { AlertCircle } from 'lucide-react';

export default function TaskDetailsPopup({ taskId, onClose }) {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (taskId) {
            fetchTaskDetails();
        }
    }, [taskId]);

    const fetchTaskDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            // Assuming API_URL is correct, ChatArea uses import { API_URL } from '../../config';
            // TaskDetailsSidebar used import { API_URL } from '../../config';
            // So ../../config should be correct if this file is in src/components/chat/
            const res = await axios.get(`${API_URL}/api/tasks/${taskId}`, {
                headers: { 'x-auth-token': token }
            });
            setTask(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch task details", err);
            setError("Could not load task details.");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
                    <AlertCircle size={32} className="text-red-500" />
                    <p className="text-gray-800 font-medium">{error}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-800 transition">Close</button>
                </div>
            </div>
        );
    }

    return (
        <TaskDetailsModal
            task={task}
            onClose={onClose}
        // isAdmin? We can pass this if needed, but defaults to false. 
        // ChatArea has user context, maybe pass it? 
        // TaskDetailsModal uses isAdmin for total hours footer.
        />
    );
}
