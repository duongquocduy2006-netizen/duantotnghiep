import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Profile.css';
import './Orders.css';
import './OrderDetail.css';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        step: 1,
        orderCode: null,
        productId: null
    });

    const fetchOrderDetail = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const [profileRes, orderRes] = await Promise.all([
                api.get('/api/profile'),
                api.get(`/api/orders/${id}`)
            ]);

            if (profileRes.data && profileRes.data.success) {
                setAccount(profileRes.data.account);
            }

            if (orderRes.data && orderRes.data.success) {
                setOrder(orderRes.data.order);
                setItems(orderRes.data.items || []);
            } else {
                setError("Không tìm thấy thông tin đơn hàng.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết đơn hàng:", err);
            setError("Lỗi kết nối máy chủ khi tải chi tiết đơn hàng.");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOrderDetail();
        }
    }, [id]);

    useEffect(() => {
        document.body.classList.add('profile-page-active');
        return () => {
            document.body.classList.remove('profile-page-active');
        };
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const formatPoints = (points) => {
        return new Intl.NumberFormat('vi-VN').format(points || 0);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=f1f5f9&color=94a3b8&bold=true';
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/') ? '' : '/images/';
        return `http://localhost:8080${prefix}${url}`;
    };

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const name = rankName.toLowerCase();
        if (name.includes('kim cương') || name.includes('diamond')) return 'rank-diamond';
        if (name.includes('vàng') || name.includes('gold')) return 'rank-gold';
        if (name.includes('bạc') || name.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const triggerConfirm = (e) => {
        if (e) e.preventDefault();
        const productId = items && items.length > 0 ? items[0].product_id : null;
        setConfirmModal({
            isOpen: true,
            step: 1,
            orderCode: id,
            productId
        });
    };

    const handleConfirmSubmit = async () => {
        const { orderCode, productId } = confirmModal;
        try {
            const response = await api.post('/api/orders/confirm', { orderCode });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xác nhận nhận hàng thành công và cộng điểm tích lũy thành viên VIP!' }));
                if (productId) {
                    setConfirmModal({
                        isOpen: true,
                        step: 2,
                        orderCode,
                        productId
                    });
                } else {
                    setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
                    fetchOrderDetail(false);
                }
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể xác nhận đơn hàng: ' + response.data.message }));
                setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
            }
        } catch (err) {
            console.error("Lỗi xác nhận:", err);
            const errMsg = err.response?.data?.message || 'Lỗi kết nối khi xác nhận đơn hàng.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
            setConfirmModal({ isOpen: false, step: 1, orderCode: null, productId: null });
        }
    };

    const handleCancel = async (e) => {
        e.preventDefault();
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
        try {
            const response = await api.post('/api/orders/cancel', { orderCode: id });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã hủy đơn hàng thành công!' }));
                fetchOrderDetail(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể hủy đơn hàng: ' + response.data.message }));
            }
        } catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            const errMsg = err.response?.data?.message || 'Lỗi kết nối khi hủy đơn hàng.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
                        <p className="mt-3 fw-semibold text-muted" style={{fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase'}}>Đang tải chi tiết đơn hàng...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !order || !account) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh'}}>
                    <div className="container py-5 text-center" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <i className="fa-solid fa-triangle-exclamation fa-4x text-danger mb-4"></i>
                        <h4 className="fw-bold text-dark">{error || "Không tìm thấy đơn hàng hoặc phiên đăng nhập hết hạn!"}</h4>
                        <Link to="/orders" className="btn-modern-primary mt-4" style={{textDecoration: 'none'}}>Quay lại danh sách</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const isCod = order.method_name && (order.method_name.toLowerCase().includes('cod') || order.method_name.toLowerCase().includes('tiền mặt') || order.method_name.toLowerCase().includes('nhận hàng'));
    const isPaid = isCod ? (order.status === 3) : (order.status !== 4);

    const getStatusInfo = (status) => {
        switch(status) {
            case 1: return { class: 'wait', icon: 'fa-clock', text: 'Chờ duyệt' };
            case 2: return { class: 'shipping', icon: 'fa-truck-fast', text: 'Đang giao' };
            case 5: return { class: 'shipping', icon: 'fa-box-open', text: 'Chờ hoàn tất' };
            case 3: return { class: 'done', icon: 'fa-circle-check', text: 'Thành công' };
            case 4: return { class: 'cancel', icon: 'fa-circle-xmark', text: 'Đã hủy' };
            default: return { class: '', icon: 'fa-circle', text: 'Không rõ' };
        }
    };
    const statusInfo = getStatusInfo(order.status);

    let progressWidth = '0%';
    if (order.status >= 2 && order.status !== 4) progressWidth = '25%';
    if (order.status >= 5 && order.status !== 4) progressWidth = '50%';
    if (order.status === 3) progressWidth = '75%';

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px'}}>
                
                {/* PAGE HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{fontSize: '13px', color: '#64748b'}}>
                            <Link to="/" style={{color: '#64748b', textDecoration: 'none'}}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                            <Link to="/orders" style={{color: '#64748b', textDecoration: 'none'}}>Lịch sử đơn hàng</Link>
                            <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                            <span style={{color: '#0f172a', fontWeight: 600}}>Chi tiết đơn hàng #{id}</span>
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
                                
                                {/* Content Header */}
                                <div className="content-header pb-3 mb-4 d-flex justify-content-between align-items-center" style={{borderBottom: '1px solid #f1f5f9'}}>
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <div style={{width: '4px', height: '20px', background: '#e50914', borderRadius: '2px'}}></div>
                                            <h4 className="mb-0 fw-bold" style={{fontSize: '18px', color: '#0f172a'}}>Chi tiết đơn hàng</h4>
                                        </div>
                                        <p className="mb-0 ms-3 text-muted" style={{fontSize: '13px'}}>Thông tin chi tiết và trạng thái của đơn hàng #{order.order_code}</p>
                                    </div>
                                    <Link to="/orders" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" style={{borderRadius: '6px', fontWeight: 600, fontSize: '13px', padding: '6px 12px'}}>
                                        <i className="fa-solid fa-arrow-left"></i> Quay lại
                                    </Link>
                                </div>

                                <div className="od-main-card-flat">
                                    
                                    {/* Header Row */}
                                    <div className="od-header-row mb-4">
                                        <div>
                                            <h2 className="od-order-id mb-1" style={{fontSize: '20px', color: '#0f172a', fontWeight: '700'}}>Đơn hàng #{order.order_code}</h2>
                                            <p className="od-order-date text-muted mb-0" style={{fontSize: '13px'}}>Ngày đặt: {formatDate(order.created_at)}</p>
                                        </div>
                                        <div>
                                            <span className={`od-status-badge ${statusInfo.class}`}>
                                                <i className={`fa-solid ${statusInfo.icon}`}></i> {statusInfo.text}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Timeline */}
                                    {order.status !== 4 && (
                                        <div className="od-timeline mb-5">
                                            <div className="od-timeline-progress" style={{ width: progressWidth }}></div>
                                            <div className={`od-step ${order.status >= 1 ? 'completed' : ''}`}>
                                                <div className="od-step-icon"><i className="fa-solid fa-clipboard-check"></i></div>
                                                <div className="od-step-label">Đặt hàng</div>
                                            </div>
                                            <div className={`od-step ${order.status >= 2 ? 'completed' : ''}`}>
                                                <div className="od-step-icon"><i className="fa-solid fa-truck-fast"></i></div>
                                                <div className="od-step-label">Đang giao</div>
                                            </div>
                                            <div className={`od-step ${order.status >= 5 ? 'completed' : ''}`}>
                                                <div className="od-step-icon"><i className="fa-solid fa-box-open"></i></div>
                                                <div className="od-step-label">Đã nhận</div>
                                            </div>
                                            <div className={`od-step ${order.status === 3 ? 'completed' : ''}`}>
                                                <div className="od-step-icon"><i className="fa-solid fa-check-double"></i></div>
                                                <div className="od-step-label">Hoàn tất</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Info Grids */}
                                    <div className="od-info-grid mb-5">
                                        <div className="od-info-card">
                                            <h3 className="od-info-title"><i className="fa-solid fa-location-dot"></i> Thông tin nhận hàng</h3>
                                            <div className="od-info-content">
                                                <p className="mb-2"><strong>{order.receiving_name}</strong></p>
                                                <p className="mb-2 text-muted"><i className="fa-solid fa-phone me-1"></i> {order.phone_number}</p>
                                                <p className="mb-0 text-muted"><i className="fa-solid fa-map-pin me-1"></i> {order.street_detail}</p>
                                            </div>
                                        </div>
                                        <div className="od-info-card">
                                            <h3 className="od-info-title"><i className="fa-solid fa-credit-card"></i> Phương thức thanh toán</h3>
                                            <div className="od-info-content">
                                                <p className="mb-3"><strong>{order.method_name}</strong></p>
                                                <div>
                                                    {isPaid ? (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill" style={{fontSize: '12px', fontWeight: '600'}}>
                                                            <i className="fa-solid fa-circle-check me-1"></i> Đã thanh toán
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2 rounded-pill" style={{color: '#d97706', fontSize: '12px', fontWeight: '600'}}>
                                                            <i className="fa-solid fa-clock me-1"></i> Chưa thanh toán
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product List */}
                                    <h3 className="od-section-title mb-3" style={{fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.5px'}}>Sản phẩm đơn hàng ({items.length})</h3>
                                    <div className="mb-4">
                                        {items.map((item, index) => (
                                            <div key={index} className="od-product-item">
                                                <img src={getImageUrl(item.image_url)} alt={item.product_name} className="od-product-img" />
                                                <div className="od-product-info">
                                                    <h4 className="od-product-name">{item.product_name}</h4>
                                                    <div className="od-product-meta">
                                                        <span>Màu: {item.color_name}</span>
                                                        <span>Size: {item.size_name}</span>
                                                    </div>
                                                </div>
                                                <div className="od-product-price-qty">
                                                    <div className="od-price">{formatCurrency(item.price)}</div>
                                                    <div className="od-qty">x{item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary */}
                                    <div className="row justify-content-end mb-4">
                                        <div className="col-md-6 col-lg-5">
                                            <div className="od-summary-box p-3" style={{background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0'}}>
                                                <div className="od-summary-row d-flex justify-content-between mb-2" style={{fontSize: '14px'}}>
                                                    <span className="text-muted">Tạm tính</span>
                                                    <span className="fw-semibold text-dark">{formatCurrency(order.total_amount)}</span>
                                                </div>
                                                <div className="od-summary-row d-flex justify-content-between mb-2" style={{fontSize: '14px'}}>
                                                    <span className="text-muted">Phí vận chuyển</span>
                                                    <span className="fw-semibold text-dark">
                                                        {order.shipping_fee > 0 ? formatCurrency(order.shipping_fee) : 'MIỄN PHÍ'}
                                                    </span>
                                                </div>
                                                {order.total_amount + order.shipping_fee - order.final_amount > 0 && (
                                                    <div className="od-summary-row d-flex justify-content-between mb-2" style={{fontSize: '14px', color: '#16a34a'}}>
                                                        <span style={{color: '#16a34a'}}>Giảm giá</span>
                                                        <span className="fw-bold" style={{color: '#16a34a'}}>
                                                            -{formatCurrency(order.total_amount + order.shipping_fee - order.final_amount)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="od-summary-row d-flex justify-content-between align-items-center mt-3 pt-2" style={{borderTop: '1px dashed #e2e8f0'}}>
                                                    <span className="fw-bold text-dark" style={{fontSize: '15px'}}>Tổng thanh toán</span>
                                                    <span className="val fw-bold text-danger" style={{fontSize: '18px'}}>{formatCurrency(order.final_amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {(order.status === 1 || order.status === 2 || order.status === 3) && (
                                        <div className="od-actions d-flex justify-content-end gap-2 pt-3" style={{borderTop: '1px solid #f1f5f9'}}>
                                            {order.status === 1 && (
                                                <button onClick={handleCancel} className="btn-outline-luxury text-danger" style={{border: '1px solid #dc3545', background: 'transparent', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600'}}>
                                                    <i className="fa-solid fa-xmark"></i> Hủy đơn hàng
                                                </button>
                                            )}
                                            {order.status === 2 && (
                                                <button onClick={triggerConfirm} className="btn-super" style={{padding: '10px 20px', fontSize: '13px', borderRadius: '8px'}}>
                                                    <i className="fa-solid fa-box-open"></i> Đã nhận được hàng
                                                </button>
                                            )}
                                            {order.status === 3 && (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            if (items && items.length > 0) {
                                                                navigate(`/details?id=${items[0].product_id}&tab=reviews`);
                                                            } else {
                                                                navigate('/shop');
                                                            }
                                                        }} 
                                                        className="btn-outline-luxury"
                                                        style={{background: '#e50914', color: '#fff', border: '1px solid #e50914', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600'}}
                                                    >
                                                        <i className="fa-regular fa-star me-1"></i> Đánh giá đơn hàng
                                                    </button>
                                                    <Link to="/shop" className="btn-outline-luxury text-decoration-none d-inline-flex align-items-center justify-content-center" style={{background: '#0f172a', color: '#fff', border: '1px solid #0f172a', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600'}}>
                                                        Mua lại
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
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
                                        fetchOrderDetail(false);
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

export default OrderDetail;
