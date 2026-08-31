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
    const [loggedIn, setLoggedIn] = useState(false);
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
                setLoggedIn(true);
                setBalance(res.data.balance || 0);
                setTransactions(res.data.transactions || []);
                if (res.data.savedBankBin) setBankBin(res.data.savedBankBin);
                if (res.data.savedBankAccount) setBankAccount(res.data.savedBankAccount);
                if (res.data.savedAccountName) setAccountName(res.data.savedAccountName);
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy dữ liệu ví:", err);
            setLoggedIn(false);
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

    const getBankName = (bin) => {
        if (!bin) return '';
        const b = VIETNAM_BANKS.find(x => x.bin === String(bin));
        return b ? b.name.split(' (')[0] : bin;
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

    const counts = useMemo(() => {
        return {
            all: transactions.length,
            refund: transactions.filter(t => t.type === 'REFUND').length,
            withdraw: transactions.filter(t => t.type === 'WITHDRAW').length,
            rejected: transactions.filter(t => t.status === 2).length,
        };
    }, [transactions]);

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

    if (!loggedIn) {
        return (
            <Layout>
                <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '100px' }}>
                    <div className="container py-5" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center py-5 px-4 profile-login-box shadow-sm" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#fee2e2', color: '#e50914', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <i className="bi bi-wallet2" style={{ fontSize: '32px' }}></i>
                            </div>
                            <h3 className="fw-bold text-uppercase text-dark mb-2" style={{ fontSize: '22px', letterSpacing: '0.5px' }}>Ví Điện Tử Của Tôi</h3>
                            <p className="text-muted mb-4" style={{ fontSize: '14px', lineHeight: '1.7' }}>
                                Vui lòng đăng nhập để xem số dư Ví điện tử, quản lý lịch sử giao dịch và thực hiện rút tiền về ngân hàng.
                            </p>
                            <Link to="/login" className="btn-modern-primary d-inline-block px-4 py-2-5 rounded-3 fw-bold" style={{ textDecoration: 'none' }}>
                                Đăng nhập ngay
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px' }}>
                
                {/* HEADER */}
                <div className="profile-page-header py-4 bg-white border-bottom border-light">
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
                            background: '#111827',
                            border: '1px solid rgba(229, 9, 20, 0.35)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                            <div className="col-md-8">
                                <div className="d-inline-flex align-items-center gap-2 mb-2">
                                    <i className="bi bi-wallet2 text-danger fs-4"></i>
                                    <span className="font-oswald text-uppercase fw-bold letter-spacing-1 text-light" style={{ fontSize: '14px' }}>
                                        SỐ DƯ VÍ ĐIỆN TỬ KHẢ DỤNG
                                    </span>
                                </div>
                                <h2 className="font-oswald fw-bold display-4 mb-2 text-danger">
                                    {formatCurrency(balance)}
                                </h2>
                                <p className="text-white-50 m-0" style={{ fontSize: '13.5px', maxWidth: '600px', lineHeight: '1.6' }}>
                                    Số tiền hoàn từ các đơn hủy được tích lũy tại đây. Bạn có thể rút trực tiếp về tài khoản Ngân hàng bất kỳ lúc nào!
                                </p>
                            </div>
                            <div className="col-md-4 text-md-end mt-4 mt-md-0">
                                <button
                                    className="btn btn-lg font-oswald text-uppercase fw-bold px-4 py-3 rounded-3 transition-all d-inline-flex align-items-center justify-content-center gap-2"
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    disabled={balance <= 0}
                                    style={{
                                        background: balance <= 0 
                                            ? '#334155' 
                                            : 'linear-gradient(135deg, #e50914 0%, #b91c1c 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '15px',
                                        letterSpacing: '1px',
                                        opacity: balance <= 0 ? 0.6 : 1,
                                        cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: balance <= 0 ? 'none' : '0 6px 16px rgba(229, 9, 20, 0.4)',
                                        width: '100%',
                                        maxWidth: '260px'
                                    }}
                                >
                                    <i className="bi bi-building-columns fs-5"></i>
                                    RÚT TIỀN VỀ NGÂN HÀNG
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TRANSACTIONS HISTORY CONTAINER */}
                    <div className="bg-white rounded-4 p-4 shadow-sm border border-slate-200">
                        
                        {/* HEADER & MODERN SEGMENTED FILTER TABS */}
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4 pb-3 border-bottom border-light">
                            <div>
                                <h4 className="font-oswald fw-bold text-uppercase text-dark m-0 d-flex align-items-center gap-2" style={{ fontSize: '18px', letterSpacing: '0.5px' }}>
                                    <i className="bi bi-clock-history text-danger"></i> LỊCH SỬ GIAO DỊCH VÍ
                                </h4>
                                <span className="text-muted" style={{ fontSize: '13px' }}>Theo dõi các khoản hoàn tiền và lịch sử yêu cầu rút tiền</span>
                            </div>

                            {/* MODERN SEGMENTED PILL FILTER */}
                            <div className="p-1-5 bg-slate-100 rounded-3 border border-slate-200 d-inline-flex flex-wrap gap-1" style={{ background: '#f1f5f9' }}>
                                
                                {/* TAB ALL */}
                                <button
                                    type="button"
                                    onClick={() => { setTypeFilter('ALL'); setCurrentPage(1); }}
                                    className="btn border-0 rounded-2 fw-semibold px-3 py-1-5 transition-all d-flex align-items-center gap-2"
                                    style={{
                                        fontSize: '13px',
                                        background: typeFilter === 'ALL' ? '#0f172a' : 'transparent',
                                        color: typeFilter === 'ALL' ? '#ffffff' : '#475569',
                                        boxShadow: typeFilter === 'ALL' ? '0 2px 6px rgba(15, 23, 42, 0.15)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-grid-fill" style={{ opacity: typeFilter === 'ALL' ? 1 : 0.6 }}></i>
                                    Tất cả
                                    <span 
                                        className="badge rounded-pill ms-1"
                                        style={{
                                            fontSize: '11px',
                                            background: typeFilter === 'ALL' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                            color: typeFilter === 'ALL' ? '#ffffff' : '#64748b'
                                        }}
                                    >
                                        {counts.all}
                                    </span>
                                </button>

                                {/* TAB REFUND */}
                                <button
                                    type="button"
                                    onClick={() => { setTypeFilter('REFUND'); setCurrentPage(1); }}
                                    className="btn border-0 rounded-2 fw-semibold px-3 py-1-5 transition-all d-flex align-items-center gap-2"
                                    style={{
                                        fontSize: '13px',
                                        background: typeFilter === 'REFUND' ? '#166534' : 'transparent',
                                        color: typeFilter === 'REFUND' ? '#ffffff' : '#15803d',
                                        boxShadow: typeFilter === 'REFUND' ? '0 2px 6px rgba(22, 101, 52, 0.2)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-arrow-down-left-circle-fill" style={{ opacity: typeFilter === 'REFUND' ? 1 : 0.8 }}></i>
                                    Hoàn tiền
                                    <span 
                                        className="badge rounded-pill ms-1"
                                        style={{
                                            fontSize: '11px',
                                            background: typeFilter === 'REFUND' ? 'rgba(255,255,255,0.2)' : '#dcfce7',
                                            color: typeFilter === 'REFUND' ? '#ffffff' : '#15803d'
                                        }}
                                    >
                                        {counts.refund}
                                    </span>
                                </button>

                                {/* TAB WITHDRAW */}
                                <button
                                    type="button"
                                    onClick={() => { setTypeFilter('WITHDRAW'); setCurrentPage(1); }}
                                    className="btn border-0 rounded-2 fw-semibold px-3 py-1-5 transition-all d-flex align-items-center gap-2"
                                    style={{
                                        fontSize: '13px',
                                        background: typeFilter === 'WITHDRAW' ? '#d97706' : 'transparent',
                                        color: typeFilter === 'WITHDRAW' ? '#ffffff' : '#b45309',
                                        boxShadow: typeFilter === 'WITHDRAW' ? '0 2px 6px rgba(217, 119, 6, 0.2)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-arrow-up-right-circle-fill" style={{ opacity: typeFilter === 'WITHDRAW' ? 1 : 0.8 }}></i>
                                    Rút tiền
                                    <span 
                                        className="badge rounded-pill ms-1"
                                        style={{
                                            fontSize: '11px',
                                            background: typeFilter === 'WITHDRAW' ? 'rgba(255,255,255,0.2)' : '#fef3c7',
                                            color: typeFilter === 'WITHDRAW' ? '#ffffff' : '#b45309'
                                        }}
                                    >
                                        {counts.withdraw}
                                    </span>
                                </button>

                                {/* TAB REJECTED */}
                                <button
                                    type="button"
                                    onClick={() => { setTypeFilter('REJECTED'); setCurrentPage(1); }}
                                    className="btn border-0 rounded-2 fw-semibold px-3 py-1-5 transition-all d-flex align-items-center gap-2"
                                    style={{
                                        fontSize: '13px',
                                        background: typeFilter === 'REJECTED' ? '#e50914' : 'transparent',
                                        color: typeFilter === 'REJECTED' ? '#ffffff' : '#e50914',
                                        boxShadow: typeFilter === 'REJECTED' ? '0 2px 6px rgba(229, 9, 20, 0.2)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-x-circle-fill" style={{ opacity: typeFilter === 'REJECTED' ? 1 : 0.8 }}></i>
                                    Từ chối
                                    <span 
                                        className="badge rounded-pill ms-1"
                                        style={{
                                            fontSize: '11px',
                                            background: typeFilter === 'REJECTED' ? 'rgba(255,255,255,0.2)' : '#ffe4e6',
                                            color: typeFilter === 'REJECTED' ? '#ffffff' : '#be123c'
                                        }}
                                    >
                                        {counts.rejected}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TRANSACTIONS CONTENT */}
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-5">
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #e2e8f0' }}>
                                    <i className="bi bi-inbox text-muted fs-3"></i>
                                </div>
                                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>Chưa có giao dịch nào</h6>
                                <p className="text-muted m-0" style={{ fontSize: '13px' }}>Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive rounded-3 border border-slate-100">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead style={{ background: '#f8fafc', fontSize: '12px', color: '#475569', letterSpacing: '0.5px' }} className="font-oswald text-uppercase">
                                            <tr>
                                                <th className="py-3 px-3">Thời gian</th>
                                                <th className="py-3">Loại giao dịch</th>
                                                <th className="py-3">Mô tả</th>
                                                <th className="py-3">Số tài khoản nhận</th>
                                                <th className="py-3 text-end">Số tiền</th>
                                                <th className="py-3 text-center px-3">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '13.5px' }}>
                                            {paginatedTransactions.map(t => {
                                                const isRefund = t.type === 'REFUND';
                                                const isRejected = t.status === 2;
                                                const isPending = t.status === 0;

                                                return (
                                                    <tr key={t.id} style={{ transition: 'background 0.15s ease' }}>
                                                        <td className="py-3 px-3 text-secondary font-monospace" style={{ fontSize: '13px' }}>
                                                            {formatDate(t.created_at)}
                                                        </td>
                                                        <td className="py-3">
                                                            {isRefund ? (
                                                                <span className="badge rounded-pill px-3 py-1-5 d-inline-flex align-items-center gap-1.5" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                                                                    <i className="bi bi-arrow-down-left-circle-fill fs-6"></i> Hoàn tiền vào Ví
                                                                </span>
                                                            ) : (
                                                                <span className="badge rounded-pill px-3 py-1-5 d-inline-flex align-items-center gap-1.5" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                                                                    <i className="bi bi-arrow-up-right-circle-fill fs-6"></i> Rút tiền Ngân hàng
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 fw-semibold text-dark">
                                                            {t.description || 'Giao dịch Ví'}
                                                        </td>
                                                        <td className="py-3">
                                                            {t.bank_account ? (
                                                                <span>
                                                                    <b className="font-monospace text-dark">{t.bank_account}</b>{' '}
                                                                    <span className="badge bg-light text-secondary border ms-1" style={{ fontSize: '11px' }}>
                                                                        {getBankName(t.bank_bin)}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="d-inline-flex align-items-center gap-1.5 text-secondary fw-semibold" style={{ fontSize: '13px' }}>
                                                                    <i className="bi bi-wallet2 text-danger"></i> Ví ShoeStore
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-end font-oswald fw-bold fs-6">
                                                            {isRejected ? (
                                                                <span className="text-muted text-decoration-line-through me-1">{formatCurrency(t.amount)}</span>
                                                            ) : isRefund ? (
                                                                <span className="text-success fw-bold" style={{ color: '#16a34a' }}>+{formatCurrency(t.amount)}</span>
                                                            ) : (
                                                                <span className="text-danger fw-bold" style={{ color: '#e50914' }}>-{formatCurrency(t.amount)}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-center px-3">
                                                            {isPending ? (
                                                                <span className="badge rounded-pill px-3 py-1-5 d-inline-flex align-items-center gap-1" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                                                                    <i className="bi bi-clock-history"></i> Chờ xử lý
                                                                </span>
                                                            ) : isRejected ? (
                                                                <span className="badge rounded-pill px-3 py-1-5 d-inline-flex align-items-center gap-1" style={{ background: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3', fontWeight: 600 }}>
                                                                    <i className="bi bi-x-circle-fill"></i> Bị từ chối
                                                                </span>
                                                            ) : (
                                                                <span className="badge rounded-pill px-3 py-1-5 d-inline-flex align-items-center gap-1" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600 }}>
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
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 pt-3 border-top border-light gap-2">
                                        <div className="text-muted" style={{ fontSize: '13px' }}>
                                            Hiển thị <b className="text-dark">{(currentPage - 1) * pageSize + 1}</b> - <b className="text-dark">{Math.min(currentPage * pageSize, filteredTransactions.length)}</b> trong <b className="text-dark">{filteredTransactions.length}</b> giao dịch
                                        </div>
                                        <div className="d-flex gap-1 align-items-center">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary px-3 rounded-2 d-flex align-items-center gap-1"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            >
                                                <i className="bi bi-chevron-left"></i> Trước
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    type="button"
                                                    className={`btn btn-sm px-3 rounded-2 ${currentPage === page ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                                                    onClick={() => setCurrentPage(page)}
                                                    style={{
                                                        background: currentPage === page ? '#e50914' : 'transparent',
                                                        borderColor: currentPage === page ? '#e50914' : '#cbd5e1'
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary px-3 rounded-2 d-flex align-items-center gap-1"
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
                    <div className="admin-confirm-box animate__animated animate__zoomIn" style={{ maxWidth: '500px', width: '90%', borderRadius: '16px', padding: '32px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-confirm-icon" style={{ background: '#fee2e2', color: '#e50914', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <i className="bi bi-building-columns fs-3"></i>
                        </div>
                        <h4 className="admin-confirm-title font-oswald text-uppercase fw-bold text-dark mb-1">RÚT TIỀN VỀ NGÂN HÀNG</h4>
                        <p className="admin-confirm-message mb-4" style={{ fontSize: '14px', color: '#64748b' }}>
                            Số dư ví khả dụng: <strong className="text-danger font-oswald fs-5 ms-1">{formatCurrency(balance)}</strong>
                        </p>

                        <form onSubmit={handleWithdrawSubmit} noValidate>
                            <div className="text-start mb-3">
                                <label className="form-label font-oswald text-uppercase fw-bold text-secondary" style={{ fontSize: '12px' }}>
                                    Số tiền muốn rút (VND)
                                </label>
                                <input
                                    type="number"
                                    className={`form-control rounded-3 ${amountError ? 'is-invalid border-danger' : ''}`}
                                    placeholder="Nhập số tiền (tối thiểu 1.000 VNĐ)..."
                                    style={{ fontSize: '14px', padding: '12px' }}
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
                                    className="form-select rounded-3"
                                    style={{ fontSize: '14px', padding: '12px' }}
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
                                    className={`form-control rounded-3 ${bankAccountError ? 'is-invalid border-danger' : ''}`}
                                    placeholder="Nhập số tài khoản..."
                                    style={{ fontSize: '14px', padding: '12px' }}
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
                                    className="form-control rounded-3"
                                    placeholder="VD: NGUYEN VAN A..."
                                    style={{ fontSize: '14px', padding: '12px' }}
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                            </div>

                            <div className="d-flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    className="btn btn-light w-50 py-2-5 rounded-3 fw-semibold text-secondary" 
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    style={{ fontSize: '14px' }}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-danger w-50 py-2-5 rounded-3 font-oswald text-uppercase fw-bold"
                                    style={{ background: '#e50914', border: 'none', fontSize: '14px' }}
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
