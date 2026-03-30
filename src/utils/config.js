const hostname = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';

const BASE_URL = `http://${hostname}:5000`;

export const API_URL = `http://localhost:5000/api`;

// This must be the STATIC IP of the host machine running the Local File Server
// Fallback to active hostname if not 192.168.1.34
export const LOCAL_UPLOAD_URL = hostname === 'localhost' ? `http://192.168.1.34:5001` : `http://${hostname}:5001`;

export const getSocketUrl = () => {
    if (API_URL.endsWith("/api")) {
        return API_URL.slice(0, -4);
    }
    return API_URL;
};
