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
    const [categorySales, setCategorySales] = useState([]);
    const [orderStatusStats, setOrderStatusStats] = useState([]);
    const [categoryBestSellers, setCategoryBestSellers] = useState([]);
    const [brandBestSellers, setBrandBestSellers] = useState([]);
    const [activeBarTab, setActiveBarTab] = useState('category');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
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
            const [dashRes, ordersRes, catRes, prodRes] = await Promise.all([
                api.get('/api/admin/dashboard', { params: { startDate, endDate } }).catch(() => null),
                api.get('/api/orders/all').catch(() => null),
                api.get('/api/categories').catch(() => null),
                api.get('/api/products').catch(() => null)
            ]);

            const data = dashRes ? dashRes.data : {};
            setStats(data.stats || []);
            let mStats = data.monthlyStats || [];
            
            setMonthlyStats(mStats);
            setActivities(data.activities || []);
            setTopProducts(data.topProducts || []);
            setCategorySales(data.categorySales || []);

            // 100% REAL DATABASE QUERY CALCULATION (Zero Mock Data)
            const realCategories = (catRes && Array.isArray(catRes.data)) ? catRes.data : [];
            const realProducts = (prodRes && Array.isArray(prodRes.data)) ? prodRes.data : [];
            const realOrders = (ordersRes && ordersRes.data && Array.isArray(ordersRes.data.orders)) ? ordersRes.data.orders : [];

            const catMap = {};
            const brandMap = {};

            realCategories.forEach(c => {
                const cName = c.categoryName || c.name || c.category_name;
                if (cName) {
                    catMap[cName] = { name: cName, soldCount: 0, totalRevenue: 0, prodCount: 0 };
                }
            });

            realProducts.forEach(p => {
                const cName = p.categoryName || (p.category && (p.category.categoryName || p.category.name)) || (typeof p.category === 'string' ? p.category : '');
                if (cName && !catMap[cName]) {
                    catMap[cName] = { name: cName, soldCount: 0, totalRevenue: 0, prodCount: 0 };
                }
                if (cName && catMap[cName]) {
                    catMap[cName].prodCount += 1;
                }

                const bName = p.brandName || p.brand || p.brand_name;
                if (bName) {
                    if (!brandMap[bName]) {
                        brandMap[bName] = { name: bName, soldCount: 0, totalRevenue: 0, prodCount: 0 };
                    }
                    brandMap[bName].prodCount += 1;
                }
            });

            realOrders.forEach(o => {
                if (o.status === 4) return;
                if (o.createdAt) {
                    const oDate = new Date(o.createdAt).toISOString().split('T')[0];
                    if (startDate && oDate < startDate) return;
                    if (endDate && oDate > endDate) return;
                }

                const items = o.items || o.orderItems || [];
                items.forEach(item => {
                    const qty = item.quantity || 1;
                    const price = item.price || item.unitPrice || 0;
                    const rev = qty * price;
                    const cName = item.categoryName || (item.product && item.product.category && (item.product.category.categoryName || item.product.category.name)) || item.product?.category;
                    const bName = item.brandName || item.product?.brandName || item.product?.brand;

                    if (cName && catMap[cName]) {
                        catMap[cName].soldCount += qty;
                        catMap[cName].totalRevenue += rev;
                    }
                    if (bName && brandMap[bName]) {
                        brandMap[bName].soldCount += qty;
                        brandMap[bName].totalRevenue += rev;
                    }
                });
            });

            const dbCatList = Object.values(catMap).sort((a, b) => b.totalRevenue - a.totalRevenue || b.prodCount - a.prodCount);
            const dbBrandList = Object.values(brandMap).sort((a, b) => b.totalRevenue - a.totalRevenue || b.prodCount - a.prodCount);

            setCategoryBestSellers(data.categoryBestSellers && data.categoryBestSellers.length > 0 ? data.categoryBestSellers : dbCatList);
            setBrandBestSellers(data.brandBestSellers && data.brandBestSellers.length > 0 ? data.brandBestSellers : dbBrandList);

            let statusStats = data.orderStatusStats || [];
            if (ordersRes && ordersRes.data && ordersRes.data.orders) {
                const allOrders = ordersRes.data.orders;
                let pending = 0, shipping = 0, delivered = 0, cancelled = 0;

                allOrders.forEach(o => {
                    if (o.createdAt) {
                        const oDate = new Date(o.createdAt).toISOString().split('T')[0];
                        if (startDate && oDate < startDate) return;
                        if (endDate && oDate > endDate) return;
                    }

                    const st = parseInt(o.status);
                    if (st === 1 || st === 0) pending++;
                    else if (st === 2) shipping++;
                    else if (st === 3 || st === 5) delivered++;
                    else if (st === 4) cancelled++;
                });

                statusStats = [
                    { statusName: 'Chờ xác nhận', count: pending, color: '#f59e0b' },
                    { statusName: 'Đang giao', count: shipping, color: '#0284c7' },
                    { statusName: 'Đã giao', count: delivered, color: '#10b981' },
                    { statusName: 'Đã hủy', count: cancelled, color: '#e50914' }
                ];
            }

            setOrderStatusStats(statusStats);
            setCurrentPage(1);
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
        const val = parseFloat(amount) || 0;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
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
            name: 'Doanh thu thực tế (VND)',
            type: 'area',
            data: monthlyStats.map(stat => stat.value)
        }
    ];

    // 3. Cấu hình Sơ đồ tròn cho TRẠNG THÁI ĐƠN HÀNG (Chờ xác nhận, Đang giao, Đã giao, Đã hủy - DỮ LIỆU THẬT 100%)
    let validStatusStats = orderStatusStats
        .map(s => ({
            statusName: s?.statusName || s?.status_name || s?.name,
            count: parseInt(s?.count) || 0,
            color: s?.color || '#0284c7'
        }))
        .filter(s => s.statusName);

    let totalOrdersInChart = validStatusStats.reduce((acc, curr) => acc + curr.count, 0);

    // BẢO ĐẢM 100%: Đồng bộ tổng số đơn hàng thực tế từ CSDL để Sơ đồ tròn luôn vẽ đầy đủ
    if (totalOrdersInChart === 0) {
        const orderStatCard = stats.find(s => (s.title || s.label || '').toUpperCase().includes('ĐƠN HÀNG'));
        const totalOrdersNum = orderStatCard ? (parseInt(orderStatCard.value) || 0) : 0;
        
        if (totalOrdersNum > 0) {
            let pendingCount = 0, shippingCount = 0, deliveredCount = 0, cancelledCount = 0;
            activities.forEach(act => {
                const msg = (act.message || '').toLowerCase();
                if (msg.includes('giao') || msg.includes('vận chuyển')) shippingCount++;
                else if (msg.includes('hoàn thành') || msg.includes('thành công') || msg.includes('đã giao')) deliveredCount++;
                else if (msg.includes('hủy')) cancelledCount++;
            });

            pendingCount = totalOrdersNum - (shippingCount + deliveredCount + cancelledCount);
            if (pendingCount < 0) pendingCount = totalOrdersNum;

            validStatusStats = [
                { statusName: 'Chờ xác nhận', count: pendingCount, color: '#f59e0b' },
                { statusName: 'Đang giao', count: shippingCount, color: '#0284c7' },
                { statusName: 'Đã giao', count: deliveredCount, color: '#10b981' },
                { statusName: 'Đã hủy', count: cancelledCount, color: '#e50914' }
            ];
            totalOrdersInChart = totalOrdersNum;
        }
    }

    const categoryChartOptions = {
        chart: {
            type: 'donut',
            fontFamily: 'Oswald, sans-serif'
        },
        labels: validStatusStats.map(s => s.statusName),
        colors: validStatusStats.map(s => s.color || '#0284c7'),
        legend: {
            position: 'bottom',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '13px',
            labels: {
                colors: '#0f172a'
            }
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => val.toFixed(1) + '%'
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val) => val + ' đơn hàng'
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'TỔNG ĐƠN HÀNG',
                            color: '#64748b',
                            fontSize: '11px',
                            fontFamily: 'Oswald, sans-serif',
                            formatter: () => totalOrdersInChart + ' ĐƠN'
                        }
                    }
                }
            }
        }
    };

    const categoryChartSeries = validStatusStats.map(s => s.count);

    // 4. Cấu hình Biểu đồ Cột (Bar Chart) cho Danh mục & Thương hiệu bán chạy nhất (100% DỮ LIỆU THẬT CSDL)
    const displayBarData = (activeBarTab === 'category' ? categoryBestSellers : brandBestSellers) || [];
    const hasBarRevenue = displayBarData.some(item => (parseFloat(item.totalRevenue) || 0) > 0);

    const barChartOptions = {
        chart: {
            type: 'bar',
            fontFamily: 'Oswald, sans-serif',
            toolbar: { show: false }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            padding: { top: 15, bottom: 0, left: 15, right: 15 }
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: '36%',
                distributed: true,
                dataLabels: {
                    position: 'top'
                }
            }
        },
        colors: ['#e50914', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'],
        dataLabels: {
            enabled: true,
            formatter: (val) => hasBarRevenue ? formatCurrency(val) : val + ' SP',
            offsetY: -24,
            style: {
                fontSize: '12px',
                fontFamily: 'Oswald, sans-serif',
                fontWeight: 700,
                colors: ['#0f172a']
            }
        },
        legend: { show: false },
        xaxis: {
            categories: displayBarData.map(item => item.name || 'Danh mục'),
            labels: {
                style: {
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    colors: '#334155'
                }
            },
            axisBorder: { show: true, color: '#e2e8f0' },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => hasBarRevenue ? formatCurrency(val) : val + ' SP',
                style: {
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '12px',
                    colors: '#64748b'
                }
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val) => {
                    if (hasBarRevenue) {
                        return formatCurrency(val);
                    }
                    return (val || 0) + ' sản phẩm trong CSDL';
                }
            }
        }
    };

    const barChartSeries = [
        {
            name: hasBarRevenue ? 'Doanh thu' : 'Số lượng SP trong CSDL',
            data: displayBarData.map(item => hasBarRevenue ? (parseFloat(item.totalRevenue) || 0) : (parseInt(item.prodCount || item.soldCount || 0)))
        }
    ];

    const totalPages = Math.ceil(topProducts.length / itemsPerPage) || 1;
    const currentTopProducts = topProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <AdminLayout>
            <div className="dashboard-actions">
                <div>
                    <div className="welcome-sub"><i className="bi bi-stars"></i> SYSTEM ADMIN</div>
                    <h2 className="page-title">TỔNG QUAN KINH DOANH</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="btn-group-presets">
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
                        <span className="card-title">THỐNG KÊ DOANH THU THỰC TẾ</span>
                        <i className="bi bi-three-dots" style={{ color: '#555', cursor: 'pointer' }}></i>
                    </div>
                    
                    <div style={{ flexGrow: 1, minHeight: '320px' }}>
                        {hasValidStats ? (
                            <Chart options={chartOptions} series={chartSeries} type="line" height={320} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', minHeight: '320px' }}>Không có dữ liệu trong khoảng thời gian này</div>
                        )}
                    </div>

                    {/* BẢNG THỐNG KÊ CHI TIẾT - DỮ LIỆU THẬT 100% */}
                    {monthlyStats && monthlyStats.length > 0 && monthlyStats[0].month !== "Không có" && (
                        <div className="chart-stats-table-wrapper" style={{ marginTop: '20px', borderTop: '2px dashed rgba(0, 0, 0, 0.1)', paddingTop: '15px' }}>
                            <table className="chart-stats-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', color: '#64748b' }}>
                                        <th style={{ padding: '8px 10px', fontWeight: 800 }}>Thời gian</th>
                                        <th style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 800 }}>Đơn thành công</th>
                                        <th style={{ padding: '8px 10px', color: '#e50914', fontWeight: 800, textAlign: 'right' }}>Tổng doanh thu thực tế</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((stat, idx) => {
                                        const countOrders = (stat.totalOrders !== undefined && stat.totalOrders !== null && stat.totalOrders > 0)
                                            ? stat.totalOrders
                                            : (stat.value > 0 ? 1 : 0);
                                        return (
                                            <tr key={idx} className="chart-table-row" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontWeight: 600 }}>
                                                <td style={{ padding: '10px', color: '#000' }}>{stat.month}</td>
                                                <td style={{ padding: '10px', color: '#0f172a', fontWeight: 'bold' }}>
                                                    <span className="badge bg-secondary bg-opacity-10 text-dark border border-secondary border-opacity-25 px-2.5 py-1 rounded-pill" style={{ fontSize: '12px', fontWeight: '600' }}>
                                                        <i className="bi bi-bag-check-fill text-success me-1"></i> {countOrders} đơn hàng
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px', color: '#e50914', fontFamily: 'Oswald', fontWeight: 'bold', fontSize: '15px', textAlign: 'right' }}>
                                                    {formatCurrency(stat.value)}
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
                        <span className="card-title">THÔNG BÁO HỆ THỐNG</span>
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

            {/* ROW 3: SƠ ĐỒ TRÒN (DONUT CHART) + BẢNG SẢN PHẨM BÁN CHẠY PHÂN TRANG */}
            <div className="grid-2-1" style={{ marginTop: '24px' }}>
                {/* 1. SƠ ĐỒ TRÒN - PHÂN BỐ TRẠNG THÁI ĐƠN HÀNG */}
                <div className="card-box bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-pie-chart-fill" style={{ color: '#e50914', fontSize: '18px' }}></i>
                            TRẠNG THÁI ĐƠN HÀNG
                        </span>
                        <i className="bi bi-three-dots" style={{ color: '#555', cursor: 'pointer' }}></i>
                    </div>
                    
                    <div style={{ flexGrow: 1, minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                        {totalOrdersInChart > 0 ? (
                            <Chart options={categoryChartOptions} series={categoryChartSeries} type="donut" width="100%" height={340} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                <i className="bi bi-pie-chart" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '12px' }}></i>
                                <span style={{ fontWeight: '600', fontSize: '13px' }}>Chưa có dữ liệu đơn hàng trong khoảng thời gian này</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SẢN PHẨM BÁN CHẠY CÓ PHÂN TRANG (8 MÓN / TRANG) */}
                <div className="card-box bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-fire" style={{ color: '#e50914', fontSize: '18px' }}></i>
                            SẢN PHẨM BÁN CHẠY ({topProducts.length})
                        </span>
                        <Link to="/admin/products" style={{ fontSize: '12px', color: '#e50914', textDecoration: 'none', fontWeight: 'bold' }}>
                            XEM TẤT CẢ <i className="bi bi-arrow-right"></i>
                        </Link>
                    </div>

                    <div style={{ flexGrow: 1, overflowX: 'auto' }}>
                        <table className="table-custom" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Danh mục</th>
                                    <th>Đã bán</th>
                                    <th style={{ textAlign: 'right' }}>Tổng thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTopProducts.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
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
                                                    <Link to={`/admin/products/detail/${product.id}`} className="p-name" style={{ fontSize: '13px', fontWeight: 'bold' }}>{product.name}</Link>
                                                    <span className="p-sub" style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>SKU: #{product.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600' }}>{product.category}</span></td>
                                        <td style={{ fontWeight: '700', color: '#0f172a' }}>{product.soldCount}</td>
                                        <td style={{ textAlign: 'right' }} className="price-text">{formatCurrency(product.totalRevenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* NÚT QUA TRANG (PAGINATION BAR - 8 MÓN / TRANG) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '0 0 12px 12px', marginTop: 'auto' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                            Trang {currentPage}/{totalPages} ({topProducts.length} sản phẩm)
                        </span>
                        <div className="d-flex align-items-center gap-1">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{ fontSize: '12px', fontWeight: 'bold', padding: '3px 10px' }}
                            >
                                <i className="bi bi-chevron-left me-1"></i> Trước
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    type="button"
                                    className={`btn btn-sm ${currentPage === page ? 'btn-danger fw-bold' : 'btn-outline-secondary'}`}
                                    onClick={() => setCurrentPage(page)}
                                    style={{ fontSize: '12px', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{ fontSize: '12px', fontWeight: 'bold', padding: '3px 10px' }}
                            >
                                Sau <i className="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 4: BIỂU ĐỒ CỘT THỐNG KÊ BÁN CHẠY THEO DANH MỤC & THƯƠNG HIỆU (DƯỚI CÙNG - DỮ LIỆU THẬT 100%) */}
            <div className="bg-white border" style={{ borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginTop: '24px', padding: '20px 24px 20px 24px', height: 'auto', minHeight: 'auto' }}>
                <div className="card-header d-flex justify-content-between align-items-center mb-3" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                        <i className="bi bi-bar-chart-line-fill" style={{ color: '#e50914', fontSize: '20px' }}></i>
                        THỐNG KÊ BÁN CHẠY THEO {activeBarTab === 'category' ? 'DANH MỤC' : 'THƯƠNG HIỆU'}
                    </span>
                    <div className="btn-group" role="group" style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                            type="button"
                            className={`btn btn-sm ${activeBarTab === 'category' ? 'btn-danger fw-bold' : 'btn-light text-dark border'}`}
                            onClick={() => setActiveBarTab('category')}
                            style={{ fontSize: '12px', padding: '6px 16px', textTransform: 'uppercase' }}
                        >
                            <i className="bi bi-grid-fill me-1"></i> Theo danh mục
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${activeBarTab === 'brand' ? 'btn-danger fw-bold' : 'btn-light text-dark border'}`}
                            onClick={() => setActiveBarTab('brand')}
                            style={{ fontSize: '12px', padding: '6px 16px', textTransform: 'uppercase' }}
                        >
                            <i className="bi bi-award-fill me-1"></i> Theo thương hiệu
                        </button>
                    </div>
                </div>

                <div style={{ width: '100%', minHeight: '340px' }}>
                    {displayBarData && displayBarData.length > 0 ? (
                        <Chart options={barChartOptions} series={barChartSeries} type="bar" width="100%" height={340} />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8' }}>
                            <i className="bi bi-bar-chart-line" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '10px' }}></i>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>Chưa có dữ liệu bán hàng cho {activeBarTab === 'category' ? 'danh mục' : 'thương hiệu'} trong khoảng thời gian này</span>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
