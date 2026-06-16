import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './FlashSale.css';

const FlashSale = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState(null);
    const [products, setProducts] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [activeBrand, setActiveBrand] = useState('All');
    const [sortBy, setSortBy] = useState('default');
    const [selectedSlot, setSelectedSlot] = useState('slot1');
    const [claimedVouchers, setClaimedVouchers] = useState([]);
    const observerRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState({
        days: '00', hours: '00', minutes: '00', seconds: '00'
    });

    const timeSlots = [
        { id: 'slot1', time: '09:00', label: 'Đang diễn ra', active: true },
        { id: 'slot2', time: '14:00', label: 'Sắp diễn ra', active: false },
        { id: 'slot3', time: '20:00', label: 'Sắp diễn ra', active: false }
    ];

    const flashVouchers = [
        { id: 'v1', value: '50K', minOrder: 'Đơn từ 400K', desc: 'Áp dụng cho mọi dòng giày thể thao', code: 'FLASH50' },
        { id: 'v2', value: '100K', minOrder: 'Đơn từ 800K', desc: 'Áp dụng cho chủ thẻ thành viên VIP', code: 'VIP100' },
        { id: 'v3', value: 'Freeship', minOrder: 'Đơn tối thiểu 0đ', desc: 'Miễn phí vận chuyển tối đa 30K', code: 'FSFREE' }
    ];

    const fetchFlashSale = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/flash-sales/active');
            if (response.data && response.data.success && response.data.hasActiveCampaign) {
                setCampaign(response.data.campaign);
                setProducts(response.data.products || []);
            }
        } catch (error) {
            console.error("Lỗi lấy dữ liệu Flash Sale:", error);
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
                alert("Vui lòng đăng nhập để sử dụng tính năng này!");
                navigate('/login');
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Đã xảy ra lỗi khi xử lý yêu thích." }));
            }
        }
    };

    const handleClaimVoucher = (voucherId) => {
        if (claimedVouchers.includes(voucherId)) return;
        setClaimedVouchers([...claimedVouchers, voucherId]);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã lưu mã giảm giá thành công!' }));
    };

    useEffect(() => {
        fetchFlashSale();
        fetchWishlistIds();
    }, []);

    useEffect(() => {
        if (!campaign || !campaign.endDate) return;

        const updateTimer = () => {
            const end = new Date(campaign.endDate).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({
                days: String(d).padStart(2, '0'),
                hours: String(h).padStart(2, '0'),
                minutes: String(m).padStart(2, '0'),
                seconds: String(s).padStart(2, '0')
            });
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer();

        return () => clearInterval(timerId);
    }, [campaign]);

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
                observerRef.current?.observe(el);
            });
        }, 100);

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [loading, products, activeBrand, sortBy, selectedSlot]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const getDiscountPercent = (p) => {
        if (!p || !p.product || p.product.oldPrice <= 0) return 0;
        return Math.round(((p.product.oldPrice - p.salePrice) * 100) / p.product.oldPrice);
    };

    const getStockInfo = (id) => {
        const key = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const limit = 20 + (key % 20); // limit 20 to 40
        const sold = 5 + (key % (limit - 5)); 
        const percent = Math.round((sold / limit) * 100);
        return { sold, limit, percent };
    };

    // Extract unique brands dynamically
    const brands = ['All', ...new Set(products.filter(p => p && p.product && p.product.brandName).map(p => p.product.brandName))];

    // Filter products by brand
    let filteredProducts = activeBrand === 'All'
        ? products
        : products.filter(p => p && p.product && p.product.brandName === activeBrand);

    // Sort products
    filteredProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === 'priceAsc') {
            return a.salePrice - b.salePrice;
        }
        if (sortBy === 'priceDesc') {
            return b.salePrice - a.salePrice;
        }
        if (sortBy === 'discountDesc') {
            return getDiscountPercent(b) - getDiscountPercent(a);
        }
        return 0; // default
    });

    // Spotlight product (highest discount)
    const spotlightProduct = products.length > 0 
        ? [...products].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))[0]
        : null;

    // Grid products
    const gridProducts = spotlightProduct
        ? filteredProducts.filter(p => p.id !== spotlightProduct.id)
        : filteredProducts;

    return (
        <Layout>
            <div className="fs-page">
                {/* CINEMATIC HEADER WITH COUNTDOWN */}
                <div className="fs-header">
                    <div className="fs-header-content container">
                        <span className="fs-tagline">Giờ vàng giá sốc</span>
                        <h1 className="fs-title">Săn Deal <span>Flash Sale</span></h1>
                        
                        {campaign && selectedSlot === 'slot1' && (
                            <div className="d-flex justify-content-center mt-3">
                                <div className="fs-countdown">
                                    <div className="cd-block">
                                        <span className="cd-num">{timeLeft.days}</span>
                                        <span className="cd-txt">NGÀY</span>
                                    </div>
                                    <span className="cd-colon">:</span>
                                    <div className="cd-block">
                                        <span className="cd-num">{timeLeft.hours}</span>
                                        <span className="cd-txt">GIỜ</span>
                                    </div>
                                    <span className="cd-colon">:</span>
                                    <div className="cd-block">
                                        <span className="cd-num">{timeLeft.minutes}</span>
                                        <span className="cd-txt">PHÚT</span>
                                    </div>
                                    <span className="cd-colon">:</span>
                                    <div className="cd-block">
                                        <span className="cd-num">{timeLeft.seconds}</span>
                                        <span className="cd-txt">GIÂY</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedSlot !== 'slot1' && (
                            <div className="text-white-50 mt-3 fs-6 fw-bold">
                                <i className="fa-solid fa-bell text-warning me-2"></i> Khung giờ này sắp diễn ra. Hãy đăng ký nhận thông báo!
                            </div>
                        )}
                    </div>
                </div>

                <div className="container py-5">
                    {/* TIME SLOTS BAR */}
                    <div className="fs-time-slots reveal-item opacity-0">
                        {timeSlots.map(slot => (
                            <button
                                key={slot.id}
                                className={`fs-time-slot-btn ${selectedSlot === slot.id ? 'active' : ''}`}
                                onClick={() => setSelectedSlot(slot.id)}
                            >
                                <span className="fs-time-slot-time">{slot.time}</span>
                                <span className="fs-time-slot-status">{slot.label}</span>
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="fs-loader">
                            <div className="fs-spinner"></div>
                        </div>
                    ) : products.length > 0 ? (
                        <>
                            {selectedSlot === 'slot1' ? (
                                <>
                                    {/* REDESIGNED SPOTLIGHT HERO FEATURE - KHÔNG ĐỤNG HÀNG */}
                                    {spotlightProduct && (
                                        <div className="fs-hero-deal reveal-item opacity-0 mb-5">
                                            <div className="fs-hero-glow"></div>
                                            <div className="row align-items-center g-5 position-relative" style={{ zIndex: 2 }}>
                                                <div className="col-lg-7 text-start">
                                                    <div className="fs-hero-badge-wrap">
                                                        <i className="fa-solid fa-fire text-danger animate__animated animate__pulse animate__infinite"></i>
                                                        <span>DEAL CHÁY NHẤT HỆ THỐNG</span>
                                                    </div>
                                                    <h2 className="fs-hero-title-big">{spotlightProduct.product.productName}</h2>
                                                    <div className="fs-brand text-danger fw-bold text-uppercase mb-3" style={{ letterSpacing: '3px', fontSize: '14px' }}>
                                                        Thương hiệu: {spotlightProduct.product.brandName}
                                                    </div>
                                                    
                                                    <p className="fs-hero-desc">
                                                        Đây là cơ hội độc quyền duy nhất trong khung giờ này. Đôi sneaker huyền thoại {spotlightProduct.product.productName} đang có mức giảm giá lịch sử. Số lượng mở bán có hạn và kích cỡ đang hết rất nhanh!
                                                    </p>

                                                    {/* SPOTLIGHT PROGRESS BAR */}
                                                    {(() => {
                                                        const spotStock = getStockInfo(spotlightProduct.id);
                                                        return (
                                                            <div className="fs-card-progress mb-4" style={{ maxWidth: '450px' }}>
                                                                <div className="fs-progress-text text-white-50">
                                                                    <span><i className="fa-solid fa-hourglass-start text-danger me-1 animate__animated animate__flash animate__infinite"></i> Đang được săn lùng</span>
                                                                    <span>Đã bán {spotStock.sold}/{spotStock.limit} sản phẩm</span>
                                                                </div>
                                                                <div className="fs-progress-bar-bg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                                                    <div className="fs-progress-bar-fill" style={{ width: `${spotStock.percent}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    <div className="d-flex flex-wrap align-items-center gap-4 mb-4">
                                                        <div className="fs-hero-price-tag">
                                                            <span className="fs-hero-price-new">{formatCurrency(spotlightProduct.salePrice)}</span>
                                                            <span className="fs-hero-price-old">{formatCurrency(spotlightProduct.product.oldPrice)}</span>
                                                        </div>
                                                        <span className="badge bg-danger text-white px-3 py-2 fw-bold animate__animated animate__heartBeat animate__infinite" style={{ borderRadius: '10px', fontSize: '14px' }}>
                                                            TIẾT KIỆM {getDiscountPercent(spotlightProduct)}%
                                                        </span>
                                                    </div>

                                                    <div className="d-flex gap-3">
                                                        <Link 
                                                            to={`/details?id=${spotlightProduct.product.id}`}
                                                            className="fs-hero-btn-buy text-decoration-none d-inline-flex align-items-center"
                                                        >
                                                            MUA NGAY HÔM NAY <i className="fa-solid fa-arrow-right ms-2"></i>
                                                        </Link>
                                                        <button 
                                                            className={`fs-hero-btn-wish ${wishlistIds.includes(spotlightProduct.product.id) ? 'active' : ''}`}
                                                            onClick={(e) => toggleWishlist(e, spotlightProduct.product.id)}
                                                        >
                                                            <i className={wishlistIds.includes(spotlightProduct.product.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="col-lg-5 text-center">
                                                    <Link to={`/details?id=${spotlightProduct.product.id}`}>
                                                        <img 
                                                            src={getImageUrl(spotlightProduct.product.imageUrl)} 
                                                            alt={spotlightProduct.product.productName} 
                                                            className="fs-hero-shoe-img"
                                                        />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* EXCLUSIVE FLASH VOUCHERS */}
                                    <div className="fs-vouchers-section mb-5 reveal-item opacity-0">
                                        <div className="text-center mb-4">
                                            <span className="fs-section-tag">ƯU ĐÃI ĐỘC QUYỀN</span>
                                            <h2 className="fs-section-title">MÃ GIẢM GIÁ GIỜ VÀNG</h2>
                                            <p className="fs-section-subtitle">Lưu nhanh các mã giảm giá đặc quyền chỉ có trong khung giờ Flash Sale này.</p>
                                        </div>
                                        
                                        <div className="fs-vouchers-container">
                                            {flashVouchers.map(v => {
                                                const isClaimed = claimedVouchers.includes(v.id);
                                                return (
                                                    <div key={v.id} className="fs-voucher-card">
                                                        <div className="fs-voucher-left">
                                                            <div className="fs-voucher-value">{v.value.replace('K', '')}<span>{v.value.includes('K') ? 'K' : ''}</span></div>
                                                            <div className="fs-voucher-type">GIẢM GIÁ</div>
                                                        </div>
                                                        <div className="fs-voucher-right">
                                                            <div>
                                                                <div className="fs-voucher-title">{v.minOrder}</div>
                                                                <div className="fs-voucher-desc">{v.desc}</div>
                                                            </div>
                                                            <button 
                                                                className={`fs-voucher-btn ${isClaimed ? 'claimed' : ''}`}
                                                                onClick={() => handleClaimVoucher(v.id)}
                                                                disabled={isClaimed}
                                                            >
                                                                {isClaimed ? <><i className="fa-solid fa-check me-1"></i> ĐÃ LƯU</> : 'LƯU MÃ'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* FILTER & SORT CONTROLS */}
                                    <div className="fs-controls-wrap">
                                        <div className="fs-brands-filter">
                                            {brands.map(brand => (
                                                <button
                                                    key={brand}
                                                    className={`fs-filter-pill ${activeBrand === brand ? 'active' : ''}`}
                                                    onClick={() => setActiveBrand(brand)}
                                                >
                                                    {brand === 'All' ? 'Tất cả' : brand}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="fs-sort-select-wrapper">
                                            <label htmlFor="fs-sort" className="fs-sort-label">Sắp xếp:</label>
                                            <select 
                                                id="fs-sort"
                                                className="fs-sort-select"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                            >
                                                <option value="default">Mặc định</option>
                                                <option value="discountDesc">Chiết khấu: Cao đến Thấp</option>
                                                <option value="priceAsc">Giá: Thấp đến Cao</option>
                                                <option value="priceDesc">Giá: Cao đến Thấp</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Live Counter */}
                                    <div className="fs-counter-text">
                                        Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm khuyến mãi
                                    </div>

                                    {gridProducts.length > 0 ? (
                                        <div className="row g-4">
                                            {gridProducts.map((p, idx) => {
                                                const discountPercent = getDiscountPercent(p);
                                                const stock = getStockInfo(p.id);
                                                return (
                                                    <div key={p.id} className="col-lg-3 col-md-4 col-6 reveal-item opacity-0" style={{ animationDelay: `${(idx % 4) * 0.1}s` }}>
                                                        <div className="fs-card">
                                                            <Link to={`/details?id=${p.product.id}`} className="stretched-link" style={{ zIndex: 1 }}></Link>

                                                            <div className="fs-img-box">
                                                                {discountPercent > 0 && <span className="fs-badge">GIẢM {discountPercent}%</span>}
                                                                <img src={getImageUrl(p.product.imageUrl)} alt={p.product.productName} />
                                                                <button 
                                                                    className={`fs-wish-btn ${wishlistIds.includes(p.product.id) ? 'active' : ''}`}
                                                                    onClick={(e) => toggleWishlist(e, p.product.id)}
                                                                    style={{ zIndex: 10 }}
                                                                >
                                                                    <i className={wishlistIds.includes(p.product.id) ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="fs-info">
                                                                <div className="fs-brand-row">
                                                                    <span className="fs-brand">{p.product.brandName}</span>
                                                                </div>
                                                                <h5 className="fs-name">
                                                                    {p.product.productName}
                                                                </h5>
                                                                <div className="fs-price-row">
                                                                    <span className="fs-price-new">{formatCurrency(p.salePrice)}</span>
                                                                    {p.product.oldPrice > 0 && (
                                                                        <span className="fs-price-old">{formatCurrency(p.product.oldPrice)}</span>
                                                                    )}
                                                                </div>

                                                                {/* CARD PROGRESS BAR */}
                                                                <div className="fs-card-progress">
                                                                    <div className="fs-progress-text">
                                                                        <span>{stock.percent >= 80 ? <><i className="fa-solid fa-fire text-danger me-1"></i>Sắp cháy hàng</> : 'Đang bán chạy'}</span>
                                                                        <span>Đã bán {stock.sold}/{stock.limit}</span>
                                                                    </div>
                                                                    <div className="fs-progress-bar-bg">
                                                                        <div className="fs-progress-bar-fill" style={{ width: `${stock.percent}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="fs-card-footer" style={{ position: 'relative', zIndex: 10 }}>
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.product.id}`); }} 
                                                                    className="fs-btn-cart"
                                                                    title="Thêm vào giỏ"
                                                                >
                                                                    <i className="fa-solid fa-cart-plus"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.product.id}`); }} 
                                                                    className="fs-btn-buy"
                                                                >
                                                                    MUA NGAY
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-5 text-center bg-white border rounded-5 my-4">
                                            <p className="text-muted m-0">Không còn sản phẩm nào phù hợp với bộ lọc thương hiệu.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* UPCOMING DEALS TAB PREVIEW */
                                <div className="reveal-item opacity-0">
                                    <div className="text-center py-5 bg-white border rounded-5 mb-5 shadow-sm">
                                        <i className="fa-regular fa-bell fa-3x text-warning mb-3 animate__animated animate__swing animate__infinite"></i>
                                        <h3 className="fw-bold">KHUNG GIỜ CHƯA BẮT ĐẦU</h3>
                                        <p className="text-muted mx-auto" style={{ maxWidth: '500px' }}>
                                            Các sản phẩm trong khung giờ này đang được chuẩn bị. Bạn có thể xem trước và nhấn đăng ký nhận thông báo để không bỏ lỡ khi bắt đầu mở bán!
                                        </p>
                                    </div>

                                    <div className="row g-4">
                                        {products.slice(0, 4).map((p, idx) => {
                                            const discountPercent = getDiscountPercent(p);
                                            return (
                                                <div key={p.id} className="col-lg-3 col-md-4 col-6">
                                                    <div className="fs-card" style={{ opacity: 0.85 }}>
                                                        <div className="fs-img-box">
                                                            {discountPercent > 0 && <span className="fs-badge bg-secondary">SẮP GIẢM {discountPercent}%</span>}
                                                            <img src={getImageUrl(p.product.imageUrl)} alt={p.product.productName} />
                                                        </div>
                                                        
                                                        <div className="fs-info">
                                                            <div className="fs-brand-row">
                                                                    <span className="fs-brand text-secondary">{p.product.brandName}</span>
                                                            </div>
                                                            <h5 className="fs-name">
                                                                {p.product.productName}
                                                            </h5>
                                                            <div className="fs-price-row">
                                                                <span className="fs-price-new text-secondary">{formatCurrency(p.salePrice)}</span>
                                                                {p.product.oldPrice > 0 && (
                                                                    <span className="fs-price-old">{formatCurrency(p.product.oldPrice)}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="fs-card-footer">
                                                            <button 
                                                                onClick={(e) => { e.preventDefault(); alert("Đã đăng ký nhận thông báo thành công!"); }} 
                                                                className="btn btn-dark w-100 py-2 rounded-3 fw-bold fs-6"
                                                            >
                                                                <i className="fa-regular fa-bell me-2"></i> NHẬN THÔNG BÁO
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* UNIQUE SNEAKER COMBO DEALS */}
                            <div className="fs-combos-section my-5 reveal-item opacity-0">
                                <div className="text-center mb-5">
                                    <span className="fs-section-tag">ƯU ĐÃI ĐI KÈM</span>
                                    <h2 className="fs-section-title">FLASH COMBO DEALS</h2>
                                    <p className="fs-section-subtitle">Nhân đôi ưu đãi khi mua kèm các phụ kiện sneaker chính hãng dưới đây.</p>
                                </div>
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="fs-combo-card">
                                            <span className="fs-combo-badge">GIẢM 20%</span>
                                            <div className="fs-combo-content">
                                                <h5>COMBO CHĂM SÓC GIÀY CHUYÊN SÂU</h5>
                                                <p>Mua đôi giày Flash Sale bất kỳ kèm Bộ vệ sinh giày Crep Protect để được chiết khấu ngay 20% cho bộ vệ sinh.</p>
                                                <Link to="/shop" className="fs-combo-link">Mua ngay combo <i className="fa-solid fa-arrow-right"></i></Link>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="fs-combo-card">
                                            <span className="fs-combo-badge">GIẢM 30%</span>
                                            <div className="fs-combo-content">
                                                <h5>COMBO VỚ THỂ THAO DỆT KIM</h5>
                                                <p>Mua đôi giày Flash Sale bất kỳ kèm Set 3 đôi vớ Cotton cao cấp chống hôi chân để được chiết khấu ngay 30% cho vớ.</p>
                                                <Link to="/shop" className="fs-combo-link">Mua ngay combo <i className="fa-solid fa-arrow-right"></i></Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* REALTIME SHOPPING LIVE ACTIVITY */}
                            <div className="fs-live-activity my-5 reveal-item opacity-0">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <span className="fs-live-dot"></span>
                                    <h4 className="m-0 fw-bold fs-5 text-uppercase" style={{ letterSpacing: '1px' }}>Hoạt động mua sắm thời gian thực</h4>
                                </div>
                                <div className="fs-activity-card">
                                    <div className="fs-activity-item">
                                        <i className="fa-solid fa-cart-shopping text-danger"></i>
                                        <span>Khách hàng <strong>Lê Minh H.</strong> vừa săn thành công đôi **Nike Air Max** (Tiết kiệm 30%)</span>
                                        <span className="fs-activity-time">30 giây trước</span>
                                    </div>
                                    <div className="fs-activity-item">
                                        <i className="fa-solid fa-ticket text-warning"></i>
                                        <span>Khách hàng <strong>Trần Quốc T.</strong> vừa áp dụng thành công mã giảm giá **FLASH50**</span>
                                        <span className="fs-activity-time">2 phút trước</span>
                                    </div>
                                    <div className="fs-activity-item">
                                        <i className="fa-solid fa-cart-shopping text-danger"></i>
                                        <span>Khách hàng <strong>Nguyễn Thị D.</strong> vừa săn thành công đôi **Adidas Ultraboost** (Tiết kiệm 25%)</span>
                                        <span className="fs-activity-time">5 phút trước</span>
                                    </div>
                                </div>
                            </div>

                            {/* SPEED SHOPPING TIPS GUIDE */}
                            <div className="fs-guide-section my-5 reveal-item opacity-0">
                                <div className="text-center mb-5">
                                    <span className="fs-section-tag">HƯỚNG DẪN MUA SẮM</span>
                                    <h2 className="fs-section-title">MẸO SĂN DEAL GIỜ VÀNG</h2>
                                    <p className="fs-section-subtitle">Flash Sale có số lượng giới hạn, lưu ngay các mẹo sau để tăng tỷ lệ săn deal thành công.</p>
                                </div>
                                
                                <div className="row g-4">
                                    <div className="col-lg-4">
                                        <div className="fs-guide-card">
                                            <div className="fs-guide-num">01</div>
                                            <h5>Chuẩn bị sẵn size giày</h5>
                                            <p>Số lượng size của mỗi sản phẩm có hạn. Bạn hãy xác định chính xác size chân của mình trước giờ mở bán để chọn nhanh nhất có thể.</p>
                                        </div>
                                    </div>
                                    <div className="col-lg-4">
                                        <div className="fs-guide-card">
                                            <div className="fs-guide-num">02</div>
                                            <h5>Lưu mã giảm giá trước</h5>
                                            <p>Các mã giảm giá sẽ tự động hết lượt sử dụng rất nhanh. Hãy nhấn lưu mã trước tại khu vực mã giảm giá ở trên để hệ thống tự áp dụng.</p>
                                        </div>
                                    </div>
                                    <div className="col-lg-4">
                                        <div className="fs-guide-card">
                                            <div className="fs-guide-num">03</div>
                                            <h5>Thanh toán nhanh chóng</h5>
                                            <p>Sản phẩm trong giỏ hàng chỉ được giữ tối đa 15 phút. Bạn nên thanh toán sớm bằng chuyển khoản hoặc ví điện tử để tránh bị hủy đơn.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ACCORDION RULES SECTION */}
                            <div className="fs-rules my-5 reveal-item opacity-0">
                                <div className="text-center mb-5">
                                    <span className="fs-section-tag">QUY ĐỊNH MUA HÀNG</span>
                                    <h2 className="fs-section-title">THỂ LỆ THAM GIA FLASH SALE</h2>
                                    <p className="fs-section-subtitle">Để đảm bảo tính công bằng cho tất cả khách hàng tham gia săn deal giờ vàng.</p>
                                </div>
                                
                                <div className="row g-4">
                                    <div className="col-md-4">
                                        <div className="fs-rule-item">
                                            <i className="fa-solid fa-user-shield"></i>
                                            <h5>Giới hạn số lượng</h5>
                                            <p>Mỗi tài khoản khách hàng chỉ được mua tối đa 1 sản phẩm khuyến mãi cùng loại trong suốt thời gian diễn ra chiến dịch.</p>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="fs-rule-item">
                                            <i className="fa-solid fa-basket-shopping"></i>
                                            <h5>Giữ hàng trong giỏ</h5>
                                            <p>Sản phẩm trong giỏ hàng sẽ chỉ được giữ tạm thời trong vòng 15 phút. Bạn vui lòng hoàn thành thanh toán sớm để đảm bảo đơn hàng.</p>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="fs-rule-item">
                                            <i className="fa-solid fa-truck-ramp-box"></i>
                                            <h5>Vận chuyển & đổi trả</h5>
                                            <p>Các đơn hàng Flash Sale vẫn được hưởng đầy đủ chính sách miễn phí vận chuyển toàn quốc và đổi trả linh hoạt trong vòng 7 ngày.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PROMO MEMBERSHIP BANNER */}
                            <div className="fs-promo-banner my-5 reveal-item opacity-0">
                                <div className="container">
                                    <div className="fs-promo-content text-center py-5">
                                        <span className="fs-promo-tag">SHOESSTORE MEMBERSHIP</span>
                                        <h2>Đăng Ký Thành Viên Nhận Thông Báo Deal Sớm</h2>
                                        <p>Đăng ký tài khoản ngay hôm nay để nhận thông báo sớm nhất về các khung giờ Flash Sale tiếp theo, nhận ngay mã voucher ưu tiên và quyền mua trước các dòng sneaker giới hạn.</p>
                                        <Link to="/register" className="fs-promo-btn text-decoration-none">ĐĂNG KÝ NGAY</Link>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="fs-empty mx-auto">
                            <i className="fa-solid fa-clock fa-3x text-muted mb-3"></i>
                            <h3>Chưa có chương trình khuyến mãi</h3>
                            <p>Săn Deal Giờ Vàng hiện đang tạm nghỉ. Vui lòng quay lại sau!</p>
                            <Link to="/shop" className="fs-btn-back text-decoration-none">
                                <i className="fa-solid fa-arrow-left"></i> TIẾP TỤC MUA SẮM
                            </Link>
                        </div>
                    )}
                </div>

                {/* TRUST COMMITMENTS */}
                <div className="fs-commitments py-4 border-top">
                    <div className="container text-center">
                        <span className="text-secondary fw-bold text-uppercase fs-6" style={{ letterSpacing: '1px' }}>
                            <i className="fa-solid fa-shield-check text-danger me-2"></i> Cam kết uy tín cùng khách hàng mua sắm tại ShoesStore
                        </span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FlashSale;