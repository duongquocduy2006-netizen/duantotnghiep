import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import './AdminBanners.css';
import api from '../../services/api';

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/banners');
            setBanners(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching banners:', error);
            setBanners([]);
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

    const filteredBanners = (Array.isArray(banners) ? banners : []).filter(b => b.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                <div className="admin-page-header" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div className="header-left">
                        <span className="sub-title-neon">🖥️ QUẢN LÝ GIAO DIỆN</span>
                        <h1 className="cinematic-title" style={{ margin: 0 }}>BANNER</h1>
                    </div>
                    <Link to="/admin/banners/add" className="btn-cyan-skew">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM GIAO DIỆN
                    </Link>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Lọc nhanh (gõ chữ để tìm)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-card">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>ID</th>
                                <th>TÊN CHIẾN DỊCH</th>
                                <th>SỰ KIỆN / MÙA</th>
                                <th>THỜI GIAN</th>
                                <th>SỐ LƯỢNG ẢNH</th>
                                <th>TRẠNG THÁI</th>
                                <th style={{ textAlign: 'right' }}>HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</td></tr>
                            ) : filteredBanners.length > 0 ? (
                                filteredBanners.map(banner => (
                                    <tr key={banner.id}>
                                        <td className="item-id">#BNN-{banner.id}</td>
                                        <td style={{ fontWeight: 600, color: '#000' }}>{banner.name}</td>
                                        <td>{banner.seasonType || 'Mặc định'}</td>
                                        <td>
                                            <div style={{ fontSize: '11px', color: '#555' }}>
                                                Từ: {banner.startDate ? new Date(banner.startDate).toLocaleString('vi-VN') : 'N/A'}<br />
                                                Đến: {banner.endDate ? new Date(banner.endDate).toLocaleString('vi-VN') : 'N/A'}
                                            </div>
                                        </td>
                                        <td>{banner.images?.length || 0} ảnh</td>
                                        <td>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: banner.status ? '#22c55e' : '#e50914'
                                            }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: banner.status ? '#22c55e' : '#e50914',
                                                    boxShadow: banner.status ? '0 0 10px #22c55e' : '0 0 10px #e50914'
                                                }}></span>
                                                {banner.status ? 'HOẠT ĐỘNG' : 'TẠM ẨN'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link to={`/admin/banners/edit/${banner.id}`} className="action-btn-icon icon-edit" title="Sửa"><i className="bi bi-pencil-square"></i></Link>
                                            <button className="action-btn-icon icon-delete" title="Xóa" onClick={() => handleDelete(banner.id)}><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: '#555', padding: '40px' }}>Không tìm thấy banner nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <style>{`
    .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
    .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
    
    .btn-cyan-skew { 
        background: #fff; color: #000; border: 4px solid #000; box-shadow: 6px 6px 0 #000; padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
        transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; justify-content: center;
    }
    .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 6px 6px 0 var(--accent-red); transform: translateY(-3px); }

    .toolbar { background: #fff; border: 4px solid #000; box-shadow: 6px 6px 0 #000; padding: 25px; margin-bottom: 30px; }
    .search-box { position: relative; width: 100%; display: flex; align-items: center; background: #fff; border: 3px solid #000; box-shadow: 4px 4px 0 #000; }
    .search-box i { position: absolute; left: 20px; color: #000; font-size: 18px; font-weight: bold; }
    .search-input { width: 100%; background: transparent; border: none; padding: 15px 15px 15px 55px; color: #000; outline: none; font-size: 14px; font-weight: 600; }
    .search-input:focus { background: #fdfdfd; }

    .table-card { background: #fff; border: 4px solid #000; box-shadow: 6px 6px 0 #000; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 800px; }
    th { background: #f4f4f4; color: #000; font-size: 13px; text-transform: uppercase; padding: 15px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 4px solid #000; font-weight: 800; }
    td { padding: 15px 20px; border-bottom: 2px solid #000; font-size: 14px; color: #000; font-weight: 600; vertical-align: middle; }
    tr:hover td { background: #f9f9f9; }
    
    .item-id { font-family: 'Oswald'; color: #000; font-weight: 800; font-size: 14px; }
    
    .action-btn-icon { background: #fff; border: 3px solid #000; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; margin-left: 5px; }
    .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 var(--accent-red); background: #000; color: #fff; }
    .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 2px 2px 0 #000; }
    .icon-edit:hover { background: #facc15; color: #000; box-shadow: 2px 2px 0 #000; }
`}</style>
            </div>
        </AdminLayout>
    );
};

export default AdminBanners;
