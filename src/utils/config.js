
const BASE_URL = "https://task-manager-fox-frontend.onrender.com";
export const API_URL = `${BASE_URL}/api`;
// export const API_URL = "http://localhost:5000/api";

export const getSocketUrl = () => {
    // If API_URL contains "/api", remove it to get the base URL for socket.io
    if (API_URL.endsWith("/api")) {
        return API_URL.slice(0, -4);
    }
    return API_URL;
};
