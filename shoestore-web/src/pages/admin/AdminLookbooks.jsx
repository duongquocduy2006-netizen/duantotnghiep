import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from "react-router-dom";
import api from "../../services/api";
import './AdminBanners.css';

const AdminLookbooks = () => {
    const [lookbooks, setLookbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const fetchLookbooks = async () => {
        try {
            const response = await api.get('/api/lookbooks/all');
            setLookbooks(response.data || []);
        } catch (err) {
            console.error("Lỗi tải lookbooks:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookbooks();
    }, []);

    const filteredLookbooks = lookbooks.filter(lb => {
        const matchSearch = (lb.caption || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = selectedStatus === "all" || (selectedStatus === "true" && lb.status) || (selectedStatus === "false" && !lb.status);
        return matchSearch && matchStatus;
    });

    const handleDelete = async (id, caption) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa lookbook "${caption}" này không?`)) {
            try {
                await api.delete(`/api/lookbooks/${id}`);
                setLookbooks(lookbooks.filter(lb => lb.id !== id));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Xóa Lookbook thành công!" }));
            } catch (err) {
                console.error("Lỗi xóa lookbook:", err);
            }
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return 'https://via.placeholder.com/100x120';
        if (imageUrl.startsWith('http')) return imageUrl;
        return `http://localhost:8080${imageUrl}`;
    };

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-image-fill me-2"></i> CONTENT MANAGEMENT
                        </div>
                        <h1 className="header-title">QUẢN LÝ LOOKBOOKS</h1>
                    </div>
                    <Link to="/admin/lookbooks/add" className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> THÊM MỚI LOOKBOOK
                    </Link>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo hashtag hoặc mô tả..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="filter-select-pill"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">TẤT CẢ TRẠNG THÁI</option>
                        <option value="true">ĐANG CÔNG KHAI</option>
                        <option value="false">ĐANG ẨN</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-danger" role="status"></div>
                        </div>
                    ) : filteredLookbooks.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted">Không tìm thấy dữ liệu.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '100px' }}>ID</th>
                                    <th style={{ width: '180px' }}>HÌNH ẢNH</th>
                                    <th>HASHTAG / CAPTION</th>
                                    <th>TRẠNG THÁI</th>
                                    <th style={{ textAlign: 'right' }}>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLookbooks.map((lb) => (
                                    <tr key={lb.id}>
                                        <td className="id-text">#{lb.id}</td>
                                        <td>
                                            <div className="table-img-box">
                                                <img src={getImageUrl(lb.imageUrl)} alt={lb.caption} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="caption-link">
                                                {lb.caption}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`status-badge-modern ${!lb.status ? 'inactive' : ''}`}>
                                                <div className="status-dot"></div>
                                                {lb.status ? 'CÔNG KHAI' : 'ĐANG ẨN'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link to={`/admin/lookbooks/edit/${lb.id}`} className="btn-icon-action" title="Sửa">
                                                <i className="bi bi-pencil-square"></i>
                                            </Link>
                                            <button onClick={() => handleDelete(lb.id, lb.caption)} className="btn-icon-action" title="Xóa">
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

export default AdminLookbooks;
