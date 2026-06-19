import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);

    // Form states
    const [formCode, setFormCode] = useState("");
    const [formDiscountType, setFormDiscountType] = useState("PERCENT");
    const [formDiscountValue, setFormDiscountValue] = useState("");
    const [formMinOrderValue, setFormMinOrderValue] = useState("");
    const [formMaxDiscount, setFormMaxDiscount] = useState("");
    const [formQuantity, setFormQuantity] = useState("");
    const [formUserLimit, setFormUserLimit] = useState("");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [selectedRankIds, setSelectedRankIds] = useState([]);
    const [formStatus, setFormStatus] = useState(1);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const response = await api.get("/api/vouchers/admin/all");
            if (response.data && response.data.success) {
                setVouchers(response.data.vouchers || []);
                setRanks(response.data.ranks || []);
            } else {
                setError("Có lỗi xảy ra khi tải danh sách voucher.");
            }
        } catch (err) {
            console.error("Lỗi tải voucher:", err);
            setError("Không thể kết nối đến máy chủ để lấy thông tin voucher.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const formatDateTimeLocal = (dateStr) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            return "";
        }
    };

    const openModal = () => {
        setEditingVoucher(null);
        setFormCode("");
        setFormDiscountType("PERCENT");
        setFormDiscountValue("");
        setFormMinOrderValue("");
        setFormMaxDiscount("");
        setFormQuantity("100");
        setFormUserLimit("1");
        setFormStartDate("");
        setFormEndDate("");
        setSelectedRankIds([]);
        setFormStatus(1);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingVoucher(null);
    };

    const handleEdit = (v) => {
        setEditingVoucher(v);
        setFormCode(v.code || "");
        setFormDiscountType(v.discountType || "PERCENT");
        setFormDiscountValue(v.discountValue || "");
        setFormMinOrderValue(v.minOrderValue || "");
        setFormMaxDiscount(v.maxDiscount || "");
        setFormQuantity(v.quantity !== undefined ? v.quantity : "");
        setFormUserLimit(v.userUsageLimit !== undefined ? v.userUsageLimit : "");
        setFormStartDate(formatDateTimeLocal(v.startDate));
        setFormEndDate(formatDateTimeLocal(v.endDate));
        setSelectedRankIds((v.ranks || []).map(r => r.id));
        setFormStatus(v.status !== undefined ? v.status : 1);
        setIsModalOpen(true);
    };

    const handleDelete = async (id, code) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn voucher "${code}" này không?`)) {
            try {
                const response = await api.delete(`/api/vouchers/admin/${id}`);
                if (response.data && response.data.success) {
                    alert(response.data.message || "Xóa voucher thành công!");
                    setVouchers(vouchers.filter(v => v.id !== id));
                }
            } catch (err) {
                console.error("Lỗi xóa voucher:", err);
                alert("Không thể kết nối đến máy chủ để xóa voucher này.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            id: editingVoucher ? editingVoucher.id : null,
            code: formCode,
            discountType: formDiscountType,
            discountValue: parseFloat(formDiscountValue),
            minOrderValue: formMinOrderValue ? parseFloat(formMinOrderValue) : 0,
            maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : 0,
            quantity: parseInt(formQuantity),
            userUsageLimit: formUserLimit ? parseInt(formUserLimit) : 1,
            startDate: formStartDate || null,
            endDate: formEndDate || null,
            rankIds: selectedRankIds,
            status: formStatus
        };

        try {
            const response = await api.post("/api/vouchers/admin/save", payload);
            if (response.data && response.data.success) {
                alert(response.data.message || "Lưu Voucher thành công!");
                closeModal();
                fetchVouchers();
            }
        } catch (err) {
            console.error("Lỗi lưu voucher:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể lưu Voucher. Vui lòng kiểm tra lại.";
            alert(errMsg);
        }
    };

    const formatDateString = (dateStr) => {
        if (!dateStr) return "Vô hạn";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("vi-VN");
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <div className="header-left">
                    <span className="sub-title-neon"><i className="bi bi-shop"></i> SALE & PROMOTIONS</span>
                    <h1 className="cinematic-title">QUẢN LÝ MÃ GIẢM GIÁ</h1>
                </div>
                <button onClick={openModal} className="btn-cyan-skew">
                    <i className="bi bi-plus-lg"></i> &nbsp;TẠO VOUCHER MỚI
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: '#000' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI DANH SÁCH VOUCHER...</p>
                </div>
            ) : error ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                    <p style={{ marginTop: '10px' }}>{error}</p>
                </div>
            ) : vouchers.length === 0 ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#555', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff', borderRadius: '12px' }}>
                    <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                    <p style={{ marginTop: '15px' }}>Chưa có mã giảm giá nào được tạo.</p>
                </div>
            ) : (
                <div className="voucher-grid-alt">
                    {vouchers.map(v => (
                        <div key={v.id} className="voucher-ticket" style={v.status === 0 ? { opacity: 0.5, borderStyle: 'dotted' } : {}}>
                            <div className={`ticket-left ${v.discountType === 'FIXED' ? 'bg-red-glow' : 'bg-cyan-glow'}`}>
                                <span className="ticket-type">{v.discountType}</span>
                                <span className="ticket-value">
                                    {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${v.discountValue / 1000}K`}
                                </span>
                            </div>
                            <div className="ticket-right">
                                <h3 className="ticket-code">{v.code}</h3>
                                <div className="ticket-body">
                                    <p>Đơn tối thiểu: <b>{v.minOrderValue.toLocaleString("vi-VN")}đ</b></p>
                                    <p>Còn lại: <b>{v.quantity}</b> phiếu | Hạn: <b>{formatDateString(v.endDate)}</b></p>
                                    
                                    {/* Applicable Ranks */}
                                    {v.ranks && v.ranks.length > 0 ? (
                                        <div className="applicable-tiers" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                                            {v.ranks.map(r => (
                                                <span key={r.id} className="tier-tag" style={{ border: `1px solid ${r.colorCode || '#94a3b8'}`, color: r.colorCode || '#94a3b8', fontSize: '9px', padding: '1px 5px', fontWeight: 'bold' }}>
                                                    {r.rankName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="applicable-tiers" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                                            <span className="tier-tag" style={{ border: '1px solid #666', color: '#555', fontSize: '9px', padding: '1px 5px', fontWeight: 'bold' }}>
                                                TẤT CẢ HẠNG
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="ticket-actions">
                                    <button className="action-ic edit-ic" onClick={() => handleEdit(v)}><i className="bi bi-pencil-square"></i></button>
                                    <button className="action-ic del-ic" onClick={() => handleDelete(v.id, v.code)}><i className="bi bi-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3 className="modal-title font-oswald"><i className="bi bi-ticket-perforated"></i> {editingVoucher ? 'CẬP NHẬT VOUCHER' : 'TẠO VOUCHER MỚI'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Mã Voucher (Code) *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="VD: SUMMER50K" 
                                        value={formCode}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại Giảm Giá *</label>
                                    <select 
                                        className="form-input" 
                                        value={formDiscountType}
                                        onChange={(e) => setFormDiscountType(e.target.value)}
                                        required
                                    >
                                        <option value="PERCENT">Giảm theo %</option>
                                        <option value="FIXED">Giảm số tiền cố định</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giá trị giảm *</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="form-input" 
                                        value={formDiscountValue}
                                        onChange={(e) => setFormDiscountValue(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn tối thiểu (đ) *</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        className="form-input" 
                                        value={formMinOrderValue}
                                        onChange={(e) => setFormMinOrderValue(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giảm tối đa (đ) (Chỉ cho %)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        className="form-input" 
                                        placeholder="Để trống = Không giới hạn" 
                                        value={formMaxDiscount}
                                        onChange={(e) => setFormMaxDiscount(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Số lượng phát hành *</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="form-input" 
                                        value={formQuantity}
                                        onChange={(e) => setFormQuantity(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giới hạn số lần dùng / 1 User *</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="form-input" 
                                        value={formUserLimit}
                                        onChange={(e) => setFormUserLimit(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select 
                                        className="form-input" 
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(parseInt(e.target.value))}
                                    >
                                        <option value="1">Kích hoạt (Hoạt động)</option>
                                        <option value="0">Tạm dừng (Vô hiệu hóa)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input 
                                        type="datetime-local" 
                                        className="form-input" 
                                        value={formStartDate}
                                        onChange={(e) => setFormStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày kết thúc</label>
                                    <input 
                                        type="datetime-local" 
                                        className="form-input" 
                                        value={formEndDate}
                                        onChange={(e) => setFormEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label className="form-label">Hạng thành viên áp dụng (Để trống = Áp dụng tất cả)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#fff', padding: '15px', border: '1.5px solid #dadce0', borderRadius: '8px' }}>
                                    {ranks.map(r => {
                                        const isChecked = selectedRankIds.includes(r.id);
                                        return (
                                            <div className="rank-check-item" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    className="rank-cbx" 
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedRankIds([...selectedRankIds, r.id]);
                                                        } else {
                                                            setSelectedRankIds(selectedRankIds.filter(id => id !== r.id));
                                                        }
                                                    }}
                                                />
                                                <span style={{ color: r.colorCode || '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>{r.rankName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-cyan-skew" style={{ flex: 1 }}>LƯU THÔNG TIN</button>
                                <button type="button" onClick={closeModal} className="btn-cyan-skew" style={{ background: 'transparent', border: '1px solid #dadce0', color: '#000', flex: 1, borderRadius: '8px' }}>ĐÓNG</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; padding-top: 20px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .btn-cyan-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; justify-content: center;
                }
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                /* Vouchers Grid Sleek Modern */
                .voucher-grid-alt { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 30px; }
                .voucher-ticket { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); display: flex; min-height: 140px; position: relative; transition: 0.3s; border-radius: 12px; overflow: hidden; }
                .voucher-ticket:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #dadce0; }
                
                .ticket-left { width: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-right: 2px dashed #dadce0; }
                .ticket-left::before, .ticket-left::after { content: ''; position: absolute; right: -11px; width: 20px; height: 20px; background: #f8f9fa; border-radius: 50%; border: 1px solid #e2e8f0; }
                .ticket-left::before { top: -11px; }
                .ticket-left::after { bottom: -11px; }
 
                .bg-red-glow { background: #fee2e2; color: #991b1b; border-right: 2px dashed #e2e8f0; }
                .bg-cyan-glow { background: #ecfeff; color: #155e75; border-right: 2px dashed #e2e8f0; }

                .ticket-type { font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
                .ticket-value { font-family: 'Oswald'; font-size: 36px; font-weight: 800; }
                
                .ticket-right { flex: 1; padding: 25px; position: relative; }
                .ticket-code { font-family: 'Oswald'; font-size: 28px; color: #000; margin-bottom: 8px; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
                .ticket-body p { margin: 0; font-size: 14px; color: #555; margin-bottom: 3px; font-weight: 600; }
                .ticket-body b { color: #000; font-weight: 800; }

                .ticket-actions { position: absolute; top: 15px; right: 15px; display: flex; gap: 10px; }
                .action-ic { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .edit-ic:hover { background: #facc15; box-shadow: 0 4px 12px rgba(250,204,21,0.2); transform: translateY(-2px); }
                .del-ic:hover { background: #ef4444; color: #fff; box-shadow: 0 4px 12px rgba(239,68,68,0.2); transform: translateY(-2px); }

                /* MODAL STYLES */
                .modal-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .modal-box { background: #fff; width: 650px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-height: 90vh; overflow-y: auto; border-radius: 16px; animation: slideUp 0.3s ease-out; }
                .modal-title { font-family: 'Oswald'; font-size: 28px; color: #000; margin-bottom: 30px; letter-spacing: 1px; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-group { margin-bottom: 20px; }
                .form-label { display: block; color: #000; font-size: 13px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; font-family: 'Oswald'; }
                .form-input { width: 100%; background: #fff; border: 1.5px solid #dadce0; color: #3c4043; padding: 12px; outline: none; transition: 0.2s; font-size: 14px; font-weight: 500; box-shadow: none; border-radius: 8px; }
                .form-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
                
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
        </AdminLayout>
    );
};

export default AdminVouchers;
