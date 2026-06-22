import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./admin-style.css";

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Thay đổi nền body sang màu xám sáng khi ở trang admin
        document.body.style.backgroundColor = '#f4f5f7';
        return () => {
            // Khôi phục nền tối mặc định khi rời khỏi admin
            document.body.style.backgroundColor = '';
        };
    }, []);

    useEffect(() => {
        // Check for toast message in sessionStorage
        const msg = sessionStorage.getItem('toast_message');
        if (msg) {
            setToast(msg);
            sessionStorage.removeItem('toast_message');
        }

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

    const menuItems = [
        { label: 'KINH DOANH', type: 'label' },
        { path: '/admin/dashboard', icon: 'bi-grid-fill', label: 'Tổng Quan' },
        { path: '/admin/orders', icon: 'bi-cart-check', label: 'Đơn Hàng' },
        { path: '/admin/customers', icon: 'bi-people-fill', label: 'Khách Hàng' },
        { path: '/admin/ranks', icon: 'bi-gem', label: 'Hạng Thành Viên' },

        { label: 'KHO & SẢN PHẨM', type: 'label' },
        { path: '/admin/products', icon: 'bi-box-seam-fill', label: 'Sản Phẩm' },
        { path: '/admin/categories', icon: 'bi-tags-fill', label: 'Danh Mục' },
        { path: '/admin/brands', icon: 'bi-award-fill', label: 'Thương Hiệu' },

        { label: 'QUẢN LÝ NÂNG CAO', type: 'label' },
        { path: '/admin/banners', icon: 'bi-collection-play-fill', label: 'Quản Lý Banners' },
        { path: '/admin/lookbooks', icon: 'bi-image-fill', label: 'Quản Lý Lookbooks' },

        { label: 'HỆ THỐNG & KHUYẾN MÃI', type: 'label' },
        { path: '/admin/flashsales', icon: 'bi-lightning-charge-fill', label: 'Flash Sale' },
        { path: '/admin/vouchers', icon: 'bi-ticket-perforated-fill', label: 'Mã Giảm Giá (Voucher)' },
    ];
    const toastStr = toast ? String(toast) : '';
    const isToastError = toastStr.toLowerCase().includes('lỗi') || 
                         toastStr.toLowerCase().includes('thất bại') || 
                         toastStr.toLowerCase().includes('vui lòng') || 
                         toastStr.toLowerCase().includes('chưa') || 
                         toastStr.toLowerCase().includes('không');
    const toastBgColor = isToastError ? '#dc2626' : '#198754';
    const toastBgShadow = isToastError ? 'rgba(220, 38, 38, 0.2)' : 'rgba(25, 135, 84, 0.2)';
    const toastIconClass = isToastError ? 'bi bi-exclamation-circle-fill' : 'bi bi-check-circle-fill';

    return (
        <div className="admin-wrapper">
            {/* SIDEBAR */}
            <aside className={`sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-branding">
                    {!isCollapsed && (
                        <Link to="/admin" className="brand-logo" style={{ textDecoration: 'none' }}>
                            <h2 className="font-oswald" style={{ fontWeight: 800, margin: 0, fontSize: '24px', letterSpacing: '-1px' }}>
                                <span style={{ color: '#fff' }}>SHOE</span><span style={{ color: '#e50914' }}>STORE</span>
                            </h2>
                        </Link>
                    )}
                    <button
                        className="toggle-sidebar-btn"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <i className={`bi ${isCollapsed ? 'bi-text-indent-left' : 'bi-text-indent-right'}`}></i>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item, index) => {
                        if (item.type === 'label') {
                            return <div key={index} className="nav-label">{item.label}</div>;
                        }
                        return (
                            <li key={item.path} style={{ listStyle: 'none' }}>
                                <Link to={item.path} className={`nav-link ${location.pathname === item.path || (item.path === '/admin/products' && location.pathname.startsWith('/admin/products/detail')) ? 'active' : ''}`}>
                                    <i className={`bi ${item.icon}`}></i>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </nav>

                <div className="logout-wrapper">
                    <Link to="/login" className="btn-logout">
                        <i className="bi bi-box-arrow-right" style={{ marginRight: '8px' }}></i>
                        {!isCollapsed && "Đăng xuất"}
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
                <header className="page-header-admin">
                    <div className="header-left">
                        <div className="search-global">
                            <i className="bi bi-search"></i>
                            <input type="text" placeholder="Tìm kiếm nhanh (Ctrl + K)..." />
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="notification-btn" title="Thông báo">
                            <i className="bi bi-bell"></i>
                            <span className="dot-badge"></span>
                        </div>

                        <Link to="/admin/chat" className="notification-btn" title="Tin nhắn">
                            <i className="bi bi-chat-dots"></i>
                        </Link>

                        <div className="user-profile-wrapper" style={{ position: 'relative' }}>
                            <div
                                className="user-profile"
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            >
                                <div className="user-info" style={{ marginRight: '10px' }}>
                                    <span className="user-name" style={{ fontSize: '11px', color: '#000' }}>QUẢN TRỊ VIÊN</span>
                                    <span className="user-role" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>ADMIN</span>
                                </div>
                                <div className="user-avatar" style={{ background: '#fff', border: '3px solid #000', color: '#000' }}>
                                    <span style={{ color: '#000', fontWeight: 'bold' }}>QU</span>
                                </div>
                            </div>

                            {isProfileOpen && (
                                <ul className="profile-dropdown-menu" style={{
                                    position: 'absolute', top: '100%', right: 0,
                                    background: '#fff', border: '3px solid #000', borderRadius: '0',
                                    listStyle: 'none', padding: '10px 0', margin: '10px 0 0 0',
                                    width: '180px', boxShadow: '8px 8px 0 rgba(0,0,0,1)', zIndex: 100
                                }}>
                                    <li><Link to="/" style={{ display: 'block', padding: '10px 20px', color: '#000', textDecoration: 'none', fontSize: '13px', transition: '0.2s', fontWeight: 'bold' }} className="dropdown-item-admin"><i className="bi bi-house me-2"></i> Về Trang Chủ</Link></li>
                                    <li><Link to="/profile" style={{ display: 'block', padding: '10px 20px', color: '#000', textDecoration: 'none', fontSize: '13px', transition: '0.2s', fontWeight: 'bold' }} className="dropdown-item-admin"><i className="bi bi-person me-2"></i> Hồ sơ</Link></li>
                                    <li><Link to="/settings" style={{ display: 'block', padding: '10px 20px', color: '#000', textDecoration: 'none', fontSize: '13px', transition: '0.2s', fontWeight: 'bold' }} className="dropdown-item-admin"><i className="bi bi-gear me-2"></i> Cài đặt</Link></li>
                                    <li className="divider" style={{ height: '3px', background: '#000', margin: '5px 0' }}></li>
                                    <li><Link to="/login" style={{ display: 'block', padding: '10px 20px', color: '#e50914', textDecoration: 'none', fontSize: '13px', transition: '0.2s', fontWeight: 'bold' }} className="dropdown-item-admin"><i className="bi bi-box-arrow-right me-2"></i> Đăng xuất</Link></li>
                                </ul>
                            )}
                        </div>
                    </div>
                </header>

                <style>{`
                    .dropdown-item-admin:hover { background: rgba(0,0,0,0.05); }
                `}</style>

                {/* PAGE BODY */}
                <div className="content-body">
                    {children}
                </div>
            </main>

            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    backgroundColor: toastBgColor,
                    color: '#fff',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    boxShadow: `0 10px 25px ${toastBgShadow}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 99999,
                    fontWeight: '600',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '15px'
                }} className="animate__animated animate__fadeInDown">
                    <i className={toastIconClass} style={{ fontSize: '18px' }}></i>
                    {toastStr}
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
