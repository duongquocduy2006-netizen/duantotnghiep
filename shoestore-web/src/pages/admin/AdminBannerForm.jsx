import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AdminFormModern.css';

const AdminBannerForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [name, setName] = useState('');
    const [event, setEvent] = useState('');
    const [description, setDescription] = useState('');
    const [seasonType, setSeasonType] = useState('Default');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState(true);
    const [images, setImages] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);

    useEffect(() => {
        if (isEdit) {
            fetchBannerDetails();
        }
    }, [id]);

    const fetchBannerDetails = async () => {
        try {
            const response = await api.get(`/api/banners/${id}`);
            const data = response.data;
            setName(data.name || '');
            setEvent(data.event || '');
            setDescription(data.description || '');
            setSeasonType(data.seasonType || 'Default');
            setStatus(data.status !== false);
            if (data.startDate) setStartDate(data.startDate.substring(0, 16));
            if (data.endDate) setEndDate(data.endDate.substring(0, 16));
            if (data.images) {
                setPreviewImages(data.images.map(img => `http://localhost:8080/uploads/${img.imageUrl}`));
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết banner:', error);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages([...images, ...files]);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviewImages([...previewImages, ...newPreviews]);
    };

    const removeImage = (index) => {
        const updatedPreviews = [...previewImages];
        updatedPreviews.splice(index, 1);
        setPreviewImages(updatedPreviews);

        const updatedImages = [...images];
        // Logic to remove from newly added images if applicable
        if (index >= (previewImages.length - images.length)) {
            updatedImages.splice(index - (previewImages.length - images.length), 1);
            setImages(updatedImages);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (isEdit) formData.append('id', id);
        formData.append('name', name);
        formData.append('event', event);
        formData.append('description', description);
        formData.append('seasonType', seasonType);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('status', status);

        images.forEach(image => {
            formData.append('imageFiles', image); // Backend expects 'imageFiles'
        });

        try {
            // Both Add and Edit use POST in the API
            await api.post('/api/banners', formData);
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: isEdit ? 'Cập nhật banner thành công!' : 'Thêm banner thành công!'
            }));
            navigate('/admin/banners');
        } catch (error) {
            console.error('Lỗi khi lưu banner:', error);
            alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng kiểm tra lại.');
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
                            <h1 className="header-title">{isEdit ? 'CẬP NHẬT BANNER' : 'TẠO CHIẾN DỊCH MỚI'}</h1>
                        </div>
                        <div className="d-flex gap-3">
                            <Link to="/admin/banners" className="btn-modern-cancel">HỦY BỎ</Link>
                            <button type="submit" className="btn-modern-primary">
                                {isEdit ? 'LƯU THAY ĐỔI' : 'XUẤT BẢN BANNER'}
                            </button>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-7">
                            <div className="form-card mb-4">
                                <h3 className="form-card-title">THÔNG TIN CHIẾN DỊCH</h3>

                                <div className="mb-4">
                                    <label className="form-label-modern">Tên chiến dịch *</label>
                                    <input
                                        type="text"
                                        className="form-input-modern"
                                        placeholder="VD: Summer Sale 2024"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-4">
                                        <label className="form-label-modern">Sự kiện / Dịp</label>
                                        <input
                                            type="text"
                                            className="form-input-modern"
                                            placeholder="VD: Black Friday"
                                            value={event}
                                            onChange={(e) => setEvent(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        <label className="form-label-modern">Loại hiển thị</label>
                                        <select
                                            className="form-input-modern"
                                            value={seasonType}
                                            onChange={(e) => setSeasonType(e.target.value)}
                                        >
                                            <option value="Default">Mặc định</option>
                                            <option value="Limited">Giới hạn</option>
                                            <option value="Collection">Bộ sưu tập</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-4">
                                        <label className="form-label-modern">Ngày bắt đầu</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input-modern"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        <label className="form-label-modern">Ngày kết thúc</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input-modern"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-0">
                                    <label className="form-label-modern">Trạng thái</label>
                                    <select
                                        className="form-input-modern"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value === 'true')}
                                    >
                                        <option value="true">Đang hoạt động</option>
                                        <option value="false">Tạm ẩn</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-5">
                            <div className="form-card">
                                <h3 className="form-card-title">HÌNH ẢNH BANNER</h3>

                                <div className="image-drop-zone-modern" onClick={() => document.getElementById('banner-upload').click()}>
                                    <i className="bi bi-cloud-arrow-up display-4 text-muted mb-3 d-block"></i>
                                    <p className="mb-0 fw-bold">Kéo thả hoặc Click để tải ảnh</p>
                                    <p className="text-muted small">Khuyên dùng tỷ lệ 16:9 cho trang chủ</p>
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        multiple
                                        hidden
                                        onChange={handleImageChange}
                                    />
                                </div>

                                {previewImages.length > 0 && (
                                    <div className="mt-4 pt-3 border-top">
                                        <label className="form-label-modern">Ảnh đã chọn ({previewImages.length})</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {previewImages.map((src, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                                                    <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px' }}
                                                    >
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminBannerForm;
