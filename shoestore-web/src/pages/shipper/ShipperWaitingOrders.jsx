import React from 'react';
import ShipperLayout from '../../components/ShipperLayout';

const ShipperWaitingOrders = () => {
    return (
        <ShipperLayout>
            <div className="page-header">
                <div>
                    <h2 className="page-title">ĐƠN HÀNG <span>CHỜ NHẬN</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>
                        12 đơn hàng đang chờ bạn nhận ca trực.
                    </p>
                </div>
                <div className="search-box">
                    <i className="bi bi-search"></i>
                    <input type="text" placeholder="Tìm theo mã đơn hoặc khu vực..." />
                </div>
            </div>

            {/* ORDER LIST */}
            <div className="orders-list">
                {/* Order 1 */}
                <div className="order-card">
                    <div className="order-header">
                        <div>
                            <span className="order-id">#ORD-A89F21</span>
                            <span className="order-time">• Đặt lúc 14:20</span>
                        </div>
                        <button className="btn-accept">Nhận Đơn Ngay</button>
                    </div>
                    <div className="order-info">
                        <div className="info-item">
                            <span className="info-label">Khách hàng</span>
                            <span className="info-value">Nguyễn Văn A <br /> <small style={{ color: 'var(--text-muted)' }}>0901234xxx</small></span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Địa chỉ giao</span>
                            <span className="info-value"><i className="bi bi-geo-alt me-1" style={{ color: 'var(--accent-orange)' }}></i> 123 Lê Lợi, Quận 1, TP. HCM</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Hình thức / COD</span>
                            <span className="info-value"><i className="bi bi-cash me-1" style={{ color: '#00ff88' }}></i> 1,250,000đ (Tiền mặt)</span>
                        </div>
                    </div>
                </div>

                {/* Order 2 */}
                <div className="order-card">
                    <div className="order-header">
                        <div>
                            <span className="order-id">#ORD-C41D99</span>
                            <span className="order-time">• Đặt lúc 15:05</span>
                        </div>
                        <button className="btn-accept">Nhận Đơn Ngay</button>
                    </div>
                    <div className="order-info">
                        <div className="info-item">
                            <span className="info-label">Khách hàng</span>
                            <span className="info-value">Trần Thị B <br /> <small style={{ color: 'var(--text-muted)' }}>0987123xxx</small></span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Địa chỉ giao</span>
                            <span className="info-value"><i className="bi bi-geo-alt me-1" style={{ color: 'var(--accent-orange)' }}></i> 45 Nguyễn Huệ, Quận 1, TP. HCM</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Hình thức / COD</span>
                            <span className="info-value"><i className="bi bi-credit-card me-1"></i> Đã thanh toán (0đ)</span>
                        </div>
                    </div>
                </div>

                {/* Order 3 */}
                <div className="order-card">
                    <div className="order-header">
                        <div>
                            <span className="order-id">#ORD-D55E20</span>
                            <span className="order-time">• Đặt lúc 15:45</span>
                        </div>
                        <button className="btn-accept">Nhận Đơn Ngay</button>
                    </div>
                    <div className="order-info">
                        <div className="info-item">
                            <span className="info-label">Khách hàng</span>
                            <span className="info-value">Lê Văn C <br /> <small style={{ color: 'var(--text-muted)' }}>0912345xxx</small></span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Địa chỉ giao</span>
                            <span className="info-value"><i className="bi bi-geo-alt me-1" style={{ color: 'var(--accent-orange)' }}></i> 78 CMT8, Quận 3, TP. HCM</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Hình thức / COD</span>
                            <span className="info-value"><i className="bi bi-cash me-1" style={{ color: '#00ff88' }}></i> 450,000đ (Tiền mặt)</span>
                        </div>
                    </div>
                </div>
            </div>
        </ShipperLayout>
    );
};

export default ShipperWaitingOrders;
