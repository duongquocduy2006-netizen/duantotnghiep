import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import DateTimePicker24h from "../../components/DateTimePicker24h";
import api from "../../services/api";

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [formErrors, setFormErrors] = useState({});

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

    const getCurrentDateTimeString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

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
        setFormErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingVoucher(null);
        setFormErrors({});
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
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleDelete = (id, code) => {
        setDeleteConfirm({ id, code });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        const { id } = deleteConfirm;
        try {
            const response = await api.delete(`/api/vouchers/admin/${id}`);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Xóa voucher thành công!" }));
                setVouchers(vouchers.filter(v => v.id !== id));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.error || "Có lỗi xảy ra khi xóa voucher." }));
            }
        } catch (err) {
            console.error("Lỗi xóa voucher:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể kết nối đến máy chủ để xóa voucher này." }));
        } finally {
            setDeleteConfirm(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Inline Validation - collect all errors
        const errors = {};

        if (!formCode || !formCode.trim()) {
            errors.code = "Vui lòng nhập mã Voucher!";
        } else {
            const cleanCode = formCode.trim().toUpperCase();
            const dup = vouchers.find(v => v.code && v.code.toUpperCase() === cleanCode && (!editingVoucher || v.id !== editingVoucher.id));
            if (dup) {
                errors.code = `Mã Voucher "${cleanCode}" đã tồn tại trong hệ thống! Vui lòng nhập mã khác.`;
            }
        }

        const discountVal = parseFloat(formDiscountValue);
        if (isNaN(discountVal) || discountVal <= 0) {
            errors.discountValue = "Vui lòng nhập phần trăm giảm lớn hơn 0%!";
        } else if (discountVal > 50) {
            errors.discountValue = "Mức giảm giá tối đa chỉ được 50%!";
        }

        const qty = parseInt(formQuantity);
        if (isNaN(qty) || qty <= 0) {
            errors.quantity = "Số lượng phát hành phải lớn hơn 0!";
        }

        if (formStartDate && formEndDate) {
            const start = new Date(formStartDate);
            const end = new Date(formEndDate);
            if (start >= end) {
                errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu!";
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({});

        const payload = {
            id: editingVoucher ? editingVoucher.id : null,
            code: formCode,
            discountType: "PERCENT",
            discountValue: discountVal,
            minOrderValue: formMinOrderValue ? parseFloat(formMinOrderValue) : 0,
            maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : 0,
            quantity: qty,
            userUsageLimit: 1, // Mỗi user mặc định chỉ được sử dụng 1 lần duy nhất
            startDate: formStartDate || null,
            endDate: formEndDate || null,
            rankIds: selectedRankIds,
            status: formStatus
        };

        try {
            const response = await api.post("/api/vouchers/admin/save", payload);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Lưu Voucher thành công!" }));
                closeModal();
                fetchVouchers();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Lưu Voucher thất bại." }));
            }
        } catch (err) {
            console.error("Lỗi lưu voucher:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể lưu Voucher. Vui lòng kiểm tra lại.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
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
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Mã Voucher (Code) *</label>
                                    <input 
                                        type="text" 
                                        className={`form-input ${formErrors.code ? 'input-error' : ''}`}
                                        placeholder="VD: SUMMER50K" 
                                        value={formCode}
                                        onChange={(e) => { setFormCode(e.target.value.toUpperCase()); if (formErrors.code) setFormErrors(p => ({...p, code: ''})); }}
                                    />
                                    {formErrors.code && <span className="field-error">{formErrors.code}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại Giảm Giá</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700', cursor: 'not-allowed', border: '1px solid #cbd5e1' }}
                                        value="Giảm theo phần trăm (%)" 
                                        disabled 
                                        readOnly 
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label mb-0">Mức Giảm Giá (%) * <span className="text-danger fw-bold">(Tối đa 50%)</span></label>
                                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1" style={{ fontSize: '11px', borderRadius: '6px' }}>
                                            <i className="bi bi-fire me-1"></i>
                                            {formDiscountValue ? `Đang giảm ${formDiscountValue}%` : 'Chưa chọn mức giảm'}
                                        </span>
                                    </div>

                                    {/* Positioned % suffix inside input */}
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input 
                                            type="number" 
                                            min="1"
                                            max="50"
                                            className={`form-input ${formErrors.discountValue ? 'input-error' : ''}`}
                                            placeholder="Nhập phần trăm giảm (1% - 50%)"
                                            style={{ paddingRight: '45px' }}
                                            value={formDiscountValue}
                                            onChange={(e) => { 
                                                let val = e.target.value;
                                                if (val !== '' && Number(val) > 50) val = '50';
                                                setFormDiscountValue(val); 
                                                if (formErrors.discountValue) setFormErrors(p => ({...p, discountValue: ''})); 
                                            }}
                                        />
                                        <span 
                                            style={{ 
                                                position: 'absolute', 
                                                right: '15px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                fontWeight: '700', 
                                                color: '#64748b', 
                                                fontSize: '15px', 
                                                pointerEvents: 'none' 
                                            }}
                                        >
                                            %
                                        </span>
                                    </div>

                                    {/* Quick Preset Buttons & Range Slider */}
                                    <div className="d-flex align-items-center gap-1 mt-2 flex-wrap">
                                        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Gợi ý:</span>
                                        {[10, 15, 20, 25, 30, 50].map(pct => (
                                            <button
                                                key={pct}
                                                type="button"
                                                className={`btn btn-sm ${Number(formDiscountValue) === pct ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                                                style={{ fontSize: '11.5px', padding: '2px 10px', borderRadius: '20px', transition: 'all 0.2s' }}
                                                onClick={() => {
                                                    setFormDiscountValue(String(pct));
                                                    if (formErrors.discountValue) setFormErrors(p => ({...p, discountValue: ''}));
                                                }}
                                            >
                                                {pct}% {pct === 50 ? <span style={{ fontSize: '10px' }}>(Tối đa)</span> : ''}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-2 d-flex align-items-center gap-2">
                                        <input 
                                            type="range" 
                                            className="form-range" 
                                            min="1" 
                                            max="50" 
                                            step="1"
                                            style={{ accentColor: '#e50914' }}
                                            value={formDiscountValue || 1}
                                            onChange={(e) => {
                                                setFormDiscountValue(e.target.value);
                                                if (formErrors.discountValue) setFormErrors(p => ({...p, discountValue: ''}));
                                            }}
                                        />
                                    </div>

                                    {formErrors.discountValue && <span className="field-error mt-1">{formErrors.discountValue}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn tối thiểu (đ) *</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        className="form-input"
                                        value={formMinOrderValue}
                                        onChange={(e) => setFormMinOrderValue(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giảm tối đa (đ)</label>
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
                                        className={`form-input ${formErrors.quantity ? 'input-error' : ''}`}
                                        value={formQuantity}
                                        onChange={(e) => { setFormQuantity(e.target.value); if (formErrors.quantity) setFormErrors(p => ({...p, quantity: ''})); }}
                                    />
                                    {formErrors.quantity && <span className="field-error">{formErrors.quantity}</span>}
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
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label mb-0">Ngày bắt đầu</label>
                                        <button 
                                            type="button" 
                                            className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                            onClick={() => {
                                                setFormStartDate(getCurrentDateTimeString());
                                                if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                            }}
                                        >
                                            <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                        </button>
                                    </div>
                                    <DateTimePicker24h
                                        title="CHỌN NGÀY BẮT ĐẦU VOUCHER (24H)"
                                        value={formStartDate}
                                        placeholder="Bấm chọn ngày & giờ bắt đầu..."
                                        error={!!formErrors.endDate}
                                        min={getCurrentDateTimeString()}
                                        onChange={(val) => {
                                            setFormStartDate(val);
                                            if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label mb-0">Ngày kết thúc</label>
                                        <button 
                                            type="button" 
                                            className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                            onClick={() => {
                                                setFormEndDate(getCurrentDateTimeString());
                                                if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                            }}
                                        >
                                            <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                        </button>
                                    </div>
                                    <DateTimePicker24h
                                        title="CHỌN NGÀY KẾT THÚC VOUCHER (24H)"
                                        value={formEndDate}
                                        placeholder="Bấm chọn ngày & giờ kết thúc..."
                                        error={!!formErrors.endDate}
                                        min={formStartDate || getCurrentDateTimeString()}
                                        onChange={(val) => {
                                            setFormEndDate(val);
                                            if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                        }}
                                    />
                                    {formErrors.endDate && <span className="field-error">{formErrors.endDate}</span>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label className="form-label">Hạng thành viên áp dụng (Để trống = Áp dụng tất cả)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#fff', padding: '15px', border: '1.5px solid #dadce0', borderRadius: '8px' }}>
                                    <div className="rank-check-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                        <input 
                                            type="checkbox" 
                                            className="rank-cbx" 
                                            checked={selectedRankIds.length === 0}
                                            onChange={() => setSelectedRankIds([])}
                                        />
                                        <span style={{ color: '#000', fontSize: '13px', fontWeight: '800', fontFamily: 'Oswald' }}>ÁP DỤNG TẤT CẢ HẠNG THÀNH VIÊN</span>
                                    </div>
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
                .sub-title-neon { display: block; color: var(--accent-red) !important; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
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

                .ticket-type { font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #555; }
                .ticket-value { font-family: 'Oswald'; font-size: 34px; font-weight: 800; color: #000; }
                
                .ticket-right { flex: 1; padding: 20px 25px; position: relative; }
                .ticket-code { font-family: 'Oswald'; font-size: 26px; color: #000; margin-bottom: 6px; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
                .ticket-body p { margin: 0; font-size: 13px; color: #555; margin-bottom: 3px; font-weight: 500; }
                .ticket-body b { color: #000; font-weight: 700; }

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
                
                .custom-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .custom-modal-box {
                    background: #fff;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 450px;
                    padding: 24px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .custom-modal-title {
                    font-family: 'Oswald', sans-serif;
                    font-size: 20px;
                    font-weight: 800;
                    color: #000;
                    margin-top: 0;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .custom-modal-body {
                    font-size: 14px;
                    color: #4b5563;
                    margin-bottom: 24px;
                    line-height: 1.5;
                }
                .custom-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .custom-modal-btn {
                    padding: 10px 20px;
                    font-family: 'Oswald', sans-serif;
                    font-weight: 800;
                    text-transform: uppercase;
                    font-size: 13px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: 0.2s;
                    outline: none;
                }
                .custom-modal-btn-cancel {
                    background: transparent;
                    border: 1px solid #d1d5db;
                    color: #374151;
                }
                .custom-modal-btn-cancel:hover {
                    background: #f3f4f6;
                }
                .custom-modal-btn-confirm {
                    background: var(--accent-red);
                    border: 1px solid var(--accent-red);
                    color: #fff;
                }
                .custom-modal-btn-confirm:hover {
                    background: #b30000;
                    border-color: #b30000;
                }
                .input-error {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                }
                .field-error {
                    display: block;
                    color: #ef4444;
                    font-size: 11px;
                    font-weight: 600;
                    margin-top: 5px;
                    letter-spacing: 0.3px;
                }
            `}</style>
            
            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h4 className="custom-modal-title">XÁC NHẬN XÓA VOUCHER</h4>
                        <p className="custom-modal-body">
                            Bạn có chắc chắn muốn xóa vĩnh viễn voucher <strong>"{deleteConfirm.code}"</strong> này không?
                            Thao tác này không thể hoàn tác.
                        </p>
                        <div className="custom-modal-actions">
                            <button className="custom-modal-btn custom-modal-btn-cancel" onClick={() => setDeleteConfirm(null)}>
                                HỦY BỎ
                            </button>
                            <button className="custom-modal-btn custom-modal-btn-confirm" onClick={handleConfirmDelete}>
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminVouchers;
