import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import api from '../services/api';
import 'animate.css';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const msg = sessionStorage.getItem('toast_message');
        if (msg) {
            setSuccessMsg(msg);
            sessionStorage.removeItem('toast_message');
            const timer = setTimeout(() => setSuccessMsg(''), 4000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const response = await api.post('/api/auth/login', {
                email,
                password
            });
            
            if (response.data.success) {
                sessionStorage.setItem('toast_message', 'Đăng nhập thành công!');
                navigate('/');
            }
        } catch (err) {
            console.error('Lỗi đăng nhập:', err);
            if (err.message === 'Network Error') {
                setError('Lỗi kết nối đến Server! Hãy kiểm tra xem Backend đã chạy chưa hoặc lỗi CORS.');
            } else if (err.response && err.response.data && err.response.data.message) {
                setError('Đăng nhập thất bại: ' + err.response.data.message);
            } else {
                setError('Sai email hoặc mật khẩu!');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="bg-image"></div>
            <div className="bg-overlay"></div>

            <Link to="/" className="back-home animate__animated animate__fadeInDown">
                <i className="fa-solid fa-arrow-left-long"></i> TRỞ VỀ CỬA HÀNG
            </Link>

            <div className="container d-flex justify-content-center" style={{ zIndex: 10 }}>
                <div className="login-card animate__animated animate__fadeInUp">

                    <div className="text-center">
                        <Link to="/" className="main-logo-login">
                            <i className="fa-solid fa-shoe-prints main-logo-icon-login"></i>
                            <div className="main-logo-text-login">Shoe<span>Store</span></div>
                        </Link>
                        <p className="brand-subtitle-login">Chào mừng trở lại</p>
                    </div>

                    {successMsg && (
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
                            {successMsg}
                        </div>
                    )}

                    {error && <div className="alert alert-danger p-2 text-center" style={{fontSize: '14px', borderRadius: '12px', marginBottom: '16px'}}>{error}</div>}

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label">Email tài khoản</label>
                            <input 
                                type="email" 
                                className="form-control custom-input" 
                                placeholder="NHẬP EMAIL CỦA BẠN"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Mật khẩu</label>
                            <input 
                                type="password" 
                                className="form-control custom-input" 
                                placeholder="NHẬP MẬT KHẨU"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="form-check d-flex align-items-center gap-2">
                                <input className="form-check-input m-0" type="checkbox" id="rememberMe" />
                                <label className="form-check-label" htmlFor="rememberMe">
                                    GHI NHỚ TÔI
                                </label>
                            </div>
                            <Link to="/forgot-password" className="forgot-pass">QUÊN MẬT KHẨU?</Link>
                        </div>

                        <button type="submit" className="btn-login">
                            ĐĂNG NHẬP
                        </button>
                    </form>

                    <div className="divider"><span>Hoặc đăng nhập bằng</span></div>

                    <button 
                        className="btn-google"
                        onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
                        type="button"
                    >
                        <i className="fa-brands fa-google"></i> &nbsp; TÀI KHOẢN GOOGLE
                    </button>

                    <div className="auth-footer">
                        Người dùng mới? <br />
                        <Link to="/register">TẠO TÀI KHOẢN NGAY <i className="fa fa-arrow-right"></i></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
