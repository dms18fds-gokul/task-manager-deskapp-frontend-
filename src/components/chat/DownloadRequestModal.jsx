import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../utils/config';

export default function DownloadRequestModal({ fileUrl, fileName, fileType, channelId, onClose }) {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide a reason.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/download-requests`, {
                fileUrl,
                fileName,
                fileType,
                reason,
                channelId
            }, {
                headers: { 'x-auth-token': token }
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || 'Failed to submit download request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative text-slate-800">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-800">Request Download</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">Request Sent!</h3>
                            <p className="text-gray-500 text-sm">
                                Your download request has been sent to the admin for approval.
                                The file will download automatically once approved.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <p className="text-sm text-gray-600 mb-4">
                                You are requesting to download <span className="font-semibold">{fileName || "a file"}</span>.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason for downloading: *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., I need this for the client presentation..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y"
                                    required
                                />
                                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !reason.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isSubmitting ? (
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Submit Request"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
