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
// Giày trẻ em (từ ~16) đến người lớn cỡ lớn (đến 50)
const SIZE_MIN = 16;
const SIZE_MAX = 50;

const validateSize = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập size.";
    if (!/^\d+(\.\d+)?$/.test(trimmed))
        return "Size phải là số nguyên (VD: 38, 39…). Không được nhập chữ.";
    const num = parseFloat(trimmed);
    if (num < SIZE_MIN || num > SIZE_MAX)
        return `Size hợp lệ từ ${SIZE_MIN} (trẻ em nhỏ) đến ${SIZE_MAX} (người lớn cỡ lớn).`;
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
const TagInput = ({ label, tags, onAdd, onRemove, onEdit, placeholder, icon, presets = [], validate, hint }) => {
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
            <label className="tag-input-label">
                {icon && <i className={`bi ${icon}`}></i>} {label}
            </label>

            {/* Hint text */}
            {hint && <p className="tag-hint">{hint}</p>}

            {/* Preset quick-add chips */}
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
                                title={selected ? "Đã thêm" : `Thêm "${p}"`}
                            >
                                {selected ? <i className="bi bi-check2"></i> : <i className="bi bi-plus"></i>}
                                {p}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Input bar */}
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

            {/* Validation error */}
            {error && (
                <div className="tag-error">
                    <i className="bi bi-exclamation-triangle-fill"></i> {error}
                </div>
            )}

            {/* Selected tags */}
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
    const [tempImages, setTempImages] = useState([]); // Local temporary images for create mode
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errors, setErrors] = useState({});
    const [savedId, setSavedId] = useState(null);

    // AI Vision states
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [generatingDesc, setGeneratingDesc] = useState(false);
    const [aiSuccessMsg, setAiSuccessMsg] = useState('');
    const [aiImageBase64, setAiImageBase64] = useState('');
    const [aiImagesBase64List, setAiImagesBase64List] = useState([]);

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
                const wordCount = rawDesc ? rawDesc.trim().split(/\s+/).filter(Boolean).length : 0;
                const pName = trimmedName || data.productName || 'Sản phẩm';
                const finalDesc = wordCount >= 100
                    ? rawDesc
                    : (rawDesc ? rawDesc.trim() + '\n\n' : '') + `${pName} là biểu tượng thời trang mang phong cách hiện đại và đẳng cấp, được thiết kế tỉ mỉ để đáp ứng nhu cầu thời trang đỉnh cao của giới trẻ năng động. Đôi giày sở hữu phom dáng chuẩn ôm chân tinh tế, kết hợp cùng chất liệu da cao cấp mềm mại mang lại độ bền vượt trội và khả năng chống bám bẩn hiệu quả. Hệ thống đế cao su tự nhiên nguyên khối được trang bị công nghệ đệm khí tiên tiến, giúp giảm chấn tối đa, mang lại cảm giác êm ái, nhẹ nhàng và tự tin trong từng bước di chuyển. Bên cạnh đó, các rãnh bám thông minh dưới mặt đế giúp tăng cường độ ma sát và chống trượt vượt trội trên mọi địa hình. Dễ dàng phối hợp với nhiều kiểu trang phục từ quần Jeans, Jogger năng động cho đến những bộ Outfit đường phố cá tính, ${pName} chắc chắn sẽ là điểm nhấn hoàn hảo khẳng định gu thời trang thời thượng của bạn.`;

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

    // Tag-input: selected size/color names
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);

    const handleResetAiForm = () => {
        if (window.confirm("Bạn có chắc chắn muốn HỦY & XÓA TOÀN BỘ dữ liệu do AI điền tự động để làm mới không?")) {
            setProduct({ productName: '', description: '', status: 1, brandName: '', categoryId: '' });
            setVariant({ sizeId: '', colorId: '', price: '', quantity: '' });
            setSelectedSizes([]);
            setSelectedColors([]);
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
                        setSelectedSizes(sizes.map(s => s.sizeName));
                    }
                    // Auto-select color
                    if (data.colorName) {
                        const vn = translateColorToVietnamese(data.colorName);
                        setSelectedColors([vn]);
                    } else if (colors.length > 0) {
                        setSelectedColors([translateColorToVietnamese(colors[0].colorName)]);
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
                loadFormData(); // Refresh to update badge
            }
        } catch (err) {
            console.error("Lỗi đặt ảnh chính:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Không thể đặt ảnh chính.' }));
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
            if (!variant.price || parseFloat(variant.price) <= 0) newErrors.price = 'Giá bán phải lớn hơn 0.';
            if (!variant.quantity || parseInt(variant.quantity) <= 0) newErrors.quantity = 'Số lượng phải lớn hơn 0.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Vui lòng điền đầy đủ các thông tin bắt buộc.' }));
            return;
        }

        setErrors({});
        setSaving(true);

        // Helper: find size/color ID from name
        const getSizeId = (name) => { const s = sizes.find(s => s.sizeName.trim().toLowerCase() === name.trim().toLowerCase()); return s ? s.id : null; };
        const getColorId = (name) => { const c = colors.find(c => translateColorToVietnamese(c.colorName).toLowerCase() === name.trim().toLowerCase()); return c ? c.id : null; };

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

                // 2. CREATE mode: seed variants for ALL selected sizes × colors
                if (!isEdit && selectedSizes.length > 0 && selectedColors.length > 0 && variant.price && variant.quantity) {
                    for (const sz of selectedSizes) {
                        for (const cl of selectedColors) {
                            const sizeId = getSizeId(sz);
                            const colorId = getColorId(cl);
                            const variantPayload = {
                                productId: savedProductId,
                                variantId: null,
                                sizeId,
                                colorId,
                                newSizeName: sizeId ? '' : sz,
                                newColorName: colorId ? '' : cl,
                                price: parseFloat(variant.price),
                                quantity: parseInt(variant.quantity)
                            };
                            try {
                                await api.post('/api/products/variant/save', variantPayload);
                            } catch (vErr) {
                                console.error('Lỗi lưu biến thể', sz, cl, vErr);
                            }
                        }
                    }
                }

                // 3. Upload temporary images if any (only in create mode)
                if (!isEdit && tempImages.length > 0) {
                    for (const tempImg of tempImages) {
                        await api.post(`/api/products/${savedProductId}/image`, { 
                            imageBase64: tempImg.imageBase64 
                        });
                    }
                    
                    // Set primary image
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                                    <h3 className="card-custom-title font-oswald" style={{ margin: 0 }}>
                                        <i className="bi bi-info-circle"></i> THÔNG TIN CƠ BẢN
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn-ai-re-extract"
                                            onClick={handleGenerateAiDescription}
                                            disabled={generatingDesc || aiAnalyzing}
                                            title="Bấm để AI phân tích tạo lại Tên & Mô tả chi tiết"
                                            style={{
                                                background: '#f3e8ff',
                                                color: '#7c3aed',
                                                border: '1px solid #d8b4fe',
                                                borderRadius: '8px',
                                                padding: '6px 14px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <i className="bi bi-arrow-clockwise"></i> TẠO LẠI AI
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-ai-clear-info"
                                            onClick={handleClearAiBasicInfo}
                                            title="Bấm để xóa sạch Tên sản phẩm và Mô tả chi tiết vừa tạo"
                                            style={{
                                                background: '#fef2f2',
                                                color: '#ef4444',
                                                border: '1px solid #fca5a5',
                                                borderRadius: '8px',
                                                padding: '6px 14px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <i className="bi bi-trash3"></i> XÓA THÔNG TIN AI
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tên sản phẩm *</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: Nike Air Force 1"
                                            required
                                            value={product.productName}
                                            onChange={(e) => setProduct({ ...product, productName: e.target.value })}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-ai-gen-desc"
                                            onClick={handleGenerateAiDescription}
                                            disabled={generatingDesc}
                                            title="Bấm để tự động tạo mô tả sản phẩm bằng AI Vision"
                                            style={{
                                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '12px',
                                                padding: '0 18px',
                                                height: '46px',
                                                fontWeight: '700',
                                                fontSize: '13px',
                                                whiteSpace: 'nowrap',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                                                transition: 'all 0.25s ease'
                                            }}
                                        >
                                            {generatingDesc ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ĐANG TẠO MÔ TẢ...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-stars" style={{ fontSize: '16px', color: '#fef08a' }}></i> TỰ ĐỘNG TẠO MÔ TẢ AI
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {errors.productName && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.productName}</div>}
                                </div>
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label className="form-label mb-0">Mô tả chi tiết</label>
                                        <button
                                            type="button"
                                            onClick={handleGenerateAiDescription}
                                            disabled={generatingDesc}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#8b5cf6',
                                                fontWeight: '700',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <i className="bi bi-magic"></i> {generatingDesc ? "Đang tạo..." : "Tạo bằng AI Vision"}
                                        </button>
                                    </div>
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
                                    <p className="form-label" style={{ marginBottom: '18px', color: '#64748b', fontSize: '13px' }}>
                                        Thêm Size và Màu sắc bên dưới — hệ thống sẽ tự động tạo toàn bộ biến thể (size × màu) cho sản phẩm.
                                    </p>

                                    {/* SIZE TAG INPUT */}
                                    <TagInput
                                        label={`KÍCH CỠ (SIZE) * — ${selectedSizes.length} đã chọn`}
                                        tags={selectedSizes}
                                        onAdd={v => setSelectedSizes(p => [...p, v])}
                                        onRemove={i => setSelectedSizes(p => p.filter((_, idx) => idx !== i))}
                                        onEdit={(i, v) => setSelectedSizes(p => p.map((s, idx) => idx === i ? v : s))}
                                        placeholder="Hoặc nhập size thủ công rồi Enter…"
                                        icon="bi-rulers"
                                        presets={['18','20','22','24','26','28','30','32','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48']}
                                        validate={validateSize}
                                        hint={`Hợp lệ từ ${SIZE_MIN} (trẻ em) đến ${SIZE_MAX} (người lớn). Chỉ nhập số.`}
                                    />
                                    {errors.sizeId && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.sizeId}</div>}

                                    {/* COLOR TAG INPUT */}
                                    <TagInput
                                        label={`MÀU SẮC * — ${selectedColors.length} đã chọn`}
                                        tags={selectedColors}
                                        onAdd={v => setSelectedColors(p => [...p, v])}
                                        onRemove={i => setSelectedColors(p => p.filter((_, idx) => idx !== i))}
                                        onEdit={(i, v) => setSelectedColors(p => p.map((c, idx) => idx === i ? v : c))}
                                        placeholder="Hoặc nhập tên màu thủ công rồi Enter…"
                                        icon="bi-palette"
                                        presets={['Đen','Trắng','Đỏ','Xanh dương','Xanh lá','Vàng','Hồng','Xám','Nâu','Cam','Tím','Kem','Be']}
                                        validate={validateColor}
                                        hint="Chỉ nhập tên màu bằng chữ, không nhập số."
                                    />
                                    {errors.colorId && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.colorId}</div>}

                                    <div className="variant-row" style={{ marginTop: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Giá bán (VNĐ) *</label>
                                            <input
                                                type="number" min="5000" className="form-control"
                                                placeholder="VD: 1500000" required
                                                value={variant.price}
                                                onChange={(e) => setVariant({ ...variant, price: e.target.value })}
                                            />
                                            {errors.price && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.price}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Số lượng nhập kho (Mỗi màu & size) *</label>
                                            <input
                                                type="number" min="1" max="10000" className="form-control"
                                                placeholder="VD: 100" required
                                                value={variant.quantity}
                                                onChange={(e) => setVariant({ ...variant, quantity: e.target.value })}
                                            />
                                            {errors.quantity && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.quantity}</div>}
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
                                    {errors.categoryId && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.categoryId}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Thương hiệu *</label>
                                    <select className="form-control" required value={product.brandName} onChange={(e) => setProduct({ ...product, brandName: e.target.value })}>
                                        <option value="">-- Chọn thương hiệu --</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.brandName}>{b.brandName}</option>
                                        ))}
                                    </select>
                                    {errors.brandName && <div className="text-danger small mt-1" style={{ fontSize: '12px', fontWeight: 'bold' }}>{errors.brandName}</div>}
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
