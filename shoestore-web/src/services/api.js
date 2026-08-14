import axios from 'axios';

const api = axios.create({
    // Không set baseURL để dùng Vite proxy (cùng origin → cookie hoạt động)
    // Vite proxy config: /api → http://localhost:8080
    withCredentials: true,
    headers: {
        'Accept': 'application/json'
    }
});

export default api;
