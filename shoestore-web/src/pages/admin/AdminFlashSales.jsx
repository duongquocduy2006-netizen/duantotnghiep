import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminFlashSales.css';

const AdminFlashSales = () => {
    const [flashSales, setFlashSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFlashSales = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/flash-sales');
            setFlashSales(response.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách Flash Sale:", err);
            setError("Không thể tải danh sách các chiến dịch Flash Sale.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlashSales();
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Xếp có chắc chắn muốn xóa chiến dịch "${name}" này không?`)) {
            try {
                const response = await api.delete(`/api/flash-sales/${id}`);
                if (response.data && response.data.success) {
                    alert("Xóa chiến dịch Flash Sale thành công!");
                    setFlashSales(flashSales.filter(fs => fs.id !== id));
                } else {
                    alert(response.data.error || "Có lỗi xảy ra khi xóa chiến dịch.");
                }
            } catch (err) {
                console.error("Lỗi xóa chiến dịch:", err);
                alert("Không thể kết nối đến server để xóa chiến dịch.");
            }
        }
    };

    const isLive = (start, end) => {
        const now = new Date();
        return now >= new Date(start) && now <= new Date(end);
    };

    const isUpcoming = (start) => {
        return new Date() < new Date(start);
    };

    const isFinished = (end) => {
        return new Date() > new Date(end);
    };

    return (
        <AdminLayout>
            <div className="admin-flash-sales-page">
                <div className="admin-page-header" style={{ marginBottom: '30px' }}>
                    <div className="header-left">
                        <span className="sub-title-neon"><i className="bi bi-lightning-fill"></i> KHUYẾN MÃI</span>
                        <h1 className="cinematic-title">QUẢN LÝ FLASH SALE</h1>
                    </div>
                    <div className="header-right-actions">
                        <Link to="/admin/flashsales/create" className="btn-red-skew">
                            <i className="bi bi-plus-lg"></i> &nbsp;TẠO FLASH SALE
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                        <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: '#000' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI DANH SÁCH FLASH SALE...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                        <p style={{ marginTop: '10px' }}>{error}</p>
                    </div>
                ) : (
                    <div className="table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th width="30%">Tên chiến dịch</th>
                                    <th>Thời gian bắt đầu</th>
                                    <th>Thời gian kết thúc</th>
                                    <th>Sản phẩm</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flashSales.length > 0 ? (
                                    flashSales.map(fs => (
                                        <tr key={fs.id}>
                                            <td>
                                                <span className="font-oswald" style={{ fontSize: '16px', color: '#000' }}>{fs.name}</span>
                                                <br />
                                                <small style={{ color: '#555' }}>ID: #{fs.id}</small>
                                            </td>
                                            <td>{new Date(fs.startDate).toLocaleString('vi-VN')}</td>
                                            <td>{new Date(fs.endDate).toLocaleString('vi-VN')}</td>
                                            <td>{fs.productCount}</td>
                                            <td>
                                                <span className={`status-badge ${fs.status === 1 ? 'status-active' : 'status-inactive'}`}>
                                                    {fs.status === 1 ? 'Hoạt động' : 'Tạm ngưng'}
                                                </span>
                                                <br />
                                                {fs.status === 1 && isLive(fs.startDate, fs.endDate) && <small style={{ color: '#00f2ff' }}>● Đang diễn ra</small>}
                                                {fs.status === 1 && isUpcoming(fs.startDate) && <small style={{ color: '#fbbf24' }}>● Sắp diễn ra</small>}
                                                {fs.status === 1 && isFinished(fs.endDate) && <small style={{ color: '#f87171' }}>● Đã kết thúc</small>}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link to={`/admin/flashsales/edit/${fs.id}`} className="action-btn-icon icon-edit" title="Chỉnh sửa"><i className="bi bi-pencil-square"></i></Link>
                                                <button className="action-btn-icon icon-delete" title="Xóa" onClick={() => handleDelete(fs.id, fs.name)}><i className="bi bi-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#555' }}>
                                            <i className="bi bi-lightning" style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}></i>
                                            Chưa có Flash Sale nào được tạo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .header-right-actions { display: flex; align-items: center; }
                .btn-red-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; justify-content: center;
                }
                .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                /* Compact Modern Table */
                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; overflow-x: auto; border-radius: 14px; }
                table { width: 100%; border-collapse: collapse; min-width: 700px; }
                th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
                td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
                
                .status-badge { font-family: 'Oswald'; font-weight: 800; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; padding: 4px 10px; font-size: 11px; text-transform: uppercase; display: inline-block; }
                .status-active { background: #4ade80; color: #000; }
                .status-inactive { background: var(--accent-red); color: #fff; }

                /* Action Icon Buttons */
                .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; margin-left: 5px; }
                .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
                .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }
                .icon-edit:hover { background: #facc15; color: #000; box-shadow: 0 4px 12px rgba(250,204,21,0.2); }
        `}</style>
            </div>
        </AdminLayout>
    );
};

export default AdminFlashSales;
