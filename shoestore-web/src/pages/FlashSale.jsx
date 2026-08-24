import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './FlashSale.css';
import './Membership.css';

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

    const [timeSlots, setTimeSlots] = useState([
        { id: 'slot1', time: '09:00', label: 'Đang diễn ra', active: true },
        { id: 'slot2', time: '14:00', label: 'Sắp diễn ra', active: false },
        { id: 'slot3', time: '20:00', label: 'Sắp diễn ra', active: false }
    ]);

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
                const allCampaigns = response.data.campaigns || [response.data.campaign];
                const activeCmp = response.data.campaign || allCampaigns[0];
                
                setCampaign(activeCmp);
                setProducts(activeCmp.products || response.data.products || []);
                
                const parseDate = (str) => {
                    if (!str) return new Date();
                    if (typeof str === 'string' && !str.endsWith('Z') && !str.includes('+')) {
                        return new Date(str.replace('T', ' '));
                    }
                    return new Date(str);
                };

                const slots = allCampaigns.map((c, idx) => {
                    const startStr = c.startDate ? String(c.startDate) : '';
                    let hourStr = '00:00';
                    if (startStr.includes('T')) {
                        const timePart = startStr.split('T')[1];
                        hourStr = timePart.substring(0, 5);
                    } else if (startStr.includes(' ')) {
                        const timePart = startStr.split(' ')[1];
                        hourStr = timePart.substring(0, 5);
                    }

                    const startDateObj = parseDate(c.startDate);
                    const today = new Date();
                    
                    const isToday = startDateObj.getDate() === today.getDate() &&
                                    startDateObj.getMonth() === today.getMonth() &&
                                    startDateObj.getFullYear() === today.getFullYear();

                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    const isTomorrow = startDateObj.getDate() === tomorrow.getDate() &&
                                       startDateObj.getMonth() === tomorrow.getMonth() &&
                                       startDateObj.getFullYear() === tomorrow.getFullYear();

                    let dateTag = '';
                    if (!isToday) {
                        if (isTomorrow) {
                            dateTag = 'Ngày mai';
                        } else {
                            const day = String(startDateObj.getDate()).padStart(2, '0');
                            const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
                            dateTag = `${day}/${month}`;
                        }
                    }

                    let statusLabel = c.isLive ? 'Đang diễn ra' : 'Sắp diễn ra';

                    return {
                        id: `slot_${c.id || idx}`,
                        time: hourStr,
                        dateTag: dateTag,
                        label: statusLabel,
                        campaignData: c,
                        productsData: c.products || []
                    };
                });

                setTimeSlots(slots);
                if (slots.length > 0) {
                    setSelectedSlot(slots[0].id);
                }
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
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Vui lòng đăng nhập để sử dụng tính năng này!" }));
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

        const parseDate = (str) => {
            if (!str) return new Date();
            if (typeof str === 'string' && !str.endsWith('Z') && !str.includes('+')) {
                return new Date(str.replace('T', ' '));
            }
            return new Date(str);
        };

        const updateTimer = () => {
            const start = parseDate(campaign.startDate).getTime();
            const end = parseDate(campaign.endDate).getTime();
            const now = new Date().getTime();
            
            let target = end;
            if (campaign.isUpcoming || now < start) {
                target = start; // Countdown to start time if upcoming
            }
            
            const diff = target - now;

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

    // Grid products (don't exclude spotlight product so the grid is never empty if there are products)
    const gridProducts = filteredProducts;

    const isCampaignUpcoming = campaign ? Boolean(campaign.isUpcoming) : false;

    const handleSlotClick = (slot) => {
        setSelectedSlot(slot.id);
        if (slot.campaignData) {
            setCampaign(slot.campaignData);
            setProducts(slot.productsData || []);
        }
    };

    return (
        <Layout>
            <div className="fs-page">
                {/* CREATIVE NEON FLASH SALE HEADER */}
                <div className="fs-creative-header">
                    <div className="fs-electric-bg"></div>
                    <div className="container text-center position-relative z-1">
                        <span className="fs-neon-tag">GIỜ VÀNG GIÁ SỐC</span>
                        <h1 className="fs-glitch-title mt-3 animate__animated animate__zoomIn">
                            {isCampaignUpcoming ? 'SẮP DIỄN RA ' : 'SĂN DEAL '} 
                            <span className="text-flash">FLASH SALE</span>
                        </h1>
                        
                        {campaign && (
                            <div className="d-flex justify-content-center mt-3 flex-column align-items-center">
                                {isCampaignUpcoming && (
                                    <div className="text-warning fw-bold mb-2 fs-5">
                                        <i className="fa-solid fa-clock me-2"></i> {selectedSlot === 'slot1' ? 'CHƯƠNG TRÌNH BẮT ĐẦU SAU:' : 'KHUNG GIỜ SẮP DIỄN RA:'}
                                    </div>
                                )}
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
                    </div>
                </div>

                <div className="container py-5">
                    {/* TIME SLOTS BAR */}
                    <div className="fs-time-slots reveal-item opacity-0">
                        {timeSlots.map(slot => (
                            <button
                                key={slot.id}
                                className={`fs-time-slot-btn ${selectedSlot === slot.id ? 'active' : ''}`}
                                onClick={() => handleSlotClick(slot)}
                            >
                                <span className="fs-time-slot-time">
                                    {slot.time}
                                    {slot.dateTag && (
                                        <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '10px', verticalAlign: 'middle', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                            {slot.dateTag}
                                        </span>
                                    )}
                                </span>
                                <span className="fs-time-slot-status">
                                    {slot.dateTag ? `${slot.label} (${slot.dateTag})` : slot.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="fs-loader">
                            <div className="fs-spinner"></div>
                        </div>
                    ) : products.length > 0 ? (
                        <>
                            {/* REDESIGNED SPOTLIGHT HERO FEATURE */}
                            {spotlightProduct && (
                                <div className="fs-hero-deal reveal-item opacity-0 mb-5">
                                    <div className="fs-hero-glow"></div>
                                    <div className="row align-items-center g-5 position-relative" style={{ zIndex: 2 }}>
                                        <div className="col-lg-7 text-start">
                                            <div className="fs-hero-badge-wrap">
                                                <i className="fa-solid fa-fire text-danger animate__animated animate__pulse animate__infinite"></i>
                                                <span>{isCampaignUpcoming ? 'SẮP GIẢM SỐC KHUNG GIỜ TỚI' : 'DEAL CHÁY NHẤT HỆ THỐNG'}</span>
                                            </div>
                                            <h2 className="fs-hero-title-big">{spotlightProduct.product.productName}</h2>
                                            <div className="fs-brand text-danger fw-bold text-uppercase mb-3" style={{ letterSpacing: '3px', fontSize: '14px' }}>
                                                Thương hiệu: {spotlightProduct.product.brandName}
                                            </div>
                                            
                                            <p className="fs-hero-desc">
                                                {isCampaignUpcoming 
                                                    ? `Đôi sneaker ${spotlightProduct.product.productName} sẽ giảm giá cực sốc còn ${formatCurrency(spotlightProduct.salePrice)} khi khung giờ Flash Sale chính thức bắt đầu!`
                                                    : `Đây là cơ hội độc quyền duy nhất trong khung giờ này. Đôi sneaker huyền thoại ${spotlightProduct.product.productName} đang có mức giảm giá lịch sử.`
                                                }
                                            </p>

                                            {/* SPOTLIGHT PROGRESS BAR */}
                                            {(() => {
                                                const spotStock = getStockInfo(spotlightProduct.id);
                                                return (
                                                    <div className="fs-card-progress mb-4" style={{ maxWidth: '450px' }}>
                                                        <div className="fs-progress-text text-white-50">
                                                            {isCampaignUpcoming ? (
                                                                <span><i className="fa-solid fa-clock text-warning me-1"></i> Sắp mở bán Flash Sale</span>
                                                            ) : (
                                                                <>
                                                                    <span><i className="fa-solid fa-hourglass-start text-danger me-1 animate__animated animate__flash animate__infinite"></i> Đang được săn lùng</span>
                                                                    <span>Đã bán {spotStock.sold}/{spotStock.limit} sản phẩm</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="fs-progress-bar-bg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                                            <div className="fs-progress-bar-fill" style={{ width: isCampaignUpcoming ? '0%' : `${spotStock.percent}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            
                                            <div className="d-flex flex-wrap align-items-center gap-4 mb-4">
                                                <div className="fs-hero-price-tag">
                                                    {isCampaignUpcoming ? (
                                                        <>
                                                            <span className="fs-hero-price-new">{formatCurrency(spotlightProduct.product.oldPrice)}</span>
                                                            <span className="fs-hero-price-old text-warning" style={{ textDecoration: 'none', fontSize: '15px' }}>
                                                                (Giá Sale: {formatCurrency(spotlightProduct.salePrice)})
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="fs-hero-price-new">{formatCurrency(spotlightProduct.salePrice)}</span>
                                                            <span className="fs-hero-price-old">{formatCurrency(spotlightProduct.product.oldPrice)}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <span className="badge bg-danger text-white px-3 py-2 fw-bold animate__animated animate__heartBeat animate__infinite" style={{ borderRadius: '10px', fontSize: '14px' }}>
                                                    {isCampaignUpcoming ? `SẮP GIẢM ${getDiscountPercent(spotlightProduct)}%` : `TIẾT KIỆM ${getDiscountPercent(spotlightProduct)}%`}
                                                </span>
                                            </div>

                                            <div className="d-flex gap-3">
                                                <Link 
                                                    to={`/details?id=${spotlightProduct.product.id}`}
                                                    className="fs-hero-btn-buy text-decoration-none d-inline-flex align-items-center"
                                                    style={isCampaignUpcoming ? { background: '#333', borderColor: '#555' } : {}}
                                                >
                                                    {isCampaignUpcoming ? 'XEM CHI TIẾT SẢN PHẨM' : 'MUA NGAY HÔM NAY'} <i className="fa-solid fa-arrow-right ms-2"></i>
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
                                Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm {isCampaignUpcoming ? 'sắp khuyến mãi' : 'khuyến mãi'}
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
                                                        {discountPercent > 0 && (
                                                            <span className={`fs-badge ${isCampaignUpcoming ? 'bg-secondary' : ''}`}>
                                                                {isCampaignUpcoming ? `SẮP GIẢM ${discountPercent}%` : `GIẢM ${discountPercent}%`}
                                                            </span>
                                                        )}
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
                                                        <div className="fs-price-row flex-column align-items-start">
                                                            {isCampaignUpcoming ? (
                                                                <>
                                                                    <span className="fs-price-new text-white">{formatCurrency(p.product.oldPrice)}</span>
                                                                    <small className="text-warning fw-bold font-oswald mt-1" style={{ fontSize: '12px' }}>
                                                                        <i className="fa-solid fa-clock me-1"></i>Giá Sale: {formatCurrency(p.salePrice)}
                                                                    </small>
                                                                </>
                                                            ) : (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className="fs-price-new">{formatCurrency(p.salePrice)}</span>
                                                                    {p.product.oldPrice > 0 && (
                                                                        <span className="fs-price-old">{formatCurrency(p.product.oldPrice)}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* CARD PROGRESS BAR */}
                                                        <div className="fs-card-progress">
                                                            <div className="fs-progress-text">
                                                                {isCampaignUpcoming ? (
                                                                    <span><i className="fa-solid fa-clock text-warning me-1"></i>Sắp mở bán</span>
                                                                ) : (
                                                                    <>
                                                                        <span>{stock.percent >= 80 ? <><i className="fa-solid fa-fire text-danger me-1"></i>Sắp cháy hàng</> : 'Đang bán chạy'}</span>
                                                                        <span>Đã bán {stock.sold}/{stock.limit}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="fs-progress-bar-bg">
                                                                <div className="fs-progress-bar-fill" style={{ width: isCampaignUpcoming ? '0%' : `${stock.percent}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="fs-card-footer" style={{ position: 'relative', zIndex: 10 }}>
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.product.id}`); }} 
                                                            className="fs-btn-buy w-100"
                                                            style={isCampaignUpcoming ? { background: '#262626', color: '#bbb', borderColor: '#444' } : {}}
                                                        >
                                                            {isCampaignUpcoming ? 'SẮP DIỄN RA' : 'SĂN NGAY'}
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

                            {/* Removed Combo Deals and Live Activity sections as requested */}

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