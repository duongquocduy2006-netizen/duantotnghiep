import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './NewArrivals.css';

const NewArrivals = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [newProducts, setNewProducts] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [activeBrand, setActiveBrand] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const observerRef = useRef(null);

    const fetchNewArrivals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/products/search?sort=newest');
            if (response.data && response.data.success) {
                const productsWithIndex = (response.data.products || []).slice(0, 12).map((p, idx) => ({
                    ...p,
                    _originalIndex: idx
                }));
                setNewProducts(productsWithIndex);
            }
        } catch (error) {
            console.error("Lỗi lấy dữ liệu hàng mới:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWishlistIds = async () => {
        try {
            const res = await api.get('/api/favourites/ids');
            if (res.data && res.data.success) {
                setWishlistIds(res.data.ids || []);
            }
        } catch (e) {
            console.error("Lỗi tải danh sách yêu thích:", e);
        }
    };


    const toggleWishlist = async (e, productId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await api.post('/api/favourites/toggle', { productId });
            if (res.data && res.data.success) {
                if (res.data.action === 'added') {
                    setWishlistIds([...wishlistIds, productId]);
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã thêm sản phẩm vào danh sách yêu thích!' }));
                } else {
                    setWishlistIds(wishlistIds.filter(id => id !== productId));
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xóa sản phẩm khỏi danh sách yêu thích!' }));
                }
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || "Vui lòng đăng nhập!" }));
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                sessionStorage.setItem('toast_message', 'Vui lòng đăng nhập để sử dụng tính năng này!');
                navigate('/login');
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Đã xảy ra lỗi khi xử lý yêu thích." }));
            }
        }
    };

    useEffect(() => {
        fetchNewArrivals();
        fetchWishlistIds();
    }, []);

    useEffect(() => {
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate__animated', 'animate__fadeInUp', 'opacity-100');
                    observerRef.current.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        setTimeout(() => {
            document.querySelectorAll('.reveal-item').forEach((el) => {
                observerRef.current.observe(el);
            });
        }, 100);

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [loading, newProducts, activeBrand, sortBy]);

    const formatCurrency = (amount) => {
        const num = Number(amount) || 0;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    };

    const getImageUrl = (url) => {
        if (!url || typeof url !== 'string') return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    // Extract unique brands dynamically with safety check
    const brands = ['All', ...new Set(newProducts.filter(p => p && p.brand_name).map(p => p.brand_name))];

    // Filter first with safety check
    let filteredAll = activeBrand === 'All'
        ? newProducts
        : newProducts.filter(p => p && p.brand_name === activeBrand);

    // Sort next with safety check
    filteredAll = [...filteredAll].sort((a, b) => {
        const indexA = a && typeof a._originalIndex === 'number' ? a._originalIndex : 0;
        const indexB = b && typeof b._originalIndex === 'number' ? b._originalIndex : 0;
        if (sortBy === 'priceAsc') {
            const priceA = a ? (a.min_price || 0) : 0;
            const priceB = b ? (b.min_price || 0) : 0;
            return priceA - priceB;
        }
        if (sortBy === 'priceDesc') {
            const priceA = a ? (a.min_price || 0) : 0;
            const priceB = b ? (b.min_price || 0) : 0;
            return priceB - priceA;
        }
        return indexA - indexB;
    });

    // Extract spotlight and grid from sorted & filtered list
    const spotlightProduct = filteredAll[0];
    const filteredProducts = filteredAll.slice(1);

    const getRating = (id) => {
        if (!id) return '4.5';
        const numId = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const val = 4.3 + ((numId * 3) % 8) / 10;
        return val.toFixed(1);
    };

    const getSizesText = (id) => {
        if (!id) return 'Size: 36 - 44';
        const numId = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (numId % 2 === 0) ? "Size: 38 - 45" : "Size: 36 - 43";
    };

    return (
        <Layout>
            <div className="na-page">
                {/* FRESH HOLOGRAPHIC HEADER */}
                <div className="na-fresh-header">
                    <div className="na-animated-bg"></div>
                    <div className="na-glass-container container text-center position-relative z-1">
                        <span className="na-glass-tag animate__animated animate__fadeInDown">VỪA RA MẮT</span>
                        <h1 className="na-fresh-title mt-3 animate__animated animate__fadeInUp">HÀNG MỚI <span>VỀ</span></h1>
                    </div>
                </div>

                <div className="container py-5">
                    {loading ? (
                        <div className="na-loader">
                            <div className="na-spinner"></div>
                        </div>
                    ) : newProducts.length > 0 ? (
                        <>
                            {/* SPOTLIGHT FEATURE */}
                            {spotlightProduct && (
                                <div className="na-spotlight reveal-item opacity-0 mb-5">
                                    <div className="row align-items-center g-5">
                                        <div className="col-lg-6 order-2 order-lg-1">
                                            <div className="na-spotlight-content">
                                                <span className="na-spotlight-badge">SẢN PHẨM NỔI BẬT</span>
                                                <div className="na-spotlight-brand">{spotlightProduct.brand_name}</div>
                                                <h2 className="na-spotlight-title">{spotlightProduct.product_name}</h2>
                                                
                                                <div className="na-spotlight-rating mb-3">
                                                    <div className="stars d-inline-flex text-warning me-2">
                                                        <i className="fa-solid fa-star"></i>
                                                        <i className="fa-solid fa-star"></i>
                                                        <i className="fa-solid fa-star"></i>
                                                        <i className="fa-solid fa-star"></i>
                                                        <i className="fa-solid fa-star"></i>
                                                    </div>
                                                    <span>({getRating(spotlightProduct.id)}/5.0 từ khách hàng)</span>
                                                </div>

                                                <p className="na-spotlight-desc">
                                                    Khám phá đôi sneaker thế hệ mới nhất vừa đổ bộ. Thiết kế tinh xảo kết hợp chất liệu cao cấp mang lại sự êm ái tối đa cho cả ngày dài vận động năng động.
                                                </p>
                                                
                                                <div className="na-spotlight-sizes mb-4">
                                                    <span className="d-block text-secondary mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>CÓ SẴN CÁC CỠ</span>
                                                    <div className="d-flex gap-2">
                                                        <span className="badge bg-light text-dark px-2 py-1 border">38</span>
                                                        <span className="badge bg-light text-dark px-2 py-1 border">39</span>
                                                        <span className="badge bg-light text-dark px-2 py-1 border">40</span>
                                                        <span className="badge bg-light text-dark px-2 py-1 border">41</span>
                                                        <span className="badge bg-light text-dark px-2 py-1 border">42</span>
                                                        <span className="badge bg-light text-dark px-2 py-1 border">43</span>
                                                    </div>
                                                </div>

                                                <div className="na-spotlight-price mb-4">
                                                    {spotlightProduct.min_price != null ? formatCurrency(spotlightProduct.min_price) : 'Liên hệ'}
                                                </div>

                                                <div className="na-spotlight-actions d-flex gap-3">
                                                    <button 
                                                        onClick={() => navigate(`/details?id=${spotlightProduct.id}`)}
                                                        className="na-spotlight-btn-buy"
                                                    >
                                                        MUA NGAY <i className="fa-solid fa-arrow-right ms-2"></i>
                                                    </button>
                                                    <button 
                                                        className={`na-spotlight-btn-wish ${wishlistIds.includes(spotlightProduct.id) ? 'active' : ''}`}
                                                        onClick={(e) => toggleWishlist(e, spotlightProduct.id)}
                                                    >
                                                        <i className={wishlistIds.includes(spotlightProduct.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-lg-6 order-1 order-lg-2">
                                            <div className="na-spotlight-gallery" onClick={() => navigate(`/details?id=${spotlightProduct.id}`)}>
                                                <div className="na-spotlight-img-box">
                                                    <span className="na-spotlight-tag">MỚI</span>
                                                    <img src={getImageUrl(spotlightProduct.image_url)} alt={spotlightProduct.product_name} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FILTER & SORT CONTROLS */}
                            <div className="na-controls-wrap">
                                <div className="na-brands-filter">
                                    {brands.map(brand => (
                                        <button
                                            key={brand}
                                            className={`na-filter-pill ${activeBrand === brand ? 'active' : ''}`}
                                            onClick={() => setActiveBrand(brand)}
                                        >
                                            {brand === 'All' ? 'Tất cả' : brand}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="na-sort-select-wrapper">
                                    <label htmlFor="na-sort" className="na-sort-label">Sắp xếp:</label>
                                    <select 
                                        id="na-sort"
                                        className="na-sort-select"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="newest">Mới nhất</option>
                                        <option value="priceAsc">Giá: Thấp đến Cao</option>
                                        <option value="priceDesc">Giá: Cao đến Thấp</option>
                                    </select>
                                </div>
                            </div>

                            {/* Live Counter */}
                            <div className="na-counter-text">
                                Hiển thị <strong>{filteredAll.length}</strong> sản phẩm mới
                            </div>

                            {filteredProducts.length > 0 ? (
                                <div className="row g-4">
                                    {filteredProducts.map((p, idx) => (
                                        <div key={p.id} className="col-lg-3 col-md-4 col-6 reveal-item opacity-0" style={{ animationDelay: `${(idx % 4) * 0.1}s` }}>
                                            <div className="na-card">
                                                <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }}></Link>

                                                <div className="na-img-box">
                                                    <span className="na-badge">MỚI</span>
                                                    <img src={getImageUrl(p.image_url)} alt={p.product_name} />
                                                    <button 
                                                        className={`na-wish-btn ${wishlistIds.includes(p.id) ? 'active' : ''}`}
                                                        onClick={(e) => toggleWishlist(e, p.id)}
                                                        style={{ zIndex: 10 }}
                                                    >
                                                        <i className={wishlistIds.includes(p.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                    </button>
                                                </div>
                                                
                                                <div className="na-info">
                                                    <div className="na-brand-row">
                                                        <span className="na-brand">{p.brand_name}</span>
                                                        <span className="na-rating">
                                                            <i className="fa-solid fa-star"></i> {getRating(p.id)}
                                                        </span>
                                                    </div>
                                                    <h5 className="na-name">
                                                        {p.product_name}
                                                    </h5>
                                                    <div className="na-sizes-list">
                                                        <span>{getSizesText(p.id)}</span>
                                                    </div>
                                                    <div className="na-price">
                                                        {p.min_price != null ? formatCurrency(p.min_price) : 'Liên hệ'}
                                                    </div>
                                                </div>

                                                <div className="na-card-footer" style={{ position: 'relative', zIndex: 10 }}>
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.id}`); }} 
                                                        className="na-btn-cart"
                                                        title="Thêm vào giỏ"
                                                    >
                                                        <i className="fa-solid fa-cart-plus"></i>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.id}`); }} 
                                                        className="na-btn-buy"
                                                    >
                                                        MUA NGAY
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="na-empty py-4 text-center my-4">
                                    <p className="text-muted">Không còn sản phẩm khác cho thương hiệu này.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="na-empty">
                            <i className="fa-solid fa-box-open"></i>
                            <h3>Chưa có sản phẩm mới</h3>
                            <p>Chúng tôi đang cập nhật thêm nhiều mẫu mã mới. Vui lòng quay lại sau!</p>
                            <Link to="/shop" className="na-btn-back">
                                <i className="fa-solid fa-arrow-left"></i> TIẾP TỤC MUA SẮM
                            </Link>
                        </div>
                    )}
                </div>

                {/* PROMO BANNER */}
                {!loading && newProducts.length > 0 && (
                    <div className="na-promo-banner my-5 reveal-item opacity-0">
                        <div className="container">
                            <div className="na-promo-content text-center py-5">
                                <span className="na-promo-tag">SHOESSTORE MEMBERSHIP</span>
                                <h2>Đăng Ký Thành Viên Nhận Ưu Đãi Hàng Mới</h2>
                                <p>Nhận ngay quyền mua trước các sản phẩm phiên bản giới hạn, miễn phí vận chuyển toàn quốc và tích điểm đổi voucher giảm giá cực khủng.</p>
                                <Link to="/register" className="na-promo-btn">ĐĂNG KÝ NGAY</Link>
                            </div>
                        </div>
                    </div>
                )}



                {/* BRAND COMMITMENTS */}
                {!loading && newProducts.length > 0 && (
                    <div className="na-commitments py-5 mt-5">
                        <div className="container">
                            <div className="row g-4 text-center">
                                <div className="col-md-4">
                                    <div className="na-commitment-item">
                                        <i className="fa-solid fa-truck-fast"></i>
                                        <h5>Giao hàng miễn phí</h5>
                                        <p>Áp dụng cho mọi đơn hàng từ 1.000.000đ trên toàn quốc</p>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="na-commitment-item">
                                        <i className="fa-solid fa-rotate-left"></i>
                                        <h5>30 ngày đổi trả</h5>
                                        <p>Đổi sản phẩm dễ dàng trong 30 ngày nếu không vừa size</p>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="na-commitment-item">
                                        <i className="fa-solid fa-shield-halved"></i>
                                        <h5>Chính hãng 100%</h5>
                                        <p>Cam kết bồi thường gấp 10 lần nếu phát hiện hàng giả</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default NewArrivals;