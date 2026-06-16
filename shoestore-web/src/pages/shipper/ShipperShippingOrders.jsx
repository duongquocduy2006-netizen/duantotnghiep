import React from 'react';
import ShipperLayout from '../../components/ShipperLayout';

const ShipperShippingOrders = () => {
    return (
        <ShipperLayout>
            <div className="page-header">
                <h2 className="page-title" style={{ margin: 0 }}>ĐƠN HÀNG <span style={{ color: 'var(--accent-cyan)' }}>ĐANG GIAO</span></h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>Bạn có 5 đơn hàng trên lộ trình giao.</p>
            </div>

            {/* ACTIVE ORDER 1 */}
            <div className="active-order">
                <div className="order-status">
                    <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', color: '#fff' }}>#ORD-A89F21</span>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '5px' }}>Khách: Nguyễn Văn A • 0901xxxxxx</p>
                    </div>
                    <span className="status-badge">Trên lộ trình</span>
                </div>

                <div className="progress-steps">
                    <div className="step done">
                        <div className="step-icon"><i className="bi bi-box-seam"></i></div>
                        <span className="step-label">Lấy hàng</span>
                    </div>
                    <div className="step active">
                        <div className="step-icon"><i className="bi bi-truck"></i></div>
                        <span className="step-label">Đang giao</span>
                    </div>
                    <div className="step">
                        <div className="step-icon"><i className="bi bi-check2-circle"></i></div>
                        <span className="step-label">Hoàn tất</span>
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Địa chỉ giao hàng</p>
                    <p style={{ fontSize: '15px', fontWeight: '500' }}><i className="bi bi-geo-alt me-2 text-info"></i> 123 Lê Lợi, Quận 1, TP. HCM</p>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '15px 0' }} />
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Số tiền thu hộ (COD)</p>
                    <p style={{ fontSize: '20px', fontWeight: '700', color: '#00ff88', margin: 0 }}>1,250,000đ</p>
                </div>

                <div className="action-grid">
                    <button className="btn-call"><i className="bi bi-telephone"></i> Gọi khách hàng</button>
                    <button className="btn-finish">Xác nhận giao thành công</button>
                </div>
            </div>

            {/* ACTIVE ORDER 2 (Collapsed/Short) */}
            <div className="active-order" style={{ padding: '25px', borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', opacity: '0.8', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '600', color: '#fff' }}>#ORD-B77E33</span>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>45 Nguyễn Huệ, Quận 1 • Coi chi tiết <i className="bi bi-arrow-right"></i></p>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-cyan)' }}>ĐÃ TT (0₫)</span>
                </div>
            </div>
        </ShipperLayout>
    );
};

export default ShipperShippingOrders;
