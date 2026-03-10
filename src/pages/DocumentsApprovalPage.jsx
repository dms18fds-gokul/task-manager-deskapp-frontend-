import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/config';
import Sidebar from '../components/Sidebar';
import { Check, X, File, Download, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentsApprovalPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('Pending'); // Pending, Approved, Rejected

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/download-requests?status=${filter}`, {
                headers: { 'x-auth-token': token }
            });
            setRequests(res.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch download requests.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/download-requests/${requestId}/status`, { status }, {
                headers: { 'x-auth-token': token }
            });

            // Remove the processed request from the current view if we are on the 'Pending' tab
            if (filter === 'Pending') {
                setRequests(prev => prev.filter(req => req._id !== requestId));
            } else {
                fetchRequests(); // Refresh to show updated status
            }
        } catch (err) {
            console.error(err);
            alert(`Failed to ${status.toLowerCase()} request.`);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            <Sidebar />

            <div className="flex-1 overflow-hidden flex flex-col pt-16 md:pt-0">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">

                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Documents Approval</h1>
                                <p className="text-gray-500 mt-1">Review and manage file download requests from employees.</p>
                            </div>

                            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                                {['Pending', 'Approved', 'Rejected'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === status
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <File className="text-gray-400 w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No {filter.toLowerCase()} requests</h3>
                                <p className="text-gray-500">
                                    {filter === 'Pending'
                                        ? "You're all caught up! There are no files waiting for approval."
                                        : `There are no ${filter.toLowerCase()} requests to show.`}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <ul className="divide-y divide-gray-100">
                                    {requests.map(request => (
                                        <li key={request._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col md:flex-row md:items-start gap-4">

                                                {/* File Icon */}
                                                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <File className="text-indigo-600 w-6 h-6" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 text-lg">{request.fileName || "Unnamed File"}</h3>
                                                            <div className="flex items-center text-sm text-gray-500 mt-1 gap-4">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="font-medium text-gray-700">{request.userId?.name || 'Unknown User'}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-4 h-4" />
                                                                    {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Status Badge */}
                                                        {request.status !== 'Pending' && (
                                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${request.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {request.status}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border border-gray-100">
                                                        <span className="font-medium text-gray-900 mb-1 block">Reason for downloading:</span>
                                                        "{request.reason}"
                                                    </div>

                                                    <div className="flex gap-4 text-sm">
                                                        <a href={request.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                                                            <ExternalLink size={16} /> View Original File
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                {request.status === 'Pending' && (
                                                    <div className="flex items-center gap-2 mt-4 md:mt-0 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleAction(request._id, 'Rejected')}
                                                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <X size={16} /> Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(request._id, 'Approved')}
                                                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Check size={16} /> Approve
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
