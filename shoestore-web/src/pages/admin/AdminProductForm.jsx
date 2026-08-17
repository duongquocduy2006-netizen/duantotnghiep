import React, { useEffect, useRef, useState } from 'react';
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

// ─── Validation ──────────────────────────────────────────────────────────────
const SIZE_MIN = 16;
const SIZE_MAX = 50;

const validateSize = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập size.";
    if (!/^\d+(\.\d+)?$/.test(trimmed))
        return "Size phải là số (VD: 38, 39…). Không được nhập chữ.";
    const num = parseFloat(trimmed);
    if (num < SIZE_MIN || num > SIZE_MAX)
        return `Size hợp lệ từ ${SIZE_MIN} đến ${SIZE_MAX}.`;
    return null;
};

const validateColor = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập tên màu.";
    if (/\d/.test(trimmed)) return "Tên màu không được chứa số.";
    if (/^[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]+$/.test(trimmed))
        return "Tên màu không hợp lệ.";
    if (trimmed.length < 2) return "Tên màu quá ngắn (tối thiểu 2 ký tự).";
    if (trimmed.length > 30) return "Tên màu không được quá 30 ký tự.";
    return null;
};

// ─── TagInput Component ──────────────────────────────────────────────────────
const TagInput = ({ label, tags, onAdd, onRemove, onEdit, onClearAll, placeholder, icon, presets = [], validate, hint }) => {
    const [inputVal, setInputVal] = useState("");
    const [editingIdx, setEditingIdx] = useState(null);
    const [editVal, setEditVal] = useState("");
    const [error, setError] = useState("");
    const inputRef = useRef(null);

    const handleAdd = (val = inputVal.trim()) => {
        if (!val) return;
        if (validate) {
            const err = validate(val);
            if (err) { setError(err); return; }
        }
        const dup = tags.some(t => t.toLowerCase() === val.toLowerCase());
        if (dup) { setError(`"${val}" đã tồn tại trong danh sách!`); return; }
        onAdd(val);
        setInputVal("");
        setError("");
        inputRef.current?.focus();
    };

    const handleAddAllPresets = () => {
        presets.forEach(p => {
            const dup = tags.some(t => t.toLowerCase() === p.toLowerCase());
            if (!dup) {
                if (validate) {
                    const err = validate(p);
                    if (!err) onAdd(p);
                } else {
                    onAdd(p);
                }
            }
        });
        setError("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    };

    const startEdit = (idx) => {
        setEditingIdx(idx);
        setEditVal(tags[idx]);
        setError("");
    };

    const commitEdit = (idx) => {
        const val = editVal.trim();
        if (!val) { cancelEdit(); return; }
        if (validate) {
            const err = validate(val);
            if (err) { setError(err); return; }
        }
        const dup = tags.some((t, i) => i !== idx && t.toLowerCase() === val.toLowerCase());
        if (dup) { setError(`"${val}" đã tồn tại!`); return; }
        onEdit(idx, val);
        setEditingIdx(null);
        setEditVal("");
        setError("");
    };

    const cancelEdit = () => {
        setEditingIdx(null);
        setEditVal("");
        setError("");
    };

    return (
        <div className="tag-input-section">
            <div className="tag-input-header">
                <label className="tag-input-label">
                    {icon && <i className={`bi ${icon}`}></i>} {label}
                </label>
                <div className="tag-action-btns">
                    {presets.length > 0 && (
                        <button
                            type="button"
                            className="btn-tag-action btn-add-all"
                            onClick={handleAddAllPresets}
                            title="Thêm tất cả tùy chọn"
                        >
                            <i className="bi bi-check-all"></i> THÊM TẤT CẢ
                        </button>
                    )}
                    {tags.length > 0 && onClearAll && (
                        <button
                            type="button"
                            className="btn-tag-action btn-clear-all"
                            onClick={onClearAll}
                            title="Xóa tất cả tùy chọn"
                        >
                            <i className="bi bi-trash"></i> XÓA TẤT CẢ
                        </button>
                    )}
                </div>
            </div>

            {hint && <p className="tag-hint">{hint}</p>}

            {presets.length > 0 && (
                <div className="preset-chips">
                    {presets.map((p) => {
                        const selected = tags.some(t => t.toLowerCase() === p.toLowerCase());
                        return (
                            <button
                                key={p}
                                type="button"
                                className={`preset-chip ${selected ? "selected" : ""}`}
                                onClick={() => !selected && handleAdd(p)}
                                title={selected ? "Đã chọn" : `Thêm "${p}"`}
                            >
                                {selected ? <i className="bi bi-check2"></i> : <i className="bi bi-plus"></i>}
                                {p}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className={`tag-input-bar ${error ? "has-error" : ""}`}>
                <input
                    ref={inputRef}
                    type="text"
                    className="tag-input-field"
                    placeholder={placeholder}
                    value={inputVal}
                    onChange={e => { setInputVal(e.target.value); setError(""); }}
                    onKeyDown={handleKeyDown}
                />
                <button type="button" className="tag-add-btn" onClick={() => handleAdd()}>
                    <i className="bi bi-plus-lg"></i> Thêm
                </button>
            </div>

            {error && (
                <div className="tag-error">
                    <i className="bi bi-exclamation-triangle-fill"></i> {error}
                </div>
            )}

            {tags.length > 0 && (
                <div className="tag-list">
                    {tags.map((tag, idx) => (
                        <div key={idx} className="tag-item">
                            {editingIdx === idx ? (
                                <input
                                    autoFocus
                                    type="text"
                                    className="tag-edit-input"
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") { e.preventDefault(); commitEdit(idx); }
                                        if (e.key === "Escape") cancelEdit();
                                    }}
                                    onBlur={() => commitEdit(idx)}
                                />
                            ) : (
                                <span className="tag-text" onClick={() => startEdit(idx)} title="Nhấp để sửa">
                                    {tag}
                                </span>
                            )}
                            <button
                                type="button"
                                className="tag-remove-btn"
                                onClick={() => onRemove(idx)}
                                title="Xóa"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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

    // Default bulk variant input
    const [variant, setVariant] = useState({
        sizeId: '',
        colorId: '',
        price: '',
        quantity: ''
    });

    // Per-variant custom price & quantity overrides for Create Mode: { [size-color]: { price, quantity } }
    const [variantOverrides, setVariantOverrides] = useState({});

    // Existing variants loaded for Edit Mode: [{ id, sizeId, sizeName, colorId, colorName, price, quantity, isModified }]
    const [existingVariants, setExistingVariants] = useState([]);

    // Dropdowns metadata
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [colors, setColors] = useState([]);

    const [images, setImages] = useState([]); // List of { id, url, isPrimary }
    const [tempImages, setTempImages] = useState([]); // Local temporary images
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errors, setErrors] = useState({});
    const [savedId, setSavedId] = useState(null);

    // AI Vision states
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [generatingDesc, setGeneratingDesc] = useState(false);
    const [aiSuccessMsg, setAiSuccessMsg] = useState('');
    const [aiImageBase64, setAiImageBase64] = useState('');
    const [aiImagesBase64List, setAiImagesBase64List] = useState([]);

    // Tag-input: selected size/color names
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);

    const handleGenerateAiDescription = async () => {
        let firstBase64 = aiImageBase64;
        if (!firstBase64 && images.length > 0) {
            const url = typeof images[0] === 'string' ? images[0] : images[0]?.url;
            if (url && url.startsWith('data:')) firstBase64 = url;
        }
        if (!firstBase64 && tempImages.length > 0) {
            firstBase64 = tempImages[0].imageBase64 || tempImages[0].url;
        }

        const trimmedName = product.productName ? product.productName.trim() : '';

        if (!firstBase64 && !trimmedName) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng nhập Tên sản phẩm hoặc Tải lên ít nhất 1 ảnh sản phẩm để AI Vision tạo mô tả.' }));
            return;
        }

        try {
            setGeneratingDesc(true);
            const response = await api.post('/api/products/ai-extract', {
                imageBase64: firstBase64 || null,
                productName: trimmedName || null
            });

            if (response.data && response.data.success) {
                const data = response.data;
                const rawDesc = data.description || '';
                const finalDesc = data.description || rawDesc;

                setProduct(prev => ({
                    ...prev,
                    productName: prev.productName || data.productName || '',
                    description: finalDesc,
                    brandName: prev.brandName || data.brandName || '',
                    categoryId: prev.categoryId || data.categoryId || ''
                }));

                if (data.brandName) {
                    setBrands(prevBrands => {
                        const exists = prevBrands.some(b => b.brandName && b.brandName.toLowerCase() === data.brandName.toLowerCase());
                        if (!exists) {
                            return [{ id: Date.now(), brandName: data.brandName }, ...prevBrands];
                        }
                        return prevBrands;
                    });
                }

                window.dispatchEvent(new CustomEvent('show-toast', { detail: '✨ AI Vision đã tự động tạo mô tả sản phẩm thành công!' }));
            } else {
                alert(response.data?.message || "Không thể tạo mô tả bằng AI.");
            }
        } catch (err) {
            console.error("Lỗi tạo mô tả AI:", err);
            const errMsg = err.response?.data?.message || err.message || "Lỗi khi kết nối với AI Vision.";
            alert(errMsg);
        } finally {
            setGeneratingDesc(false);
        }
    };

    const handleClearAiBasicInfo = () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa Tên sản phẩm và Mô tả chi tiết do AI vừa tạo ra không?")) {
            setProduct(prev => ({
                ...prev,
                productName: '',
                description: ''
            }));
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã xóa thông tin Tên & Mô tả sản phẩm.' }));
        }
    };

    const handleResetAiForm = () => {
        if (window.confirm("Bạn có chắc chắn muốn HỦY & XÓA TOÀN BỘ dữ liệu do AI điền tự động để làm mới không?")) {
            setProduct({ productName: '', description: '', status: 1, brandName: '', categoryId: '' });
            setVariant({ sizeId: '', colorId: '', price: '', quantity: '' });
            setSelectedSizes([]);
            setSelectedColors([]);
            setVariantOverrides({});
            setAiImageBase64('');
            setAiImagesBase64List([]);
            setImages([]);
            setAiSuccessMsg('');
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
            setAiImagesBase64List(prev => [...prev, ...base64List]);

            setImages(prev => {
                const hasPrimary = prev.some(img => img.isPrimary);
                const newImgObjs = base64List.map((url, idx) => ({
                    url,
                    isPrimary: !hasPrimary && idx === 0
                }));
                return [...prev, ...newImgObjs];
            });

            if (isEdit && id) {
                try {
                    for (let i = 0; i < base64List.length; i++) {
                        await api.post(`/api/products/${id}/image`, { imageBase64: base64List[i] });
                    }
                    const prodRes = await api.get(`/api/products/${id}`);
                    if (prodRes.data && prodRes.data.images) {
                        setImages(prodRes.data.images);
                    }
                } catch (imgErr) {
                    console.error("Lỗi tự động lưu ảnh AI lên server:", imgErr);
                }
            }

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

                if (data.brandName) {
                    setBrands(prevBrands => {
                        const exists = prevBrands.some(b => b.brandName && b.brandName.toLowerCase() === data.brandName.toLowerCase());
                        if (!exists) {
                            return [{ id: Date.now(), brandName: data.brandName }, ...prevBrands];
                        }
                        return prevBrands;
                    });
                }

                setAiSuccessMsg(`AI Vision đã trích xuất thành công: Tên sản phẩm, Thương hiệu (${data.brandName || ''}), Danh mục, Màu sắc & Mô tả!`);
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

    // Load form metadata and details if editing
    const loadFormData = async () => {
        try {
            setLoading(true);
            setError(null);

            const metaResponse = await api.get('/api/products/metadata');
            if (metaResponse.data && metaResponse.data.success) {
                setCategories(metaResponse.data.categories || []);
                setBrands(metaResponse.data.brands || []);

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

                    if (detailResponse.data.images && detailResponse.data.images.length > 0) {
                        setImages(detailResponse.data.images);
                    }

                    if (detailResponse.data.variants && detailResponse.data.variants.length > 0) {
                        const vars = detailResponse.data.variants.map(v => ({
                            id: v.id,
                            sizeId: v.sizeId,
                            sizeName: v.sizeName || '',
                            colorId: v.colorId,
                            colorName: translateColorToVietnamese(v.colorName || ''),
                            price: v.price !== null && v.price !== undefined ? v.price.toString() : '',
                            quantity: v.quantity !== null && v.quantity !== undefined ? v.quantity.toString() : '',
                            isModified: false
                        }));
                        setExistingVariants(vars);

                        // Collect unique size & color names for tag displays
                        const existingSizes = [...new Set(vars.map(v => v.sizeName).filter(Boolean))];
                        const existingColors = [...new Set(vars.map(v => v.colorName).filter(Boolean))];
                        setSelectedSizes(existingSizes);
                        setSelectedColors(existingColors);
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
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể xóa ảnh này.' }));
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
            loadFormData();
        } catch (err) {
            console.error("Lỗi upload ảnh:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể tải ảnh lên.' }));
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
                loadFormData();
            }
        } catch (err) {
            console.error("Lỗi đặt ảnh chính:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể đặt ảnh chính.' }));
        }
    };

    // Helper: find size/color ID from name
    const getSizeId = (name) => { const s = sizes.find(s => s.sizeName.trim().toLowerCase() === name.trim().toLowerCase()); return s ? s.id : null; };
    const getColorId = (name) => { const c = colors.find(c => translateColorToVietnamese(c.colorName).toLowerCase() === name.trim().toLowerCase()); return c ? c.id : null; };

    // Direct cell change handler for Create mode: overrides specific combo price or quantity
    const handleOverrideChange = (size, color, field, value) => {
        const key = `${size}-${color}`;
        setVariantOverrides(prev => ({
            ...prev,
            [key]: {
                price: field === 'price' ? value : (prev[key]?.price ?? variant.price),
                quantity: field === 'quantity' ? value : (prev[key]?.quantity ?? variant.quantity)
            }
        }));
    };

    // Direct cell change handler for Edit mode: existing variant row
    const handleExistingVariantChange = (index, field, value) => {
        setExistingVariants(prev => prev.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value, isModified: true };
            }
            return item;
        }));
    };

    // Save individual variant directly to backend
    const handleSaveSingleVariant = async (vItem, productId = id) => {
        if (!productId) return;
        if (!vItem.price || parseFloat(vItem.price) <= 5000) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Giá bán phải lớn hơn 5,000 VNĐ.' }));
            return;
        }
        if (!vItem.quantity || parseInt(vItem.quantity) < 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Số lượng tồn kho phải lớn hơn 0.' }));
            return;
        }

        try {
            const sizeId = vItem.sizeId || getSizeId(vItem.sizeName);
            const colorId = vItem.colorId || getColorId(vItem.colorName);

            const payload = {
                productId: parseInt(productId),
                variantId: vItem.id || null,
                sizeId,
                colorId,
                newSizeName: sizeId ? '' : vItem.sizeName,
                newColorName: colorId ? '' : vItem.colorName,
                price: parseFloat(vItem.price),
                quantity: parseInt(vItem.quantity)
            };

            const res = await api.post('/api/products/variant/save', payload);
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || 'Đã cập nhật biến thể thành công!' }));
                if (isEdit) loadFormData();
            }
        } catch (vErr) {
            console.error('Lỗi cập nhật biến thể:', vErr);
            const msg = vErr.response?.data?.message || 'Không thể lưu biến thể này.';
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: ${msg}` }));
        }
    };

    // Delete existing variant in Edit mode
    const handleDeleteExistingVariant = async (variantId, index) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa biến thể này khỏi sản phẩm?")) {
            if (!variantId) {
                setExistingVariants(prev => prev.filter((_, idx) => idx !== index));
                return;
            }

            try {
                const response = await api.delete(`/api/products/variant/${variantId}`);
                if (response.data && response.data.success) {
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Xóa biến thể thành công!" }));
                    setExistingVariants(prev => prev.filter(v => v.id !== variantId));
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data?.message || "Không thể xóa biến thể này." }));
                }
            } catch (err) {
                console.error("Lỗi xóa biến thể:", err);
                const errMsg = err.response?.data?.message || "Có lỗi xảy ra khi xóa biến thể.";
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: ${errMsg}` }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!product.productName || !product.productName.trim()) {
            newErrors.productName = 'Vui lòng nhập tên sản phẩm.';
        }
        if (!product.categoryId) {
            newErrors.categoryId = 'Vui lòng chọn danh mục cho sản phẩm.';
        }
        if (!product.brandName) {
            newErrors.brandName = 'Vui lòng chọn thương hiệu cho sản phẩm.';
        }
        if (!isEdit) {
            if (selectedSizes.length === 0) newErrors.sizeId = 'Vui lòng thêm ít nhất 1 kích cỡ.';
            if (selectedColors.length === 0) newErrors.colorId = 'Vui lòng thêm ít nhất 1 màu sắc.';
            if (!variant.price || parseFloat(variant.price) <= 0) {
                // Check if overrides filled
                const hasValidOverride = Object.values(variantOverrides).some(o => o.price && parseFloat(o.price) > 0);
                if (!hasValidOverride) newErrors.price = 'Vui lòng nhập giá bán cho sản phẩm hoặc nhập ở từng dòng.';
            }
            if (!variant.quantity || parseInt(variant.quantity) <= 0) {
                const hasValidQtyOverride = Object.values(variantOverrides).some(o => o.quantity && parseInt(o.quantity) > 0);
                if (!hasValidQtyOverride) newErrors.quantity = 'Vui lòng nhập số lượng nhập kho.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Vui lòng điền đầy đủ các thông tin bắt buộc.' }));
            return;
        }

        setErrors({});
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

                // 2. CREATE mode: seed variants for ALL selected sizes × colors (supporting per-variant overrides)
                if (!isEdit && selectedSizes.length > 0 && selectedColors.length > 0) {
                    for (const sz of selectedSizes) {
                        for (const cl of selectedColors) {
                            const sizeId = getSizeId(sz);
                            const colorId = getColorId(cl);
                            const key = `${sz}-${cl}`;
                            const custom = variantOverrides[key];
                            const priceVal = custom?.price !== undefined && custom?.price !== ''
                                ? parseFloat(custom.price)
                                : parseFloat(variant.price || 0);
                            const qtyVal = custom?.quantity !== undefined && custom?.quantity !== ''
                                ? parseInt(custom.quantity)
                                : parseInt(variant.quantity || 0);

                            if (priceVal > 0 && qtyVal > 0) {
                                const variantPayload = {
                                    productId: savedProductId,
                                    variantId: null,
                                    sizeId,
                                    colorId,
                                    newSizeName: sizeId ? '' : sz,
                                    newColorName: colorId ? '' : cl,
                                    price: priceVal,
                                    quantity: qtyVal
                                };
                                try {
                                    await api.post('/api/products/variant/save', variantPayload);
                                } catch (vErr) {
                                    console.error('Lỗi lưu biến thể', sz, cl, vErr);
                                }
                            }
                        }
                    }
                }

                // 3. EDIT mode: save modified existing variants
                if (isEdit && existingVariants.length > 0) {
                    for (const ev of existingVariants) {
                        if (ev.isModified && ev.price && ev.quantity) {
                            try {
                                await handleSaveSingleVariant(ev, savedProductId);
                            } catch (vErr) {
                                console.error('Lỗi lưu sửa biến thể', ev, vErr);
                            }
                        }
                    }
                }

                // 4. Upload temporary images if any (create mode)
                if (!isEdit && tempImages.length > 0) {
                    for (const tempImg of tempImages) {
                        await api.post(`/api/products/${savedProductId}/image`, {
                            imageBase64: tempImg.imageBase64
                        });
                    }

                    const detailRes = await api.get(`/api/products/${savedProductId}`);
                    if (detailRes.data && detailRes.data.success && detailRes.data.images && detailRes.data.images.length > 0) {
                        const primaryIndex = tempImages.findIndex(img => img.isPrimary);
                        const targetIndex = primaryIndex >= 0 && primaryIndex < detailRes.data.images.length ? primaryIndex : 0;
                        const primaryImgId = detailRes.data.images[targetIndex].id;
                        await api.post(`/api/products/image/${primaryImgId}/set-primary`);
                    }
                }

                setSavedId(savedProductId);
                setShowSuccessModal(true);
            }
        } catch (err) {
            console.error("Lỗi lưu sản phẩm:", err);
            const errMsg = err.response?.data?.message || "Không thể lưu sản phẩm. Vui lòng kiểm tra lại.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="form-loading-container">
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-red)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '700' }}>ĐANG TẢI THÔNG TIN FORM SẢN PHẨM...</p>
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
                    <button type="button" className="btn-cancel" onClick={loadFormData} style={{ marginTop: '20px' }}>
                        THỬ LẠI
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-product-form-page">
                <form onSubmit={handleSubmit} noValidate>
                    {/* STICKY TOP ACTION BAR */}
                    <div className="sticky-page-header">
                        <div className="header-info">
                            <span className="sub-title font-oswald">QUẢN LÝ SẢN PHẨM</span>
                            <h1 className="page-title font-oswald">{isEdit ? 'CẬP NHẬT SẢN PHẨM' : 'THÊM SẢN PHẨM MỚI'}</h1>
                        </div>
                        <div className="btn-group">
                            <Link to="/admin/products" className="btn-cancel">HỦY BỎ</Link>
                            {!isEdit && (
                                <button
                                    type="button"
                                    className="btn-cancel btn-refresh-form"
                                    onClick={() => {
                                        if (window.confirm("Bạn có chắc chắn muốn làm mới toàn bộ form?")) {
                                            setProduct({ productName: '', description: '', status: 1, brandName: '', categoryId: '' });
                                            setVariant({ sizeId: '', colorId: '', price: '', quantity: '' });
                                            setSelectedSizes([]);
                                            setSelectedColors([]);
                                            setVariantOverrides({});
                                            setAiImageBase64('');
                                            setAiImagesBase64List([]);
                                            setImages([]);
                                            setTempImages([]);
                                            setAiSuccessMsg('');
                                            setErrors({});
                                            setError(null);
                                            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Đã làm mới form thành công!' }));
                                        }
                                    }}
                                >
                                    <i className="bi bi-arrow-clockwise" style={{ marginRight: '6px' }}></i>LÀM MỚI
                                </button>
                            )}
                            <button type="submit" className="btn-save" disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: '8px' }}></span>
                                        ĐANG LƯU...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-floppy2-fill" style={{ marginRight: '8px' }}></i>LƯU SẢN PHẨM
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* AI Vision Banner */}
                    <div className="ai-banner-card">
                        <div className="ai-banner-header">
                            <div>
                                <h3 className="ai-title">
                                    <i className="bi bi-cpu-fill" style={{ color: '#8b5cf6' }}></i> ĐIỀN THÔNG TIN TỰ ĐỘNG BẰNG AI VISION
                                    <span className="ai-badge">SMART AI</span>
                                </h3>
                                <p className="ai-subtitle">
                                    Tải ảnh sản phẩm để AI tự động điền Tên, Thương hiệu, Danh mục, Màu sắc, Size & Mô tả sản phẩm.
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

                    {/* FORM MAIN GRID */}
                    <div className="form-main-layout">
                        <div className="form-top-row">
                            {/* LEFT COLUMN: BASIC INFO + CLASSIFICATION */}
                            <div className="left-col">
                                {/* CARD: THÔNG TIN CƠ BẢN */}
                                <div className="card-custom">
                                    <div className="card-header-flex">
                                        <h3 className="card-custom-title font-oswald mb-0">
                                            <i className="bi bi-info-circle-fill"></i> THÔNG TIN CƠ BẢN
                                        </h3>
                                        <button
                                            type="button"
                                            className="btn-clear-ai-info"
                                            onClick={handleClearAiBasicInfo}
                                            title="Xóa Tên sản phẩm và Mô tả do AI vừa tạo"
                                        >
                                            <i className="bi bi-trash3"></i> XÓA THÔNG TIN AI
                                        </button>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tên sản phẩm *</label>
                                        <div className="input-with-btn">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="VD: Nike Air Force 1 '07 LV8"
                                                required
                                                value={product.productName}
                                                onChange={(e) => setProduct({ ...product, productName: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="btn-ai-gen-desc"
                                                onClick={handleGenerateAiDescription}
                                                disabled={generatingDesc}
                                                title="Tự động tạo mô tả sản phẩm bằng AI Vision"
                                            >
                                                {generatingDesc ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        ĐANG TẠO...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-stars" style={{ color: '#fef08a' }}></i> TẠO MÔ TẢ AI
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {errors.productName && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.productName}</div>}
                                    </div>

                                    <div className="form-group">
                                        <div className="label-with-action">
                                            <label className="form-label mb-0">Mô tả chi tiết</label>
                                            <button
                                                type="button"
                                                className="btn-link-ai"
                                                onClick={handleGenerateAiDescription}
                                                disabled={generatingDesc}
                                            >
                                                <i className="bi bi-magic"></i> {generatingDesc ? "Đang tạo..." : "Tạo bằng AI Vision"}
                                            </button>
                                        </div>
                                        <textarea
                                            className="form-control"
                                            placeholder="Chất liệu da cao cấp, công nghệ đệm khí tiên tiến, kiểu dáng thời trang đường phố..."
                                            style={{ minHeight: '140px' }}
                                            value={product.description}
                                            onChange={(e) => setProduct({ ...product, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                {/* CARD: PHÂN LOẠI & TRẠNG THÁI */}
                                <div className="card-custom">
                                    <h3 className="card-custom-title font-oswald"><i className="bi bi-tags-fill"></i> PHÂN LOẠI & TRẠNG THÁI</h3>
                                    <div className="form-grid-2col">
                                        <div className="form-group">
                                            <label className="form-label">Danh mục *</label>
                                            <select
                                                className="form-control"
                                                required
                                                value={product.categoryId}
                                                onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}
                                            >
                                                <option value="">-- Chọn danh mục --</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            {errors.categoryId && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.categoryId}</div>}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Thương hiệu *</label>
                                            <select
                                                className="form-control"
                                                required
                                                value={product.brandName}
                                                onChange={(e) => setProduct({ ...product, brandName: e.target.value })}
                                            >
                                                <option value="">-- Chọn thương hiệu --</option>
                                                {brands.map(b => (
                                                    <option key={b.id} value={b.brandName}>{b.brandName}</option>
                                                ))}
                                            </select>
                                            {errors.brandName && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.brandName}</div>}
                                        </div>
                                    </div>

                                    <div className="form-group mb-0">
                                        <label className="form-label">Trạng thái kinh doanh</label>
                                        <select
                                            className="form-control"
                                            value={product.status}
                                            onChange={(e) => setProduct({ ...product, status: parseInt(e.target.value) })}
                                        >
                                            <option value="1">Đang bán (Hiển thị công khai)</option>
                                            <option value="0">Tạm ẩn (Ẩn khỏi cửa hàng)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: IMAGES & UPLOAD */}
                            <div className="right-col">
                                <div className="card-custom h-100">
                                    <h3 className="card-custom-title font-oswald"><i className="bi bi-images"></i> ẢNH SẢN PHẨM & THƯ VIỆN</h3>

                                    <div className="gallery-section">
                                        <label className="form-label-header">Hình ảnh hiện tại ({images.length})</label>
                                        {images.length === 0 ? (
                                            <div className="empty-gallery-box">
                                                <i className="bi bi-image" style={{ fontSize: '32px', color: '#cbd5e1' }}></i>
                                                <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>Chưa có hình ảnh nào cho sản phẩm này.</p>
                                            </div>
                                        ) : (
                                            <div className="gallery-grid">
                                                {images.map((img, idx) => (
                                                    <div key={img.id || idx} className="gallery-item">
                                                        <button
                                                            type="button"
                                                            className="btn-delete-x"
                                                            onClick={() => handleDeleteImage(img.id, idx)}
                                                            title="Xóa ảnh"
                                                        >
                                                            <i className="bi bi-x-lg"></i>
                                                        </button>
                                                        {img.isPrimary && <span className="badge-primary">ẢNH CHÍNH</span>}
                                                        <img src={getImageUrl(img)} alt="Product" className="img-fluid" />
                                                        <div className="img-footer">
                                                            <button
                                                                type="button"
                                                                className={`set-primary-trigger ${img.isPrimary ? 'active' : ''}`}
                                                                onClick={() => handleSetPrimary(img.id, idx)}
                                                                disabled={img.isPrimary}
                                                            >
                                                                <i className={`bi ${img.isPrimary ? 'bi-star-fill' : 'bi-star'}`}></i> {img.isPrimary ? 'Chính' : 'Đặt chính'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="upload-section" style={{ marginTop: '20px' }}>
                                        <label className="form-label-header" style={{ marginBottom: '10px', display: 'block' }}>Tải thêm ảnh mới</label>
                                        <label className="upload-placeholder-large">
                                            <input type="file" multiple onChange={handleImageUpload} hidden accept="image/*" />
                                            <div className="upload-content">
                                                <i className="bi bi-cloud-arrow-up-fill"></i>
                                                <span>BẤM VÀO ĐỂ TẢI ẢNH LÊN</span>
                                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB)</small>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FULL WIDTH BOTTOM CARD: CẤU HÌNH BIẾN THỂ & BẢNG SỬA BIẾN THỂ TRỰC TIẾP */}
                        <div className="card-custom full-width-card">
                            <h3 className="card-custom-title font-oswald"><i className="bi bi-box-seam-fill"></i> CẤU HÌNH BIẾN THỂ & BẢNG SỬA TRỰC TIẾP</h3>
                            
                            {!isEdit && (
                                <>
                                    <p className="form-label" style={{ marginBottom: '18px', color: '#64748b', fontSize: '13px' }}>
                                        Thêm Size và Màu sắc bên dưới — hệ thống sẽ tự động tạo danh sách biến thể (size × màu). Bạn có thể **chỉnh sửa giá bán & tồn kho trực tiếp tại bảng** bên dưới!
                                    </p>

                                    {/* SIZE TAG INPUT */}
                                    <TagInput
                                        label={`KÍCH CỠ (SIZE) * — ${selectedSizes.length} ĐÃ CHỌN`}
                                        tags={selectedSizes}
                                        onAdd={v => setSelectedSizes(p => [...p, v])}
                                        onRemove={i => setSelectedSizes(p => p.filter((_, idx) => idx !== i))}
                                        onEdit={(i, v) => setSelectedSizes(p => p.map((s, idx) => idx === i ? v : s))}
                                        onClearAll={() => setSelectedSizes([])}
                                        placeholder="Hoặc nhập size thủ công rồi Enter…"
                                        icon="bi-rulers"
                                        presets={['36','37','38','39','40','41','42','43','44','45']}
                                        validate={validateSize}
                                        hint={`Hợp lệ từ ${SIZE_MIN} đến ${SIZE_MAX}. Chỉ nhập số.`}
                                    />
                                    {errors.sizeId && <div className="text-danger small mt-1 mb-2" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.sizeId}</div>}

                                    {/* COLOR TAG INPUT */}
                                    <TagInput
                                        label={`MÀU SẮC * — ${selectedColors.length} ĐÃ CHỌN`}
                                        tags={selectedColors}
                                        onAdd={v => setSelectedColors(p => [...p, v])}
                                        onRemove={i => setSelectedColors(p => p.filter((_, idx) => idx !== i))}
                                        onEdit={(i, v) => setSelectedColors(p => p.map((c, idx) => idx === i ? v : c))}
                                        onClearAll={() => setSelectedColors([])}
                                        placeholder="Hoặc nhập tên màu thủ công rồi Enter…"
                                        icon="bi-palette"
                                        presets={['Đen','Trắng','Đỏ','Xanh dương','Xanh lá','Vàng','Hồng','Xám','Nâu','Cam','Tím','Kem','Be']}
                                        validate={validateColor}
                                        hint="Chỉ nhập tên màu bằng chữ, không nhập số."
                                    />
                                    {errors.colorId && <div className="text-danger small mt-1 mb-2" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.colorId}</div>}

                                    <div className="variant-row" style={{ marginTop: '20px' }}>
                                        <div className="form-group mb-0">
                                            <label className="form-label">Giá bán hàng loạt (VNĐ) *</label>
                                            <input
                                                type="number" min="5000" className="form-control"
                                                placeholder="VD: 1500000 (Áp dụng nhanh cho tất cả)"
                                                value={variant.price}
                                                onChange={(e) => setVariant({ ...variant, price: e.target.value })}
                                            />
                                            {errors.price && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.price}</div>}
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label">Số lượng tồn kho hàng loạt *</label>
                                            <input
                                                type="number" min="1" max="10000" className="form-control"
                                                placeholder="VD: 100 (Áp dụng nhanh cho tất cả)"
                                                value={variant.quantity}
                                                onChange={(e) => setVariant({ ...variant, quantity: e.target.value })}
                                            />
                                            {errors.quantity && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.quantity}</div>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ─── LIVE EDITABLE VARIANTS MATRIX TABLE ─── */}
                            {((!isEdit && selectedSizes.length > 0 && selectedColors.length > 0) || (isEdit && existingVariants.length > 0)) && (
                                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1.5px dashed #cbd5e1' }}>
                                    <div className="variant-table-header">
                                        <h4 className="font-oswald variant-table-title">
                                            <i className="bi bi-pencil-square" style={{ color: '#8b5cf6' }}></i>
                                            DANH SÁCH & SỬA BIẾN THỂ TRỰC TIẾP ({isEdit ? existingVariants.length : selectedSizes.length * selectedColors.length})
                                        </h4>
                                        <span className="variant-table-hint">
                                            <i className="bi bi-info-circle me-1"></i> Bạn có thể **sửa trực tiếp Giá & Tồn kho** của từng dòng sản phẩm tại bảng dưới đây
                                        </span>
                                    </div>

                                    <div className="table-responsive variant-matrix-wrapper">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '15%' }}>KÍCH CỠ</th>
                                                    <th style={{ width: '20%' }}>MÀU SẮC</th>
                                                    <th style={{ width: '30%' }}>GIÁ BÁN (VNĐ)</th>
                                                    <th style={{ width: '25%' }}>SỐ LƯỢNG KHO</th>
                                                    <th style={{ width: '10%', textAlign: 'center' }}>HÀNH ĐỘNG</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {isEdit ? (
                                                    // EDIT MODE ROWS
                                                    existingVariants.map((vItem, index) => {
                                                        return (
                                                            <tr key={vItem.id || index} className={vItem.isModified ? 'row-modified' : ''}>
                                                                <td>
                                                                    <span className="variant-badge-size">Size {vItem.sizeName}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="variant-chip-color">{vItem.colorName}</span>
                                                                </td>
                                                                <td>
                                                                    <div className="inline-input-group">
                                                                        <input
                                                                            type="number"
                                                                            min="5000"
                                                                            className="form-control variant-inline-input"
                                                                            value={vItem.price}
                                                                            onChange={(e) => handleExistingVariantChange(index, 'price', e.target.value)}
                                                                            placeholder="Nhập giá..."
                                                                        />
                                                                        <span className="currency-unit">đ</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="inline-input-group">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="form-control variant-inline-input"
                                                                            value={vItem.quantity}
                                                                            onChange={(e) => handleExistingVariantChange(index, 'quantity', e.target.value)}
                                                                            placeholder="Nhập kho..."
                                                                        />
                                                                        <span className="currency-unit">đôi</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                        {vItem.isModified && (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-success"
                                                                                title="Lưu ngay biến thể này"
                                                                                onClick={() => handleSaveSingleVariant(vItem)}
                                                                                style={{ borderRadius: '8px', padding: '4px 8px', fontSize: '12px' }}
                                                                            >
                                                                                <i className="bi bi-check-lg"></i>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            title="Xóa biến thể này khỏi sản phẩm"
                                                                            onClick={() => handleDeleteExistingVariant(vItem.id, index)}
                                                                            style={{ borderRadius: '8px', padding: '4px 8px', fontSize: '12px' }}
                                                                        >
                                                                            <i className="bi bi-trash"></i>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    // CREATE MODE ROWS
                                                    selectedSizes.map((size) =>
                                                        selectedColors.map((color) => {
                                                            const key = `${size}-${color}`;
                                                            const custom = variantOverrides[key] || {};
                                                            const currentPrice = custom.price !== undefined ? custom.price : variant.price;
                                                            const currentQty = custom.quantity !== undefined ? custom.quantity : variant.quantity;

                                                            return (
                                                                <tr key={key}>
                                                                    <td>
                                                                        <span className="variant-badge-size">Size {size}</span>
                                                                    </td>
                                                                    <td>
                                                                        <span className="variant-chip-color">{color}</span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="inline-input-group">
                                                                            <input
                                                                                type="number"
                                                                                min="5000"
                                                                                className="form-control variant-inline-input"
                                                                                value={currentPrice}
                                                                                onChange={(e) => handleOverrideChange(size, color, 'price', e.target.value)}
                                                                                placeholder="Nhập giá bán..."
                                                                            />
                                                                            <span className="currency-unit">đ</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div className="inline-input-group">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                className="form-control variant-inline-input"
                                                                                value={currentQty}
                                                                                onChange={(e) => handleOverrideChange(size, color, 'quantity', e.target.value)}
                                                                                placeholder="Số lượng..."
                                                                            />
                                                                            <span className="currency-unit">đôi</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            title="Xóa biến thể này"
                                                                            onClick={() => {
                                                                                if (selectedSizes.length > 1) {
                                                                                    setSelectedSizes(p => p.filter(s => s !== size));
                                                                                } else {
                                                                                    setSelectedColors(p => p.filter(c => c !== color));
                                                                                }
                                                                            }}
                                                                            style={{ borderRadius: '8px', padding: '4px 10px' }}
                                                                        >
                                                                            <i className="bi bi-trash"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
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
                            {isEdit ? 'Sản phẩm và các biến thể đã được lưu thành công vào hệ thống!' : 'Sản phẩm mới đã được tạo thành công!'}
                        </p>
                        <div className="admin-confirm-actions">
                            <button type="button" className="admin-btn-confirm-ok" onClick={() => {
                                setShowSuccessModal(false);
                                navigate('/admin/products');
                            }}>
                                VỀ DANH SÁCH SẢN PHẨM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminProductForm;
