import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';
import './Orders.css';

const Orders = () => {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);
    const [orders, setOrders] = useState([]);

    const fetchOrdersData = async () => {
        try {
            setLoading(true);
            const profileResponse = await api.get('/api/profile');
            if (profileResponse.data && profileResponse.data.success) {
                setLoggedIn(true);
                setAccount(profileResponse.data.account);

                const ordersResponse = await api.get('/api/orders');
                if (ordersResponse.data && ordersResponse.data.success) {
                    setOrders(ordersResponse.data.orders || []);
                }
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin đơn hàng:", err);
            setLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrdersData();
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const getStatusClass = (status) => {
        if (status === 3) return 'status-done';
        if (status === 4) return 'status-canceled';
        if (status === 5) return 'status-delivered';
        return 'status-wait';
    };

    const handleCancel = async (e, orderCode) => {
        e.preventDefault();
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;

        try {
            const response = await api.post('/api/orders/cancel', { orderCode });
            if (response.data && response.data.success) {
                alert('Đã hủy đơn hàng thành công!');
                fetchOrdersData();
            } else {
                alert('Không thể hủy đơn hàng: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            if (err.response && err.response.data && err.response.data.message) {
                alert('Lỗi: ' + err.response.data.message);
            } else {
                alert('Lỗi kết nối khi hủy đơn hàng.');
            }
        }
    };

    const handleConfirm = async (e, orderCode) => {
        e.preventDefault();
        if (!window.confirm('Xác nhận bạn đã nhận được gói hàng này?')) return;

        try {
            const response = await api.post('/api/orders/confirm', { orderCode });
            if (response.data && response.data.success) {
                alert('Đã xác nhận nhận hàng thành công và cộng điểm tích lũy thành viên VIP!');
                fetchOrdersData();
            } else {
                alert('Không thể xác nhận đơn hàng: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi xác nhận đơn hàng:", err);
            if (err.response && err.response.data && err.response.data.message) {
                alert('Lỗi: ' + err.response.data.message);
            } else {
                alert('Lỗi kết nối khi xác nhận đơn hàng.');
            }
        }
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
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
                            <i className="fa-solid fa-bag-shopping fa-4x text-danger mb-4 opacity-75"></i>
                            <h3 className="fw-bold text-uppercase text-dark mb-3" style={{fontSize: '32px'}}>LỊCH SỬ ĐƠN HÀNG</h3>
                            <p className="fw-semibold text-muted letter-spacing-1 fs-5 my-4">Đăng nhập để theo dõi trạng thái giao hàng, kiểm tra lịch sử mua sắm và xác nhận nhận hàng tích lũy điểm VIP!</p>
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
                    <div className="god-watermark-bg text-dark opacity-5" style={{fontSize: '15vw', top: '10%'}}>ORDERS</div>
                    
                    <div className="container text-center position-relative z-1 py-4">
                        <span className="bg-danger text-white px-3 py-1 fw-bold fs-6 text-uppercase animate__animated animate__fadeInDown d-inline-block rounded-pill">MUA SẮM</span>
                        <h1 className="fw-extrabold mt-3 mb-0 text-uppercase animate__animated animate__fadeInUp text-dark" style={{fontSize: '3.5rem', letterSpacing: '1px'}}>ĐƠN HÀNG CỦA BẠN</h1>
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
                                        <span className="text-danger fw-bold fs-5 mt-2">{formatPoints(account.points)}</span>
                                    </div>
                                </div>

                                <div className="pb-4 pt-2">
                                    <Link to="/profile" className="menu-link">
                                        <i className="fa-regular fa-id-badge"></i> THÔNG TIN CÁ NHÂN
                                    </Link>
                                    <Link to="/orders" className="menu-link active">
                                        <i className="fa-solid fa-bag-shopping"></i> LỊCH SỬ ĐƠN HÀNG
                                    </Link>
                                    <Link to="/change-password" className="menu-link">
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
                                <div className="content-header pb-3 mb-4 d-flex justify-content-between align-items-end">
                                    <div>
                                        <h4 className="mb-0">LỊCH SỬ ĐƠN HÀNG</h4>
                                        <p className="text-muted fw-bold letter-spacing-1 text-uppercase mt-2 mb-0">Theo dõi trạng thái và lịch sử mua sắm</p>
                                    </div>
                                    <div className="text-danger fw-bold text-uppercase" style={{ fontSize: '13px' }}>
                                        <i className="fa-solid fa-filter me-1 text-dark"></i> HIỂN THỊ: <span className="text-dark fw-bold px-2 mx-1">{orders.length}</span> ĐƠN GẦN NHẤT
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {orders.length === 0 ? (
                                        <div className="text-center py-5 border border-light rounded-3 bg-light">
                                            <i className="fa-solid fa-box-open fa-4x text-muted mb-4 d-block opacity-50"></i>
                                            <p className="fs-5 fw-bold text-uppercase text-muted">BẠN CHƯA CÓ ĐƠN HÀNG NÀO.</p>
                                            <Link to="/shop" className="btn-super mt-3 text-decoration-none d-inline-block">TIẾP TỤC MUA SẮM</Link>
                                        </div>
                                    ) : (
                                        orders.map(order => (
                                            <div key={order.order_code} className={`luxury-order-card ${getStatusClass(order.status)} animate__animated animate__fadeInUp`}>
                                                <div className="order-header">
                                                    <div>
                                                        <span className="order-id">#{order.order_code}</span>
                                                        <span className="order-date">
                                                            <i className="fa-regular fa-calendar me-1"></i>
                                                            <span>{formatDate(order.created_at)}</span>
                                                        </span>
                                                    </div>

                                                    {order.status === 1 && (
                                                        <span className="badge-luxury badge-warning-lux">
                                                            <i className="fa-solid fa-clock me-1"></i> CHỜ DUYỆT
                                                        </span>
                                                    )}
                                                    {order.status === 2 && (
                                                        <span className="badge-luxury" style={{ background: '#eff6ff', color: '#1e40af' }}>
                                                            <i className="fa-solid fa-truck-fast me-1 text-primary"></i> ĐANG GIAO
                                                        </span>
                                                    )}
                                                    {order.status === 3 && (
                                                        <span className="badge-luxury badge-success-lux">
                                                            <i className="fa-solid fa-check-circle me-1"></i> THÀNH CÔNG
                                                        </span>
                                                    )}
                                                    {order.status === 5 && (
                                                        <span className="badge-luxury" style={{ background: '#fef3c7', color: '#92400e' }}>
                                                            <i className="fa-solid fa-hourglass-half me-1"></i> CHỜ HOÀN TẤT
                                                        </span>
                                                    )}
                                                    {order.status === 4 && (
                                                        <span className="badge-luxury" style={{ background: '#f3f4f6', color: '#374151' }}>
                                                            <i className="fa-solid fa-times-circle me-1"></i> ĐÃ HỦY
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="d-flex align-items-center gap-3">
                                                    <img src={getImageUrl(order.first_product_image)} className="product-thumb" alt="Product" />
                                                    <div className="flex-grow-1">
                                                        <div className="product-title">{order.first_product_name || 'Đôi giày thời trang'}</div>
                                                        <div className="product-meta">
                                                            {order.total_items > 1 ? `VÀ ${order.total_items - 1} SẢN PHẨM KHÁC` : '1 SẢN PHẨM'}
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="price-tag">{formatCurrency(order.final_amount)}</div>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top border-light border-1">
                                                    <Link to={`/orders/detail/${order.order_code}`} className="btn-outline-luxury">CHI TIẾT</Link>
                                                    {order.status === 3 && (
                                                        <Link to="/shop" className="btn-outline-luxury bg-dark text-white border-dark">MUA LẠI</Link>
                                                    )}
                                                    {order.status === 1 && (
                                                        <button 
                                                            type="button" 
                                                            className="btn-outline-luxury text-danger border-danger" 
                                                            onClick={(e) => handleCancel(e, order.order_code)}
                                                        >
                                                            HỦY ĐƠN
                                                        </button>
                                                    )}
                                                    {order.status === 2 && (
                                                        <button 
                                                            type="button" 
                                                            className="btn-super p-2 px-3" 
                                                            onClick={(e) => handleConfirm(e, order.order_code)}
                                                        >
                                                            ĐÃ NHẬN HÀNG
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Orders;
