import React from 'react';
import ShipperLayout from '../../components/ShipperLayout';

const ShipperCompletedOrders = () => {
    return (
        <ShipperLayout>
            <div className="page-header">
                <div>
                    <h2 className="page-title">ĐƠN HÀNG <span style={{ color: 'var(--accent-green)' }}>ĐÃ HOÀN THÀNH</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>
                        Bạn đã hoàn thành tổng cộng 148 đơn hàng trong tháng này.
                    </p>
                </div>
            </div>

            <div className="table-box">
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Ngày giao</th>
                            <th>Người nhận</th>
                            <th>Địa chỉ</th>
                            <th>Thanh toán</th>
                            <th>Phí vận chuyển</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span className="ord-id">#ORD-X89F21</span></td>
                            <td><span style={{ fontSize: '13px' }}>30/03/2026</span><br /><small style={{ color: 'var(--text-muted)' }}>16:45</small></td>
                            <td><span style={{ fontWeight: '500' }}>Nguyễn Văn A</span></td>
                            <td style={{ maxWidth: '250px' }}><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>123 Lê Lợi, Quận 1, TP. HCM</span></td>
                            <td><span className="price">1,250K</span></td>
                            <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600' }}>35K</span></td>
                            <td><span className="badge-done">Thành công</span></td>
                        </tr>
                        <tr>
                            <td><span className="ord-id">#ORD-Z41D99</span></td>
                            <td><span style={{ fontSize: '13px' }}>30/03/2026</span><br /><small style={{ color: 'var(--text-muted)' }}>15:20</small></td>
                            <td><span style={{ fontWeight: '500' }}>Trần Thị B</span></td>
                            <td style={{ maxWidth: '250px' }}><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>45 Nguyễn Huệ, Quận 1, TP. HCM</span></td>
                            <td><span className="price">0₫ (TT)</span></td>
                            <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600' }}>30K</span></td>
                            <td><span className="badge-done">Thành công</span></td>
                        </tr>
                        <tr>
                            <td><span className="ord-id">#ORD-P12D55</span></td>
                            <td><span style={{ fontSize: '13px' }}>30/03/2026</span><br /><small style={{ color: 'var(--text-muted)' }}>11:15</small></td>
                            <td><span style={{ fontWeight: '500' }}>Lê Văn C</span></td>
                            <td style={{ maxWidth: '250px' }}><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>78 CMT8, Quận 3, TP. HCM</span></td>
                            <td><span className="price">450K</span></td>
                            <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600' }}>25K</span></td>
                            <td><span className="badge-done">Thành công</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </ShipperLayout>
    );
};

export default ShipperCompletedOrders;
