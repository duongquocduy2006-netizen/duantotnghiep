import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const VIETNAM_BANKS = [
    { bin: "970422", name: "MBBank (Ngân hàng Quân Đội)" },
    { bin: "970436", name: "Vietcombank (VCB)" },
    { bin: "970407", name: "Techcombank (TCB)" },
    { bin: "970415", name: "VietinBank (CTG)" },
    { bin: "970418", name: "BIDV" },
    { bin: "970405", name: "Agribank (VBA)" },
    { bin: "970432", name: "VPBank (VPB)" },
    { bin: "970416", name: "ACB" },
    { bin: "970423", name: "TPBank" },
    { bin: "970403", name: "Sacombank" },
    { bin: "970437", name: "HDBank" },
    { bin: "970441", name: "VIB" },
    { bin: "970426", name: "MSB" },
    { bin: "970443", name: "SHB" },
    { bin: "971005", name: "Ví MoMo" }
];

const AdminWithdrawals = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [keyword, setKeyword] = useState("");

    // Modal state for QR Transfer
    const [qrModal, setQrModal] = useState({
        isOpen: false,
        txId: null,
        amount: 0,
        bankBin: "970422",
        bankAccount: "",
        accountName: "",
        customerName: "",
        isSubmitting: false
    });
    const [isTransferredChecked, setIsTransferredChecked] = useState(false);

    // Modal state for Reject
    const [rejectModal, setRejectModal] = useState({
        isOpen: false,
        txId: null,
        customerName: "",
        amount: 0,
        reason: "",
        isSubmitting: false
    });

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/wallet/admin/withdrawals');
            if (res.data && res.data.success) {
                setWithdrawals(res.data.withdrawals || []);
            } else {
                setError("Không thể lấy danh sách yêu cầu rút tiền.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách rút tiền:", err);
            setError("Lỗi kết nối máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const formatCurrency = (amt) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const filteredList = useMemo(() => {
        return withdrawals.filter(w => {
            const matchStatus = statusFilter === "" || String(w.status) === String(statusFilter);
            const matchKeyword = !keyword.trim() || 
                (w.full_name && w.full_name.toLowerCase().includes(keyword.toLowerCase())) ||
                (w.email && w.email.toLowerCase().includes(keyword.toLowerCase())) ||
                (w.bank_account && w.bank_account.includes(keyword));
            return matchStatus && matchKeyword;
        });
    }, [withdrawals, statusFilter, keyword]);

    const openQrModal = (w) => {
        setIsTransferredChecked(false);
        setQrModal({
            isOpen: true,
            txId: w.id,
            amount: w.amount,
            bankBin: w.bank_bin || "970422",
            bankAccount: w.bank_account || "",
            accountName: w.account_name || "",
            customerName: w.full_name || "Khách hàng",
            isSubmitting: false
        });
    };

    const submitQrApprove = async () => {
        setQrModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            const res = await api.post('/api/wallet/admin/withdrawals/approve', { txId: qrModal.txId });
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Xác nhận chuyển khoản thành công!' }));
                setQrModal({ isOpen: false, txId: null, amount: 0, bankBin: "970422", bankAccount: "", accountName: "", customerName: "", isSubmitting: false });
                fetchWithdrawals();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || 'Lỗi duyệt yêu cầu.' }));
                setQrModal(prev => ({ ...prev, isSubmitting: false }));
            }
        } catch (err) {
            console.error("Lỗi duyệt rút tiền:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi máy chủ khi duyệt rút tiền!' }));
            setQrModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const openRejectModal = (w) => {
        setRejectModal({
            isOpen: true,
            txId: w.id,
            customerName: w.full_name || "Khách hàng",
            amount: w.amount,
            reason: "",
            isSubmitting: false
        });
    };

    const submitReject = async () => {
        setRejectModal(prev => ({ ...prev, isSubmitting: true }));
        try {
            const res = await api.post('/api/wallet/admin/withdrawals/reject', {
                txId: rejectModal.txId,
                reason: rejectModal.reason
            });
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã từ chối rút tiền và hoàn lại số dư Ví cho khách!' }));
                setRejectModal({ isOpen: false, txId: null, customerName: "", amount: 0, reason: "", isSubmitting: false });
                fetchWithdrawals();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || 'Lỗi từ chối rút tiền.' }));
                setRejectModal(prev => ({ ...prev, isSubmitting: false }));
            }
        } catch (err) {
            console.error("Lỗi từ chối rút tiền:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi máy chủ khi từ chối rút tiền!' }));
            setRejectModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <div>
                    <span className="sub-title-neon font-oswald text-uppercase">
                        <i className="bi bi-wallet2 me-1"></i> QUẢN LÝ DỊCH VỤ VÍ
                    </span>
                    <h1 className="cinematic-title">QUẢN LÝ YÊU CẦU RÚT TIỀN</h1>
                </div>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="admin-filter-bar mb-4 d-flex justify-content-between align-items-center gap-3">
                <div className="admin-search-box-wrap flex-grow-1">
                    <i className="bi bi-search admin-search-icon"></i>
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Tìm kiếm theo Tên khách hàng, Email, Số tài khoản..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    style={{ width: '220px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Trạng thái: Tất cả</option>
                    <option value="0">Chờ xử lý rút tiền</option>
                    <option value="1">Đã chuyển khoản thành công</option>
                    <option value="2">Từ chối rút tiền</option>
                </select>
            </div>

            {/* TABLE CARD */}
            <div className="table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                        <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI YÊU CẦU RÚT TIỀN...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                        <p style={{ marginTop: '10px' }}>{error}</p>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px' }}></i>
                        <p style={{ marginTop: '12px', fontSize: '14px' }}>Không có yêu cầu rút tiền nào khớp với tìm kiếm.</p>
                    </div>
                ) : (
                    <table className="admin-table align-middle">
                        <thead>
                            <tr>
                                <th>MÃ GIAO DỊCH / THỜI GIAN</th>
                                <th>KHÁCH HÀNG</th>
                                <th className="text-end">SỐ TIỀN RÚT</th>
                                <th>NGÂN HÀNG & SỐ TÀI KHOẢN</th>
                                <th className="text-center">TRẠNG THÁI</th>
                                <th className="text-center" style={{ width: '220px' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(w => {
                                const bankObj = VIETNAM_BANKS.find(b => b.bin === w.bank_bin);
                                const bankName = bankObj ? bankObj.name : w.bank_bin;
                                return (
                                    <tr key={w.id}>
                                        <td>
                                            <div className="fw-bold font-oswald text-primary">#WTX-{w.id}</div>
                                            <div className="text-muted small">{formatDate(w.created_at)}</div>
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{w.full_name}</div>
                                            <div className="text-muted small">{w.email}</div>
                                            {w.phone && <div className="text-muted small">{w.phone}</div>}
                                        </td>
                                        <td className="text-end font-oswald fw-bold text-danger fs-5">
                                            {formatCurrency(w.amount)}
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">
                                                <i className="bi bi-building-columns text-primary me-1"></i> {bankName}
                                            </div>
                                            <div className="text-danger fw-bold fs-6">
                                                <i className="bi bi-credit-card-2-front me-1"></i> {w.bank_account}
                                            </div>
                                            {w.account_name && (
                                                <div className="text-muted small">
                                                    Chủ TK: <b>{w.account_name}</b>
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {w.status === 0 ? (
                                                <span className="badge d-inline-flex align-items-center gap-1" style={{ background: '#fffbe6', color: '#d48806', border: '1px solid #ffe58f', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    <i className="bi bi-clock-history"></i> Chờ xử lý rút tiền
                                                </span>
                                            ) : w.status === 1 ? (
                                                <span className="badge d-inline-flex align-items-center gap-1" style={{ background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    <i className="bi bi-check-circle-fill"></i> Đã chuyển khoản thành công
                                                </span>
                                            ) : (
                                                <span className="badge d-inline-flex align-items-center gap-1" style={{ background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    <i className="bi bi-x-circle-fill"></i> Từ chối rút tiền
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {w.status === 0 ? (
                                                <div className="d-flex flex-column gap-1">
                                                    <button
                                                        className="btn btn-sm btn-danger font-oswald text-uppercase d-inline-flex align-items-center justify-content-center gap-1"
                                                        style={{ fontSize: '11px', fontWeight: 'bold', padding: '6px 10px' }}
                                                        onClick={() => openQrModal(w)}
                                                    >
                                                        <i className="bi bi-qr-code-scan"></i> Quét VietQR Chuyển Tiền
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary font-oswald text-uppercase d-inline-flex align-items-center justify-content-center gap-1"
                                                        style={{ fontSize: '10px', padding: '3px 6px' }}
                                                        onClick={() => openRejectModal(w)}
                                                    >
                                                        <i className="bi bi-x-circle"></i> Từ chối
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted small">Đã hoàn tất</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* VIETQR TRANSFER MODAL */}
            {qrModal.isOpen && (
                <div className="admin-confirm-overlay" onClick={() => setQrModal({ isOpen: false, txId: null, amount: 0, bankBin: "970422", bankAccount: "", accountName: "", customerName: "", isSubmitting: false })}>
                    <div className="admin-confirm-box animate__animated animate__zoomIn" style={{ maxWidth: '540px', width: '92%' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-confirm-icon" style={{ background: '#fffbe6', color: '#d48806' }}>
                            <i className="bi bi-building-columns"></i>
                        </div>
                        <h4 className="admin-confirm-title font-oswald text-uppercase">DUYỆT YÊU CẦU RÚT TIỀN</h4>
                        <p className="admin-confirm-message mb-3">
                            Chuyển tiền rút cho khách: <strong>{qrModal.customerName}</strong> - Số tiền: <strong style={{ color: '#d48806', fontSize: '18px' }}>{formatCurrency(qrModal.amount)}</strong>
                        </p>

                        {/* GUIDANCE */}
                        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                            <h6 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }} className="d-flex align-items-center gap-1">
                                <i className="bi bi-list-check text-primary fs-5 me-1"></i> <b>CÁC BƯỚC THỰC HIỆN CHUYỂN TIỀN RÚT:</b>
                            </h6>
                            <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                                <div className="mb-1"><b>Bước 1:</b> Mở App Ngân hàng bất kỳ trên điện thoại và quét mã VietQR bên dưới.</div>
                                <div className="mb-1"><b>Bước 2:</b> Thực hiện chuyển số tiền <strong style={{ color: '#d48806' }}>{formatCurrency(qrModal.amount)}</strong> tới STK Khách hàng.</div>
                                <div><b>Bước 3:</b> Tích chọn ô xác nhận bên dưới để mở khóa nút <i>Xác nhận đã chuyển tiền</i>.</div>
                            </div>
                        </div>

                        {/* READ-ONLY BANK DETAILS */}
                        <div style={{ textAlign: 'left', background: '#f1f5f9', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '14px' }}>
                            <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                                <i className="bi bi-building-columns text-primary me-2"></i><b>Ngân hàng nhận:</b> {VIETNAM_BANKS.find(b => b.bin === qrModal.bankBin)?.name || qrModal.bankBin}
                            </div>
                            <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                                <i className="bi bi-credit-card-2-front text-danger me-2"></i><b>Số tài khoản nhận tiền:</b> <span style={{ color: '#e50914', fontWeight: 'bold', fontSize: '15px' }}>{qrModal.bankAccount}</span>
                            </div>
                            {qrModal.accountName && (
                                <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                    <i className="bi bi-person-check text-success me-2"></i><b>Chủ tài khoản:</b> <span style={{ fontWeight: 'bold' }}>{qrModal.accountName}</span>
                                </div>
                            )}
                        </div>

                        {/* VIETQR IMAGE */}
                        <div style={{ textAlign: 'center', marginBottom: '14px', background: '#fff', padding: '14px', borderRadius: '12px', border: '1.5px dashed #d48806' }}>
                            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                <i className="bi bi-qr-code-scan me-1 text-danger"></i> MÃ VIETQR CHUYỂN TIỀN TRỰC TIẾP CHO KHÁCH:
                            </p>
                            <img 
                                src={`https://img.vietqr.io/image/${qrModal.bankBin}-${qrModal.bankAccount.trim()}-compact2.png?amount=${Math.ceil(qrModal.amount)}&addInfo=Rut%20tien%20Vi%20ShoeStore%20${qrModal.txId}&accountName=${encodeURIComponent(qrModal.accountName || '')}`} 
                                alt="VietQR Withdraw" 
                                style={{ maxHeight: '200px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} 
                            />
                        </div>

                        {/* CHECKBOX CONFIRMATION */}
                        <div style={{ textAlign: 'left', background: '#fffbe6', padding: '12px 16px', borderRadius: '10px', border: '1px solid #ffe58f', marginBottom: '16px' }}>
                            <div className="form-check m-0">
                                <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    id="chkTransferredQr" 
                                    checked={isTransferredChecked} 
                                    onChange={e => setIsTransferredChecked(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <label className="form-check-label fw-bold text-dark ms-2" htmlFor="chkTransferredQr" style={{ cursor: 'pointer', fontSize: '13px', lineHeight: '1.4' }}>
                                    Tôi xác nhận đã chuyển khoản thành công số tiền rút cho Khách hàng trên App Ngân Hàng.
                                </label>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="admin-confirm-actions">
                            <button
                                className="admin-btn-confirm-cancel"
                                disabled={qrModal.isSubmitting}
                                onClick={() => setQrModal({ isOpen: false, txId: null, amount: 0, bankBin: "970422", bankAccount: "", accountName: "", customerName: "", isSubmitting: false })}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                className="admin-btn-confirm-ok"
                                style={{ 
                                    background: isTransferredChecked ? '#d48806' : '#94a3b8',
                                    boxShadow: isTransferredChecked ? '0 4px 6px -1px rgba(212, 136, 6, 0.2)' : 'none',
                                    cursor: isTransferredChecked ? 'pointer' : 'not-allowed',
                                    opacity: isTransferredChecked ? 1 : 0.6
                                }}
                                disabled={!isTransferredChecked || qrModal.isSubmitting}
                                onClick={submitQrApprove}
                            >
                                {qrModal.isSubmitting ? (
                                    <span><i className="bi bi-arrow-repeat spin me-1"></i> Đang xử lý...</span>
                                ) : (
                                    <span><i className="bi bi-check-circle-fill me-1"></i> Xác nhận đã chuyển tiền</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {rejectModal.isOpen && (
                <div className="admin-confirm-overlay" onClick={() => setRejectModal({ isOpen: false, txId: null, customerName: "", amount: 0, reason: "", isSubmitting: false })}>
                    <div className="admin-confirm-box animate__animated animate__zoomIn" style={{ maxWidth: '460px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-confirm-icon" style={{ background: '#fff1f0', color: '#cf1322' }}>
                            <i className="bi bi-x-circle-fill"></i>
                        </div>
                        <h4 className="admin-confirm-title font-oswald text-uppercase">TỪ CHỐI RÚT TIỀN</h4>
                        <p className="admin-confirm-message mb-3">
                            Từ chối yêu cầu rút tiền <strong style={{ color: '#dc2626' }}>{formatCurrency(rejectModal.amount)}</strong> của <strong>{rejectModal.customerName}</strong>.<br/>
                            <i>(Số tiền này sẽ được hoàn lại vào Ví Điện Tử của Khách)</i>
                        </p>

                        <div className="text-start mb-4">
                            <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                Lý do từ chối rút tiền
                            </label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Nhập lý do từ chối (VD: Số tài khoản không hợp lệ, tên không khớp...)..."
                                style={{ fontSize: '13px', padding: '10px' }}
                                value={rejectModal.reason}
                                onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                            ></textarea>
                        </div>

                        <div className="admin-confirm-actions">
                            <button
                                className="admin-btn-confirm-cancel"
                                disabled={rejectModal.isSubmitting}
                                onClick={() => setRejectModal({ isOpen: false, txId: null, customerName: "", amount: 0, reason: "", isSubmitting: false })}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                className="admin-btn-confirm-ok"
                                style={{ background: '#dc2626' }}
                                disabled={rejectModal.isSubmitting}
                                onClick={submitReject}
                            >
                                {rejectModal.isSubmitting ? (
                                    <span><i className="bi bi-arrow-repeat spin me-1"></i> Đang xử lý...</span>
                                ) : (
                                    <span><i className="bi bi-x-circle-fill me-1"></i> Xác nhận từ chối</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminWithdrawals;
