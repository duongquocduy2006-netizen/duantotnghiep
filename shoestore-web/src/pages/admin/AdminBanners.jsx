import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminBanners.css';

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchBanners = async () => {
        try {
            const response = await api.get('/api/banners');
            setBanners(response.data || []);
        } catch (error) {
            console.error('Lỗi lấy danh sách banner:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa chiến dịch này không?')) {
            try {
                await api.delete(`/api/banners/${id}`);
                fetchBanners();
            } catch (error) {
                alert('Lỗi khi xóa banner');
            }
        }
    };

    const filteredBanners = (Array.isArray(banners) ? banners : []).filter(b => {
        const matchesSearch = b.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && b.status) ||
            (statusFilter === 'inactive' && !b.status);
        return matchesSearch && matchesStatus;
    });

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-collection-play-fill me-2"></i> DISPLAY MANAGEMENT
                        </div>
                        <h1 className="header-title">QUẢN LÝ BANNERS</h1>
                    </div>
                    <Link to="/admin/banners/add" className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> THÊM MỚI BANNER
                    </Link>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm chiến dịch hoặc sự kiện..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="filter-select-pill"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">TẤT CẢ TRẠNG THÁI</option>
                        <option value="active">ĐANG HOẠT ĐỘNG</option>
                        <option value="inactive">TẠM ẨN</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-danger" role="status"></div>
                        </div>
                    ) : filteredBanners.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            Chưa có dữ liệu nào được tìm thấy.
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>ID</th>
                                    <th style={{ width: '150px' }}>PREVIEW</th>
                                    <th>TÊN CHIẾN DỊCH</th>
                                    <th>SỰ KIỆN / MÙA</th>
                                    <th>THỜI GIAN</th>
                                    <th>TRẠNG THÁI</th>
                                    <th style={{ textAlign: 'right' }}>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBanners.map((banner) => (
                                    <tr key={banner.id}>
                                        <td className="id-text">#{banner.id}</td>
                                        <td>
                                            <div className="table-img-box" style={{ height: '70px', width: '120px' }}>
                                                <img
                                                    src={banner.images && banner.images.length > 0
                                                        ? `http://localhost:8080/uploads/${banner.images[0].imageUrl}`
                                                        : 'https://via.placeholder.com/120x70'}
                                                    alt="Preview"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/120x70'; }}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="caption-link">{banner.name}</div>
                                        </td>
                                        <td>{banner.event || 'N/A'}</td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                Từ: {banner.startDate ? new Date(banner.startDate).toLocaleString('vi-VN') : 'N/A'}<br />
                                                Đến: {banner.endDate ? new Date(banner.endDate).toLocaleString('vi-VN') : 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`status-badge-modern ${!banner.status ? 'inactive' : ''}`}>
                                                <div className="status-dot"></div>
                                                {banner.status ? 'HOẠT ĐỘNG' : 'TẠM ẨN'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link to={`/admin/banners/edit/${banner.id}`} className="btn-icon-action" title="Chỉnh sửa">
                                                <i className="bi bi-pencil-square"></i>
                                            </Link>
                                            <button onClick={() => handleDelete(banner.id)} className="btn-icon-action" title="Xóa">
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <style>{`
    .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
    .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
    
    .btn-cyan-skew { 
        background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
        transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; justify-content: center;
    }
    .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

    .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #fff; padding: 12px 16px; border: 1px solid #e8eaed; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .search-box { position: relative; flex: 1; min-width: 220px; }
    .search-box i { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #9aa0a6; font-size: 14px; pointer-events: none; }
    .search-input { width: 100%; background: #fff !important; border: 1.5px solid #dadce0; padding: 9px 14px 9px 38px; color: #3c4043 !important; outline: none; height: 40px; font-weight: 400; border-radius: 24px; font-size: 14px; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .search-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
    .search-input::placeholder { color: #9aa0a6; }

    .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; overflow: hidden; border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; min-width: 800px; }
    th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
    td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
    tr:hover td { background: #f8fafc; }
    
    .item-id { font-family: 'Oswald'; color: #000; font-weight: 800; font-size: 14px; }
    
    .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; margin-left: 5px; }
    .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
    .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }
    .icon-edit:hover { background: #facc15; color: #000; box-shadow: 0 4px 12px rgba(250,204,21,0.2); }
`}</style>
            </div>
        </AdminLayout>
    );
};

export default AdminBanners;
