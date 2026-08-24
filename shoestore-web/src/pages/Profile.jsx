import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/profile');
            if (response.data && response.data.success) {
                setLoggedIn(true);
                setAccount(response.data.account);
                setFullName(response.data.account.full_name || '');
                setPhone(response.data.account.phone || '');
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin cá nhân:", err);
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

    const formatPoints = (points) => {
        return new Intl.NumberFormat('vi-VN').format(points || 0);
    };

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const name = rankName.toLowerCase();
        if (name.includes('kim cương') || name.includes('diamond')) return 'rank-diamond';
        if (name.includes('vàng') || name.includes('gold')) return 'rank-gold';
        if (name.includes('bạc') || name.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/profile/update', {
                fullName: fullName,
                phone: phone
            });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Cập nhật hồ sơ thành công!' }));
                fetchProfile();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Có lỗi xảy ra: ' + response.data.message }));
            }
        } catch (err) {
            console.error("Lỗi cập nhật hồ sơ:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi kết nối khi cập nhật hồ sơ.' }));
        }
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
                                <i className="fa-regular fa-id-badge" style={{fontSize: '28px', color: '#64748b'}}></i>
                            </div>
                            <h3 className="fw-bold text-uppercase text-dark mb-2" style={{fontSize: '22px', letterSpacing: '0.5px'}}>Hồ Sơ Cá Nhân</h3>
                            <p className="text-muted mb-4" style={{fontSize: '14px', lineHeight: '1.7'}}>Đăng nhập để xem và quản lý thông tin hồ sơ, cập nhật thông tin vận chuyển và theo dõi lịch sử đơn hàng.</p>
                            <Link to="/login" className="btn-modern-primary d-inline-block">
                                Đăng nhập ngay
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px'}}>

                {/* PAGE HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{fontSize: '13px', color: '#64748b'}}>
                            <Link to="/" style={{color: '#64748b', textDecoration: 'none'}}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                            <span style={{color: '#0f172a', fontWeight: 600}}>Hồ sơ cá nhân</span>
                        </div>
                        <h1 className="fw-bold mt-2 mb-0" style={{fontSize: '22px', color: '#0f172a', letterSpacing: '0.3px'}}>Tài Khoản Của Bạn</h1>
                    </div>
                </div>

                <div className="container py-4">
                    <div className="row g-4">

                        {/* SIDEBAR */}
                        <div className="col-lg-3">
                            <div className="epic-profile-panel">
                                {/* Cover */}
                                <div className="profile-cover"></div>

                                {/* User Block */}
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

                                {/* Navigation */}
                                <div className="pb-3">
                                    <div style={{height: '1px', background: '#f1f5f9', margin: '0 16px 8px'}}></div>
                                    <Link to="/profile" className="menu-link active">
                                        <i className="fa-regular fa-id-badge"></i> Thông tin cá nhân
                                    </Link>
                                    <Link to="/notifications" className="menu-link">
                                        <i className="fa-solid fa-bell"></i> Thông báo
                                    </Link>
                                    <Link to="/orders" className="menu-link">
                                        <i className="fa-solid fa-bag-shopping"></i> Lịch sử đơn hàng
                                    </Link>
                                    <Link to="/change-password" className="menu-link">
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
                                        <h4 className="mb-0">Chỉnh sửa hồ sơ</h4>
                                    </div>
                                    <p className="mb-0 ms-3">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
                                </div>

                                <form onSubmit={handleSave} noValidate>
                                    <div className="row g-4">
                                        {/* Email */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="email" className="float-input" id="email" defaultValue={account.email} readOnly placeholder=" " />
                                                <label htmlFor="email" className="float-label">Địa chỉ email (không thể đổi)</label>
                                            </div>
                                        </div>

                                        {/* User Code */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="usercode" defaultValue={account.user_code} readOnly placeholder=" " />
                                                <label htmlFor="usercode" className="float-label">Mã thành viên</label>
                                            </div>
                                        </div>

                                        {/* Full Name */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="fullname" name="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder=" " />
                                                <label htmlFor="fullname" className="float-label">Họ và tên</label>
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="phone" name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder=" " />
                                                <label htmlFor="phone" className="float-label">Số điện thoại</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info note */}
                                    <div className="mt-4 p-3 d-flex align-items-start gap-2" style={{background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                        <i className="fa fa-circle-info mt-1" style={{color: '#64748b', fontSize: '14px', flexShrink: 0}}></i>
                                        <p className="mb-0" style={{fontSize: '13px', color: '#475569', lineHeight: '1.6'}}>
                                            Thông tin cá nhân của bạn sẽ được sử dụng để tích điểm và xét hạng thành viên. Điểm tích lũy hiện tại: <strong style={{color: '#e50914'}}>{formatPoints(account.points)} điểm</strong>.
                                        </p>
                                    </div>

                                    <div className="mt-4 d-flex align-items-center justify-content-between pt-4 content-footer">
                                        <span style={{fontSize: '13px', color: '#94a3b8'}}>
                                            Cập nhật lần cuối bởi hệ thống
                                        </span>
                                        <button type="submit" className="btn-super">
                                            Lưu thay đổi <i className="fa fa-check ms-2"></i>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Profile;
