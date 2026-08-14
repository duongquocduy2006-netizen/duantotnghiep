import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./AdminBanners.css";

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter and search states
    const [searchKeyword, setSearchKeyword] = useState("");
    const [rankFilter, setRankFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Modals control
    const [modalRankOpen, setModalRankOpen] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        userId: null,
        currentStatus: null,
        message: ""
    });

    // Selected options for modals
    const [selectedRankId, setSelectedRankId] = useState("");


    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await api.get("/api/admin/customers");
            if (response.data && response.data.success) {
                setCustomers(response.data.customers || []);
                setRanks(response.data.ranks || []);
            } else {
                setError("Có lỗi xảy ra khi tải danh sách khách hàng.");
            }
        } catch (err) {
            console.error("Lỗi tải danh sách khách hàng:", err);
            setError("Không thể kết nối đến máy chủ để lấy thông tin khách hàng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const openRankModal = (customer) => {
        setSelectedCustomer(customer);
        setSelectedRankId(customer.rankId || "");
        setModalRankOpen(true);
    };



    const toggleStatus = (userId, currentStatus) => {
        const action = currentStatus === 1 ? "khóa" : "mở khóa";
        setConfirmModal({
            isOpen: true,
            userId,
            currentStatus,
            message: `Bạn có chắc chắn muốn ${action} tài khoản này?`
        });
    };

    const cancelStatusChange = () => {
        setConfirmModal({
            isOpen: false,
            userId: null,
            currentStatus: null,
            message: ""
        });
    };

    const submitStatusChange = async () => {
        const { userId, currentStatus } = confirmModal;
        if (!userId) return;

        try {
            const newStatus = currentStatus === 1 ? 0 : 1;
            const response = await api.post("/api/admin/customers/toggle-status", {
                userId,
                status: newStatus
            });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message }));
                setCustomers(customers.map(c => c.id === userId ? { ...c, status: newStatus } : c));
            }
        } catch (err) {
            console.error("Lỗi thay đổi trạng thái tài khoản:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể thay đổi trạng thái tài khoản." }));
        } finally {
            cancelStatusChange();
        }
    };

    const handleRankUpdate = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post("/api/admin/customers/update-rank", {
                userId: selectedCustomer.id,
                rankId: parseInt(selectedRankId)
            });
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message }));
                setModalRankOpen(false);
                const newRankObj = ranks.find(r => r.id === parseInt(selectedRankId));
                setCustomers(customers.map(c => c.id === selectedCustomer.id ? {
                    ...c,
                    rankId: newRankObj.id,
                    rankName: newRankObj.rankName,
                    rankColor: newRankObj.colorCode || '#94a3b8'
                } : c));
            }
        } catch (err) {
            console.error("Lỗi cập nhật hạng thành viên:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể cập nhật hạng thành viên." }));
        }
    };



    const getInitials = (name) => {
        if (!name) return "KH";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Client-side filtering
    const filteredCustomers = customers.filter((cust) => {
        const matchesKeyword = !searchKeyword.trim() ||
            (cust.fullName && cust.fullName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (cust.email && cust.email.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (cust.phone && cust.phone.includes(searchKeyword));

        const matchesRank = !rankFilter || cust.rankName === rankFilter;

        let matchesStatus = true;
        if (statusFilter === "active") matchesStatus = cust.status === 1;
        else if (statusFilter === "locked") matchesStatus = cust.status === 0;

        return matchesKeyword && matchesRank && matchesStatus;
    });

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-people me-2"></i> MEMBERSHIP
                        </div>
                        <h1 className="header-title">DANH SÁCH KHÁCH HÀNG</h1>
                    </div>
                    <button className="btn-add-pill" onClick={() => window.print()}>
                        <i className="bi bi-file-earmark-excel"></i> &nbsp;XUẤT BÁO CÁO
                    </button>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm tên, email, số điện thoại..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select-pill"
                        value={rankFilter}
                        onChange={(e) => setRankFilter(e.target.value)}
                    >
                        <option value="">Hạng thành viên: Tất cả</option>
                        {ranks.map(r => (
                            <option key={r.id} value={r.rankName}>{r.rankName}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select-pill"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Trạng thái: Tất cả</option>
                        <option value="active">Hoạt động</option>
                        <option value="locked">Đã khóa</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '800' }}>ĐANG TẢI DANH SÁCH KHÁCH HÀNG...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                            <p style={{ marginTop: '10px', fontWeight: '800' }}>{error}</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                            <p style={{ marginTop: '15px', fontWeight: '800', color: '#888' }}>Không tìm thấy khách hàng nào.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '35%' }}>Khách Hàng</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Phân Loại</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Chi Tiêu</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Trạng Thái</th>
                                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '180px' }}>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((cust) => (
                                    <tr key={cust.id} style={cust.status === 0 ? { backgroundColor: '#fcf8f8' } : {}}>
                                        <td>
                                            <div className="customer-profile">
                                                <div className="avatar">
                                                    {getInitials(cust.fullName)}
                                                </div>
                                                <div className="customer-info" style={{ marginLeft: '15px' }}>
                                                    <span className="customer-name"
                                                        style={cust.status === 0 ? { color: '#000', textDecoration: 'line-through' } : {}}
                                                    >
                                                        {cust.fullName || "Chưa thiết lập"}
                                                    </span>
                                                    <span className="customer-email"
                                                        style={cust.status === 0 ? { color: '#777' } : {}}
                                                    >
                                                        <i className="bi bi-envelope"></i> {cust.email}
                                                    </span>
                                                    <span className="customer-phone"
                                                        style={cust.status === 0 ? { color: '#777' } : {}}
                                                    >
                                                        <i className="bi bi-telephone"></i> {cust.phone || "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                                                <span className={`badge-role ${cust.role === 'ADMIN' ? 'role-admin' : (cust.role === 'SHIPPER' ? 'role-shipper' : 'role-user')}`} style={cust.status === 0 ? { opacity: 0.5 } : {}}>
                                                    {cust.role}
                                                </span>
                                                <span className="tier-badge"
                                                    style={{
                                                        color: cust.rankColor,
                                                        border: `1px solid ${cust.rankColor}2a`,
                                                        background: `${cust.rankColor}0a`,
                                                        padding: '3px 8px',
                                                        borderRadius: '20px',
                                                        fontWeight: 700,
                                                        fontSize: '10.5px',
                                                        textTransform: 'uppercase',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        marginTop: '2px',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <i className="bi bi-star-fill"></i>
                                                    {cust.rankName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="total-spent" style={cust.status === 0 ? { color: '#777', fontWeight: '800' } : { fontWeight: '800' }}>
                                            {cust.totalSpent.toLocaleString("vi-VN")} ₫
                                        </td>
                                        <td>
                                            {cust.status === 1 ? (
                                                <span className="status-badge-modern">
                                                    <div className="status-dot"></div> HOẠT ĐỘNG
                                                </span>
                                            ) : (
                                                <span className="status-badge-modern inactive">
                                                    <div className="status-dot"></div> ĐÃ KHÓA
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                <Link to={`/admin/customers/detail/${cust.id}`} className="btn-icon-action" title="Xem chi tiết">
                                                    <i className="bi bi-eye"></i>
                                                </Link>
                                                <button className="btn-icon-action" title="Chỉnh sửa Rank" onClick={() => openRankModal(cust)}>
                                                    <i className="bi bi-star-fill"></i>
                                                </button>

                                                {cust.role !== 'ADMIN' && (
                                                    <button
                                                        className="btn-icon-action"
                                                        style={cust.status === 1 ? { color: 'var(--accent-red)' } : { color: '#2b8a3e' }}
                                                        title={cust.status === 1 ? "Khóa tài khoản" : "Mở khóa"}
                                                        onClick={() => toggleStatus(cust.id, cust.status)}
                                                    >
                                                        <i className={`bi ${cust.status === 1 ? 'bi-lock' : 'bi-unlock-fill'}`}></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="pagination">
                        <span className="page-info" style={{ fontStyle: 'normal', color: '#888' }}>Hiển thị {filteredCustomers.length} trên tổng số {customers.length} khách hàng</span>
                    </div>
                </div>
            </div>

            {/* MODAL RANK */}
            {modalRankOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box" style={{ width: '400px', borderTop: '4px solid #facc15' }}>
                        <h3 className="modal-title font-oswald"><i className="bi bi-star-half"></i> CẬP NHẬT HẠNG THÀNH VIÊN</h3>
                        <form onSubmit={handleRankUpdate}>
                            <div className="form-group">
                                <label className="form-label">Khách hàng</label>
                                <input type="text" value={selectedCustomer?.fullName || ""} className="form-input" readOnly style={{ background: '#f4f4f4', cursor: 'not-allowed', color: '#555' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Chọn Hạng Mới</label>
                                <select
                                    className="form-input"
                                    value={selectedRankId}
                                    onChange={(e) => setSelectedRankId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Chọn thứ hạng --</option>
                                    {ranks.map(r => (
                                        <option key={r.id} value={r.id}>{r.rankName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setModalRankOpen(false)}>HỦY BỎ</button>
                                <button type="submit" className="btn-neon" style={{ flex: 1, justifyContent: 'center', border: '1px solid #000', background: '#facc15', color: '#000', fontFamily: 'Oswald', fontWeight: 'bold' }}>CẬP NHẬT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* CUSTOM CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box animate__animated animate__zoomIn">
                        <div className="admin-confirm-icon">
                            <i className="bi bi-exclamation-circle"></i>
                        </div>
                        <h4 className="admin-confirm-title">Xác nhận thay đổi</h4>
                        <p className="admin-confirm-message">{confirmModal.message}</p>
                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-cancel" onClick={cancelStatusChange}>Hủy bỏ</button>
                            <button className="admin-btn-confirm-ok" onClick={submitStatusChange}>Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`

                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #ffffff !important; padding: 12px 16px; border: 1px solid #f3e8ff !important; border-radius: 16px !important; box-shadow: 0 4px 20px rgba(139,92,246,0.05) !important; flex-wrap: wrap; }
                .search-box { position: relative; flex: 1; min-width: 220px; max-width: none; }
                .search-input { width: 100%; background: #ffffff !important; border: 1px solid #d8b4fe !important; padding: 9px 14px 9px 38px; color: #374151 !important; outline: none; height: 42px; font-weight: 400; border-radius: 24px; font-size: 14px; transition: all 0.25s ease; font-family: 'Inter', sans-serif; box-shadow: 0 2px 8px rgba(139,92,246,0.04) !important; }
                .search-input:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 4px rgba(139,92,246,0.15) !important; }
                .search-input::placeholder { color: #a78bfa !important; }
                .bi-search { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8b5cf6 !important; font-size: 14px; pointer-events: none; }
                .filter-select { background: #ffffff !important; color: #374151 !important; border: 1px solid #d8b4fe !important; padding: 8px 14px; outline: none; cursor: pointer; height: 42px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.25s ease; }
                .filter-select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 4px rgba(139,92,246,0.15) !important; }

                /* Compact Brutalist Table */
                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; border-radius: 14px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
                td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
                .customer-profile { display: flex; align-items: center; }
                .avatar { width: 45px; height: 45px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 50%; color: #000 !important; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px; background-color: #f1f5f9 !important; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03); }
                .customer-name { display: block; font-weight: 800; color: #000; font-size: 16px; margin-bottom: 2px; }
                .customer-email, .customer-phone { font-size: 12px; color: #555; display: block; font-weight: 600; display: flex; align-items: center; gap: 6px; }
                .customer-phone { margin-top: 2px; }

                .badge-role { font-size: 10px; font-weight: 700; padding: 2px 6px; font-family: 'Inter', sans-serif; text-transform: uppercase; border: none; border-radius: 4px; display: inline-block; letter-spacing: 0.5px; }
                .role-admin { background: rgba(229, 9, 20, 0.1); color: #e50914; }
                .role-shipper { background: rgba(15, 23, 42, 0.1); color: #0f172a; }
                .role-user { background: rgba(100, 116, 139, 0.1); color: #64748b; }
                
                .total-spent { font-size: 15px; font-weight: 800; }


                .pagination { margin-top: 20px; font-weight: 700; color: #000; padding: 0 20px 20px 20px; }
                
                .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px); z-index: 2000; align-items: center; justify-content: center; display: flex; }
                .modal-box { padding: 35px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.12); animation: slideUp 0.25s ease-out; background: #fff; width: 500px; max-width: 95vw; }
                .modal-title { font-family: 'Oswald'; font-size: 22px; color: #000; margin-bottom: 24px; letter-spacing: 0.5px; font-weight: 700; border-bottom: 1px solid #ffe3e3; padding-bottom: 14px; }
                .form-group { margin-bottom: 25px; display: flex; flex-direction: column; }
                .form-label { font-size: 13px; color: #000; font-weight: 800; font-family: 'Oswald'; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
                .form-input { background: #fff; border: 1px solid rgba(0, 0, 0, 0.12); color: #000; padding: 12px 14px; outline: none; font-size: 14px; font-weight: 500; border-radius: 8px; width: 100%; box-sizing: border-box; transition: 0.2s; }
                .form-input:focus { border-color: var(--accent-red); }
                .modal-actions { display: flex; gap: 15px; }

                .btn-cancel { border: 1px solid rgba(0, 0, 0, 0.12); background: #fff; color: #555; cursor: pointer; padding: 10px 20px; border-radius: 8px; font-family: 'Oswald'; font-weight: 800; transition: all 0.2s ease; }
                .btn-cancel:hover { background: #f4f5f7; color: #000; border-color: rgba(0,0,0,0.2); }
                .btn-neon { transition: 0.2s; }
                .btn-neon:hover { filter: brightness(0.9); }

                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

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

export default AdminCustomers;
