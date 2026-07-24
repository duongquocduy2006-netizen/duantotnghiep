import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';
import 'animate.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        if (!email) {
            newErrors.email = 'Vui lòng nhập địa chỉ email!';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Địa chỉ email không hợp lệ!';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
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

                    {error && <div className="alert alert-danger p-2 text-center" style={{fontSize: '14px', borderRadius: '12px', marginBottom: '16px'}}>{error}</div>}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-3">
                            <label className="form-label">Email tài khoản</label>
                            <input 
                                type="email" 
                                className={`form-control custom-input ${errors.email ? 'is-invalid border-danger' : ''}`}
                                style={errors.email ? {borderColor: '#dc3545', boxShadow: '0 0 5px rgba(220,53,69,0.5)'} : {}}
                                placeholder="NHẬP EMAIL CỦA BẠN"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if(errors.email) setErrors({...errors, email: ''});
                                    setError('');
                                }}
                                disabled={loading}
                            />
                            {errors.email && <div className="text-danger mt-1" style={{fontSize: '12px', fontWeight: '500'}}>{errors.email}</div>}
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'ĐANG GỬI MÃ...' : 'GỬI MÃ XÁC THỰC'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Đã nhớ mật khẩu? <br />
                        <Link to="/login">ĐĂNG NHẬP NGAY <i className="fa fa-arrow-right"></i></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
