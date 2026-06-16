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
    const initialCategory = queryParams.get('category') ? parseInt(queryParams.get('category')) : null;
    const initialBrand = queryParams.get('brand') ? parseInt(queryParams.get('brand')) : null;
    const initialSearch = queryParams.get('search') || '';

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [lookbooks, setLookbooks] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
    const [selectedBrand, setSelectedBrand] = useState(initialBrand || '');
    const [priceRange, setPriceRange] = useState('');
    const [sortOption, setSortOption] = useState('');
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [quickAddProductId, setQuickAddProductId] = useState(null);
    
    const observerRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        fetchFilters();
        fetchWishlistIds();
        fetchProducts();
        fetchLookbooks();
    }, [selectedCategory, selectedBrand, priceRange, sortOption]);

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

            if (brandRes.data && brandRes.data.success) setBrands(brandRes.data.brands || []);
            else if (Array.isArray(brandRes.data)) setBrands(brandRes.data);
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
            
            if (priceRange) {
                const [min, max] = priceRange.split('-').map(Number);
                data = data.filter(p => {
                    const price = p.min_price || 0;
                    if (max) return price >= min && price <= max;
                    return price >= min;
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
        return `http://localhost:8080${url}`;
    };

    return (
        <Layout>
            <div className="shop-epic-theme">
                <div className="epic-page-header py-5 bg-black text-white">
                    <div className="container text-center">
                        <span className="bg-danger px-2 py-1 font-oswald fw-bold fs-5 text-uppercase">CỬA HÀNG</span>
                        <h1 className="font-oswald display-3 fw-bold mt-2 mb-0">BỘ SƯU TẬP GIÀY</h1>
                    </div>
                </div>

                <div className="container py-5">
                    <div className="row g-5">
                        {/* FILTER SIDEBAR */}
                        <div className="col-lg-3">
                            <div className="epic-filter-sidebar bg-white border border-light-subtle p-4 rounded-3">
                                <h4 className="font-oswald fw-bold text-uppercase mb-4 pb-2 border-bottom border-light-subtle">BỘ LỌC TÌM KIẾM</h4>

                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">TÌM KIẾM</h6>
                                    <input type="text" className="epic-input w-100" placeholder="Nhập tên sản phẩm..."
                                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>

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
                                        {brands.map(brand => (
                                            <div className="form-check epic-radio" key={brand.id}>
                                                <input className="form-check-input" type="radio" name="brand" id={`brand${brand.id}`}
                                                    checked={selectedBrand === brand.id} onChange={() => setSelectedBrand(brand.id)} />
                                                <label className="form-check-label fw-bold" htmlFor={`brand${brand.id}`}>{brand.name || brand.brand_name || brand.brandName}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h6 className="font-oswald fw-bold text-uppercase text-danger mb-2">MỨC GIÁ</h6>
                                    <select className="epic-select w-100" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                                        <option value="">Tất cả các mức giá</option>
                                        <option value="0-1000000">Dưới 1,000,000đ</option>
                                        <option value="1000000-2000000">1,000,000đ - 2,000,000đ</option>
                                        <option value="2000000-3000000">2,000,000đ - 3,000,000đ</option>
                                        <option value="3000000-">Trên 3,000,000đ</option>
                                    </select>
                                </div>

                                <div>
                                    <button className="btn-brutal-outline w-100 mt-2" onClick={() => {
                                        setSelectedCategory(''); setSelectedBrand(''); setPriceRange(''); setSortOption(''); setSearchQuery('');
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
                                <img src="https://images.unsplash.com/photo-1512374382149-433853003064?w=800&auto=format&fit=crop" alt="Chiến dịch" className="w-100 h-100 object-fit-cover" style={{ transition: 'transform 0.5s ease' }} />
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