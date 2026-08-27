import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Profile.css';
import './Orders.css';

const Notifications = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);
    const [account, setAccount] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [filterCategory, setFilterCategory] = useState('all');
    const [expandedIds, setExpandedIds] = useState({});

    const toggleExpand = (id) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=f1f5f9&color=94a3b8&bold=true';
        if (url.startsWith('http')) return url;
        const prefix = url.startsWith('/') ? '' : '/images/';
        return `http://localhost:8080${prefix}${url}`;
    };

    const getOrderMilestones = (o) => {
        const milestones = [];
        const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Vừa xong';
        const methodStr = o.method_name || 'Thanh toán khi nhận hàng (COD)';
        const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.final_amount || 0);

        if (o.status === 4) {
            milestones.push({
                title: `Đơn hàng #${o.order_code} đã bị hủy`,
                desc: o.cancel_reason ? `Lý do hủy: ${o.cancel_reason}` : `Đơn hàng đã được hệ thống ghi nhận hủy thành công.`,
                time: dateStr,
                icon: 'fa-ban text-danger'
            });
        }

        if (o.status === 3) {
            milestones.push({
                title: 'Đơn hàng đã hoàn tất',
                desc: `Đơn hàng #${o.order_code} đã hoàn thành. Hãy đánh giá sản phẩm để tích nhận 200 điểm thưởng Shoestore!`,
                time: dateStr,
                icon: 'fa-circle-check text-success'
            });
        }

        if (o.status >= 5 || o.status === 3) {
            milestones.push({
                title: 'Giao kiện hàng thành công',
                desc: `Kiện hàng của đơn hàng #${o.order_code} đã giao thành công đến bạn. Vui lòng xác nhận 'Đã nhận được hàng'.`,
                time: dateStr,
                icon: 'fa-box-open text-primary'
            });
        }

        if (o.status >= 2 && o.status !== 4) {
            milestones.push({
                title: 'Đang vận chuyển',
                desc: `Đơn hàng #${o.order_code} của bạn đang trong quá trình vận chuyển qua dịch vụ GHN Express. Vui lòng chú ý điện thoại!`,
                time: dateStr,
                icon: 'fa-truck-fast text-warning'
            });
        }

        if (o.status >= 1) {
            milestones.push({
                title: 'Xác nhận đã thanh toán',
                desc: `Hệ thống xác nhận đã nhận thanh toán cho đơn hàng #${o.order_code} (${amountStr}) qua phương thức ${methodStr}.`,
                time: dateStr,
                icon: 'fa-receipt text-info'
            });
            milestones.push({
                title: 'Đặt hàng thành công',
                desc: `Đơn hàng #${o.order_code} đã được đặt thành công. Người bán đang chuẩn bị hàng để giao cho đơn vị vận chuyển.`,
                time: dateStr,
                icon: 'fa-cart-shopping text-secondary'
            });
        }

        return milestones;
    };

    const fetchNotificationsData = async () => {
        try {
            setLoading(true);
            const profileResponse = await api.get('/api/profile');
            if (profileResponse.data && profileResponse.data.success) {
                setLoggedIn(true);
                const acc = profileResponse.data.account;
                setAccount(acc);

                const realNotis = [];
                const readNotiIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');

                // 1. Thông báo Ví điện tử & Rút tiền (ƯU TIÊN HÀNG ĐẦU)
                try {
                    const walletRes = await api.get('/api/wallet');
                    if (walletRes.data && walletRes.data.success && Array.isArray(walletRes.data.transactions)) {
                        walletRes.data.transactions.forEach(t => {
                            const amtStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.amount || 0);
                            const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('vi-VN') : 'Gần đây';
                            const notiId = `wallet_tx_${t.id}_${t.status}`;

                            if (t.type === 'REFUND') {
                                realNotis.push({
                                    id: notiId,
                                    category: 'wallet',
                                    title: `Hoàn tiền vào Ví Điện Tử: +${amtStr}`,
                                    desc: t.description || `Hệ thống đã tự động hoàn ${amtStr} vào Ví điện tử của bạn!`,
                                    time: dateStr,
                                    icon: 'fa-wallet text-success',
                                    unread: !readNotiIds.includes(notiId),
                                    link: '/wallet'
                                });
                            } else if (t.type === 'WITHDRAW') {
                                if (t.status === 1) {
                                    realNotis.push({
                                        id: notiId,
                                        category: 'wallet',
                                        title: `Rút tiền thành công: -${amtStr}`,
                                        desc: `Yêu cầu rút ${amtStr} về TK ${t.bank_account || ''} đã được Admin chuyển khoản thành công!`,
                                        time: dateStr,
                                        icon: 'fa-circle-check text-success',
                                        unread: !readNotiIds.includes(notiId),
                                        link: '/wallet'
                                    });
                                } else if (t.status === 2) {
                                    realNotis.push({
                                        id: notiId,
                                        category: 'wallet',
                                        title: `Từ chối rút tiền: ${amtStr}`,
                                        desc: t.description || `Yêu cầu rút tiền bị từ chối. Số tiền đã được hoàn lại vào Ví!`,
                                        time: dateStr,
                                        icon: 'fa-circle-xmark text-danger',
                                        unread: !readNotiIds.includes(notiId),
                                        link: '/wallet'
                                    });
                                } else if (t.status === 0) {
                                    realNotis.push({
                                        id: notiId,
                                        category: 'wallet',
                                        title: `Lệnh rút tiền đang xử lý: ${amtStr}`,
                                        desc: `Yêu cầu rút tiền về TK ${t.bank_account || ''} đang được Admin xử lý.`,
                                        time: dateStr,
                                        icon: 'fa-clock text-warning',
                                        unread: !readNotiIds.includes(notiId),
                                        link: '/wallet'
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {}

                // 2. Đơn hàng
                try {
                    const orderRes = await api.get('/api/orders');
                    if (orderRes.data && orderRes.data.success && Array.isArray(orderRes.data.orders)) {
                        orderRes.data.orders.forEach(o => {
                            let notiTitle = '';
                            let notiDesc = '';
                            const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.final_amount || 0);

                            if (o.status === 1) {
                                notiTitle = `Đơn hàng #${o.order_code} đang chờ duyệt`;
                                notiDesc = `Đơn hàng trị giá ${amountStr} đã được hệ thống ghi nhận và đang chờ đóng gói.`;
                            } else if (o.status === 2) {
                                notiTitle = `Đơn hàng #${o.order_code} đang được giao`;
                                notiDesc = `Đơn hàng đang trên đường vận chuyển. Hãy chú ý điện thoại nhé!`;
                            } else if (o.status === 3) {
                                notiTitle = `Đơn hàng #${o.order_code} đã giao thành công`;
                                notiDesc = `Giao hàng thành công! Bạn đã tích thêm điểm thành viên cho đơn hàng này.`;
                            } else if (o.status === 4) {
                                notiTitle = `Đơn hàng #${o.order_code} đã bị hủy`;
                                notiDesc = o.cancel_reason ? `Lý do hủy: ${o.cancel_reason}` : `Đơn hàng đã được hủy thành công.`;
                            }

                            if (notiTitle) {
                                const notiId = `order_${o.order_code}_${o.status}`;
                                const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : 'Gần đây';
                                realNotis.push({
                                    id: notiId,
                                    category: 'order',
                                    title: notiTitle,
                                    desc: notiDesc,
                                    time: dateStr,
                                    icon: 'fa-bag-shopping',
                                    image: o.first_product_image,
                                    productName: o.first_product_name,
                                    orderCode: o.order_code,
                                    status: o.status,
                                    milestones: getOrderMilestones(o),
                                    unread: !readNotiIds.includes(notiId),
                                    link: `/orders/detail/${o.order_code}`
                                });
                            }
                        });
                    }
                } catch (e) {}

                // 2. Flash Sale
                try {
                    const fsRes = await api.get('/api/flash-sales/active');
                    if (fsRes.data && fsRes.data.success && fsRes.data.campaign) {
                        const camp = fsRes.data.campaign;
                        const notiId = `fs_${camp.id}`;
                        realNotis.push({
                            id: notiId,
                            category: 'promo',
                            title: `Flash Sale: ${camp.name || 'Giờ Vàng Giá Sốc'}`,
                            desc: `Khung giờ săn deal nảy lửa đang diễn ra. Đừng bỏ lỡ sản phẩm giảm đến 50%!`,
                            time: 'Đang diễn ra',
                            icon: 'fa-bolt',
                            unread: !readNotiIds.includes(notiId),
                            link: '/flash-sale'
                        });
                    }
                } catch (e) {}

                // 3. Mã giảm giá
                try {
                    const vRes = await api.get('/api/vouchers');
                    if (vRes.data && vRes.data.success && Array.isArray(vRes.data.vouchers)) {
                        vRes.data.vouchers.forEach(v => {
                            const notiId = `voucher_${v.id || v.code}`;
                            const discountVal = (v.discount_percent && Number(v.discount_percent) > 0)
                                ? `${v.discount_percent}%`
                                : ((v.discount_amount && Number(v.discount_amount) > 0)
                                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.discount_amount)
                                    : 'đặc biệt');
                            realNotis.push({
                                id: notiId,
                                category: 'promo',
                                title: `Mã giảm giá mới: ${v.code}`,
                                desc: `Ưu đãi giảm ${discountVal} cho đơn hàng mua sắm hôm nay!`,
                                time: 'Mã mới',
                                icon: 'fa-ticket',
                                unread: !readNotiIds.includes(notiId),
                                link: '/cart'
                            });
                        });
                    }
                } catch (e) {}

                // 4. Thành viên
                if (acc) {
                    const points = acc.points !== undefined ? acc.points : 0;
                    const rankName = acc.rank_name || 'Thành Viên';
                    const notiId = `member_${acc.id || 'usr'}_${points}`;
                    realNotis.push({
                        id: notiId,
                        category: 'system',
                        title: `Hạng thành viên: ${rankName}`,
                        desc: `Tích lũy hiện tại: ${formatPoints(points)} PTS. Mua sắm thêm để nâng hạng tích ưu đãi!`,
                        time: 'Thành viên',
                        icon: 'fa-crown',
                        unread: !readNotiIds.includes(notiId),
                        link: '/membership'
                    });
                }

                setNotifications(realNotis);
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin thông báo:", err);
            setLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotificationsData();
    }, []);

    useEffect(() => {
        if (!loggedIn) return;
        document.body.classList.add('profile-page-active');
        return () => {
            document.body.classList.remove('profile-page-active');
        };
    }, [loggedIn]);

    const formatPoints = (points) => {
        return new Intl.NumberFormat('vi-VN').format(points || 0);
    };

    const getRankClass = (rankName) => {
        if (!rankName) return 'rank-bronze';
        const name = rankName.toLowerCase();
        if (name.includes('kim cương') || name.includes('diamond')) return 'rank-diamond';
        if (name.includes('vàng') || name.includes('gold')) return 'rank-gold';
        if (name.includes('bạc') || name.includes('silver')) return 'rank-silver';
        return 'rank-bronze';
    };

    const markAllAsRead = () => {
        const allIds = notifications.map(n => n.id);
        localStorage.setItem('read_notifications', JSON.stringify(allIds));
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const handleNotiClick = (noti) => {
        const saved = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        if (!saved.includes(noti.id)) {
            saved.push(noti.id);
            localStorage.setItem('read_notifications', JSON.stringify(saved));
        }
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, unread: false } : n));
        if (noti.link) {
            window.location.href = noti.link;
        }
    };

    const filteredNotis = notifications.filter(n => {
        if (filterCategory === 'all') return true;
        return n.category === filterCategory;
    });

    const unreadCount = notifications.filter(n => n.unread).length;

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc' }}>
                    <div className="container py-5 text-center" style={{ minHeight: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn || !account) {
        return (
            <Layout>
                <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc' }}>
                    <div className="container py-5 text-center" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <i className="fa-solid fa-lock fa-4x text-muted mb-4"></i>
                        <h4 className="fw-bold text-dark">Bạn chưa đăng nhập!</h4>
                        <p className="text-muted">Vui lòng đăng nhập để xem danh sách thông báo của bạn.</p>
                        <Link to="/login" className="btn btn-danger px-4 py-2 mt-2 font-oswald text-uppercase fw-bold">Đăng nhập ngay</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '80px' }}>
                
                {/* PAGE HEADER */}
                <div className="profile-page-header py-4">
                    <div className="container">
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '13px', color: '#64748b' }}>
                            <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Trang chủ</Link>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            <Link to="/profile" style={{ color: '#64748b', textDecoration: 'none' }}>Tài khoản</Link>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Thông báo</span>
                        </div>
                        <h1 className="fw-bold mt-2 mb-0" style={{ fontSize: '22px', color: '#0f172a', letterSpacing: '0.3px' }}>Tài Khoản Của Bạn</h1>
                    </div>
                </div>

                <div className="container py-4">
                    <div className="row g-4">

                        {/* SIDEBAR */}
                        <div className="col-lg-3">
                            <div className="epic-profile-panel">
                                <div className="profile-cover"></div>
                                <div className="user-block px-3">
                                    <div className="avatar-box">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(account.full_name)}&background=1e293b&color=fff&bold=true&size=200`}
                                            className="user-avatar"
                                            alt="Avatar"
                                        />
                                    </div>
                                    <h3 className="mt-3 fw-bold mb-1" style={{ fontSize: '16px', color: '#0f172a' }}>{account.full_name}</h3>
                                    <div className="mb-2">
                                        <span 
                                            className={`rank-badge-flat ${getRankClass(account.rank_name)}`}
                                            style={account.color_code ? {
                                                backgroundColor: `${account.color_code}1f`,
                                                color: account.color_code,
                                                borderColor: `${account.color_code}40`,
                                                borderStyle: 'solid',
                                                borderWidth: '1px'
                                            } : {}}
                                        >
                                            {account.rank_name || 'Đồng'}
                                        </span>
                                    </div>
                                    <div className="points-flat-box mb-3">
                                        <span className="points-label">Điểm</span>
                                        <span className="points-val">{formatPoints(account.points)} PTS</span>
                                    </div>
                                </div>
                                <div className="pb-3">
                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0 16px 8px' }}></div>
                                    <Link to="/profile" className="menu-link">
                                        <i className="fa-regular fa-id-badge"></i> Thông tin cá nhân
                                    </Link>
                                    <Link to="/notifications" className="menu-link active">
                                        <i className="fa-solid fa-bell text-danger"></i> Thông báo
                                        {unreadCount > 0 && (
                                            <span className="badge rounded-pill bg-danger text-white ms-auto" style={{ fontSize: '11px' }}>{unreadCount}</span>
                                        )}
                                    </Link>
                                    <Link to="/orders" className="menu-link">
                                        <i className="fa-solid fa-bag-shopping"></i> Lịch sử đơn hàng
                                    </Link>
                                    <Link to="/change-password" className="menu-link">
                                        <i className="fa-solid fa-shield-halved"></i> Đổi mật khẩu
                                    </Link>
                                    <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 16px' }}></div>
                                    <a href="/login" className="menu-link text-danger" onClick={() => api.post('/logout')}>
                                        <i className="fa-solid fa-power-off"></i> Đăng xuất
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* MAIN CONTENT */}
                        <div className="col-lg-9">
                            <div className="epic-profile-panel p-4 p-lg-5">
                                
                                {/* Content Header */}
                                <div className="content-header pb-3 mb-4 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <div style={{ width: '4px', height: '20px', background: '#e50914', borderRadius: '2px' }}></div>
                                            <h4 className="mb-0 fw-bold" style={{ fontSize: '18px', color: '#0f172a' }}>Thông Báo Của Bạn</h4>
                                        </div>
                                        <p className="mb-0 ms-3 text-muted" style={{ fontSize: '13px' }}>Quản lý tất cả các cập nhật đơn hàng, khuyến mãi và thông báo tài khoản</p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-danger font-oswald text-uppercase fw-bold" 
                                            style={{ borderRadius: '6px', fontSize: '12px' }}
                                            onClick={markAllAsRead}
                                        >
                                            <i className="fa-solid fa-check-double me-1"></i> Đánh dấu đã đọc
                                        </button>
                                    )}
                                </div>

                                {/* Category Filters */}
                                <div className="d-flex gap-2 mb-4 overflow-auto pb-1">
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm ${filterCategory === 'all' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setFilterCategory('all')}
                                    >
                                        Tất cả ({notifications.length})
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm ${filterCategory === 'order' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setFilterCategory('order')}
                                    >
                                        <i className="fa-solid fa-bag-shopping me-1"></i> Đơn hàng
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm ${filterCategory === 'wallet' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setFilterCategory('wallet')}
                                    >
                                        <i className="fa-solid fa-wallet me-1"></i> Ví Điện Tử
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm ${filterCategory === 'promo' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setFilterCategory('promo')}
                                    >
                                        <i className="fa-solid fa-bolt me-1"></i> Khuyến mãi
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`btn btn-sm ${filterCategory === 'system' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setFilterCategory('system')}
                                    >
                                        <i className="fa-solid fa-crown me-1"></i> Hạng thành viên
                                    </button>
                                </div>

                                {/* Notifications List */}
                                <div className="d-flex flex-column gap-3">
                                    {filteredNotis.length === 0 ? (
                                        <div className="text-center py-5 text-muted">
                                            <i className="fa-solid fa-bell-slash fa-3x mb-3 text-secondary opacity-50"></i>
                                            <h6 className="fw-bold">Không có thông báo nào</h6>
                                            <p className="small mb-0">Bạn chưa có thông báo thuộc danh mục này.</p>
                                        </div>
                                    ) : (
                                        filteredNotis.map(n => {
                                            const isExpanded = !!expandedIds[n.id];
                                            const isOrderType = n.category === 'order' && !!n.image;

                                            return (
                                                <div 
                                                    key={n.id}
                                                    className={`p-3 border rounded-3 transition-all ${n.unread ? 'bg-white border-danger-subtle shadow-sm' : 'bg-light border-subtle opacity-90'}`}
                                                    style={{ transition: 'all 0.2s', borderColor: n.unread ? '#fecdd3' : '#e2e8f0' }}
                                                >
                                                    {/* Header Card Row */}
                                                    <div className="d-flex align-items-start gap-3">
                                                        
                                                        {/* Thumbnail: Order Product Image or Category Icon */}
                                                        {isOrderType ? (
                                                            <img 
                                                                src={getImageUrl(n.image)} 
                                                                alt={n.productName || 'Sản phẩm'}
                                                                className="rounded-3 flex-shrink-0"
                                                                style={{ width: '54px', height: '54px', objectFit: 'cover', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'https://ui-avatars.com/api/?name=SP&background=f1f5f9&color=94a3b8&bold=true';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div 
                                                                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                                                style={{ 
                                                                    width: '48px', 
                                                                    height: '48px', 
                                                                    background: n.unread ? '#fee2e2' : '#f1f5f9',
                                                                    fontSize: '20px'
                                                                }}
                                                            >
                                                                <i className={`fa-solid ${n.icon || 'fa-bell'}`}></i>
                                                            </div>
                                                        )}

                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                <h6 className="m-0 fw-bold text-dark" style={{ fontSize: '14.5px' }}>
                                                                    {n.unread && <span className="d-inline-block me-2 bg-danger rounded-circle" style={{ width: '8px', height: '8px' }}></span>}
                                                                    {n.title}
                                                                </h6>
                                                                <span className="text-muted small ms-2">{n.time}</span>
                                                            </div>
                                                            <p className="m-0 text-muted" style={{ fontSize: '13.5px', lineHeight: '1.4' }}>{n.desc}</p>

                                                            {/* Bottom Action Row: Action Button + Shopee Chevron Expand Toggle */}
                                                            <div className="d-flex align-items-center justify-content-between mt-2 pt-1">
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-sm btn-outline-danger font-oswald text-uppercase px-3 py-1"
                                                                    style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleNotiClick(n);
                                                                    }}
                                                                >
                                                                    {n.status === 3 ? 'Đánh giá sản phẩm' : 'Xem chi tiết'}
                                                                </button>

                                                                {/* Shopee Chevron Toggle Button */}
                                                                {isOrderType && n.milestones && n.milestones.length > 0 && (
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn btn-sm btn-light border text-muted d-flex align-items-center gap-1.5 px-2.5 py-1"
                                                                        style={{ fontSize: '12px', fontWeight: 600, borderRadius: '20px', background: '#f8fafc', borderColor: '#e2e8f0' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleExpand(n.id);
                                                                        }}
                                                                    >
                                                                        <span>{isExpanded ? 'Thu gọn' : `Chi tiết hành trình (${n.milestones.length})`}</span>
                                                                        <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-secondary`} style={{ fontSize: '11px' }}></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Milestone Timeline (Shopee-Style Vertical Timeline) */}
                                                    {isExpanded && isOrderType && n.milestones && (
                                                        <div className="mt-3 pt-3 border-top position-relative ps-4 ms-2" style={{ borderColor: '#e2e8f0' }}>
                                                            {/* Vertical Connector Line */}
                                                            <div 
                                                                className="position-absolute" 
                                                                style={{ 
                                                                    left: '11px', 
                                                                    top: '24px', 
                                                                    bottom: '24px', 
                                                                    width: '2px', 
                                                                    background: '#cbd5e1' 
                                                                }}
                                                            ></div>

                                                            {n.milestones.map((m, idx) => (
                                                                <div key={idx} className="position-relative mb-3 last-mb-0 ps-3">
                                                                    {/* Milestone Bullet Circle */}
                                                                    <div 
                                                                        className="position-absolute rounded-circle d-flex align-items-center justify-content-center"
                                                                        style={{ 
                                                                            left: '-20px', 
                                                                            top: '2px', 
                                                                            width: '20px', 
                                                                            height: '20px', 
                                                                            background: idx === 0 ? '#e50914' : '#e2e8f0',
                                                                            color: idx === 0 ? '#ffffff' : '#64748b',
                                                                            fontSize: '10px',
                                                                            boxShadow: idx === 0 ? '0 0 0 4px #ffe4e6' : 'none'
                                                                        }}
                                                                    >
                                                                        <i className={`fa-solid ${idx === 0 ? 'fa-check' : 'fa-circle'}`} style={{ fontSize: idx === 0 ? '10px' : '6px' }}></i>
                                                                    </div>

                                                                    <div>
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <span className={`fw-bold ${idx === 0 ? 'text-danger' : 'text-dark'}`} style={{ fontSize: '13px' }}>
                                                                                {m.title}
                                                                            </span>
                                                                            <span className="text-muted" style={{ fontSize: '11.5px' }}>{m.time}</span>
                                                                        </div>
                                                                        <p className="text-muted mb-0 mt-0.5" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                                                                            {m.desc}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Notifications;
