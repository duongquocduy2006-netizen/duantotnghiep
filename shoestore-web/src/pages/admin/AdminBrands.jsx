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

    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        brandId: null,
        brandName: "",
        message: ""
    });

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
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Cập nhật thương hiệu thành công!" }));
            } else {
                // Create
                const response = await api.post('/api/brands', payload);
                setBrands([...brands, response.data]);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Tạo thương hiệu thành công!" }));
            }
            closeModal();
        } catch (err) {
            console.error("Lỗi lưu thương hiệu:", err);
            const errMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : "Không thể lưu thông tin thương hiệu. Vui lòng kiểm tra lại.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        }
    };

    const triggerDeleteConfirm = (id, name) => {
        setConfirmModal({
            isOpen: true,
            brandId: id,
            brandName: name,
            message: `Bạn có chắc chắn muốn xóa thương hiệu "${name}" này không?`
        });
    };

    const cancelDelete = () => {
        setConfirmModal({
            isOpen: false,
            brandId: null,
            brandName: "",
            message: ""
        });
    };

    const submitDelete = async () => {
        const { brandId } = confirmModal;
        if (!brandId) return;

        try {
            await api.delete(`/api/brands/${brandId}`);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Xóa thương hiệu thành công!" }));
            setBrands(brands.filter(b => b.id !== brandId));
        } catch (err) {
            console.error("Lỗi xóa thương hiệu:", err);
            const errMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : "Không thể xóa thương hiệu này. Có thể thương hiệu vẫn còn sản phẩm.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            cancelDelete();
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return 'https://ui-avatars.com/api/?name=BR&background=111&color=fff&bold=true';
        if (imageUrl.startsWith('http')) return imageUrl;
        return `http://localhost:8080/images/${imageUrl}`;
    };

    return (
        <AdminLayout>
<<<<<<< HEAD
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
=======
            <div className="admin-page-header" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="header-left">
                    <span className="sub-title-neon">⌨ SINGLE PAGE APPLICATION (REST API)</span>
                    <h1 className="cinematic-title" style={{ margin: 0 }}>QUẢN LÝ THƯƠNG HIỆU</h1>
                </div>
                <button onClick={() => openModal()} className="btn-cyan-skew">
                    <i className="bi bi-plus-lg"></i> &nbsp;THÊM MỚI
                </button>
            </div>

            <div className="toolbar" style={{
                background: '#fff',
                padding: '12px 16px',
                border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div className="admin-search-box-wrap" style={{ flex: 1 }}>
                    <i className="bi bi-search admin-search-icon"></i>
                    <input 
                        type="text" 
                        className="admin-search-input" 
                        placeholder="Tìm kiếm thương hiệu..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className="filter-select" 
                    style={{ width: '200px', background: '#fff', border: '1px solid #e2e8f0', color: '#555', fontWeight: 'bold' }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                >
                    <option value="all">Trạng thái: Tất cả</option>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Tạm ẩn</option>
                </select>
            </div>

            <div className="table-card">
                {filteredBrands.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px' }}></i>
                        <p style={{ marginTop: '10px' }}>Chưa có thương hiệu sản phẩm nào.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Hình ảnh</th>
                                <th style={{ width: '100px' }}>ID</th>
                                <th>Tên thương hiệu</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBrands.map((brand) => (
                                <tr key={brand.id}>
                                    <td>
                                        <div style={{ width: '60px', height: '60px', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <img src={getImageUrl(brand.imageUrl)} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    </td>
                                    <td className="font-oswald" style={{ color: '#000', fontWeight: 600 }}>
                                        #BRD-{brand.id.toString().padStart(2, '0')}
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#000', fontSize: '18px', textTransform: 'uppercase' }}>{brand.name}</td>
                                    <td>
                                        {brand.active ? (
                                            <span style={{ color: '#4ade80', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                                                ● Hoạt động
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--accent-red)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                                                ● Tạm ẩn
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="action-btn-icon icon-edit"
                                            title="Sửa"
                                            onClick={() => openModal(brand)}
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                        <button
                                            className="action-btn-icon icon-delete"
                                            
                                            onClick={() => triggerDeleteConfirm(brand.id, brand.name)}
                                            title="Xóa"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
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
<<<<<<< HEAD
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
=======
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #fff; padding: 12px 16px; border: 1px solid #e8eaed; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); flex-wrap: wrap; max-width: 100%; box-sizing: border-box; }
                .admin-search-box-wrap { position: relative; flex: 1; max-width: 100%; min-width: 220px; box-sizing: border-box; background: transparent !important; border: none !important; padding: 0 !important; display: block !important; }
                .admin-search-input { width: 100%; background: #fff !important; border: 1.5px solid #dadce0; padding: 10px 16px 10px 42px !important; color: #3c4043 !important; outline: none; height: 44px; font-weight: 500; border-radius: 12px !important; font-size: 14px; transition: all 0.2s; font-family: 'Inter', sans-serif; box-sizing: border-box; }
                .admin-search-input:focus { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1) !important; }
                .admin-search-input::placeholder { color: #9aa0a6; }
                .admin-search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888 !important; font-size: 16px; pointer-events: none; z-index: 5; }
                .filter-select { background: #fff !important; color: #3c4043 !important; border: 1.5px solid #dadce0 !important; padding: 8px 14px; outline: none; cursor: pointer; height: 40px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.2s; }
                .filter-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 3px rgba(26,115,232,0.1) !important; }

                .btn-red-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 0 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 45px; min-width: 150px;
                }
                .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-2px); }

                /* Compact Brutalist Table */
                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; border-radius: 14px; overflow-x: auto; width: 100%; box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; min-width: 800px; }
                th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
                td { padding: 14px 16px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
                
                /* Action Icon Buttons */
                .action-btn-icon { width: 34px; height: 34px; border: 1px solid #e2e8f0; color: #64748b; border-radius: 8px; background: #f8fafc; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; cursor: pointer; text-decoration: none; font-size: 14px; }
                .action-btn-icon:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: #1e293b; color: #fff; }
                .icon-delete:hover { background: #e50914; color: #fff; border-color: #e50914; }
                .icon-edit:hover { background: #f59e0b; color: #fff; border-color: #f59e0b; }

                /* Modal Brutalist */
                .modal-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .modal-box { background: #fff; width: 500px; padding: 40px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: slideUp 0.3s ease-out; }
                .modal-title { font-family: 'Oswald'; font-size: 22px; color: #1e293b; margin-bottom: 24px; letter-spacing: 0.5px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; }
                .form-input { width: 100%; background: #f8fafc; border: 1.5px solid #e2e8f0; color: #1e293b; padding: 12px 14px; outline: none; transition: 0.2s; font-weight: 500; box-shadow: none; border-radius: 8px; font-size: 14px; }
                .form-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); background: #fff; }

>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
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

export default AdminBrands;
