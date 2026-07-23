import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import "./AdminProductDetail.css";

const sanitizeColorName = (name) => {
    if (!name) return "";
    return name
        .replace(/Tr\?ng/gi, "Trắng")
        .replace(/Đ\?/gi, "Đỏ")
        .replace(/Xanh l\?/gi, "Xanh lá")
        .replace(/V\?ng/gi, "Vàng")
        .replace(/H\?ng/gi, "Hồng");
};

const AdminProductDetail = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dynamic data states
    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [images, setImages] = useState([]);

    // Dropdown list metadata states
    const [sizes, setSizes] = useState([]);
    const [colors, setColors] = useState([]);

    // Variant Form states
    const [variantId, setVariantId] = useState(null); // null if adding new
    const [selectedSizeId, setSelectedSizeId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [newSizeName, setNewSizeName] = useState("");
    const [newColorName, setNewColorName] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [showNewSizeField, setShowNewSizeField] = useState(false);
    const [showNewColorField, setShowNewColorField] = useState(false);

    // Fetch product details
    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/products/${id}`);
            if (response.data && response.data.success) {
                setProduct(response.data.product);
                setVariants(response.data.variants || []);
                setImages(response.data.images || []);
                setSizes(response.data.sizes || []);
                setColors(response.data.colors || []);
            } else {
                setError("Không thể tải thông tin sản phẩm.");
            }
        } catch (err) {
            console.error("Lỗi tải chi tiết sản phẩm:", err);
            setError("Lỗi kết nối khi lấy thông tin chi tiết sản phẩm từ máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    // Delete variant handler
    const handleDeleteVariant = async (vId, sizeName, colorName) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa biến thể (Size: ${sizeName} - Màu: ${colorName}) này không?`)) {
            try {
                const response = await api.delete(`/api/products/variant/${vId}`);
                if (response.data && response.data.success) {
                    alert(response.data.message || "Xóa biến thể thành công!");
                    // Filter out variant locally
                    setVariants(variants.filter(v => v.id !== vId));
                }
            } catch (err) {
                console.error("Lỗi xóa biến thể:", err);
                const errMsg = err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : "Không thể xóa biến thể này. Vui lòng kiểm tra lại.";
                alert(errMsg);
            }
        }
    };

    // Load variant into edit form
    const startEditVariant = (v) => {
        setVariantId(v.id);
        setSelectedSizeId(v.sizeId || "");
        setSelectedColorId(v.colorId || "");
        setPrice(v.price || "");
        setQuantity(v.quantity || "");
        setShowNewSizeField(false);
        setShowNewColorField(false);
        setNewSizeName("");
        setNewColorName("");
    };

    // Reset variant form states
    const resetVariantForm = () => {
        setVariantId(null);
        setSelectedSizeId("");
        setSelectedColorId("");
        setPrice("");
        setQuantity("");
        setShowNewSizeField(false);
        setShowNewColorField(false);
        setNewSizeName("");
        setNewColorName("");
    };

    // Submit variant form handler
    const handleVariantSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            productId: parseInt(id),
            variantId: variantId,
            sizeId: showNewSizeField ? null : (selectedSizeId ? parseInt(selectedSizeId) : null),
            colorId: showNewColorField ? null : (selectedColorId ? parseInt(selectedColorId) : null),
            newSizeName: showNewSizeField ? newSizeName : "",
            newColorName: showNewColorField ? newColorName : "",
            price: parseFloat(price),
            quantity: parseInt(quantity)
        };

        try {
            const response = await api.post("/api/products/variant/save", payload);
            if (response.data && response.data.success) {
                alert(response.data.message || "Lưu biến thể sản phẩm thành công!");
                resetVariantForm();
                // Refresh data to show new / edited variant list and sizes/colors list
                fetchProductDetails();
            }
        } catch (err) {
            console.error("Lỗi lưu biến thể:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể lưu biến thể sản phẩm. Vui lòng kiểm tra lại.";
            alert(errMsg);
        }
    };

    const getImageUrl = (image) => {
        const url = typeof image === 'string' ? image : image?.url;
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
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
                alert("Không thể xóa ảnh này.");
            }
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            try {
                const response = await api.post(`/api/products/${id}/image`, { imageBase64: base64String });
                if (response.data && response.data.success) {
                    fetchProductDetails(); // Refresh to get new image list with IDs
                }
            } catch (err) {
                console.error("Lỗi upload ảnh:", err);
                alert("Không thể tải ảnh lên.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSetPrimary = async (imageId) => {
        try {
            const response = await api.post(`/api/products/image/${imageId}/set-primary`);
            if (response.data && response.data.success) {
                fetchProductDetails(); // Refresh to update badge
            }
        } catch (err) {
            console.error("Lỗi đặt ảnh chính:", err);
            alert("Không thể đặt ảnh chính.");
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#fff' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI THÔNG TIN CHI TIẾT SẢN PHẨM...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error || !product) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI TẢI DỮ LIỆU</h3>
                    <p style={{ color: '#aaa', marginTop: '10px' }}>{error || "Không thể tìm thấy sản phẩm này trong kho."}</p>
                    <Link to="/admin/products" className="btn-cancel" style={{ marginTop: '20px' }}>
                        QUAY LẠI KHO
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <div className="header-left">
                    <span className="sub-title-neon">THÔNG TIN SẢN PHẨM</span>
                    <h1 className="cinematic-title-small">{product.productName}</h1>
                </div>
                <div className="header-right-actions">
                    <Link to="/admin/products" className="btn-back-outline">
                        <i className="bi bi-arrow-left"></i> QUAY LẠI
                    </Link>
                </div>
            </div>

            <div className="detail-grid-v2">
                <div className="grid-left-col">
                    {/* card (1) */}
                    <div className="card">
                        <h3 className="card-title">
                            <i className="bi bi-info-circle"></i> (1) THÔNG TIN CƠ BẢN
                        </h3>

                        <div className="info-row">
                            <div className="info-label">SKU</div>
                            <div className="info-value">{product.productCode}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">DANH MỤC</div>
                            <div className="info-value">{product.categoryName || "Chưa phân loại"}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">THƯƠNG HIỆU</div>
                            <div className="info-value">{product.brandName || "Chưa rõ"}</div>
                        </div>
                        <div className="info-row">
                            <div className="info-label">TRẠNG THÁI</div>
                            <div className="info-value">
                                <span className={`badge-status ${product.status === 1 ? "status-active" : "status-hidden"}`}>
                                    {product.status === 1 ? "Đang bán" : "Tạm ẩn"}
                                </span>
                            </div>
                        </div>
                        <div className="info-row description-row">
                            <div className="info-label">MÔ TẢ CHI TIẾT</div>
                            <div className="info-value description-text">
                                {product.description || "Chưa có mô tả."}
                            </div>
                        </div>
                    </div>

                    {/* card (3) */}
                    <div className="card">
                        <h3 className="card-title">
                            <i className="bi bi-plus-circle"></i> (3) THÊM BIẾN THẾ (SIZE/MÀU)
                        </h3>
                        <form onSubmit={handleVariantSubmit}>
                            <div className="form-row-grid-v">
                                <div className="form-group-custom">
                                    <label className="form-label-neon">Kích cỡ (Size) *</label>
                                    {showNewSizeField ? (
                                        <input
                                            type="text"
                                            className="form-input-neon"
                                            placeholder="Ví dụ: 38"
                                            value={newSizeName}
                                            onChange={(e) => setNewSizeName(e.target.value)}
                                            required
                                        />
                                    ) : (
                                        <select
                                            className="form-input-neon"
                                            value={selectedSizeId}
                                            onChange={(e) => setSelectedSizeId(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Chọn Size --</option>
                                            {sizes.map(s => (
                                                <option key={s.id} value={s.id}>Size {s.sizeName}</option>
                                            ))}
                                        </select>
                                    )}
                                    <span
                                        className="btn-link-action"
                                        style={{ marginTop: '5px' }}
                                        onClick={() => {
                                            setShowNewSizeField(!showNewSizeField);
                                            setSelectedSizeId("");
                                        }}
                                    >
                                        {showNewSizeField ? "Chọn size có sẵn" : "Nhập size mới"}
                                    </span>
                                </div>

                                <div className="form-group-custom">
                                    <label className="form-label-neon">Màu sắc (Color) *</label>
                                    {showNewColorField ? (
                                        <input
                                            type="text"
                                            className="form-input-neon"
                                            placeholder="Ví dụ: Đỏ"
                                            value={newColorName}
                                            onChange={(e) => setNewColorName(e.target.value)}
                                            required
                                        />
                                    ) : (
                                        <select
                                            className="form-input-neon"
                                            value={selectedColorId}
                                            onChange={(e) => setSelectedColorId(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Chọn Màu --</option>
                                            {colors.map(c => (
                                                <option key={c.id} value={c.id}>{sanitizeColorName(c.colorName)}</option>
                                            ))}
                                        </select>
                                    )}
                                    <span
                                        className="btn-link-action"
                                        style={{ marginTop: '5px' }}
                                        onClick={() => {
                                            setShowNewColorField(!showNewColorField);
                                            setSelectedColorId("");
                                        }}
                                    >
                                        {showNewColorField ? "Chọn màu có sẵn" : "Nhập màu mới"}
                                    </span>
                                </div>
                            </div>

                            <div className="form-row-grid-v" style={{ marginTop: '20px' }}>
                                <div className="form-group-custom">
                                    <label className="form-label-neon">Giá bán (VNĐ) *</label>
                                    <input
                                        type="number"
                                        min="5000"
                                        className="form-input-neon"
                                        placeholder="Ví dụ: 1500000"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group-custom">
                                    <label className="form-label-neon">Số lượng kho *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="form-input-neon"
                                        placeholder="Ví dụ: 100"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-actions-custom" style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                                <button type="submit" className="btn-red-skew" style={{ padding: '12px 25px' }}>
                                    {variantId ? "CẬP NHẬT BIẾN THỂ" : "LƯU BIẾN THỂ"}
                                </button>
                                {variantId && (
                                    <button type="button" className="btn-cancel" onClick={resetVariantForm}>
                                        HỦY BỎ
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="grid-right-col">
                    {/* card (2) */}
                    <div className="card">
                        <h3 className="card-title">
                            <i className="bi bi-box-seam"></i> (2) DANH SÁCH SIZE & MÀU (BIẾN THỂ)
                        </h3>
                        {variants.length === 0 ? (
                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '13px', margin: '20px 0' }}>Sản phẩm này chưa được tạo biến thể nào.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="variant-table">
                                    <thead>
                                        <tr>
                                            <th>KÍCH CỠ</th>
                                            <th>MÀU SẮC</th>
                                            <th>GIÁ BÁN</th>
                                            <th>KHO HÀNG</th>
                                            <th style={{ textAlign: "right" }}>HÀNH ĐỘNG</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v) => (
                                            <tr key={v.id}>
                                                <td>Size {v.sizeName}</td>
                                                <td>{sanitizeColorName(v.colorName)}</td>
                                                <td className="price-value">
                                                    {v.price.toLocaleString("vi-VN")} ₫
                                                </td>
                                                <td>{v.quantity} đôi</td>
                                                <td style={{ textAlign: "right" }}>
                                                    <div style={{ display: 'inline-flex', gap: '15px' }}>
                                                        <button
                                                            onClick={() => startEditVariant(v)}
                                                            title="Chỉnh sửa biến thể"
                                                            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '16px', cursor: 'pointer' }}
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVariant(v.id, v.sizeName, v.colorName)}
                                                            className="delete-variant-btn"
                                                            title="Xóa biến thể"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* card (4) */}
                    <div className="card">
                        <h3 className="card-title">
                            <i className="bi bi-images"></i> (4) THƯ VIỆN ẢNH
                        </h3>
                        <div className="gallery-section">
                            <label className="gallery-section-label">Hình ảnh hiện tại</label>
                            <div className="img-grid">
                                {images.map((img, index) => (
                                    <div key={index} className="gallery-item">
                                        {img.isPrimary && <span className="badge-primary-img">ẢNH CHÍNH</span>}
                                        <img src={getImageUrl(img)} className="img-item" alt="Ảnh sản phẩm" />
                                        <div className="img-footer-bar">
                                            <button
                                                className={`btn-footer-action star ${img.isPrimary ? 'active' : ''}`}
                                                onClick={() => handleSetPrimary(img.id)}
                                                disabled={img.isPrimary}
                                            >
                                                <i className={`bi ${img.isPrimary ? 'bi-star-fill' : 'bi-star'}`}></i> Đặt chính
                                            </button>
                                            <button
                                                className="btn-footer-action trash"
                                                onClick={() => handleDeleteImage(img.id)}
                                            >
                                                <i className="bi bi-trash"></i> Xóa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="upload-section" style={{ marginTop: '30px' }}>
                            <label className="gallery-section-label">Tải thêm ảnh mới</label>
                            <label className="upload-placeholder-full">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />
                                <div className="upload-content-v">
                                    <i className="bi bi-cloud-arrow-up"></i>
                                    <span>BẤM VÀO ĐỂ TẢI ẢNH LÊN</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

                            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding: 10px 0; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; text-transform: uppercase; font-family: 'Oswald'; }
                .cinematic-title-small { font-family: 'Oswald', sans-serif; font-size: 30px; font-weight: 800; color: #000; margin: 0; text-transform: uppercase; line-height: 1.1; }
                .header-right-actions { display: flex; align-items: center; }

                .btn-back-outline { 
                    border: 1px solid #e2e8f0; color: #000; padding: 10px 20px; font-family: 'Oswald', sans-serif; font-weight: 800; 
                    text-transform: uppercase; font-size: 12px; transition: 0.3s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
                    background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-radius: 8px;
                }
                .btn-back-outline:hover { background: #000; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }

                /* 6:4 Grid Layout */
                .detail-grid-v2 { display: grid; grid-template-columns: 4fr 6fr; gap: 30px; margin-top: 25px; align-items: start; }
                .grid-left-col, .grid-right-col { display: flex; flex-direction: column; gap: 30px; }

                .card { background: #fff; border: 1px solid #e2e8f0; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 12px; }
                .card-title { font-family: 'Oswald'; color: #000; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; display: inline-block; text-transform: uppercase; }

                .info-row { display: grid; grid-template-columns: 140px 1fr; border-bottom: 1px solid #f1f5f9; padding: 12px 0; align-items: center; }
                .info-row:last-child { border-bottom: none; }
                .info-label { font-size: 13px; font-weight: 800; font-family: 'Oswald'; color: #000; text-transform: uppercase; }
                .info-value { font-size: 14px; color: #000; font-weight: 600; }
                .description-row { align-items: flex-start; }
                .description-text { line-height: 1.6; }

                .badge-status { font-size: 11px; font-weight: 800; padding: 6px 12px; text-transform: uppercase; font-family: 'Oswald'; border: 1px solid #e2e8f0; border-radius: 6px; }
                .status-active { background: #4ade80; color: #000; }
                .status-hidden { background: var(--accent-red); color: #fff; }

                /* Premium Form Controls */
                .form-row-grid-v { display: grid; grid-template-columns: 1fr; gap: 20px; }
                .form-group-custom { display: flex; flex-direction: column; }
                .form-label-neon { font-size: 13px; color: #000; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; margin-bottom: 8px; }
                .form-input-neon { background: #fff; border: 1.5px solid #dadce0; color: #3c4043; padding: 12px 15px; outline: none; transition: 0.2s; font-size: 14px; border-radius: 8px; font-weight: 500; box-shadow: none; }
                .form-input-neon:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
                
                .btn-link-action { font-size: 12px; color: #000; font-weight: 800; text-decoration: underline; cursor: pointer; transition: 0.2s; font-family: 'Oswald'; text-transform: uppercase; }
                .btn-link-action:hover { color: var(--accent-red); }

                .variant-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                .variant-table th { background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; padding: 15px; border: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; font-family: 'Oswald'; }
                .variant-table td { padding: 15px; border: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 500; background: #fff; }

                .btn-red-skew { 
                    background: #fff; color: #000; border: none; padding: 10px 25px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;
                }
                .btn-red-skew:hover { background: #000; color: #fff; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
                .btn-cancel {
                    background: #fff; color: #000; border: 1px solid #dadce0; padding: 10px 25px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none; box-shadow: none; border-radius: 8px;
                }
                .btn-cancel:hover { background: #f8fafc; transform: translateY(-3px); }

                /* Gallery Management V3 - Sectional Design */
                .gallery-section-label { 
                    display: block; color: #000; font-size: 13px; font-weight: 800; text-transform: uppercase; 
                    margin-bottom: 15px; font-family: 'Oswald', sans-serif;
                }
                
                .img-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; 
                }

                .gallery-item { 
                    position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; border: 1px solid #e2e8f0; 
                    background: #fff; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                .badge-primary-img { 
                    position: absolute; top: 10px; left: 10px; background: #fff; color: #000; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 900; 
                    padding: 4px 8px; list-style: none; font-family: 'Oswald', sans-serif; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border-radius: 4px;
                }

                .img-item { width: 100%; flex: 1; object-fit: cover; }

                .img-footer-bar { 
                    background: #f8fafc; display: flex; justify-content: space-between; padding: 10px; border-top: 1px solid #e2e8f0;
                }
                
                .btn-footer-action { 
                    background: #fff; border: 1px solid #e2e8f0; font-size: 12px; font-family: 'Oswald'; font-weight: 800; display: flex; align-items: center; gap: 6px; 
                    cursor: pointer; transition: 0.2s; color: #000; padding: 4px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-transform: uppercase; border-radius: 6px;
                }
                .btn-footer-action.star:hover { background: #ffd700; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .btn-footer-action.star.active { background: #ffd700; cursor: default; box-shadow: none; transform: none; }
                .btn-footer-action.trash { color: #e50914 !important; }
                .btn-footer-action.trash:hover { background: #000 !important; color: #fff !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(229,9,20,0.2); }
                .btn-footer-action i { font-size: 12px; }
                
                .upload-placeholder-full { 
                    border: 2px dashed #dadce0; border-radius: 12px; display: flex; align-items: center; justify-content: center; 
                    height: 150px; background: #fff; cursor: pointer; transition: 0.3s; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .upload-placeholder-full:hover { border-color: #1a73e8; background: #f8fafc; transform: translateY(-3px); }
                .upload-content-v { text-align: center; color: #9aa0a6; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .upload-content-v i { font-size: 32px; }
                .upload-content-v span { font-size: 14px; font-weight: 800; font-family: 'Oswald'; letter-spacing: 1px; }

                .delete-variant-btn { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; cursor: pointer; font-size: 14px; box-shadow: none; }
                .delete-variant-btn:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); transform: translateY(-2px); }

                @media (max-width: 1200px) {
                    .detail-grid-v2 { grid-template-columns: 1fr; }
                }
            `}</style>
        </AdminLayout>
    );
};

export default AdminProductDetail;
