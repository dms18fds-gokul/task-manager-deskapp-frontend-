import { useState, useEffect } from 'react';
import { X, Image, Film, FileText, Download, ExternalLink, Calendar, Music } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../utils/config';
import MediaModal from './MediaModal';
import { useAuth } from '../../context/AuthContext';
import DownloadHistoryModal from './DownloadHistoryModal';


export default function MediaHistoryModal({ channel, onClose }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('images');
    const [media, setMedia] = useState({ images: [], videos: [], audio: [], docs: [] });
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);


    const handleDownloadTrack = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const systemRoles = ['User', 'Admin', 'Super Admin', 'Manager'];
            const department = Array.isArray(user?.role)
                ? user.role.find(r => !systemRoles.includes(r)) || 'General'
                : (!systemRoles.includes(user?.role) ? user?.role : 'General');

            await axios.post(`${API_URL}/downloads`, {
                employeeName: user?.name,
                employeeId: user?.employeeId,
                department: department,
                fileName: item.name || 'download',
                fileUrl: item.url,
                fileType: item.type
            }, {
                headers: { 'x-auth-token': token }
            });
        } catch (trackErr) {
            console.error("Failed to track download:", trackErr);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, [channel]);

    const fetchMedia = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming we have an endpoint to get all messages or a specialized media endpoint.
            // For now, we'll fetch messages and filter. Ideally, backend should support /api/channels/:id/media
            const res = await axios.get(`${API_URL}/messages/${channel._id}`, {
                headers: { 'x-auth-token': token }
            });

            const msgs = res.data;
            const images = [];
            const videos = [];
            const audio = [];
            const docs = [];

            msgs.forEach(msg => {
                if (msg.fileUrl) {
                    const item = {
                        _id: msg._id,
                        url: msg.fileUrl,
                        type: msg.fileType || 'unknown',
                        sender: msg.sender?.name || 'Unknown',
                        createdAt: msg.createdAt,
                        name: msg.fileName || 'File'
                    };

                    const lowerUrl = msg.fileUrl.toLowerCase();
                    if (item.type.startsWith('image/') || lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                        images.push(item);
                    } else if (item.type.startsWith('video/') || lowerUrl.match(/\.(mp4|webm|mov|mkv)$/)) {
                        videos.push(item);
                    } else if (item.type.startsWith('audio/') || lowerUrl.match(/\.(mp3|wav|ogg|m4a)$/)) {
                        audio.push(item);
                    } else {
                        docs.push(item);
                    }
                }
            });

            setMedia({ images, videos, audio, docs });
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const renderMediaGrid = (items, type) => {
        if (items.length === 0) return <div className="text-center text-gray-500 py-10">No {type} found.</div>;

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map(item => (
                    <div
                        key={item._id}
                        className="relative group bg-gray-800 rounded-lg overflow-hidden border border-gray-700 cursor-pointer"
                        onClick={() => setSelectedMedia({ src: item.url, type: item.type || (type === 'images' ? 'image' : type === 'videos' ? 'video' : type === 'audio' ? 'audio' : 'file'), fileName: item.name })}
                    >
                        {type === 'images' && (
                            <img
                                src={item.url}
                                alt="media"
                                className="w-full h-32 object-cover transition-opacity hover:opacity-90"
                            />
                        )}
                        {type === 'videos' && (
                            <div className="relative w-full h-32 bg-black">
                                <video src={item.url} className="w-full h-32 object-cover pointer-events-none" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                        <Film size={20} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {type === 'audio' && (
                            <div className="h-32 flex flex-col items-center justify-center bg-gray-800 p-2 hover:bg-gray-750 transition-colors">
                                <Music size={32} className="text-pink-400 mb-2" />
                                <span className="text-xs text-center text-gray-300 truncate w-full px-2">{item.name}</span>
                            </div>
                        )}
                        {type === 'docs' && (
                            <div className="h-32 flex flex-col items-center justify-center bg-gray-800 p-2 hover:bg-gray-750 transition-colors">
                                <FileText size={32} className="text-blue-400 mb-2" />
                                <span className="text-xs text-center text-gray-300 truncate w-full px-2">{item.name}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                            <div className="text-xs text-white truncate mb-1 pointer-events-auto">By {item.sender}</div>
                            <div className="text-[10px] text-gray-400 flex items-center mb-2">
                                <Calendar size={10} className="mr-1" />
                                {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <button
                                className="flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white py-1 rounded text-xs gap-1 pointer-events-auto w-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isSuperAdmin = user?.role?.includes('Super Admin');
                                    
                                    // Track and Download function
                                    const performAction = async () => {
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
                                                fileName: item.name || 'download',
                                                fileUrl: item.url,
                                                fileType: item.type
                                            }, {
                                                headers: { 'x-auth-token': token }
                                            });
                                        } catch (trackErr) { console.error(trackErr); }

                                        try {
                                            const response = await fetch(item.url);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a'); link.href = url;
                                            link.setAttribute('download', item.name || 'download');
                                            document.body.appendChild(link); link.click();
                                            link.parentNode.removeChild(link); window.URL.revokeObjectURL(url);
                                        } catch (error) { window.open(item.url, '_blank'); }
                                    };

                                    performAction();
                                    
                                    if (isSuperAdmin) {
                                        setHistoryItem(item);
                                    }
                                }}

                            >
                                <Download size={12} /> Download
                            </button>

                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <FolderOpenIcon /> Media History: #{channel.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'images' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Image size={16} /> Images ({media.images.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'videos' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Film size={16} /> Videos ({media.videos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('audio')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'audio' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Music size={16} /> Audio ({media.audio.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'docs' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <FileText size={16} /> Docs ({media.docs.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
                    ) : (
                        renderMediaGrid(media[activeTab], activeTab)
                    )}
                </div>
            </div>

            {/* Media Modal */}
            {selectedMedia && (
                <MediaModal
                    src={selectedMedia.src}
                    type={selectedMedia.type}
                    fileName={selectedMedia.fileName}
                    onClose={() => setSelectedMedia(null)}
                />
            )}

            <DownloadHistoryModal
                isOpen={!!historyItem}
                onClose={() => setHistoryItem(null)}
                fileUrl={historyItem?.url}
                fileName={historyItem?.name}
            />
        </div>

    );
}

const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" /></svg>
);
