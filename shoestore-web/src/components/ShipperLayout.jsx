import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../pages/shipper/shipper-style.css';

const ShipperLayout = ({ children }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    useEffect(() => {
        document.body.classList.add('shipper-body');
        return () => {
            document.body.classList.remove('shipper-body');
        };
    }, []);

    const isActive = (path) => currentPath === path ? 'active' : '';

    return (
        <div className="shipper-layout-wrapper" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            {/* SIDEBAR */}
            <aside className="shipper-sidebar">
                <Link to="/shipper/dashboard" className="logo-area">
                    <h1 className="logo-text">SHOE<span>SHIP</span></h1>
                </Link>

                <ul className="nav-menu">
                    <li className="nav-item">
                        <Link to="/shipper/dashboard" className={`nav-link ${isActive('/shipper/dashboard')}`}>
                            <i className="bi bi-speedometer2"></i>
                            <span>Tổng Quan</span>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/shipper/waiting-orders" className={`nav-link ${isActive('/shipper/waiting-orders')}`}>
                            <i className="bi bi-box-seam"></i>
                            <span>Đơn Chờ Nhận</span>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/shipper/shipping-orders" className={`nav-link ${isActive('/shipper/shipping-orders')}`}>
                            <i className="bi bi-clock-history"></i>
                            <span>Đang Giao</span>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/shipper/completed-orders" className={`nav-link ${isActive('/shipper/completed-orders')}`}>
                            <i className="bi bi-check2-all"></i>
                            <span>Đã Hoàn Thành</span>
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/shipper/earnings" className={`nav-link ${isActive('/shipper/earnings')}`}>
                            <i className="bi bi-wallet2"></i>
                            <span>Thu Nhập</span>
                        </Link>
                    </li>
                    <li className="nav-item" style={{ marginTop: '40px' }}>
                        <Link to="/" className="nav-link">
                            <i className="bi bi-house-door"></i>
                            <span>Về Trang Chủ</span>
                        </Link>
                    </li>
                </ul>

                <div className="sidebar-footer">
                    <Link to="/logout" className="btn-logout">
                        <i className="bi bi-box-arrow-left"></i>
                        <span>Rời Ca Trực</span>
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="shipper-main" style={{ width: '100%' }}>
                {/* HEADER */}
                <header className="shipper-top-nav">
                    <div className="duty-badge">
                        <i className="bi bi-circle-fill"></i> Sẵn sàng làm việc
                    </div>

                    <div className="user-profile">
                        <div className="user-text">
                            <span className="user-name">Nguyễn Văn Shipper</span>
                            <span className="user-role">Đối Tác Vận Chuyển</span>
                        </div>
                        <div className="user-avatar">
                            <i className="bi bi-person-fill"></i>
                        </div>
                    </div>
                </header>

                <section className="shipper-content">
                    {children}
                </section>
            </main>
        </div>
    );
};

export default ShipperLayout;
