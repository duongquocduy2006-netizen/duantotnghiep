import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Cart.css';

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
                <div className="container py-5 text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                    <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted font-oswald letter-spacing-1">ĐANG TẢI GIỎ HÀNG...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="cart-page-wrapper position-relative">
                <div className="god-watermark-bg" style={{ fontSize: '15vw', top: '10%' }}>CART</div>
                
                <div className="container cart-container py-5 position-relative z-1">
                    <div className="d-flex justify-content-between align-items-end mb-5 reveal-item opacity-0 flex-wrap gap-3">
                        <div>
                            <h2 className="god-section-title text-uppercase m-0">GIỎ HÀNG CỦA BẠN</h2>
                            <div className="god-section-line" style={{ background: '#e50914' }}></div>
                        </div>
                        <span className="font-oswald text-uppercase" style={{ fontSize: '16px', color: '#555', letterSpacing: '1px' }}>
                            ({cartItems.length} SẢN PHẨM)
                        </span>
                    </div>

                    <div className="row g-5">
                        <div className="col-lg-8 animate__animated animate__fadeInUp">

                            {cartItems.length > 0 && (
                                <div className="mb-5 shipping-banner border border-dark border-4 p-3 bg-white" style={{ boxShadow: '6px 6px 0 #000' }}>
                                    {totalPrice < 500000 ? (
                                        <div className="free-ship-text font-oswald letter-spacing-1 text-dark">
                                            <i className="fa fa-truck-fast me-2 text-danger"></i> MUA THÊM <b className="text-danger">{formatCurrency(500000 - totalPrice)}</b> ĐỂ ĐƯỢC FREESHIP
                                        </div>
                                    ) : (
                                        <div className="free-ship-text font-oswald letter-spacing-1 text-dark">
                                            <i className="fa fa-truck-fast me-2 text-success"></i> BẠN ĐÃ ĐỦ ĐIỀU KIỆN <b className="text-success">MIỄN PHÍ VẬN CHUYỂN!</b>
                                        </div>
                                    )}
                                    <div className="free-ship-bar mt-2 border border-dark border-2" style={{ background: '#eee', height: '10px' }}>
                                        <div className="free-ship-progress" style={{ width: `${progressWidth}%`, background: '#e50914', height: '100%', transition: 'width 0.5s ease' }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="cart-items-list">
                                {cartItems.map((item, idx) => (
                                    <div key={item.id} className="god-cart-item reveal-item opacity-0" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className="item-img-wrapper">
                                            <img src={getImageUrl(item.image_url)} alt={item.product_name} className="item-img god-grayscale-hover" />
                                        </div>

                                        <div className="item-details flex-grow-1 px-4">
                                            <div className="item-name font-oswald text-uppercase fs-4 fw-bold mb-2">
                                                <Link to={`/details?id=${item.product_id}`} className="text-dark text-decoration-none god-hover-red">{item.product_name}</Link>
                                            </div>
                                            <div className="item-meta text-uppercase text-secondary font-oswald letter-spacing-1 fw-bold" style={{ fontSize: '14px' }}>
                                                SIZE: <span className="text-dark">{item.size_name}</span> &nbsp;|&nbsp; COLOR: <span className="text-dark">{item.color_name}</span>
                                            </div>
                                            
                                            {/* Mobile price visible only on small screens */}
                                            <div className="item-price-mobile d-md-none mt-2 font-oswald text-danger fs-5 fw-bold">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>

                                        <div className="item-actions d-flex align-items-center gap-4">
                                            <div className="qty-control-god d-flex align-items-center">
                                                <button className="qty-btn-god" onClick={() => updateQty(item.id, item.quantity - 1, item.stock)}>-</button>
                                                <input type="text" className="qty-input-god text-center bg-transparent border-0 font-oswald fw-bold fs-5" value={item.quantity} readOnly style={{ width: '40px' }} />
                                                <button className="qty-btn-god" onClick={() => updateQty(item.id, item.quantity + 1, item.stock)}>+</button>
                                            </div>

                                            <div className="item-price d-none d-md-block font-oswald text-danger fs-4 fw-bold" style={{ minWidth: '130px', textAlign: 'right' }}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>

                                            <button className="btn-remove-god" title="Xóa" onClick={() => removeItem(item.id)}>
                                                <i className="fa-solid fa-xmark fs-3"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {cartItems.length === 0 && (
                                <div className="text-center py-5 border border-dark border-4 bg-white" style={{ boxShadow: '10px 10px 0 #000' }}>
                                    <h1 className="font-oswald text-muted opacity-25" style={{ fontSize: '80px' }}>EMPTY</h1>
                                    <p className="fw-bold font-oswald letter-spacing-1 text-uppercase mt-3 text-dark fs-4">Giỏ hàng của bạn đang trống.</p>
                                    <Link to="/shop" className="btn-god-tier mt-4 d-inline-block"><span>TIẾP TỤC MUA SẮM</span></Link>
                                </div>
                            )}

                            {cartItems.length > 0 && (
                                <Link to="/shop" className="text-decoration-none mt-4 d-inline-block font-oswald fw-bold text-uppercase text-dark god-hover-red letter-spacing-1 border border-dark border-3 bg-white px-4 py-2" style={{boxShadow: '4px 4px 0 #000'}}>
                                    <i className="fa fa-arrow-left me-2"></i> TIẾP TỤC MUA SẮM
                                </Link>
                            )}
                        </div>

                        <div className="col-lg-4 animate__animated animate__fadeInRight animate__delay-1s">
                            <div className="god-summary-card p-4 sticky-top">
                                <h3 className="font-oswald fw-bold text-uppercase text-dark mb-4 pb-3 border-bottom border-dark border-3">TÓM TẮT ĐƠN HÀNG</h3>

                                <div className="summary-row font-oswald fw-bold text-uppercase mb-3 d-flex justify-content-between text-muted fs-5">
                                    <span>Tạm tính</span>
                                    <span className="text-dark">{formatCurrency(totalPrice)}</span>
                                </div>
                                <div className="summary-row font-oswald fw-bold text-uppercase mb-3 d-flex justify-content-between text-muted fs-5">
                                    <span>Giảm giá</span>
                                    <span className="text-success">-0₫</span>
                                </div>
                                <div className="summary-row font-oswald fw-bold text-uppercase mb-4 d-flex justify-content-between text-muted fs-5">
                                    <span>Phí vận chuyển</span>
                                    <span className="text-dark">{totalPrice >= 500000 || cartItems.length === 0 ? '0₫' : '30.000₫'}</span>
                                </div>

                                <div className="promo-input-group d-flex gap-2 mb-4">
                                    <input type="text" className="form-control font-oswald fw-bold letter-spacing-1 rounded-0" placeholder="MÃ GIẢM GIÁ" />
                                    <button className="god-btn">ÁP DỤNG</button>
                                </div>

                                <div className="summary-total border-top border-dark border-3 pt-3 mt-4 d-flex justify-content-between align-items-center">
                                    <span className="font-oswald fw-bold text-uppercase fs-4 text-dark">TỔNG CỘNG</span>
                                    <span className="font-oswald fw-bold fs-2" style={{ color: '#e50914' }}>{formatCurrency(finalTotal)}</span>
                                </div>

                                <button 
                                    className="god-checkout-btn w-100 mt-4 d-flex justify-content-between align-items-center" 
                                    onClick={() => navigate('/checkout')} 
                                    disabled={cartItems.length === 0}
                                >
                                    <span>THANH TOÁN NGAY</span>
                                    <i className="fa-solid fa-arrow-right"></i>
                                </button>

                                <div className="mt-4 text-center border-top border-dark border-2 pt-3">
                                    <p className="font-oswald text-dark fw-bold text-uppercase mb-2" style={{ fontSize: '14px', letterSpacing: '1px' }}>CHẤP NHẬN THANH TOÁN</p>
                                    <div className="d-flex justify-content-center gap-3 fs-3 text-dark">
                                        <i className="fa-brands fa-cc-visa god-hover-red transition-300"></i>
                                        <i className="fa-brands fa-cc-mastercard god-hover-red transition-300"></i>
                                        <i className="fa-brands fa-cc-paypal god-hover-red transition-300"></i>
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
