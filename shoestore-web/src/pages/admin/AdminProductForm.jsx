import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './AdminProductForm.css';

const translateColorToVietnamese = (name) => {
    if (!name) return "";
    let clean = name.trim();
    const map = {
        'black': 'Đen',
        'white': 'Trắng',
        'red': 'Đỏ',
        'blue': 'Xanh dương',
        'green': 'Xanh lá',
        'yellow': 'Vàng',
        'pink': 'Hồng',
        'grey': 'Xám',
        'gray': 'Xám',
        'brown': 'Nâu',
        'navy': 'Xanh navy',
        'purple': 'Tím',
        'orange': 'Cam',
        'beige': 'Kem'
    };
    const lower = clean.toLowerCase();
    if (map[lower]) return map[lower];

    return clean
        .replace(/Tr\?ng/gi, "Trắng")
        .replace(/Đ\?/gi, "Đỏ")
        .replace(/Xanh l\?/gi, "Xanh lá")
        .replace(/V\?ng/gi, "Vàng")
        .replace(/H\?ng/gi, "Hồng");
};

const AdminProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

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

    // AI Vision states
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiSuccessMsg, setAiSuccessMsg] = useState('');
    const [aiImageBase64, setAiImageBase64] = useState('');
    const [aiImagesBase64List, setAiImagesBase64List] = useState([]);

    // Multi-select sizes & colors state
    const [selectedSizeIds, setSelectedSizeIds] = useState([]);
    const [selectedColorIds, setSelectedColorIds] = useState([]);

    const handleResetAiForm = () => {
        if (window.confirm("Bạn có chắc chắn muốn HỦY & XÓA TOÀN BỘ dữ liệu do AI điền tự động để làm mới không?")) {
            setProduct({
                productName: '',
                description: '',
                status: 1,
                brandName: '',
                categoryId: ''
            });
            setVariant({
                sizeId: '',
                colorId: '',
                price: '',
                quantity: ''
            });
            setSelectedSizeIds([]);
            setSelectedColorIds([]);
            setAiImageBase64('');
            setAiImagesBase64List([]);
            setImages([]);
            setAiSuccessMsg('');
        }
    };

    const handleSizeToggle = (sizeId) => {
        setSelectedSizeIds(prev => 
            prev.includes(sizeId) ? prev.filter(id => id !== sizeId) : [...prev, sizeId]
        );
    };

    const toggleSelectAllSizes = () => {
        if (sizes.length > 0 && selectedSizeIds.length === sizes.length) {
            setSelectedSizeIds([]);
        } else {
            setSelectedSizeIds(sizes.map(s => String(s.id)));
        }
    };

    const handleColorToggle = (colorId) => {
        setSelectedColorIds(prev => 
            prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]
        );
    };

    const toggleSelectAllColors = () => {
        if (colors.length > 0 && selectedColorIds.length === colors.length) {
            setSelectedColorIds([]);
        } else {
            setSelectedColorIds(colors.map(c => String(c.id)));
        }
    };

    const handleAiAutoFill = async (e) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        const readFileAsDataUrl = (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        };

        try {
            setAiAnalyzing(true);
            setAiSuccessMsg('');

            const base64List = await Promise.all(files.map(readFileAsDataUrl));
            const firstBase64 = base64List[0];

            setAiImageBase64(firstBase64);
            setAiImagesBase64List(base64List);

            // Set gallery images preview: Image 1 is Primary!
            const previewImages = base64List.map((url, idx) => ({
                url,
                isPrimary: idx === 0
            }));
            setImages(previewImages);

            // Send first image to AI Vision for product extraction
            const response = await api.post('/api/products/ai-extract', { imageBase64: firstBase64 });
            if (response.data && response.data.success) {
                const data = response.data;
                setProduct(prev => ({
                    ...prev,
                    productName: data.productName || prev.productName,
                    description: data.description || prev.description,
                    brandName: data.brandName || prev.brandName,
                    categoryId: data.categoryId || prev.categoryId
                }));

                // Dynamic Brand Option insertion if missing in dropdown
                if (data.brandName) {
                    setBrands(prevBrands => {
                        const exists = prevBrands.some(b => b.brandName && b.brandName.toLowerCase() === data.brandName.toLowerCase());
                        if (!exists) {
                            return [{ id: Date.now(), brandName: data.brandName }, ...prevBrands];
                        }
                        return prevBrands;
                    });
                }

                // Dynamic Color Option insertion if missing in dropdown
                if (data.colorId && data.colorName) {
                    const vnColorName = translateColorToVietnamese(data.colorName);
                    setColors(prevColors => {
                        const exists = prevColors.some(c => String(c.id) === String(data.colorId) || c.colorName.toLowerCase() === vnColorName.toLowerCase());
                        if (!exists) {
                            return [{ id: data.colorId, colorName: vnColorName }, ...prevColors];
                        }
                        return prevColors;
                    });
                }

                if (!isEdit) {
                    // Auto-select ALL sizes on AI auto-fill
                    if (sizes.length > 0) {
                        setSelectedSizeIds(sizes.map(s => String(s.id)));
                    }
                    // Auto-select color in selectedColorIds
                    if (data.colorId) {
                        setSelectedColorIds([String(data.colorId)]);
                    } else if (colors.length > 0) {
                        setSelectedColorIds([String(colors[0].id)]);
                    }

                    setVariant(prev => ({
                        ...prev,
                        price: prev.price || '1500000',
                        quantity: prev.quantity || '100'
                    }));
                }

                const countMsg = files.length > 1 ? ` Đã nạp ${files.length} ảnh (Ảnh 1 tự động chọn làm Ảnh chính).` : '';
                setAiSuccessMsg(`AI đã trích xuất & tự động điền 100% dữ liệu: Tên sản phẩm, Thương hiệu (${data.brandName}), Danh mục (${data.categoryName || 'Tự động'}), Mô tả, Tất cả Sizes, Màu sắc, Giá bán & Số lượng!`);
            } else {
                alert(response.data?.message || "Không thể phân tích ảnh bằng AI.");
            }
        } catch (err) {
            console.error("Lỗi AI Auto-fill:", err);
            const errMsg = err.response?.data?.message || err.message || "Lỗi khi kết nối với AI Vision.";
            alert(errMsg);
        } finally {
            setAiAnalyzing(false);
        }
    };

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

                // Deduplicate sizes by sizeName
                const uniqueSizesMap = new Map();
                (metaResponse.data.sizes || []).forEach(s => {
                    if (s.sizeName && !uniqueSizesMap.has(s.sizeName.trim())) {
                        uniqueSizesMap.set(s.sizeName.trim(), s);
                    }
                });
                const cleanSizes = Array.from(uniqueSizesMap.values()).sort((a, b) => {
                    const numA = parseInt(a.sizeName), numB = parseInt(b.sizeName);
                    return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.sizeName.localeCompare(b.sizeName);
                });
                setSizes(cleanSizes);

                // Deduplicate colors & translate English names to Vietnamese
                const uniqueColorsMap = new Map();
                (metaResponse.data.colors || []).forEach(c => {
                    const vnName = translateColorToVietnamese(c.colorName);
                    if (vnName && !uniqueColorsMap.has(vnName.toLowerCase())) {
                        uniqueColorsMap.set(vnName.toLowerCase(), { ...c, colorName: vnName });
                    }
                });
                setColors(Array.from(uniqueColorsMap.values()));
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
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleDeleteImage = async (imageId, index) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa ảnh này không?")) {
            if (!id || !imageId || typeof imageId !== 'number') {
                setImages(prev => {
                    const next = prev.filter((_, idx) => idx !== index && prev[idx].id !== imageId);
                    if (next.length > 0 && !next.some(img => img.isPrimary)) {
                        next[0].isPrimary = true;
                    }
                    return next;
                });
                return;
            }

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
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        const readFileAsDataUrl = (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        };

        if (!id) {
            // Cho phép nhập thủ công: Nạp trực tiếp Base64 vào bộ nhớ xem trước
            const base64List = await Promise.all(files.map(readFileAsDataUrl));
            setAiImagesBase64List(prev => [...prev, ...base64List]);
            if (!aiImageBase64 && base64List.length > 0) {
                setAiImageBase64(base64List[0]);
            }

            setImages(prev => {
                const hasPrimary = prev.some(img => img.isPrimary);
                const newImgObjs = base64List.map((url, idx) => ({
                    url,
                    isPrimary: !hasPrimary && idx === 0
                }));
                return [...prev, ...newImgObjs];
            });
            return;
        }

        try {
            const base64List = await Promise.all(files.map(readFileAsDataUrl));
            for (const base64String of base64List) {
                await api.post(`/api/products/${id}/image`, { imageBase64: base64String });
            }
            loadFormData(); // Refresh
        } catch (err) {
            console.error("Lỗi upload ảnh:", err);
            alert("Không thể tải ảnh lên.");
        }
    };

    const handleSetPrimary = async (imageId, index) => {
        if (!id || !imageId || typeof imageId !== 'number') {
            setImages(prev => prev.map((img, idx) => ({
                ...img,
                isPrimary: (imageId && img.id === imageId) || (!imageId && idx === index)
            })));
            return;
        }

        try {
            const response = await api.post(`/api/products/image/${imageId}/set-primary`);
            if (response.data && response.data.success) {
                loadFormData(); // Refresh to update badge
            }
        } catch (err) {
            console.error("Lỗi đặt ảnh chính:", err);
            alert("Không thể đặt ảnh chính.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const allBase64Images = images
            .map(img => typeof img === 'string' ? img : img?.url)
            .filter(url => url && url.startsWith('data:'));

        const productPayload = {
            id: isEdit ? parseInt(id) : null,
            productName: product.productName,
            description: product.description,
            status: product.status,
            brandName: product.brandName,
            categoryId: product.categoryId ? parseInt(product.categoryId) : null,
            imageBase64: allBase64Images.length > 0 ? allBase64Images[0] : (aiImageBase64 || null),
            imagesBase64: allBase64Images.length > 0 ? allBase64Images : (aiImagesBase64List.length > 0 ? aiImagesBase64List : null)
        };

        try {
            // 1. Save product basic details
            const prodResponse = await api.post('/api/products/save', productPayload);
            if (prodResponse.data && prodResponse.data.success) {
                const savedProductId = prodResponse.data.productId;

                // 2. If CREATE mode, seed variants for ALL selected sizes x ALL selected colors
                const targetSizeIds = selectedSizeIds.length > 0 ? selectedSizeIds : (variant.sizeId ? [variant.sizeId] : (sizes.length > 0 ? [String(sizes[0].id)] : []));
                const targetColorIds = selectedColorIds.length > 0 ? selectedColorIds : (variant.colorId ? [variant.colorId] : (colors.length > 0 ? [String(colors[0].id)] : []));

                if (!isEdit && targetSizeIds.length > 0 && targetColorIds.length > 0 && variant.price && variant.quantity) {
                    for (const sId of targetSizeIds) {
                        for (const cId of targetColorIds) {
                            const variantPayload = {
                                productId: savedProductId,
                                variantId: null,
                                sizeId: parseInt(sId),
                                colorId: parseInt(cId),
                                price: parseFloat(variant.price),
                                quantity: parseInt(variant.quantity)
                            };
                            try {
                                await api.post('/api/products/variant/save', variantPayload);
                            } catch (vErr) {
                                console.error("Lỗi lưu biến thể cho size " + sId + ", color " + cId, vErr);
                            }
                        }
                    }
                }

                alert(isEdit ? 'Cập nhật sản phẩm thành công!' : 'Tạo mới sản phẩm thành công!');
                navigate(`/admin/products/detail/${savedProductId}`);
            }
        } catch (err) {
            console.error("Lỗi lưu sản phẩm:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể lưu sản phẩm. Vui lòng kiểm tra lại.";
            alert(errMsg);
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

                    {/* AI Vision Feature Banner */}
                    <div className="ai-banner-card">
                        <div className="ai-banner-header">
                            <div>
                                <h3 className="ai-title">
                                    <i className="bi bi-cpu-fill" style={{ color: '#8b5cf6' }}></i> ĐIỀN THÔNG TIN TỰ ĐỘNG BẰNG AI VISION
                                    <span className="ai-badge">100%</span>
                                </h3>
                                <p className="ai-subtitle">
                                    Chỉ cần tải 1 hoặc nhiều ảnh sản phẩm — AI tự động điền Tên, Thương hiệu, Danh mục, Màu sắc, Sizes, Mô tả & lưu trọn bộ thư viện ảnh.
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label className="btn-ai-upload">
                                    <input type="file" accept="image/*" multiple onChange={handleAiAutoFill} hidden disabled={aiAnalyzing} />
                                    {aiAnalyzing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            AI ĐANG PHÂN TÍCH...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-cloud-arrow-up-fill"></i> {aiSuccessMsg ? 'TẠO MỚI (TẢI LẠI ẢNH)' : 'TẢI ẢNH ĐỂ ĐIỀN TỰ ĐỘNG'}
                                        </>
                                    )}
                                </label>

                                {aiSuccessMsg && (
                                    <button
                                        type="button"
                                        className="btn-ai-reset"
                                        onClick={handleResetAiForm}
                                        title="Hủy dữ liệu AI vừa điền"
                                    >
                                        <i className="bi bi-trash-fill"></i> HỦY DỮ LIỆU AI
                                    </button>
                                )}
                            </div>
                        </div>
                        {aiSuccessMsg && (
                            <div className="ai-alert-success">
                                <i className="bi bi-check-circle-fill" style={{ fontSize: '18px' }}></i> {aiSuccessMsg}
                            </div>
                        )}
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
                                    <h3 className="card-custom-title font-oswald"><i className="bi bi-box-seam"></i> CẤU HÌNH BIẾN THỂ BAN ĐẦU</h3>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label className="form-label" style={{ color: 'var(--accent-cyan)' }}>* Chọn các Size và Màu sắc để tự động tạo toàn bộ biến thể ban đầu cho sản phẩm.</label>
                                    </div>

                                    {/* Multi-select Size Chips with Select All button */}
                                    <div className="form-group mb-4">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label className="form-label mb-0">KÍCH CỠ (SIZE) * ({selectedSizeIds.length} ĐÃ CHỌN)</label>
                                            <button
                                                type="button"
                                                className="btn-select-all-sizes"
                                                onClick={toggleSelectAllSizes}
                                            >
                                                <i className={`bi ${sizes.length > 0 && selectedSizeIds.length === sizes.length ? 'bi-check-square-fill' : 'bi-square'}`}></i> CHỌN TẤT CẢ ({sizes.length} SIZES)
                                            </button>
                                        </div>
                                        <div className="sizes-checkbox-grid">
                                            {sizes.map(s => {
                                                const isChecked = selectedSizeIds.includes(String(s.id));
                                                return (
                                                    <label key={s.id} className={`size-chip-label ${isChecked ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            hidden
                                                            checked={isChecked}
                                                            onChange={() => handleSizeToggle(String(s.id))}
                                                        />
                                                        <span>Size {s.sizeName}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Multi-select Color Chips with Select All button */}
                                    <div className="form-group mb-4" style={{ marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <label className="form-label mb-0">MÀU SẮC * ({selectedColorIds.length} ĐÃ CHỌN)</label>
                                            <button
                                                type="button"
                                                className="btn-select-all-sizes"
                                                onClick={toggleSelectAllColors}
                                            >
                                                <i className={`bi ${colors.length > 0 && selectedColorIds.length === colors.length ? 'bi-check-square-fill' : 'bi-square'}`}></i> CHỌN TẤT CẢ ({colors.length} MÀU)
                                            </button>
                                        </div>
                                        <div className="sizes-checkbox-grid">
                                            {colors.map(c => {
                                                const isChecked = selectedColorIds.includes(String(c.id));
                                                const cName = translateColorToVietnamese(c.colorName);
                                                return (
                                                    <label key={c.id} className={`size-chip-label ${isChecked ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            hidden
                                                            checked={isChecked}
                                                            onChange={() => handleColorToggle(String(c.id))}
                                                        />
                                                        <span>{cName}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="variant-row" style={{ marginTop: '20px' }}>
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
                                            <label className="form-label">Số lượng nhập kho (Mỗi màu & size) *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="1000"
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
                                                        <button type="button" className={`set-primary-trigger ${img.isPrimary ? 'active' : ''}`} onClick={() => handleSetPrimary(img.id, idx)} disabled={img.isPrimary}>
                                                            <i className={`bi ${img.isPrimary ? 'bi-star-fill' : 'bi-star'}`}></i> Đặt chính
                                                        </button>
                                                        <button type="button" className="delete-trigger" onClick={() => handleDeleteImage(img.id, idx)}>
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
                                        <input type="file" multiple onChange={handleImageUpload} hidden accept="image/*" />
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
        </AdminLayout>
    );
};

export default AdminProductForm;
