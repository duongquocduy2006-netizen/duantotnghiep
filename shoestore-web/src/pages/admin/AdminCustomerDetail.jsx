import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import './AdminCustomerDetail.css';

const AdminCustomerDetail = () => {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCustomerDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/admin/customers/${id}`);
            if (response.data && response.data.success) {
                setCustomer(response.data.customer);
                setOrders(response.data.orders || []);
            } else {
                setError("Không thể lấy thông tin chi tiết khách hàng.");
            }
        } catch (err) {
            console.error("Lỗi lấy chi tiết khách hàng:", err);
            setError("Không thể kết nối đến máy chủ để lấy thông tin chi tiết.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerDetail();
    }, [id]);

    const getInitials = (name) => {
        if (!name) return "KH";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1: return 'Chờ duyệt';
            case 2: return 'Đang giao';
            case 3: return 'Thành công';
            case 4: return 'Đã hủy';
            case 5: return 'Đã giao (Chờ duyệt)';
            default: return 'Không rõ';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            return new Date(dateStr).toLocaleString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#000' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI CHI TIẾT KHÁCH HÀNG...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error || !customer) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI TẢI DỮ LIỆU</h3>
                    <p style={{ color: '#555', marginTop: '10px' }}>{error || "Không thể tìm thấy khách hàng này."}</p>
                    <Link to="/admin/customers" className="btn-back" style={{ marginTop: '20px', display: 'inline-flex' }}>
                        QUAY LẠI
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-customer-detail-page">
                <Link to="/admin/customers" className="btn-back">
                    <i className="bi bi-arrow-left"></i> QUAY LẠI DANH SÁCH
                </Link>
 
                <div className="detail-grid">
                    <div className="profile-card">
                        <div className="avatar-large">{getInitials(customer.fullName)}</div>
                        <h2 className="profile-name">{customer.fullName || "Chưa đặt tên"}</h2>
                        <p className="profile-email">{customer.email}</p>
 
                        <div style={{ textAlign: 'center' }}>
                            <span 
                                className="badge-custom"
                                style={{ 
                                    background: `${customer.rankColor}15`, 
                                    border: `1.5px solid ${customer.rankColor}`,
                                    boxShadow: 'none', 
                                    color: customer.rankColor,
                                    padding: '4px 14px',
                                    borderRadius: '24px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="bi bi-star-fill"></i> {customer.rankName}
                            </span>
                        </div>
 
                        <div className="stat-grid">
                            <div className="stat-item">
                                <div className="stat-value">{customer.totalSpent.toLocaleString('vi-VN')} ₫</div>
                                <div className="stat-label">Tổng chi tiêu</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value" style={{ color: customer.status === 1 ? '#4ade80' : 'var(--accent-red)' }}>
                                    {customer.status === 1 ? 'HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
                                </div>
                                <div className="stat-label">Trạng thái</div>
                            </div>
                        </div>
                    </div>
 
                    <div className="info-card">
                        <h3 className="info-title font-oswald"><i className="bi bi-person-lines-fill"></i> THÔNG TIN CHI TIẾT</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="info-group">
                                <div className="info-label">SỐ ĐIỆN THOẠI</div>
                                <div className="info-value" style={{ color: '#000' }}>{customer.phone || 'Chưa cập nhật'}</div>
                            </div>
                            <div className="info-group">
                                <div className="info-label">VAI TRÒ TRUY CẬP</div>
                                <div className="info-value" style={{ color: '#000' }}>{customer.role}</div>
                            </div>
                        </div>
 
                        <h3 className="info-title font-oswald" style={{ marginTop: '30px' }}><i className="bi bi-clock-history"></i> LỊCH SỬ MUA HÀNG (MỚI NHẤT)</h3>
 
                        {orders.length === 0 ? (
                            <div className="text-center py-4" style={{ padding: '20px 0', border: '1px dashed #dadce0', borderRadius: '8px', textAlign: 'center' }}>
                                <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Khách hàng này chưa thực hiện đơn hàng nào.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th>MÃ ĐƠN</th>
                                            <th>NGÀY ĐẶT</th>
                                            <th style={{ textAlign: 'right' }}>TỔNG TIỀN</th>
                                            <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => (
                                            <tr key={o.order_code || o.orderCode}>
                                                <td>
                                                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{o.order_code || o.orderCode}</span>
                                                </td>
                                                <td style={{ color: '#555' }}>
                                                    {formatDate(o.created_at || o.createdAt)}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#000' }}>
                                                    {((o.final_amount !== undefined) ? o.final_amount : o.finalAmount).toLocaleString('vi-VN')} ₫
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-text status-${o.status}`}>
                                                        {getStatusText(o.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminCustomerDetail;
