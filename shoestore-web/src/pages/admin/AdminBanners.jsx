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
            </div>
        </AdminLayout>
    );
};

export default AdminBanners;
