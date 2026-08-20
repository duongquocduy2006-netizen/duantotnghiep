import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Shop.css'; // Sử dụng chung style card của Shop
import './Membership.css'; // Cho phần banner đỏ
import QuickCartModal from '../components/QuickCartModal';

const Favourites = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [quickAddProductId, setQuickAddProductId] = useState(null);

    const fetchFavourites = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/favourites');
            if (response.data && response.data.success) {
                setLoggedIn(true);
                setProducts(response.data.products || []);
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách yêu thích:", err);
            setLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchFavourites();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleRemove = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await api.post('/api/favourites/toggle', { productId: id });
            if (response.data && response.data.success) {
                setProducts(products.filter(p => p.id !== id));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xóa sản phẩm khỏi danh sách yêu thích!' }));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Có lỗi xảy ra khi xóa sản phẩm yêu thích.' }));
            }
        } catch (err) {
            console.error("Lỗi xóa sản phẩm yêu thích:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi kết nối khi xóa sản phẩm yêu thích.' }));
        }
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <Layout>
                <div className="shop-epic-theme position-relative" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                        <p className="mt-3 font-oswald fw-bold text-uppercase letter-spacing-1 text-white">ĐANG TẢI DỮ LIỆU...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn) {
        return (
            <Layout>
                <div className="shop-epic-theme position-relative" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div className="container py-5" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center py-5 px-4 bg-white border border-light-subtle rounded-3" style={{maxWidth: '600px', width: '100%'}}>
                            <i className="fa-solid fa-user-lock fa-4x text-muted mb-4 opacity-50"></i>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark" style={{fontSize: '32px'}}>CHƯA ĐĂNG NHẬP</h3>
                            <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 my-4">Đăng nhập để lưu lại danh sách những sản phẩm bạn yêu thích và trải nghiệm mua sắm tốt hơn.</p>
                            <Link to="/login" className="btn btn-dark font-oswald text-uppercase px-4 py-2 rounded-0 fw-bold">
                                ĐĂNG NHẬP NGAY
                            </Link>
                        </div>
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
                        <span className="epic-tag animate__animated animate__fadeInDown d-inline-block">YÊU THÍCH</span>
                        <h1 className="epic-header-title mt-3 animate__animated animate__fadeInUp">SẢN PHẨM YÊU THÍCH</h1>
                        <p className="font-oswald text-light mx-auto mt-4 letter-spacing-1 fw-bold text-uppercase fs-5" style={{ maxWidth: '600px', opacity: 0.8 }}>
                            Danh sách những thiết kế bạn đã chọn lọc. Đừng bỏ lỡ cơ hội sở hữu chúng trước khi hết hàng.
                        </p>
                    </div>
                </div>

                <div className="container py-5 position-relative z-1">
                    {products.length > 0 ? (
                        <div className="row g-4">
                            {products.map((p, index) => (
                                <div key={p.id} className="col-lg-3 col-md-4 col-6 animate__animated animate__fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div className="flat-product-card h-100 bg-white d-flex flex-column position-relative">
                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }} />
                                        
                                        {/* Image */}
                                        <div className="flat-card-img-box position-relative overflow-hidden d-flex align-items-center justify-content-center"
                                             style={{ aspectRatio: '1', padding: 16, background: '#f8f8f8' }}>
                                            <img src={getImageUrl(p.image_url)} alt={p.product_name} className="product-card-img w-100 h-100" style={{ objectFit: 'contain' }} />
                                            <div className="position-absolute" style={{ top: 10, right: 10, zIndex: 10 }}>
                                                <button className="wishlist-btn btn" onClick={(e) => handleRemove(e, p.id)} title="Xóa khỏi yêu thích">
                                                    <i className="fa-solid text-danger fa-heart" style={{ fontSize: 16 }} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flat-card-info p-3 d-flex flex-column flex-grow-1" style={{ background: '#fff' }}>
                                            <div className="flat-brand mb-1 text-danger fw-bold font-oswald text-uppercase">{p.brand_name}</div>
                                            <h5 className="flat-name text-dark mb-2" style={{ fontSize: 15, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.product_name}
                                            </h5>
                                            <div className="mb-3">
                                                <span className="price-new text-dark fw-bold" style={{ fontSize: 19 }}>
                                                    {p.min_price != null ? formatCurrency(p.min_price) : 'Liên hệ'}
                                                </span>
                                            </div>
                                            <div className="d-flex gap-2 mt-auto" style={{ position: 'relative', zIndex: 10 }}>
                                                <button onClick={(e) => { e.preventDefault(); setQuickAddProductId(p.id); }}
                                                        className="btn flat-btn-cart d-flex align-items-center justify-content-center"
                                                        style={{ width: 46, height: 44, flexShrink: 0 }}>
                                                    <i className="fa-solid fa-cart-plus" style={{ fontSize: 16 }} />
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.id}`); }}
                                                        className="btn flat-btn-buy flex-grow-1"
                                                        style={{ height: 44, fontSize: 14, letterSpacing: 1 }}>
                                                    MUA NGAY
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5 border border-light-subtle rounded-3 bg-white" style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <i className="fa-solid fa-heart-crack fa-4x text-muted mb-3 opacity-50"></i>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark">DANH SÁCH TRỐNG</h3>
                            <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 my-3">Bạn chưa lưu sản phẩm nào vào danh sách yêu thích.</p>
                            <Link to="/shop" className="btn btn-dark font-oswald text-uppercase px-4 py-2 rounded-0 fw-bold">
                                TIẾP TỤC MUA SẮM
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            {quickAddProductId && (
                <QuickCartModal productId={quickAddProductId} isOpen={true} onClose={() => setQuickAddProductId(null)} />
            )}
        </Layout>
    );
};

export default Favourites;
