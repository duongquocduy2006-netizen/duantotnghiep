import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AdminFormModern.css';

const AdminLookbookForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [caption, setCaption] = useState('');
    const [status, setStatus] = useState(true);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchLookbookDetails();
        }
    }, [id]);

    const fetchLookbookDetails = async () => {
        try {
            const response = await api.get(`/api/lookbooks/${id}`);
            const data = response.data;
            setCaption(data.caption || '');
            setStatus(data.status);
            if (data.imageUrl) {
                const fullUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `http://localhost:8080${data.imageUrl}`;
                setPreview(fullUrl);
                setCurrentImageUrl(data.imageUrl);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết lookbook:', error);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (isEdit) formData.append('id', id);
        formData.append('caption', caption);
        formData.append('status', status);

        if (image) {
            formData.append('imageFile', image); // Backend expects 'imageFile'
        } else if (isEdit && currentImageUrl) {
            formData.append('imageUrl', currentImageUrl);
        }

        try {
            // Both Add and Edit use POST in the API
            await api.post('/api/lookbooks', formData);
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: isEdit ? 'Cập nhật lookbook thành công!' : 'Thêm lookbook thành công!'
            }));
            navigate('/admin/lookbooks');
        } catch (error) {
            console.error('Lỗi khi lưu lookbook:', error);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Có lỗi xảy ra khi lưu Lookbook. Vui lòng thử lại.' }));
        }
    };

    return (
        <AdminLayout>
            <div className="admin-form-modern">
                <form onSubmit={handleSubmit}>
                    {/* MODERN HEADER */}
                    <div className="page-header-wrapper">
                        <div>
                            <div className="header-label">
                                <i className="bi bi-shield-lock-fill me-2"></i> SYSTEM ADMIN
                            </div>
                            <h1 className="header-title">{isEdit ? 'CẬP NHẬT LOOKBOOK' : 'TẠO ALBUM MỚI'}</h1>
                        </div>
                        <div className="d-flex gap-3">
                            <Link to="/admin/lookbooks" className="btn-modern-cancel">QUAY LẠI</Link>
                            <button type="submit" className="btn-modern-primary">
                                {isEdit ? 'CẬP NHẬT NGAY' : 'XUẤT BẢN ALBUM'}
                            </button>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-7">
                            <div className="form-card mb-4">
                                <h3 className="form-card-title">THÔNG TIN LOOKBOOK</h3>

                                <div className="mb-4">
                                    <label className="form-label-modern">Caption / Hashtag *</label>
                                    <input
                                        type="text"
                                        className="form-input-modern"
                                        placeholder="VD: #WinterCollection2024"
                                        required
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label-modern">Trạng thái hiển thị</label>
                                    <select
                                        className="form-input-modern"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value === 'true')}
                                    >
                                        <option value="true">Công khai (Hiển thị trên web)</option>
                                        <option value="false">Bản nháp (Ẩn)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="form-card">
                                <h3 className="form-card-title">HÌNH ẢNH LOOKBOOK</h3>

                                <div className="image-drop-zone-modern" onClick={() => document.getElementById('lookbook-upload').click()}>
                                    {preview ? (
                                        <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: '8px' }} />
                                    ) : (
                                        <>
                                            <i className="bi bi-camera display-4 text-muted mb-3 d-block"></i>
                                            <p className="mb-0 fw-bold">Click để tải ảnh Lookbook</p>
                                            <p className="text-muted small">Ảnh dọc sẽ hiển thị đẹp nhất</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="lookbook-upload"
                                        hidden
                                        onChange={handleImageChange}
                                    />
                                </div>
                                {preview && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm text-danger mt-3 d-block mx-auto"
                                        onClick={() => { setImage(null); setPreview(null); }}
                                    >
                                        Thay đổi ảnh khác
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminLookbookForm;
