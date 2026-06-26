import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true,
    headers: {
        'Accept': 'application/json'
    }
});

// Interceptor: nếu tài khoản bị khóa → tự động đăng xuất
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            const data = error.response.data;
            // Tài khoản bị khóa (status 401 với locked=true)
            if (error.response.status === 401 && data && data.locked === true) {
                localStorage.removeItem('account');
                localStorage.removeItem('user');
                // Redirect về login với thông báo
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?error=account_locked';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
