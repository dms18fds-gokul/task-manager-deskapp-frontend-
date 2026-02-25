import { useState, useRef, useEffect } from 'react';
import { X, HelpCircle, Video, Mic, VideoOff, MicOff, Settings, Sparkles, Upload, Monitor, Circle, Square, Check, Filter, Laptop } from 'lucide-react';

export default function VideoRecordModal({ isOpen, onClose, onSend, initialMode = 'camera' }) {
    const [stream, setStream] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);

    // New Features State
    const [activeFilter, setActiveFilter] = useState('none');
    const [activeBackground, setActiveBackground] = useState('none');
    const [filterMode, setFilterMode] = useState('filter'); // 'filter' or 'background'
    const [showFilters, setShowFilters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [inputDevices, setInputDevices] = useState({ audio: [], video: [] });
    const [selectedDevices, setSelectedDevices] = useState({ audio: '', video: '' });

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const fileInputRef = useRef(null);

    // Preview
    const [previewUrl, setPreviewUrl] = useState(null);
    const [recordedBlob, setRecordedBlob] = useState(null);

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    useEffect(() => {
        if (isOpen) {
            // Use currently selected devices if available, otherwise defaults
            startCamera(selectedDevices);
        } else {
            stopCamera();
            setIsRecording(false);
            setPreviewUrl(null);
            setRecordedBlob(null);
            setShowFilters(false);
            setShowSettings(false);
        }
        return () => stopCamera();
    }, [isOpen]);

    // Auto-stop recording after 5 minutes (300 seconds)
    useEffect(() => {
        if (isRecording && recordingTime >= 300) {
            stopRecording();
            alert("Maximum recording time of 5 minutes reached.");
        }
    }, [recordingTime, isRecording]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.code === 'KeyV') {
                e.preventDefault();
                toggleCamera();
            }
            if (e.altKey && e.code === 'KeyM') {
                e.preventDefault();
                toggleMic();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cameraEnabled, micEnabled, stream]);

    const loadDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audio = devices.filter(d => d.kind === 'audioinput');
            const video = devices.filter(d => d.kind === 'videoinput');
            setInputDevices({ audio, video });

            setSelectedDevices(prev => {
                const newDevices = { ...prev };
                // Only update if current selection is invalid or empty
                if (!prev.audio || !audio.find(d => d.deviceId === prev.audio)) {
                    if (audio.length > 0) newDevices.audio = audio[0].deviceId;
                }
                if (!prev.video || !video.find(d => d.deviceId === prev.video)) {
                    if (video.length > 0) newDevices.video = video[0].deviceId;
                }
                return newDevices;
            });
        } catch (err) {
            console.error("Error loading devices", err);
        }
    };

    const startCamera = async (deviceIds = {}) => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Build constraints based on deviceIds (if provided)
            const constraints = {
                audio: deviceIds.audio ? { deviceId: { exact: deviceIds.audio } } : true,
                video: deviceIds.video ? { deviceId: { exact: deviceIds.video } } : true
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setCameraEnabled(true);
            setMicEnabled(true);

            // Reload devices to get labels (now that permission is granted)
            loadDevices();
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraEnabled(false);
            // Fallback: try default constraints if specific device failed
            if (deviceIds.audio || deviceIds.video) {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setStream(fallbackStream);
                    if (videoRef.current) videoRef.current.srcObject = fallbackStream;
                    setCameraEnabled(true);
                    setMicEnabled(true);
                    loadDevices();
                } catch (retryErr) {
                    console.error("Fallback camera access failed:", retryErr);
                }
            }
        }
    };

    const startScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Handle user clicking "Stop sharing" in browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                startCamera(selectedDevices); // Revert to camera with previous settings
            };

            setStream(screenStream);
            if (videoRef.current) {
                videoRef.current.srcObject = screenStream;
            }
        } catch (err) {
            console.error("Error accessing screen share:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const toggleCamera = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !cameraEnabled;
                setCameraEnabled(!cameraEnabled);
            }
        }
    };

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !micEnabled;
                setMicEnabled(!micEnabled);
            }
        }
    };

    const handleRecordToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        if (!stream) return;

        chunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
            ? "video/webm; codecs=vp9"
            : "video/webm";

        try {
            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                console.log("Recording stopped. Chunks collected:", chunksRef.current.length);
                const blob = new Blob(chunksRef.current, { type: mimeType });
                console.log("Blob created. Size:", blob.size, "Type:", blob.type);

                if (blob.size === 0) {
                    alert("Recording failed: Empty video file.");
                    return;
                }

                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setRecordedBlob(blob);
                setIsRecording(false);
                stopCamera();
            };

            recorder.start(1000);
            setIsRecording(true);
            mediaRecorderRef.current = recorder;
            console.log("Recording started with mimeType:", mimeType);
        } catch (err) {
            console.error("Failed to start MediaRecorder:", err);
            alert("Could not start video recording. Please check your camera settings.");
        }
    };

    const handleSend = () => {
        if (recordedBlob && onSend) {
            const file = new File([recordedBlob], "video_message.webm", { type: 'video/webm' });
            onSend(file);
            handleClose();
        }
    };

    const handleRetake = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setRecordedBlob(null);
        // Restart camera/screen based on initial mode or just default to camera for simplicity
        // ideally remember what mode we were in, but let's default to camera for 'Retake'
        // or check if we were screen sharing?
        // Let's just go back to camera for now or re-trigger the initial logic?
        // Actually, let's just use startCamera() which connects to last selected devices
        if (initialMode === 'screen') {
            startScreenShare();
        } else {
            startCamera(selectedDevices);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && onSend) {
            onSend(file);
            handleClose();
        }
    };

    const handleClose = () => {
        if (isRecording) {
            if (window.confirm("Recording is in progress. Are you sure you want to exit?")) {
                stopRecording();
                onClose();
            }
        } else {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setRecordedBlob(null);
            }
            onClose();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter Styles
    // Filter Styles
    const getFilterStyle = () => {
        let style = {};
        switch (activeFilter) {
            case 'grayscale': style.filter = 'grayscale(100%)'; break;
            case 'sepia': style.filter = 'sepia(80%)'; break;
            case 'blur': style.filter = 'blur(4px)'; break;
            case 'contrast': style.filter = 'contrast(150%)'; break;
            case 'hue': style.filter = 'hue-rotate(90deg)'; break;
            default: break;
        }
        return style;
    };

    const getBackgroundStyle = () => {
        if (activeBackground === 'blur') return { backdropFilter: 'blur(10px)' }; // Mock implementation
        if (activeBackground === 'office') return { backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80")', backgroundSize: 'cover' };
        return {};
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-[#1A1D21] rounded-xl border border-white/10 w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1F2226]">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Video size={20} className="text-red-500" />
                        Record Video Clip
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Help Mock */}
                        {/* Help Menu */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowHelp(!showHelp); setShowFilters(false); setShowSettings(false); }}
                                className={`p-2 rounded-full transition-colors ${showHelp ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                title="Help & Tips"
                            >
                                <HelpCircle size={20} />
                            </button>

                            {showHelp && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-[#1F2226] border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200 z-50">
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <Sparkles size={14} className="text-yellow-500" />
                                        Recording Tips
                                    </h4>
                                    <ul className="space-y-2 text-xs text-gray-400">
                                        <li className="flex gap-2">
                                            <span className="text-emerald-500">•</span>
                                            <span>Ensure you have <b>good lighting</b> for clear video.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-emerald-500">•</span>
                                            <span>Select the correct <b>microphone</b> in settings.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-emerald-500">•</span>
                                            <span>Max recording length is <b>5 minutes</b>.</span>
                                        </li>
                                    </ul>
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Shortcuts</div>
                                        <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
                                            <span>Toggle Camera</span>
                                            <div className="flex gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5">Alt</kbd> + <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5">V</kbd></div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-300">
                                            <span>Toggle Mic</span>
                                            <div className="flex gap-1"><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5">Alt</kbd> + <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/5">M</kbd></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleClose} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors" title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col justify-center bg-black/40">
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center group border border-white/10 shadow-lg">

                        {/* Background Layer (Mock) */}
                        {activeBackground !== 'none' && (
                            <div className="absolute inset-0 z-0" style={getBackgroundStyle()}></div>
                        )}

                        {/* Video Feed */}
                        {/* Video Feed or Preview */}
                        {previewUrl ? (
                            <video
                                src={previewUrl}
                                controls
                                autoPlay
                                className="w-full h-full object-contain bg-black relative z-10"
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                style={getFilterStyle()}
                                className={`w-full h-full object-cover transform ${initialMode === 'camera' ? 'scale-x-[-1]' : ''} transition-all duration-300 relative z-10 ${!cameraEnabled ? 'opacity-0' : 'opacity-100'}`}
                            />
                        )}

                        {/* Fallback Avatar/Placeholder */}
                        {!cameraEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-24 w-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center border border-white/10">
                                    <VideoOff size={32} className="text-gray-500" />
                                </div>
                                <p className="absolute mt-32 text-gray-500 text-sm font-medium">Camera is off</p>
                            </div>
                        )}

                        {/* Recording Overlay */}
                        {isRecording && (
                            <div className="absolute top-4 right-4 bg-red-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-mono flex items-center gap-2 animate-pulse shadow-lg border border-red-500/50">
                                <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                {formatTime(recordingTime)}
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#1F2226]">
                    <div className="flex items-center gap-4">
                        {!previewUrl && (
                            <>
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/5"
                                >
                                    <Upload size={18} />
                                    Upload Video
                                </button>
                                <button
                                    onClick={startScreenShare}
                                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/5"
                                >
                                    <Monitor size={18} />
                                    Share Screen
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {previewUrl ? (
                            <>
                                <button
                                    onClick={handleRetake}
                                    className="px-6 py-2.5 rounded-full font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Retake
                                </button>
                                <button
                                    onClick={handleSend}
                                    className="px-8 py-2.5 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    Send Video
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleRecordToggle}
                                className={`px-8 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl ${isRecording
                                    ? 'bg-white text-red-600 hover:bg-gray-100'
                                    : 'bg-red-600 hover:bg-red-700 text-white'}`}
                            >
                                {isRecording ? (
                                    <>
                                        <Square size={16} fill="currentColor" /> Stop Recording ({formatTime(recordingTime)})
                                    </>
                                ) : (
                                    <>
                                        <Circle size={12} fill="currentColor" className="mr-1" /> Start Recording
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
