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

    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        lookbookId: null,
        lookbookCaption: "",
        message: ""
    });

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

    const triggerDeleteConfirm = (id, caption) => {
        setConfirmModal({
            isOpen: true,
            lookbookId: id,
            lookbookCaption: caption,
            message: `Bạn có chắc chắn muốn xóa lookbook "${caption}" này không?`
        });
    };

    const cancelDelete = () => {
        setConfirmModal({
            isOpen: false,
            lookbookId: null,
            lookbookCaption: "",
            message: ""
        });
    };

    const submitDelete = async () => {
        const { lookbookId } = confirmModal;
        if (!lookbookId) return;

        try {
            await api.delete(`/api/lookbooks/${lookbookId}`);
            setLookbooks(lookbooks.filter(lb => lb.id !== lookbookId));
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Xóa Lookbook thành công!" }));
        } catch (err) {
            console.error("Lỗi xóa lookbook:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể xóa lookbook này." }));
        } finally {
            cancelDelete();
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
                    <Link to="/admin/lookbooks/add" className="btn-cyan-skew">
                        <i className="bi bi-plus-lg"></i> THÊM MỚI LOOKBOOK
                    </Link>
                </div>
 
                {/* TOOLBAR */}
                <div className="toolbar">
                    <div className="admin-search-box-wrap">
                        <i className="bi bi-search admin-search-icon"></i>
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Tìm kiếm theo hashtag hoặc mô tả..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="filter-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">TẤT CẢ TRẠNG THÁI</option>
                        <option value="true">ĐANG CÔNG KHAI</option>
                        <option value="false">ĐANG ẨN</option>
                    </select>

                </div>

                {/* TABLE */}
                <div className="table-card" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-danger" role="status"></div>
                        </div>
                    ) : filteredLookbooks.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted">Không tìm thấy dữ liệu.</p>
                        </div>
                    ) : (
                        <table>
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
                                            <Link to={`/admin/lookbooks/edit/${lb.id}`} className="action-btn-icon" title="Sửa">
                                                <i className="bi bi-pencil-square"></i>
                                            </Link>
                                            <button onClick={() => triggerDeleteConfirm(lb.id, lb.caption)} className="action-btn-icon icon-delete" title="Xóa">
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

            {/* CUSTOM CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box animate__animated animate__zoomIn">
                        <div className="admin-confirm-icon">
                            <i className="bi bi-exclamation-circle"></i>
                        </div>
                        <h4 className="admin-confirm-title">Xác nhận xóa</h4>
                        <p className="admin-confirm-message">{confirmModal.message}</p>
                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-cancel" onClick={cancelDelete}>Hủy bỏ</button>
                            <button className="admin-btn-confirm-ok" onClick={submitDelete}>Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .btn-cyan-skew { 
                    background: #fff; color: #000; border: 1px solid #dadce0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; justify-content: center;
                }
                .btn-cyan-skew:hover { background: #000; color: #fff; border-color: #000; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #fff; padding: 12px 16px; border: 1px solid #e8eaed; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); max-width: 100%; box-sizing: border-box; }
                .admin-search-box-wrap { position: relative; flex: 1; max-width: 100%; min-width: 220px; box-sizing: border-box; background: transparent !important; border: none !important; padding: 0 !important; display: block !important; }
                .admin-search-input { width: 100%; background: #fff !important; border: 1.5px solid #dadce0; padding: 10px 16px 10px 42px !important; color: #3c4043 !important; outline: none; height: 44px; font-weight: 500; border-radius: 12px !important; font-size: 14px; transition: all 0.2s; font-family: 'Inter', sans-serif; box-sizing: border-box; }
                .admin-search-input:focus { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1) !important; }
                .admin-search-input::placeholder { color: #9aa0a6; }
                .admin-search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888 !important; font-size: 16px; pointer-events: none; z-index: 5; }
                .filter-select { background: #fff !important; color: #3c4043 !important; border: 1.5px solid #dadce0 !important; padding: 8px 14px; outline: none; cursor: pointer; height: 40px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.2s; }
                .filter-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 3px rgba(26,115,232,0.1) !important; }

                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; border-radius: 14px; overflow-x: auto; width: 100%; box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; min-width: 800px; }
                th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
                td { padding: 14px 16px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
                tr:hover td { background: #f8fafc; }
                
                .item-id { font-family: 'Oswald'; color: #000; font-weight: 800; font-size: 14px; }
                
                .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; margin-left: 5px; }
                .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
                .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }

                /* Admin Confirm Modal (Sleek Premium Theme) */
                .admin-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .admin-confirm-box {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 36px 32px;
                    width: 90%;
                    max-width: 420px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    border-bottom: 4px solid #e50914;
                }
                .admin-confirm-icon {
                    width: 72px;
                    height: 72px;
                    background: #fef2f2;
                    color: #e50914;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    margin: 0 auto 20px;
                    animation: iconPulse 2s infinite;
                }
                .admin-confirm-title {
                    font-family: 'Inter', sans-serif;
                    font-weight: 800;
                    font-size: 20px;
                    color: #0f172a;
                    margin-bottom: 12px;
                }
                .admin-confirm-message {
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 28px;
                    font-weight: 500;
                }
                .admin-confirm-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .admin-btn-confirm-cancel {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex: 1;
                }
                .admin-btn-confirm-cancel:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                .admin-btn-confirm-ok {
                    background: #e50914;
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex: 1;
                    box-shadow: 0 4px 6px -1px rgba(229, 9, 20, 0.2);
                }
                .admin-btn-confirm-ok:hover {
                    background: #b8070f;
                    box-shadow: 0 10px 15px -3px rgba(229, 9, 20, 0.3);
                    transform: translateY(-1px);
                }
                @keyframes iconPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </AdminLayout>
    );
};

export default AdminLookbooks;
