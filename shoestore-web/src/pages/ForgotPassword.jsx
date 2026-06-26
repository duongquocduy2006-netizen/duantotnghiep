import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            setError('Vui lòng nhập địa chỉ email!');
            return;
        } else if (!emailRegex.test(email)) {
            setError('Địa chỉ email không hợp lệ!');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const response = await api.post('/api/auth/forgot-password', { email });
            if (response.data.success) {
                navigate('/verify-otp', { state: { email } });
            } else {
                setError(response.data.message || 'Đã xảy ra lỗi!');
            }
        } catch (err) {
            console.error('Lỗi gửi OTP:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Không thể gửi mã xác thực. Vui lòng kiểm tra lại kết nối!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-image"></div>
            <Link to="/login" className="back-home animate__animated animate__fadeInDown">
                <i className="fa-solid fa-arrow-left-long"></i> TRỞ VỀ ĐĂNG NHẬP
            </Link>

            <div className="container d-flex justify-content-center">
                <div className={`login-card animate__animated ${error ? 'animate__headShake' : 'animate__zoomIn'}`}>
                    <div className="text-center mb-4">
                        <div className="main-logo-text">
                            <i className="fa-solid fa-shoe-prints main-logo-icon"></i>Shoe<span>Store</span>
                        </div>
                        <p style={{ color: '#a0a0a0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Khôi phục mật khẩu</p>
                    </div>

                    {error && <div className="custom-alert alert-error-custom">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="form-label">Nhập email của bạn</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                className="form-control custom-input" 
                                placeholder="email@example.com" 
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="btn-action" disabled={loading}>
                            {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
