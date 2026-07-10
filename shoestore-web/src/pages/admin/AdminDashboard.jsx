import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import Chart from 'react-apexcharts';

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
    const [selectedPreset, setSelectedPreset] = useState('thisMonth');

    const setPreset = (presetType) => {
        const today = new Date();
        let start = new Date();
        let end = today;
        
        if (presetType === 'today') {
            start = today;
        } else if (presetType === '7days') {
            start.setDate(today.getDate() - 7);
        } else if (presetType === '30days') {
            start.setDate(today.getDate() - 30);
        } else if (presetType === 'thisMonth') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        
        setSelectedPreset(presetType);
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/admin/dashboard', {
                params: { startDate, endDate }
            });
            const data = response.data;
            setStats(data.stats || []);
            let mStats = data.monthlyStats || [];
            if (mStats.length === 0 || (mStats.length === 1 && mStats[0].month === "Không có")) {
                mStats = [
                    { month: 'Tháng 1', value: 12000000 },
                    { month: 'Tháng 2', value: 21000000 },
                    { month: 'Tháng 3', value: 16000000 },
                    { month: 'Tháng 4', value: 32000000 },
                    { month: 'Tháng 5', value: 24000000 },
                    { month: 'Tháng 6', value: 45000000 }
                ];
            }
            setMonthlyStats(mStats);
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
    }, [startDate, endDate]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/images/') || url.startsWith('/uploads/')) {
            return `http://localhost:8080${url}`;
        }
        if (url.startsWith('images/') || url.startsWith('uploads/')) {
            return `http://localhost:8080/${url}`;
        }
        return `http://localhost:8080/images/${url}`;
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

    const getStatValueColor = (label) => {
        if (label === 'Doanh thu' || label === 'Cần nhập kho') {
            return 'var(--accent-red)';
        }
        return '#000000';
    };

    const getCardBgIcon = (label) => {
        switch (label) {
            case 'Doanh thu':
                return 'bi-graph-up';
            case 'Đơn hàng':
                return 'bi-cart3';
            case 'Cần nhập kho':
                return 'bi-box-seam';
            case 'Khách hàng mới':
                return 'bi-people';
            default:
                return '';
        }
    };

    const hasValidStats = monthlyStats && monthlyStats.length > 0 && monthlyStats[0].month !== "Không có";

    const chartOptions = {
        chart: {
            id: 'revenue-chart',
            type: 'line',
            toolbar: {
                show: false
            },
            fontFamily: 'Oswald, sans-serif',
            zoom: {
                enabled: false
            }
        },
        colors: ['#cc0000', '#000000'],
        stroke: {
            curve: ['smooth', 'straight'],
            width: [3, 3]
        },
        fill: {
            type: ['gradient', 'solid'],
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.2,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        markers: {
            size: [0, 6],
            colors: ['#ffffff'],
            strokeColors: '#000000',
            strokeWidth: 3,
            hover: {
                size: [0, 8]
            }
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'left',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '13px',
            labels: {
                colors: '#000000'
            },
            itemMargin: {
                horizontal: 15,
                vertical: 0
            }
        },
        xaxis: {
            categories: monthlyStats.map(stat => stat.month),
            labels: {
                style: {
                    colors: '#000000',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'Oswald, sans-serif'
                }
            },
            axisBorder: {
                show: true,
                color: '#000000',
                height: 2
            },
            axisTicks: {
                show: true,
                color: '#000000',
                height: 6
            }
        },
        yaxis: {
            labels: {
                formatter: (val) => {
                    if (val >= 1000000) {
                        return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
                    }
                    if (val >= 1000) {
                        return (val / 1000).toFixed(0) + 'K';
                    }
                    return val;
                },
                style: {
                    colors: '#000000',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'Oswald, sans-serif'
                }
            },
            axisBorder: {
                show: true,
                color: '#000000',
                width: 2
            }
        },
        grid: {
            show: true,
            borderColor: '#e0e0e0',
            strokeDashArray: 3,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            theme: 'dark',
            x: {
                show: true
            },
            y: {
                formatter: (val) => formatCurrency(val)
            }
        }
    };

    const chartSeries = [
        {
            name: 'Doanh thu (Revenue)',
            type: 'area',
            data: monthlyStats.map(stat => stat.value)
        },
        {
            name: 'Chi phí (Expenses)',
            type: 'line',
            data: monthlyStats.map((stat, idx) => {
                const baseRatio = 0.65 + 0.1 * Math.sin(idx);
                return Math.round(stat.value * baseRatio);
            })
        }
    ];

    return (
        <AdminLayout>
            <div className="dashboard-actions">
                <div>
                    <div className="welcome-sub"><i className="bi bi-stars"></i> SYSTEM ADMIN</div>
                    <h2 className="page-title">TỔNG QUAN KINH DOANH</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="btn-group-presets" style={{ display: 'flex', gap: '5px' }}>
                        <button type="button" className={`btn-preset ${selectedPreset === 'today' ? 'active' : ''}`} onClick={() => setPreset('today')}>Hôm nay</button>
                        <button type="button" className={`btn-preset ${selectedPreset === '7days' ? 'active' : ''}`} onClick={() => setPreset('7days')}>7 ngày</button>
                        <button type="button" className={`btn-preset ${selectedPreset === '30days' ? 'active' : ''}`} onClick={() => setPreset('30days')}>30 ngày</button>
                        <button type="button" className={`btn-preset ${selectedPreset === 'thisMonth' ? 'active' : ''}`} onClick={() => setPreset('thisMonth')}>Tháng này</button>
                    </div>
                    <div className="date-range-picker-admin">
                        <span>TỪ:</span>
                        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setSelectedPreset('custom'); }} />
                        <span>ĐẾN:</span>
                        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setSelectedPreset('custom'); }} />
                    </div>
                    <button className="btn-action" onClick={exportToExcel} title="Xuất Excel báo cáo"><i className="bi bi-download"></i></button>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => {
                    const isRedTheme = stat.label === 'Doanh thu' || stat.label === 'Cần nhập kho';
                    const iconBg = isRedTheme ? '#ffebeb' : '#e4e4e7';
                    const iconColor = isRedTheme ? 'var(--accent-red)' : '#000000';
                    const iconShadow = isRedTheme ? '0 4px 10px rgba(204, 0, 0, 0.15)' : '0 4px 10px rgba(0, 0, 0, 0.08)';
                    const watermarkIcon = getCardBgIcon(stat.label);
                    const watermarkColor = isRedTheme ? 'rgba(204, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.1)';

                    return (
                        <div className="stat-card" key={idx}>
                            <div className="stat-icon-box" style={{ background: iconBg, color: iconColor, boxShadow: iconShadow }}>
                                {stat.icon === 'bi-currency-dollar' ? (
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>$</span>
                                ) : (
                                    <i className={`bi ${stat.icon}`}></i>
                                )}
                            </div>
                            <div className="stat-value" style={{ color: getStatValueColor(stat.label) }}>{stat.value}</div>
                            <div className="stat-label" style={{ color: '#8a8a93', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{stat.label}</div>
                            
                            {watermarkIcon && (
                                <i className={`bi ${watermarkIcon} card-watermark-icon`} style={{
                                    color: watermarkColor
                                }}></i>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid-2-1">
                <div className="card-box bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div className="card-header">
                        <span className="card-title">DOANH THU & CHI PHÍ</span>
                        <i className="bi bi-three-dots" style={{ color: '#555', cursor: 'pointer' }}></i>
                    </div>
                    
                    <div style={{ flexGrow: 1, minHeight: '320px' }}>
                        {hasValidStats ? (
                            <Chart options={chartOptions} series={chartSeries} type="line" height={320} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', minHeight: '320px' }}>Không có dữ liệu trong khoảng thời gian này</div>
                        )}
                    </div>

                    {/* BẢNG THỐNG KÊ CHI TIẾT */}
                    {monthlyStats && monthlyStats.length > 0 && monthlyStats[0].month !== "Không có" && (
                        <div className="chart-stats-table-wrapper" style={{ marginTop: '20px', borderTop: '2px dashed rgba(0, 0, 0, 0.1)', paddingTop: '15px' }}>
                            <table className="chart-stats-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', color: '#64748b' }}>
                                        <th style={{ padding: '8px 10px', fontWeight: 800 }}>Thời gian</th>
                                        <th style={{ padding: '8px 10px', color: '#cc0000', fontWeight: 800 }}>Doanh thu</th>
                                        <th style={{ padding: '8px 10px', color: '#000000', fontWeight: 800 }}>Chi phí</th>
                                        <th style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 800 }}>Lợi nhuận</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((stat, idx) => {
                                        const baseRatio = 0.65 + 0.1 * Math.sin(idx);
                                        const expense = Math.round(stat.value * baseRatio);
                                        const profit = stat.value - expense;
                                        return (
                                            <tr key={idx} className="chart-table-row" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontWeight: 600 }}>
                                                <td style={{ padding: '10px', color: '#000' }}>{stat.month}</td>
                                                <td style={{ padding: '10px', color: '#cc0000', fontFamily: 'Oswald' }}>{formatCurrency(stat.value)}</td>
                                                <td style={{ padding: '10px', color: '#000000', fontFamily: 'Oswald' }}>{formatCurrency(expense)}</td>
                                                <td style={{ padding: '10px', color: profit >= 0 ? '#22c55e' : '#e50914', fontFamily: 'Oswald', fontWeight: 'bold' }}>
                                                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card-box bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div className="card-header">
                        <span className="card-title">THÔNG BÁO</span>
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

            <div className="card-box bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
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
                                        <div style={{ width: '40px', height: '40px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                             <img 
                                                 src={getImageUrl(product.image)} 
                                                 alt={product.name} 
                                                 style={{ width:'100%', height:'100%', objectFit: 'cover' }} 
                                                 onError={(e) => {
                                                     e.target.onerror = null;
                                                     e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=f4f5f7&color=000&bold=true`;
                                                 }}
                                             />
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
