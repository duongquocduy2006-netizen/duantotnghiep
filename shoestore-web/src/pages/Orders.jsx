import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';
import './Orders.css';

const ORDERS_PER_PAGE = 3;

const Orders = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);
    const [orders, setOrders] = useState([]);
    const [visibleCount, setVisibleCount] = useState(ORDERS_PER_PAGE);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        step: 1,
        orderCode: null,
        productId: null
    });
    const [cancelModal, setCancelModal] = useState({
        isOpen: false,
        orderCode: null
    });


    const fetchOrdersData = async () => {
        try {
            setLoading(true);
            const profileResponse = await api.get('/api/profile');
            if (profileResponse.data && profileResponse.data.success) {
                setLoggedIn(true);
                setAccount(profileResponse.data.account);

                try {
                    const ordersResponse = await api.get('/api/orders');
                    if (ordersResponse.data && ordersResponse.data.success) {
                        setOrders(ordersResponse.data.orders || []);
                    }
                } catch (ordersErr) {
                    console.error("Lỗi lấy danh sách đơn hàng:", ordersErr);
                    setOrders([]);
                }
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
        return new Intl.NumberFormat('vi-VN').format(points || 0);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const name = rankName.toLowerCase();
        if (name.includes('kim cương') || name.includes('diamond')) return 'rank-diamond';
        if (name.includes('vàng') || name.includes('gold')) return 'rank-gold';
        if (name.includes('bạc') || name.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const getStatusClass = (status) => {
        if (status === 3) return 'status-done';
        if (status === 4) return 'status-canceled';
        if (status === 5) return 'status-delivered';
        return 'status-wait';
    };

    const getStatusBadge = (status) => {
        if (status === 1) return { cls: 'badge-luxury badge-warning-lux', icon: 'fa-clock', text: 'Chờ duyệt' };
        if (status === 2) return { cls: 'badge-luxury badge-info-lux', icon: 'fa-truck-fast', text: 'Đang giao' };
        if (status === 3) return { cls: 'badge-luxury badge-success-lux', icon: 'fa-circle-check', text: 'Thành công' };
        if (status === 4) return { cls: 'badge-luxury badge-danger-lux', icon: 'fa-circle-xmark', text: 'Đã hủy' };
        if (status === 5) return { cls: 'badge-luxury badge-info-lux', icon: 'fa-box-circle-check', text: 'Đã giao' };
        return { cls: 'badge-luxury', icon: 'fa-circle', text: 'Không rõ' };
    };

    const triggerCancel = (orderCode) => {
        setCancelModal({
            isOpen: true,
            orderCode
        });
    };

    const confirmCancelSubmit = async () => {
        const { orderCode } = cancelModal;
        setCancelModal({ isOpen: false, orderCode: null });
        try {
            const response = await api.post('/api/orders/cancel', { orderCode });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã hủy đơn hàng thành công!' }));
                fetchOrdersData();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể hủy đơn hàng: ' + response.data.message }));
            }
        } catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            const errMsg = err.response?.data?.message || 'Lỗi kết nối khi hủy đơn hàng.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
        }
    };

    const triggerConfirm = (orderCode) => {
        const oObj = orders.find(o => o.order_code === orderCode);
        const productId = oObj ? oObj.first_product_id : null;
        setConfirmModal({
            isOpen: true,
            step: 1,
            orderCode,
            productId
        });
    };

    const handleConfirmSubmit = async () => {
        const { orderCode, productId } = confirmModal;
        try {
            const response = await api.post('/api/orders/confirm', { orderCode });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xác nhận nhận hàng thành công và cộng điểm tích lũy!' }));
                if (productId) {
                    setConfirmModal({
                        isOpen: true,
                        step: 2,
                        orderCode,
                        productId
                    });
                } else {
                    setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
                    fetchOrdersData();
                }
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể xác nhận đơn hàng: ' + response.data.message }));
                setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
            }
        } catch (err) {
            console.error("Lỗi xác nhận đơn hàng:", err);
            const errMsg = err.response?.data?.message || 'Lỗi kết nối khi xác nhận đơn hàng.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
            setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
        }
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/') ? '' : '/images/';
        return `http://localhost:8080${prefix}${url}`;
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
                                <i className="fa-solid fa-bag-shopping" style={{fontSize: '28px', color: '#64748b'}}></i>
                            </div>
                            <h3 className="fw-bold text-uppercase text-dark mb-2" style={{fontSize: '22px', letterSpacing: '0.5px'}}>Lịch Sử Đơn Hàng</h3>
                            <p className="text-muted mb-4" style={{fontSize: '14px', lineHeight: '1.7'}}>Đăng nhập để theo dõi trạng thái giao hàng, kiểm tra lịch sử mua sắm và xác nhận nhận hàng tích lũy điểm.</p>
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
                            <span style={{color: '#0f172a', fontWeight: 600}}>Lịch sử đơn hàng</span>
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
                                    </div>
                                    <h3 className="mt-3 fw-bold mb-1" style={{ fontSize: '16px', color: '#0f172a' }}>{account.full_name}</h3>
                                    <div className="mb-2">
                                        <span 
                                            className={`rank-badge-flat ${getRankClass(account.rank_name)}`}
                                            style={account.color_code ? {
                                                backgroundColor: `${account.color_code}1f`,
                                                color: account.color_code,
                                                borderColor: `${account.color_code}40`,
                                                borderStyle: 'solid',
                                                borderWidth: '1px'
                                            } : {}}
                                        >
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
                                    <Link to="/orders" className="menu-link active">
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
                                <div className="content-header pb-3 mb-4 d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <div style={{width: '4px', height: '20px', background: '#e50914', borderRadius: '2px'}}></div>
                                            <h4 className="mb-0">Lịch sử đơn hàng</h4>
                                        </div>
                                        <p className="mb-0 ms-3">Theo dõi trạng thái và lịch sử mua sắm của bạn</p>
                                    </div>
                                    <div style={{fontSize: '13px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontWeight: 600}}>
                                        {orders.length} đơn hàng
                                    </div>
                                </div>

                                <div>
                                    {orders.length === 0 ? (
                                        <div className="text-center py-5" style={{border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc'}}>
                                            <div style={{width: '64px', height: '64px', borderRadius: '16px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                                                <i className="fa-solid fa-box-open" style={{fontSize: '24px', color: '#94a3b8'}}></i>
                                            </div>
                                            <p className="fw-semibold text-muted mb-3" style={{fontSize: '15px'}}>Bạn chưa có đơn hàng nào</p>
                                            <Link to="/shop" className="btn-super text-decoration-none d-inline-block">Tiếp tục mua sắm</Link>
                                        </div>
                                    ) : (
                                        <>
                                            {orders.slice(0, visibleCount).map(order => {
                                                const badge = getStatusBadge(order.status);
                                                const imgSrc = getImageUrl(order.first_product_image);
                                                return (
                                                    <div key={order.order_code} className={`luxury-order-card ${getStatusClass(order.status)}`}>

                                                        {/* Order Header */}
                                                        <div className="order-header">
                                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                <span className="order-id">#{order.order_code}</span>
                                                                <span className="order-date">
                                                                    <i className="fa-regular fa-calendar me-1"></i>
                                                                    {formatDate(order.created_at)}
                                                                </span>
                                                            </div>
                                                            <span className={badge.cls}>
                                                                <i className={`fa-solid ${badge.icon} me-1`}></i> {badge.text}
                                                            </span>
                                                        </div>

                                                        {/* Product info */}
                                                        <div className="d-flex align-items-center gap-3 mb-4">
                                                            {imgSrc ? (
                                                                <img
                                                                    src={imgSrc}
                                                                    className="product-thumb"
                                                                    alt={order.first_product_name || 'Sản phẩm'}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                className="product-thumb"
                                                                style={{
                                                                    display: imgSrc ? 'none' : 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: '#f1f5f9',
                                                                    border: '1px solid #e2e8f0',
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-shoe-prints" style={{fontSize: '22px', color: '#94a3b8', transform: 'rotate(-30deg)'}}></i>
                                                            </div>
                                                            <div className="flex-grow-1 min-w-0">
                                                                <div className="product-title">{order.first_product_name || 'Đôi giày thời trang'}</div>
                                                                <div className="product-meta">
                                                                    {order.total_items > 1 ? `+${order.total_items - 1} sản phẩm khác` : '1 sản phẩm'}
                                                                </div>
                                                            </div>
                                                            <div className="text-end flex-shrink-0">
                                                                <div className="price-tag">{formatCurrency(order.final_amount)}</div>
                                                            </div>
                                                        </div>
                                                        {/* Lý do hủy */}
                                                        {order.status === 4 && order.cancel_reason && (
                                                            <div style={{
                                                                background: '#fff5f5',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: '8px',
                                                                padding: '10px 14px',
                                                                marginBottom: '12px',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '8px'
                                                            }}>
                                                                <i className="fa-solid fa-circle-exclamation" style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }}></i>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', display: 'block', marginBottom: '2px' }}>Lý do hủy</span>
                                                                    <span style={{ fontSize: '13px', color: '#7f1d1d' }}>{order.cancel_reason}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Actions */}
                                                        <div className="d-flex justify-content-end gap-2 pt-3" style={{borderTop: '1px solid #f1f5f9'}}>
                                                            <Link to={`/orders/detail/${order.order_code}`} className="btn-outline-luxury">
                                                                <i className="fa-regular fa-file-lines me-1"></i> Chi tiết
                                                            </Link>
                                                            {order.status === 3 && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-outline-luxury"
                                                                        style={{background: '#e50914', color: '#fff', border: '1px solid #e50914'}}
                                                                        onClick={() => navigate(`/details?id=${order.first_product_id}&tab=reviews`)}
                                                                    >
                                                                        <i className="fa-regular fa-star me-1"></i> Đánh giá
                                                                    </button>
                                                                    <Link to="/shop" className="btn-outline-luxury" style={{background: '#0f172a', color: '#fff', border: '1px solid #0f172a'}}>
                                                                        Mua lại
                                                                    </Link>
                                                                </>
                                                            )}
                                                            {order.status === 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-outline-luxury text-danger"
                                                                    onClick={(e) => { e.preventDefault(); triggerCancel(order.order_code); }}
                                                                >
                                                                    <i className="fa-solid fa-xmark me-1"></i> Hủy đơn
                                                                </button>
                                                            )}
                                                            {order.status === 2 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-super"
                                                                    style={{padding: '8px 16px', fontSize: '13px'}}
                                                                    onClick={(e) => { e.preventDefault(); triggerConfirm(order.order_code); }}
                                                                >
                                                                    <i className="fa-solid fa-box-open me-1"></i> Đã nhận hàng
                                                                </button>
                                                            )}
                                                            {order.status === 5 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-super"
                                                                    style={{padding: '8px 16px', fontSize: '13px'}}
                                                                    onClick={(e) => { e.preventDefault(); triggerConfirm(order.order_code); }}
                                                                >
                                                                    <i className="fa-solid fa-circle-check me-1"></i> Xác nhận đã nhận
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Xem thêm / Thu gọn */}
                                            {orders.length > ORDERS_PER_PAGE && (
                                                <div className="text-center pt-2 pb-1">
                                                    {visibleCount < orders.length ? (
                                                        <button
                                                            className="load-more-btn"
                                                            onClick={() => setVisibleCount(v => v + ORDERS_PER_PAGE)}
                                                        >
                                                            <i className="fa-solid fa-chevron-down me-2"></i>
                                                            Xem thêm ({orders.length - visibleCount} đơn còn lại)
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="load-more-btn"
                                                            onClick={() => setVisibleCount(ORDERS_PER_PAGE)}
                                                        >
                                                            <i className="fa-solid fa-chevron-up me-2"></i>
                                                            Thu gọn
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <div className="text-center pt-3 mt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                                <Link to="/order-history" className="btn-super d-inline-block" style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '8px' }}>
                                                    <i className="fa-solid fa-filter me-2"></i> Xem tất cả & Lọc nâng cao
                                                </Link>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {cancelModal.isOpen && (
                <div className="epic-modal-overlay">
                    <div className="epic-modal-box animate__animated animate__zoomIn">
                        <div className="epic-modal-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                            <i className="fa-solid fa-circle-xmark"></i>
                        </div>
                        <h4 className="epic-modal-title">Hủy đơn hàng</h4>
                        <p className="epic-modal-message">Bạn có chắc chắn muốn hủy đơn hàng này không?</p>
                        <div className="epic-modal-actions">
                            <button className="epic-btn-modal-cancel" onClick={() => setCancelModal({ isOpen: false, orderCode: null })}>Quay lại</button>
                            <button className="epic-btn-modal-confirm" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={confirmCancelSubmit}>Xác nhận hủy</button>
                        </div>
                    </div>
                </div>
            )}
            {confirmModal.isOpen && (
                <div className="epic-modal-overlay">
                    <div className="epic-modal-box animate__animated animate__zoomIn">
                        {confirmModal.step === 1 ? (
                            <>
                                <div className="epic-modal-icon">
                                    <i className="fa-solid fa-box-open"></i>
                                </div>
                                <h4 className="epic-modal-title">Xác nhận nhận hàng</h4>
                                <p className="epic-modal-message">Xác nhận bạn đã nhận được gói hàng này? Đơn hàng sẽ được chuyển sang trạng thái thành công.</p>
                                <div className="epic-modal-actions">
                                    <button className="epic-btn-modal-cancel" onClick={() => setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null })}>Hủy bỏ</button>
                                    <button className="epic-btn-modal-confirm" onClick={handleConfirmSubmit}>Đồng ý</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="epic-modal-icon">
                                    <i className="fa-solid fa-star-half-stroke"></i>
                                </div>
                                <h4 className="epic-modal-title">Đánh giá sản phẩm</h4>
                                <p className="epic-modal-message">Xác nhận nhận hàng thành công! Bạn có muốn đánh giá sản phẩm này ngay để tích luỹ thêm điểm không?</p>
                                <div className="epic-modal-actions">
                                    <button className="epic-btn-modal-cancel" onClick={() => {
                                        setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
                                        fetchOrdersData();
                                    }}>Để sau</button>
                                    <button className="epic-btn-modal-confirm" onClick={() => {
                                        navigate(`/details?id=${confirmModal.productId}&tab=reviews`);
                                        setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
                                    }}>Đánh giá ngay</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Orders;
