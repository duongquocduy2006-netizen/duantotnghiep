import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import DateTimePicker24h from '../../components/DateTimePicker24h';
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
    const [existingImages, setExistingImages] = useState([]);
    const [newPreviews, setNewPreviews] = useState([]);

    const getCurrentDateTimeString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const imgUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads/')) return `http://localhost:8080${url}`;
        if (url.startsWith('uploads/')) return `http://localhost:8080/${url}`;
        return `http://localhost:8080/uploads/${url}`;
    };

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
                setExistingImages(data.images);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết banner:', error);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages([...images, ...files]);
        const localPreviews = files.map(file => URL.createObjectURL(file));
        setNewPreviews([...newPreviews, ...localPreviews]);
    };

    const removeNewImage = (idx) => {
        const updatedImages = [...images];
        updatedImages.splice(idx, 1);
        setImages(updatedImages);

        const updatedPreviews = [...newPreviews];
        URL.revokeObjectURL(updatedPreviews[idx]);
        updatedPreviews.splice(idx, 1);
        setNewPreviews(updatedPreviews);
    };

    const removeExistingImage = async (imgId) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi database?")) {
            try {
                await api.delete(`/api/banners/image/${imgId}`);
                setExistingImages(existingImages.filter(img => img.id !== imgId));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Đã xóa ảnh khỏi database." }));
            } catch (error) {
                console.error("Lỗi khi xóa ảnh:", error);
                alert("Không thể xóa ảnh. Vui lòng thử lại.");
            }
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

                    <div className="row g-4 align-items-stretch">
                        <div className="col-lg-7 d-flex flex-column">
                            <div className="form-card d-flex flex-column h-100">
                                <h3 className="form-card-title">THÔNG TIN CHIẾN DỊCH</h3>

                                <div className="mb-3">
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
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label-modern">Sự kiện / Dịp</label>
                                        <input
                                            type="text"
                                            className="form-input-modern"
                                            placeholder="VD: Black Friday"
                                            value={event}
                                            onChange={(e) => setEvent(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
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
                                    <div className="col-md-6 mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label-modern mb-0">Ngày bắt đầu</label>
                                            <button 
                                                type="button" 
                                                className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                                style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                                onClick={() => setStartDate(getCurrentDateTimeString())}
                                            >
                                                <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                            </button>
                                        </div>
                                        <DateTimePicker24h
                                            title="CHỌN NGÀY BẮT ĐẦU BANNER (24H)"
                                            value={startDate}
                                            placeholder="Bấm chọn ngày & giờ bắt đầu..."
                                            min={getCurrentDateTimeString()}
                                            onChange={(val) => setStartDate(val)}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <label className="form-label-modern mb-0">Ngày kết thúc</label>
                                            <button 
                                                type="button" 
                                                className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                                style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                                onClick={() => setEndDate(getCurrentDateTimeString())}
                                            >
                                                <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                            </button>
                                        </div>
                                        <DateTimePicker24h
                                            title="CHỌN NGÀY KẾT THÚC BANNER (24H)"
                                            value={endDate}
                                            placeholder="Bấm chọn ngày & giờ kết thúc..."
                                            min={startDate || getCurrentDateTimeString()}
                                            onChange={(val) => setEndDate(val)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label-modern">Mô tả thêm</label>
                                    <textarea
                                        className="form-input-modern"
                                        rows="2"
                                        placeholder="Ghi chú nội bộ cho chiến dịch này..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    ></textarea>
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

                        <div className="col-lg-5 d-flex flex-column">
                            <div className="form-card d-flex flex-column h-100">
                                <h3 className="form-card-title">HÌNH ẢNH BANNER</h3>

                                <div className="image-drop-zone-modern flex-grow-1" onClick={() => document.getElementById('banner-upload').click()}>
                                    <i className="bi bi-cloud-arrow-up display-5 text-muted mb-2 d-block"></i>
                                    <p className="mb-1 fw-bold text-dark">Kéo thả hoặc Click để tải ảnh</p>
                                    <p className="text-muted small mb-0">Khuyên dùng tỷ lệ 16:9 cho trang chủ</p>
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        multiple
                                        hidden
                                        onChange={handleImageChange}
                                    />
                                </div>

                                {(existingImages.length > 0 || newPreviews.length > 0) && (
                                    <div className="mt-3 pt-3 border-top">
                                        <label className="form-label-modern mb-2">Ảnh đã chọn ({existingImages.length + newPreviews.length})</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {/* Existing images from DB */}
                                            {existingImages.map((img) => (
                                                <div key={`existing-${img.id}`} style={{ position: 'relative', width: '140px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                                                    <img src={imgUrl(img.imageUrl)} alt="Existing Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingImage(img.id)}
                                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                                                    >
                                                        <i className="bi bi-trash text-danger" style={{ fontSize: '11px' }}></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {/* New locally selected images */}
                                            {newPreviews.map((src, idx) => (
                                                <div key={`new-${idx}`} style={{ position: 'relative', width: '140px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                                                    <img src={src} alt="New Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNewImage(idx)}
                                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                                                    >
                                                        <i className="bi bi-x text-dark" style={{ fontSize: '14px', fontWeight: 'bold' }}></i>
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
            <style>{`
    .admin-banner-form-page { padding: 10px 0; }
    .admin-banner-form-page .card { 
        background: #fff !important; 
        border: 1px solid #e2e8f0 !important; 
        border-radius: 12px !important;
        padding: 30px !important;
        margin-bottom: 25px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
    }
    .admin-banner-form-page .card-title {
        font-family: 'Oswald', sans-serif !important;
        color: #000 !important;
        font-size: 20px !important;
        font-weight: 800 !important;
        letter-spacing: 1px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        padding-bottom: 10px !important;
        margin-bottom: 25px !important;
        text-transform: uppercase !important;
        display: inline-block;
    }
    .admin-banner-form-page .form-label {
        color: #000 !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        margin-bottom: 8px !important;
        font-family: 'Oswald';
    }
    .admin-banner-form-page .form-control {
        background: #fff !important;
        border: 1.5px solid #dadce0 !important;
        color: #3c4043 !important;
        padding: 12px 15px !important;
        font-size: 14px !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
        box-shadow: none !important;
        transition: 0.2s;
    }
    .admin-banner-form-page .form-control:focus {
        border-color: #1a73e8 !important;
        box-shadow: 0 0 0 3px rgba(26,115,232,0.1) !important;
    }
    .image-upload-box {
        border: 2px dashed #dadce0 !important;
        border-radius: 12px !important;
        background: #f8fafc !important;
        padding: 60px 40px !important;
        transition: 0.3s !important;
        cursor: pointer;
    }
    .image-upload-box:hover {
        border-color: #1a73e8 !important;
        background: #fff !important;
    }
    .upload-icon { color: #9aa0a6 !important; font-size: 45px !important; font-weight: bold; }
    
    .btn-cyan-skew {
        background: #fff; color: #000; border: none; padding: 12px 30px; 
        font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
        transition: 0.3s; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: inline-flex; justify-content: center; align-items: center; text-decoration: none;
        border-radius: 8px;
    }
    .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }
    
    .btn-cancel:hover { background: #000 !important; color: #fff !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-3px); }

    .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
    .img-item-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 5px; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .img-item-wrapper img { width: 100%; height: auto; display: block; border: 1px solid #f1f5f9; border-radius: 4px; }
    
    .btn-remove-img-brutal {
        position: absolute; top: -10px; right: -10px; background: #fff; border: 1px solid #e2e8f0; color: #000;
        width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;
        font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: 0.2s; border-radius: 50%;
    }
    .btn-remove-img-brutal:hover { background: #e50914; color: #fff; transform: scale(1.1); box-shadow: 0 4px 12px rgba(229,9,20,0.3); }
`}</style>
        </AdminLayout>
    );
};

export default AdminBannerForm;
