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
    const [flashSaleData, setFlashSaleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wishlistIds, setWishlistIds] = useState([]);
    const brandContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const getFlashSaleInfo = (productId) => {
        if (!flashSaleData || !flashSaleData.campaign) return null;
        const campaign = flashSaleData.campaign;
        
        let isLive = campaign.isLive;
        if (isLive === undefined) {
            const now = new Date();
            const start = new Date(campaign.startDate);
            const end = new Date(campaign.endDate);
            isLive = now >= start && now <= end;
        }
        if (isLive === false) return null; 
        
        const fsProduct = (flashSaleData.products || []).find(fsp => 
            (fsp.product && fsp.product.id === productId) || 
            fsp.productId === productId || 
            fsp.id === productId
        );
        if (fsProduct) {
            const salePrice = fsProduct.salePrice;
            const oldPrice = fsProduct.product?.oldPrice || fsProduct.oldPrice || 0;
            const pct = oldPrice > 0 && salePrice < oldPrice ? Math.round(((oldPrice - salePrice) * 100) / oldPrice) : 0;
            return { salePrice, oldPrice, pct };
        }
        return null;
    };

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
    const [minPriceBound, setMinPriceBound] = useState(0);
    const [maxPriceBound, setMaxPriceBound] = useState(5000000);
    const [sortOption, setSortOption] = useState('');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [quickAddProductId, setQuickAddProductId] = useState(null);
    const [imageSearchProducts, setImageSearchProducts] = useState(null);
    const [imageSearchUrl, setImageSearchUrl] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;
    
    const observerRef = useRef(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const hasFilter = queryParams.get('brand') || queryParams.get('category') || queryParams.get('search');
        if (!hasFilter && !location.state?.imageSearchProducts) {
            window.scrollTo(0, 0);
        }
    }, []);

    // Receive image search results from Header navigation
    useEffect(() => {
        if (location.state?.imageSearchProducts) {
            setImageSearchProducts(location.state.imageSearchProducts);
            setImageSearchUrl(location.state.imageSearchUrl || null);
            // Scroll to products section
            setTimeout(() => {
                const section = document.getElementById('shop-products-section');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            }, 200);
            // Clear the state so browser back/forward doesn't re-trigger
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

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
        } else {
            if (selectedCategory !== '') {
                setSelectedCategory('');
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
            const [catRes, brandRes, flashRes] = await Promise.all([
                api.get('/api/categories'),
                api.get('/api/brands'),
                api.get('/api/flash-sales/active').catch(() => ({ data: {} }))
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

            if (flashRes.data?.success && flashRes.data?.hasActiveCampaign) {
                setFlashSaleData({
                    campaign: flashRes.data.campaign,
                    products: flashRes.data.products || []
                });
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

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setCurrentPage(1);
            if (!location.state?.imageSearchProducts) {
                setImageSearchProducts(null);
                setImageSearchUrl(null);
            }
            let url = '/api/products/search?';
            if (searchQuery && searchQuery.trim()) url += `keyword=${encodeURIComponent(searchQuery.trim())}&`;
            if (selectedCategory) url += `category=${selectedCategory}&`;
            if (selectedBrand && selectedBrand.trim()) url += `brand=${encodeURIComponent(selectedBrand.trim())}&`;
            if (sortOption) url += `sort=${sortOption}&`;

            const response = await api.get(url);
            let data = [];
            if (response.data && response.data.success) {
                data = response.data.products || [];
                if (response.data.min_price != null && response.data.max_price != null && response.data.max_price > 0) {
                    setMinPriceBound(response.data.min_price);
                    setMaxPriceBound(response.data.max_price);
                } else if (data.length > 0) {
                    const prices = data.map(p => p.min_price || 0).filter(pr => pr > 0);
                    if (prices.length > 0) {
                        setMinPriceBound(Math.min(...prices));
                        setMaxPriceBound(Math.max(...prices));
                    }
                }
            }
            console.log("=== FRONTEND FETCH PRODUCTS RECEIVED:", data);

            if (maxPrice < maxPriceBound) {
                data = data.filter(p => {
                    const price = p.min_price != null ? p.min_price : 0;
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

    const clearImageSearch = () => {
        setImageSearchProducts(null);
        setImageSearchUrl(null);
        setCurrentPage(1);
    };

    // Determine what products to display: image search results take priority
    let displayProducts = [...(imageSearchProducts || products)];
    if (sortOption === 'price_asc' || sortOption === 'price-asc') {
        displayProducts.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
    } else if (sortOption === 'price_desc' || sortOption === 'price-desc') {
        displayProducts.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
    } else if (sortOption === 'newest') {
        displayProducts.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    const totalPages = Math.ceil(displayProducts.length / ITEMS_PER_PAGE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedProducts = displayProducts.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

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

                <div id="shop-products-section" className="container-fluid px-3 px-md-5 py-5">
                    <div className="row g-4">
                        {/* FILTER SIDEBAR */}
                        <div className="col-xxl-2 col-xl-3 col-lg-4 col-12">
                            <div className="epic-filter-sidebar bg-white border border-light-subtle p-4 rounded-3 h-100">
                                <h4 className="font-oswald fw-bold text-uppercase mb-4 pb-2 border-bottom border-light-subtle">BỘ LỌC TÌM KIẾM</h4>

                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">DANH MỤC</h6>
                                    <div className="d-flex flex-column gap-2">
                                        <div className="form-check epic-radio">
                                            <input className="form-check-input" type="radio" name="category" id="catAll"
                                                checked={selectedCategory === ''} onChange={() => { clearImageSearch(); setSelectedCategory(''); }} />
                                            <label className="form-check-label fw-bold" htmlFor="catAll">Tất cả</label>
                                        </div>
                                        {categories.map(cat => (
                                            <div className="form-check epic-radio" key={cat.id}>
                                                <input className="form-check-input" type="radio" name="category" id={`cat${cat.id}`}
                                                    checked={selectedCategory === cat.id} onChange={() => { clearImageSearch(); setSelectedCategory(cat.id); }} />
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
                                                checked={selectedBrand === '' && !imageSearchProducts} onChange={() => { clearImageSearch(); setSelectedBrand(''); }} />
                                            <label className="form-check-label fw-bold" htmlFor="brandAll">Tất cả</label>
                                        </div>
                                        {brands.map(brand => {
                                            const bName = brand.name || brand.brand_name || brand.brandName || '';
                                            const isChecked = selectedBrand === bName;
                                            return (
                                                <div className="form-check epic-radio" key={brand.id}>
                                                    <input className="form-check-input" type="radio" name="brand" id={`brand${brand.id}`}
                                                        checked={isChecked} onChange={() => { clearImageSearch(); setSelectedBrand(bName); }} />
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
                                            {maxPrice >= maxPriceBound ? "Tất cả các mức giá" : `Dưới ${formatCurrency(maxPrice)}`}
                                        </div>
                                        <input 
                                            type="range" 
                                            min={minPriceBound} 
                                            max={maxPriceBound} 
                                            step="50000" 
                                            value={Math.min(maxPrice, maxPriceBound)} 
                                            onChange={(e) => setMaxPrice(Number(e.target.value))} 
                                            className="epic-range-input w-100" 
                                        />
                                        <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>
                                            <span>{formatCurrency(minPriceBound)}</span>
                                            <span>{formatCurrency(maxPriceBound)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <button className="btn-brutal-outline w-100 mt-2" onClick={() => {
                                        clearImageSearch();
                                        navigate('/shop');
                                        setSelectedCategory(''); setSelectedBrand(''); setMaxPrice(maxPriceBound); setSortOption(''); setSearchQuery('');
                                    }}>XÓA BỘ LỌC</button>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT GRID */}
                        <div className="col-xxl-10 col-xl-9 col-lg-8 col-12 position-relative">
                            {/* Image Search Results Banner */}
                            {imageSearchProducts && (
                                <div className="mb-4 p-4 image-search-banner">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            {imageSearchUrl && (
                                                <img src={imageSearchUrl} alt="Ảnh tìm kiếm" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12, border: '2px solid #ff6600' }} />
                                            )}
                                            <div>
                                                <h6 className="font-oswald fw-bold text-uppercase mb-1" style={{ color: '#111' }}>
                                                    <i className="fa-solid fa-camera me-2" style={{ color: '#ff6600' }}></i>
                                                    KẾT QUẢ TÌM KIẾM BẰNG HÌNH ẢNH
                                                </h6>
                                                <small style={{ color: '#555555', fontSize: 14 }}>
                                                    Đã tìm thấy <span className="fw-bold" style={{ color: '#ff6600' }}>{imageSearchProducts.length}</span> sản phẩm phù hợp
                                                </small>
                                            </div>
                                        </div>
                                        <button className="btn btn-sm btn-image-search-reset font-oswald fw-bold" style={{ letterSpacing: 1 }} onClick={clearImageSearch}>
                                            <i className="fa fa-times me-1" />Quay lại danh sách sản phẩm
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center border-bottom border-light-subtle pb-3 mb-4 flex-wrap gap-3">
                                <span className="font-oswald fw-bold fs-5 text-uppercase">TÌM THẤY <span className="text-danger">{displayProducts.length}</span> SẢN PHẨM</span>
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
                            ) : displayProducts.length > 0 ? (
                                <>
                                    <div className="row g-4">
                                        {paginatedProducts.map((p, idx) => {
                                            const fsInfo = getFlashSaleInfo(p.id);
                                            const salePrice = fsInfo?.salePrice || p.sale_price || p.salePrice;
                                            const originalPrice = fsInfo?.oldPrice || p.min_price || p.minPrice;
                                            const hasSale = salePrice && originalPrice && salePrice < originalPrice;
                                            const discountPct = fsInfo?.pct || (hasSale ? Math.round(((originalPrice - salePrice) * 100) / originalPrice) : 0);

                                            return (
                                                <div key={p.id} className="col-xxl-3 col-xl-4 col-md-6 col-12 reveal-item mb-4" style={{ animationDelay: `${(idx % 12) * 0.05}s` }}>
                                                    <div className="flat-product-card h-100 bg-white d-flex flex-column position-relative">
                                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }} />

                                                        {/* Image */}
                                                        <div className="flat-card-img-box position-relative overflow-hidden d-flex align-items-center justify-content-center"
                                                             style={{ aspectRatio: '1', padding: 0, background: '#f8f8f8' }}>
                                                            {hasSale ? (
                                                                <span className="flat-badge bg-danger text-white position-absolute top-0 start-0 m-2 px-2 py-1 fw-bold d-flex align-items-center" style={{ zIndex: 5, borderRadius: '4px', fontSize: '11.5px', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)' }}>
                                                                    <i className="bi bi-fire me-1"></i> -{discountPct}%
                                                                </span>
                                                            ) : (
                                                                <span className="flat-badge bg-danger text-white position-absolute top-0 start-0 m-2 px-2 py-1 fw-bold" style={{ zIndex: 5, borderRadius: '4px', fontSize: '11px' }}>MỚI</span>
                                                            )}
                                                            {getImageUrl(p.image_url) ? (
                                                                <img src={getImageUrl(p.image_url)} alt={p.product_name} className="product-card-img w-100 h-100" style={{ objectFit: 'cover' }} />
                                                            ) : (
                                                                <div className="text-center text-muted">
                                                                    <i className="fa-solid fa-image fa-3x opacity-50"></i>
                                                                </div>
                                                            )}
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
                                                                {hasSale ? (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <div className="d-flex align-items-center gap-1">
                                                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-1 py-0" style={{ fontSize: '10px', fontWeight: '700' }}>
                                                                                <i className="bi bi-lightning-charge-fill me-1"></i>FLASH SALE
                                                                            </span>
                                                                        </div>
                                                                        <div className="d-flex align-items-baseline gap-2 flex-wrap">
                                                                            <span className="price-new text-danger fw-bold" style={{ fontSize: 20, color: '#e50914', letterSpacing: '-0.5px' }}>
                                                                                {formatCurrency(salePrice)}
                                                                            </span>
                                                                            <span className="price-old text-decoration-line-through text-muted" style={{ fontSize: 13, color: '#94a3b8' }}>
                                                                                {formatCurrency(originalPrice)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="price-new text-dark fw-bold" style={{ fontSize: 19 }}>
                                                                        {p.min_price != null ? formatCurrency(p.min_price) : 'Liên hệ'}
                                                                    </span>
                                                                )}
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
                                            );
                                        })}
                                    </div>

                                    {/* PAGINATION CONTROLS */}
                                    {totalPages > 1 && (
                                        <div className="d-flex justify-content-center align-items-center gap-2 mt-5 pt-3 border-top border-light-subtle flex-wrap">
                                            <button 
                                                className="btn btn-outline-danger px-3 py-2 font-oswald text-uppercase fw-bold rounded-2"
                                                style={{ fontSize: '13px', letterSpacing: '1px' }}
                                                disabled={currentPage === 1}
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.max(prev - 1, 1));
                                                    document.getElementById('shop-products-section')?.scrollIntoView({ behavior: 'smooth' });
                                                }}>
                                                <i className="fa-solid fa-chevron-left me-1"></i> Trước
                                            </button>

                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    className={`btn font-oswald fw-bold px-3 py-2 rounded-2 ${currentPage === page ? 'btn-danger' : 'btn-outline-dark'}`}
                                                    style={{ fontSize: '14px', minWidth: '40px' }}
                                                    onClick={() => {
                                                        setCurrentPage(page);
                                                        document.getElementById('shop-products-section')?.scrollIntoView({ behavior: 'smooth' });
                                                    }}>
                                                    {page}
                                                </button>
                                            ))}

                                            <button 
                                                className="btn btn-outline-danger px-3 py-2 font-oswald text-uppercase fw-bold rounded-2"
                                                style={{ fontSize: '13px', letterSpacing: '1px' }}
                                                disabled={currentPage === totalPages}
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                                    document.getElementById('shop-products-section')?.scrollIntoView({ behavior: 'smooth' });
                                                }}>
                                                Sau <i className="fa-solid fa-chevron-right ms-1"></i>
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-5 border border-light-subtle rounded-3">
                                    <i className="fa-solid fa-box-open fa-4x text-muted mb-3 opacity-50"></i>
                                    <h3 className="font-oswald fw-bold text-uppercase">KHÔNG TÌM THẤY SẢN PHẨM NÀO</h3>
                                    <p className="fw-bold text-muted">Vui lòng thử lại với từ khóa hoặc bộ lọc khác.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

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
                <QuickCartModal productId={quickAddProductId} isOpen={true} onClose={() => setQuickAddProductId(null)} />
            )}
        </Layout>
    );
};

export default Shop;