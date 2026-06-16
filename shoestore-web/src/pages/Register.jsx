import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Reusing Login CSS since it's identical mostly
import api from '../services/api';

const Register = () => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp!');
            return;
        }

        if (!agreeTerms) {
            setError('Bạn phải đồng ý với điều khoản sử dụng!');
            return;
        }

        try {
            const response = await api.post('/api/auth/register', {
                fullName,
                email,
                password,
                confirmPassword,
                agreeTerms
            });

            if (response.data.success) {
                alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
                navigate('/login');
            }
        } catch (err) {
            console.error('Lỗi đăng ký:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Có lỗi xảy ra trong quá trình đăng ký!');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="bg-image" style={{backgroundImage: "url('https://static.nike.com/a/images/f_auto/dpr_1.3,cs_srgb/w_1423,c_limit/6f8e7960-466d-4952-a39c-482087596d66/jordan-1-lost-and-found-chicago-release-date.jpg')"}}></div>
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
                        <p className="brand-subtitle-login">Đăng ký thành viên mới</p>
                    </div>

                    {error && <div className="alert alert-danger p-2 text-center" style={{fontSize: '14px'}}>{error}</div>}

                    <form onSubmit={handleRegister}>
                        <div className="mb-3">
                            <label className="form-label">Họ và tên</label>
                            <input 
                                type="text" 
                                className="form-control custom-input" 
                                placeholder="NHẬP HỌ VÀ TÊN CỦA BẠN"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

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

                        <div className="mb-4">
                            <label className="form-label">Nhập lại mật khẩu</label>
                            <input 
                                type="password" 
                                className="form-control custom-input" 
                                placeholder="XÁC NHẬN MẬT KHẨU"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-4 form-check d-flex align-items-center gap-2">
                            <input 
                                type="checkbox" 
                                className="form-check-input m-0" 
                                id="agreeTerms"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="agreeTerms">
                                TÔI ĐỒNG Ý VỚI <a href="#" style={{color: '#e50914', textDecoration: 'none'}}>ĐIỀU KHOẢN SỬ DỤNG</a>
                            </label>
                        </div>

                        <button type="submit" className="btn-login">
                            ĐĂNG KÝ
                        </button>
                    </form>

                    <div className="divider"><span>Hoặc đăng ký bằng</span></div>

                    <button className="btn-google">
                        <i className="fa-brands fa-google"></i> &nbsp; TÀI KHOẢN GOOGLE
                    </button>

                    <div className="auth-footer">
                        Đã có thẻ thành viên? <br />
                        <Link to="/login">ĐĂNG NHẬP NGAY <i className="fa fa-arrow-right"></i></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
