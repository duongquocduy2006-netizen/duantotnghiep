import React from 'react';
import ShipperLayout from '../../components/ShipperLayout';
import ReactApexChart from 'react-apexcharts';

const ShipperEarnings = () => {
    const chartOptions = {
        chart: {
            type: 'area',
            height: 280,
            toolbar: { show: false },
            zoom: { enabled: false },
            foreColor: '#94a3b8',
            fontFamily: 'Poppins, sans-serif'
        },
        dataLabels: { enabled: false },
        stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#ff7e00']
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [20, 100, 100],
                colorStops: [
                    { offset: 0, color: "#ff7e00", opacity: 0.4 },
                    { offset: 100, color: "#ff7e00", opacity: 0 }
                ]
            }
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            strokeDashArray: 4,
            yaxis: { lines: { show: true } }
        },
        xaxis: {
            categories: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: function (value) {
                    return (value / 1000).toFixed(0) + "K";
                }
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (value) {
                    return value.toLocaleString('vi-VN') + " ₫";
                }
            }
        },
        markers: {
            size: 5,
            colors: ["#ff7e00"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: { size: 7 }
        }
    };

    const chartSeries = [{
        name: 'Thu nhập (₫)',
        data: [650000, 480000, 890000, 320000, 750000, 950000, 210000]
    }];

    return (
        <ShipperLayout>
            <div className="page-header">
                <div>
                    <h2 className="page-title">TỔNG QUAN <span style={{ color: 'var(--accent-orange)' }}>THU NHẬP</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}> Theo dõi doanh thu từ các chuyến giao hàng của bạn.</p>
                </div>
            </div>

            <div className="earnings-grid">
                <div className="earn-card">
                    <span className="earn-label">Hôm nay</span>
                    <div className="earn-value">850,000₫</div>
                    <div className="earn-sub" style={{ color: 'var(--accent-green)' }}><i className="bi bi-arrow-up"></i> +15% so với hôm qua</div>
                </div>
                <div className="earn-card highlight">
                    <span className="earn-label">Tháng này (Dự kiến)</span>
                    <div className="earn-value" style={{ color: 'var(--accent-green)' }}>12,450,000₫</div>
                    <div className="earn-sub" style={{ color: '#fff' }}><i className="bi bi-star-fill"></i> Đang ở mức "Đối tác Vàng"</div>
                </div>
                <div className="earn-card">
                    <span className="earn-label">Số dư hiện tại</span>
                    <div className="earn-value">4,200,000₫</div>
                    <button style={{ marginTop: '15px', background: '#fff', color: '#000', border: 'none', padding: '6px 15px', borderRadius: '6px', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase' }}>Rút tiền</button>
                </div>
            </div>

            <div className="chart-box">
                <div className="card-header">
                    <span className="card-title">HIỆU SUẤT 7 NGÀY QUA</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đơn vị: 100K ₫</span>
                </div>
                <div id="earningsChart" style={{ minHeight: '250px' }}>
                    <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={280} />
                </div>
            </div>

            <div className="chart-box">
                <div className="card-header">
                    <span className="card-title">CHI TIẾT THU NHẬP GẦN ĐÂY</span>
                    <a href="#" style={{ color: 'var(--accent-orange)', fontSize: '11px', textDecoration: 'none', fontWeight: '700' }}>TẢI SAO KÊ CSV</a>
                </div>
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Số đơn</th>
                            <th>Quãng đường</th>
                            <th>Típ</th>
                            <th>Phí đơn hàng</th>
                            <th>Tổng thu</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>30/03/2026</td>
                            <td>12</td>
                            <td>45 km</td>
                            <td style={{ color: 'var(--accent-green)' }}>+55K</td>
                            <td>355K</td>
                            <td style={{ fontWeight: '700', color: '#fff' }}>410K</td>
                        </tr>
                        <tr>
                            <td>29/03/2026</td>
                            <td>8</td>
                            <td>32 km</td>
                            <td style={{ color: 'var(--accent-green)' }}>+20K</td>
                            <td>220K</td>
                            <td style={{ fontWeight: '700', color: '#fff' }}>240K</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </ShipperLayout>
    );
};

export default ShipperEarnings;
