import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./AdminBanners.css";

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Form inputs state
    const [formName, setFormName] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formActive, setFormActive] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error("Lỗi tải danh mục:", err);
            setError("Không thể tải danh sách danh mục từ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = categories.filter(c => {
        const matchSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = selectedStatus === "all" || (selectedStatus === "true" && c.active) || (selectedStatus === "false" && !c.active);
        return matchSearch && matchStatus;
    });

    const openModal = (cate = null) => {
        if (cate) {
            setEditingCategory(cate);
            setFormName(cate.name);
            setFormSlug(cate.slug || "");
            setFormActive(cate.active);
        } else {
            setEditingCategory(null);
            setFormName("");
            setFormSlug("");
            setFormActive(true);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: formName,
            slug: formSlug,
            active: formActive
        };

        try {
            if (editingCategory) {
                // Update
                const response = await api.put(`/api/categories/${editingCategory.id}`, payload);
                setCategories(categories.map(c => c.id === editingCategory.id ? response.data : c));
                alert("Cập nhật danh mục thành công!");
            } else {
                // Create
                const response = await api.post('/api/categories', payload);
                setCategories([...categories, response.data]);
                alert("Tạo danh mục thành công!");
            }
            closeModal();
        } catch (err) {
            console.error("Lỗi lưu danh mục:", err);
            const errMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : "Không thể lưu thông tin danh mục. Vui lòng kiểm tra lại.";
            alert(errMsg);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}" này không?`)) {
            try {
                await api.delete(`/api/categories/${id}`);
                alert("Xóa danh mục thành công!");
                setCategories(categories.filter(c => c.id !== id));
            } catch (err) {
                console.error("Lỗi xóa danh mục:", err);
                const errMsg = err.response && err.response.data && err.response.data.error
                    ? err.response.data.error
                    : "Không thể xóa danh mục này. Có thể danh mục vẫn còn sản phẩm.";
                alert(errMsg);
            }
        }
    };

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-tag-fill me-2"></i> DATA METRICS
                        </div>
                        <h1 className="header-title">QUẢN LÝ DANH MỤC</h1>
                    </div>
                    <button onClick={() => openModal()} className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM MỚI
                    </button>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm danh mục..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select-pill"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">Trạng thái: Tất cả</option>
                        <option value="true">Đang hiển thị</option>
                        <option value="false">Đang ẩn</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '800' }}>ĐANG TẢI DANH MỤC SẢN PHẨM...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                            <p style={{ marginTop: '10px', fontWeight: '800' }}>{error}</p>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                            <p style={{ marginTop: '15px', fontWeight: '800', color: '#888' }}>Chưa có danh mục sản phẩm nào.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>ID</th>
                                    <th>Tên danh mục</th>
                                    <th>Đường dẫn (Slug)</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: 'right' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map((cate) => (
                                    <tr key={cate.id}>
                                        <td style={{ color: '#555', fontWeight: 800 }}>
                                            #CAT-{cate.id.toString().padStart(2, '0')}
                                        </td>
                                        <td style={{ fontWeight: 800, color: '#000', textTransform: 'uppercase', fontFamily: 'Oswald', fontSize: '15px' }}>{cate.name}</td>
                                        <td style={{ color: '#555', fontWeight: 600 }}>{cate.slug}</td>
                                        <td>
                                            {cate.active ? (
                                                <span className="status-badge-modern">
                                                    <div className="status-dot"></div> HIỂN THỊ
                                                </span>
                                            ) : (
                                                <span className="status-badge-modern inactive">
                                                    <div className="status-dot"></div> ĐANG ẨN
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn-icon-action"
                                                title="Sửa"
                                                onClick={() => openModal(cate)}
                                            >
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                            <button
                                                className="btn-icon-action"
                                                style={{ color: 'var(--accent-red)' }}
                                                onClick={() => handleDelete(cate.id, cate.name)}
                                                title="Xóa"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* CATEGORY MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3 className="modal-title font-oswald text-uppercase">
                            {editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Tên Danh Mục</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nhập tên danh mục..."
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Đường Dẫn (URL Slug)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="giay-the-thao (Để trống tự sinh)"
                                    value={formSlug}
                                    onChange={(e) => setFormSlug(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Trạng Thái Hiển Thị</label>
                                <select className="form-input" value={formActive.toString()} onChange={(e) => setFormActive(e.target.value === "true")}>
                                    <option value="true">Hiển thị công khai</option>
                                    <option value="false">Tạm thời ẩn</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-add-pill" style={{ flex: 1, justifyContent: 'center' }}>
                                    {editingCategory ? 'LƯU THAY ĐỔI' : 'TẠO DANH MỤC'}
                                </button>
                                <button type="button" onClick={closeModal} className="btn-cancel" style={{ flex: 1 }}>
                                    HỦY BỎ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
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
                    font-family: 'Oswald', sans-serif;
                    font-size: 22px;
                    font-weight: 800;
                    color: #000;
                    margin-top: 0;
                    margin-bottom: 24px;
                    text-transform: uppercase;
                    border-bottom: 1px solid #ffe3e3;
                    padding-bottom: 14px;
                }
                .form-group {
                    margin-bottom: 20px;
                    text-align: left;
                }
                .form-label {
                    font-family: 'Oswald', sans-serif;
                    font-size: 13px;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    display: block;
                    color: #000;
                }
                .form-input {
                    width: 100%;
                    border: 1px solid #000;
                    padding: 12px 15px;
                    font-weight: 700;
                    font-size: 14px;
                    background: #fff;
                    border-radius: 0px;
                    outline: none;
                }
                .form-input:focus {
                    border-color: var(--accent-red);
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
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </AdminLayout>
    );
};

export default AdminCategories;
