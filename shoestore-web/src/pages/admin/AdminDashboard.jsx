import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
    const [stats, setStats] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [activities, setActivities] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const [startDate, setStartDate] = useState(formatDate(firstDay));
    const [endDate, setEndDate] = useState(formatDate(today));

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/admin/dashboard', {
                params: { startDate, endDate }
            });
            const data = response.data;
            setStats(data.stats || []);
            setMonthlyStats(data.monthlyStats || []);
            setActivities(data.activities || []);
            setTopProducts(data.topProducts || []);
        } catch (err) {
            console.error("Lỗi lấy dữ liệu dashboard:", err);
            setError("Không thể kết nối đến server để lấy dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const overviewData = stats.map(s => ({
            "Chỉ tiêu": s.label,
            "Giá trị": s.value,
        }));
        
        const productsData = topProducts.map((p, index) => ({
            "STT": index + 1,
            "Tên sản phẩm": p.name,
            "Mã SKU": p.sku,
            "Danh mục": p.category,
            "Đã bán": p.soldCount,
            "Tổng doanh thu": p.totalRevenue
        }));

        const wb = XLSX.utils.book_new();
        
        const wsOverview = XLSX.utils.json_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng quan");
        
        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Sản phẩm bán chạy");

        XLSX.writeFile(wb, `BaoCao_ThongKe_${startDate}_den_${endDate}.xlsx`);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#000' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '14px' }}>ĐANG TẢI DỮ LIỆU THỰC TẾ...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI KẾT NỐI HỆ THỐNG</h3>
                    <p style={{ color: '#aaa', marginTop: '10px' }}>{error}</p>
                    <button className="btn-action btn-primary-glow" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
                        THỬ LẠI
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="dashboard-actions">
                <div>
                    <div className="welcome-sub"><i className="bi bi-stars"></i> SYSTEM ADMIN</div>
                    <h2 className="page-title">TỔNG QUAN KINH DOANH</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', border: '3px solid #000', padding: '0 10px', height: '45px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px', fontFamily: 'Oswald' }}>TỪ:</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: 'none', outline: 'none', fontWeight: 'bold', background: 'transparent' }} />
                        <span style={{ fontWeight: '800', fontSize: '13px', marginLeft: '10px', fontFamily: 'Oswald' }}>ĐẾN:</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: 'none', outline: 'none', fontWeight: 'bold', background: 'transparent' }} />
                    </div>
                    <button className="btn-action btn-primary-glow" onClick={fetchDashboardData} style={{ height: '45px', padding: '0 25px' }}><i className="bi bi-filter"></i> LỌC</button>
                    <button className="btn-action" onClick={exportToExcel} style={{ height: '45px' }}><i className="bi bi-download"></i></button>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div className="stat-card" key={idx}>
                        <div className="stat-icon-box"><i className={`bi ${stat.icon}`}></i></div>
                        <div className="stat-value" style={{ color: stat.color || '#000' }}>{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2-1">
                <div className="card-box bg-white border border-dark" style={{ borderRightWidth: '4px', borderBottomWidth: '4px' }}>
                    <div className="card-header">
                        <span className="card-title">BIỂU ĐỒ DOANH THU</span>
                        <i className="bi bi-three-dots" style={{ color: '#555', cursor: 'pointer' }}></i>
                    </div>
                    
                    <div className="chart-visual">
                        {monthlyStats.map((stat, idx) => (
                            <div className="bar-group" key={idx}>
                                <div 
                                    className={`bar ${stat.percentage >= 90 ? 'bar-max' : 'bar-active'}`} 
                                    style={{ height: `${stat.percentage}%` }}
                                ></div>
                                <span className="bar-label">{stat.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card-box bg-white border border-dark" style={{ borderRightWidth: '4px', borderBottomWidth: '4px' }}>
                    <div className="card-header">
                        <span className="card-title">HOẠT ĐỘNG GẦN ĐÂY</span>
                    </div>
                    
                    <div className="feed-list">
                        {activities.map((act, idx) => (
                            <div className="timeline-item" key={idx}>
                                <div className={`dot ${act.type}`}></div>
                                <div>
                                    <p className="feed-text" dangerouslySetInnerHTML={{ __html: act.message }}></p>
                                    <span className="feed-time">{act.timeAgo || act.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card-box bg-white border border-dark" style={{ borderRightWidth: '4px', borderBottomWidth: '4px' }}>
                <div className="card-header">
                    <span className="card-title">SẢN PHẨM BÁN CHẠY</span>
                    <Link to="/admin/products" style={{ fontSize: '12px', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                        XEM TẤT CẢ <i className="bi bi-arrow-right"></i>
                    </Link>
                </div>
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Đã bán</th>
                            <th style={{ textAlign: 'right' }}>Tổng thu</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topProducts.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#fff', border: '2px solid #000', borderRadius: '0', overflow: 'hidden' }}>
                                            <img src={getImageUrl(product.image) || `https://placehold.co/40x40/000/fff?text=${product.sku}`} alt={product.name} style={{ width:'100%', height:'100%', objectFit: 'cover' }} />
                                        </div>
                                        <div>
                                            <Link to={`/admin/products/edit/${product.id}`} className="p-name">{product.name}</Link>
                                            <span className="p-sub">SKU: #{product.sku}</span>
                                        </div>
                                    </div>
                                </td>
                                <td><span style={{ color: '#a1a1aa', fontSize: '11px' }}>{product.category}</span></td>
                                <td style={{ fontWeight: '600', color: '#000' }}>{product.soldCount}</td>
                                <td style={{ textAlign: 'right' }} className="price-text">{formatCurrency(product.totalRevenue)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
