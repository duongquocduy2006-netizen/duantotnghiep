import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const OAuth2Redirect = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Backend đã set JSESSIONID cookie, api instance có withCredentials: true
                const response = await api.get('/api/profile');
                if (response.data && response.data.success) {
                    console.log('Google Login successful:', response.data.account);
                    // Có thể lưu vào localStorage nếu frontend dùng nó để check auth
                    // Tuy nhiên Header.jsx đang call api/profile để lấy info, nên chỉ cần redirect là đủ
                    navigate('/');
                } else {
                    navigate('/login?error=auth_failed');
                }
            } catch (err) {
                console.error('Lỗi khi lấy thông tin user sau Google login:', err);
                navigate('/login?error=connection_error');
            }
        };

        fetchUser();
    }, [navigate]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111',
            color: '#fff',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div className="spinner-border text-danger mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <h3>Đang xác thực tài khoản Google...</h3>
            <p className="text-white-50">Vui lòng đợi trong giây lát</p>
        </div>
    );
};

export default OAuth2Redirect;
