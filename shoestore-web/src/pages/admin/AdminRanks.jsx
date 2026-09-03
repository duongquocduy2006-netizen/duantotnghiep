import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminBanners.css';

const AdminRanks = () => {
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchRanks = async () => {
        try {
            const res = await api.get('/api/vouchers/admin/all');
            if (res.data && res.data.success) {
                const apiRanks = res.data.ranks || [];
                const apiVouchers = res.data.vouchers || [];

                const formattedRanks = apiRanks.map(r => {
                    const applicableVouchers = apiVouchers.filter(v => v.ranks && v.ranks.some(vr => vr.id === r.id));
                    const voucherCodes = applicableVouchers.map(v => v.code).join(', ');

                    return {
                        id: r.id,
                        name: r.rankName,
                        points: r.minPoints,
                        color: r.colorCode || '#C0C0C0',
                        discount: r.discountPercent !== null && r.discountPercent !== undefined ? r.discountPercent : 0,
                        vouchers: voucherCodes ? `🎟️ ${voucherCodes}` : 'Chưa có ưu đãi',
                        freeShipping: !!r.freeShipping
                    };
                });
                setRanks(formattedRanks);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách hạng thành viên:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        if (id === 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể xóa hạng mặc định!" }));
            return;
        }
        setDeleteConfirm({ id, name });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        const { id } = deleteConfirm;
        try {
            const res = await api.delete(`/api/membership/ranks/${id}`);
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || "Xóa hạng thành công!" }));
                fetchRanks();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi: " + (res.data.message || "Không thể xóa.") }));
            }
        } catch (err) {
            console.error('Lỗi khi xóa hạng:', err);
            const errMsg = err.response?.data?.message || err.message || "Có lỗi xảy ra khi xóa hạng.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Có lỗi xảy ra khi xóa hạng: " + errMsg }));
        } finally {
            setDeleteConfirm(null);
        }
    };

    const [vndPerPoint, setVndPerPoint] = useState(1000);
    const [savingRate, setSavingRate] = useState(false);

    const fetchPointRate = async () => {
        try {
            const res = await api.get('/api/membership/point-rate');
            if (res.data && res.data.success && res.data.vndPerPoint) {
                setVndPerPoint(res.data.vndPerPoint);
            }
        } catch (err) {
            console.error('Lỗi lấy tỷ lệ quy đổi điểm:', err);
        }
    };

    const handleSavePointRate = async () => {
        if (!vndPerPoint || Number(vndPerPoint) <= 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Số tiền quy đổi phải lớn hơn 0!" }));
            return;
        }
        setSavingRate(true);
        try {
            const res = await api.post('/api/membership/point-rate', { vndPerPoint: Number(vndPerPoint) });
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Cập nhật thành công: 1 điểm = ${Number(vndPerPoint).toLocaleString('vi-VN')} VNĐ` }));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi: " + (res.data.message || "Không thể lưu.") }));
            }
        } catch (err) {
            console.error('Lỗi lưu tỷ lệ quy đổi điểm:', err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi kết nối máy chủ!" }));
        } finally {
            setSavingRate(false);
        }
    };

    useEffect(() => {
        fetchRanks();
        fetchPointRate();
    }, []);

    const filteredRanks = ranks.filter(r => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-star-fill me-2"></i> MEMBERSHIP
                        </div>
                        <h1 className="header-title">QUẢN LÝ HẠNG THÀNH VIÊN</h1>
                    </div>
                    <Link to="/admin/ranks/add" className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM HẠNG MỚI
                    </Link>
                </div>

                {/* POINT RATE CONFIG CARD */}
                <div className="bg-white p-3 rounded-4 border border-light-subtle shadow-sm mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3 animate__animated animate__fadeIn">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle" style={{ width: '44px', height: '44px' }}>
                            <i className="bi bi-coin fs-4"></i>
                        </div>
                        <div>
                            <div className="fw-bold font-oswald text-uppercase text-dark fs-6" style={{ letterSpacing: '0.5px' }}>
                                QUY ĐỔI ĐIỂM TÍCH LŨY
                            </div>
                            <div className="text-muted small">
                                Tự chỉnh số tiền VNĐ chi tiêu tương ứng với <strong>1 điểm tích lũy</strong> khi mua hàng
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark font-oswald me-1">1 ĐIỂM =</span>
                        <div className="input-group" style={{ maxWidth: '190px' }}>
                            <input 
                                type="number" 
                                className="form-control fw-bold font-oswald text-danger text-center fs-6" 
                                value={vndPerPoint}
                                onChange={e => setVndPerPoint(e.target.value)}
                                min="1"
                                step="100"
                            />
                            <span className="input-group-text font-oswald fw-bold bg-light text-secondary">VNĐ</span>
                        </div>
                        <button 
                            className="btn btn-danger font-oswald text-uppercase fw-bold px-3 py-2 ms-2 rounded-3 d-flex align-items-center gap-1 shadow-sm"
                            onClick={handleSavePointRate}
                            disabled={savingRate}
                        >
                            {savingRate ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-floppy me-1"></i>}
                            LƯU TỶ LỆ
                        </button>
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm hạng thành viên..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '100px', whiteSpace: 'nowrap' }}>ID</th>
                                <th style={{ whiteSpace: 'nowrap' }}>TÊN HẠNG</th>
                                <th style={{ whiteSpace: 'nowrap' }}>ĐIỂM TỐI THIỂU</th>
                                <th style={{ whiteSpace: 'nowrap' }}>FREE SHIP</th>
                                <th style={{ whiteSpace: 'nowrap' }}>ƯU ĐÃI VOUCHER</th>
                                <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '150px' }}>HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', fontWeight: '800' }}>
                                        ĐANG TẢI DỮ LIỆU...
                                    </td>
                                </tr>
                            ) : filteredRanks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999', fontWeight: '700' }}>
                                        Chưa có hạng thành viên nào phù hợp.
                                    </td>
                                </tr>
                            ) : filteredRanks.map(r => (
                                <tr key={r.id}>
                                    <td className="item-id">#RNK-{r.id}</td>
                                    <td>
                                        <span className="rank-badge-item" style={{
                                            padding: '4px 12px',
                                            border: `1px solid ${r.color}2a`,
                                            borderRadius: '20px',
                                            color: r.color,
                                            background: `${r.color}0a`,
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            <i className="bi bi-star-fill" style={{ fontSize: '10px' }}></i> {r.name}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 800, color: '#111', whiteSpace: 'nowrap' }}>{Number(r.points).toLocaleString('vi-VN')} điểm</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {r.freeShipping ? (
                                            <span className="badge-free-ship-modern">
                                                <i className="bi bi-truck"></i> FREE SHIP
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>KHÔNG</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{
                                            fontSize: '13px',
                                            color: r.vouchers.includes('🎟️') ? 'var(--accent-red)' : '#666',
                                            fontWeight: r.vouchers.includes('🎟️') ? '800' : '600'
                                        }}>
                                            {r.vouchers}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <Link to={`/admin/ranks/edit/${r.id}`} className="btn-icon-action" title="Sửa"><i className="bi bi-pencil-square"></i></Link>
                                        <button className="btn-icon-action" style={{ color: 'var(--accent-red)' }} title="Xóa" onClick={() => handleDelete(r.id, r.name)}><i className="bi bi-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <style>{`
                .item-id { font-weight: 800; color: #555; }
                .badge-free-ship-modern {
                    background: #ebfbee;
                    color: #2b8a3e;
                    border: 1px solid rgba(43, 138, 62, 0.15);
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    display: inline-flex;
                    alignItems: center;
                    gap: 4px;
                }
                `}</style>
            </div>

            {deleteConfirm && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box">
                        <div className="admin-confirm-icon">
                            <i className="bi bi-exclamation-triangle"></i>
                        </div>
                        <h4 className="admin-confirm-title">Xác Nhận Xóa Hạng</h4>
                        <p className="admin-confirm-message">
                            Bạn có chắc chắn muốn xóa hạng thành viên <strong>"{deleteConfirm.name}"</strong>?<br/>
                            Tất cả tài khoản thuộc hạng này sẽ được chuyển về hạng Đồng mặc định.
                        </p>
                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-cancel" onClick={() => setDeleteConfirm(null)}>
                                HỦY BỎ
                            </button>
                            <button className="admin-btn-confirm-ok" onClick={handleConfirmDelete}>
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminRanks;
