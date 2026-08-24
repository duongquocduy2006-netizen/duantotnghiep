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
    const [formErrors, setFormErrors] = useState({});

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

    const getStrengthLabel = () => {
        if (strength < 30) return { text: 'Yếu', color: '#ef4444' };
        if (strength < 60) return { text: 'Trung bình', color: '#f59e0b' };
        if (strength < 90) return { text: 'Mạnh', color: '#10b981' };
        return { text: 'Rất mạnh', color: '#0ea5e9' };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        let errors = {};
        if (!oldPass) {
            errors.oldPass = 'Vui lòng nhập mật khẩu hiện tại!';
        }
        if (!newPass) {
            errors.newPass = 'Vui lòng nhập mật khẩu mới!';
        } else if (newPass.length < 6) {
            errors.newPass = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
        }
        if (!confirmPass) {
            errors.confirmPass = 'Vui lòng xác nhận mật khẩu mới!';
        } else if (newPass !== confirmPass) {
            errors.confirmPass = 'Mật khẩu mới không khớp!';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            const response = await api.post('/api/profile/change-password', {
                oldPassword: oldPass,
                newPassword: newPass,
                confirmPassword: confirmPass
            });

            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Cập nhật mật khẩu thành công!' }));
                setOldPass('');
                setNewPass('');
                setConfirmPass('');
                setStrength(0);
                setFormErrors({});
            } else {
                const msg = response.data?.message || 'Đổi mật khẩu thất bại!';
                if (msg.toLowerCase().includes('hiện tại')) {
                    setFormErrors({ oldPass: msg });
                } else {
                    setFormErrors({ general: msg });
                }
            }
        } catch (err) {
            console.error("Lỗi đổi mật khẩu:", err);
            const msg = err.response?.data?.message || err.message || 'Lỗi kết nối khi đổi mật khẩu.';
            if (msg.toLowerCase().includes('hiện tại')) {
                setFormErrors({ oldPass: msg });
            } else {
                setFormErrors({ general: msg });
            }
        }
    };

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const name = rankName.toLowerCase();
        if (name.includes('kim cương') || name.includes('diamond')) return 'rank-diamond';
        if (name.includes('vàng') || name.includes('gold')) return 'rank-gold';
        if (name.includes('bạc') || name.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const formatPoints = (points) => {
        return new Intl.NumberFormat('vi-VN').format(points || 0);
    };

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
                        <p className="mt-3 fw-semibold text-muted" style={{fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase'}}>Đang tải...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn || !account) {
        return (
            <Layout>
                <div className="home-god-tier position-relative" style={{minHeight: '100vh', background: '#f8fafc', paddingBottom: '100px'}}>
                    <div className="container py-5" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center py-5 px-4 profile-login-box" style={{maxWidth: '480px', width: '100%'}}>
                            <div style={{width: '72px', height: '72px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'}}>
                                <i className="fa-solid fa-shield-halved" style={{fontSize: '28px', color: '#64748b'}}></i>
                            </div>
                            <h3 className="fw-bold text-uppercase text-dark mb-2" style={{fontSize: '22px', letterSpacing: '0.5px'}}>Bảo Mật Tài Khoản</h3>
                            <p className="text-muted mb-4" style={{fontSize: '14px', lineHeight: '1.7'}}>Đăng nhập để cập nhật mật khẩu và quản lý thông tin bảo mật tài khoản của bạn.</p>
                            <Link to="/login" className="btn-modern-primary d-inline-block">
                                Đăng nhập ngay
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const strengthInfo = getStrengthLabel();

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px'}}>

                {/* PAGE HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{fontSize: '13px', color: '#64748b'}}>
                            <Link to="/" style={{color: '#64748b', textDecoration: 'none'}}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                            <span style={{color: '#0f172a', fontWeight: 600}}>Đổi mật khẩu</span>
                        </div>
                        <h1 className="fw-bold mt-2 mb-0" style={{fontSize: '22px', color: '#0f172a', letterSpacing: '0.3px'}}>Tài Khoản Của Bạn</h1>
                    </div>
                </div>

                <div className="container py-4">
                    <div className="row g-4">

                        {/* SIDEBAR */}
                        <div className="col-lg-3">
                            <div className="epic-profile-panel">
                                <div className="profile-cover"></div>
                                <div className="user-block px-3">
                                    <div className="avatar-box">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(account.full_name)}&background=1e293b&color=fff&bold=true&size=200`}
                                            className="user-avatar"
                                            alt="Avatar"
                                        />
                                        <i className="fa fa-crown vip-crown"></i>
                                    </div>
                                    <h3 className="mt-3 fw-bold mb-1" style={{ fontSize: '16px', color: '#0f172a' }}>{account.full_name}</h3>
                                    <div className="mb-2">
                                        <span className={`rank-badge-flat ${getRankClass(account.rank_name)}`}>
                                            {account.rank_name || 'Đồng'}
                                        </span>
                                    </div>
                                    <div className="points-flat-box mb-3">
                                        <span className="points-label">Điểm</span>
                                        <span className="points-val">{formatPoints(account.points)} PTS</span>
                                    </div>
                                </div>
                                <div className="pb-3">
                                    <div style={{height: '1px', background: '#f1f5f9', margin: '0 16px 8px'}}></div>
                                    <Link to="/profile" className="menu-link">
                                        <i className="fa-regular fa-id-badge"></i> Thông tin cá nhân
                                    </Link>
                                    <Link to="/notifications" className="menu-link">
                                        <i className="fa-solid fa-bell"></i> Thông báo
                                    </Link>
                                    <Link to="/orders" className="menu-link">
                                        <i className="fa-solid fa-bag-shopping"></i> Lịch sử đơn hàng
                                    </Link>
                                    <Link to="/change-password" className="menu-link active">
                                        <i className="fa-solid fa-shield-halved"></i> Đổi mật khẩu
                                    </Link>
                                    <div style={{height: '1px', background: '#f1f5f9', margin: '8px 16px'}}></div>
                                    <a href="/login" className="menu-link text-danger" onClick={() => api.post('/logout')}>
                                        <i className="fa-solid fa-power-off"></i> Đăng xuất
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* MAIN CONTENT */}
                        <div className="col-lg-9">
                            <div className="epic-profile-panel p-4 p-lg-5">
                                <div className="content-header pb-3 mb-4">
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <div style={{width: '4px', height: '20px', background: '#e50914', borderRadius: '2px'}}></div>
                                        <h4 className="mb-0">Đổi mật khẩu</h4>
                                    </div>
                                    <p className="mb-0 ms-3">Để bảo mật, vui lòng không chia sẻ mật khẩu cho bất kỳ ai</p>
                                </div>

                                <div className="row">
                                    <div className="col-md-9 col-lg-8">

                                        {/* Security Tip */}
                                        <div className="security-tip mb-4">
                                            <i className="fa-regular fa-lightbulb me-2"></i>
                                            Mật khẩu mạnh nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                                        </div>

                                        <form onSubmit={handleSubmit} noValidate>
                                            {formErrors.general && (
                                                <div className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2 border-0 bg-danger bg-opacity-10 text-danger font-oswald fw-bold" style={{ borderRadius: '8px', fontSize: '13px' }}>
                                                    <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                                                    <span>{formErrors.general}</span>
                                                </div>
                                            )}

                                            {/* Mật khẩu hiện tại */}
                                            <div className="float-input-group mb-2">
                                                <input
                                                    type={showOldPass ? "text" : "password"}
                                                    className={`float-input ${formErrors.oldPass ? 'is-invalid border-danger' : ''}`}
                                                    id="oldPass"
                                                    placeholder=" "
                                                    value={oldPass}
                                                    onChange={e => {
                                                        setOldPass(e.target.value);
                                                        if (formErrors.oldPass) setFormErrors({ ...formErrors, oldPass: null });
                                                    }}
                                                />
                                                <label htmlFor="oldPass" className="float-label">Mật khẩu hiện tại</label>
                                                <i
                                                    className={`fa-regular ${showOldPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                                                    onClick={() => setShowOldPass(!showOldPass)}
                                                ></i>
                                            </div>
                                            {formErrors.oldPass && (
                                                <div className="text-danger small mb-3 font-oswald fw-bold">
                                                    <i className="bi bi-exclamation-circle me-1"></i>{formErrors.oldPass}
                                                </div>
                                            )}

                                            {/* Mật khẩu mới */}
                                            <div className="float-input-group mb-2">
                                                <input
                                                    type={showNewPass ? "text" : "password"}
                                                    className={`float-input ${formErrors.newPass ? 'is-invalid border-danger' : ''}`}
                                                    id="newPass"
                                                    placeholder=" "
                                                    value={newPass}
                                                    onChange={e => {
                                                        handleNewPassChange(e);
                                                        if (formErrors.newPass) setFormErrors({ ...formErrors, newPass: null });
                                                    }}
                                                />
                                                <label htmlFor="newPass" className="float-label">Mật khẩu mới</label>
                                                <i
                                                    className={`fa-regular ${showNewPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                                                    onClick={() => setShowNewPass(!showNewPass)}
                                                ></i>
                                            </div>
                                            {formErrors.newPass && (
                                                <div className="text-danger small mb-3 font-oswald fw-bold">
                                                    <i className="bi bi-exclamation-circle me-1"></i>{formErrors.newPass}
                                                </div>
                                            )}

                                            {/* Strength bar */}
                                            {newPass.length > 0 && (
                                                <div className="mb-3 mt-1">
                                                    <div className="password-strength">
                                                        <div
                                                            className="strength-bar"
                                                            style={{ width: `${strength}%`, background: strengthInfo.color }}
                                                        ></div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                                        <span style={{fontSize: '12px', color: '#94a3b8'}}>Độ mạnh mật khẩu</span>
                                                        <span style={{fontSize: '12px', fontWeight: 600, color: strengthInfo.color}}>{strengthInfo.text}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Xác nhận mật khẩu mới */}
                                            <div className="float-input-group mb-2">
                                                <input
                                                    type={showConfirmPass ? "text" : "password"}
                                                    className={`float-input ${formErrors.confirmPass ? 'is-invalid border-danger' : ''}`}
                                                    id="confirmPass"
                                                    placeholder=" "
                                                    value={confirmPass}
                                                    onChange={e => {
                                                        setConfirmPass(e.target.value);
                                                        if (formErrors.confirmPass) setFormErrors({ ...formErrors, confirmPass: null });
                                                    }}
                                                />
                                                <label htmlFor="confirmPass" className="float-label">Xác nhận mật khẩu mới</label>
                                                <i
                                                    className={`fa-regular ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                ></i>
                                            </div>
                                            {formErrors.confirmPass && (
                                                <div className="text-danger small mb-3 font-oswald fw-bold">
                                                    <i className="bi bi-exclamation-circle me-1"></i>{formErrors.confirmPass}
                                                </div>
                                            )}

                                            {/* Match indicator */}
                                            {confirmPass.length > 0 && (
                                                <div className="mb-3 d-flex align-items-center gap-2" style={{fontSize: '13px'}}>
                                                    {newPass === confirmPass ? (
                                                        <>
                                                            <i className="fa-solid fa-circle-check" style={{color: '#10b981'}}></i>
                                                            <span style={{color: '#10b981', fontWeight: 600}}>Mật khẩu khớp</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-solid fa-circle-xmark" style={{color: '#ef4444'}}></i>
                                                            <span style={{color: '#ef4444', fontWeight: 600}}>Mật khẩu chưa khớp</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 content-footer">
                                                <button type="submit" className="btn-super w-100">
                                                    <i className="fa fa-lock me-2"></i> Cập nhật mật khẩu
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
