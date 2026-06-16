import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Details.css';

const Details = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const productIdStr = queryParams.get('id');
    const productId = productIdStr ? parseInt(productIdStr) : null;

    const [product, setProduct] = useState(null);
    const [images, setImages] = useState([]);
    const [variants, setVariants] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    const [mainImage, setMainImage] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [currentStock, setCurrentStock] = useState(0);
    const [displayPrice, setDisplayPrice] = useState(0);
    const [qty, setQty] = useState(1);
    const [activeTab, setActiveTab] = useState('desc');
    const [isWishlist, setIsWishlist] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        const path = (typeof url === 'object' && url !== null) ? url.url : url;
        if (!path) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (path.startsWith('http')) return path;
        return `http://localhost:8080${path}`;
    };

    const fetchProductDetails = async () => {
        if (!productId) {
            setError("Mã sản phẩm không hợp lệ!");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await api.get(`/api/products/${productId}`);
            if (response.data && response.data.success) {
                const prodData = response.data.product;
                setProduct(prodData);

                const loadedImages = response.data.images || [];
                setImages(loadedImages);
                if (loadedImages.length > 0) {
                    setMainImage(loadedImages[0]);
                } else {
                    setMainImage('');
                }

                const loadedVariants = (response.data.variants || []).map(v => ({
                    id: v.id,
                    size_name: v.sizeName,
                    color_name: v.colorName,
                    price: v.price,
                    quantity: v.quantity
                }));
                setVariants(loadedVariants);

                if (loadedVariants.length > 0) {
                    const inStockVariant = loadedVariants.find(v => v.quantity > 0) || loadedVariants[0];
                    setSelectedVariantId(inStockVariant.id);
                    setCurrentStock(inStockVariant.quantity);
                    setDisplayPrice(inStockVariant.price);
                }

                fetchRelated(prodData.brandName, prodData.categoryId);
                fetchVouchers();
                fetchWishlistStatus();
            } else {
                setError("Không tìm thấy thông tin sản phẩm.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết sản phẩm:", err);
            setError("Lỗi kết nối máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRelated = async (brand, categoryId) => {
        try {
            const response = await api.get(`/api/products/search?category=${categoryId}`);
            if (response.data && response.data.success) {
                setRelatedProducts((response.data.products || []).filter(item => item.id !== productId).slice(0, 4));
            }
        } catch (err) {
            console.error("Lỗi tải sản phẩm tương tự:", err);
        }
    };

    const fetchVouchers = async () => {
        try {
            const response = await api.get('/api/vouchers');
            if (response.data && response.data.success) {
                setVouchers((response.data.vouchers || []).slice(0, 3));
            } else if (Array.isArray(response.data)) {
                setVouchers(response.data.slice(0, 3));
            }
        } catch (err) {
            console.error("Lỗi tải vouchers:", err);
        }
    };

    const fetchWishlistStatus = async () => {
        try {
            const response = await api.get('/api/favourites/ids');
            if (response.data && response.data.success) {
                const ids = response.data.ids || [];
                setIsWishlist(ids.includes(productId));
            }
        } catch (err) {
            console.error("Lỗi lấy trạng thái yêu thích:", err);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchProductDetails();
    }, [productId]);

    const handleVariantClick = (v) => {
        setSelectedVariantId(v.id);
        setCurrentStock(v.quantity);
        setDisplayPrice(v.price);

        if (qty > v.quantity && v.quantity > 0) {
            setQty(v.quantity);
        } else if (v.quantity === 0) {
            setQty(1);
        }
    };

    const handleIncrease = () => {
        if (!selectedVariantId) { alert("Vui lòng chọn Size & Màu sắc!"); return; }
        if (qty < currentStock) setQty(qty + 1);
    };

    const handleDecrease = () => {
        if (qty > 1) setQty(qty - 1);
    };

    const handleAddToCart = async () => {
        if (!selectedVariantId) { alert("Vui lòng chọn Size & Màu sắc!"); return; }
        if (currentStock <= 0) { alert("Sản phẩm này hết hàng!"); return; }
        try {
            const response = await api.post('/api/cart/add', { variantId: selectedVariantId, quantity: qty });
            if (response.data && response.data.success) {
                alert(`Đã thêm ${qty} sản phẩm vào giỏ hàng!`);
                window.location.reload();
            } else {
                alert(response.data.message || 'Lỗi thêm vào giỏ hàng.');
            }
        } catch (err) {
            if (err.response && err.response.status === 401) alert('Vui lòng đăng nhập!');
            else alert('Lỗi xử lý giỏ hàng.');
        }
    };

    const handleBuyNow = async () => {
        if (!selectedVariantId) { alert("Vui lòng chọn Size & Màu sắc!"); return; }
        if (currentStock <= 0) { alert("Sản phẩm này hết hàng!"); return; }
        try {
            const response = await api.post('/api/cart/add', { variantId: selectedVariantId, quantity: qty });
            if (response.data && response.data.success) {
                navigate('/checkout');
            } else {
                alert('Lỗi xử lý mua ngay.');
            }
        } catch (err) {
            if (err.response && err.response.status === 401) alert('Vui lòng đăng nhập!');
            else alert('Lỗi xử lý mua ngay.');
        }
    };

    const handleToggleWishlist = async () => {
        try {
            const response = await api.post('/api/favourites/toggle', { productId });
            if (response.data && response.data.success) {
                setIsWishlist(response.data.action === 'added');
            } else {
                alert(response.data.message || 'Vui lòng đăng nhập!');
            }
        } catch (err) {
            if (err.response && err.response.status === 401) alert('Vui lòng đăng nhập!');
            else alert('Lỗi xử lý yêu thích.');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="det-page">
                    <div className="det-loading">
                        <div className="det-loading-spinner"></div>
                        <p>Đang tải thông tin sản phẩm...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !product) {
        return (
            <Layout>
                <div className="det-page">
                    <div className="det-error-box">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <h2>{error || "Không tìm thấy sản phẩm"}</h2>
                        <Link to="/shop" className="det-btn-back">
                            <i className="fa-solid fa-arrow-left"></i> VỀ CỬA HÀNG
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="det-page">
                {/* BREADCRUMB */}
                <div className="det-breadcrumb">
                    <div className="container">
                        <Link to="/">TRANG CHỦ</Link>
                        <span className="sep">/</span>
                        <Link to="/shop">CỬA HÀNG</Link>
                        <span className="sep">/</span>
                        <span className="current">{product.productName}</span>
                    </div>
                </div>

                <div className="det-main-wrap">
                    <div className="container">
                        <div className="row g-5">
                            <div className="col-lg-6">
                                <div className="det-gallery">
                                    <div className="det-main-img">
                                        <img src={getImageUrl(mainImage)} alt={product.productName} />
                                        <button className={`det-wish-btn ${isWishlist ? 'active' : ''}`} onClick={handleToggleWishlist}>
                                            <i className="fa-solid fa-heart"></i>
                                        </button>
                                    </div>
                                    <div className="det-thumbs">
                                        {images.map((img, idx) => (
                                            <div key={idx} className={`det-thumb ${mainImage === img ? 'active' : ''}`} onClick={() => setMainImage(img)}>
                                                <img src={getImageUrl(img)} alt="thumb" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-6">
                                <div className="det-info">
                                    <div className="det-brand-pill">
                                        <i className="fa-solid fa-tag"></i> {product.brandName}
                                    </div>
                                    <h1 className="det-product-name">{product.productName}</h1>
                                    <div className="det-category-tag">
                                        <i className="fa-solid fa-folder"></i> {product.categoryName || 'Giày thể thao'}
                                    </div>
                                    
                                    <div className="det-price-block">
                                        <div>
                                            <div className="det-price-label">Giá bán chính thức</div>
                                            <div className="det-price-value">{formatCurrency(displayPrice)}</div>
                                        </div>
                                        <div className="det-price-badge">Chính hãng</div>
                                    </div>

                                    {/* VOUCHERS */}
                                    {vouchers.length > 0 && (
                                        <div className="det-voucher-row">
                                            <div className="det-voucher-label">
                                                <i className="fa-solid fa-ticket"></i> Khuyến mãi:
                                            </div>
                                            {vouchers.map((v, idx) => (
                                                <span key={idx} className="det-voucher-chip">
                                                    GIẢM {v.discountType === 'PERCENT' || v.discount_type === 'PERCENT' ? `${v.discountValue || v.discount_value}%` : `${(v.discountValue || v.discount_value) / 1000}K`} ({v.code})
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="det-short-desc">
                                        {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                                    </p>

                                    <div className="det-variants-section">
                                        <div className="det-section-label">
                                            <span>Chọn Size & Màu sắc</span>
                                            {selectedVariantId && (
                                                <span className={`det-stock-badge ${currentStock > 0 ? 'in-stock' : 'out-stock'}`}>
                                                    {currentStock > 0 ? `Còn ${currentStock} sản phẩm` : 'Hết hàng'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="det-variant-grid">
                                            {variants.map(v => (
                                                <button key={v.id} 
                                                    className={`det-variant-chip ${selectedVariantId === v.id ? 'det-variant-chip--active' : ''} ${v.quantity === 0 ? 'det-variant-chip--disabled' : ''}`}
                                                    onClick={() => { if(v.quantity > 0) handleVariantClick(v) }}>
                                                    {v.size_name} - {v.color_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="det-actions-row">
                                        <div className="det-qty-control">
                                            <button className="det-qty-btn" onClick={handleDecrease}><i className="fa-solid fa-minus"></i></button>
                                            <input type="text" className="det-qty-val" value={qty} readOnly />
                                            <button className="det-qty-btn" onClick={handleIncrease}><i className="fa-solid fa-plus"></i></button>
                                        </div>
                                        <button className="det-btn-cart" onClick={handleAddToCart}>
                                            <i className="fa-solid fa-cart-plus"></i> THÊM GIỎ HÀNG
                                        </button>
                                    </div>

                                    <button className="det-btn-buy" onClick={handleBuyNow}>
                                        MUA NGAY
                                    </button>

                                    <div className="det-guarantee-strip">
                                        <div className="det-guarantee-item">
                                            <i className="fa-solid fa-shield-halved"></i>
                                            Chính hãng 100%
                                        </div>
                                        <div className="det-guarantee-item">
                                            <i className="fa-solid fa-rotate-left"></i>
                                            Đổi trả 30 ngày
                                        </div>
                                        <div className="det-guarantee-item">
                                            <i className="fa-solid fa-truck-fast"></i>
                                            Giao nhanh miễn phí
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="det-tabs-section">
                    <div className="container">
                        <div className="det-tabs-header">
                            <button 
                                className={`det-tab-btn ${activeTab === 'desc' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('desc')}
                            >
                                <i className="fa-solid fa-align-left"></i> MÔ TẢ CHI TIẾT
                            </button>
                            <button 
                                className={`det-tab-btn ${activeTab === 'specs' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('specs')}
                            >
                                <i className="fa-solid fa-sliders"></i> THÔNG SỐ KỸ THUẬT
                            </button>
                        </div>
                        
                        <div className="det-tab-content">
                            {activeTab === 'desc' && (
                                <div className="det-desc-body">
                                    <div className="det-desc-highlight">
                                        <i className="fa-solid fa-star"></i>
                                        <div className="det-desc-highlight-text">
                                            Đặc điểm nổi bật: Sản phẩm sở hữu thiết kế trẻ trung, chất liệu cao cấp cùng đường may tỉ mỉ, mang lại trải nghiệm êm ái và thoải mái tối đa cho người sử dụng.
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.8' }}>
                                        {product.description || "Sản phẩm chính hãng với chất lượng hoàn thiện tuyệt đối. Mang lại cảm giác thoải mái và tự tin trên từng bước chân."}
                                    </p>
                                    <div className="det-desc-features">
                                        <div className="det-desc-feature-item"><i className="fa-solid fa-circle-check"></i> Chính hãng 100%</div>
                                        <div className="det-desc-feature-item"><i className="fa-solid fa-circle-check"></i> Đổi size dễ dàng</div>
                                        <div className="det-desc-feature-item"><i className="fa-solid fa-circle-check"></i> Hỗ trợ trả góp 0%</div>
                                        <div className="det-desc-feature-item"><i className="fa-solid fa-circle-check"></i> Bảo hành keo 6 tháng</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'specs' && (
                                <div className="det-specs-body">
                                    <div className="det-spec-group-title">Thông số nổi bật</div>
                                    <div className="det-spec-row">
                                        <div className="det-spec-key">MÃ SẢN PHẨM</div>
                                        <div className="det-spec-val"><span className="det-spec-val-pill">{product.productCode || 'N/A'}</span></div>
                                    </div>
                                    <div className="det-spec-row">
                                        <div className="det-spec-key">THƯƠNG HIỆU</div>
                                        <div className="det-spec-val">{product.brandName || 'N/A'}</div>
                                    </div>
                                    <div className="det-spec-row">
                                        <div className="det-spec-key">DANH MỤC</div>
                                        <div className="det-spec-val">{product.categoryName || 'N/A'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RELATED PRODUCTS */}
                <div className="det-related-section">
                    <div className="container">
                        <div className="det-section-heading">
                            <h2>Có thể bạn sẽ <span>thích</span></h2>
                        </div>
                        <div className="row g-4">
                            {relatedProducts.map(p => (
                                <div key={p.id} className="col-lg-3 col-md-6 col-12">
                                    <div className="det-related-card">
                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }}></Link>
                                        
                                        <div className="det-related-card-img">
                                            <img src={getImageUrl(p.image_url)} alt={p.product_name} />
                                        </div>

                                        <div className="det-related-card-body">
                                            <div className="det-related-brand">{p.brand_name || 'SNEAKER'}</div>
                                            <h5 className="det-related-name">{p.product_name}</h5>
                                            <div className="det-related-price">
                                                {p.min_price != null ? formatCurrency(p.min_price) : 'Liên hệ'}
                                            </div>
                                        </div>

                                        <div className="det-related-card-footer" style={{ position: 'relative', zIndex: 2 }}>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.id}`); }} 
                                                className="det-related-btn-cart"
                                                title="Thêm vào giỏ"
                                            >
                                                <i className="fa-solid fa-cart-plus"></i>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.id}`); }} 
                                                className="det-related-btn-buy"
                                            >
                                                MUA NGAY
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Details;