import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const AdminLookbooks = () => {
    const [lookbooks, setLookbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLookbook, setEditingLookbook] = useState(null);

    // Form inputs state
    const [formCaption, setFormCaption] = useState("");
    const [formStatus, setFormStatus] = useState(true);
    const [formImageFile, setFormImageFile] = useState(null);
    const [formImagePreview, setFormImagePreview] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    const fetchLookbooks = async () => {
        try {
            const response = await api.get('/api/lookbooks/all');
            setLookbooks(response.data || []);
        } catch (err) {
            console.error("Lỗi tải lookbooks:", err);
            setError("Không thể tải danh sách lookbooks từ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLookbooks();
    }, []);

    const filteredLookbooks = lookbooks.filter(lb => {
        const matchSearch = !searchTerm || lb.caption.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = selectedStatus === "all" || (selectedStatus === "true" && lb.status) || (selectedStatus === "false" && !lb.status);
        return matchSearch && matchStatus;
    });

    const openModal = (lookbook = null) => {
        if (lookbook) {
            setEditingLookbook(lookbook);
            setFormCaption(lookbook.caption);
            setFormStatus(lookbook.status);
            setFormImagePreview(getImageUrl(lookbook.imageUrl));
            setFormImageFile(null);
        } else {
            setEditingLookbook(null);
            setFormCaption("#shoesstore_style");
            setFormStatus(true);
            setFormImagePreview(null);
            setFormImageFile(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLookbook(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        if (editingLookbook) {
            formData.append("id", editingLookbook.id);
        }
        formData.append("caption", formCaption);
        formData.append("status", formStatus);
        
        if (formImageFile) {
            formData.append("imageFile", formImageFile);
        } else if (editingLookbook) {
            formData.append("imageUrl", editingLookbook.imageUrl);
        }

        try {
            const response = await api.post('/api/lookbooks', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (editingLookbook) {
                setLookbooks(lookbooks.map(lb => lb.id === editingLookbook.id ? response.data : lb));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Cập nhật Lookbook thành công!" }));
            } else {
                setLookbooks([response.data, ...lookbooks]);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Thêm Lookbook mới thành công!" }));
            }
            closeModal();
        } catch (err) {
            console.error("Lỗi lưu lookbook:", err);
            alert("Không thể lưu lookbook. Vui lòng kiểm tra lại dữ liệu.");
        }
    };

    const handleDelete = async (id, caption) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa lookbook "${caption}" này không?`)) {
            try {
                await api.delete(`/api/lookbooks/${id}`);
                setLookbooks(lookbooks.filter(lb => lb.id !== id));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Xóa Lookbook thành công!" }));
            } catch (err) {
                console.error("Lỗi xóa lookbook:", err);
                alert("Không thể xóa lookbook này.");
            }
        }
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return 'https://ui-avatars.com/api/?name=LB&background=111&color=fff&bold=true';
        if (imageUrl.startsWith('http')) return imageUrl;
        return `http://localhost:8080${imageUrl}`;
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#000' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: '#000' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '14px' }}>ĐANG TẢI ALBUM LOOKBOOKS...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI TẢI DỮ LIỆU</h3>
                    <p style={{ color: '#555', marginTop: '10px' }}>{error}</p>
                    <button className="btn-action btn-primary-glow" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
                        THỬ LẠI
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-page-header" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="header-left">
                    <span className="sub-title-neon">⌨ REST API DATABASE</span>
                    <h1 className="cinematic-title" style={{ margin: 0 }}>QUẢN LÝ ALBUM LOOKBOOKS</h1>
                </div>
                <button onClick={() => openModal()} className="btn-cyan-skew">
                    <i className="bi bi-plus-lg"></i> &nbsp;THÊM MỚI
                </button>
            </div>

            <div className="toolbar" style={{
                background: '#fff',
                padding: '15px',
                border: '4px solid #000', boxShadow: '4px 4px 0 #000', borderRadius: '0',
                marginBottom: '25px',
                display: 'flex',
                gap: '15px',
                alignItems: 'stretch'
            }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <i className="bi bi-search"></i>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Tìm kiếm theo hashtag caption..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className="filter-select" 
                    style={{ width: '200px', background: '#fff', border: '3px solid #000', color: '#555', fontWeight: 'bold' }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                >
                    <option value="all">Trạng thái: Tất cả</option>
                    <option value="true">Đang hiển thị</option>
                    <option value="false">Đang ẩn</option>
                </select>
            </div>

            <div className="table-card">
                {filteredLookbooks.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px' }}></i>
                        <p style={{ marginTop: '10px' }}>Chưa có lookbook nào.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Hình ảnh</th>
                                <th style={{ width: '100px' }}>ID</th>
                                <th>Hashtag / Caption</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLookbooks.map((lb) => (
                                <tr key={lb.id}>
                                    <td>
                                        <div style={{ width: '80px', height: '100px', background: '#fff', borderRadius: '4px', overflow: 'hidden', border: '3px solid #000' }}>
                                            <img src={getImageUrl(lb.imageUrl)} alt={lb.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </td>
                                    <td className="font-oswald" style={{ color: '#000', fontWeight: 600 }}>
                                        #LB-{lb.id.toString().padStart(3, '0')}
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#e50914', fontSize: '18px' }}>{lb.caption}</td>
                                    <td>
                                        {lb.status ? (
                                            <span style={{ color: '#4ade80', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                                                ● Hiển thị
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--accent-red)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                                                ● Ẩn
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="action-btn-icon icon-edit"
                                            title="Sửa"
                                            onClick={() => openModal(lb)}
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                        <button
                                            className="action-btn-icon icon-delete"
                                            onClick={() => handleDelete(lb.id, lb.caption)}
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

            {/* LOOKBOOK MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ width: '450px' }}>
                        <h3 className="modal-title font-oswald text-uppercase">
                            {editingLookbook ? 'Cập nhật Lookbook' : 'Thêm Lookbook mới'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ textAlign: 'center', marginBottom: '25px' }}>
                                <label className="form-label">Hình ảnh phối đồ (On-feet)</label>
                                <div style={{ 
                                    width: '120px', height: '160px', background: '#fff', 
                                    border: '3px dashed #000', borderRadius: '8px', margin: '0 auto',
                                    position: 'relative', overflow: 'hidden', cursor: 'pointer'
                                }}>
                                    {formImagePreview ? (
                                        <img src={formImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                            <i className="bi bi-image" style={{ fontSize: '32px', color: '#555' }}></i>
                                            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>CHỌN ẢNH</div>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} required={!editingLookbook} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Hashtag / Caption</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ví dụ: #shoesstore_jordan"
                                    value={formCaption}
                                    onChange={(e) => setFormCaption(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Trạng Thái Hiển Thị</label>
                                <select className="form-input" value={formStatus.toString()} onChange={(e) => setFormStatus(e.target.value === "true")}>
                                    <option value="true">Hiển thị trên website</option>
                                    <option value="false">Tạm ẩn</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                <button type="submit" className="btn-cyan-skew" style={{ flex: 1 }}>
                                    {editingLookbook ? 'LƯU LẠI' : 'TẠO MỚI'}
                                </button>
                                <button type="button" onClick={closeModal} className="btn-cyan-skew" style={{ background: 'transparent', border: '1px solid #333', color: '#000', flex: 1 }}>
                                    HỦY BỎ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminLookbooks;
