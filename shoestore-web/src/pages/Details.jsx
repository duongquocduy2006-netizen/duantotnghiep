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
    const [reviews, setReviews] = useState([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [reviewContent, setReviewContent] = useState('');
    const [reviewRating, setReviewRating] = useState(5);

    const [currentUser, setCurrentUser] = useState(null);
    const [activeReplyId, setActiveReplyId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [activeEditId, setActiveEditId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editRating, setEditRating] = useState(null);

    const [mainImage, setMainImage] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [currentStock, setCurrentStock] = useState(0);
    const [displayPrice, setDisplayPrice] = useState(0);
    const [qty, setQty] = useState(1);
    const [activeTab, setActiveTab] = useState('desc');
    const [isWishlist, setIsWishlist] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [flashSale, setFlashSale] = useState(null);

    const formatCurrency = (amount) => {
        const val = Number(amount);
        if (isNaN(val) || amount === null || amount === undefined) return '0 đ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const getImageUrl = (url) => {
        const path = (typeof url === 'object' && url !== null) ? url.url : url;
        if (!path) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (path.startsWith('http')) return path;
        return `http://localhost:8080${path}`;
    };

    const fetchProductDetails = async (showLoading = true) => {
        if (!productId) {
            setError("Mã sản phẩm không hợp lệ!");
            setLoading(false);
            return;
        }
        try {
            if (showLoading) setLoading(true);
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

                setReviews(response.data.reviews || []);
                setReviewCount(response.data.reviewCount || 0);
                setAvgRating(response.data.avgRating || 0);
                setHasPurchased(response.data.hasPurchased || false);

                // Flash Sale data
                setFlashSale(response.data.flashSale || null);

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

    const submitReview = async (e) => {
        e.preventDefault();
        if (!reviewContent.trim()) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Vui lòng nhập nội dung đánh giá!" }));
            return;
        }
        try {
            const fd = new FormData();
            fd.append("productId", productId);
            fd.append("rating", reviewRating);
            fd.append("content", reviewContent);

            const response = await api.post('/api/reviews/add', fd);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Đã gửi đánh giá thành công!" }));
                setReviewContent('');
                setReviewRating(5);
                fetchProductDetails(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Gửi đánh giá thất bại." }));
            }
        } catch (err) {
            console.error("Lỗi gửi đánh giá:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể gửi đánh giá." }));
        }
    };

    const handleLikeReview = async (id) => {
        // Snapshot state before optimistic update for rollback
        const previousReviews = reviews;

        // Optimistic UI update (tạm thời toggle để UI phản ứng ngay)
        setReviews(prevReviews => {
            return prevReviews.map(r => {
                if (r.id === id) {
                    const currentlyLiked = Number(r.user_liked) > 0;
                    return {
                        ...r,
                        user_liked: currentlyLiked ? 0 : 1,
                        like_count: (r.like_count || 0) + (currentlyLiked ? -1 : 1)
                    };
                }
                if (r.replies && r.replies.length > 0) {
                    return {
                        ...r,
                        replies: r.replies.map(reply => {
                            if (reply.id === id) {
                                const currentlyLiked = Number(reply.user_liked) > 0;
                                return {
                                    ...reply,
                                    user_liked: currentlyLiked ? 0 : 1,
                                    like_count: (reply.like_count || 0) + (currentlyLiked ? -1 : 1)
                                };
                            }
                            return reply;
                        })
                    };
                }
                return r;
            });
        });

        try {
            const fd = new FormData();
            fd.append("id", id);
            const response = await api.post('/api/reviews/like', fd);
            if (response.data && response.data.success) {
                // Luôn dùng giá trị thực từ server để đảm bảo đồng bộ với DB
                const serverLiked = response.data.liked;   // true | false
                const serverCount = response.data.likeCount; // số like thực tế
                setReviews(prevReviews => {
                    return prevReviews.map(r => {
                        if (r.id === id) {
                            return {
                                ...r,
                                user_liked: serverLiked ? 1 : 0,
                                like_count: serverCount
                            };
                        }
                        if (r.replies && r.replies.length > 0) {
                            return {
                                ...r,
                                replies: r.replies.map(reply => {
                                    if (reply.id === id) {
                                        return {
                                            ...reply,
                                            user_liked: serverLiked ? 1 : 0,
                                            like_count: serverCount
                                        };
                                    }
                                    return reply;
                                })
                            };
                        }
                        return r;
                    });
                });
            } else {
                // Rollback nếu API thất bại
                setReviews(previousReviews);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: (response.data && response.data.message) || "Lỗi khi thích bình luận." }));
            }
        } catch (err) {
            console.error(err);
            // Rollback khi lỗi mạng
            setReviews(previousReviews);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối." }));
        }
    };

    const handleReplyReview = async (parentId) => {
        if (!replyContent.trim()) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Vui lòng nhập nội dung phản hồi!" }));
            return;
        }
        try {
            const fd = new FormData();
            fd.append("productId", productId);
            fd.append("content", replyContent);
            fd.append("parentId", parentId);
            const response = await api.post('/api/reviews/add', fd);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Gửi phản hồi thành công!" }));
                setReplyContent('');
                setActiveReplyId(null);
                fetchProductDetails(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Không thể gửi phản hồi." }));
            }
        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối." }));
        }
    };

    const handleEditReview = async (id) => {
        if (!editContent.trim()) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Vui lòng nhập nội dung bình luận!" }));
            return;
        }
        try {
            const fd = new FormData();
            fd.append("id", id);
            fd.append("content", editContent);
            if (editRating) {
                fd.append("rating", editRating);
            }
            const response = await api.post('/api/reviews/edit', fd);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Cập nhật bình luận thành công!" }));
                setActiveEditId(null);
                setEditContent('');
                setEditRating(null);
                fetchProductDetails(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Không thể cập nhật bình luận." }));
            }
        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối." }));
        }
    };

    const handleDeleteReview = async (id) => {
        try {
            const fd = new FormData();
            fd.append("id", id);
            const response = await api.post('/api/reviews/delete', fd);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Đã xóa bình luận thành công!" }));
                fetchProductDetails(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Không thể xóa bình luận." }));
            }
        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối." }));
        }
    };

    const handleToggleHideReview = async (id) => {
        try {
            const response = await api.post(`/api/reviews/toggle-hide?id=${id}`);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message }));
                fetchProductDetails(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: (response.data && response.data.message) || "Không thể thực hiện thao tác." }));
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.message) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: err.response.data.message }));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối." }));
            }
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

    const [cartError, setCartError] = useState('');
    const [cartSuccess, setCartSuccess] = useState('');

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
        
        const tab = queryParams.get('tab');
        if (tab) {
            setActiveTab(tab);
            if (tab === 'reviews') {
                setTimeout(() => {
                    const el = document.getElementById('details-tabs');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 400);
            }
        }
        
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/profile');
                if (res.data && res.data.success) {
                    setCurrentUser(res.data.account);
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin tài khoản:", err);
            }
        };
        fetchProfile();
    }, [productId]);

    const handleVariantClick = (v) => {
        setSelectedVariantId(v.id);
        setCurrentStock(v.quantity);
        setDisplayPrice(v.price);
        setCartError('');
        setCartSuccess('');

        if (qty > v.quantity && v.quantity > 0) {
            setQty(v.quantity);
        } else if (v.quantity === 0) {
            setQty(1);
        }
    };

    const handleIncrease = () => {
        setCartError('');
        setCartSuccess('');
        if (!selectedVariantId) { setCartError("Vui lòng chọn Size & Màu sắc!"); return; }
        if (qty < currentStock) setQty(qty + 1);
        else setCartError(`Chỉ có thể mua tối đa ${currentStock} sản phẩm`);
    };

    const handleDecrease = () => {
        setCartError('');
        setCartSuccess('');
        if (qty > 1) setQty(qty - 1);
    };

    const handleAddToCart = async () => {
        setCartError('');
        setCartSuccess('');
        if (!selectedVariantId) {
            setCartError("Vui lòng chọn Size & Màu sắc!");
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng chọn Size & Màu sắc!' }));
            return;
        }
        if (currentStock <= 0) {
            setCartError("Sản phẩm này hết hàng!");
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Sản phẩm này đã hết hàng!' }));
            return;
        }
        try {
            const response = await api.post('/api/cart/add', { variantId: selectedVariantId, quantity: qty });
            if (response.data && response.data.success) {
                setCartSuccess(`Đã thêm ${qty} sản phẩm vào giỏ hàng!`);
                setTimeout(() => setCartSuccess(''), 3000);
                window.dispatchEvent(new Event("cartUpdated"));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Đã thêm ${qty} sản phẩm vào giỏ hàng thành công!` }));
            } else {
                setCartError(response.data.message || 'Lỗi thêm vào giỏ hàng.');
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || 'Lỗi thêm vào giỏ hàng.' }));
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                setCartError('Vui lòng đăng nhập!');
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng đăng nhập để thêm vào giỏ hàng!' }));
            } else if (err.response && err.response.data && err.response.data.message) {
                setCartError(err.response.data.message);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: err.response.data.message }));
            } else {
                setCartError('Lỗi xử lý giỏ hàng.');
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi xử lý giỏ hàng.' }));
            }
        }
    };

    const handleBuyNow = async () => {
        setCartError('');
        if (!selectedVariantId) { setCartError("Vui lòng chọn Size & Màu sắc!"); return; }
        if (currentStock <= 0) { setCartError("Sản phẩm này hết hàng!"); return; }
        try {
            navigate(`/checkout?buyNowVariantId=${selectedVariantId}&buyNowQty=${qty}`);
        } catch (err) {
            setCartError('Lỗi xử lý mua ngay.');
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
                                    
                                    {flashSale ? (
                                        (() => {
                                            const isLiveSale = flashSale.isLive === true || (flashSale.salePrice && flashSale.isLive !== false && flashSale.isUpcoming !== true);
                                            if (isLiveSale) {
                                                return (
                                                    <>
                                                        <div className="det-flash-sale-banner">
                                                            <div className="det-flash-sale-icon">
                                                                <i className="fa-solid fa-bolt"></i>
                                                            </div>
                                                            <div className="det-flash-sale-info">
                                                                <span className="det-flash-sale-tag">FLASH SALE ĐANG DIỄN RA</span>
                                                                <span className="det-flash-sale-name">{flashSale.campaignName}</span>
                                                            </div>
                                                            <div className="det-flash-sale-discount-badge">
                                                                -{flashSale.discountPercent}%
                                                            </div>
                                                        </div>
                                                        <div className="det-price-block det-price-block--sale">
                                                            <div>
                                                                <div className="det-price-label">Giá Flash Sale</div>
                                                                <div className="det-price-value det-price-value--sale">{formatCurrency(flashSale.salePrice)}</div>
                                                                <div className="det-price-original">
                                                                    <span className="det-price-old">{formatCurrency(displayPrice)}</span>
                                                                    <span className="det-price-save">Tiết kiệm {formatCurrency((displayPrice || 0) - (flashSale.salePrice || 0))}</span>
                                                                </div>
                                                            </div>
                                                            <div className="det-price-badge det-price-badge--sale">Flash Sale</div>
                                                        </div>
                                                        {flashSale.quantityLimit > 0 && (
                                                            <div className="det-flash-sale-progress">
                                                                <div className="det-flash-progress-text">
                                                                    <span>{(flashSale.soldQuantity / flashSale.quantityLimit * 100) >= 80 ? <><i className="fa-solid fa-fire text-danger me-1"></i>Sắp hết</> : 'Đang bán'}</span>
                                                                    <span>Đã bán {flashSale.soldQuantity}/{flashSale.quantityLimit}</span>
                                                                </div>
                                                                <div className="det-flash-progress-bar">
                                                                    <div className="det-flash-progress-fill" style={{ width: `${Math.min((flashSale.soldQuantity / flashSale.quantityLimit) * 100, 100)}%` }}></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            } else {
                                                const saleVal = flashSale.salePrice !== undefined && flashSale.salePrice !== null ? flashSale.salePrice : flashSale.upcomingSalePrice;
                                                return (
                                                    <>
                                                        <div className="det-flash-sale-banner" style={{ background: 'linear-gradient(135deg, #ff4d4f 0%, #dc2626 100%)', border: '1px solid #ef4444' }}>
                                                            <div className="det-flash-sale-icon" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
                                                                <i className="fa-solid fa-clock"></i>
                                                            </div>
                                                            <div className="det-flash-sale-info">
                                                                <span className="det-flash-sale-tag" style={{ background: '#ffffff', color: '#dc2626', fontWeight: 'bold' }}>SẮP DIỄN RA FLASH SALE</span>
                                                                <span className="det-flash-sale-name" style={{ color: '#ffffff' }}>{flashSale.campaignName}</span>
                                                            </div>
                                                            <div className="det-flash-sale-discount-badge" style={{ background: '#ffffff', color: '#dc2626', fontWeight: 'bold' }}>
                                                                SẮP GIẢM -{flashSale.discountPercent}%
                                                            </div>
                                                        </div>
                                                        <div className="det-price-block" style={{ background: '#ffffff', border: '2px solid #fee2e2', borderRadius: '16px' }}>
                                                            <div>
                                                                <div className="det-price-label text-muted">Giá bán hiện tại (Chưa đến giờ Sale)</div>
                                                                <div className="det-price-value text-danger fw-bold">{formatCurrency(displayPrice)}</div>
                                                                <div className="mt-2 text-danger fw-bold font-oswald d-flex align-items-center gap-1" style={{ fontSize: '15px' }}>
                                                                    <i className="fa-solid fa-clock text-danger me-1"></i> Giá Flash Sale sắp tới: {formatCurrency(saleVal)}
                                                                </div>
                                                            </div>
                                                            <div className="det-price-badge" style={{ background: '#ef4444', color: '#ffffff' }}>Sắp Sale</div>
                                                        </div>
                                                    </>
                                                );
                                            }
                                        })()
                                    ) : (
                                        <div className="det-price-block">
                                            <div>
                                                <div className="det-price-label">Giá bán chính thức</div>
                                                <div className="det-price-value">{formatCurrency(displayPrice)}</div>
                                            </div>
                                            <div className="det-price-badge">Chính hãng</div>
                                        </div>
                                    )}

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

                                    <div className="det-short-desc">
                                        {product.description ? (
                                            product.description.includes('<') ? (
                                                <div dangerouslySetInnerHTML={{ __html: product.description }} />
                                            ) : (
                                                <p>{product.description}</p>
                                            )
                                        ) : (
                                            <p>Chưa có mô tả chi tiết cho sản phẩm này.</p>
                                        )}
                                    </div>

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
                                                    onClick={() => handleVariantClick(v)}>
                                                    {v.size_name} - {v.color_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {cartError && (
                                        <div style={{ color: '#e50914', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', background: 'rgba(229, 9, 20, 0.08)', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #e50914' }}>
                                            <i className="fa-solid fa-triangle-exclamation"></i> {cartError}
                                        </div>
                                    )}
                                    {cartSuccess && (
                                        <div style={{ color: '#0d9488', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', background: 'rgba(13, 148, 136, 0.08)', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #0d9488' }}>
                                            <i className="fa-solid fa-circle-check"></i> {cartSuccess}
                                        </div>
                                    )}
                                    <div className="det-actions-row">
                                        <div className="det-qty-control" style={{ opacity: currentStock <= 0 ? 0.5 : 1, pointerEvents: currentStock <= 0 ? 'none' : 'auto' }}>
                                            <button className="det-qty-btn" onClick={handleDecrease} disabled={currentStock <= 0}><i className="fa-solid fa-minus"></i></button>
                                            <input type="text" className="det-qty-val" value={currentStock <= 0 ? 0 : qty} readOnly />
                                            <button className="det-qty-btn" onClick={handleIncrease} disabled={currentStock <= 0}><i className="fa-solid fa-plus"></i></button>
                                        </div>
                                        <button 
                                            className={`det-btn-cart ${currentStock <= 0 ? 'det-btn-disabled' : ''}`} 
                                            onClick={handleAddToCart}
                                            disabled={currentStock <= 0}
                                        >
                                            <i className="fa-solid fa-cart-plus"></i> THÊM GIỎ HÀNG
                                        </button>
                                    </div>
 
                                    <button 
                                        className={`det-btn-buy ${currentStock <= 0 ? 'det-btn-disabled' : ''}`} 
                                        onClick={handleBuyNow}
                                        disabled={currentStock <= 0}
                                    >
                                        {currentStock <= 0 ? 'HẾT HÀNG' : 'MUA NGAY'}
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
                <div className="det-tabs-section" id="details-tabs">
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
                            <button 
                                className={`det-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('reviews')}
                            >
                                <i className="fa-solid fa-star"></i> ĐÁNH GIÁ ({reviewCount})
                            </button>
                        </div>
                        
                        <div className="det-tab-content">
                            {activeTab === 'desc' && (
                                <div className="det-desc-body">
                                    <div style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.8' }}>
                                        {product.description ? (
                                            product.description.includes('<') ? (
                                                <div dangerouslySetInnerHTML={{ __html: product.description }} />
                                            ) : (
                                                <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
                                            )
                                        ) : (
                                            <p>Sản phẩm chất lượng mang lại cảm giác thoải mái và tự tin trên từng bước chân.</p>
                                        )}
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

                            {activeTab === 'reviews' && (
                                <div className="det-reviews-body">
                                    <div className="row">
                                        <div className="col-md-5">
                                            <div className="det-rating-summary">
                                                <div className="det-rating-avg">{Number(avgRating).toFixed(1)}</div>
                                                <div className="det-rating-stars" style={{ color: '#ffb800', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                                    {Array.from({length: 5}).map((_, i) => (
                                                        <i key={i} className={i < Math.round(avgRating) ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                                                    ))}
                                                </div>
                                                <div className="det-rating-count">dựa trên {reviewCount} đánh giá</div>
                                            </div>
                                        </div>
                                        <div className="col-md-7">
                                            {hasPurchased ? (
                                                <form className="det-review-form" onSubmit={submitReview}>
                                                    <h5>Viết đánh giá của bạn</h5>
                                                    <div className="mb-3">
                                                        <label className="form-label">Chọn mức điểm:</label>
                                                        <div className="det-rating-select">
                                                            {[1, 2, 3, 4, 5].map(num => (
                                                                <button type="button" key={num} onClick={() => setReviewRating(num)} style={{ border: 'none', background: 'none', color: num <= reviewRating ? '#ffb800' : '#ddd', fontSize: '1.5rem', cursor: 'pointer' }}>
                                                                    <i className="fa-solid fa-star"></i>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="mb-3">
                                                        <textarea className="form-control" rows="3" placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." value={reviewContent} onChange={e => setReviewContent(e.target.value)}></textarea>
                                                    </div>
                                                    <button type="submit" className="btn btn-dark w-100">Gửi đánh giá</button>
                                                </form>
                                            ) : (
                                                <div className="alert alert-warning text-center" style={{ borderRadius: '12px' }}>
                                                    <i className="fa-solid fa-lock mb-2" style={{ fontSize: '2rem' }}></i>
                                                    <p className="mb-0">Bạn cần mua sản phẩm này và nhận hàng thành công để có thể viết đánh giá.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="det-review-list mt-5">
                                        <h5 className="mb-4">Khách hàng nhận xét</h5>
                                        {(() => {
                                            const isAdminUser = currentUser && currentUser.role === 'ADMIN';
                                            const visibleReviews = reviews.filter(r => isAdminUser || (Number(r.is_hidden) !== 1 && r.is_hidden !== true));

                                            if (visibleReviews.length === 0) {
                                                return <p className="text-muted">Chưa có đánh giá nào cho sản phẩm này.</p>;
                                            }

                                            return visibleReviews.map(r => {
                                                const isAuthor = currentUser && currentUser.id === r.user_id;
                                                const canDelete = currentUser && (currentUser.id === r.user_id || currentUser.role === 'ADMIN');
                                                const canHide = isAdminUser;
                                                const isHidden = Number(r.is_hidden) === 1 || r.is_hidden === true;
                                                const isEditing = activeEditId === r.id;
                                                const isReplying = activeReplyId === r.id;

                                                const visibleReplies = (r.replies || []).filter(reply => isAdminUser || (Number(reply.is_hidden) !== 1 && reply.is_hidden !== true));

                                                return (
                                                    <div key={r.id} className="det-review-item-container mb-4 p-3 rounded" style={{ background: isHidden ? '#fafafa' : '#fff', border: '1px solid #f1f5f9' }}>
                                                        {/* Parent Review Card */}
                                                        <div className="det-review-item">
                                                            <div className="d-flex align-items-center mb-2">
                                                                <div className="det-review-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '1rem' }}>
                                                                    {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'U'}
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <strong className="text-dark">{r.user_name}</strong>
                                                                        {r.role === 'ADMIN' && (
                                                                            <span className="badge bg-danger" style={{ fontSize: '10px' }}>QTV</span>
                                                                        )}
                                                                        {isHidden && (
                                                                            <span className="badge bg-secondary opacity-75" style={{ fontSize: '10px' }}>Đã ẩn</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="det-rating-stars" style={{ color: '#ffb800', fontSize: '0.85rem' }}>
                                                                        {Array.from({length: 5}).map((_, i) => (
                                                                            <i key={i} className={i < r.rating ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Edit Form or Static content */}
                                                            {isEditing ? (
                                                                <div className="mt-2 mb-3">
                                                                    <div className="mb-2">
                                                                        <label className="form-label small">Sửa điểm số:</label>
                                                                        <div>
                                                                            {[1, 2, 3, 4, 5].map(num => (
                                                                                <button type="button" key={num} onClick={() => setEditRating(num)} style={{ border: 'none', background: 'none', color: num <= (editRating || r.rating) ? '#ffb800' : '#ddd', fontSize: '1.2rem', cursor: 'pointer', padding: '0 2px' }}>
                                                                                    <i className="fa-solid fa-star"></i>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <textarea 
                                                                        className="form-control mb-2" 
                                                                        rows="2" 
                                                                        value={editContent} 
                                                                        onChange={e => setEditContent(e.target.value)}
                                                                    />
                                                                    <div className="d-flex gap-2">
                                                                        <button onClick={() => handleEditReview(r.id)} className="btn btn-sm btn-dark">Lưu</button>
                                                                        <button onClick={() => { setActiveEditId(null); setEditContent(''); setEditRating(null); }} className="btn btn-sm btn-outline-secondary">Hủy</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className={`mb-2 ${isHidden ? 'text-muted text-decoration-line-through opacity-75' : 'text-secondary'}`} style={{ fontSize: '15px', lineHeight: '1.6' }}>
                                                                    {r.content}
                                                                </p>
                                                            )}

                                                            <div className="d-flex align-items-center justify-content-between">
                                                                <small className="text-muted">{new Date(r.created_at).toLocaleString('vi-VN')}</small>
                                                                
                                                                {/* Action Buttons: Like, Reply, Edit, Hide/Unhide, Delete */}
                                                                <div className="d-flex align-items-center gap-3">
                                                                    {/* Heart button (Like) */}
                                                                    <button 
                                                                        onClick={() => handleLikeReview(r.id)}
                                                                        style={{ border: 'none', background: 'none', color: Number(r.user_liked) > 0 ? '#ef4444' : '#64748b', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
                                                                    >
                                                                        <i className={Number(r.user_liked) > 0 ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                                        <span>{r.like_count || 0}</span>
                                                                    </button>

                                                                    {/* Reply button */}
                                                                    {currentUser && (
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveReplyId(isReplying ? null : r.id);
                                                                                setReplyContent('');
                                                                            }}
                                                                            style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            Trả lời
                                                                        </button>
                                                                    )}

                                                                    {/* Edit button */}
                                                                    {isAuthor && !isEditing && (
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveEditId(r.id);
                                                                                setEditContent(r.content);
                                                                                setEditRating(r.rating);
                                                                            }}
                                                                            style={{ border: 'none', background: 'none', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            Sửa
                                                                        </button>
                                                                    )}

                                                                    {/* Hide / Unhide button (Admin only) */}
                                                                    {canHide && (
                                                                        <button 
                                                                            onClick={() => handleToggleHideReview(r.id)}
                                                                            style={{ border: 'none', background: 'none', color: isHidden ? '#16a34a' : '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            {isHidden ? 'Hiện' : 'Ẩn'}
                                                                        </button>
                                                                    )}

                                                                    {/* Delete button */}
                                                                    {canDelete && (
                                                                        <button 
                                                                            onClick={() => handleDeleteReview(r.id)}
                                                                            style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                        >
                                                                            Xóa
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Reply form (Nested) */}
                                                        {isReplying && (
                                                            <div className="mt-3 p-3 rounded" style={{ background: '#f8fafc', borderLeft: '3px solid #3b82f6', marginLeft: '2rem' }}>
                                                                <h6 className="mb-2 small fw-bold">Viết phản hồi:</h6>
                                                                <textarea 
                                                                    className="form-control mb-2" 
                                                                    rows="2" 
                                                                    placeholder="Nhập nội dung phản hồi của bạn..."
                                                                    value={replyContent} 
                                                                    onChange={e => setReplyContent(e.target.value)}
                                                                />
                                                                <div className="d-flex gap-2">
                                                                    <button onClick={() => handleReplyReview(r.id)} className="btn btn-sm btn-primary">Gửi</button>
                                                                    <button onClick={() => { setActiveReplyId(null); setReplyContent(''); }} className="btn btn-sm btn-outline-secondary">Hủy</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Replies list (Nested) */}
                                                        {visibleReplies.length > 0 && (
                                                            <div className="det-replies-list mt-3" style={{ marginLeft: '2.5rem' }}>
                                                                {visibleReplies.map(reply => {
                                                                    const isReplyAuthor = currentUser && currentUser.id === reply.user_id;
                                                                    const canDeleteReply = currentUser && (currentUser.id === reply.user_id || currentUser.role === 'ADMIN');
                                                                    const canHideReply = isAdminUser;
                                                                    const isReplyHidden = Number(reply.is_hidden) === 1 || reply.is_hidden === true;
                                                                    const isEditingReply = activeEditId === reply.id;

                                                                    return (
                                                                        <div key={reply.id} className="p-3 mb-2 rounded position-relative" style={{ background: isReplyHidden ? '#f1f5f9' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                                            <div className="d-flex align-items-center mb-2">
                                                                                <div className="det-review-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '0.75rem', fontSize: '0.85rem' }}>
                                                                                    {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : 'U'}
                                                                                </div>
                                                                                <div className="flex-grow-1">
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <strong className="text-dark" style={{ fontSize: '0.9rem' }}>{reply.user_name}</strong>
                                                                                        {reply.role === 'ADMIN' && (
                                                                                            <span className="badge bg-danger" style={{ fontSize: '9px', padding: '2px 4px' }}>QTV</span>
                                                                                        )}
                                                                                        {isReplyHidden && (
                                                                                            <span className="badge bg-secondary opacity-75" style={{ fontSize: '9px', padding: '2px 4px' }}>Đã ẩn</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Reply Edit or content */}
                                                                            {isEditingReply ? (
                                                                                <div className="mt-2 mb-2">
                                                                                    <textarea 
                                                                                        className="form-control mb-2" 
                                                                                        rows="2" 
                                                                                        value={editContent} 
                                                                                        onChange={e => setEditContent(e.target.value)}
                                                                                    />
                                                                                    <div className="d-flex gap-2">
                                                                                        <button onClick={() => handleEditReview(reply.id)} className="btn btn-sm btn-dark">Lưu</button>
                                                                                        <button onClick={() => { setActiveEditId(null); setEditContent(''); }} className="btn btn-sm btn-outline-secondary">Hủy</button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <p className={`mb-2 ${isReplyHidden ? 'text-muted text-decoration-line-through opacity-75' : 'text-secondary'}`} style={{ fontSize: '14px', lineHeight: '1.5' }}>{reply.content}</p>
                                                                            )}

                                                                            <div className="d-flex align-items-center justify-content-between">
                                                                                <small className="text-muted" style={{ fontSize: '12px' }}>{new Date(reply.created_at).toLocaleString('vi-VN')}</small>
                                                                                
                                                                                {/* Reply actions */}
                                                                                <div className="d-flex align-items-center gap-3">
                                                                                    {/* Reply like */}
                                                                                    <button 
                                                                                        onClick={() => handleLikeReview(reply.id)}
                                                                                        style={{ border: 'none', background: 'none', color: Number(reply.user_liked) > 0 ? '#ef4444' : '#64748b', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: 0 }}
                                                                                    >
                                                                                        <i className={Number(reply.user_liked) > 0 ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                                                        <span>{reply.like_count || 0}</span>
                                                                                    </button>

                                                                                    {/* Reply edit */}
                                                                                    {isReplyAuthor && !isEditingReply && (
                                                                                        <button 
                                                                                            onClick={() => {
                                                                                                setActiveEditId(reply.id);
                                                                                                setEditContent(reply.content);
                                                                                            }}
                                                                                            style={{ border: 'none', background: 'none', color: '#0f172a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                                        >
                                                                                            Sửa
                                                                                        </button>
                                                                                    )}

                                                                                    {/* Reply Hide / Unhide button (Admin only) */}
                                                                                    {canHideReply && (
                                                                                        <button 
                                                                                            onClick={() => handleToggleHideReview(reply.id)}
                                                                                            style={{ border: 'none', background: 'none', color: isReplyHidden ? '#16a34a' : '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                                        >
                                                                                            {isReplyHidden ? 'Hiện' : 'Ẩn'}
                                                                                        </button>
                                                                                    )}

                                                                                    {/* Reply delete */}
                                                                                    {canDeleteReply && (
                                                                                        <button 
                                                                                            onClick={() => handleDeleteReview(reply.id)}
                                                                                            style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                                        >
                                                                                            Xóa
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
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