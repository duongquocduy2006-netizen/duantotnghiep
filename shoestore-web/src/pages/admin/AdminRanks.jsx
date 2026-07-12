import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminBanners.css';

const AdminRanks = () => {
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchRanks = async () => {
        try {
            const res = await api.get('/api/vouchers/admin/all');
            if (res.data && res.data.success) {
                const apiRanks = res.data.ranks || [];
                const apiVouchers = res.data.vouchers || [];

                const formattedRanks = apiRanks.map(r => {
                    const applicableVouchers = apiVouchers.filter(v => v.ranks && v.ranks.some(vr => vr.id === r.id));
                    const voucherCodes = applicableVouchers.map(v => v.code).join(', ');

                    return {
                        id: r.id,
                        name: r.rankName,
                        points: r.minPoints,
                        color: r.colorCode || '#C0C0C0',
                        discount: r.discountPercent !== null && r.discountPercent !== undefined ? r.discountPercent : 0,
                        vouchers: voucherCodes ? `🎟️ ${voucherCodes}` : 'Chưa có ưu đãi',
                        freeShipping: !!r.freeShipping
                    };
                });
                setRanks(formattedRanks);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách hạng thành viên:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        if (id === 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể xóa hạng mặc định!" }));
            return;
        }
        setDeleteConfirm({ id, name });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        const { id } = deleteConfirm;
        try {
            const res = await api.delete(`/api/membership/ranks/${id}`);
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || "Xóa hạng thành công!" }));
                fetchRanks();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi: " + (res.data.message || "Không thể xóa.") }));
            }
        } catch (err) {
            console.error('Lỗi khi xóa hạng:', err);
            const errMsg = err.response?.data?.message || err.message || "Có lỗi xảy ra khi xóa hạng.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Có lỗi xảy ra khi xóa hạng: " + errMsg }));
        } finally {
            setDeleteConfirm(null);
        }
    };

    useEffect(() => {
        fetchRanks();
    }, []);

    const filteredRanks = ranks.filter(r => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-star-fill me-2"></i> MEMBERSHIP
                        </div>
                        <h1 className="header-title">QUẢN LÝ HẠNG THÀNH VIÊN</h1>
                    </div>
                    <Link to="/admin/ranks/add" className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM HẠNG MỚI
                    </Link>
                </div>
<<<<<<< HEAD

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm hạng thành viên..."
=======
 
                <div className="toolbar">
                    <div className="admin-search-box-wrap">
                        <i className="bi bi-search admin-search-icon"></i>
                        <input 
                            type="text" 
                            className="admin-search-input" 
                            placeholder="Tìm kiếm hạng thành viên..." 
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>ID</th>
                                <th>TÊN HẠNG</th>
                                <th>ĐIỂM TỐI THIỂU</th>
                                <th>CHIẾT KHẤU GIẢM</th>
                                <th>FREE SHIP</th>
                                <th>ƯU ĐÃI VOUCHER</th>
                                <th style={{ textAlign: 'right' }}>HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', fontWeight: '800' }}>
                                        ĐANG TẢI DỮ LIỆU...
                                    </td>
                                </tr>
                            ) : filteredRanks.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999', fontWeight: '700' }}>
                                        Chưa có hạng thành viên nào phù hợp.
                                    </td>
                                </tr>
                            ) : filteredRanks.map(r => (
                                <tr key={r.id}>
                                    <td className="item-id">#RNK-{r.id}</td>
                                    <td>
                                        <span className="rank-badge-item" style={{
                                            padding: '6px 16px',
                                            border: `1.5px solid #000`,
                                            borderRadius: '0px',
                                            color: '#fff',
                                            background: r.color,
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            textTransform: 'uppercase'
                                        }}>
                                            <i className="bi bi-star-fill" style={{ fontSize: '10px' }}></i> {r.name}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 800, color: '#111' }}>{r.points} điểm</td>
                                    <td style={{ fontWeight: 800, color: 'var(--accent-red)' }}>-{r.discount}%</td>
                                    <td>
                                        {r.freeShipping ? (
                                            <span className="badge-free-ship-modern">
                                                <i className="bi bi-truck"></i> FREE SHIP
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>KHÔNG</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{
                                            fontSize: '13px',
                                            color: r.vouchers.includes('🎟️') ? 'var(--accent-red)' : '#666',
                                            fontWeight: r.vouchers.includes('🎟️') ? '800' : '600'
                                        }}>
                                            {r.vouchers}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
<<<<<<< HEAD
                                        <Link to={`/admin/ranks/edit/${r.id}`} className="btn-icon-action" title="Sửa"><i className="bi bi-pencil-square"></i></Link>
                                        <button className="btn-icon-action" style={{ color: 'var(--accent-red)' }} title="Xóa" onClick={() => handleDelete(r.id, r.name)}><i className="bi bi-trash"></i></button>
=======
                                        <Link to={`/admin/ranks/edit/${r.id}`} className="action-btn" title="Sửa"><i className="bi bi-pencil-square"></i></Link>
                                        <button className="action-btn delete-btn" title="Xóa" onClick={() => handleDelete(r.id, r.name)}><i className="bi bi-trash"></i></button>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                                    </td>
                                </tr >
                            ))}
