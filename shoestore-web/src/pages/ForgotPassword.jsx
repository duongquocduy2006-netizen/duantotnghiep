import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';
import 'animate.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setEmailError('Vui lòng nhập địa chỉ email!');
            return;
        } else if (!emailRegex.test(email)) {
            setEmailError('Địa chỉ email không hợp lệ!');
            return;
        }

        setEmailError('');
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
        <div className="login-page">
            <div className="bg-image"></div>
            <div className="bg-overlay"></div>

            <Link to="/login" className="back-home animate__animated animate__fadeInDown">
                <i className="fa-solid fa-arrow-left-long"></i> TRỞ VỀ ĐĂNG NHẬP
            </Link>

            <div className="container d-flex justify-content-center" style={{ zIndex: 10 }}>
                <div className="login-card animate__animated animate__fadeInUp">

                    <div className="text-center">
                        <Link to="/" className="main-logo-login">
                            <i className="fa-solid fa-shoe-prints main-logo-icon-login"></i>
                            <div className="main-logo-text-login">Shoe<span>Store</span></div>
                        </Link>
                        <p className="brand-subtitle-login">Khôi phục mật khẩu</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger p-2 text-center animate__animated animate__fadeIn"
                            style={{ fontSize: '14px', borderRadius: '12px', marginBottom: '16px' }}>
                            <i className="fa-solid fa-circle-exclamation me-2"></i>{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-4">
                            <label className="form-label">Nhập email của bạn</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                className={`form-control custom-input${emailError ? ' input-error' : ''}`}
                                placeholder="email@example.com"
                                disabled={loading}
                            />
                            {emailError && <div className="field-error-msg">{emailError}</div>}
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1 }}>
                            {loading
                                ? <><i className="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi mã...</>
                                : <><i className="fa-solid fa-paper-plane me-2"></i>Gửi mã xác thực</>
                            }
                        </button>
                    </form>

                    <div className="auth-footer">
                        Nhớ ra mật khẩu rồi? <br />
                        <Link to="/login">ĐĂNG NHẬP NGAY <i className="fa fa-arrow-right"></i></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
