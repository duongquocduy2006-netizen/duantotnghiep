import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './Login.css';
import 'animate.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || 'email@example.com';
    const otp = location.state?.otp || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        if (!password) {
            newErrors.password = 'Vui lòng nhập mật khẩu mới!';
        } else if (password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự!';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu!';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp!';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/api/auth/reset-password', { email, password, confirmPassword });
            if (response.data.success) {
                sessionStorage.setItem('toast_message', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
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
                        <p className="brand-subtitle-login">Đặt lại mật khẩu mới</p>
                    </div>

                    {error && <div className="alert alert-danger p-2 text-center" style={{fontSize: '14px', borderRadius: '12px', marginBottom: '16px'}}>{error}</div>}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-3">
                            <label className="form-label">Mật khẩu mới</label>
                            <div className="position-relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className={`form-control custom-input ${errors.password ? 'is-invalid border-danger' : ''}`}
                                    style={{ paddingRight: '45px', ...(errors.password ? {borderColor: '#dc3545', boxShadow: '0 0 5px rgba(220,53,69,0.5)'} : {}) }}
                                    placeholder="NHẬP MẬT KHẨU MỚI"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if(errors.password) setErrors({...errors, password: ''});
                                        setError('');
                                    }}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="btn position-absolute top-50 end-0 translate-middle-y border-0 text-secondary pe-3"
                                    style={{ background: 'none', zIndex: 5, cursor: 'pointer' }}
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            {errors.password && <div className="text-danger mt-1" style={{fontSize: '12px', fontWeight: '500'}}>{errors.password}</div>}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Xác nhận mật khẩu</label>
                            <div className="position-relative">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    className={`form-control custom-input ${errors.confirmPassword ? 'is-invalid border-danger' : ''}`}
                                    style={{ paddingRight: '45px', ...(errors.confirmPassword ? {borderColor: '#dc3545', boxShadow: '0 0 5px rgba(220,53,69,0.5)'} : {}) }}
                                    placeholder="XÁC NHẬN MẬT KHẨU MỚI"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if(errors.confirmPassword) setErrors({...errors, confirmPassword: ''});
                                        setError('');
                                    }}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="btn position-absolute top-50 end-0 translate-middle-y border-0 text-secondary pe-3"
                                    style={{ background: 'none', zIndex: 5, cursor: 'pointer' }}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                >
                                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            {errors.confirmPassword && <div className="text-danger mt-1" style={{fontSize: '12px', fontWeight: '500'}}>{errors.confirmPassword}</div>}
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'ĐANG CẬP NHẬT...' : 'ĐỔI MẬT KHẨU'}
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

export default ResetPassword;
