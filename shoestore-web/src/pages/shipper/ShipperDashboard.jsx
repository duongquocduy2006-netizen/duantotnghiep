import React from 'react';
import ShipperLayout from '../../components/ShipperLayout';
import { Link } from 'react-router-dom';

const ShipperDashboard = () => {
    return (
        <ShipperLayout>
            <div className="welcome-section">
                <h2 className="welcome-title">CHÀO BUỔI CHIỀU, <span>CHIẾN BINH!</span></h2>
                <p className="welcome-subtitle">Hệ thống đã sẵn sàng. Bạn có 12 đơn hàng mới trong khu vực.</p>
            </div>

            {/* STATS */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrapper sc-waiting">
                        <i className="bi bi-inbox"></i>
                    </div>
                    <div className="stat-label">Chờ Nhận</div>
                    <div className="stat-value">12</div>
                    <div className="stat-trend trend-up">
                        <i className="bi bi-lightning-charge-fill"></i> Cao hơn hôm qua 2 đơn
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-wrapper sc-shipping">
                        <i className="bi bi-truck"></i>
                    </div>
                    <div className="stat-label">Đang Giao</div>
                    <div className="stat-value">05</div>
                    <div className="stat-trend" style={{ color: 'var(--accent-cyan)' }}>
                        <i className="bi bi-geo-alt"></i> Đang di chuyển
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-wrapper sc-done">
                        <i className="bi bi-currency-dollar"></i>
                    </div>
                    <div className="stat-label">Doanh Thu Ngày</div>
                    <div className="stat-value" style={{ fontSize: '32px', paddingTop: '15px' }}>850K</div>
                    <div className="stat-trend trend-up">
                        <i className="bi bi-star-fill"></i> Đạt 85% mục tiêu ngày
                    </div>
                </div>
            </div>

            <div className="feature-grid">
                {/* MISSION CONTROL */}
                <div className="card-box">
                    <div className="card-top">
                        <h3 className="card-title">Live Tracking</h3>
                        <i className="bi bi-arrows-fullscreen" style={{ color: '#555', cursor: 'pointer' }}></i>
                    </div>
                    <div className="map-visual">
                        <div className="map-route"></div>
                        <div className="marker mk-start"></div>
                        <div className="marker mk-end"></div>
                        <div className="marker mk-shipper"></div>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '500', marginBottom: '4px' }}>
                            <i className="bi bi-info-circle me-2"></i> Đang giao đơn ORD-A89F21
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                            Dự kiến giao trong 12 phút • 3.2km
                        </p>
                    </div>
                </div>

                {/* ORDERS TABLE */}
                <div className="card-box">
                    <div className="card-top">
                        <h3 className="card-title">Đơn hàng khả dụng</h3>
                        <Link to="/shipper/waiting-orders" style={{ color: 'var(--accent-orange)', fontSize: '11px', textDecoration: 'none', fontWeight: '700' }}>
                            XEM TẤT CẢ
                        </Link>
                    </div>

                    <table className="table-area">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Địa chỉ</th>
                                <th>COD</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span className="ord-id">#A89F21</span><br /><small style={{ color: '#666' }}>2.5 km</small></td>
                                <td style={{ fontSize: '13px' }}>Quận 1, TP. HCM<br /><small style={{ color: '#888' }}>Nguyễn Văn A</small></td>
                                <td style={{ fontWeight: '700', color: '#fff' }}>1,250K</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-prime">Nhận đơn</button>
                                </td>
                            </tr>
                            <tr>
                                <td><span className="ord-id">#C41D99</span><br /><small style={{ color: '#666' }}>4.1 km</small></td>
                                <td style={{ fontSize: '13px' }}>Quận 7, TP. HCM<br /><small style={{ color: '#888' }}>Trần Thị B</small></td>
                                <td style={{ fontWeight: '700', color: 'var(--accent-green)' }}>Đã TT</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-prime">Nhận đơn</button>
                                </td>
                            </tr>
                            <tr>
                                <td><span className="ord-id">#D55E20</span><br /><small style={{ color: '#666' }}>1.2 km</small></td>
                                <td style={{ fontSize: '13px' }}>Bình Thạnh, TP. HCM<br /><small style={{ color: '#888' }}>Lê Văn C</small></td>
                                <td style={{ fontWeight: '700', color: '#fff' }}>450K</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-prime">Nhận đơn</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </ShipperLayout>
    );
};

export default ShipperDashboard;