<<<<<<< HEAD
                        </tbody >
                    </table >
                </div >
=======
                        </tbody>
                    </table>
                </div>
                <style>{`
                .sub-title-neon { display: block; color: #e50914; font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; text-transform: uppercase; }
                .cinematic-title { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 800; color: #111; margin: 0; line-height: 1.2; letter-spacing: -0.5px; }
                
                .btn-red-flat { 
                    background: #e50914; color: #fff; border: none; padding: 12px 24px; 
                    font-family: 'Inter', sans-serif; font-weight: 700; text-transform: uppercase; 
                    transition: all 0.3s ease; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                    border-radius: 10px; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
                }
                .btn-red-flat:hover { background: #b8070f; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(229, 9, 20, 0.35); color: #fff; }
 
                .toolbar { background: #ffffff; border: 1px solid #eaeaea; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); max-width: 100%; box-sizing: border-box; }
                .admin-search-box-wrap { position: relative; width: 100%; display: flex; align-items: center; background: #fff !important; border: 1px solid #dcdcdc !important; border-radius: 8px !important; transition: all 0.3s ease; box-sizing: border-box; padding: 0 !important; }
                .admin-search-box-wrap:focus-within { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1) !important; }
                .admin-search-icon { position: absolute; left: 16px; color: #888 !important; font-size: 16px; z-index: 5; }
                .admin-search-input { 
                    width: 100%; background: transparent !important; border: none !important; padding: 12px 12px 12px 45px !important; 
                    color: #222 !important; outline: none; font-size: 14px; font-family: 'Inter', sans-serif; box-sizing: border-box;
                }
 
                .table-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; overflow-x: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.02); width: 100%; box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; min-width: 700px; }
                th { background: #f8f9fa; color: #444; font-size: 13px; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #eaeaea; font-weight: 700; }
                td { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #444; vertical-align: middle; }
                tr:last-child td { border-bottom: none; }
                tr:hover td { background: #fcfcfc; }
                
                .item-id { font-family: 'Inter', sans-serif; color: #888; font-weight: 600; font-size: 13px; }
                .action-btn { 
                    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; 
                    background: #f8f9fa; border: 1px solid #e2e8f0; color: #4a5568; border-radius: 6px; transition: all 0.2s ease; text-decoration: none; cursor: pointer; margin-left: 6px;
                }
                .action-btn:hover { background: #e2e8f0; color: #1a202c; transform: translateY(-1px); }
                .action-btn.delete-btn { color: #e50914; background: rgba(229, 9, 20, 0.05); border-color: rgba(229, 9, 20, 0.1); }
                .action-btn.delete-btn:hover { background: #e50914; color: #fff; }
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019

                <style>{`
                .item-id { font-weight: 800; color: #555; }
                .badge-free-ship-modern {
                    background: #ebfbee;
                    color: #2b8a3e;
                    border: 1px solid #b2f2bb;
                    padding: 4px 10px;
                    border-radius: 0px;
                    font-size: 11px;
                    font-weight: 800;
                    display: inline-flex;
                    alignItems: center;
                    gap: 4px;
<<<<<<< HEAD
=======
                    font-family: 'Inter', sans-serif;
                }
                .custom-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .custom-modal-box {
                    background: #fff;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 450px;
                    padding: 24px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .custom-modal-title {
                    font-family: 'Inter', sans-serif;
                    font-size: 20px;
                    font-weight: 800;
                    color: #000;
                    margin-top: 0;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .custom-modal-body {
                    font-size: 14px;
                    color: #4b5563;
                    margin-bottom: 24px;
                    line-height: 1.5;
                    font-family: 'Inter', sans-serif;
                }
                .custom-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .custom-modal-btn {
                    padding: 10px 20px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 13px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: 0.2s;
                    outline: none;
                }
                .custom-modal-btn-cancel {
                    background: transparent;
                    border: 1px solid #d1d5db;
                    color: #374151;
                }
                .custom-modal-btn-cancel:hover {
                    background: #f3f4f6;
                }
                .custom-modal-btn-confirm {
                    background: #e50914;
                    border: 1px solid #e50914;
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
                }
                .custom-modal-btn-confirm:hover {
                    background: #b8070f;
                    border-color: #b8070f;
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                }


                .modal-overlay {
                position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
                }
            .modal-box {
                background: #fff;
            border-radius: 0px;
            width: 90%;
            max-width: 480px;
            padding: 35px;
            box-shadow: 10px 10px 0px rgba(0,0,0,1);
            border: 1px solid rgba(0,0,0,1);
            animation: slideUp 0.25s ease-out;
                }
            .modal-title {
                font - family: 'Oswald', sans-serif;
            font-size: 22px;
            font-weight: 800;
            color: #000;
            margin-top: 0;
            margin-bottom: 12px;
            text-transform: uppercase;
            border-bottom: 1px solid #ffe3e3;
            padding-bottom: 14px;
                }
            .modal-body {
                font - size: 14px;
            color: #334155;
            margin-bottom: 24px;
            line-height: 1.6;
            font-weight: 500;
                }
            .modal-actions {
                display: flex;
            justify-content: flex-end;
            gap: 12px;
                }
            .btn-cancel {
                padding: 10px 20px;
            font-family: 'Oswald', sans-serif;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 13px;
            border-radius: 0px;
            cursor: pointer;
            transition: 0.2s;
            background: transparent;
            border: 1px solid #000;
            color: #000;
                }
            .btn-cancel:hover {
                background: #000;
            color: #fff;
                }
            .btn-neon {
                padding: 10px 20px;
            font-family: 'Oswald', sans-serif;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 13px;
            border-radius: 0px;
            cursor: pointer;
            transition: 0.2s;
            background: var(--accent-red);
            border: 1px solid #000;
            color: #fff;
                }
            .btn-neon:hover {
                filter: brightness(0.9);
                }
            @keyframes slideUp {from {transform: translateY(20px); opacity: 0; } to {transform: translateY(0); opacity: 1; } }
                `}</style>
<<<<<<< HEAD
            </div >

            {deleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h4 className="modal-title"><i className="bi bi-exclamation-triangle"></i> Xác Nhận Xóa Hạng</h4>
                        <div className="modal-body">
                            Bạn có chắc chắn muốn xóa hạng thành viên <strong>"{deleteConfirm.name}"</strong>?
                            Tất cả tài khoản thuộc hạng này sẽ được chuyển về hạng Đồng mặc định.
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                                HỦY BỎ
                            </button>
                            <button className="btn-neon" onClick={handleConfirmDelete}>
=======
            </div>
            
            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h4 className="custom-modal-title">Xác Nhận Xóa Hạng</h4>
                        <p className="custom-modal-body">
                            Bạn có chắc chắn muốn xóa hạng thành viên <strong>"{deleteConfirm.name}"</strong>? 
                            Tất cả tài khoản thuộc hạng này sẽ được chuyển về hạng Đồng mặc định.
                        </p>
                        <div className="custom-modal-actions">
                            <button className="custom-modal-btn custom-modal-btn-cancel" onClick={() => setDeleteConfirm(null)}>
                                HỦY BỎ
                            </button>
                            <button className="custom-modal-btn custom-modal-btn-confirm" onClick={handleConfirmDelete}>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}
<<<<<<< HEAD
        </AdminLayout >
=======
        </AdminLayout>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
    );
};

export default AdminRanks;
