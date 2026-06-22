import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './AdminRanks.css';

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
            <div className="admin-ranks-page">
                <div className="admin-page-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="header-left">
                        <span className="sub-title-neon"><i className="bi bi-star-fill"></i> MEMBERSHIP</span>
                        <h1 className="cinematic-title" style={{ margin: 0 }}>QUẢN LÝ HẠNG THÀNH VIÊN</h1>
                    </div>
                    <Link to="/admin/ranks/add" className="btn-red-flat">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM HẠNG MỚI
                    </Link>
                </div>
 
                <div className="toolbar">
                    <div className="search-box">
                        <i className="bi bi-search"></i>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Tìm kiếm hạng thành viên..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
 
                <div className="table-card">
                    <table>
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
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td>
                                </tr>
                            ) : filteredRanks.map(r => (
                                <tr key={r.id}>
                                    <td className="item-id">#RNK-{r.id}</td>
                                    <td>
                                        <span style={{
                                            padding: '6px 16px',
                                            borderRadius: '100px',
                                            border: `1px solid rgba(0,0,0,0.08)`,
                                            color: '#fff',
                                            background: r.color,
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            textTransform: 'uppercase',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                                        }}>
                                            <i className="bi bi-star-fill" style={{ fontSize: '10px' }}></i> {r.name}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#222' }}>{r.points} điểm</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>-{r.discount}%</td>
                                    <td>
                                        {r.freeShipping ? (
                                            <span className="badge-free-ship">
                                                <i className="bi bi-truck"></i> FREE SHIP
                                            </span>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>Không</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{
                                            fontSize: '13px',
                                            color: r.vouchers.includes('🎟️') ? 'var(--accent-red)' : '#666',
                                            fontWeight: r.vouchers.includes('🎟️') ? '700' : '500'
                                        }}>
                                            {r.vouchers}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Link to={`/admin/ranks/edit/${r.id}`} className="action-btn" title="Sửa"><i className="bi bi-pencil-square"></i></Link>
                                        <button className="action-btn delete-btn" title="Xóa" onClick={() => handleDelete(r.id, r.name)}><i className="bi bi-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <style>{`
                .sub-title-neon { display: block; color: #e50914; font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; text-transform: uppercase; }
                .cinematic-title { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; color: #111; margin: 0; line-height: 1.2; letter-spacing: -0.5px; }
                
                .btn-red-flat { 
                    background: #e50914; color: #fff; border: none; padding: 12px 24px; 
                    font-family: 'Outfit', sans-serif; font-weight: 700; text-transform: uppercase; 
                    transition: all 0.3s ease; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                    border-radius: 10px; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
                }
                .btn-red-flat:hover { background: #b8070f; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(229, 9, 20, 0.35); color: #fff; }
 
                .toolbar { background: #ffffff; border: 1px solid #eaeaea; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
                .search-box { position: relative; width: 100%; display: flex; align-items: center; background: #fff; border: 1px solid #dcdcdc; border-radius: 8px; transition: all 0.3s ease; }
                .search-box:focus-within { border-color: #e50914; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1); }
                .search-box i { position: absolute; left: 16px; color: #888; font-size: 16px; }
                .search-input { 
                    width: 100%; background: transparent; border: none; padding: 12px 12px 12px 45px; 
                    color: #222; outline: none; font-size: 14px; font-family: 'Outfit', sans-serif;
                }
 
                .table-card { background: #fff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                table { width: 100%; border-collapse: collapse; min-width: 700px; }
                th { background: #f8f9fa; color: #444; font-size: 13px; text-transform: uppercase; padding: 16px 20px; text-align: left; border-bottom: 1px solid #eaeaea; font-weight: 700; }
                td { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #444; vertical-align: middle; }
                tr:last-child td { border-bottom: none; }
                tr:hover td { background: #fcfcfc; }
                
                .item-id { font-family: 'Outfit', sans-serif; color: #888; font-weight: 600; font-size: 13px; }
                .action-btn { 
                    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; 
                    background: #f8f9fa; border: 1px solid #e2e8f0; color: #4a5568; border-radius: 6px; transition: all 0.2s ease; text-decoration: none; cursor: pointer; margin-left: 6px;
                }
                .action-btn:hover { background: #e2e8f0; color: #1a202c; transform: translateY(-1px); }
                .action-btn.delete-btn { color: #e50914; background: rgba(229, 9, 20, 0.05); border-color: rgba(229, 9, 20, 0.1); }
                .action-btn.delete-btn:hover { background: #e50914; color: #fff; }

                .badge-free-ship {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-family: 'Outfit', sans-serif;
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
                    font-family: 'Outfit', sans-serif;
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
                    font-family: 'Outfit', sans-serif;
                }
                .custom-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .custom-modal-btn {
                    padding: 10px 20px;
                    font-family: 'Outfit', sans-serif;
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
                }
                `}</style>
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
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminRanks;
