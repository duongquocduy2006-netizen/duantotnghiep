import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Cart.css';
import './Membership.css';

const Cart = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://placehold.co/100x100?text=No+Image';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const loadCart = async () => {
        try {
            const response = await api.get('/api/cart');
            if (response.data && response.data.success) {
                setCartItems(response.data.cartItems || []);
                setTotalPrice(response.data.totalPrice || 0);
            } else {
                alert(response.data.message || 'Lỗi tải giỏ hàng!');
            }
        } catch (err) {
            console.error('Lỗi load giỏ hàng:', err);
            if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                alert('Không thể tải giỏ hàng. Vui lòng kiểm tra kết nối backend!');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        loadCart();
    }, []);

    const updateQty = async (itemId, newQty, stock) => {
        if (newQty > stock) {
            alert('Sản phẩm này chỉ còn ' + stock + ' cái trong kho!');
            return;
        }
        if (newQty < 1) {
            removeItem(itemId);
            return;
        }
        try {
            const response = await api.post('/api/cart/update', {
                itemId: itemId,
                quantity: newQty
            });
            if (response.data && response.data.success) {
                loadCart();
            } else {
                alert(response.data.message || 'Lỗi cập nhật số lượng!');
            }
        } catch (err) {
            console.error('Lỗi update qty:', err);
            alert('Lỗi kết nối máy chủ!');
        }
    };

    const removeItem = async (itemId) => {
        if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) return;
        
        try {
            const response = await api.post('/api/cart/remove', {
                itemId: itemId
            });
            if (response.data && response.data.success) {
                loadCart();
            } else {
                alert(response.data.message || 'Lỗi xóa sản phẩm!');
            }
        } catch (err) {
            console.error('Lỗi xóa sản phẩm:', err);
            alert('Lỗi kết nối máy chủ!');
        }
    };

    const shippingFee = totalPrice >= 500000 ? 0 : (cartItems.length > 0 ? 30000 : 0);
    const finalTotal = cartItems.length > 0 ? (totalPrice + shippingFee) : 0;
    const progressWidth = totalPrice > 500000 ? 100 : (totalPrice * 100 / 500000);

    if (loading) {
        return (
            <Layout>
                <div className="shop-epic-theme position-relative" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                        <p className="mt-3 font-oswald fw-bold text-uppercase letter-spacing-1 text-white">ĐANG TẢI GIỎ HÀNG...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="shop-epic-theme position-relative" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                <div className="epic-member-header">
                    <div className="container text-center">
                        <span className="epic-tag animate__animated animate__fadeInDown d-inline-block">GIỎ HÀNG</span>
                        <h1 className="epic-header-title mt-3 animate__animated animate__fadeInUp">GIỎ HÀNG CỦA BẠN</h1>
                        <p className="font-oswald text-light mx-auto mt-4 letter-spacing-1 fw-bold text-uppercase fs-5" style={{ maxWidth: '600px', opacity: 0.8 }}>
                            Kiểm tra lại các sản phẩm đã chọn và tiến hành thanh toán một cách nhanh chóng.
                        </p>
                    </div>
                </div>
                
                <div className="container cart-container py-5 position-relative z-1">
                    <div className="d-flex justify-content-between align-items-end mb-4 reveal-item opacity-0 flex-wrap gap-3">
                        <div>
                            <h3 className="font-oswald text-uppercase m-0 fw-bold">CHI TIẾT GIỎ HÀNG</h3>
                        </div>
                        <span className="font-oswald text-uppercase" style={{ fontSize: '16px', color: '#555', letterSpacing: '1px' }}>
                            ({cartItems.length} SẢN PHẨM)
                        </span>
                    </div>

                    <div className="row g-5">
                        <div className="col-lg-8 animate__animated animate__fadeInUp">

                            {cartItems.length > 0 && (
                                <div className="mb-4 bg-white p-3 rounded-3 border border-light-subtle d-flex flex-column" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                    {totalPrice < 500000 ? (
                                        <div className="free-ship-text font-oswald letter-spacing-1 text-dark mb-2">
                                            <i className="fa fa-truck-fast me-2 text-danger"></i> MUA THÊM <b className="text-danger">{formatCurrency(500000 - totalPrice)}</b> ĐỂ ĐƯỢC FREESHIP
                                        </div>
                                    ) : (
                                        <div className="free-ship-text font-oswald letter-spacing-1 text-dark mb-2">
                                            <i className="fa fa-truck-fast me-2 text-success"></i> BẠN ĐÃ ĐỦ ĐIỀU KIỆN <b className="text-success">MIỄN PHÍ VẬN CHUYỂN!</b>
                                        </div>
                                    )}
                                    <div className="progress rounded-pill" style={{ height: '8px', backgroundColor: '#f0f0f0' }}>
                                        <div className="progress-bar bg-danger rounded-pill" role="progressbar" style={{ width: `${progressWidth}%`, transition: 'width 0.5s ease' }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="cart-items-list">
                                {cartItems.map((item, idx) => (
                                    <div key={item.id} className="cart-item-flat reveal-item opacity-0" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className="item-img-wrapper">
                                            <img src={getImageUrl(item.image_url)} alt={item.product_name} className="item-img" />
                                        </div>

                                        <div className="item-details flex-grow-1 px-4">
                                            <div className="item-name font-oswald text-uppercase fs-5 fw-bold mb-1">
                                                <Link to={`/details?id=${item.product_id}`} className="text-dark text-decoration-none item-hover-red">{item.product_name}</Link>
                                            </div>
                                            <div className="item-meta text-uppercase text-secondary font-oswald letter-spacing-1" style={{ fontSize: '14px' }}>
                                                SIZE: <span className="text-dark fw-bold">{item.size_name}</span> &nbsp;|&nbsp; COLOR: <span className="text-dark fw-bold">{item.color_name}</span>
                                            </div>
                                            
                                            {/* Mobile price visible only on small screens */}
                                            <div className="item-price-mobile d-md-none mt-2 font-oswald text-danger fs-5 fw-bold">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>

                                        <div className="item-actions d-flex align-items-center gap-4">
                                            <div className="qty-control-flat d-flex align-items-center">
                                                <button className="qty-btn-flat" onClick={() => updateQty(item.id, item.quantity - 1, item.stock)}>-</button>
                                                <input type="text" className="qty-input-flat text-center bg-transparent border-0 font-oswald fw-bold fs-5" value={item.quantity} readOnly />
                                                <button className="qty-btn-flat" onClick={() => updateQty(item.id, item.quantity + 1, item.stock)}>+</button>
                                            </div>

                                            <div className="item-price d-none d-md-block font-oswald text-danger fs-4 fw-bold" style={{ minWidth: '130px', textAlign: 'right' }}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>

                                            <button className="btn-remove-flat" title="Xóa khỏi giỏ hàng" onClick={() => removeItem(item.id)}>
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {cartItems.length === 0 && (
                                <div className="text-center py-5 bg-white rounded-3 border border-light-subtle" style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                                    <i className="fa-solid fa-cart-arrow-down fa-4x text-muted mb-4 opacity-50"></i>
                                    <h3 className="font-oswald fw-bold text-uppercase text-dark mb-3">GIỎ HÀNG TRỐNG</h3>
                                    <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 mb-4">Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
                                    <Link to="/shop" className="btn btn-dark font-oswald text-uppercase px-4 py-2 rounded-0 fw-bold border-2">
                                        TIẾP TỤC MUA SẮM
                                    </Link>
                                </div>
                            )}

                            {cartItems.length > 0 && (
                                <div className="mt-4">
                                    <Link to="/shop" className="btn btn-outline-dark font-oswald fw-bold text-uppercase letter-spacing-1 px-4 py-2 rounded-3 border-2">
                                        <i className="fa fa-arrow-left me-2"></i> TIẾP TỤC MUA SẮM
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="col-lg-4 animate__animated animate__fadeInRight animate__delay-1s">
                            <div className="cart-summary-flat p-4 sticky-top" style={{ top: '20px' }}>
                                <h4 className="font-oswald fw-bold text-uppercase text-dark mb-4 pb-3 border-bottom border-light-subtle">TÓM TẮT ĐƠN HÀNG</h4>

                                <div className="summary-row font-oswald text-uppercase mb-3 d-flex justify-content-between text-muted fs-6">
                                    <span>Tạm tính</span>
                                    <span className="text-dark fw-bold">{formatCurrency(totalPrice)}</span>
                                </div>
                                <div className="summary-row font-oswald text-uppercase mb-3 d-flex justify-content-between text-muted fs-6">
                                    <span>Giảm giá</span>
                                    <span className="text-success fw-bold">-0₫</span>
                                </div>
                                <div className="summary-row font-oswald text-uppercase mb-4 d-flex justify-content-between text-muted fs-6">
                                    <span>Phí vận chuyển</span>
                                    <span className="text-dark fw-bold">{totalPrice >= 500000 || cartItems.length === 0 ? '0₫' : '30.000₫'}</span>
                                </div>

                                <div className="promo-input-group d-flex gap-2 mb-4">
                                    <input type="text" className="form-control font-oswald letter-spacing-1 rounded-2" placeholder="MÃ GIẢM GIÁ" />
                                    <button className="promo-btn-flat">ÁP DỤNG</button>
                                </div>

                                <div className="summary-total border-top border-light-subtle pt-3 mt-4 d-flex justify-content-between align-items-center">
                                    <span className="font-oswald fw-bold text-uppercase fs-5 text-dark">TỔNG CỘNG</span>
                                    <span className="font-oswald fw-bold fs-2" style={{ color: '#e50914' }}>{formatCurrency(finalTotal)}</span>
                                </div>

                                <button 
                                    className="checkout-btn-flat w-100 mt-4 d-flex justify-content-center align-items-center gap-2" 
                                    onClick={() => navigate('/checkout')} 
                                    disabled={cartItems.length === 0}
                                >
                                    <span>THANH TOÁN NGAY</span>
                                    <i className="fa-solid fa-arrow-right fs-6"></i>
                                </button>

                                <div className="mt-4 text-center border-top border-light-subtle pt-3">
                                    <p className="font-oswald text-muted fw-bold text-uppercase mb-2" style={{ fontSize: '13px', letterSpacing: '1px' }}>CHẤP NHẬN THANH TOÁN</p>
                                    <div className="d-flex justify-content-center gap-3 fs-3 text-secondary opacity-75">
                                        <i className="fa-brands fa-cc-visa item-hover-red"></i>
                                        <i className="fa-brands fa-cc-mastercard item-hover-red"></i>
                                        <i className="fa-brands fa-cc-paypal item-hover-red"></i>
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

export default Cart;
