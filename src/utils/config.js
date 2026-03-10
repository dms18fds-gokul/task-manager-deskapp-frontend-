const hostname = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';

const BASE_URL = `http://${hostname}:5000`;

export const API_URL = `https://task-manager-fox-frontend.onrender.com/api`;
export const LOCAL_UPLOAD_URL = `http://192.168.1.1:5001`;

export const getSocketUrl = () => {
    if (API_URL.endsWith("/api")) {
        return API_URL.slice(0, -4);
    }
    return API_URL;
};
