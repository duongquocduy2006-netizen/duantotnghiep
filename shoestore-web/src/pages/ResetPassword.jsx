import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || 'email@example.com';
    const otp = location.state?.otp || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!password || !confirmPassword) {
            setError('Vui lòng nhập đầy đủ cả hai trường mật khẩu!');
            return;
        } else if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const response = await api.post('/api/auth/reset-password', { email, password, confirmPassword });
            if (response.data.success) {
                alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
                navigate('/login');
            } else {
                setError(response.data.message || 'Đặt lại mật khẩu thất bại!');
            }
        } catch (err) {
            console.error('Lỗi đặt lại mật khẩu:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Không thể kết nối đến server để đặt lại mật khẩu!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-image"></div>
            <div className="container d-flex justify-content-center">
                <div className={`login-card animate__animated ${error ? 'animate__headShake' : 'animate__zoomIn'}`}>
                    <div className="text-center mb-4">
                        <div className="main-logo-text">RESET<span> PASSWORD</span></div>
                        <p style={{ color: '#a0a0a0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nhập mật khẩu mới của bạn</p>
                    </div>

                    {error && <div className="custom-alert alert-error-custom">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="form-label">Mật khẩu mới</label>
                            <input 
                                type="password" 
                                className="form-control custom-input" 
                                placeholder="Nhập mật khẩu..." 
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Xác nhận mật khẩu</label>
                            <input 
                                type="password" 
                                className="form-control custom-input" 
                                placeholder="Xác nhận lại..." 
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="btn-action" disabled={loading}>
                            {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
