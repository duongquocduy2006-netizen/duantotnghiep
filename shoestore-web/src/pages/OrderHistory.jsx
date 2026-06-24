import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';
import './Orders.css';
import ReviewModal from '../components/ReviewModal';

const PAGE_SIZE = 10;

const STATUS_LIST = [
    { value: 'all', label: 'Tất cả' },
    { value: '1',   label: 'Chờ duyệt' },
    { value: '2',   label: 'Đang giao' },
    { value: '5',   label: 'Chờ hoàn tất' },
    { value: '3',   label: 'Thành công' },
    { value: '4',   label: 'Đã hủy' },
];

const OrderHistory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [account, setAccount] = useState(null);
    const [orders, setOrders] = useState([]);
    const [reviewOrderCode, setReviewOrderCode] = useState(null);

    // Filter state
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate]     = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortDesc, setSortDesc] = useState(true); // true = mới nhất trước
    const [currentPage, setCurrentPage] = useState(1);

    // ── Fetch ──
    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const [profileRes, ordersRes] = await Promise.all([
                api.get('/api/profile'),
                api.get('/api/orders'),
            ]);
            if (profileRes.data?.success) {
                setAccount(profileRes.data.account);
            } else {
                navigate('/login');
                return;
            }
            if (ordersRes.data?.success) {
                setOrders(ordersRes.data.orders || []);
            }
        } catch {
            navigate('/login');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        document.body.classList.add('profile-page-active');
        return () => document.body.classList.remove('profile-page-active');
    }, []);

    // ── Helpers ──
    const formatCurrency = (n) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    const formatDate = (s) => {
        if (!s) return 'N/A';
        const d = new Date(s);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };

    const formatPoints = (p) => new Intl.NumberFormat('vi-VN').format(p || 0);

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const n = rankName.toLowerCase();
        if (n.includes('kim cương') || n.includes('diamond')) return 'rank-diamond';
        if (n.includes('vàng') || n.includes('gold')) return 'rank-gold';
        if (n.includes('bạc') || n.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const getStatusBadge = (status) => {
        const map = {
            1: { cls: 'badge-luxury badge-warning-lux', icon: 'fa-clock',        text: 'Chờ duyệt' },
            2: { cls: 'badge-luxury badge-info-lux',    icon: 'fa-truck-fast',    text: 'Đang giao' },
            3: { cls: 'badge-luxury badge-success-lux', icon: 'fa-circle-check',  text: 'Thành công' },
            4: { cls: 'badge-luxury badge-danger-lux',  icon: 'fa-circle-xmark',  text: 'Đã hủy' },
            5: { cls: 'badge-luxury badge-warning-lux', icon: 'fa-hourglass-half',text: 'Chờ hoàn tất' },
        };
        return map[status] || { cls: 'badge-luxury', icon: 'fa-circle', text: 'Không rõ' };
    };

    const getStatusClass = (status) => {
        if (status === 3) return 'status-done';
        if (status === 4) return 'status-canceled';
        if (status === 5) return 'status-delivered';
        return 'status-wait';
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/') ? '' : '/images/';
        return `http://localhost:8080${prefix}${url}`;
    };

    // ── Actions ──
    const handleCancel = async (e, orderCode) => {
        e.preventDefault();
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
        try {
            const res = await api.post('/api/orders/cancel', { orderCode });
            if (res.data?.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã hủy đơn hàng thành công!' }));
                fetchData(false);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể hủy: ' + res.data.message }));
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Lỗi kết nối.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
        }
    };

    const handleConfirm = async (e, orderCode) => {
        e.preventDefault();
        if (!window.confirm('Xác nhận bạn đã nhận được hàng?')) return;
        try {
            const res = await api.post('/api/orders/confirm', { orderCode });
            if (res.data?.success) { 
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Xác nhận thành công! Điểm đã được cộng.' })); 
                fetchData(false); 
                setReviewOrderCode(orderCode); // Show review popup
            }
            else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể xác nhận: ' + res.data.message }));
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Lỗi kết nối.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: ' + errMsg }));
        }
    };

    // ── Filter + Sort + Paginate ──
    const filtered = useMemo(() => {
        let result = [...orders];

        // Lọc trạng thái
        if (statusFilter !== 'all') {
            result = result.filter(o => String(o.status) === statusFilter);
        }

        // Lọc từ ngày
        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            result = result.filter(o => new Date(o.created_at) >= from);
        }

        // Lọc đến ngày
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            result = result.filter(o => new Date(o.created_at) <= to);
        }

        // Sắp xếp
        result.sort((a, b) => {
            const diff = new Date(b.created_at) - new Date(a.created_at);
            return sortDesc ? diff : -diff;
        });

        return result;
    }, [orders, statusFilter, fromDate, toDate, sortDesc]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleFilterChange = () => setCurrentPage(1);

    const resetFilter = () => {
        setFromDate('');
        setToDate('');
        setStatusFilter('all');
        setSortDesc(true);
        setCurrentPage(1);
    };

    // ── Loading ──
    if (loading) {
        return (
            <Layout>
                <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
                    <p className="mt-3 fw-semibold text-muted" style={{ fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Đang tải...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px' }}>

                {/* PAGE HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '13px', color: '#64748b' }}>
                            <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            <Link to="/orders" style={{ color: '#64748b', textDecoration: 'none' }}>Lịch sử đơn hàng</Link>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Toàn bộ đơn hàng</span>
                        </div>
                        <h1 className="fw-bold mt-2 mb-0" style={{ fontSize: '22px', color: '#0f172a' }}>Toàn Bộ Lịch Sử Đơn Hàng</h1>
                    </div>
                </div>

                <div className="container py-4">
                    <div className="row g-4">

                        {/* SIDEBAR */}
                        {account && (
                            <div className="col-lg-3">
                                <div className="epic-profile-panel">
                                    <div className="profile-cover"></div>
                                    <div className="user-block px-3">
                                        <div className="avatar-box">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(account.full_name)}&background=1e293b&color=fff&bold=true&size=200`}
                                                className="user-avatar" alt="Avatar"
                                            />
                                            <i className="fa fa-crown vip-crown"></i>
                                        </div>
                                        <h3 className="mt-3 fw-bold mb-1" style={{ fontSize: '16px', color: '#0f172a' }}>{account.full_name}</h3>
                                        <div className="mb-2">
                                            <span className={`rank-badge-flat ${getRankClass(account.rank_name)}`}>{account.rank_name || 'Đồng'}</span>
                                        </div>
                                        <div className="points-flat-box mb-3">
                                            <span className="points-label">Điểm</span>
                                            <span className="points-val">{formatPoints(account.points)} PTS</span>
                                        </div>
                                    </div>
                                    <div className="pb-3">
                                        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 16px 8px' }}></div>
                                        <Link to="/profile" className="menu-link"><i className="fa-regular fa-id-badge"></i> Thông tin cá nhân</Link>
                                        <Link to="/orders" className="menu-link active"><i className="fa-solid fa-bag-shopping"></i> Lịch sử đơn hàng</Link>
                                        <Link to="/change-password" className="menu-link"><i className="fa-solid fa-shield-halved"></i> Đổi mật khẩu</Link>
                                        <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 16px' }}></div>
                                        <a href="/login" className="menu-link text-danger" onClick={() => api.post('/logout')}>
                                            <i className="fa-solid fa-power-off"></i> Đăng xuất
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MAIN CONTENT */}
                        <div className={account ? 'col-lg-9' : 'col-12'}>

                            {/* ── FILTER BAR ── */}
                            <div className="filter-bar">
                                <div className="row g-3 align-items-end">
                                    {/* Từ ngày */}
                                    <div className="col-sm-4 col-lg-3">
                                        <label className="filter-label">Từ ngày</label>
                                        <input
                                            type="date"
                                            className="filter-input"
                                            value={fromDate}
                                            max={toDate || undefined}
                                            onChange={e => { setFromDate(e.target.value); handleFilterChange(); }}
                                        />
                                    </div>

                                    {/* Đến ngày */}
                                    <div className="col-sm-4 col-lg-3">
                                        <label className="filter-label">Đến ngày</label>
                                        <input
                                            type="date"
                                            className="filter-input"
                                            value={toDate}
                                            min={fromDate || undefined}
                                            onChange={e => { setToDate(e.target.value); handleFilterChange(); }}
                                        />
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="col-sm-4 col-lg-3">
                                        <label className="filter-label">Trạng thái</label>
                                        <select
                                            className="filter-input"
                                            value={statusFilter}
                                            onChange={e => { setStatusFilter(e.target.value); handleFilterChange(); }}
                                        >
                                            {STATUS_LIST.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Nút reset */}
                                    <div className="col-sm-12 col-lg-3 d-flex gap-2">
                                        <button className="filter-btn filter-btn-reset flex-grow-1" onClick={resetFilter}>
                                            <i className="fa-solid fa-rotate-left me-1"></i> Đặt lại
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── RESULTS BAR ── */}
                            <div className="results-info">
                                <span className="results-count">
                                    Hiển thị <strong>{paginated.length}</strong> / <strong>{filtered.length}</strong> đơn hàng
                                </span>
                                <div className="sort-tabs">
                                    <button
                                        className={`sort-tab ${sortDesc ? 'active' : ''}`}
                                        onClick={() => { setSortDesc(true); setCurrentPage(1); }}
                                    >
                                        <i className="fa-solid fa-arrow-down-short-wide me-1"></i> Mới nhất
                                    </button>
                                    <button
                                        className={`sort-tab ${!sortDesc ? 'active' : ''}`}
                                        onClick={() => { setSortDesc(false); setCurrentPage(1); }}
                                    >
                                        <i className="fa-solid fa-arrow-up-short-wide me-1"></i> Cũ nhất
                                    </button>
                                </div>
                            </div>

                            {/* ── STATUS CHIPS ── */}
                            <div className="status-chips">
                                {STATUS_LIST.map(s => (
                                    <button
                                        key={s.value}
                                        className={`status-chip ${statusFilter === s.value ? 'active' : ''}`}
                                        onClick={() => { setStatusFilter(s.value); handleFilterChange(); }}
                                    >
                                        {s.label}
                                        {s.value !== 'all' && (
                                            <span style={{ marginLeft: '5px', opacity: 0.7, fontSize: '11px' }}>
                                                ({orders.filter(o => String(o.status) === s.value).length})
                                            </span>
                                        )}
                                        {s.value === 'all' && (
                                            <span style={{ marginLeft: '5px', opacity: 0.7, fontSize: '11px' }}>
                                                ({orders.length})
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* ── ORDER LIST ── */}
                            {filtered.length === 0 ? (
                                <div className="history-empty">
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <i className="fa-solid fa-box-open" style={{ fontSize: '24px', color: '#94a3b8' }}></i>
                                    </div>
                                    <p className="fw-semibold text-muted mb-3" style={{ fontSize: '15px' }}>
                                        {orders.length === 0 ? 'Bạn chưa có đơn hàng nào' : 'Không tìm thấy đơn hàng phù hợp với bộ lọc'}
                                    </p>
                                    {orders.length > 0 && (
                                        <button className="filter-btn filter-btn-reset" onClick={resetFilter}>
                                            <i className="fa-solid fa-rotate-left me-1"></i> Xóa bộ lọc
                                        </button>
                                    )}
                                </div>
                            ) : (
                                paginated.map(order => {
                                    const badge  = getStatusBadge(order.status);
                                    const imgSrc = getImageUrl(order.first_product_image);
                                    return (
                                        <div key={order.order_code} className={`luxury-order-card ${getStatusClass(order.status)}`}>

                                            {/* Header */}
                                            <div className="order-header">
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="order-id">#{order.order_code}</span>
                                                    <span className="order-date">
                                                        <i className="fa-regular fa-calendar me-1"></i>
                                                        {formatDate(order.created_at)}
                                                    </span>
                                                </div>
                                                <span className={badge.cls}>
                                                    <i className={`fa-solid ${badge.icon} me-1`}></i> {badge.text}
                                                </span>
                                            </div>

                                            {/* Product info */}
                                            <div className="d-flex align-items-center gap-3 mb-4">
                                                {imgSrc ? (
                                                    <img
                                                        src={imgSrc}
                                                        className="product-thumb"
                                                        alt={order.first_product_name || 'Sản phẩm'}
                                                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <div
                                                    className="product-thumb"
                                                    style={{
                                                        display: imgSrc ? 'none' : 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0
                                                    }}
                                                >
                                                    <i className="fa-solid fa-shoe-prints" style={{ fontSize: '22px', color: '#94a3b8', transform: 'rotate(-30deg)' }}></i>
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="product-title">{order.first_product_name || 'Đôi giày thời trang'}</div>
                                                    <div className="product-meta">
                                                        {order.total_items > 1 ? `+${order.total_items - 1} sản phẩm khác` : '1 sản phẩm'}
                                                    </div>
                                                </div>
                                                <div className="text-end flex-shrink-0">
                                                    <div className="price-tag">{formatCurrency(order.final_amount)}</div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="d-flex justify-content-end gap-2 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                                                <Link to={`/orders/detail/${order.order_code}`} className="btn-outline-luxury">
                                                    <i className="fa-regular fa-file-lines me-1"></i> Chi tiết
                                                </Link>
                                                {order.status === 3 && (
                                                    <Link to="/shop" className="btn-outline-luxury" style={{ background: '#0f172a', color: '#fff', border: '1px solid #0f172a' }}>
                                                        Mua lại
                                                    </Link>
                                                )}
                                                {order.status === 1 && (
                                                    <button type="button" className="btn-outline-luxury text-danger" onClick={e => handleCancel(e, order.order_code)}>
                                                        <i className="fa-solid fa-xmark me-1"></i> Hủy đơn
                                                    </button>
                                                )}
                                                {order.status === 2 && (
                                                    <button type="button" className="btn-super" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={e => handleConfirm(e, order.order_code)}>
                                                        <i className="fa-solid fa-box-open me-1"></i> Đã nhận hàng
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* ── PAGINATION ── */}
                            {totalPages > 1 && (
                                <div className="pagination-bar">
                                    <button
                                        className="page-btn"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <i className="fa-solid fa-chevron-left" style={{ fontSize: '12px' }}></i>
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .reduce((acc, p, idx, arr) => {
                                            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, idx) =>
                                            p === '...' ? (
                                                <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '14px' }}>…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(p)}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )
                                    }

                                    <button
                                        className="page-btn"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <i className="fa-solid fa-chevron-right" style={{ fontSize: '12px' }}></i>
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {reviewOrderCode && (
                <ReviewModal 
                    orderCode={reviewOrderCode} 
                    onClose={() => {
                        setReviewOrderCode(null);
                        fetchData(false);
                    }} 
                />
            )}
        </Layout>
    );
};

export default OrderHistory;
