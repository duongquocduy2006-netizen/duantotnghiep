import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';
import './ChangePassword.css';

const ChangePassword = () => {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);

    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const [strength, setStrength] = useState(0);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/profile');
            if (response.data && response.data.success) {
                setLoggedIn(true);
                setAccount(response.data.account);
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin:", err);
            setLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!loggedIn) return;
        document.body.classList.add('profile-page-active');
        return () => {
            document.body.classList.remove('profile-page-active');
        };
    }, [loggedIn]);

    const handleNewPassChange = (e) => {
        const val = e.target.value;
        setNewPass(val);

        let str = 0;
        if (val.length > 5) str += 30;
        if (val.match(/[A-Z]/)) str += 20;
        if (val.match(/[0-9]/)) str += 20;
        if (val.match(/[^A-Za-z0-9]/)) str += 30;
        setStrength(str);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPass !== confirmPass) {
            alert('Mật khẩu mới không khớp!');
            return;
        }

        try {
            const response = await api.post('/api/profile/change-password', {
                oldPassword: oldPass,
                newPassword: newPass,
                confirmPassword: confirmPass
            });

            if (response.data && response.data.success) {
                alert('Cập nhật mật khẩu thành công!');
                setOldPass('');
                setNewPass('');
                setConfirmPass('');
                setStrength(0);
            } else {
                alert('Có lỗi xảy ra: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi đổi mật khẩu:", err);
            if (err.response && err.response.data && err.response.data.message) {
                alert('Lỗi: ' + err.response.data.message);
            } else {
                alert('Lỗi kết nối khi đổi mật khẩu.');
            }
        }
    };

    const getStrengthColor = () => {
        if (strength < 40) return '#000';
        if (strength < 80) return '#f59e0b';
        return '#e50914';
    };

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                        <p className="mt-3 font-oswald fw-bold text-uppercase letter-spacing-1">ĐANG TẢI DỮ LIỆU...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn || !account) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div className="container py-5" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center py-5 px-4 bg-white profile-login-box" style={{maxWidth: '550px', width: '100%'}}>
                            <i className="fa-solid fa-shield-halved fa-4x text-danger mb-4 opacity-75"></i>
                            <h3 className="fw-bold text-uppercase text-dark mb-3" style={{fontSize: '32px'}}>BẢO MẬT TÀI KHOẢN</h3>
                            <p className="fw-semibold text-muted letter-spacing-1 fs-5 my-4">Đăng nhập để cập nhật mật khẩu, quản lý thông tin bảo mật và bảo vệ ví điểm thành viên VIP của bạn!</p>
                            <Link to="/login" className="btn-modern-primary mt-2 d-inline-block">
                                <span>ĐĂNG NHẬP NGAY</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                {/* FILM GRAIN TEXTURE */}
                <div className="god-film-grain" style={{opacity: 0.01}}></div>

                {/* EPIC HERO */}
                <div className="profile-page-header py-5 position-relative overflow-hidden mb-5">
                    <div className="god-watermark-bg text-dark opacity-5" style={{fontSize: '15vw', top: '10%'}}>SECURITY</div>
                    
                    <div className="container text-center position-relative z-1 py-4">
                        <span className="bg-danger text-white px-3 py-1 fw-bold fs-6 text-uppercase animate__animated animate__fadeInDown d-inline-block rounded-pill">BẢO MẬT</span>
                        <h1 className="fw-extrabold mt-3 mb-0 text-uppercase animate__animated animate__fadeInUp text-dark" style={{fontSize: '3.5rem', letterSpacing: '1px'}}>ĐỔI MẬT KHẨU</h1>
                    </div>
                </div>

                <div className="container pb-5 position-relative z-1">
                    <div className="row g-5">

                        <div className="col-lg-4 animate__animated animate__fadeInLeft">
                            <div className="epic-profile-panel">
                                <div className="profile-cover"></div>
                                <div className="user-block">
                                    <div className="avatar-box">
                                        <img src={`https://ui-avatars.com/api/?name=${account.full_name}&background=000&color=fff`} className="user-avatar" alt="Avatar" />
                                        <i className="fa fa-crown vip-crown"></i>
                                    </div>
                                    <h3 className="mt-3 fw-bold text-uppercase" style={{ fontSize: '24px' }}>{account.full_name}</h3>
                                    <div className="d-flex flex-column align-items-center gap-1 mt-2">
                                        <span className="badge bg-danger rounded-pill px-3 py-2 fs-6 text-uppercase">{account.rank_name || 'Đồng'}</span>
                                    </div>
                                </div>

                                <div className="pb-4 pt-2">
                                    <Link to="/profile" className="menu-link">
                                        <i className="fa-regular fa-id-badge"></i> THÔNG TIN CÁ NHÂN
                                    </Link>
                                    <Link to="/orders" className="menu-link">
                                        <i className="fa-solid fa-bag-shopping"></i> LỊCH SỬ ĐƠN HÀNG
                                    </Link>
                                    <Link to="/change-password" className="menu-link active">
                                        <i className="fa-solid fa-shield-halved"></i> ĐỔI MẬT KHẨU
                                    </Link>
                                    <div className="my-3 mx-4 border-top border-light border-1"></div>
                                    <a href="/login" className="menu-link text-danger" onClick={() => api.post('/logout')}>
                                        <i className="fa-solid fa-power-off"></i> ĐĂNG XUẤT
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-8 animate__animated animate__fadeInRight">
                            <div className="epic-profile-panel p-4 p-lg-5">
                                <div className="content-header pb-3 mb-4">
                                    <h4>ĐỔI MẬT KHẨU</h4>
                                    <p className="text-muted fw-bold letter-spacing-1 text-uppercase m-0">Để bảo mật, vui lòng không chia sẻ mật khẩu cho bất kỳ ai.</p>
                                </div>

                                <div className="row mt-4">
                                    <div className="col-md-10 mx-auto">
                                        <div className="security-tip">
                                            <i className="fa-regular fa-lightbulb me-2 text-danger"></i>
                                            Mật khẩu mạnh nên chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                                        </div>

                                        <form onSubmit={handleSubmit}>
                                            <div className="float-input-group">
                                                <input 
                                                    type={showOldPass ? "text" : "password"} 
                                                    className="float-input" 
                                                    id="oldPass" 
                                                    placeholder=" " 
                                                    value={oldPass}
                                                    onChange={e => setOldPass(e.target.value)}
                                                    required 
                                                />
                                                <label htmlFor="oldPass" className="float-label">MẬT KHẨU HIỆN TẠI</label>
                                                <i className={`fa-regular ${showOldPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setShowOldPass(!showOldPass)}></i>
                                            </div>

                                            <div className="float-input-group">
                                                <input 
                                                    type={showNewPass ? "text" : "password"} 
                                                    className="float-input" 
                                                    id="newPass" 
                                                    placeholder=" " 
                                                    value={newPass}
                                                    onChange={handleNewPassChange}
                                                    required 
                                                />
                                                <label htmlFor="newPass" className="float-label">MẬT KHẨU MỚI</label>
                                                <i className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setShowNewPass(!showNewPass)}></i>
                                            </div>

                                            <div className="password-strength" style={{ display: newPass.length > 0 ? 'block' : 'none' }}>
                                                <div className="strength-bar" style={{ width: `${strength}%`, background: getStrengthColor() }}></div>
                                            </div>

                                            <div className="float-input-group">
                                                <input 
                                                    type={showConfirmPass ? "text" : "password"} 
                                                    className="float-input" 
                                                    id="confirmPass" 
                                                    placeholder=" " 
                                                    value={confirmPass}
                                                    onChange={e => setConfirmPass(e.target.value)}
                                                    required 
                                                />
                                                <label htmlFor="confirmPass" className="float-label">XÁC NHẬN MẬT KHẨU MỚI</label>
                                                <i className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setShowConfirmPass(!showConfirmPass)}></i>
                                            </div>

                                            <div className="mt-5 text-end pt-4 content-footer">
                                                <button type="submit" className="btn-super w-100">
                                                    CẬP NHẬT MẬT KHẨU <i className="fa fa-arrow-right ms-2"></i>
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ChangePassword;
