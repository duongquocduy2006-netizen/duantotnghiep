import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Home.css';
import QuickCartModal from '../components/QuickCartModal';

const Home = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [flashSaleData, setFlashSaleData] = useState(null);
    const [newArrivals, setNewArrivals] = useState([]);
    const [topSelling, setTopSelling] = useState([]);
    const [brands, setBrands] = useState([]);
    const [banners, setBanners] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    const [quickAddProductId, setQuickAddProductId] = useState(null);
    const observerRef = useRef(null);

    /* ── DATA FETCHING ── */
    const fetchData = async () => {
        try {
            setLoading(true);
            const [flashRes, newRes, topRes, brandRes, bannerRes] = await Promise.all([
                api.get('/api/flash-sales/active').catch(() => ({ data: {} })),
                api.get('/api/products/search?sort=newest').catch(() => ({ data: {} })),
                api.get('/api/products/search').catch(() => ({ data: {} })),
                api.get('/api/brands').catch(() => ({ data: {} })),
                api.get('/api/banners').catch(() => ({ data: [] }))
            ]);

            if (flashRes.data?.success && flashRes.data?.hasActiveCampaign) {
                setFlashSaleData({
                    campaign: flashRes.data.campaign,
                    products: flashRes.data.products || []
                });
            }

            if (newRes.data?.success) {
                setNewArrivals((newRes.data.products || []).slice(0, 8));
            }

            if (topRes.data?.success) {
                const shuffled = (topRes.data.products || []).sort(() => 0.5 - Math.random());
                setTopSelling(shuffled.slice(0, 8));
            }

            if (brandRes.data?.success) {
                setBrands(brandRes.data.brands || []);
            } else if (Array.isArray(brandRes.data)) {
                setBrands(brandRes.data);
            }

            if (bannerRes.data && Array.isArray(bannerRes.data)) {
                const active = bannerRes.data.filter(b => b.status === true);
                if (active.length > 0) {
                    const sorted = (active[0].images || []).sort((a, b) => a.displayOrder - b.displayOrder);
                    setBanners(sorted);
                }
            }
        } catch (e) {
            console.error('Lỗi trang chủ:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchWishlistIds = async () => {
        try {
            const res = await api.get('/api/favourites/ids');
            if (res.data?.success) setWishlistIds(res.data.ids || []);
        } catch (_) { }
    };

    const toggleWishlist = async (e, productId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await api.post('/api/favourites/toggle', { productId });
            if (res.data?.success) {
                if (res.data.action === 'added') setWishlistIds(p => [...p, productId]);
                else setWishlistIds(p => p.filter(id => id !== productId));
            } else {
                alert(res.data?.message || 'Vui lòng đăng nhập!');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                alert('Vui lòng đăng nhập!');
                navigate('/login');
            }
        }
    };

    /* ── EFFECTS ── */
    useEffect(() => { fetchData(); fetchWishlistIds(); }, []);

    useEffect(() => {
        if (!flashSaleData?.campaign?.endDate) return;
        const update = () => {
            const diff = new Date(flashSaleData.campaign.endDate).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' }); return; }
            setTimeLeft({
                days: String(Math.floor(diff / 86400000)).padStart(2, '0'),
                hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
                minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
                seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
            });
        };
        const id = setInterval(update, 1000);
        update();
        return () => clearInterval(id);
    }, [flashSaleData]);

    useEffect(() => {
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate__animated', 'animate__fadeInUp', 'god-visible');
                    entry.target.classList.remove('god-hidden');
                    observerRef.current.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        const timer = setTimeout(() => {
            document.querySelectorAll('.reveal-item').forEach(el => observerRef.current?.observe(el));
        }, 120);

        return () => { clearTimeout(timer); observerRef.current?.disconnect(); };
    }, [loading, newArrivals, topSelling, brands]);

    /* ── HELPERS ── */
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const imgUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const clean = url.startsWith('/') ? url : '/images/' + url;
        return `http://localhost:8080${clean}`;
    };

    /* Kiểm tra URL ảnh có hợp lệ không (không phải screenshot, IDE...) */
    const isShoesImg = (url) => {
        if (!url) return false;
        if (!url.startsWith('http')) return true; // local path → OK
        // Unsplash / Cloudinary / backend → OK; tránh ảnh IDE screenshot
        return true;
    };

    /* ── LOADING STATE ── */
    if (loading) {
        return (
            <Layout>
                <div className="d-flex flex-column align-items-center justify-content-center bg-black"
                    style={{ minHeight: '100vh' }}>
                    <div className="spinner-grow text-white" role="status" style={{ width: '3.5rem', height: '3.5rem' }} />
                    <h2 className="font-oswald text-white mt-4" style={{ letterSpacing: 4 }}>ĐANG TẢI...</h2>
                </div>
            </Layout>
        );
    }

    /* ── HERO CAROUSEL SLIDES ── */
    const fallbackSlides = [
        {
            img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1920&q=80',
            tag: 'BỘ SƯU TẬP 2025',
            title: 'VĂN HÓA\nĐƯỜNG PHỐ.',
            cta: '/shop',
            ctaText: 'KHÁM PHÁ NGAY',
            align: 'start',
            watermark: 'STREET'
        },
        {
            img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1920&q=80',
            tag: 'PHIÊN BẢN ĐỘC QUYỀN',
            title: 'PHONG CÁCH\nĐỈNH CAO.',
            cta: '/shop',
            ctaText: 'MUA SẮM NGAY',
            align: 'end',
            watermark: 'HYPE'
        },
        {
            img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1920&q=80',
            tag: 'PHONG CÁCH SỐNG',
            title: 'KHÔNG\nGIỚI HẠN.',
            cta: '/flash-sale',
            ctaText: 'SĂN DEAL NGAY',
            align: 'center',
            watermark: 'MOVE'
        },
    ];

    return (
        <Layout>
            <div className="home-god-tier position-relative">
                {/* ══════════════════════════════════════════
                    HERO CAROUSEL
                ══════════════════════════════════════════ */}
                <div id="godCarousel"
                    className="carousel slide carousel-fade god-carousel-wrapper"
                    data-bs-ride="carousel"
                    data-bs-interval="5500">

                    {/* Indicators */}
                    <div className="carousel-indicators god-indicators">
                        {(banners.length > 0 ? banners : fallbackSlides).map((_, i) => (
                            <button key={i} type="button"
                                data-bs-target="#godCarousel"
                                data-bs-slide-to={i}
                                className={i === 0 ? 'active' : ''}
                                aria-label={`Slide ${i + 1}`} />
                        ))}
                    </div>

                    {/* Slides */}
                    <div className="carousel-inner">
                        {banners.length > 0
                            ? banners.map((b, i) => (
                                <div key={b.id || i} className={`carousel-item god-carousel-item ${i === 0 ? 'active' : ''}`}>
                                    <img src={imgUrl(b.imageUrl)} alt={`Banner ${i + 1}`} />
                                    <div className="god-carousel-overlay d-flex align-items-center"
                                        style={{
                                            background: 'linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)'
                                        }}>
                                        <div className="container position-relative z-3">
                                            <div className="god-watermark-hero">
                                                {['STREET', 'HYPE', 'MOVE'][i] || 'STYLE'}
                                            </div>
                                            <div className={`god-carousel-caption ${i % 2 === 1 ? 'ms-auto animate__animated animate__fadeInRight'
                                                : 'animate__animated animate__fadeInLeft'}`}>
                                                <div className="god-tag">
                                                    {i === 0 ? 'BỘ SƯU TẬP MỚI' : i === 1 ? 'PHIÊN BẢN ĐỘC QUYỀN' : 'PHONG CÁCH SỐNG'}
                                                </div>
                                                <h1 className="god-hero-title"
                                                    dangerouslySetInnerHTML={{
                                                        __html: i === 0 ? 'VĂN HÓA<br/>ĐƯỜNG PHỐ.'
                                                            : i === 1 ? 'PHONG CÁCH<br/>ĐỈNH CAO.'
                                                                : 'KHÔNG<br/>GIỚI HẠN.'
                                                    }} />
                                                <Link to={i === 2 ? '/flash-sale' : '/shop'}
                                                    className="btn-god-tier mt-5 d-inline-block">
                                                    <span>{i === 0 ? 'KHÁM PHÁ NGAY' : i === 1 ? 'MUA SẮM NGAY' : 'SĂN DEAL NGAY'}</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                            : fallbackSlides.map((s, i) => (
                                <div key={i} className={`carousel-item god-carousel-item ${i === 0 ? 'active' : ''}`}>
                                    <img src={s.img} alt={s.tag} />
                                    <div className={`god-carousel-overlay d-flex align-items-center ${s.align === 'end' ? 'justify-content-end text-end' : s.align === 'center' ? 'justify-content-center text-center' : ''}`}
                                        style={{
                                            background: s.align === 'end'
                                                ? 'linear-gradient(to left, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)'
                                                : s.align === 'center'
                                                    ? 'rgba(0,0,0,0.42)'
                                                    : 'linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.05) 100%)'
                                        }}>
                                        <div className="container position-relative z-3">
                                            <div className={`god-watermark-hero
                                                ${s.align === 'end' ? 'text-end' : s.align === 'center' ? 'text-center' : 'text-start'}`}
                                                style={s.align === 'end' ? { right: '-3%', left: 'auto' }
                                                    : s.align === 'center' ? { left: '50%', transform: 'translateX(-50%) translateY(-50%)' } : {}}>
                                                {s.watermark}
                                            </div>
                                            <div className={`god-carousel-caption
                                                ${s.align === 'end' ? 'ms-auto animate__animated animate__fadeInRight'
                                                    : s.align === 'center' ? 'mx-auto animate__animated animate__fadeInUp'
                                                        : 'animate__animated animate__fadeInLeft'}`}>
                                                <div className="god-tag">{s.tag}</div>
                                                <h1 className="god-hero-title"
                                                    dangerouslySetInnerHTML={{ __html: s.title.replace('\n', '<br/>') }} />
                                                <Link to={s.cta} className="btn-god-tier mt-5 d-inline-block">
                                                    <span>{s.ctaText}</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    {/* Controls */}
                    <button className="carousel-control-prev god-carousel-control" type="button"
                        data-bs-target="#godCarousel" data-bs-slide="prev">
                        <span className="god-ctrl-icon"><i className="fa-solid fa-arrow-left-long" /></span>
                        <span className="visually-hidden">Trước</span>
                    </button>
                    <button className="carousel-control-next god-carousel-control" type="button"
                        data-bs-target="#godCarousel" data-bs-slide="next">
                        <span className="god-ctrl-icon"><i className="fa-solid fa-arrow-right-long" /></span>
                        <span className="visually-hidden">Sau</span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════
                    FEATURES BAR
                ══════════════════════════════════════════ */}
                <div className="god-features-bar text-white py-4">
                    <div className="container">
                        <div className="row g-3 justify-content-center">
                            {[
                                { icon: 'fa-truck-fast', title: 'Miễn Phí Vận Chuyển', sub: 'Đơn từ 500K hoặc thẻ VIP' },
                                { icon: 'fa-rotate-left', title: '7 Ngày Đổi Trả', sub: 'Dễ dàng, không phiền hà' },
                                { icon: 'fa-shield-halved', title: '100% Chính Hãng', sub: 'Cam kết chất lượng Authentic' },
                                { icon: 'fa-headset', title: 'Hỗ Trợ 24/7', sub: 'Đội ngũ CSKH chu đáo' },
                            ].map((f, i) => (
                                <div key={i}
                                    className="col-lg-3 col-md-6 d-flex align-items-center justify-content-start justify-content-lg-center gap-3 border-start-lg">
                                    <div className="feature-icon">
                                        <i className={`fa-solid ${f.icon} text-danger fs-3`} />
                                    </div>
                                    <div>
                                        <h6 className="font-oswald text-uppercase m-0"
                                            style={{ fontSize: 14, letterSpacing: 1 }}>{f.title}</h6>
                                        <p className="m-0" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{f.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    FLASH SALE — above brands
                ══════════════════════════════════════════ */}
                {flashSaleData && flashSaleData.products.length > 0 && (
                    <div className="bg-black text-white position-relative overflow-hidden">
                        <div className="god-neon-glow position-absolute top-50 start-50 translate-middle" />
                        <div className="god-watermark-bg text-white opacity-10">SALE</div>

                        <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
                            {/* Section Header — premium redesign */}
                            <div className="d-flex justify-content-between align-items-center mb-5 reveal-item god-hidden flex-wrap gap-4">
                                {/* LEFT: icon + title + tagline */}
                                <div className="d-flex align-items-center gap-4">
                                    {/* Icon badge */}
                                    <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width: 72, height: 72,
                                            borderRadius: 16,
                                            background: 'linear-gradient(135deg, #e50914 0%, #8b0000 100%)',
                                            border: '1px solid rgba(255,77,77,0.3)'
                                        }}>
                                        <i className="fa-solid fa-bolt-lightning text-white" style={{ fontSize: 30 }} />
                                    </div>
                                    {/* Text block */}
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <span className="badge-live-neon">
                                                <span className="neon-dot" /> ĐANG DIỄN RA
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: 1 }}>
                                                {flashSaleData.products.length} SẢN PHẨM
                                            </span>
                                        </div>
                                        <h2 className="god-section-title text-uppercase text-white m-0" style={{ letterSpacing: -1 }}>
                                            {flashSaleData.campaign?.name || 'SĂN DEAL GIỜ VÀNG'}
                                        </h2>
                                        <p className="m-0 mt-1" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: 1 }}>
                                            FLASH SALE — Ưu đãi có thời hạn, số lượng có hạn
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT: Countdown */}
                                <div className="d-flex flex-column align-items-end gap-2">
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                                        Kết thúc sau
                                    </span>
                                    <div className="god-countdown">
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
                                        <span className="cd-colon text-danger">:</span>
                                        <div className="cd-block border-danger"
                                            style={{ boxShadow: '0 0 16px rgba(229,9,20,0.35)' }}>
                                            <span className="cd-num text-danger">{timeLeft.seconds}</span>
                                            <span className="cd-txt text-danger">GIÂY</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product grid – 4 columns on desktop */}
                            <div className="row g-3">
                                {flashSaleData.products.slice(0, 4).map((p, idx) => {
                                    if (!p || !p.product) return null;
                                    const pct = p.product.oldPrice > 0
                                        ? Math.round(((p.product.oldPrice - p.salePrice) * 100) / p.product.oldPrice)
                                        : 0;
                                    return (
                                        <div key={p.id} className="col-lg-3 col-md-6 col-12 reveal-item god-hidden"
                                            style={{ animationDelay: `${idx * 0.1}s` }}>
                                            <div className="flat-product-card dark h-100 d-flex flex-column position-relative">
                                                <Link to={`/details?id=${p.product.id}`}
                                                    className="stretched-link" style={{ zIndex: 1 }} />
                                                <div className="flat-card-img-box position-relative overflow-hidden"
                                                    style={{ aspectRatio: '4/3', padding: 0 }}>
                                                    {pct > 0 && (
                                                        <span className="flat-badge bg-danger text-white position-absolute top-0 start-0 m-2 px-2 py-1 fw-bold" style={{ zIndex: 5 }}>
                                                            GIẢM {pct}%
                                                        </span>
                                                    )}
                                                    <img src={imgUrl(p.product.imageUrl) || imgUrl(p.product.image_url)}
                                                        alt={p.product.productName || p.product.product_name}
                                                        className="product-card-img w-100 h-100"
                                                        style={{ objectFit: 'cover', objectPosition: 'center' }} />
                                                    <div className="position-absolute" style={{ top: 10, right: 10, zIndex: 10 }}>
                                                        <button className="wishlist-btn btn"
                                                            onClick={(e) => toggleWishlist(e, p.product.id)}
                                                            title="Yêu thích">
                                                            <i className={`${wishlistIds.includes(p.product.id) ? 'fa-solid text-danger' : 'fa-regular text-secondary'} fa-heart`}
                                                                style={{ fontSize: 16 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flat-card-info p-3 d-flex flex-column flex-grow-1">
                                                    <div className="flat-brand mb-1">{p.product.brandName || p.product.brand_name}</div>
                                                    <h5 className="flat-name text-white mb-2"
                                                        style={{ fontSize: 15, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {p.product.productName || p.product.product_name}
                                                    </h5>
                                                    <div className="d-flex align-items-baseline gap-2 mb-3">
                                                        <span className="price-new text-white" style={{ fontSize: 20 }}>{fmt(p.salePrice)}</span>
                                                        {p.product.oldPrice > 0 && (
                                                            <span className="price-old" style={{ fontSize: 13 }}>{fmt(p.product.oldPrice)}</span>
                                                        )}
                                                    </div>
                                                    <div className="d-flex gap-2 mt-auto" style={{ position: 'relative', zIndex: 10 }}>
                                                        <button onClick={(e) => { e.preventDefault(); setQuickAddProductId(p.product.id); }}
                                                            className="btn flat-btn-cart-dark d-flex align-items-center justify-content-center"
                                                            style={{ width: 46, height: 44, flexShrink: 0 }}>
                                                            <i className="fa-solid fa-cart-plus" style={{ fontSize: 16 }} />
                                                        </button>
                                                        <button onClick={(e) => { e.preventDefault(); navigate(`/details?id=${p.product.id}`); }}
                                                            className="btn flat-btn-buy flex-grow-1"
                                                            style={{ height: 44, fontSize: 14, letterSpacing: 1 }}>
                                                            MUA NGAY
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* View all button */}
                            <div className="text-center mt-5 reveal-item god-hidden">
                                <Link to="/flash-sale" className="btn-god-tier light">
                                    <span>XEM TẤT CẢ FLASH SALE ({flashSaleData.products.length} SẢN PHẨM)</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    THƯƠNG HIỆU NỔI BẬT – BRAND GRID
                ══════════════════════════════════════════ */}
                <div className="bg-white border-bottom border-dark border-2 position-relative overflow-hidden">
                    <div className="god-watermark-bg">BRAND</div>
                    <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
                        <div className="d-flex justify-content-between align-items-end mb-5 reveal-item god-hidden flex-wrap gap-3">
                            <div>
                                <h2 className="god-section-title text-uppercase m-0">THƯƠNG HIỆU NỔI BẬT</h2>
                                <div className="god-section-line mt-3" />
                            </div>
                            <Link to="/shop" className="god-link-bold text-uppercase">
                                XEM TẤT CẢ <i className="fa-solid fa-arrow-right ms-2" />
                            </Link>
                        </div>
                        <div className="brand-grid">
                            {(brands.length > 0 ? brands.slice(0, 5) : [
                                { id: 1, name: 'Nike' },
                                { id: 2, name: 'Adidas' },
                                { id: 3, name: 'New Balance' },
                                { id: 4, name: 'Vans' },
                                { id: 5, name: 'Converse' },
                            ]).map((brand, idx) => {
                                const name = brand.brand_name || brand.brandName || brand.name || `Brand ${idx + 1}`;
                                const hasImg = !!brand.imageUrl;
                                return (
                                    <div key={brand.id || idx}
                                        className="brand-grid-item large reveal-item god-hidden"
                                        style={{ animationDelay: `${idx * 0.12}s` }}>
                                        <Link to={`/shop?brand=${brand.id}`}
                                            className={`brand-card-inner text-decoration-none ${hasImg ? 'has-image' : ''}`}>
                                            {hasImg && (
                                                <img src={imgUrl(brand.imageUrl)} alt={name} className="brand-img" />
                                            )}
                                            <span className="brand-card-name">{name.toUpperCase()}</span>
                                            <span className="brand-card-explore">KHÁM PHÁ <i className="fa-solid fa-arrow-right" /></span>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    HÀNG MỚI VỀ
                ══════════════════════════════════════════ */}
                <div className="bg-white border-bottom border-dark border-2 position-relative overflow-hidden">
                    <div className="god-watermark-bg">NEW</div>
                    <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
                        <div className="text-center mb-5 reveal-item god-hidden">
                            <h2 className="god-section-title text-uppercase m-0">HÀNG MỚI VỀ</h2>
                            <div className="god-section-line mx-auto mt-3" />
                        </div>

                        <div className="row g-4">
                            {newArrivals.slice(0, 8).map((p, idx) => (
                                <div key={p.id} className="col-lg-3 col-md-6 col-12 reveal-item god-hidden"
                                    style={{ animationDelay: `${idx * 0.07}s` }}>
                                    <div className="flat-product-card h-100 bg-white d-flex flex-column position-relative">
                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }} />

                                        {/* Image */}
                                        <div className="flat-card-img-box position-relative overflow-hidden d-flex align-items-center justify-content-center"
                                            style={{ aspectRatio: '1', padding: 16, background: '#f8f8f8' }}>
                                            <span className="flat-badge bg-danger text-white position-absolute top-0 start-0 m-2 px-2 py-1 fw-bold">MỚI</span>
                                            <img src={imgUrl(p.image_url || p.imageUrl)}
                                                alt={p.product_name || p.productName}
                                                className="product-card-img w-100 h-100"
                                                style={{ objectFit: 'contain' }} />
                                            <div className="position-absolute" style={{ top: 10, right: 10, zIndex: 10 }}>
                                                <button className="wishlist-btn btn"
                                                    onClick={(e) => toggleWishlist(e, p.id)}>
                                                    <i className={`${wishlistIds.includes(p.id) ? 'fa-solid text-danger' : 'fa-regular text-secondary'} fa-heart`}
                                                        style={{ fontSize: 16 }} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flat-card-info p-3 d-flex flex-column flex-grow-1" style={{ background: '#fff' }}>
                                            <div className="flat-brand mb-1">{p.brand_name || p.brandName || 'BRAND'}</div>
                                            <h5 className="flat-name text-dark mb-2"
                                                style={{ fontSize: 15, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.product_name || p.productName}
                                            </h5>
                                            <div className="mb-3">
                                                <span className="price-new text-dark fw-bold" style={{ fontSize: 19 }}>
                                                    {p.min_price != null ? fmt(p.min_price) : 'Liên hệ'}
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

                        <div className="text-center mt-5 reveal-item god-hidden">
                            <Link to="/new-arrivals" className="btn-god-tier">
                                <span>XEM TẤT CẢ HÀNG MỚI</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    EDITORIAL BANNER
                ══════════════════════════════════════════ */}
                <div className="god-editorial-section py-5 border-top border-bottom border-secondary border-opacity-25">
                    <div className="editorial-bg-image" />
                    <div className="editorial-overlay" />
                    <div className="container py-5 position-relative text-center" style={{ zIndex: 3 }}>
                        <div className="row justify-content-center py-4">
                            <div className="col-lg-8 col-md-10">
                                <span className="editorial-tag text-danger fw-bold" style={{ fontSize: 13, letterSpacing: 5 }}>
                                    SNEAKER STREET CULTURE
                                </span>
                                <h2 className="editorial-title text-white mt-3 mb-4"
                                    style={{ fontSize: 'clamp(36px,6vw,64px)', letterSpacing: -2, fontWeight: 900 }}>
                                    WRITE YOUR OWN STORY.
                                </h2>
                                <p className="text-white-50 mb-5 mx-auto"
                                    style={{ maxWidth: 560, fontSize: 15, lineHeight: 1.85 }}>
                                    Mỗi bước đi là một phần của hành trình. Chọn đôi giày của bạn,
                                    khẳng định phong cách riêng biệt và viết nên câu chuyện độc nhất trên từng con phố.
                                </p>
                                <Link to="/shop" className="btn-god-tier light">
                                    <span>MUA SẮM BỘ SƯU TẬP</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    SẢN PHẨM BÁN CHẠY
                ══════════════════════════════════════════ */}
                <div className="bg-white position-relative overflow-hidden">
                    <div className="god-watermark-bg text-dark opacity-10">HOT</div>
                    <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
                        <div className="text-center mb-5 reveal-item god-hidden">
                            <h2 className="god-section-title text-uppercase m-0">SẢN PHẨM BÁN CHẠY</h2>
                            <div className="god-section-line mx-auto mt-3" />
                        </div>

                        <div className="row g-4">
                            {topSelling.slice(0, 8).map((p, idx) => (
                                <div key={p.id} className="col-lg-3 col-md-6 col-12 reveal-item god-hidden"
                                    style={{ animationDelay: `${idx * 0.07}s` }}>
                                    <div className="flat-product-card h-100 bg-white d-flex flex-column position-relative">
                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }} />

                                        {/* HOT badge */}
                                        <div className="flat-card-img-box position-relative overflow-hidden d-flex align-items-center justify-content-center"
                                            style={{ aspectRatio: '1', padding: 16, background: '#f8f8f8' }}>
                                            <span className="flat-badge position-absolute top-0 start-0 m-2 px-2 py-1 fw-bold text-white"
                                                style={{ background: '#111', borderRadius: 6, fontSize: 12, letterSpacing: 1 }}>
                                                🔥 HOT
                                            </span>
                                            <img src={imgUrl(p.image_url || p.imageUrl)}
                                                alt={p.product_name || p.productName}
                                                className="product-card-img w-100 h-100"
                                                style={{ objectFit: 'contain' }} />
                                            <div className="position-absolute" style={{ top: 10, right: 10, zIndex: 10 }}>
                                                <button className="wishlist-btn btn"
                                                    onClick={(e) => toggleWishlist(e, p.id)}>
                                                    <i className={`${wishlistIds.includes(p.id) ? 'fa-solid text-danger' : 'fa-regular text-secondary'} fa-heart`}
                                                        style={{ fontSize: 16 }} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flat-card-info p-3 d-flex flex-column flex-grow-1" style={{ background: '#fff' }}>
                                            <div className="flat-brand mb-1">{p.brand_name || p.brandName || 'BRAND'}</div>
                                            <h5 className="flat-name text-dark mb-2"
                                                style={{ fontSize: 15, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.product_name || p.productName}
                                            </h5>
                                            <div className="mb-3">
                                                <span className="price-new text-dark fw-bold" style={{ fontSize: 19 }}>
                                                    {p.min_price != null ? fmt(p.min_price) : 'Liên hệ'}
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

                        <div className="text-center mt-5 reveal-item god-hidden">
                            <Link to="/shop" className="btn-god-tier">
                                <span>XEM TẤT CẢ SẢN PHẨM</span>
                            </Link>
                        </div>
                    </div>
                </div>

            </div>

            <QuickCartModal
                productId={quickAddProductId}
                isOpen={!!quickAddProductId}
                onClose={() => setQuickAddProductId(null)}
            />
        </Layout>
    );
};

export default Home;
