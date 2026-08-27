import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';

const VIETNAM_BANKS = [
    { bin: "970422", name: "MBBank (Ngân hàng Quân Đội)" },
    { bin: "970436", name: "Vietcombank (VCB)" },
    { bin: "970418", name: "BIDV (Ngân hàng Đầu tư và Phát triển VN)" },
    { bin: "970415", name: "VietinBank (Công Thương Việt Nam)" },
    { bin: "970405", name: "Agribank (Nông nghiệp và Phát triển Nông thôn)" },
    { bin: "970407", name: "Techcombank (Kỹ thương Việt Nam)" },
    { bin: "970423", name: "TPBank (Tài chính Tiên Phong)" },
    { bin: "970432", name: "VPBank (Việt Nam Thịnh Vượng)" },
    { bin: "970416", name: "ACB (Á Châu)" },
    { bin: "970403", name: "Sacombank (Sài Gòn Thương Tín)" }
];

const Wallet = () => {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    
    // Filter & Pagination for Transactions
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // Withdraw modal
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [bankBin, setBankBin] = useState('970422');
    const [bankAccount, setBankAccount] = useState('');
    const [accountName, setAccountName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [amountError, setAmountError] = useState('');
    const [bankAccountError, setBankAccountError] = useState('');

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/wallet');
            if (res.data && res.data.success) {
                setBalance(res.data.balance || 0);
                setTransactions(res.data.transactions || []);
                if (res.data.savedBankBin) setBankBin(res.data.savedBankBin);
                if (res.data.savedBankAccount) setBankAccount(res.data.savedBankAccount);
                if (res.data.savedAccountName) setAccountName(res.data.savedAccountName);
            }
        } catch (err) {
            console.error("Lỗi lấy dữ liệu ví:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
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

    // Filtered & Paginated transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (typeFilter === 'REFUND') return t.type === 'REFUND';
            if (typeFilter === 'WITHDRAW') return t.type === 'WITHDRAW';
            if (typeFilter === 'REJECTED') return t.status === 2;
            return true;
        });
    }, [transactions, typeFilter]);

    const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTransactions.slice(start, start + pageSize);
    }, [filteredTransactions, currentPage, pageSize]);

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        let hasError = false;

        if (!withdrawAmount || isNaN(amt) || amt < 1000) {
            setAmountError('Số tiền rút tối thiểu phải từ 1.000 VNĐ trở lên!');
            hasError = true;
        } else if (amt > balance) {
            setAmountError(`Số tiền rút không được vượt quá số dư ví (${formatCurrency(balance)})!`);
            hasError = true;
        } else {
            setAmountError('');
        }

        if (!bankAccount.trim()) {
            setBankAccountError('Vui lòng nhập số tài khoản ngân hàng nhận tiền!');
            hasError = true;
        } else {
            setBankAccountError('');
        }

        if (hasError) return;

        try {
            setSubmitting(true);
            const res = await api.post('/api/wallet/withdraw', {
                amount: amt,
                bankBin,
                bankAccount: bankAccount.trim(),
                accountName: accountName.trim()
            });

            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Tạo lệnh rút tiền thành công!' }));
                setIsWithdrawModalOpen(false);
                setWithdrawAmount('');
                setAmountError('');
                setBankAccountError('');
                fetchWalletData();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || 'Rút tiền thất bại.' }));
            }
        } catch (err) {
            console.error("Lỗi rút tiền:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: err.response?.data?.message || 'Lỗi hệ thống khi rút tiền!' }));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{ minHeight: '100vh' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
                        <p className="mt-3 fw-semibold text-muted" style={{ fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Đang tải thông tin Ví...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px' }}>
                
                {/* HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '13px', color: '#64748b' }}>
                            <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Ví Điện Tử</span>
                        </div>
                        <h1 className="fw-bold mt-2 mb-0" style={{ fontSize: '22px', color: '#0f172a', letterSpacing: '0.3px' }}>VÍ ĐIỆN TỬ CỦA TÔI</h1>
                    </div>
                </div>

                <div className="container py-4">
                    {/* WALLET BALANCE BANNER */}
                    <div 
                        className="p-4 p-md-5 mb-4 rounded-4 shadow-lg text-white position-relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
                            border: '1px solid rgba(229, 9, 20, 0.35)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div className="row align-items-center">
                            <div className="col-md-8">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="bi bi-wallet2 text-danger fs-4"></i>
                                    <span className="font-oswald text-uppercase fw-bold letter-spacing-1 text-light" style={{ fontSize: '14px' }}>SỐ DƯ VÍ ĐIỆN TỬ KHẢ DỤNG</span>
                                </div>
                                <h2 className="font-oswald fw-bold display-4 mb-2 text-danger">
                                    {formatCurrency(balance)}
                                </h2>
                                <p className="text-white-50 m-0" style={{ fontSize: '13px' }}>
                                    Số tiền hoàn từ các đơn hủy được tích lũy tại đây. Bạn có thể rút trực tiếp về Ngân hàng bất kỳ lúc nào!
                                </p>
                            </div>
                            <div className="col-md-4 text-md-end mt-4 mt-md-0">
                                <button
                                    className="btn btn-danger btn-lg font-oswald text-uppercase fw-bold px-4 py-3 rounded-3 shadow"
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    disabled={balance <= 0}
                                    style={{
                                        background: balance <= 0 ? '#475569' : 'linear-gradient(135deg, #e50914 0%, #b20710 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '15px',
                                        letterSpacing: '1px',
                                        opacity: balance <= 0 ? 0.6 : 1,
                                        cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: balance <= 0 ? 'none' : '0 4px 14px rgba(229, 9, 20, 0.4)'
                                    }}
                                >
                                    <i className="bi bi-building-columns me-2"></i>
                                    RÚT TIỀN VỀ NGÂN HÀNG
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TRANSACTIONS HISTORY */}
                    <div className="bg-white rounded-4 p-4 shadow-sm border border-light-subtle">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                            <h4 className="font-oswald fw-bold text-uppercase text-dark m-0 d-flex align-items-center gap-2" style={{ fontSize: '18px' }}>
                                <i className="bi bi-clock-history text-danger"></i> LỊCH SỬ GIAO DỊCH VÍ
                            </h4>

                            {/* FILTER TABS */}
                            <div className="btn-group btn-group-sm">
                                <button
                                    className={`btn ${typeFilter === 'ALL' ? 'btn-dark fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => { setTypeFilter('ALL'); setCurrentPage(1); }}
                                >
                                    Tất cả ({transactions.length})
                                </button>
                                <button
                                    className={`btn ${typeFilter === 'REFUND' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => { setTypeFilter('REFUND'); setCurrentPage(1); }}
                                >
                                    Hoàn tiền ({transactions.filter(t => t.type === 'REFUND').length})
                                </button>
                                <button
                                    className={`btn ${typeFilter === 'WITHDRAW' ? 'btn-warning fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => { setTypeFilter('WITHDRAW'); setCurrentPage(1); }}
                                >
                                    Rút tiền ({transactions.filter(t => t.type === 'WITHDRAW').length})
                                </button>
                                <button
                                    className={`btn ${typeFilter === 'REJECTED' ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => { setTypeFilter('REJECTED'); setCurrentPage(1); }}
                                >
                                    Từ chối ({transactions.filter(t => t.status === 2).length})
                                </button>
                            </div>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-5 text-muted font-oswald fs-6">
                                Chưa có giao dịch nào phù hợp với bộ lọc.
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light font-oswald text-uppercase" style={{ fontSize: '13px' }}>
                                            <tr>
                                                <th>Thời gian</th>
                                                <th>Loại giao dịch</th>
                                                <th>Mô tả</th>
                                                <th>Số tài khoản nhận</th>
                                                <th className="text-end">Số tiền</th>
                                                <th className="text-center">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '14px' }}>
                                            {paginatedTransactions.map(t => {
                                                const isRefund = t.type === 'REFUND';
                                                const isRejected = t.status === 2;
                                                const isPending = t.status === 0;

                                                return (
                                                    <tr key={t.id}>
                                                        <td>{formatDate(t.created_at)}</td>
                                                        <td>
                                                            {isRefund ? (
                                                                <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                                                                    <i className="bi bi-arrow-down-left-circle"></i> Hoàn tiền vào Ví
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-warning-subtle text-warning border border-warning d-inline-flex align-items-center gap-1">
                                                                    <i className="bi bi-arrow-up-right-circle"></i> Rút tiền về Ngân hàng
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="fw-semibold">{t.description || 'Giao dịch Ví'}</td>
                                                        <td>
                                                            {t.bank_account ? (
                                                                <span><b>{t.bank_account}</b> ({t.bank_bin || 'N/A'})</span>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td className="text-end font-oswald fw-bold fs-6">
                                                            {isRejected ? (
                                                                <span className="text-muted text-decoration-line-through me-1">{formatCurrency(t.amount)}</span>
                                                            ) : isRefund ? (
                                                                <span className="text-success">+{formatCurrency(t.amount)}</span>
                                                            ) : (
                                                                <span className="text-danger">-{formatCurrency(t.amount)}</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            {isPending ? (
                                                                <span className="badge bg-warning-subtle text-warning border border-warning d-inline-flex align-items-center gap-1">
                                                                    <i className="bi bi-clock-history"></i> Chờ xử lý rút tiền
                                                                </span>
                                                            ) : isRejected ? (
                                                                <span className="badge bg-danger-subtle text-danger border border-danger d-inline-flex align-items-center gap-1">
                                                                    <i className="bi bi-x-circle-fill"></i> Từ chối rút tiền
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                                                                    <i className="bi bi-check-circle-fill"></i> Thành công
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* PAGINATION CONTROL */}
                                {totalPages > 1 && (
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 pt-3 border-top gap-2">
                                        <div className="text-muted" style={{ fontSize: '13px' }}>
                                            Hiển thị <b>{(currentPage - 1) * pageSize + 1}</b> - <b>{Math.min(currentPage * pageSize, filteredTransactions.length)}</b> trong <b>{filteredTransactions.length}</b> giao dịch
                                        </div>
                                        <div className="d-flex gap-1 align-items-center">
                                            <button
                                                className="btn btn-sm btn-outline-secondary px-3"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            >
                                                <i className="bi bi-chevron-left"></i> Trước
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    className={`btn btn-sm px-3 ${currentPage === page ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                            <button
                                                className="btn btn-sm btn-outline-secondary px-3"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            >
                                                Sau <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* WITHDRAW MODAL */}
            {isWithdrawModalOpen && (
                <div className="admin-confirm-overlay" onClick={() => setIsWithdrawModalOpen(false)}>
                    <div className="admin-confirm-box animate__animated animate__zoomIn" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-confirm-icon" style={{ background: '#fff1f0', color: '#e50914' }}>
                            <i className="bi bi-building-columns"></i>
                        </div>
                        <h4 className="admin-confirm-title font-oswald text-uppercase">RÚT TIỀN VỀ TÀI KHOẢN NGÂN HÀNG</h4>
                        <p className="admin-confirm-message mb-3">
                            Số dư ví khả dụng: <strong className="text-danger fs-5">{formatCurrency(balance)}</strong>
                        </p>

                        <form onSubmit={handleWithdrawSubmit} noValidate>
                            <div className="text-start mb-3">
                                <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                    Số tiền muốn rút (VND)
                                </label>
                                <input
                                    type="number"
                                    className={`form-control ${amountError ? 'is-invalid border-danger' : ''}`}
                                    placeholder="Nhập số tiền (tối thiểu 1.000 VNĐ)..."
                                    style={{ fontSize: '14px', padding: '10px' }}
                                    value={withdrawAmount}
                                    onChange={e => {
                                        setWithdrawAmount(e.target.value);
                                        if (amountError) setAmountError('');
                                    }}
                                />
                                {amountError && (
                                    <div className="text-danger fw-bold mt-1 d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                        <i className="bi bi-exclamation-circle-fill"></i> {amountError}
                                    </div>
                                )}
                            </div>

                            <div className="text-start mb-3">
                                <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                    Ngân hàng nhận tiền
                                </label>
                                <select
                                    className="form-select"
                                    style={{ fontSize: '14px', padding: '10px' }}
                                    value={bankBin}
                                    onChange={e => setBankBin(e.target.value)}
                                >
                                    {VIETNAM_BANKS.map(b => (
                                        <option key={b.bin} value={b.bin}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-start mb-3">
                                <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                    Số tài khoản ngân hàng
                                </label>
                                <input
                                    type="text"
                                    className={`form-control ${bankAccountError ? 'is-invalid border-danger' : ''}`}
                                    placeholder="Nhập số tài khoản..."
                                    style={{ fontSize: '14px', padding: '10px' }}
                                    value={bankAccount}
                                    onChange={e => {
                                        setBankAccount(e.target.value);
                                        if (bankAccountError) setBankAccountError('');
                                    }}
                                />
                                {bankAccountError && (
                                    <div className="text-danger fw-bold mt-1 d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                                        <i className="bi bi-exclamation-circle-fill"></i> {bankAccountError}
                                    </div>
                                )}
                            </div>

                            <div className="text-start mb-4">
                                <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                    Tên chủ tài khoản
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="VD: NGUYEN VAN A..."
                                    style={{ fontSize: '14px', padding: '10px' }}
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                            </div>

                            <div className="admin-confirm-actions">
                                <button type="button" className="admin-btn-confirm-cancel" onClick={() => setIsWithdrawModalOpen(false)}>
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="admin-btn-confirm-ok"
                                    style={{ background: '#e50914' }}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Wallet;
