import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [account, setAccount] = useState(() => {
        try {
            const saved = localStorage.getItem('account');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
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

    const [authVersion, setAuthVersion] = useState(0);
    const [showNotiDropdown, setShowNotiDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const unreadNotiCount = notifications.filter(n => n.unread).length;

    const fetchRealNotifications = async () => {
        const realNotis = [];
        const readNotiIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');

        // 1. Đơn hàng thực tế của User
        if (account) {
            try {
                const orderRes = await api.get('/api/orders');
                if (orderRes.data && orderRes.data.success && Array.isArray(orderRes.data.orders)) {
                    const userOrders = orderRes.data.orders.slice(0, 5);
                    userOrders.forEach(o => {
                        let notiTitle = '';
                        let notiDesc = '';
                        const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.final_amount || 0);
                        
                        let productNameText = '';
                        if (o.status === 1) {
                            notiTitle = `Đơn hàng #${o.order_code} đang chờ duyệt`;
                            notiDesc = `Đơn hàng trị giá ${amountStr} đã được hệ thống ghi nhận.`;
                        } else if (o.status === 2) {
                            notiTitle = `Đơn hàng #${o.order_code} đang được giao`;
                            notiDesc = `Đơn hàng đang trên đường vận chuyển. Hãy chú ý điện thoại!`;
                        } else if (o.status === 3) {
                            notiTitle = `Đơn hàng #${o.order_code} đã giao thành công`;
                            notiDesc = `Giao hàng thành công! Bạn đã tích thêm điểm thành viên.`;
                        } else if (o.status === 4) {
                            notiTitle = `Đơn hàng #${o.order_code} đã bị hủy`;
                            notiDesc = o.cancel_reason ? `Lý do: ${o.cancel_reason}` : `Đơn hàng đã hủy thành công.`;
                        }

                        if (notiTitle) {
                            const notiId = `order_${o.order_code}_${o.status}`;
                            const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : 'Gần đây';
                            realNotis.push({
                                id: notiId,
                                title: notiTitle,
                                desc: notiDesc,
                                time: dateStr,
                                unread: !readNotiIds.includes(notiId),
                                link: `/orders/detail/${o.order_code}`
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('Lỗi lấy đơn hàng cho thông báo:', e);
            }
        }

        // 2. Flash Sale thực tế đang diễn ra
        try {
            const fsRes = await api.get('/api/flash-sales/active');
            if (fsRes.data && fsRes.data.success && fsRes.data.campaign) {
                const camp = fsRes.data.campaign;
                const notiId = `fs_${camp.id}`;
                realNotis.push({
                    id: notiId,
                    title: `Flash Sale: ${camp.name || 'Giờ Vàng Giá Sốc'}`,
                    desc: `Khung giờ săn deal nảy lửa đang diễn ra. Đừng bỏ lỡ sản phẩm giảm đến 50%!`,
                    time: 'Đang diễn ra',
                    icon: 'fa-bolt text-warning',
                    unread: !readNotiIds.includes(notiId),
                    link: '/flash-sale'
                });
            }
        } catch (e) {}

        // 3. Mã giảm giá khả dụng thực tế
        try {
            const vRes = await api.get('/api/vouchers');
            if (vRes.data && vRes.data.success && Array.isArray(vRes.data.vouchers)) {
                const validVouchers = vRes.data.vouchers.slice(0, 2);
                validVouchers.forEach(v => {
                    const notiId = `voucher_${v.id || v.code}`;
                    const discountVal = (v.discount_percent && Number(v.discount_percent) > 0)
                        ? `${v.discount_percent}%`
                        : ((v.discount_amount && Number(v.discount_amount) > 0)
                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.discount_amount)
                            : 'đặc biệt');
                    realNotis.push({
                        id: notiId,
                        title: `Mã giảm giá mới: ${v.code}`,
                        desc: `Ưu đãi giảm ${discountVal} cho đơn hàng mua sắm hôm nay!`,
                        time: 'Mã mới',
                        icon: 'fa-ticket text-danger',
                        unread: !readNotiIds.includes(notiId),
                        link: '/cart'
                    });
                });
            }
        } catch (e) {}

        // 4. Thông tin Hạng thành viên thực tế
        if (account) {
            const points = account.points !== undefined ? account.points : 0;
            const rankName = account.rank_name || 'Thành Viên';
            const notiId = `member_${account.id || 'usr'}_${points}`;
            realNotis.push({
                id: notiId,
                title: `Hạng thành viên: ${rankName}`,
                desc: `Tích lũy hiện tại: ${points} điểm. Mua sắm thêm để nâng hạng tích ưu đãi!`,
                time: 'Thành viên',
                icon: 'fa-crown text-warning',
                unread: !readNotiIds.includes(notiId),
                link: '/membership'
            });
        }

        setNotifications(realNotis);
    };

    useEffect(() => {
        fetchRealNotifications();
    }, [authVersion, account?.id]);

    const markAllNotiAsRead = () => {
        setNotifications(prev => {
            const allIds = prev.map(n => n.id);
            localStorage.setItem('read_notifications', JSON.stringify(allIds));
            return prev.map(n => ({ ...n, unread: false }));
        });
    };

    const handleNotiClick = (e, noti) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const saved = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        if (!saved.includes(noti.id)) {
            saved.push(noti.id);
            localStorage.setItem('read_notifications', JSON.stringify(saved));
        }
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, unread: false } : n));
        setShowNotiDropdown(false);

        // Đóng Bootstrap Dropdown nếu đang mở
        const userDropdownEl = document.getElementById('userDropdown');
        if (userDropdownEl && window.bootstrap) {
            try {
                const bsDropdown = window.bootstrap.Dropdown.getInstance(userDropdownEl);
                if (bsDropdown) bsDropdown.hide();
            } catch (err) {}
        }

        if (noti.link) {
            navigate(noti.link);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.noti-dropdown-container')) {
                setShowNotiDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Lắng nghe sự kiện auth-changed (login/logout) để cập nhật Header
    useEffect(() => {
        const handleAuthChanged = () => {
            try {
                const saved = localStorage.getItem('account');
                if (saved) setAccount(JSON.parse(saved));
            } catch (e) {}
            setAuthVersion(v => v + 1);
        };
        window.addEventListener('auth-changed', handleAuthChanged);
        return () => window.removeEventListener('auth-changed', handleAuthChanged);
    }, []);

    const fetchCartCount = async () => {
        try {
            const cartRes = await api.get('/api/cart');
            if (cartRes.data && cartRes.data.success) {
                const items = cartRes.data.cartItems || [];
                const count = items.reduce((sum, item) => sum + item.quantity, 0);
                setCartCount(count);
            } else {
                setCartCount(0);
            }
        } catch (err) {
            setCartCount(0);
        }
    };

    useEffect(() => {
        fetchCartCount();
        window.addEventListener('cartUpdated', fetchCartCount);
        return () => window.removeEventListener('cartUpdated', fetchCartCount);
    }, []);

    useEffect(() => {
        const fetchHeaderData = async () => {
            try {
                const profileRes = await api.get('/api/profile');
                if (profileRes.data && profileRes.data.success) {
                    setAccount(profileRes.data.account);
                    localStorage.setItem('account', JSON.stringify(profileRes.data.account));
                } else {
                    setAccount(null);
                    localStorage.removeItem('account');
                }
            } catch (err) {
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setAccount(null);
                    localStorage.removeItem('account');
                }
            }

            fetchCartCount();

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
                    const activeCategories = (catRes.data.categories || []).filter(c => c.active !== false);
                    setCategories(activeCategories);
                } else if (Array.isArray(catRes.data)) {
                    const activeCategories = catRes.data.filter(c => c.active !== false);
                    setCategories(activeCategories);
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
    }, [location.pathname, authVersion]);

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
        } catch (err) {
            console.error('Lỗi đăng xuất:', err);
        } finally {
            localStorage.removeItem('account');
            setAccount(null);
            setCartCount(0);
            sessionStorage.setItem('toast_message', 'Đăng xuất thành công!');
            window.dispatchEvent(new Event('auth-changed'));
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
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói." }));
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
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đang tìm kiếm bằng hình ảnh...' }));

        const formData = new FormData();
        formData.append('image', file);

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
                                                <li className="position-relative noti-dropdown-container">
                                                    <button 
                                                        type="button" 
                                                        className="dropdown-item d-flex justify-content-between align-items-center w-100 text-start bg-transparent border-0 py-2" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowNotiDropdown(!showNotiDropdown);
                                                        }}
                                                    >
                                                        <span><i className="fa-solid fa-bell me-2"></i> Thông báo</span>
                                                        {unreadNotiCount > 0 && (
                                                            <span className="badge rounded-pill bg-danger text-white font-oswald" style={{ fontSize: '10px', padding: '3px 7px' }}>{unreadNotiCount}</span>
                                                        )}
                                                    </button>

                                                    {/* Sub-dropdown Thông báo */}
                                                    {showNotiDropdown && (
                                                        <div 
                                                            className="position-absolute end-100 top-0 me-2 bg-dark text-white rounded-4 shadow-lg p-0 animate__animated animate__fadeIn"
                                                            style={{
                                                                width: '320px',
                                                                zIndex: 1060,
                                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                backdropFilter: 'blur(12px)',
                                                                boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-black bg-opacity-40">
                                                                <span className="font-oswald text-uppercase fw-bold text-white d-flex align-items-center gap-2" style={{ fontSize: '13.5px', letterSpacing: '0.5px' }}>
                                                                    <i className="fa-solid fa-bell me-1"></i> THÔNG BÁO ({unreadNotiCount})
                                                                </span>
                                                                {unreadNotiCount > 0 && (
                                                                    <button 
                                                                        type="button"
                                                                        className="btn btn-link p-0 text-white-50 text-decoration-none font-oswald text-uppercase" 
                                                                        style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                                                        onClick={markAllNotiAsRead}
                                                                    >
                                                                        Đã đọc tất cả
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="noti-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                                {notifications.length === 0 ? (
                                                                    <div className="p-4 text-center text-muted font-oswald fs-6">
                                                                        Không có thông báo mới
                                                                    </div>
                                                                ) : (
                                                                    notifications.map(n => (
                                                                        <div 
                                                                            key={n.id} 
                                                                            className={`p-3 border-bottom border-secondary-subtle transition-all cursor-pointer ${n.unread ? 'bg-secondary bg-opacity-25' : 'opacity-75'}`}
                                                                            style={{ cursor: 'pointer' }}
                                                                            onClick={(e) => handleNotiClick(e, n)}
                                                                        >
                                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                                <span className="fw-bold font-oswald text-white d-flex align-items-center gap-1.5" style={{ fontSize: '13px' }}>
                                                                                    {n.unread && <span className="d-inline-block me-1 bg-danger rounded-circle flex-shrink-0" style={{ width: '7px', height: '7px' }}></span>}
                                                                                    <i className={`fa-solid ${n.icon ? n.icon.replace('text-warning', '').replace('text-danger', '') : 'fa-bell'} me-1`}></i>
                                                                                    <span>{n.title}</span>
                                                                                </span>
                                                                                <span className="text-white-50 ms-2" style={{ fontSize: '11px' }}>{n.time}</span>
                                                                            </div>
                                                                            <p className="m-0 text-white-50 font-oswald" style={{ fontSize: '12px', lineHeight: '1.4' }}>{n.desc}</p>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                            <div className="p-2 border-top border-secondary text-center bg-black bg-opacity-40">
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-link text-decoration-none text-white font-oswald text-uppercase fw-bold p-1 opacity-75 opacity-100-hover" 
                                                                    style={{ fontSize: '12px', letterSpacing: '0.5px' }}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setShowNotiDropdown(false);
                                                                        const userDropdownEl = document.getElementById('userDropdown');
                                                                        if (userDropdownEl && window.bootstrap) {
                                                                            try {
                                                                                const bsDropdown = window.bootstrap.Dropdown.getInstance(userDropdownEl);
                                                                                if (bsDropdown) bsDropdown.hide();
                                                                            } catch (err) {}
                                                                        }
                                                                        navigate('/notifications');
                                                                    }}
                                                                >
                                                                    <i className="fa-solid fa-bell me-1"></i> Xem tất cả thông báo
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
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
                                        <span 
                                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger text-white border border-2 border-dark font-oswald fw-bold"
                                            style={{
                                                fontSize: '11px',
                                                padding: '3px 7px',
                                                boxShadow: '0 0 10px rgba(229, 9, 20, 0.8)',
                                                minWidth: '20px',
                                                transform: 'translate(-30%, -30%)'
                                            }}
                                        >
                                            {cartCount}
                                        </span>
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
                                    <Link className={`nav-link nav-link-custom ${location.pathname === '/' ? 'active' : ''}`} to="/">
                                        <i className="fa-solid fa-house me-1"></i>TRANG CHỦ
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <a className={`nav-link nav-link-custom ${location.pathname.startsWith('/shop') ? 'active' : ''}`} href="#">
                                        <i className="fa-solid fa-layer-group me-1"></i>DANH MỤC <i className="fa fa-angle-down ms-1" style={{ fontSize: '10px' }}></i>
                                    </a>
                                    <div className="mega-menu">
                                        <div className="container">
                                            <div className="mega-content d-flex flex-wrap justify-content-center gap-5 py-3">
                                                <div className="mega-column">
                                                    <h5 className="text-danger mb-3" style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase' }}>Thương Hiệu</h5>
                                                    <ul className="list-unstyled">
                                                        {brands.map(brand => {
                                                            const bName = brand.name || brand.brand_name || brand.brandName || '';
                                                            return (
                                                                <li className="mb-2" key={brand.id}>
                                                                    <Link to={`/shop?brand=${encodeURIComponent(bName)}`}>{bName}</Link>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                                <div className="mega-column">
                                                    <h5 className="text-danger mb-3" style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase' }}>Dòng Sản Phẩm</h5>
                                                    <ul className="list-unstyled">
                                                        {categories.map(cat => {
                                                            const cName = cat.name || cat.category_name || cat.categoryName || '';
                                                            return (
                                                                <li className="mb-2" key={cat.id}>
                                                                    <Link to={`/shop?category=${cat.id}`}>{cName}</Link>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link nav-link-custom ${location.pathname === '/new-arrivals' ? 'active' : ''}`} to="/new-arrivals">
                                        <i className="fa-solid fa-star me-1 text-warning"></i>HÀNG MỚI
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link nav-link-custom ${location.pathname === '/membership' ? 'active' : ''}`} to="/membership">
                                        <i className="fa-solid fa-crown me-1 text-warning"></i>HẠNG THÀNH VIÊN
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link nav-link-custom ${location.pathname === '/flash-sale' ? 'active' : ''}`} to="/flash-sale">
                                        <i className="fa-solid fa-fire me-1 text-danger"></i>SALE SỐC
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={`nav-link nav-link-custom ${location.pathname === '/shop' ? 'active' : ''}`} to="/shop">
                                        <i className="fa-solid fa-bag-shopping me-1"></i>CỬA HÀNG
                                    </Link>
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
