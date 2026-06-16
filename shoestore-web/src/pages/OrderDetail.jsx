import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Profile.css';
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
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
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
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                        <p className="mt-3 font-oswald fw-bold text-uppercase letter-spacing-1 text-dark">ĐANG TẢI DỮ LIỆU...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !order) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div className="container py-5 text-center" style={{ minHeight: '70vh', color: '#000' }}>
                        <i className="fa fa-exclamation-triangle fa-4x text-danger mb-4"></i>
                        <h3 className="font-oswald fw-bold text-dark">{error || "Không tìm thấy đơn hàng!"}</h3>
                        <Link to="/orders" className="btn-god-tier mt-4 d-inline-block"><span>Quay lại danh sách</span></Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const isCod = order.method_name && (order.method_name.toLowerCase().includes('cod') || order.method_name.toLowerCase().includes('tiền mặt') || order.method_name.toLowerCase().includes('nhận hàng'));
    const isPaid = isCod ? (order.status === 3) : (order.status !== 4);

    return (
        <Layout>
            <div className="home-god-tier order-detail-wrapper bg-white" style={{paddingTop: '60px'}}>
                {/* FILM GRAIN TEXTURE */}
                <div className="god-film-grain" style={{opacity: 0.05}}></div>

                {/* EPIC HERO - Added mt-4 pt-4 to clear the fixed navbar */}
                <div className="epic-page-header py-5 mt-4 bg-white position-relative overflow-hidden border-bottom border-dark border-3 mb-5">
                    <div className="god-watermark-bg text-dark opacity-10" style={{fontSize: '15vw', top: '10%'}}>ORDER #{order.order_code}</div>
                    
                    <div className="container text-center position-relative z-1 py-5">
                        <span className="bg-danger text-white px-4 py-1 font-oswald fw-bold fs-5 text-uppercase animate__animated animate__fadeInDown d-inline-block border border-dark border-2" style={{boxShadow: '4px 4px 0 #000'}}>CHI TIẾT</span>
                        <h1 className="font-oswald fw-bold mt-3 mb-0 text-uppercase animate__animated animate__fadeInUp text-dark" style={{fontSize: '5rem', letterSpacing: '4px', textShadow: '4px 4px 0 #e50914'}}>ĐƠN HÀNG CỦA BẠN</h1>
                    </div>
                </div>

                <div className="container position-relative z-1">
                    <div className="row justify-content-center">
                        <div className="col-lg-10">
                            <div className="mb-5 position-relative z-3 animate__animated animate__fadeInLeft">
                                <Link to="/orders" className="btn-luxury-back bg-white border border-dark border-3" style={{boxShadow: '4px 4px 0 #000', padding: '10px 20px', borderRadius: '0'}}>
                                    <i className="fa-solid fa-arrow-left-long"></i> QUAY LẠI LỊCH SỬ
                                </Link>
                            </div>

                            <div className="order-detail-card bg-white border border-dark border-4 animate__animated animate__fadeInUp" style={{boxShadow: '12px 12px 0 #e50914', borderRadius: '0', padding: '40px', marginTop: '0'}}>
                                
                                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 border-bottom border-dark border-3 pb-4">
                                    <div>
                                        <h2 className="title-luxury text-dark font-oswald fw-bold m-0" style={{fontSize: '32px'}}>MÃ ĐƠN: #{order.order_code}</h2>
                                        <p className="mb-0 font-oswald fw-bold text-muted text-uppercase" style={{fontSize: '16px'}}>Ngày đặt: <span>{formatDate(order.created_at)}</span></p>
                                    </div>
                                    <div className="text-end">
                                        {order.status === 1 && <span className="badge bg-warning text-dark border border-dark border-2 px-4 py-2 font-oswald fw-bold fs-6 text-uppercase" style={{boxShadow: '3px 3px 0 #000', borderRadius: '0'}}>CHỜ DUYỆT</span>}
                                        {order.status === 2 && <span className="badge bg-white text-dark border border-dark border-2 px-4 py-2 font-oswald fw-bold fs-6 text-uppercase" style={{boxShadow: '3px 3px 0 #e50914', borderRadius: '0'}}>ĐANG GIAO</span>}
                                        {order.status === 5 && <span className="badge bg-white text-dark border border-dark border-2 px-4 py-2 font-oswald fw-bold fs-6 text-uppercase" style={{boxShadow: '3px 3px 0 #e50914', borderRadius: '0'}}>CHỜ HOÀN TẤT</span>}
                                        {order.status === 3 && <span className="badge bg-success text-white border border-dark border-2 px-4 py-2 font-oswald fw-bold fs-6 text-uppercase" style={{boxShadow: '3px 3px 0 #000', borderRadius: '0'}}>THÀNH CÔNG</span>}
                                        {order.status === 4 && <span className="badge bg-dark text-white border border-dark border-2 px-4 py-2 font-oswald fw-bold fs-6 text-uppercase" style={{boxShadow: '3px 3px 0 #e50914', borderRadius: '0'}}>ĐÃ HỦY</span>}
                                    </div>
                                </div>

                                {/* Status Timeline */}
                                {order.status !== 4 && (
                                    <div className="timeline-container position-relative my-5 px-3">
                                        <div className="position-absolute top-50 start-0 end-0 bg-dark" style={{height: '4px', zIndex: '1', transform: 'translateY(-50%)'}}></div>
                                        <div className="d-flex justify-content-between position-relative z-2">
                                            <div className="text-center">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 border border-dark border-4 ${order.status >= 1 ? 'bg-dark text-white' : 'bg-white text-dark'}`} style={{width: '44px', height: '44px', boxShadow: '4px 4px 0 #e50914', fontSize: '18px'}}>
                                                    <i className="fa-solid fa-clipboard-check"></i>
                                                </div>
                                                <div className={`font-oswald fw-bold text-uppercase ${order.status >= 1 ? 'text-dark' : 'text-muted'}`} style={{fontSize: '14px', letterSpacing: '1px'}}>Đặt hàng</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 border border-dark border-4 ${order.status >= 2 ? 'bg-dark text-white' : 'bg-white text-dark'}`} style={{width: '44px', height: '44px', boxShadow: order.status >= 2 ? '4px 4px 0 #e50914' : '4px 4px 0 #000', fontSize: '18px'}}>
                                                    <i className="fa-solid fa-truck-fast"></i>
                                                </div>
                                                <div className={`font-oswald fw-bold text-uppercase ${order.status >= 2 ? 'text-dark' : 'text-muted'}`} style={{fontSize: '14px', letterSpacing: '1px'}}>Đang giao</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 border border-dark border-4 ${order.status >= 5 ? 'bg-dark text-white' : 'bg-white text-dark'}`} style={{width: '44px', height: '44px', boxShadow: order.status >= 5 ? '4px 4px 0 #e50914' : '4px 4px 0 #000', fontSize: '18px'}}>
                                                    <i className="fa-solid fa-box-open"></i>
                                                </div>
                                                <div className={`font-oswald fw-bold text-uppercase ${order.status >= 5 ? 'text-dark' : 'text-muted'}`} style={{fontSize: '14px', letterSpacing: '1px'}}>Nhận hàng</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 border border-dark border-4 ${order.status === 3 ? 'bg-dark text-white' : 'bg-white text-dark'}`} style={{width: '44px', height: '44px', boxShadow: order.status === 3 ? '4px 4px 0 #e50914' : '4px 4px 0 #000', fontSize: '18px'}}>
                                                    <i className="fa-solid fa-check-double"></i>
                                                </div>
                                                <div className={`font-oswald fw-bold text-uppercase ${order.status === 3 ? 'text-dark' : 'text-muted'}`} style={{fontSize: '14px', letterSpacing: '1px'}}>Hoàn tất</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="row g-4 mb-5">
                                    <div className="col-md-6">
                                        <div className="info-card bg-white border border-dark border-3 p-4 h-100" style={{boxShadow: '6px 6px 0 #000'}}>
                                            <h6 className="font-oswald fw-bold text-dark text-uppercase fs-5 border-bottom border-dark border-3 pb-2 mb-3"><i className="fa-solid fa-location-dot me-2 text-danger"></i>THÔNG TIN NHẬN HÀNG</h6>
                                            <div className="info-content text-dark fw-bold">
                                                <p className="font-oswald fw-bold text-uppercase fs-5 mb-2 text-dark">{order.receiving_name}</p>
                                                <p className="text-dark"><i className="fa-solid fa-phone me-2 text-danger"></i>{order.phone_number}</p>
                                                <p className="text-dark"><i className="fa-solid fa-map-pin me-2 text-danger"></i>{order.street_detail}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="info-card bg-white border border-dark border-3 p-4 h-100" style={{boxShadow: '6px 6px 0 #000'}}>
                                            <h6 className="font-oswald fw-bold text-dark text-uppercase fs-5 border-bottom border-dark border-3 pb-2 mb-3"><i className="fa-solid fa-credit-card me-2 text-danger"></i>THANH TOÁN</h6>
                                            <div className="info-content text-dark fw-bold">
                                                <p className="font-oswald fw-bold text-uppercase fs-5 mb-2 text-dark">{order.method_name}</p>
                                                <div className="mt-3">
                                                    {isPaid ? (
                                                        <span className="badge bg-success border border-dark border-2 px-3 py-2 font-oswald text-uppercase text-white" style={{boxShadow: '2px 2px 0 #000', borderRadius: '0'}}><i className="fa-solid fa-circle-check me-1"></i> ĐÃ THANH TOÁN</span>
                                                    ) : (
                                                        <span className="badge bg-warning text-dark border border-dark border-2 px-3 py-2 font-oswald text-uppercase" style={{boxShadow: '2px 2px 0 #000', borderRadius: '0'}}><i className="fa-solid fa-clock me-1"></i> CHƯA THANH TOÁN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h6 className="font-oswald fw-bold mb-3 fs-4 text-uppercase text-dark"><i className="fa-solid fa-box me-2 text-danger"></i> SẢN PHẨM ĐƠN HÀNG</h6>
                                <div className="product-list bg-white border border-dark border-3" style={{boxShadow: '6px 6px 0 #000'}}>
                                    {items.map((item, index) => (
                                        <div key={index} className="product-item d-flex align-items-center gap-3 p-3 border-bottom border-dark border-3 bg-white">
                                            <img src={getImageUrl(item.image_url)} className="product-img bg-white border border-dark border-3" style={{width: '80px', height: '80px', objectFit: 'cover', boxShadow: '4px 4px 0 #000'}} alt={item.product_name} />
                                            <div className="product-details flex-grow-1">
                                                <h6 className="font-oswald fw-bold text-dark text-uppercase fs-5 m-0 mb-1">{item.product_name}</h6>
                                                <div className="mb-2">
                                                    <span className="variant-tag bg-white text-dark font-oswald fw-bold text-uppercase border border-dark border-2 px-2 py-1 me-2" style={{boxShadow: '2px 2px 0 #000', fontSize: '12px'}}>Màu: {item.color_name}</span>
                                                    <span className="variant-tag bg-white text-dark font-oswald fw-bold text-uppercase border border-dark border-2 px-2 py-1" style={{boxShadow: '2px 2px 0 #000', fontSize: '12px'}}>Size: {item.size_name}</span>
                                                </div>
                                                <div className="text-muted font-oswald fw-bold">SỐ LƯỢNG: <span className="text-dark fs-5">{item.quantity}</span></div>
                                            </div>
                                            <div className="text-end">
                                                <div className="font-oswald fw-bold text-danger" style={{fontSize: '22px'}}>{formatCurrency(item.price)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="row justify-content-end mt-4">
                                    <div className="col-md-6 col-lg-5">
                                        <div className="price-summary bg-white border border-dark border-3 p-4" style={{boxShadow: '6px 6px 0 #000'}}>
                                            <div className="summary-row d-flex justify-content-between mb-3 font-oswald fw-bold text-dark fs-6 text-uppercase">
                                                <span>TẠM TÍNH:</span>
                                                <span>{formatCurrency(order.total_amount)}</span>
                                            </div>
                                            <div className="summary-row d-flex justify-content-between mb-3 font-oswald fw-bold text-dark fs-6 text-uppercase">
                                                <span>PHÍ GIAO HÀNG:</span>
                                                <span>{formatCurrency(order.shipping_fee)}</span>
                                            </div>
                                            <div className="summary-row total d-flex justify-content-between pt-3 mt-3 border-top border-dark border-3 font-oswald fw-bold text-danger fs-4 text-uppercase">
                                                <span>TỔNG CỘNG:</span>
                                                <span className="total-val" style={{textShadow: '1px 1px 0 #000'}}>{formatCurrency(order.final_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {order.status === 2 && (
                                    <div className="mt-5 text-center">
                                        <button onClick={handleConfirm} className="action-btn-red bg-danger text-white border border-dark border-3 font-oswald fw-bold text-uppercase px-5 py-3" style={{fontSize: '18px', boxShadow: '6px 6px 0 #000'}}>
                                            <i className="fa-solid fa-box-open me-2"></i> TÔI ĐÃ NHẬN ĐƯỢC HÀNG
                                        </button>
                                    </div>
                                )}

                                {order.status === 1 && (
                                    <div className="mt-5 text-center">
                                        <button onClick={handleCancel} className="action-btn-outline bg-white text-dark border border-dark border-3 font-oswald fw-bold text-uppercase px-5 py-3" style={{fontSize: '16px', boxShadow: '6px 6px 0 #000'}}>
                                            <i className="fa-solid fa-xmark me-2 text-danger"></i> HỦY ĐƠN HÀNG
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OrderDetail;
