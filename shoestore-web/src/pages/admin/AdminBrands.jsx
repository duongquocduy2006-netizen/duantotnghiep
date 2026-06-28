import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./AdminBanners.css";

const AdminBrands = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);

    // Form inputs state
    const [formName, setFormName] = useState("");
    const [formActive, setFormActive] = useState(true);
    const [formImagePreview, setFormImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    const fetchBrands = async () => {
        try {
            const response = await api.get('/api/brands');
            setBrands(response.data || []);
        } catch (err) {
            console.error("Lỗi tải thương hiệu:", err);
            setError("Không thể tải danh sách thương hiệu từ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const filteredBrands = brands.filter(b => {
        const matchSearch = !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = selectedStatus === "all" || (selectedStatus === "true" && b.active) || (selectedStatus === "false" && !b.active);
        return matchSearch && matchStatus;
    });

    const openModal = (brand = null) => {
        if (brand) {
            setEditingBrand(brand);
            setFormName(brand.name);
            setFormActive(brand.active);
            setFormImagePreview(brand.imageUrl ? `http://localhost:8080/images/${brand.imageUrl}` : null);
            setImageBase64("");
        } else {
            setEditingBrand(null);
            setFormName("");
            setFormActive(true);
            setFormImagePreview(null);
            setImageBase64("");
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingBrand(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormImagePreview(reader.result);
                setImageBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: formName,
            active: formActive,
            imageBase64: imageBase64
        };

        try {
            if (editingBrand) {
                // Update
                const response = await api.put(`/api/brands/${editingBrand.id}`, payload);
                setBrands(brands.map(b => b.id === editingBrand.id ? response.data : b));
                alert("Cập nhật thương hiệu thành công!");
            } else {
                // Create
                const response = await api.post('/api/brands', payload);
                setBrands([...brands, response.data]);
                alert("Tạo thương hiệu thành công!");
            }
            closeModal();
        } catch (err) {
            console.error("Lỗi lưu thương hiệu:", err);
            const errMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : "Không thể lưu thông tin thương hiệu. Vui lòng kiểm tra lại.";
            alert(errMsg);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa thương hiệu "${name}" này không?`)) {
            try {
                await api.delete(`/api/brands/${id}`);
                alert("Xóa thương hiệu thành công!");
                setBrands(brands.filter(b => b.id !== id));
            } catch (err) {
                console.error("Lỗi xóa thương hiệu:", err);
                const errMsg = err.response && err.response.data && err.response.data.error
                    ? err.response.data.error
                    : "Không thể xóa thương hiệu này. Có thể thương hiệu vẫn còn sản phẩm.";
                alert(errMsg);
            }
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return 'https://ui-avatars.com/api/?name=BR&background=111&color=fff&bold=true';
        if (imageUrl.startsWith('http')) return imageUrl;
        return `http://localhost:8080/images/${imageUrl}`;
    };

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-tag-fill me-2"></i> REST API SERVICES
                        </div>
                        <h1 className="header-title">QUẢN LÝ THƯƠNG HIỆU</h1>
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
                            placeholder="Tìm kiếm thương hiệu..."
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
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Tạm ẩn</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '800' }}>ĐANG TẢI THƯƠNG HIỆU SẢN PHẨM...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                            <p style={{ marginTop: '10px', fontWeight: '800' }}>{error}</p>
                        </div>
                    ) : filteredBrands.length === 0 ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                            <p style={{ marginTop: '15px', fontWeight: '800', color: '#888' }}>Chưa có thương hiệu sản phẩm nào.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>Hình ảnh</th>
                                    <th style={{ width: '120px' }}>ID</th>
                                    <th>Tên thương hiệu</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: 'right' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBrands.map((brand) => (
                                    <tr key={brand.id}>
                                        <td>
                                            <div className="table-img-box" style={{ width: '80px', height: '50px', border: '1.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                                                <img
                                                    src={getImageUrl(brand.imageUrl)}
                                                    alt={brand.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=fff&color=000&bold=true`;
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ color: '#555', fontWeight: 800 }}>
                                            #BRD-{brand.id.toString().padStart(2, '0')}
                                        </td>
                                        <td style={{ fontWeight: 800, color: '#000', fontSize: '16px', textTransform: 'uppercase', fontFamily: 'Oswald' }}>{brand.name}</td>
                                        <td>
                                            {brand.active ? (
                                                <span className="status-badge-modern">
                                                    <div className="status-dot"></div> HOẠT ĐỘNG
                                                </span>
                                            ) : (
                                                <span className="status-badge-modern inactive">
                                                    <div className="status-dot"></div> TẠM ẨN
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn-icon-action"
                                                title="Sửa"
                                                onClick={() => openModal(brand)}
                                            >
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                            <button
                                                className="btn-icon-action"
                                                style={{ color: 'var(--accent-red)' }}
                                                onClick={() => handleDelete(brand.id, brand.name)}
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

            {/* BRAND MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3 className="modal-title font-oswald text-uppercase">
                            {editingBrand ? 'Cập nhật thương hiệu' : 'Thêm thương hiệu mới'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <label className="form-label">Ảnh đại diện thương hiệu</label>
                                <div style={{
                                    width: '120px', height: '120px', background: '#fff',
                                    border: '2.5px dashed #000', borderRadius: '0px', margin: '0 auto',
                                    position: 'relative', overflow: 'hidden', cursor: 'pointer'
                                }}>
                                    {formImagePreview ? (
                                        <img src={formImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <i className="bi bi-image" style={{ fontSize: '40px', color: '#555', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></i>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tên Thương Hiệu</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nike, Adidas, Jordan..."
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Trạng Thái Hoạt Động</label>
                                <select className="form-input" value={formActive.toString()} onChange={(e) => setFormActive(e.target.value === "true")}>
                                    <option value="true">Đang kinh doanh</option>
                                    <option value="false">Tạm ngưng nhập hàng</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-add-pill" style={{ flex: 1, justifyContent: 'center' }}>
                                    {editingBrand ? 'LƯU THÔNG TIN' : 'TẠO THƯƠNG HIỆU'}
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

export default AdminBrands;
