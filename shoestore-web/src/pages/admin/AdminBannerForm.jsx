import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import './AdminBannerForm.css';
import api from '../../services/api';

const AdminBannerForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        name: '',
        seasonType: '',
        startDate: '',
        endDate: '',
        description: '',
        status: 'true'
    });

    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            const fetchBanner = async () => {
                try {
                    const response = await api.get(`/api/banners/${id}`);
                    const data = response.data;
                    setForm({
                        name: data.name || '',
                        seasonType: data.seasonType || '',
                        startDate: data.startDate ? data.startDate.substring(0, 16) : '',
                        endDate: data.endDate ? data.endDate.substring(0, 16) : '',
                        description: data.description || '',
                        status: String(data.status)
                    });
                    setExistingImages(Array.isArray(data.images) ? data.images : []);
                } catch (error) {
                    console.error('Error fetching banner:', error);
                    alert('Lỗi khi tải thông tin banner');
                } finally {
                    setLoading(false);
                }
            };
            fetchBanner();
        }
    }, [id, isEdit]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const previews = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setNewImages([...newImages, ...previews]);
    };

    const removeNewImage = (index) => {
        const updated = [...newImages];
        URL.revokeObjectURL(updated[index].preview);
        updated.splice(index, 1);
        setNewImages(updated);
    };

    const removeExistingImage = async (imgId) => {
        if (window.confirm('Xóa ảnh này viễn vĩnh khỏi hệ thống?')) {
            try {
                await api.delete(`/api/banners/image/${imgId}`);
                setExistingImages(existingImages.filter(img => img.id !== imgId));
            } catch (error) {
                alert('Lỗi khi xóa ảnh');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: Cần ít nhất 1 ảnh
        if (existingImages.length === 0 && newImages.length === 0) {
            alert('Vui lòng thêm ít nhất 1 hình ảnh cho chiến dịch Banner!');
            return;
        }

        const formData = new FormData();
        if (isEdit) formData.append('id', id);
        formData.append('name', form.name);
        formData.append('seasonType', form.seasonType);
        formData.append('startDate', form.startDate);
        formData.append('endDate', form.endDate);
        formData.append('description', form.description);
        formData.append('status', form.status === 'true');

        newImages.forEach(img => {
            formData.append('imageFiles', img.file);
        });

        try {
            await api.post('/api/banners', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Lưu banner thành công!');
            navigate('/admin/banners');
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Lỗi khi lưu banner');
        }
    };

    return (
        <AdminLayout>
            <div className="admin-banner-form-page">
                <form onSubmit={handleSubmit}>
                    <div className="page-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div className="header-left">
                            <span className="sub-title" style={{ color: '#000', fontSize: '13px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>QUẢN LÝ GIAO DIỆN HIỂN THỊ</span>
                            <h1 className="page-title font-oswald" style={{ margin: 0, color: '#000', fontSize: '38px', fontWeight: '700' }}>CHIẾN DỊCH BANNER (CAMPAIGN)</h1>
                        </div>
                        <div className="btn-group" style={{ display: 'flex', gap: '15px' }}>
                            <Link to="/admin/banners" className="btn-cancel" style={{
                                background: 'transparent', border: '1px solid #333', color: '#555', padding: '10px 30px',
                                fontFamily: 'Oswald', fontWeight: '600', textDecoration: 'none', transition: '0.3s'
                            }}>
                                HỦY BỎ
                            </Link>
                            <button type="submit" className="btn-cyan-skew" style={{ minWidth: '200px' }}>
                                LƯU CHIẾN DỊCH
                            </button>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="left-col">
                            <div className="card">
                                <h3 className="card-title">THÔNG TIN CHIẾN DỊCH</h3>
                                <div className="form-group">
                                    <label className="form-label">Tên chiến dịch *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="VD: Khuyến mãi mùa hè 2026"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sự kiện / Mùa *</label>
                                    <select
                                        className="form-control"
                                        required
                                        value={form.seasonType}
                                        onChange={(e) => setForm({ ...form, seasonType: e.target.value })}
                                    >
                                        <option value="">-- Chọn sự kiện --</option>
                                        <option value="Sinh Nhật">Sinh Nhật Store</option>
                                        <option value="Summer Collection">Summer Collection</option>
                                        <option value="Black Friday">Black Friday</option>
                                        <option value="New Arrival">Ra mắt bộ sưu tập mới</option>
                                        <option value="Khác">Khác / Định kỳ</option>
                                    </select>
                                </div>

                                <div className="form-group-row">
                                    <div>
                                        <label className="form-label">Thời gian bắt đầu</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={form.startDate}
                                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Thời gian kết thúc</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={form.endDate}
                                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mô tả thêm</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Ghi chú nội bộ cho chiến dịch này..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="right-col">
                            <div className="card">
                                <h3 className="card-title">HÌNH ẢNH BANNER (NHIỀU ẢNH)</h3>

                                {isEdit && existingImages.length > 0 && (
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">Các ảnh đang sử dụng</label>
                                        <div className="preview-grid">
                                            {existingImages.map(img => (
                                                <div key={img.id} className="img-item-wrapper">
                                                    <img src={`http://localhost:8080/images/${img.imageUrl}`} alt="Banner" />
                                                    <button type="button" className="btn-remove-img-brutal" title="Xóa ảnh này" onClick={() => removeExistingImage(img.id)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <hr style={{ borderColor: '#000', margin: '20px 0' }} />
                                    </div>
                                )}

                                <label className="form-label">Tải lên các ảnh của chiến dịch</label>

                                <div className="image-upload-box" onClick={() => document.getElementById('fileInput').click()}>
                                    <input
                                        type="file"
                                        id="fileInput"
                                        className="file-input"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="upload-placeholder">
                                        <i className="bi bi-cloud-arrow-up upload-icon"></i>
                                        <p style={{ color: '#555', fontSize: '12px', marginBottom: '5px' }}>BẤM VÀO ĐỂ TẢI LÊN NHIỀU ẢNH</p>
                                        <p style={{ color: '#00f2ff', fontSize: '11px' }}>(Hỗ trợ chọn nhiều file cùng lúc)</p>
                                    </div>
                                </div>

                                <div className="preview-grid mt-3">
                                    {newImages.map((img, idx) => (
                                        <div key={idx} className="img-item-wrapper">
                                            <img src={img.preview} alt="New Preview" />
                                            <button type="button" className="btn-remove-img-brutal" title="Bỏ chọn" onClick={() => removeNewImage(idx)}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="form-group" style={{ marginTop: '30px' }}>
                                    <label className="form-label">Trạng thái Chiến dịch</label>
                                    <select
                                        className="form-control"
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="true">Kích hoạt (Hiển thị trang chủ)</option>
                                        <option value="false">Tạm ẩn</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <style>{`
    .admin-banner-form-page { padding: 10px 0; }
    .admin-banner-form-page .card { 
        background: #fff !important; 
        border: 4px solid #000 !important; 
        border-radius: 0 !important;
        padding: 30px !important;
        margin-bottom: 25px;
        box-shadow: 8px 8px 0 #000 !important;
    }
    .admin-banner-form-page .card-title {
        font-family: 'Oswald', sans-serif !important;
        color: #000 !important;
        font-size: 20px !important;
        font-weight: 800 !important;
        letter-spacing: 1px !important;
        border-bottom: 3px solid #000 !important;
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
        border: 3px solid #000 !important;
        color: #000 !important;
        padding: 12px 15px !important;
        font-size: 14px !important;
        border-radius: 0 !important;
        font-weight: 600 !important;
        box-shadow: 4px 4px 0 #000 !important;
        transition: 0.3s;
    }
    .admin-banner-form-page .form-control:focus {
        border-color: var(--accent-red) !important;
        box-shadow: 4px 4px 0 var(--accent-red) !important;
    }
    .image-upload-box {
        border: 4px dashed #000 !important;
        background: #f8f9fa !important;
        padding: 60px 40px !important;
        transition: 0.3s !important;
        cursor: pointer;
    }
    .image-upload-box:hover {
        border-style: solid !important;
        background: #fff !important;
        box-shadow: 6px 6px 0 var(--accent-red) !important;
    }
    .upload-icon { color: #000 !important; font-size: 45px !important; font-weight: bold; }
    
    .btn-cyan-skew {
        background: #fff; color: #000; border: 4px solid #000; padding: 12px 30px; 
        font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
        transition: 0.3s; cursor: pointer; font-size: 14px; box-shadow: 6px 6px 0 #000;
        display: inline-flex; justify-content: center; align-items: center; text-decoration: none;
    }
    .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 6px 6px 0 var(--accent-red); transform: translateY(-3px); }
    
    .btn-cancel:hover { background: #000 !important; color: #fff !important; box-shadow: 6px 6px 0 #000; transform: translateY(-3px); }

    .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
    .img-item-wrapper { border: 4px solid #000; background: #fff; padding: 5px; position: relative; box-shadow: 4px 4px 0 #000; }
    .img-item-wrapper img { width: 100%; height: auto; display: block; border: 2px solid #000; }
    
    .btn-remove-img-brutal {
        position: absolute; top: -10px; right: -10px; background: #fff; border: 3px solid #000; color: #000;
        width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;
        font-weight: bold; box-shadow: 2px 2px 0 #000; transition: 0.2s; border-radius: 50%;
    }
    .btn-remove-img-brutal:hover { background: #e50914; color: #fff; transform: scale(1.1); box-shadow: 4px 4px 0 #000; }
`}</style>
        </AdminLayout>
    );
};

export default AdminBannerForm;
