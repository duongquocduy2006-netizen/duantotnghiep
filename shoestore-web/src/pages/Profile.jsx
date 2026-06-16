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
        return new Intl.NumberFormat('vi-VN').format(points || 0) + ' PTS';
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/profile/update', {
                fullName: fullName,
                phone: phone
            });
            if (response.data && response.data.success) {
                alert('Cập nhật hồ sơ thành công!');
                fetchProfile();
            } else {
                alert('Có lỗi xảy ra: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi cập nhật hồ sơ:", err);
            alert('Lỗi kết nối khi cập nhật hồ sơ.');
        }
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
                        <div className="text-center py-5 px-4 border border-dark border-4 bg-white" style={{boxShadow: '10px 10px 0 #e50914', maxWidth: '600px', width: '100%'}}>
                            <i className="fa-regular fa-id-badge fa-4x text-danger mb-4 opacity-75"></i>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark" style={{fontSize: '40px'}}>HỒ SƠ CÁ NHÂN</h3>
                            <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 my-4">Đăng nhập để xem và quản lý thông tin hồ sơ của bạn, cập nhật thông tin vận chuyển và theo dõi lịch sử đơn hàng cá nhân!</p>
                            <Link to="/login" className="btn-god-tier mt-2 d-inline-block">
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
                <div className="god-film-grain" style={{opacity: 0.05}}></div>

                {/* EPIC HERO */}
                <div className="epic-page-header py-5 bg-white position-relative overflow-hidden border-bottom border-dark border-3 mb-5">
                    <div className="god-watermark-bg text-dark opacity-10" style={{fontSize: '15vw', top: '10%'}}>PROFILE</div>
                    
                    <div className="container text-center position-relative z-1 py-5">
                        <span className="bg-danger text-white px-4 py-1 font-oswald fw-bold fs-5 text-uppercase animate__animated animate__fadeInDown d-inline-block border border-dark border-2" style={{boxShadow: '4px 4px 0 #000'}}>TÀI KHOẢN CỦA BẠN</span>
                        <h1 className="font-oswald fw-bold mt-3 mb-0 text-uppercase animate__animated animate__fadeInUp text-dark" style={{fontSize: '5rem', letterSpacing: '4px', textShadow: '4px 4px 0 #e50914'}}>HỒ SƠ CÁ NHÂN</h1>
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
                                    <h3 className="mt-3 font-oswald fw-bold text-uppercase">{account.full_name}</h3>
                                    <div className="d-flex flex-column align-items-center gap-1 mt-2">
                                        <span className="badge bg-dark rounded-0 px-3 py-2 font-oswald fs-6 text-uppercase border border-dark" style={{boxShadow: '3px 3px 0 #e50914'}}>{account.rank_name || 'Đồng'}</span>
                                        <span className="font-oswald text-danger fw-bold fs-5 mt-2">{formatPoints(account.points)}</span>
                                    </div>
                                </div>

                                <div className="pb-4 pt-2">
                                    <Link to="/profile" className="menu-link active">
                                        <i className="fa-regular fa-id-badge"></i> THÔNG TIN CÁ NHÂN
                                    </Link>
                                    <Link to="/orders" className="menu-link">
                                        <i className="fa-solid fa-bag-shopping"></i> LỊCH SỬ ĐƠN HÀNG
                                    </Link>
                                    <Link to="/change-password" className="menu-link">
                                        <i className="fa-solid fa-shield-halved"></i> ĐỔI MẬT KHẨU
                                    </Link>
                                    <div className="my-3 mx-4 border-top border-dark border-2"></div>
                                    <a href="/login" className="menu-link text-danger" onClick={() => api.post('/logout')}>
                                        <i className="fa-solid fa-power-off"></i> ĐĂNG XUẤT
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-8 animate__animated animate__fadeInRight">
                            <div className="epic-profile-panel p-4 p-lg-5">
                                <div className="content-header border-bottom border-dark border-3 pb-3 mb-4">
                                    <h4>CHỈNH SỬA HỒ SƠ</h4>
                                    <p className="text-muted font-oswald fw-bold letter-spacing-1 text-uppercase m-0">Quản lý thông tin cá nhân và bảo mật</p>
                                </div>

                                <form onSubmit={handleSave} className="mt-4">
                                    <div className="row g-4">
                                        {/* Email */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="email" className="float-input" id="email" defaultValue={account.email} readOnly placeholder=" " />
                                                <label htmlFor="email" className="float-label">ĐỊA CHỈ EMAIL (KHÔNG THỂ ĐỔI)</label>
                                            </div>
                                        </div>

                                        {/* User Code */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="usercode" defaultValue={account.user_code} readOnly placeholder=" " />
                                                <label htmlFor="usercode" className="float-label">MÃ THÀNH VIÊN</label>
                                            </div>
                                        </div>

                                        {/* Full Name */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="fullname" name="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder=" " required />
                                                <label htmlFor="fullname" className="float-label">HỌ VÀ TÊN</label>
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="col-md-6">
                                            <div className="float-input-group">
                                                <input type="text" className="float-input" id="phone" name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder=" " />
                                                <label htmlFor="phone" className="float-label">SỐ ĐIỆN THOẠI</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 d-flex align-items-center justify-content-between border-top border-dark border-3 pt-4">
                                        <span className="text-muted font-oswald fw-bold text-uppercase letter-spacing-1"><i className="fa fa-info-circle me-2 text-danger"></i> Hồ sơ tích lũy thành viên</span>
                                        <button type="submit" className="btn-super">
                                            LƯU THAY ĐỔI <i className="fa fa-arrow-right ms-2"></i>
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
