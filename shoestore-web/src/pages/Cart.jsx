import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Cart.css';
import './Membership.css';

const Cart = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [selectedItemIds, setSelectedItemIds] = useState(() => {
        try {
            const saved = localStorage.getItem('user_selected_cart_items');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cartError, setCartError] = useState('');
    const [cartSuccess, setCartSuccess] = useState('');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://placehold.co/100x100?text=No+Image';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const showError = (msg) => {
        setCartError(msg);
        setTimeout(() => setCartError(''), 4000);
    };

    const showSuccess = (msg) => {
        setCartSuccess(msg);
        setTimeout(() => setCartSuccess(''), 3000);
    };

    // Tự động lưu lựa chọn sản phẩm vào localStorage để giữ nguyên khi chuyển trang
    useEffect(() => {
        localStorage.setItem('user_selected_cart_items', JSON.stringify(selectedItemIds));
    }, [selectedItemIds]);

    const loadCart = async () => {
        try {
            const response = await api.get('/api/cart');
            if (response.data && response.data.success) {
                const items = response.data.cartItems || [];
                setCartItems(items);
                setTotalPrice(response.data.totalPrice || 0);

                // Giữ lại các lựa chọn sản phẩm hợp lệ trong giỏ hàng
                const validIds = items.map(i => i.id);
                setSelectedItemIds(prev => prev.filter(id => validIds.includes(id)));
            } else {
                showError(response.data.message || 'Lỗi tải giỏ hàng!');
            }
        } catch (err) {
            console.error('Lỗi load giỏ hàng:', err);
            if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                showError('Không thể tải giỏ hàng. Vui lòng kiểm tra kết nối backend!');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        loadCart();
    }, []);

    const updateQty = async (itemObj, delta, stock) => {
        if (delta > 0 && itemObj.quantity + delta > stock) {
            showError('Sản phẩm này chỉ còn ' + stock + ' cái trong kho!');
            return;
        }
        if (itemObj.quantity + delta < 1) {
            removeItem(itemObj);
            return;
        }
        try {
            const response = await api.post('/api/cart/update', {
                itemId: itemObj.id,
                cartItemId: itemObj.cartItemId || itemObj.id,
                delta: delta
            });
            if (response.data && response.data.success) {
                loadCart();
            } else {
                showError(response.data.message || 'Lỗi cập nhật số lượng!');
            }
        } catch (err) {
            console.error('Lỗi update qty:', err);
            if (err.response && err.response.data && err.response.data.message) {
                showError(err.response.data.message);
            } else {
                showError('Lỗi kết nối máy chủ!');
            }
        }
    };

    const removeItem = async (itemObj) => {
        try {
            const itemId = typeof itemObj === 'object' ? itemObj.id : itemObj;
            const cartItemId = typeof itemObj === 'object' ? (itemObj.cartItemId || itemObj.id) : itemObj;
            const removeQty = typeof itemObj === 'object' ? itemObj.quantity : 1;

            const response = await api.post('/api/cart/remove', {
                itemId: itemId,
                cartItemId: cartItemId,
                quantity: removeQty
            });
            if (response.data && response.data.success) {
                setSelectedItemIds(prev => prev.filter(id => id !== itemId));
                loadCart();
                showSuccess('Đã xóa sản phẩm khỏi giỏ hàng!');
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xóa sản phẩm khỏi giỏ hàng thành công!' }));
            } else {
                showError(response.data.message || 'Lỗi xóa sản phẩm!');
            }
        } catch (err) {
            console.error('Lỗi xóa sản phẩm:', err);
            showError('Lỗi kết nối máy chủ!');
        }
    };

    // ── Xử lý Tích Chọn Sản Phẩm ──
    const isAllSelected = cartItems.length > 0 && selectedItemIds.length === cartItems.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItemIds([]);
        } else {
            setSelectedItemIds(cartItems.map(i => i.id));
        }
    };

    const toggleSelectItem = (id) => {
        if (selectedItemIds.includes(id)) {
            setSelectedItemIds(selectedItemIds.filter(i => i !== id));
        } else {
            setSelectedItemIds([...selectedItemIds, id]);
        }
    };

    // Tính toán theo danh sách sản phẩm ĐƯỢC TÍCH CHỌN
    const selectedItems = cartItems.filter(item => selectedItemIds.includes(item.id));
    const selectedTotalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalTotal = selectedTotalPrice;

    const handleProceedToCheckout = () => {
        if (selectedItemIds.length === 0) {
            showError('Vui lòng tích chọn ít nhất 1 sản phẩm để thanh toán!');
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng tích chọn ít nhất 1 sản phẩm để thanh toán!' }));
            return;
        }
        sessionStorage.setItem('selectedCartItemIds', JSON.stringify(selectedItemIds));
        navigate('/checkout', { state: { selectedItemIds } });
    };

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
            <div className="shop-epic-theme position-relative" style={{minHeight: '80vh', paddingBottom: '60px'}}>
                <div className="epic-member-header py-4">
                    <div className="container text-center">
                        <span className="epic-tag animate__animated animate__fadeInDown d-inline-block">GIỎ HÀNG</span>
                        <h1 className="epic-header-title mt-2 animate__animated animate__fadeInUp" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>GIỎ HÀNG CỦA BẠN</h1>
                        <p className="font-oswald text-light mx-auto mt-2 letter-spacing-1 fw-bold text-uppercase fs-6" style={{ maxWidth: '600px', opacity: 0.8 }}>
                            Kiểm tra lại các sản phẩm đã chọn và tiến hành thanh toán một cách nhanh chóng.
                        </p>
                    </div>
                </div>
                
                <div className="container cart-container py-4 position-relative z-1">
                    {cartItems.length > 0 && (
                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 animate__animated animate__fadeIn bg-white p-3 rounded-3 border border-light-subtle shadow-sm">
                            <div className="d-flex align-items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    className="form-check-input custom-checkbox-red cursor-pointer" 
                                    id="selectAllCart"
                                    checked={isAllSelected} 
                                    onChange={toggleSelectAll} 
                                    style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                />
                                <label className="form-check-label font-oswald text-uppercase fw-bold text-dark cursor-pointer m-0" htmlFor="selectAllCart" style={{ fontSize: '16px', letterSpacing: '0.5px' }}>
                                    CHỌN TẤT CẢ ({cartItems.length} SẢN PHẨM)
                                </label>
                            </div>
                            <span className="font-oswald text-uppercase fw-bold text-danger" style={{ fontSize: '15px', letterSpacing: '1px' }}>
                                ĐÃ CHỌN: {selectedItemIds.length}/{cartItems.length}
                            </span>
                        </div>
                    )}

                    {cartItems.length === 0 ? (
                        <div className="text-center py-5 px-4 bg-white rounded-4 border border-light-subtle mx-auto my-3 animate__animated animate__fadeInUp" style={{ maxWidth: '650px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                            <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '84px', height: '84px', borderRadius: '50%', background: '#fff5f5', border: '2px solid #ffe3e3' }}>
                                <i className="bi bi-cart-x text-danger" style={{ fontSize: '38px' }}></i>
                            </div>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark mb-2" style={{ letterSpacing: '1px' }}>GIỎ HÀNG TRỐNG</h3>
                            <p className="text-muted font-oswald letter-spacing-1 fs-6 mb-4">Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
                            <Link 
                                to="/shop" 
                                className="btn px-4 py-3 font-oswald text-uppercase fw-bold text-white d-inline-flex align-items-center gap-2 rounded-3 shadow-md"
                                style={{
                                    background: 'linear-gradient(135deg, #e50914 0%, #b91c1c 100%)',
                                    fontSize: '15px',
                                    letterSpacing: '1px',
                                    boxShadow: '0 8px 20px rgba(229, 9, 20, 0.35)',
                                    border: 'none',
                                    transition: 'all 0.2s ease-in-out'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(229, 9, 20, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(229, 9, 20, 0.35)';
                                }}
                            >
                                <i className="bi bi-bag-check me-1 fs-5"></i>
                                <span>TIẾP TỤC MUA SẮM</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="row g-5">
                            <div className="col-lg-8 animate__animated animate__fadeInUp">
                                {cartError && (
                                    <div className="mb-4 bg-danger-subtle text-danger p-3 rounded-3 border border-danger-subtle d-flex align-items-center font-oswald fw-bold" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>
                                        <i className="fa-solid fa-triangle-exclamation me-2 fs-5"></i> {cartError}
                                    </div>
                                )}
                                {cartSuccess && (
                                    <div className="mb-4 bg-success-subtle text-success p-3 rounded-3 border border-success-subtle d-flex align-items-center font-oswald fw-bold" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>
                                        <i className="fa-solid fa-circle-check me-2 fs-5"></i> {cartSuccess}
                                    </div>
                                )}

                                <div className="cart-items-list">
                                    {cartItems.map((item, idx) => {
                                        const isSelected = selectedItemIds.includes(item.id);
                                        return (
                                            <div key={item.id} className="cart-item-flat animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                {/* Checkbox cho sản phẩm */}
                                                <div className="d-flex align-items-center me-3 ps-2">
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-check-input custom-checkbox-red cursor-pointer" 
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                        style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                                    />
                                                </div>

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
                                                        <button className="qty-btn-flat" onClick={() => updateQty(item, -1, item.stock)}>-</button>
                                                        <input type="text" className="qty-input-flat text-center bg-transparent border-0 font-oswald fw-bold fs-5" value={item.quantity} readOnly />
                                                        <button className="qty-btn-flat" onClick={() => updateQty(item, 1, item.stock)}>+</button>
                                                    </div>

                                                    <div className="item-price d-none d-md-block font-oswald text-danger fs-4 fw-bold" style={{ minWidth: '130px', textAlign: 'right' }}>
                                                        {formatCurrency(item.price * item.quantity)}
                                                    </div>

                                                    <button className="btn-remove-flat" title="Xóa khỏi giỏ hàng" onClick={() => removeItem(item)}>
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4">
                                    <Link to="/shop" className="btn btn-outline-danger font-oswald fw-bold text-uppercase letter-spacing-1 px-4 py-2 rounded-3 border-2">
                                        <i className="bi bi-arrow-left me-2"></i> TIẾP TỤC MUA SẮM
                                    </Link>
                                </div>
                            </div>

                        <div className="col-lg-4 animate__animated animate__fadeInRight animate__delay-1s">
                            <div className="cart-summary-flat p-4 sticky-top" style={{ top: '20px' }}>
                                <h4 className="font-oswald fw-bold text-uppercase text-dark mb-4 pb-3 border-bottom border-light-subtle">TÓM TẮT ĐƠN HÀNG</h4>

                                <div className="summary-row font-oswald text-uppercase mb-3 d-flex justify-content-between text-muted fs-6">
                                    <span>Tạm tính ({selectedItems.length} SP)</span>
                                    <span className="text-dark fw-bold">{formatCurrency(selectedTotalPrice)}</span>
                                </div>

                                <div className="summary-total border-top border-light-subtle pt-3 mt-4 d-flex justify-content-between align-items-center">
                                    <span className="font-oswald fw-bold text-uppercase fs-5 text-dark">TỔNG CỘNG</span>
                                    <span className="font-oswald fw-bold fs-2" style={{ color: '#e50914' }}>{formatCurrency(finalTotal)}</span>
                                </div>

                                <button 
                                    className="checkout-btn-flat w-100 mt-4 d-flex justify-content-center align-items-center gap-2" 
                                    onClick={handleProceedToCheckout} 
                                    disabled={selectedItemIds.length === 0}
                                    style={{
                                        opacity: selectedItemIds.length === 0 ? 0.6 : 1,
                                        cursor: selectedItemIds.length === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <span>THANH TOÁN NGAY ({selectedItems.length})</span>
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
                )}
            </div>
        </div>
    </Layout>
    );
};

export default Cart;
