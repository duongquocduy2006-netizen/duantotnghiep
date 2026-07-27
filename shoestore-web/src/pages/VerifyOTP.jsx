import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './Login.css';
import './VerifyOTP.css';
import 'animate.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || 'email@example.com';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(180);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (timeLeft > 0) {
                setTimeLeft(timeLeft - 1);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (index, value) => {
        const val = value.replace(/[^0-9]/g, '');
        if (val.length <= 1) {
            const newOtp = [...otp];
            newOtp[index] = val;
            setOtp(newOtp);
            setError('');

            if (val.length === 1 && index < 5) {
                inputRefs.current[index + 1].focus();
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
        inputRefs.current[focusIndex].focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6) {
            setError('Vui lòng nhập đầy đủ mã OTP 6 số!');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const response = await api.post('/api/auth/verify-otp', { email, otp: fullOtp });
            if (response.data.success) {
                navigate('/reset-password', { state: { email, otp: fullOtp } });
            } else {
                setError(response.data.message || 'Xác thực OTP thất bại!');
            }
        } catch (err) {
            console.error('Lỗi xác thực OTP:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Không thể kết nối đến server để xác thực OTP!');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timeLeft === 0 && !loading) {
            setError('');
            setMessage('');
            setLoading(true);
            try {
                const response = await api.post('/api/auth/resend-otp', { email });
                if (response.data.success) {
                    setTimeLeft(180);
                    setMessage('Mã OTP mới đã được gửi vào email của bạn!');
                } else {
                    setError(response.data.message || 'Gửi lại OTP thất bại!');
                }
            } catch (err) {
                console.error('Lỗi gửi lại OTP:', err);
                if (err.response && err.response.data && err.response.data.message) {
                    setError(err.response.data.message);
                } else {
                    setError('Không thể gửi lại mã xác thực. Vui lòng kết nối lại!');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="login-page">
            <div className="bg-image"></div>
            <div className="bg-overlay"></div>

            <Link to="/forgot-password" className="back-home animate__animated animate__fadeInDown">
                <i className="fa-solid fa-arrow-left-long"></i> THAY ĐỔI EMAIL
            </Link>

            <div className="container d-flex justify-content-center" style={{ zIndex: 10 }}>
                <div className="login-card animate__animated animate__fadeInUp">

                    <div className="text-center">
                        <Link to="/" className="main-logo-login">
                            <i className="fa-solid fa-shoe-prints main-logo-icon-login"></i>
                            <div className="main-logo-text-login">Shoe<span>Store</span></div>
                        </Link>
                        <p className="brand-subtitle-login">Xác minh mã OTP</p>
                        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                            Mã OTP đã được gửi về email:
                        </p>
                        <p className="otp-email-display">{email}</p>
                    </div>

                    {error && <div className="alert alert-danger p-2 text-center" style={{fontSize: '14px', borderRadius: '12px', marginBottom: '16px'}}>{error}</div>}
                    {message && (
                        <div className="alert alert-success p-2 text-center animate__animated animate__fadeIn" style={{
                            fontSize: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#d1e7dd',
                            color: '#0f5132',
                            fontWeight: '600',
                            marginBottom: '16px'
                        }}>
                            <i className="fa-solid fa-circle-check me-2"></i>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="otp-container">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    className="otp-input"
                                    value={digit}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'ĐANG XÁC NHẬN...' : 'XÁC NHẬN MÃ OTP'}
                        </button>
                    </form>

                    <div className="otp-timer-wrapper">
                        <Link to="/forgot-password">
                            <i className="fa-solid fa-arrow-left"></i> &nbsp;Thay đổi Email
                        </Link>
                        <button 
                            type="button" 
                            className={`auth-link-btn ${timeLeft > 0 || loading ? 'disabled' : ''}`}
                            onClick={handleResend}
                            disabled={timeLeft > 0 || loading}
                            style={{ background: 'none', border: 'none', cursor: (timeLeft > 0 || loading) ? 'default' : 'pointer' }}
                        >
                            {timeLeft > 0 ? `Gửi lại mã (${formatTime(timeLeft)})` : 'GỬI MÃ MỚI'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
