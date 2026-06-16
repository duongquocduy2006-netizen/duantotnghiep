import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";

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
    const [modalRoleOpen, setModalRoleOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Selected options for modals
    const [selectedRankId, setSelectedRankId] = useState("");
    const [selectedRole, setSelectedRole] = useState("USER");

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

    const openRoleModal = (customer) => {
        setSelectedCustomer(customer);
        setSelectedRole(customer.role || "USER");
        setModalRoleOpen(true);
    };

    const toggleStatus = async (userId, currentStatus) => {
        const action = currentStatus === 1 ? "khóa" : "mở khóa";
        if (window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản này?`)) {
            try {
                const newStatus = currentStatus === 1 ? 0 : 1;
                const response = await api.post("/api/admin/customers/toggle-status", {
                    userId,
                    status: newStatus
                });
                if (response.data && response.data.success) {
                    alert(response.data.message);
                    setCustomers(customers.map(c => c.id === userId ? { ...c, status: newStatus } : c));
                }
            } catch (err) {
                console.error("Lỗi thay đổi trạng thái tài khoản:", err);
                alert("Không thể thay đổi trạng thái tài khoản.");
            }
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
                alert(response.data.message);
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
            alert("Không thể cập nhật hạng thành viên.");
        }
    };

    const handleRoleUpdate = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post("/api/admin/customers/update-role", {
                userId: selectedCustomer.id,
                role: selectedRole
            });
            if (response.data && response.data.success) {
                alert(response.data.message);
                setModalRoleOpen(false);
                setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, role: selectedRole } : c));
            }
        } catch (err) {
            console.error("Lỗi cập nhật quyền tài khoản:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể thay đổi quyền tài khoản.";
            alert(errMsg);
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
            <div className="admin-page-header">
                <div className="header-left">
                    <span className="sub-title-neon"><i className="bi bi-people"></i> MEMBERSHIP</span>
                    <h1 className="cinematic-title">DANH SÁCH KHÁCH HÀNG</h1>
                </div>
                <div className="header-right-actions">
                    <button className="btn-cyan-skew" onClick={() => window.print()}>
                        <i className="bi bi-file-earmark-excel"></i> &nbsp;XUẤT DANH SÁCH
                    </button>
                </div>
            </div>

            <div className="toolbar">
                <div className="search-box">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Tìm tên, email, số điện thoại..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    value={rankFilter}
                    onChange={(e) => setRankFilter(e.target.value)}
                >
                    <option value="">Hạng thành viên: Tất cả</option>
                    {ranks.map(r => (
                        <option key={r.id} value={r.rankName}>{r.rankName}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Trạng thái: Tất cả</option>
                    <option value="active">Hoạt động</option>
                    <option value="locked">Đã khóa</option>
                </select>
            </div>

            <div className="table-card" style={{ overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                        <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI DANH SÁCH KHÁCH HÀNG...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                        <p style={{ marginTop: '10px' }}>{error}</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                        <p style={{ marginTop: '15px' }}>Không tìm thấy khách hàng nào.</p>
                    </div>
                ) : (
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Khách Hàng</th>
                                <th>Phân Loại</th>
                                <th>Chi Tiêu</th>
                                <th>Trạng Thái</th>
                                <th style={{ textAlign: 'right' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((cust) => (
                                <tr key={cust.id} style={cust.status === 0 ? { backgroundColor: '#f8d7da' } : {}}>
                                    <td>
                                        <div className="customer-profile">
                                            <div className="avatar"
                                                style={cust.status === 0 ? { color: '#000', borderColor: '#333', backgroundColor: '#fff' } : { backgroundColor: '#fff', color: '#000' }}
                                            >
                                                {getInitials(cust.fullName)}
                                            </div>
                                            <div className="customer-info" style={{ marginLeft: '15px' }}>
                                                <span className="customer-name"
                                                    style={cust.status === 0 ? { color: '#000', textDecoration: 'line-through' } : {}}
                                                >
                                                    {cust.fullName || "Chưa thiết lập"}
                                                </span>
                                                <span className="customer-email"
                                                    style={cust.status === 0 ? { color: '#555' } : {}}
                                                >
                                                    <i className="bi bi-envelope"></i> {cust.email}
                                                </span>
                                                <span className="customer-phone"
                                                    style={cust.status === 0 ? { color: '#555' } : {}}
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
                                                    border: `2px solid ${cust.rankColor}`,
                                                    background: '#fff',
                                                    padding: '2px 6px',
                                                    fontWeight: 800,
                                                    fontSize: '10px',
                                                    textTransform: 'uppercase',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <i className="bi bi-star-fill"></i>
                                                {cust.rankName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="total-spent" style={cust.status === 0 ? { color: '#555' } : {}}>
                                        {cust.totalSpent.toLocaleString("vi-VN")} ₫
                                    </td>
                                    <td>
                                        {cust.status === 1 ? (
                                            <span className="badge-status-active">HOẠT ĐỘNG</span>
                                        ) : (
                                            <span className="badge-status-locked">ĐÃ KHÓA</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                            <Link to={`/admin/customers/detail/${cust.id}`} className="action-btn-icon" title="Xem chi tiết">
                                                <i className="bi bi-eye"></i>
                                            </Link>
                                            <button className="action-btn-icon" title="Chỉnh sửa Rank" onClick={() => openRankModal(cust)}>
                                                <i className="bi bi-star-fill"></i>
                                            </button>
                                            {cust.role !== 'ADMIN' && (
                                                <button className="action-btn-icon" title="Phân Quyền (Role)" onClick={() => openRoleModal(cust)}>
                                                    <i className="bi bi-person-badge"></i>
                                                </button>
                                            )}
                                            {cust.role !== 'ADMIN' && (
                                                <button
                                                    className={`action-btn-icon ${cust.status === 1 ? 'icon-lock' : 'icon-unlock'}`}
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
                    <span className="page-info">Hiển thị {filteredCustomers.length} trên tổng số {customers.length} khách hàng</span>
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
                                <button type="submit" className="btn-neon" style={{ flex: 1, justifyContent: 'center', border: 'none', background: '#facc15', color: '#000', fontFamily: 'Oswald', fontWeight: 'bold' }}>CẬP NHẬT</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ROLE */}
            {modalRoleOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box" style={{ width: '400px', borderTop: '4px solid #a855f7' }}>
                        <h3 className="modal-title font-oswald" style={{ color: '#a855f7' }}><i className="bi bi-person-gear"></i> PHÂN QUYỀN (ROLE)</h3>
                        <form onSubmit={handleRoleUpdate}>
                            <div className="form-group">
                                <label className="form-label">Tài Khoản</label>
                                <input type="text" value={selectedCustomer?.fullName || ""} className="form-input" readOnly style={{ background: '#f4f4f4', cursor: 'not-allowed', color: '#555' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cấp Quyền Truy Cập</label>
                                <select
                                    className="form-input"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    required
                                >
                                    <option value="USER">Khách Hàng (USER)</option>
                                    <option value="SHIPPER">Shipper Bưu Tá (SHIPPER)</option>
                                </select>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setModalRoleOpen(false)}>HỦY BỎ</button>
                                <button type="submit" className="btn-neon" style={{ flex: 1, justifyContent: 'center', background: '#a855f7', border: 'none', color: '#000', fontFamily: 'Oswald', fontWeight: 'bold', boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)' }}>XÁC NHẬN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .header-right-actions { display: flex; align-items: center; }
                .btn-cyan-skew { 
                    background: #fff; color: #000; border: 4px solid #000; box-shadow: 6px 6px 0 #000; padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                }
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 6px 6px 0 var(--accent-red); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 20px; align-items: center; justify-content: space-between; margin-bottom: 30px; background: #fff; padding: 15px 25px; border: 4px solid #000; box-shadow: 4px 4px 0 #000; flex-wrap: wrap; }
                .search-box { position: relative; flex: 1; min-width: 300px; max-width: none; }
                .search-input { width: 100%; background: #fff !important; border: 3px solid #000; padding: 12px 15px 12px 45px; color: #000 !important; outline: none; height: 45px; font-weight: bold; }
                .search-input:focus { border-color: var(--accent-red); box-shadow: 4px 4px 0 var(--accent-red); }
                .bi-search { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #000; font-weight: bold; }
                .filter-select { background: #fff !important; color: #000 !important; border: 3px solid #000 !important; padding: 8px 15px; outline: none; cursor: pointer; height: 45px; min-width: 200px; font-weight: bold; font-family: 'Poppins'; }
                .filter-select:focus { border-color: var(--accent-red) !important; }

                /* Compact Brutalist Table */
                .table-card { background: #fff; border: 4px solid #000; box-shadow: 6px 6px 0 #000; margin-top: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f4f4f4; color: #000; font-size: 13px; text-transform: uppercase; padding: 15px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 4px solid #000; font-weight: 800; white-space: nowrap; }
                td { padding: 15px 20px; border-bottom: 2px solid #000; font-size: 14px; color: #000; font-weight: 600; vertical-align: middle; }
                
                .customer-profile { display: flex; align-items: center; }
                .avatar { width: 45px; height: 45px; border: 3px solid #000; color: #000 !important; display: flex; align-items: center; justify-content: center; font-family: 'Oswald'; font-weight: 800; font-size: 16px; background-color: #fff !important; flex-shrink: 0; }
                .customer-name { display: block; font-weight: 800; color: #000; font-size: 16px; margin-bottom: 2px; }
                .customer-email, .customer-phone { font-size: 12px; color: #555; display: block; font-weight: 600; display: flex; align-items: center; gap: 6px; }
                .customer-phone { margin-top: 2px; }

                .badge-role { font-size: 11px; font-weight: 800; padding: 2px 8px; font-family: 'Oswald'; text-transform: uppercase; border: 2px solid #000; display: inline-block; }
                .role-admin { background: #e50914; color: #fff; }
                .role-shipper { background: #a855f7; color: #fff; }
                .role-user { background: #fff; color: #000; }
                
                .total-spent { font-size: 15px; font-weight: 800; }

                .badge-status-active { background: #4ade80; color: #000; padding: 4px 8px; font-size: 11px; font-weight: 800; font-family: 'Oswald'; border: 2px solid #000; }
                .badge-status-locked { background: var(--accent-red); color: #fff; padding: 4px 8px; font-size: 11px; font-weight: 800; font-family: 'Oswald'; border: 2px solid #000; }

                /* Action Icon Buttons */
                .action-btn-icon { background: #fff; border: 3px solid #000; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; }
                .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 var(--accent-red); background: #000; color: #fff; }
                .icon-lock:hover { background: #e50914; box-shadow: 2px 2px 0 #000; }
                .icon-unlock:hover { background: #4ade80; color: #000; box-shadow: 2px 2px 0 #000; }

                .pagination { margin-top: 20px; font-weight: 700; color: #000; padding: 0 20px 20px 20px; }
                
                .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px); z-index: 2000; align-items: center; justify-content: center; display: flex; }
                .modal-box { background: #fff; padding: 40px; border: 4px solid #000; box-shadow: 16px 16px 0 var(--accent-red); animation: slideUp 0.3s ease-out; }
                .modal-title { font-family: 'Oswald'; font-size: 24px; color: #000; margin-bottom: 25px; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
                .form-group { margin-bottom: 25px; display: flex; flex-direction: column; }
                .form-label { font-size: 13px; color: #000; font-weight: 800; font-family: 'Oswald'; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
                .form-input { background: #fff; border: 3px solid #000; color: #000; padding: 12px 15px; outline: none; font-size: 14px; font-weight: 600; box-shadow: 4px 4px 0 #000; }
                .form-input:focus { border-color: var(--accent-red); box-shadow: 4px 4px 0 var(--accent-red); }
                .modal-actions { display: flex; gap: 15px; }

                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </AdminLayout>
    );
};

export default AdminCustomers;
