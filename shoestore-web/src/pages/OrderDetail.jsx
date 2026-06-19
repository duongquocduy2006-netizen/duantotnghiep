import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './OrderDetail.css';

const OrderDetail = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/orders/${id}`);
            if (response.data && response.data.success) {
                setOrder(response.data.order);
                setItems(response.data.items || []);
            } else {
                setError("Không tìm thấy thông tin đơn hàng.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết đơn hàng:", err);
            setError("Lỗi kết nối máy chủ khi tải chi tiết đơn hàng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOrderDetail();
        }
    }, [id]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=f1f5f9&color=94a3b8&bold=true';
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/') ? '' : '/images/';
        return `http://localhost:8080${prefix}${url}`;
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!window.confirm('Xác nhận bạn đã nhận được gói hàng này?')) return;
        try {
            const response = await api.post('/api/orders/confirm', { orderCode: id });
            if (response.data && response.data.success) {
                alert('Đã xác nhận nhận hàng thành công và cộng điểm tích lũy thành viên VIP!');
                fetchOrderDetail();
            } else {
                alert('Không thể xác nhận đơn hàng: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi xác nhận:", err);
            alert('Lỗi kết nối khi xác nhận đơn hàng.');
        }
    };

    const handleCancel = async (e) => {
        e.preventDefault();
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
        try {
            const response = await api.post('/api/orders/cancel', { orderCode: id });
            if (response.data && response.data.success) {
                alert('Đã hủy đơn hàng thành công!');
                fetchOrderDetail();
            } else {
                alert('Không thể hủy đơn hàng: ' + response.data.message);
            }
        } catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            alert('Lỗi kết nối khi hủy đơn hàng.');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="order-detail-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                        <p className="mt-3 fw-semibold text-muted">Đang tải dữ liệu...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !order) {
        return (
            <Layout>
                <div className="order-detail-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                    <div className="text-center">
                        <i className="fa-solid fa-triangle-exclamation fa-4x text-danger mb-4"></i>
                        <h4 className="fw-bold">{error || "Không tìm thấy đơn hàng!"}</h4>
                        <Link to="/orders" className="btn-od-primary mt-4">Quay lại danh sách</Link>
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
    if (order.status >= 2 && order.status !== 4) progressWidth = '33%';
    if (order.status >= 5 && order.status !== 4) progressWidth = '66%';
    if (order.status === 3) progressWidth = '100%';

    return (
        <Layout>
            <div className="order-detail-wrapper">
                
                {/* Banner Hero */}
                <div className="od-header-banner">
                    <div className="container text-center animate__animated animate__fadeInDown">
                        <div className="od-breadcrumb">
                            <Link to="/">Trang chủ</Link>
                            <span className="mx-2">/</span>
                            <Link to="/order-history">Lịch sử đơn hàng</Link>
                            <span className="mx-2">/</span>
                            <span className="text-white">Chi tiết</span>
                        </div>
                        <h1 className="od-page-title">Chi Tiết Đơn Hàng</h1>
                    </div>
                </div>

                <div className="container" style={{ marginTop: '80px' }}>
                    <Link to="/order-history" className="btn-od-back animate__animated animate__fadeIn">
                        <i className="fa-solid fa-arrow-left"></i> Trở về lịch sử đơn hàng
                    </Link>

                    <div className="od-main-card animate__animated animate__fadeInUp">
                        
                        {/* Header Row */}
                        <div className="od-header-row">
                            <div>
                                <h2 className="od-order-id">Đơn hàng #{order.order_code}</h2>
                                <p className="od-order-date">Ngày đặt: {formatDate(order.created_at)}</p>
                            </div>
                            <div>
                                <span className={`od-status-badge ${statusInfo.class}`}>
                                    <i className={`fa-solid ${statusInfo.icon}`}></i> {statusInfo.text}
                                </span>
                            </div>
                        </div>

                        {/* Status Timeline */}
                        {order.status !== 4 && (
                            <div className="od-timeline">
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
                        <div className="od-info-grid">
                            <div className="od-info-card">
                                <h3 className="od-info-title"><i className="fa-solid fa-location-dot"></i> Thông tin nhận hàng</h3>
                                <div className="od-info-content">
                                    <p><strong>{order.receiving_name}</strong></p>
                                    <p><i className="fa-solid fa-phone"></i> {order.phone_number}</p>
                                    <p><i className="fa-solid fa-map-pin"></i> {order.street_detail}</p>
                                </div>
                            </div>
                            <div className="od-info-card">
                                <h3 className="od-info-title"><i className="fa-solid fa-credit-card"></i> Phương thức thanh toán</h3>
                                <div className="od-info-content">
                                    <p><strong>{order.method_name}</strong></p>
                                    <div className="mt-3">
                                        {isPaid ? (
                                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">
                                                <i className="fa-solid fa-circle-check me-1"></i> Đã thanh toán
                                            </span>
                                        ) : (
                                            <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2 rounded-pill" style={{color: '#d97706'}}>
                                                <i className="fa-solid fa-clock me-1"></i> Chưa thanh toán
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product List */}
                        <h3 className="od-section-title">Sản phẩm đơn hàng ({items.length})</h3>
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
                        <div className="row justify-content-end">
                            <div className="col-md-6 col-lg-5">
                                <div className="od-summary-box">
                                    <div className="od-summary-row">
                                        <span>Tạm tính</span>
                                        <span>{formatCurrency(order.total_amount)}</span>
                                    </div>
                                    <div className="od-summary-row">
                                        <span>Phí vận chuyển</span>
                                        <span>{formatCurrency(order.shipping_fee)}</span>
                                    </div>
                                    <div className="od-summary-row total">
                                        <span>Tổng thanh toán</span>
                                        <span className="val">{formatCurrency(order.final_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {(order.status === 2 || order.status === 1) && (
                            <div className="od-actions">
                                {order.status === 1 && (
                                    <button onClick={handleCancel} className="btn-od-outline text-danger border-danger">
                                        <i className="fa-solid fa-xmark"></i> Hủy đơn hàng
                                    </button>
                                )}
                                {order.status === 2 && (
                                    <button onClick={handleConfirm} className="btn-od-primary">
                                        <i className="fa-solid fa-box-open"></i> Đã nhận được hàng
                                    </button>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OrderDetail;
