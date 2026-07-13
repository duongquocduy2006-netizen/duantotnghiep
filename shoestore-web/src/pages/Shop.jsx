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

    // ── AI Image Search state: khởi tạo ĐỒNG BỘ từ location.state để tránh race condition ──
    // Nếu dùng null + useEffect, fetchProducts() sẽ chạy trước khi AI state được set
    const [aiResult, setAiResult] = useState(() => location.state?.aiResult || null);
    const [aiResultProducts, setAiResultProducts] = useState(() => {
        // phân biệt: undefined (không có AI) vs [] (AI không tìm thấy)
        if (location.state?.aiResult) {
            const p = location.state.aiResultProducts;
            return Array.isArray(p) ? p : [];
        }
        return null; // null = không ở AI mode
    });
    const [imageUrl, setImageUrl] = useState(() => location.state?.imageUrl || null);

    // products: pre-seed từ AI nếu có, tránh flash trống
    const [products, setProducts] = useState(() => {
        if (location.state?.aiResult && Array.isArray(location.state?.aiResultProducts)) {
            console.log(`[AI INIT] Pre-seeding ${location.state.aiResultProducts.length} sản phẩm từ AI`);
            return location.state.aiResultProducts;
        }
        return [];
    });

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(!location.state?.aiResult); // false nếu AI đã có data
    const [wishlistIds, setWishlistIds] = useState([]);
    const [lookbooks, setLookbooks] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState(initialBrand);
    const [maxPrice, setMaxPrice] = useState(5000000);
    const [sortOption, setSortOption] = useState('');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [quickAddProductId, setQuickAddProductId] = useState(null);

    const observerRef = useRef(null);
    const aiInitializedRef = useRef(false);


    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const hasFilter = queryParams.get('brand') || queryParams.get('category') || queryParams.get('search');
        if (!hasFilter) {
            window.scrollTo(0, 0);
        }
    }, []);

    // Parse AI result from location state
    // Note: state đã được khởi tạo đồng bộ từ useState ở trên.
    // useEffect này chỉ để handle khi user ĐIỀU HƯỚNG lại (location.state thay đổi sau mount)
    useEffect(() => {
        if (location.state?.aiResult) {
            const aiData = location.state.aiResult;
            const productsFromBackend = Array.isArray(location.state.aiResultProducts)
                ? location.state.aiResultProducts : [];

            console.log('🤖 [AI useEffect] Cập nhật AI state do location.state thay đổi');
            console.log(`  Brand: ${aiData.brand} | Category: ${aiData.category} | Color: ${aiData.color}`);
            console.log(`  Số sản phẩm AI: ${productsFromBackend.length}`);

            setAiResult(aiData);
            setImageUrl(location.state.imageUrl);
            setAiResultProducts(productsFromBackend);
            setProducts(productsFromBackend);
            setLoading(false);

            setTimeout(() => {
                const section = document.getElementById('shop-products-section');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [location.state]);


    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);

        // 1. Đồng bộ từ khóa tìm kiếm
        const searchParam = queryParams.get('search') || '';
        if (searchParam !== searchQuery) {
            setSearchQuery(searchParam);
        }

        // 2 & 3. Chỉ đồng bộ brand/category từ URL khi KHÔNG ở chế độ AI
        // (Nếu đang AI mode: location.state có aiResult → brand/category đã được set từ AI, không override)
        if (!location.state?.aiResult) {
            // 2. Đồng bộ thương hiệu
            const brandParam = queryParams.get('brand') || '';
            if (brandParam !== selectedBrand) {
                setSelectedBrand(brandParam);
            }

            // 3. Đồng bộ danh mục
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
        fetchLookbooks();
    }, []);

    // Khi categories đã load, tự động tick category khớp với AI result
    useEffect(() => {
        if (aiResult?.category && categories.length > 0 && selectedCategory === '') {
            const aiCatName = aiResult.category.toLowerCase();
            const matched = categories.find(c => {
                const name = (c.name || c.category_name || c.categoryName || '').toLowerCase();
                return name.includes(aiCatName) || aiCatName.includes(name);
            });
            if (matched) {
                console.log(`📂 Auto-select category: ${matched.name || matched.categoryName} (id=${matched.id})`);
                setSelectedCategory(matched.id);
            }
        }
    }, [categories, aiResult]);

    useEffect(() => {
        // ── GUARD AI MODE ──
        // aiResultProducts !== null nghĩa là đang ở AI mode → KHÔNG gọi fetchProducts
        // aiResultProducts === null nghĩa là bình thường → gọi fetchProducts
        if (aiResultProducts !== null) {
            console.log(`[Shop] AI mode ON — hiển thị ${aiResultProducts.length} sản phẩm AI, bỏ qua fetchProducts`);
            setProducts(aiResultProducts);
            setLoading(false);
            return;
        }
        console.log(`[Shop] Normal mode — gọi fetchProducts (cat=${selectedCategory}, brand=${selectedBrand})`);
        fetchProducts();
    }, [selectedCategory, selectedBrand, maxPrice, sortOption, aiResultProducts]);


    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery) {
                // User gõ tìm kiếm → thoát AI mode, tìm bình thường
                console.log(`[Shop] User search: "${searchQuery}" → thoát AI mode, gọi fetchProducts`);
                setAiResult(null);
                setAiResultProducts(null);
                setImageUrl(null);
                fetchProducts();
            } else {
                // searchQuery rỗng VÀ đang ở AI mode → KHÔNG gọi fetchProducts (tránh overwrite AI)
                if (aiResultProducts !== null) {
                    console.log('[Shop] searchQuery rỗng, AI mode ON → giữ nguyên AI products, không fetchProducts');
                    return;
                }
                // searchQuery rỗng, không AI mode → fetchProducts bình thường
                console.log('[Shop] searchQuery rỗng, không AI mode → fetchProducts');
                fetchProducts();
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery, aiResultProducts]);

    // Auto scroll when products loaded after search
    useEffect(() => {
        if (!loading && products.length > 0 && searchQuery) {
            setTimeout(() => {
                const section = document.getElementById('shop-products-section');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [loading, products, searchQuery]);

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

    const fetchLookbooks = async () => {
        try {
            const res = await api.get('/api/lookbooks');
            if (res.data) {
                setLookbooks(res.data);
            }
        } catch (e) {
            console.error("Lỗi tải lookbook:", e);
        }
    };

    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                api.get('/api/categories'),
                api.get('/api/brands')
            ]);
            if (catRes.data && catRes.data.success) setCategories(catRes.data.categories || []);
            else if (Array.isArray(catRes.data)) setCategories(catRes.data);

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
            // Backend (/api/products/search) luôn lọc pv.quantity > 0 nên không cần truyền inStock
            let url = '/api/products/search';
            if (searchQuery) url += `?keyword=${encodeURIComponent(searchQuery)}`;
            if (selectedCategory) url += `${url.includes('?') ? '&' : '?'}category=${selectedCategory}`;
            if (selectedBrand) url += `${url.includes('?') ? '&' : '?'}brand=${encodeURIComponent(selectedBrand)}`;
            if (sortOption) url += `${url.includes('?') ? '&' : '?'}sort=${sortOption}`;

            console.log('🔍 API Call:', url);

            const response = await api.get(url);
            let data = [];
            if (response.data && response.data.success) data = response.data.products || [];

            console.log(`📦 API trả về: ${data.length} sản phẩm`);

            // Lọc theo giá (frontend vì backend không có param maxPrice riêng trong /search)
            if (maxPrice < 5000000) {
                data = data.filter(p => {
                    const price = p.min_price || 0;
                    return price <= maxPrice;
                });
            }

            console.log(`✅ Sau lọc giá: ${data.length} sản phẩm`);
            setProducts(data);
        } catch (error) {
            console.error("❌ Lỗi tải sản phẩm:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return null; // Không sử dụng mock image
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleAiBrandClick = () => {
        if (aiResult?.brand) {
            setSelectedBrand(aiResult.brand);
        }
    };

    return (
        <Layout>
            <div className="shop-epic-theme">
                {/* CREATIVE BRUTALIST LOOKBOOK BOARD (CENTERED & 100% INNOVATIVE) */}
                <div className="shop-editorial-header py-5 text-center">
                    <div className="container">
                        <div className="animate__animated animate__fadeInDown">
                            <span className="shop-tag-accent">CỬA HÀNG CHÍNH THỨC</span>
                            <h1 className="shop-main-title font-oswald text-uppercase mt-3 mb-2">
                                BỘ SƯU TẬP <span className="text-red-accent">GIÀY THỂ THAO</span>
                            </h1>
                            <p className="shop-sub-desc mx-auto">
                                Khám phá phong cách thời trang đường phố từ cộng đồng ShoeStore Việt Nam.
                            </p>
                        </div>

                        <div className="shop-lookbook-board mt-5 animate__animated animate__fadeInUp">
                            <div className="collage-card card-1">
                                <img src={getImageUrl(lookbooks[0]?.imageUrl || lookbooks[0]?.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600')} alt="Bộ sưu tập 1" />
                                <span>{lookbooks[0]?.caption || '#ĐƯỜNG_PHỐ'}</span>
                            </div>
                            <div className="collage-card card-2">
                                <img src={getImageUrl(lookbooks[1]?.imageUrl || lookbooks[1]?.image_url || 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600')} alt="Bộ sưu tập 2" />
                                <span>{lookbooks[1]?.caption || '#CÁ_TÍNH'}</span>
                            </div>
                            <div className="collage-card card-3">
                                <img src={getImageUrl(lookbooks[2]?.imageUrl || lookbooks[2]?.image_url || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600')} alt="Bộ sưu tập 3" />
                                <span>{lookbooks[2]?.caption || '#THỜI_TRANG'}</span>
                            </div>
                            <div className="collage-card card-4">
                                <img src={getImageUrl(lookbooks[3]?.imageUrl || lookbooks[3]?.image_url || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600')} alt="Bộ sưu tập 4" />
                                <span>{lookbooks[3]?.caption || '#NĂNG_ĐỘNG'}</span>
                            </div>
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
                                                checked={selectedCategory === ''} onChange={() => { setAiResultProducts(null); setSelectedCategory(''); }} />
                                            <label className="form-check-label fw-bold" htmlFor="catAll">Tất cả</label>
                                        </div>
                                        {categories.map(cat => (
                                            <div className="form-check epic-radio" key={cat.id}>
                                                <input className="form-check-input" type="radio" name="category" id={`cat${cat.id}`}
                                                    checked={selectedCategory === cat.id} onChange={() => { setAiResultProducts(null); setSelectedCategory(cat.id); }} />
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
                                                checked={selectedBrand === '' && !aiResult} onChange={() => { setAiResultProducts(null); setSelectedBrand(''); }} />
                                            <label className="form-check-label fw-bold" htmlFor="brandAll">Tất cả</label>
                                        </div>

                                        {brands.map(brand => {
                                            const bName = brand.name || brand.brand_name || brand.brandName || '';
                                            const isChecked = aiResult
                                                ? bName.toLowerCase() === (aiResult.brand || '').toLowerCase()
                                                : selectedBrand === bName;
                                            return (
                                                <div className="form-check epic-radio" key={brand.id}>
                                                    <input className="form-check-input" type="radio" name="brand" id={`brand${brand.id}`}
                                                        checked={isChecked} onChange={() => { setAiResultProducts(null); setSelectedBrand(bName); }} />
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
                                        // Xóa toàn bộ AI state và filter, fetch lại từ đầu
                                        setAiResult(null); setAiResultProducts(null); setImageUrl(null);
                                        setSelectedCategory(''); setSelectedBrand(''); setMaxPrice(5000000); setSortOption(''); setSearchQuery('');
                                        navigate('/shop');
                                    }}>XÓA BỘ LỌC</button>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT GRID */}
                        <div className="col-lg-9 position-relative">
                            {/* Decorative Watermark background */}
                            <div className="position-absolute w-100 h-100 top-0 left-0 overflow-hidden d-none d-lg-block" style={{ pointerEvents: 'none', zIndex: 0, opacity: 0.015 }}>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', left: '10%', top: '5%', letterSpacing: '4px' }}>GIÀY THỂ THAO</div>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', right: '5%', top: '40%', letterSpacing: '4px' }}>PHONG CÁCH</div>
                                <div className="font-oswald text-uppercase fw-bold position-absolute" style={{ fontSize: '10vw', left: '15%', top: '75%', letterSpacing: '4px' }}>BỘ SƯU TẬP</div>
                            </div>

                            {/* AI RESULT ANALYSIS */}
                            {aiResult && (
                                <div className="mb-5 pb-4 border-bottom border-light-subtle animate__animated animate__fadeInUp">
                                    {/* Header */}
                                    <div className="mb-3">
                                        <span className="font-oswald fw-bold text-uppercase" style={{ fontSize: '12px', letterSpacing: '1px', color: '#999' }}>
                                            TÌM THẤY <span className="text-danger" style={{ fontSize: '16px', fontWeight: '900' }}>{products.length}</span> SẢN PHẨM
                                        </span>
                                    </div>

                                    {/* Main AI Result - Horizontal Layout with Hover */}
                                    <div
                                        className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 position-relative"
                                        style={{
                                            background: '#f9f9f9',
                                            border: '2px solid #f0f0f0',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#ff9800';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.2)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#f0f0f0';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {/* Image */}
                                        <div style={{ flexShrink: 0 }}>
                                            {imageUrl && (
                                                <div className="position-relative" style={{ display: 'inline-block' }}>
                                                    <img src={imageUrl} alt="Uploaded" className="rounded-2 shadow-sm" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '11px', zIndex: 10 }}>
                                                        Hình của bạn
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Details Text */}
                                        <div style={{ flex: 1 }}>
                                            <h6 className="text-secondary mb-2 font-oswald" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>
                                                KẾT QUẢ TÌM KIẾM
                                            </h6>
                                            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333' }}>
                                                <span>
                                                    <strong>Hãng:</strong>
                                                    <span
                                                        onClick={handleAiBrandClick}
                                                        style={{
                                                            marginLeft: '6px',
                                                            cursor: 'pointer',
                                                            color: selectedBrand === aiResult?.brand ? '#e50914' : '#000',
                                                            fontWeight: selectedBrand === aiResult?.brand ? '700' : '600',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        title="Click để lọc theo thương hiệu"
                                                    >
                                                        {aiResult.brand || 'N/A'}
                                                    </span>
                                                </span>
                                                <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                                                <span>
                                                    <strong>Màu:</strong>
                                                    <span style={{ marginLeft: '6px', fontWeight: '600' }}>{aiResult.color || 'N/A'}</span>
                                                </span>
                                                <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                                                <span>
                                                    <strong>Loại:</strong>
                                                    <span style={{ marginLeft: '6px', fontWeight: '600' }}>{aiResult.category || 'N/A'}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Clear Button with Border */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8px 12px',
                                            border: '2px solid #e50914',
                                            borderRadius: '6px',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#ffe8e8';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(229, 9, 20, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#fff';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}>
                                            <button
                                                onClick={() => {
                                                    console.log('🗑️  Xóa AI result');
                                                    setAiResult(null);
                                                    setAiResultProducts(null);
                                                    setImageUrl(null);
                                                    setSelectedBrand('');
                                                    setSelectedCategory('');
                                                    setSearchQuery('');
                                                    setLoading(true);
                                                    // Refetch all products after clearing
                                                    setTimeout(() => {
                                                        fetchProducts();
                                                    }, 100);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#e50914',
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    padding: '0',
                                                    letterSpacing: '0.5px'
                                                }}
                                                title="Xóa kết quả tìm kiếm"
                                            >
                                                XÓA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center border-bottom border-light-subtle pb-3 mb-4 flex-wrap gap-3">
                                <span className="font-oswald fw-bold fs-5 text-uppercase">
                                    {aiResult ? 'SẢN PHẨM TƯƠNG ĐỒNG' : 'TÌM THẤY'} <span className="text-danger">{products.length}</span> {!aiResult && 'SẢN PHẨM'}
                                </span>
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
                                                    {getImageUrl(p.image_url) ? (
                                                        <img src={getImageUrl(p.image_url)} alt={p.product_name} className="product-card-img w-100 h-100" style={{ objectFit: 'contain' }} />
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
                    </div>

                    {/* LOOKBOOK GALLERY — API driven, same as NewArrivals */}
                    <div className="py-5 mt-5 border-top border-light-subtle">
                        <div className="na-section-header text-center mb-5 reveal-item opacity-0">
                            <span className="na-section-tag">Cảm hứng phong cách</span>
                            <h2 className="na-section-title">PHONG CÁCH ĐƯỜNG PHỐ</h2>
                            <p className="na-section-subtitle">Xem cách cộng đồng ShoesStore tự tin thể hiện cá tính cùng những thiết kế yêu thích.</p>
                        </div>

                        <div className="row g-4 reveal-item opacity-0">
                            {(lookbooks && lookbooks.length > 0 ? lookbooks : [
                                { id: 'd1', caption: '#shoesstore_style', imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=600' },
                                { id: 'd2', caption: '#phong_cach', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=600' },
                                { id: 'd3', caption: '#dung_dan', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600' },
                                { id: 'd4', caption: '#thoi_trang', imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600' }
                            ]).map(lb => (
                                <div key={lb.id} className="col-lg-3 col-md-6 col-6">
                                    <div className="na-lookbook-card">
                                        <img src={getImageUrl(lb.imageUrl)} alt={lb.caption} />
                                        <div className="na-lookbook-overlay">
                                            <span>{lb.caption}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                <QuickCartModal productId={quickAddProductId} onClose={() => setQuickAddProductId(null)} />
            )}
        </Layout>
    );
};

export default Shop;