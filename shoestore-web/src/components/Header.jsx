import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [account, setAccount] = useState(null);
    const [cartCount, setCartCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('search') || '';
    });
    const [isListening, setIsListening] = useState(false);
    const [isUploadingImg, setIsUploadingImg] = useState(false);
    const [toast, setToast] = useState(null);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        const fetchHeaderData = async () => {
            try {
                const profileRes = await api.get('/api/profile');
                if (profileRes.data && profileRes.data.success) {
                    setAccount(profileRes.data.account);
                }
            } catch (err) {
                setAccount(null);
            }

            try {
                const cartRes = await api.get('/api/cart');
                if (cartRes.data && cartRes.data.success) {
                    const items = cartRes.data.cartItems || [];
                    const count = items.reduce((sum, item) => sum + item.quantity, 0);
                    setCartCount(count);
                }
            } catch (err) {
                setCartCount(0);
            }

            try {
                const brandRes = await api.get('/api/brands');
                if (brandRes.data && brandRes.data.success) {
                    const activeBrands = (brandRes.data.brands || []).filter(b => b.active !== false);
                    setBrands(activeBrands);
                } else if (Array.isArray(brandRes.data)) {
                    const activeBrands = brandRes.data.filter(b => b.active !== false);
                    setBrands(activeBrands);
                }
            } catch (err) {
                console.error("Lỗi tải thương hiệu ở header:", err);
            }

            try {
                const catRes = await api.get('/api/categories');
                if (catRes.data && catRes.data.success) {
                    setCategories(catRes.data.categories || []);
                } else if (Array.isArray(catRes.data)) {
                    setCategories(catRes.data);
                }
            } catch (err) {
                console.error("Lỗi tải danh mục ở header:", err);
            }
        };

        fetchHeaderData();

        // Check for toast message in sessionStorage
        const msg = sessionStorage.getItem('toast_message');
        if (msg) {
            setToast(msg);
            sessionStorage.removeItem('toast_message');
        }

        // Custom event to trigger toast dynamically
        const handleShowToast = (e) => {
            setToast(e.detail);
        };

        window.addEventListener('show-toast', handleShowToast);
        return () => {
            window.removeEventListener('show-toast', handleShowToast);
        };
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchVal = params.get('search') || '';
        setSearchQuery(searchVal);
    }, [location.search]);

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout');
            sessionStorage.setItem('toast_message', 'Đăng xuất thành công!');
            setAccount(null);
            setCartCount(0);
            navigate('/login');
        } catch (err) {
            console.error('Lỗi đăng xuất:', err);
            setAccount(null);
            setCartCount(0);
            navigate('/login');
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        if (location.pathname === '/shop') {
            navigate('/shop');
        }
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setSearchQuery(transcript);
            navigate(`/shop?search=${encodeURIComponent(transcript)}`);
        };

        recognition.onerror = (event) => {
            console.error("Lỗi nhận diện giọng nói:", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingImg(true);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đang tìm kiếm sản phẩm tương đồng...' }));

        const formData = new FormData();
        formData.append('image', file); // field name: 'image'

        try {
            const res = await api.post('/api/image-search', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.success) {
                const imageUrl = URL.createObjectURL(file);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Tìm thấy ${res.data.count || 0} sản phẩm tương đồng!` }));
                navigate('/shop', {
                    state: {
                        imageSearchProducts: res.data.products || [],
                        imageSearchUrl: imageUrl
                    }
                });
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data?.message || 'Không tìm thấy sản phẩm tương đồng' }));
            }
        } catch (err) {
            console.error('❌ Lỗi image search:', err);
            const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tìm kiếm hình ảnh';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
        } finally {
            setIsUploadingImg(false);
            e.target.value = null;
        }
    };

    return (
        <>
            <header className="cinematic-header">
                <div className="container py-4">
                    <div className="row align-items-center">
                        <div className="col-md-3 text-center text-md-start">
                            <Link to="/" className="text-decoration-none">
                                <h2 className="brand-logo font-oswald" style={{ fontWeight: 800, letterSpacing: '-1px' }}>
                                    <span style={{ color: '#fff' }}>SHOE</span><span style={{ color: '#e50914' }}>STORE</span>
                                </h2>
                            </Link>
                        </div>


                        <div className="col-md-5 my-3 my-md-0">
                            <form onSubmit={handleSearch} className="search-wrapper">
                                <div className="input-group">
                                    <input type="text" name="q" className="form-control search-input"
                                        placeholder="Tìm kiếm phong cách, thương hiệu..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} />

                                    {searchQuery && (
                                        <button type="button" onClick={handleClearSearch} className="btn search-btn clear-btn" title="Xóa tìm kiếm">
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    )}

                                    <input type="file" id="imageSearchInput" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                    <button type="button" onClick={() => document.getElementById('imageSearchInput').click()} className="btn search-btn" style={{ color: isUploadingImg ? '#e50914' : '#fff' }} title="Tìm kiếm bằng hình ảnh">
                                        <i className={`fa ${isUploadingImg ? 'fa-spinner fa-spin' : 'fa-camera'}`}></i>
                                    </button>

                                    <button type="button" onClick={startListening} className={`btn search-btn mic-btn ${isListening ? 'mic-btn-active' : ''}`} title="Tìm kiếm bằng giọng nói">
                                        <i className={`fa ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`} style={{ animation: isListening ? 'pulse 1.5s infinite' : 'none' }}></i>
                                    </button>
                                    <button className="btn search-btn submit-btn" type="submit"><i className="fa fa-search"></i></button>
                                </div>
                            </form>
                        </div>

                        <div className="col-md-4 text-center text-md-end">
                            <div className="icon-group d-inline-flex gap-3 align-items-center">

                                <div className="dropdown">
                                    <a href="#" className="icon-item" id="userDropdown" role="button" data-bs-toggle="dropdown"
                                        aria-expanded="false" data-bs-display="static">
                                        <i className="fa fa-user"></i>
                                    </a>

                                    <ul className="dropdown-menu dropdown-menu-end user-dropdown-menu"
                                        aria-labelledby="userDropdown">
                                        {!account ? (
                                            <>
                                                <li><Link className="dropdown-item" to="/login"><i className="fa fa-sign-in me-2"></i> Đăng nhập</Link></li>
                                                <li><Link className="dropdown-item" to="/register"><i className="fa fa-user-plus me-2"></i> Đăng ký</Link></li>
                                            </>
                                        ) : (
                                            <>
                                                <li>
                                                    <span className="dropdown-item-text">
                                                        Hello, <b>{account.full_name || 'User'}</b>
                                                    </span>
                                                </li>
                                                <li><hr className="dropdown-divider" /></li>
                                                <li><Link className="dropdown-item" to="/profile"><i className="fa fa-id-card-o me-2"></i> Hồ sơ</Link></li>
                                                <li><Link className="dropdown-item" to="/orders"><i className="fa fa-box-open me-2"></i> Đơn hàng</Link></li>
                                                <li><Link className="dropdown-item" to="/change-password"><i className="fa fa-key me-2"></i> Mật khẩu</Link></li>
                                                {account.role === 'ADMIN' && (
                                                    <li><Link className="dropdown-item" to="/admin/dashboard" style={{ color: '#00f2ff' }}><i className="fa fa-cogs me-2"></i> Trang Quản Trị</Link></li>
                                                )}
                                                {account.role === 'SHIPPER' && (
                                                    <li><Link className="dropdown-item" to="/shipper/dashboard" style={{ color: '#ff9800' }}><i className="fa fa-truck me-2"></i> Kênh Giao Hàng</Link></li>
                                                )}
                                                <li><hr className="dropdown-divider" /></li>
                                                <li>
                                                    <button type="button" onClick={handleLogout} className="btn-logout-transparent w-100 text-start">
                                                        <i className="fa fa-power-off me-2"></i> Đăng xuất
                                                    </button>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>

                                <Link to="/favourites" className="icon-item" title="Yêu thích"><i className="fa fa-heart"></i></Link>
                                <Link to="/cart" className="icon-item position-relative" title="Giỏ hàng">
                                    <i className="fa fa-shopping-cart"></i>
                                    {cartCount > 0 && (
                                        <span className="cart-badge position-absolute top-0 start-100 translate-middle badge rounded-pill">{cartCount}</span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="navbar navbar-expand-lg navbar-dark custom-navbar">
                    <div className="container">
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
                            <ul className="navbar-nav gap-3">
                                <li className="nav-item">
                                    <Link className="nav-link nav-link-custom" to="/">TRANG CHỦ</Link>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link nav-link-custom" href="#">DANH MỤC <i className="fa fa-angle-down ms-1" style={{ fontSize: '10px' }}></i></a>
                                    <div className="mega-menu">
                                        <div className="container">
                                            <div className="mega-content d-flex flex-wrap justify-content-center gap-5 py-3">
                                                <div className="mega-column">
                                                    <h5 className="text-danger mb-3" style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase' }}>Thương Hiệu</h5>
                                                    <ul className="list-unstyled">
                                                        {brands.length > 0 ? (
                                                            brands.map(brand => {
                                                                const bName = brand.name || brand.brand_name || brand.brandName || '';
                                                                return (
                                                                    <li className="mb-2" key={brand.id}>
                                                                        <Link to={`/shop?brand=${encodeURIComponent(bName)}`}>{bName}</Link>
                                                                    </li>
                                                                );
                                                            })
                                                        ) : (
                                                            <>
                                                                <li className="mb-2"><Link to="/shop?brand=Nike">Nike</Link></li>
                                                                <li className="mb-2"><Link to="/shop?brand=Adidas">Adidas</Link></li>
                                                            </>
                                                        )}
                                                    </ul>
                                                </div>
                                                <div className="mega-column">
                                                    <h5 className="text-danger mb-3" style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase' }}>Dòng Sản Phẩm</h5>
                                                    <ul className="list-unstyled">
                                                        {categories.length > 0 ? (
                                                            categories.map(cat => {
                                                                const cName = cat.name || cat.category_name || cat.categoryName || '';
                                                                return (
                                                                    <li className="mb-2" key={cat.id}>
                                                                        <Link to={`/shop?category=${cat.id}`}>{cName}</Link>
                                                                    </li>
                                                                );
                                                            })
                                                        ) : (
                                                            <>
                                                                <li className="mb-2"><Link to="/shop?category=Sneaker">Sneaker</Link></li>
                                                                <li className="mb-2"><Link to="/shop?category=Running">Running</Link></li>
                                                            </>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link nav-link-custom" to="/new-arrivals">
                                        <i className="fa fa-star me-1"></i>HÀNG MỚI
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link nav-link-custom" to="/membership">
                                        <i className="fa fa-fire me-1"></i>HẠNG THÀNH VIÊN
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link nav-link-custom" to="/flash-sale">
                                        <i className="fa fa-fire me-1"></i>SALE SỐC
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link nav-link-custom" to="/shop">CỬA HÀNG</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
            </header>
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    backgroundColor: '#198754',
                    color: '#fff',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(25, 135, 84, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 99999,
                    fontWeight: '600',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '15px'
                }} className="animate__animated animate__fadeInDown">
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '18px' }}></i>
                    {toast}
                </div>
            )}
        </>
    );
};

export default Header;
