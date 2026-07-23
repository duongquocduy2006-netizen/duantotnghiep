import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Shop.css';
import QuickCartModal from '../components/QuickCartModal';

const Shop = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialBrand = queryParams.get('brand') || '';
    const initialSearch = queryParams.get('search') || '';

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlistIds, setWishlistIds] = useState([]);
    const brandContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkBrandScroll = () => {
        const container = brandContainerRef.current;
        if (container) {
            setCanScrollLeft(container.scrollLeft > 5);
            setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 5);
        }
    };

    const scrollBrands = (direction) => {
        const container = brandContainerRef.current;
        if (container) {
            const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const container = brandContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkBrandScroll);
            window.addEventListener('resize', checkBrandScroll);
            setTimeout(checkBrandScroll, 500);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', checkBrandScroll);
            }
            window.removeEventListener('resize', checkBrandScroll);
        };
    }, [brands]);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState(initialBrand);
    const [maxPrice, setMaxPrice] = useState(5000000);
    const [sortOption, setSortOption] = useState('');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [quickAddProductId, setQuickAddProductId] = useState(null);
    
    const observerRef = useRef(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const hasFilter = queryParams.get('brand') || queryParams.get('category') || queryParams.get('search');
        if (!hasFilter) {
            window.scrollTo(0, 0);
        }
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        
        // 1. Đồng bộ từ khóa tìm kiếm
        const searchParam = queryParams.get('search') || '';
        if (searchParam !== searchQuery) {
            setSearchQuery(searchParam);
        }

        // 2. Đồng bộ thương hiệu (Chuỗi tên thương hiệu)
        const brandParam = queryParams.get('brand') || '';
        if (brandParam !== selectedBrand) {
            setSelectedBrand(brandParam);
        }

        // 3. Đồng bộ danh mục (Hỗ trợ cả ID số hoặc Tên danh mục chữ từ URL)
        const catParam = queryParams.get('category') || '';
        if (catParam !== '') {
            const parsedId = parseInt(catParam);
            if (!isNaN(parsedId)) {
                if (parsedId !== selectedCategory) {
                    setSelectedCategory(parsedId);
                }
            } else if (categories.length > 0) {
                const matchedCat = categories.find(c => {
                    const name = (c.name || c.category_name || c.categoryName || '').toLowerCase();
                    const param = catParam.toLowerCase();
                    if (name.includes(param) || param.includes(name)) return true;
                    if (param === 'running' && name.includes('chạy bộ')) return true;
                    if (param === 'sneaker' && name.includes('sneaker')) return true;
                    return false;
                });
                if (matchedCat && matchedCat.id !== selectedCategory) {
                    setSelectedCategory(matchedCat.id);
                }
            }
        }

        // 4. Nếu URL có chứa bộ lọc (click từ header hoặc home), cuộn mượt mà xuống vùng sản phẩm
        const hasFilter = queryParams.get('brand') || queryParams.get('category') || queryParams.get('search');
        if (hasFilter) {
            const scrollTarget = () => {
                const section = document.getElementById('shop-products-section');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            };
            scrollTarget();
            setTimeout(scrollTarget, 100);
        }
    }, [location.search, categories]);

    useEffect(() => {
        fetchFilters();
        fetchWishlistIds();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedCategory, selectedBrand, maxPrice, sortOption]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchProducts();
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        if (!searchQuery) return;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return;

        const words = query.split(/\s+/);

        // 1. Quét tìm danh mục trùng khớp thông minh (cộng các ký tự)
        if (categories.length > 0) {
            const matchedCat = categories.find(c => {
                const name = (c.name || c.category_name || c.categoryName || '').toLowerCase();
                // Match if any of the words match the category name
                for (let word of words) {
                    if (name === word || name.includes(word) || word.includes(name)) return true;
                    if (word === 'running' && name.includes('chạy bộ')) return true;
                    if (word === 'sneaker' && name.includes('sneaker')) return true;
                }
                if (query.includes('chạy bộ') && name.includes('chạy bộ')) return true;
                if (query.includes('thể thao') && name.includes('thể thao')) return true;
                return false;
            });
            if (matchedCat && matchedCat.id !== selectedCategory) {
                setSelectedCategory(matchedCat.id);
            }
        }

        // 2. Quét tìm thương hiệu trùng khớp thông minh
        if (brands.length > 0) {
            const matchedBrand = brands.find(b => {
                const name = (b.name || b.brand_name || b.brandName || '').toLowerCase();
                for (let word of words) {
                    if (name === word || name.includes(word) || word.includes(name)) return true;
                }
                return false;
            });
            if (matchedBrand) {
                const bName = matchedBrand.name || matchedBrand.brand_name || matchedBrand.brandName;
                if (bName !== selectedBrand) {
                    setSelectedBrand(bName);
                }
            }
        }
    }, [searchQuery, categories, brands]);

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
    }, [loading, products]);


    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                api.get('/api/categories'),
                api.get('/api/brands')
            ]);
            if (catRes.data && catRes.data.success) {
                const activeCategories = (catRes.data.categories || []).filter(c => c.active !== false);
                setCategories(activeCategories);
            } else if (Array.isArray(catRes.data)) {
                const activeCategories = catRes.data.filter(c => c.active !== false);
                setCategories(activeCategories);
            }

            if (brandRes.data && brandRes.data.success) {
                const activeBrands = (brandRes.data.brands || []).filter(b => b.active !== false);
                setBrands(activeBrands);
            } else if (Array.isArray(brandRes.data)) {
                const activeBrands = brandRes.data.filter(b => b.active !== false);
                setBrands(activeBrands);
            }
        } catch (error) {
            console.error("Lỗi tải bộ lọc:", error);
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
                } else {
                    setWishlistIds(wishlistIds.filter(id => id !== productId));
                }
            } else {
                alert(res.data.message || "Vui lòng đăng nhập!");
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                alert("Vui lòng đăng nhập để sử dụng tính năng này!");
                navigate('/login');
            } else {
                alert("Đã xảy ra lỗi khi xử lý yêu thích.");
            }
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let url = '/api/products/search?';
            if (searchQuery) url += `keyword=${encodeURIComponent(searchQuery)}&`;
            if (selectedCategory) url += `category=${selectedCategory}&`;
            if (selectedBrand) url += `brand=${selectedBrand}&`;
            if (sortOption) url += `sort=${sortOption}&`;

            const response = await api.get(url);
            let data = [];
            if (response.data && response.data.success) data = response.data.products || [];
            
            if (maxPrice < 5000000) {
                data = data.filter(p => {
                    const price = p.min_price || 0;
                    return price <= maxPrice;
                });
            }
            setProducts(data);
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (url.startsWith('http')) return url;
        const clean = url.startsWith('/') ? url : '/images/' + url;
        return `http://localhost:8080${clean}`;
    };

    return (
        <Layout>
            <div className="shop-epic-theme">
                <div className="shop-editorial-header py-5 text-center bg-white border-bottom border-light-subtle position-relative overflow-hidden">
                    <div className="god-watermark-bg">BRAND</div>
                    <div className="container position-relative" style={{ zIndex: 1 }}>
                        <div className="animate__animated animate__fadeInDown">
                            <span className="shop-tag-accent">CỬA HÀNG CHÍNH THỨC</span>
                            <h1 className="shop-main-title font-oswald text-uppercase mt-3 mb-2">
                                CỬA HÀNG
                            </h1>
                            <p className="shop-sub-desc mx-auto mb-5">
                                Khám phá phong cách thời trang đường phố từ cộng đồng ShoeStore Việt Nam.
                            </p>
                        </div>
                        
                        <div className="brand-slider-wrapper mt-4 text-start">
                            {canScrollLeft && (
                                <button className="brand-slider-btn prev" onClick={() => scrollBrands('left')}>
                                    <i className="fa-solid fa-chevron-left" />
                                </button>
                            )}
                            
                            <div className="brand-grid" ref={brandContainerRef}>
                                {(brands.length > 0 ? brands : [
                                    { id: 1, name: 'Nike' },
                                    { id: 2, name: 'Adidas' },
                                    { id: 3, name: 'New Balance' },
                                    { id: 4, name: 'Vans' },
                                    { id: 5, name: 'Converse' },
                                ]).map((brand, idx) => {
                                    const name = brand.name || brand.brand_name || brand.brandName || `Brand ${idx + 1}`;
                                    const hasImg = brand.imageUrl && !brand.imageUrl.includes('localhost');
                                    return (
                                        <div key={brand.id || idx}
                                             className="brand-grid-item"
                                             style={{ animationDelay: `${idx * 0.12}s` }}>
                                            <Link to={`/shop?brand=${encodeURIComponent(name)}`}
                                                  className={`brand-card-inner text-decoration-none ${hasImg ? 'has-image' : ''}`}>
                                                {hasImg && (
                                                    <img src={getImageUrl(brand.imageUrl)} alt={name} className="brand-img" />
                                                )}
                                                <span className="brand-card-name">{name.toUpperCase()}</span>
                                                <span className="brand-card-explore">KHÁM PHÁ <i className="fa-solid fa-arrow-right" /></span>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>

                            {canScrollRight && (
                                <button className="brand-slider-btn next" onClick={() => scrollBrands('right')}>
                                    <i className="fa-solid fa-chevron-right" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div id="shop-products-section" className="container py-5">
                    <div className="row g-5">
                        {/* FILTER SIDEBAR */}
                        <div className="col-lg-3">
                            <div className="epic-filter-sidebar bg-white border border-light-subtle p-4 rounded-3">
                                <h4 className="font-oswald fw-bold text-uppercase mb-4 pb-2 border-bottom border-light-subtle">BỘ LỌC TÌM KIẾM</h4>


                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">DANH MỤC</h6>
                                    <div className="d-flex flex-column gap-2">
                                        <div className="form-check epic-radio">
                                            <input className="form-check-input" type="radio" name="category" id="catAll"
                                                checked={selectedCategory === ''} onChange={() => setSelectedCategory('')} />
                                            <label className="form-check-label fw-bold" htmlFor="catAll">Tất cả</label>
                                        </div>
                                        {categories.map(cat => (
                                            <div className="form-check epic-radio" key={cat.id}>
                                                <input className="form-check-input" type="radio" name="category" id={`cat${cat.id}`}
                                                    checked={selectedCategory === cat.id} onChange={() => setSelectedCategory(cat.id)} />
                                                <label className="form-check-label fw-bold" htmlFor={`cat${cat.id}`}>{cat.name || cat.category_name || cat.categoryName}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">THƯƠNG HIỆU</h6>
                                    <div className="d-flex flex-column gap-2">
                                        <div className="form-check epic-radio">
                                            <input className="form-check-input" type="radio" name="brand" id="brandAll"
                                                checked={selectedBrand === ''} onChange={() => setSelectedBrand('')} />
                                            <label className="form-check-label fw-bold" htmlFor="brandAll">Tất cả</label>
                                        </div>
                                        {brands.map(brand => {
                                            const bName = brand.name || brand.brand_name || brand.brandName || '';
                                            return (
                                                <div className="form-check epic-radio" key={brand.id}>
                                                    <input className="form-check-input" type="radio" name="brand" id={`brand${brand.id}`}
                                                        checked={selectedBrand === bName} onChange={() => setSelectedBrand(bName)} />
                                                    <label className="form-check-label fw-bold" htmlFor={`brand${brand.id}`}>{bName}</label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">MỨC GIÁ TỐI ĐA</h6>
                                    <div className="epic-slider-wrapper">
                                        <div className="epic-slider-label fw-bold mb-2 text-dark" style={{ fontSize: '14px' }}>
                                            {maxPrice === 5000000 ? "Tất cả các mức giá" : `Dưới ${formatCurrency(maxPrice)}`}
                                        </div>
                                        <input 
                                            type="range" 
                                            min="500000" 
                                            max="5000000" 
                                            step="100000" 
                                            value={maxPrice} 
                                            onChange={(e) => setMaxPrice(Number(e.target.value))} 
                                            className="epic-range-input w-100" 
                                        />
                                        <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>
                                            <span>500.000đ</span>
                                            <span>5.000.000đ+</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <button className="btn-brutal-outline w-100 mt-2" onClick={() => {
                                        navigate('/shop');
                                        setSelectedCategory(''); setSelectedBrand(''); setMaxPrice(5000000); setSortOption(''); setSearchQuery('');
                                    }}>XÓA BỘ LỌC</button>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT GRID */}
                        <div className="col-lg-9 position-relative">
                            {/* Decorative Watermark background */}
                            <div className="position-absolute w-100 h-100 top-0 left-0 overflow-hidden d-none d-lg-block" style={{ pointerEvents: 'none', zIndex: 0, opacity: 0.015 }}>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', left: '10%', top: '5%', letterSpacing: '4px' }}>SẢN PHẨM</div>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', right: '5%', top: '40%', letterSpacing: '4px' }}>PHONG CÁCH</div>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', left: '15%', top: '75%', letterSpacing: '4px' }}>CỬA HÀNG</div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center border-bottom border-light-subtle pb-3 mb-4 flex-wrap gap-3">
                                <span className="font-oswald fw-bold fs-5 text-uppercase">TÌM THẤY <span className="text-danger">{products.length}</span> SẢN PHẨM</span>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="font-oswald fw-bold text-uppercase">SẮP XẾP:</span>
                                    <select className="epic-select py-1" style={{ width: 'auto' }} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                        <option value="">MẶC ĐỊNH</option>
                                        <option value="price_asc">GIÁ TĂNG DẦN</option>
                                        <option value="price_desc">GIÁ GIẢM DẦN</option>
                                        <option value="newest">HÀNG MỚI NHẤT</option>
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                                </div>
                            ) : products.length > 0 ? (
                                <div className="row g-4">
                                    {products.map((p, idx) => (
                                        <div key={p.id} className="col-lg-4 col-md-6 col-12 reveal-item opacity-0 mb-4" style={{ animationDelay: `${(idx % 12) * 0.05}s` }}>
                                            <div className="flat-product-card h-100 bg-white d-flex flex-column position-relative">
                                                <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }} />

                                                {/* Image */}
                                                <div className="flat-card-img-box position-relative overflow-hidden d-flex align-items-center justify-content-center"
                                                     style={{ aspectRatio: '1', padding: 16, background: '#f8f8f8' }}>
                                                    <img src={getImageUrl(p.image_url)} alt={p.product_name} className="product-card-img w-100 h-100" style={{ objectFit: 'contain' }} />
                                                    <div className="position-absolute" style={{ top: 10, right: 10, zIndex: 10 }}>
                                                        <button className="wishlist-btn btn" onClick={(e) => toggleWishlist(e, p.id)}>
                                                            <i className={`${wishlistIds.includes(p.id) ? 'fa-solid text-danger' : 'fa-regular text-secondary'} fa-heart`} style={{ fontSize: 16 }} />
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
                                <div className="text-center py-5 border border-light-subtle rounded-3">
                                    <i className="fa-solid fa-box-open fa-4x text-muted mb-3 opacity-50"></i>
                                    <h3 className="font-oswald fw-bold text-uppercase">KHÔNG TÌM THẤY SẢN PHẨM NÀO</h3>
                                    <p className="fw-bold text-muted">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FEATURED CAMPAIGN SPLIT */}
                    <div className="row g-4 mt-5 pt-5 border-top border-light-subtle align-items-center">
                        <div className="col-md-6 animate__animated animate__fadeInLeft">
                            <div className="campaign-img-box overflow-hidden rounded-3 border border-light-subtle" style={{ aspectRatio: '16/9', background: '#f5f5f5' }}>
                                <img src="/campaign_banner.png" alt="Chiến dịch" className="w-100 h-100 object-fit-cover" style={{ transition: 'transform 0.5s ease' }} />
                            </div>
                        </div>
                        <div className="col-md-6 p-4 animate__animated animate__fadeInRight">
                            <span className="text-danger fw-bold font-oswald text-uppercase" style={{ letterSpacing: '3px', fontSize: '13px' }}>BẮT ĐẦU PHONG CÁCH MỚI</span>
                            <h3 className="font-oswald text-uppercase fw-bold text-dark mt-2" style={{ fontSize: '28px' }}>NÂNG TẦM TRẢI NGHIỆM SNEAKER</h3>
                            <p className="text-muted small mt-3 mb-4" style={{ lineHeight: '1.7' }}>
                                Chọn lựa phong cách phù hợp với cá tính của bạn. Mỗi thiết kế đều được sản xuất để đảm bảo tính thời trang tối ưu và sự êm ái trên từng chuyển động hàng ngày. Đột phá phong cách của bạn ngay hôm nay cùng những mẫu giày hàng đầu.
                            </p>
                            <button className="btn btn-dark font-oswald text-uppercase px-4 py-2 rounded-0 fw-bold" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ letterSpacing: '1px', fontSize: '13px' }}>
                                XEM SẢN PHẨM PHÙ HỢP
                            </button>
                        </div>
                    </div>                    </div>

                {/* EDITORIAL BANNER */}
                <div className="shop-editorial-section py-5 border-top border-light-subtle bg-black text-white text-center position-relative overflow-hidden mt-5" style={{ minHeight: '300px', display: 'flex', alignItems: 'center' }}>
                    <div className="container position-relative z-3 py-4">
                        <span className="text-danger fw-bold font-oswald" style={{ fontSize: '14px', letterSpacing: '6px' }}>
                            SHOESTORE VIỆT NAM
                        </span>
                        <h2 className="font-oswald text-uppercase mt-2 mb-4 text-white" style={{ fontSize: 'clamp(24px, 4vw, 48px)', fontWeight: 900, letterSpacing: '2px' }}>
                            HÀNH TRÌNH VẠN DẶM BẮT ĐẦU TỪ MỘT BƯỚC CHÂN.
                        </h2>
                        <button className="btn btn-outline-light font-oswald text-uppercase px-4 py-2 rounded-0 fw-bold border-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ letterSpacing: '2px', fontSize: '13px' }}>
                            QUAY LẠI ĐẦU TRANG
                        </button>
                    </div>
                </div>
            </div>
            {quickAddProductId && (
                <QuickCartModal productId={quickAddProductId} onClose={() => setQuickAddProductId(null)} />
            )}
        </Layout>
    );
};

export default Shop;