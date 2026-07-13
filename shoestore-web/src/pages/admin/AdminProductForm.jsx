import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './AdminProductForm.css';

const AdminProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    // Loading & Error states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Form inputs state
    const [product, setProduct] = useState({
        productName: '',
        description: '',
        status: 1,
        brandName: '',
        categoryId: ''
    });

    const [variant, setVariant] = useState({
        sizeId: '',
        colorId: '',
        price: '',
        quantity: ''
    });

    // Dropdowns metadata
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [colors, setColors] = useState([]);

    const [images, setImages] = useState([]); // List of { id, url, isPrimary }
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedId, setSavedId] = useState(null);

    // Fetch form metadata (and edit details if relevant)
    const loadFormData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch categories/brands/sizes/colors list
            const metaResponse = await api.get('/api/products/metadata');
            if (metaResponse.data && metaResponse.data.success) {
                setCategories(metaResponse.data.categories || []);
                setBrands(metaResponse.data.brands || []);
                setSizes(metaResponse.data.sizes || []);
                setColors(metaResponse.data.colors || []);
            }

            if (isEdit) {
                // If editing, load the existing product details
                const detailResponse = await api.get(`/api/products/${id}`);
                if (detailResponse.data && detailResponse.data.success) {
                    const p = detailResponse.data.product;
                    setProduct({
                        productName: p.productName || '',
                        description: p.description || '',
                        status: p.status !== undefined ? p.status : 1,
                        brandName: p.brandName || '',
                        categoryId: p.categoryId || ''
                    });

                    // Set gallery images
                    if (detailResponse.data.images && detailResponse.data.images.length > 0) {
                        setImages(detailResponse.data.images);
                    }
                } else {
                    setError("Không thể tải thông tin sản phẩm cần chỉnh sửa.");
                }
            }
        } catch (err) {
            console.error("Lỗi tải thông tin form sản phẩm:", err);
            setError("Lỗi kết nối khi tải cấu hình sản phẩm từ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFormData();
    }, [id]);

    const getImageUrl = (image) => {
        const url = typeof image === 'string' ? image : image?.url;
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleDeleteImage = async (imageId) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa ảnh này không?")) {
            try {
                const response = await api.delete(`/api/products/image/${imageId}`);
                if (response.data && response.data.success) {
                    setImages(images.filter(img => img.id !== imageId));
                }
            } catch (err) {
                console.error("Lỗi xóa ảnh:", err);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể xóa ảnh này.' }));
            }
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!id) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Vui lòng tạo sản phẩm trước khi thêm ảnh vào thư viện.' }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            try {
                const response = await api.post(`/api/products/${id}/image`, { imageBase64: base64String });
                if (response.data && response.data.success) {
                    loadFormData(); // Refresh
                }
            } catch (err) {
                console.error("Lỗi upload ảnh:", err);
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể tải ảnh lên.' }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSetPrimary = async (imageId) => {
        try {
            const response = await api.post(`/api/products/image/${imageId}/set-primary`);
            if (response.data && response.data.success) {
                loadFormData(); // Refresh to update badge
            }
        } catch (err) {
            console.error("Lỗi đặt ảnh chính:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể đặt ảnh chính.' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const productPayload = {
            id: isEdit ? parseInt(id) : null,
            productName: product.productName,
            description: product.description,
            status: product.status,
            brandName: product.brandName,
            categoryId: product.categoryId ? parseInt(product.categoryId) : null
        };

        try {
            // 1. Save product basic details
            const prodResponse = await api.post('/api/products/save', productPayload);
            if (prodResponse.data && prodResponse.data.success) {
                const savedProductId = prodResponse.data.productId;

                // 2. If CREATE mode, seed the first variant
                if (!isEdit && variant.sizeId && variant.colorId && variant.price && variant.quantity) {
                    const variantPayload = {
                        productId: savedProductId,
                        variantId: null,
                        sizeId: parseInt(variant.sizeId),
                        colorId: parseInt(variant.colorId),
                        price: parseFloat(variant.price),
                        quantity: parseInt(variant.quantity)
                    };
                    await api.post('/api/products/variant/save', variantPayload);
                }

                setSavedId(savedProductId);
                setShowSuccessModal(true);
            }
        } catch (err) {
            console.error("Lỗi lưu sản phẩm:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể lưu sản phẩm. Vui lòng kiểm tra lại.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#fff' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI THÔNG TIN FORM...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI TẢI THÔNG TIN</h3>
                    <p style={{ color: '#aaa', marginTop: '10px' }}>{error}</p>
                    <button className="btn-cancel" onClick={loadFormData} style={{ marginTop: '20px' }}>
                        THỬ LẠI
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-product-form-page">
                <form onSubmit={handleSubmit}>
                    <div className="page-header">
                        <div>
                            <span className="sub-title font-oswald">QUẢN LÝ SẢN PHẨM</span>
                            <h1 className="page-title font-oswald">{isEdit ? 'CẬP NHẬT SẢN PHẨM' : 'THÊM SẢN PHẨM MỚI'}</h1>
                        </div>
                        <div className="btn-group">
                            <Link to="/admin/products" className="btn-cancel">HỦY BỎ</Link>
                            <button type="submit" className="btn-save" disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: '8px' }}></span>
                                        ĐANG LƯU...
                                    </>
                                ) : 'LƯU SẢN PHẨM'}
                            </button>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="left-col">
                            <div className="card-custom">
                                <h3 className="card-custom-title font-oswald"><i className="bi bi-info-circle"></i> THÔNG TIN CƠ BẢN</h3>
                                <div className="form-group">
                                    <label className="form-label">Tên sản phẩm *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="VD: Nike Air Force 1"
                                        required
                                        value={product.productName}
                                        onChange={(e) => setProduct({ ...product, productName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mô tả chi tiết</label>
                                    <textarea
                                        className="form-control"
                                        placeholder="Chất liệu, công nghệ, thiết kế..."
                                        style={{ minHeight: '150px' }}
                                        value={product.description}
                                        onChange={(e) => setProduct({ ...product, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Show only in CREATE mode */}
                            {!isEdit && (
                                <div className="card-custom">
                                    <h3 className="card-custom-title font-oswald"><i className="bi bi-box-seam"></i> CẤU HÌNH BIẾN THỂ (BẢN ĐẦU TIÊN)</h3>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label className="form-label" style={{ color: 'var(--accent-cyan)' }}>* Hệ thống sẽ tự tạo 1 biến thể mặc định từ các thông số này để khởi tạo sản phẩm.</label>
                                    </div>
                                    <div className="variant-row">
                                        <div className="form-group">
                                            <label className="form-label">Kích cỡ (Size) *</label>
                                            <select className="form-control" required value={variant.sizeId} onChange={(e) => setVariant({ ...variant, sizeId: e.target.value })}>
                                                <option value="">-- Chọn Size --</option>
                                                {sizes.map(s => (
                                                    <option key={s.id} value={s.id}>Size {s.sizeName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Màu sắc (Color) *</label>
                                            <select className="form-control" required value={variant.colorId} onChange={(e) => setVariant({ ...variant, colorId: e.target.value })}>
                                                <option value="">-- Chọn Màu --</option>
                                                {colors.map(c => (
                                                    <option key={c.id} value={c.id}>{c.colorName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Giá bán (VNĐ) *</label>
                                            <input
                                                type="number"
                                                min="5000"
                                                className="form-control"
                                                placeholder="VD: 1500000"
                                                required
                                                value={variant.price}
                                                onChange={(e) => setVariant({ ...variant, price: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Số lượng tồn *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                className="form-control"
                                                placeholder="VD: 100"
                                                required
                                                value={variant.quantity}
                                                onChange={(e) => setVariant({ ...variant, quantity: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="right-col">
                            <div className="card-custom">
                                <h3 className="card-custom-title font-oswald"><i className="bi bi-images"></i> ẢNH SẢN PHẨM</h3>

                                <div className="gallery-section">
                                    <label className="form-label-header">Hình ảnh hiện tại</label>
                                    {images.length === 0 ? (
                                        <p style={{ color: '#555', fontSize: '12px', fontStyle: 'italic', marginBottom: '20px' }}>Chưa có hình ảnh nào cho sản phẩm này.</p>
                                    ) : (
                                        <div className="gallery-grid">
                                            {images.map((img, idx) => (
                                                <div key={img.id || idx} className="gallery-item">
                                                    {img.isPrimary && <span className="badge-primary">ẢNH CHÍNH</span>}
                                                    <img src={getImageUrl(img)} alt="Product" className="img-fluid" />
                                                    <div className="img-footer">
                                                        <button type="button" className={`set-primary-trigger ${img.isPrimary ? 'active' : ''}`} onClick={() => handleSetPrimary(img.id)} disabled={img.isPrimary}>
                                                            <i className={`bi ${img.isPrimary ? 'bi-star-fill' : 'bi-star'}`}></i> Đặt chính
                                                        </button>
                                                        <button type="button" className="delete-trigger" onClick={() => handleDeleteImage(img.id)}>
                                                            <i className="bi bi-trash"></i> Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="upload-section" style={{ marginTop: '25px' }}>
                                    <label className="form-label-header" style={{ marginBottom: '10px', display: 'block' }}>Tải thêm ảnh mới</label>
                                    <label className="upload-placeholder-large">
                                        <input type="file" onChange={handleImageUpload} hidden accept="image/*" />
                                        <div className="upload-content">
                                            <i className="bi bi-cloud-arrow-up"></i>
                                            <span>BẤM VÀO ĐỂ TẢI ẢNH LÊN</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="card-custom">
                                <h3 className="card-custom-title font-oswald"><i className="bi bi-tags"></i> PHÂN LOẠI & TRẠNG THÁI</h3>
                                <div className="form-group">
                                    <label className="form-label">Danh mục *</label>
                                    <select className="form-control" required value={product.categoryId} onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}>
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Thương hiệu *</label>
                                    <select className="form-control" required value={product.brandName} onChange={(e) => setProduct({ ...product, brandName: e.target.value })}>
                                        <option value="">-- Chọn thương hiệu --</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.brandName}>{b.brandName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-control" value={product.status} onChange={(e) => setProduct({ ...product, status: parseInt(e.target.value) })}>
                                        <option value="1">Đang bán</option>
                                        <option value="0">Tạm ẩn</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {showSuccessModal && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box success animate__animated animate__zoomIn">
                        <div className="admin-confirm-icon">
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <h4 className="admin-confirm-title">
                            {isEdit ? 'Cập nhật thành công!' : 'Tạo mới thành công!'}
                        </h4>
                        <p className="admin-confirm-message">
                            {isEdit ? 'Sản phẩm đã được cập nhật thành công vào hệ thống!' : 'Sản phẩm mới đã được tạo thành công!'}
                        </p>
                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-ok" onClick={() => {
                                setShowSuccessModal(false);
                                navigate(`/admin/products/detail/${savedId}`);
                            }}>
                                ĐỒNG Ý
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminProductForm;
