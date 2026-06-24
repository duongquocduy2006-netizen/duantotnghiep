import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './VerifyOTP.css';

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
        <div className="auth-page">
            <div className="bg-image"></div>
            <div className="container d-flex justify-content-center">
                <div className={`login-card animate__animated ${error ? 'animate__headShake' : 'animate__zoomIn'}`}>
                    <div className="text-center">
                        <div className="main-logo-text">XÁC MINH<span> OTP</span></div>
                        <p style={{ color: '#a0a0a0', fontSize: '14px', marginTop: '15px', marginBottom: '15px', textTransform: 'uppercase' }}>
                            Mã OTP đã được gửi về email:
                        </p>
                        <p style={{ color: '#fff', fontWeight: '600', fontSize: '18px' }}>{email}</p>
                    </div>

                    {error && <div className="custom-alert alert-error-custom">{error}</div>}
                    {message && <div className="custom-alert alert-success-custom">{message}</div>}

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

                        <button type="submit" className="btn-action" disabled={loading}>
                            {loading ? 'Đang xác nhận...' : 'Xác nhận mã'}
                        </button>
                    </form>

                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <Link to="/forgot-password" style={{ color: '#a0a0a0', textDecoration: 'none', fontSize: '13px', textTransform: 'uppercase' }}>
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
