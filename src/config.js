export const API_URL = "https://task-manager-fox-frontend.onrender.com/api";
export const SOCKET_URL = "https://task-manager-fox-frontend.onrender.com";

const hostname = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';
export const LOCAL_UPLOAD_URL = `http://192.168.1.1:5001`;

// const hostname = window.location.hostname;
const BASE_URL = `http://${hostname}:5000`;

// export const API_URL = `${BASE_URL}/api`;
// export const SOCKET_URL = BASE_URL;
