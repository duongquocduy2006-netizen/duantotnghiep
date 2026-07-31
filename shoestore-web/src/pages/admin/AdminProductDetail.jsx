import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import "./AdminProductDetail.css";

// ─── Color name translator ───────────────────────────────────────────────────
const translateColorToVietnamese = (name) => {
    if (!name) return "";
    const clean = name.trim();
    const map = {
        'black': 'Đen', 'white': 'Trắng', 'red': 'Đỏ', 'blue': 'Xanh dương',
        'green': 'Xanh lá', 'yellow': 'Vàng', 'pink': 'Hồng', 'grey': 'Xám',
        'gray': 'Xám', 'brown': 'Nâu', 'navy': 'Xanh navy', 'purple': 'Tím',
        'orange': 'Cam', 'beige': 'Kem'
    };
    const lower = clean.toLowerCase();
    if (map[lower]) return map[lower];
    return clean
        .replace(/Tr\?ng/gi, "Trắng").replace(/Đ\?/gi, "Đỏ")
        .replace(/Xanh l\?/gi, "Xanh lá").replace(/V\?ng/gi, "Vàng").replace(/H\?ng/gi, "Hồng");
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

// ─── Main Component ──────────────────────────────────────────────────────────
const AdminProductDetail = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingVariant, setSavingVariant] = useState(false);

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [images, setImages] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [colors, setColors] = useState([]);

    // Tag-input selected sizes & colors
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);

    // Variant form
    const [variantId, setVariantId] = useState(null);
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");

    const sortVariantsByAscendingSize = (varList) => {
        if (!Array.isArray(varList)) return [];
        return [...varList].sort((a, b) => {
            const numA = parseFloat(a.sizeName);
            const numB = parseFloat(b.sizeName);
            if (!isNaN(numA) && !isNaN(numB)) {
                if (numA !== numB) return numA - numB;
            } else if (!isNaN(numA)) {
                return -1;
            } else if (!isNaN(numB)) {
                return 1;
            } else if (a.sizeName && b.sizeName) {
                const comp = a.sizeName.localeCompare(b.sizeName);
                if (comp !== 0) return comp;
            }
            const colorA = translateColorToVietnamese(a.colorName || '');
            const colorB = translateColorToVietnamese(b.colorName || '');
            return colorA.localeCompare(colorB);
        });
    };

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/products/${id}`);
            if (response.data && response.data.success) {
                setProduct(response.data.product);
                setVariants(sortVariantsByAscendingSize(response.data.variants || []));
                setImages(response.data.images || []);

                const uniqueSizesMap = new Map();
                (response.data.sizes || []).forEach(s => {
                    if (s.sizeName && !uniqueSizesMap.has(s.sizeName.trim()))
                        uniqueSizesMap.set(s.sizeName.trim(), s);
                });
                const cleanSizes = Array.from(uniqueSizesMap.values()).sort((a, b) => {
                    const nA = parseInt(a.sizeName), nB = parseInt(b.sizeName);
                    return (!isNaN(nA) && !isNaN(nB)) ? nA - nB : a.sizeName.localeCompare(b.sizeName);
                });
                setSizes(cleanSizes);

                const uniqueColorsMap = new Map();
                (response.data.colors || []).forEach(c => {
                    const vn = translateColorToVietnamese(c.colorName);
                    if (vn && !uniqueColorsMap.has(vn.toLowerCase()))
                        uniqueColorsMap.set(vn.toLowerCase(), { ...c, colorName: vn });
                });
                setColors(Array.from(uniqueColorsMap.values()));
            } else {
                setError("Không thể tải thông tin sản phẩm.");
            }
        } catch (err) {
            setError("Lỗi kết nối máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProductDetails(); }, [id]);

    const getSizeId = (name) => {
        const s = sizes.find(s => s.sizeName.trim().toLowerCase() === name.trim().toLowerCase());
        return s ? s.id : null;
    };
    const getColorId = (name) => {
        const c = colors.find(c => translateColorToVietnamese(c.colorName).toLowerCase() === name.trim().toLowerCase());
        return c ? c.id : null;
    };

    // Tag handlers
    const addSize = (val) => setSelectedSizes(prev => [...prev, val]);
    const removeSize = (idx) => setSelectedSizes(prev => prev.filter((_, i) => i !== idx));
    const editSize = (idx, val) => setSelectedSizes(prev => prev.map((s, i) => i === idx ? val : s));

    const addColor = (val) => setSelectedColors(prev => [...prev, val]);
    const removeColor = (idx) => setSelectedColors(prev => prev.filter((_, i) => i !== idx));
    const editColor = (idx, val) => setSelectedColors(prev => prev.map((c, i) => i === idx ? val : c));

    const resetVariantForm = () => {
        setVariantId(null);
        setSelectedSizes([]);
        setSelectedColors([]);
        setPrice("");
        setQuantity("");
    };

    const startEditVariant = (v) => {
        setVariantId(v.id);
        setSelectedSizes(v.sizeName ? [v.sizeName] : []);
        setSelectedColors(v.colorName ? [translateColorToVietnamese(v.colorName)] : []);
        setPrice(v.price || "");
        setQuantity(v.quantity || "");
    };

    const handleVariantSubmit = async (e) => {
        e.preventDefault();
        if (!price || parseFloat(price) <= 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng nhập giá bán hợp lệ.' }));
            return;
        }
        if (quantity === "" || parseInt(quantity) < 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng nhập số lượng hợp lệ.' }));
            return;
        }
        if (selectedSizes.length === 0 || selectedColors.length === 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng thêm ít nhất 1 Size và 1 Màu sắc.' }));
            return;
        }

        setSavingVariant(true);
        try {
            if (variantId) {
                const totalCombos = selectedSizes.length * selectedColors.length;
                let qtyPerVariant = parseInt(quantity);
                if (totalCombos > 1 && parseInt(quantity) >= totalCombos) {
                    qtyPerVariant = Math.floor(parseInt(quantity) / totalCombos);
                }

                let isFirst = true;
                let countSuccess = 0;
                for (const sz of selectedSizes) {
                    for (const cl of selectedColors) {
                        try {
                            const sizeId = getSizeId(sz);
                            const colorId = getColorId(cl);
                            const targetVariantId = isFirst ? variantId : null;

                            const res = await api.post("/api/products/variant/save", {
                                productId: parseInt(id),
                                variantId: targetVariantId,
                                sizeId,
                                colorId,
                                newSizeName: sizeId ? "" : sz,
                                newColorName: colorId ? "" : cl,
                                price: parseFloat(price),
                                quantity: qtyPerVariant
                            });
                            if (res.data?.success) countSuccess++;
                            isFirst = false;
                        } catch (err) {
                            console.error("Lỗi lưu tách biến thể:", err);
                        }
                    }
                }

                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: totalCombos > 1
                        ? `✨ Đã tự động tách & cập nhật thành công ${countSuccess} biến thể!`
                        : "Cập nhật biến thể thành công!"
                }));
                resetVariantForm();
                fetchProductDetails();
            } else {
                let count = 0;
                for (const sz of selectedSizes) {
                    for (const cl of selectedColors) {
                        try {
                            const sizeId = getSizeId(sz);
                            const colorId = getColorId(cl);
                            const res = await api.post('/api/products/variant/save', {
                                productId: parseInt(id), variantId: null,
                                sizeId, colorId,
                                newSizeName: sizeId ? "" : sz,
                                newColorName: colorId ? "" : cl,
                                price: parseFloat(price), quantity: parseInt(quantity)
                            });
                            if (res.data?.success) count++;
                        } catch {}
                    }
                }
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Đã lưu ${count} biến thể thành công!` }));
                resetVariantForm();
                fetchProductDetails();
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Không thể lưu biến thể.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
        } finally {
            setSavingVariant(false);
        }
    };

    const handleDeleteVariant = async (vId, sizeName, colorName) => {
        if (!window.confirm(`Xóa biến thể Size ${sizeName} - ${colorName}?`)) return;
        try {
            const res = await api.delete(`/api/products/variant/${vId}`);
            if (res.data?.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Xóa biến thể thành công!" }));
                setVariants(variants.filter(v => v.id !== vId));
            }
        } catch {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể xóa biến thể.' }));
        }
    };

    const getImageUrl = (image) => {
        const url = typeof image === 'string' ? image : image?.url;
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleDeleteImage = async (imageId) => {
        if (!window.confirm("Xóa ảnh này?")) return;
        try {
            const res = await api.delete(`/api/products/image/${imageId}`);
            if (res.data?.success) setImages(images.filter(img => img.id !== imageId));
        } catch {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể xóa ảnh.' }));
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const toBase64 = f => new Promise(r => {
            const reader = new FileReader();
            reader.onloadend = () => r(reader.result);
            reader.readAsDataURL(f);
        });
        try {
            for (const f of files) {
                const b64 = await toBase64(f);
                await api.post(`/api/products/${id}/image`, { imageBase64: b64 });
            }
            fetchProductDetails();
        } catch {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể tải ảnh lên.' }));
        }
    };

    const handleSetPrimary = async (imageId) => {
        try {
            const res = await api.post(`/api/products/image/${imageId}/set-primary`);
            if (res.data?.success) fetchProductDetails();
        } catch {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể đặt ảnh chính.' }));
        }
    };

    if (loading) return (
        <AdminLayout>
            <div className="loading-screen">
                <div className="spinner-border" role="status" style={{ width: '3rem', height: '3rem', color: '#000' }}></div>
                <p>ĐANG TẢI DỮ LIỆU SẢN PHẨM...</p>
            </div>
        </AdminLayout>
    );

    if (error || !product) return (
        <AdminLayout>
            <div className="error-screen">
                <i className="bi bi-exclamation-triangle"></i>
                <h3>LỖI TẢI DỮ LIỆU</h3>
                <p>{error || "Không tìm thấy sản phẩm."}</p>
                <Link to="/admin/products" className="btn-outline">QUAY LẠI</Link>
            </div>
        </AdminLayout>
    );

    const totalVariants = selectedSizes.length * selectedColors.length;

    return (
        <AdminLayout>
            <div className="apd-page">
                {/* Header */}
                <div className="apd-header">
                    <div>
                        <span className="apd-eyebrow">QUẢN LÝ SẢN PHẨM</span>
                        <h1 className="apd-title">{product.productName}</h1>
                    </div>
                    <div className="apd-header-actions">
                        <Link to={`/admin/products/edit/${id}`} className="btn-primary-dark">
                            <i className="bi bi-pencil-square"></i> Chỉnh sửa
                        </Link>
                        <Link to="/admin/products" className="btn-outline">
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </Link>
                    </div>
                </div>

                {/* 2-col grid */}
                <div className="apd-grid">
                    {/* LEFT */}
                    <div className="apd-col">
                        {/* Card: Thông tin cơ bản */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className="bi bi-info-circle"></i> Thông tin cơ bản
                            </h3>
                            <div className="info-table">
                                <div className="info-row">
                                    <span className="info-key">Mã SKU</span>
                                    <span className="info-val">{product.productCode}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-key">Danh mục</span>
                                    <span className="info-val">{product.categoryName || "—"}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-key">Thương hiệu</span>
                                    <span className="info-val">{product.brandName || "—"}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-key">Trạng thái</span>
                                    <span className={`status-badge ${product.status === 1 ? "active" : "hidden"}`}>
                                        {product.status === 1 ? "Đang kinh doanh" : "Tạm ẩn"}
                                    </span>
                                </div>
                                <div className="info-row info-row--top">
                                    <span className="info-key">Mô tả</span>
                                    <span className="info-val desc">{product.description || "Chưa có mô tả."}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card: Cấu hình biến thể */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className={`bi ${variantId ? "bi-pencil-square" : "bi-plus-circle"}`}></i>
                                {variantId ? " Cập nhật biến thể" : " Cấu hình biến thể"}
                            </h3>

                            <form onSubmit={handleVariantSubmit}>
                                {/* SIZE TAG INPUT */}
                                <TagInput
                                    label={`KÍCH CỠ (SIZE) — ${selectedSizes.length} đã chọn`}
                                    tags={selectedSizes}
                                    onAdd={addSize}
                                    onRemove={removeSize}
                                    onEdit={editSize}
                                    placeholder="Hoặc nhập size thủ công rồi Enter…"
                                    icon="bi-rulers"
                                    presets={['18','20','22','24','26','28','30','32','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48']}
                                    validate={validateSize}
                                    hint={`Hợp lệ từ ${SIZE_MIN} (trẻ em) đến ${SIZE_MAX} (người lớn). Chỉ nhập số.`}
                                />

                                {/* COLOR TAG INPUT */}
                                <TagInput
                                    label={`MÀU SẮC — ${selectedColors.length} đã chọn`}
                                    tags={selectedColors}
                                    onAdd={addColor}
                                    onRemove={removeColor}
                                    onEdit={editColor}
                                    placeholder="Hoặc nhập tên màu thủ công rồi Enter…"
                                    icon="bi-palette"
                                    presets={['Đen','Trắng','Đỏ','Xanh dương','Xanh lá','Vàng','Hồng','Xám','Nâu','Cam','Tím','Kem','Be']}
                                    validate={validateColor}
                                    hint="Chỉ nhập tên màu bằng chữ, không nhập số."
                                />

                                {/* Price & Quantity */}
                                <div className="variant-form-grid">
                                    <div className="form-field">
                                        <label className="form-field-label">GIÁ BÁN (VNĐ) *</label>
                                        <input
                                            type="number" min="5000"
                                            className="form-field-input"
                                            placeholder="VD: 1500000"
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-field-label">SỐ LƯỢNG KHO (MỖI BIẾN THỂ) *</label>
                                        <input
                                            type="number" min="0"
                                            className="form-field-input"
                                            placeholder="VD: 100"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="variant-form-actions">
                                    <button type="submit" className="btn-save" disabled={savingVariant}>
                                        {savingVariant ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                                        ) : variantId ? (
                                            "CẬP NHẬT BIẾN THỂ"
                                        ) : totalVariants > 0 ? (
                                            `LƯU ${totalVariants} BIẾN THỂ`
                                        ) : (
                                            "LƯU BIẾN THỂ"
                                        )}
                                    </button>
                                    {variantId && (
                                        <button type="button" className="btn-cancel-v" onClick={resetVariantForm}>
                                            HỦY BỎ
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="apd-col">
                        {/* Card: Danh sách biến thể */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className="bi bi-box-seam"></i> Danh sách biến thể ({variants.length})
                            </h3>
                            {variants.length === 0 ? (
                                <p className="empty-msg">Chưa có biến thể nào. Thêm Size & Màu bên trái để tạo.</p>
                            ) : (
                                <div className="table-scroll">
                                    <table className="vt">
                                        <thead>
                                            <tr>
                                                <th>KÍCH CỠ</th>
                                                <th>MÀU SẮC</th>
                                                <th>GIÁ BÁN</th>
                                                <th>KHO</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {variants.map(v => {
                                                const isEditing = variantId === v.id;
                                                return (
                                                    <tr key={v.id} className={isEditing ? "editing-row" : ""}>
                                                        <td><strong>Size {v.sizeName}</strong></td>
                                                        <td>{translateColorToVietnamese(v.colorName)}</td>
                                                        <td className="price-cell">{v.price?.toLocaleString("vi-VN")} ₫</td>
                                                        <td>
                                                            <span className={`qty-badge ${v.quantity > 0 ? "in" : "out"}`}>
                                                                {v.quantity} đôi
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="row-actions">
                                                                <button type="button" className={`row-btn edit ${isEditing ? "active" : ""}`}
                                                                    onClick={() => startEditVariant(v)} title={isEditing ? "Đang chỉnh sửa" : "Sửa"}>
                                                                    <i className={`bi ${isEditing ? "bi-pencil-fill" : "bi-pencil-square"}`}></i>
                                                                </button>
                                                                <button type="button" className="row-btn del"
                                                                    onClick={() => handleDeleteVariant(v.id, v.sizeName, v.colorName)} title="Xóa">
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Card: Thư viện ảnh */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className="bi bi-images"></i> Thư viện ảnh ({images.length})
                            </h3>

                            {images.length === 0 && <p className="empty-msg">Chưa có ảnh nào.</p>}

                            {images.length > 0 && (
                                <div className="img-grid">
                                    {images.map((img, i) => (
                                        <div key={i} className="img-card">
                                            {img.isPrimary && <span className="img-primary-badge">Ảnh chính</span>}
                                            <img src={getImageUrl(img)} alt="sp" className="img-thumb" />
                                            <div className="img-actions">
                                                <button type="button"
                                                    className={`img-btn star ${img.isPrimary ? "active" : ""}`}
                                                    onClick={() => handleSetPrimary(img.id)}
                                                    disabled={img.isPrimary}
                                                    title={img.isPrimary ? "Ảnh chính" : "Đặt làm ảnh chính"}
                                                >
                                                    <i className={`bi ${img.isPrimary ? "bi-star-fill" : "bi-star"}`}></i>
                                                </button>
                                                <button type="button" className="img-btn del"
                                                    onClick={() => handleDeleteImage(img.id)} title="Xóa ảnh">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label className="upload-zone">
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} hidden />
                                <i className="bi bi-cloud-arrow-up-fill"></i>
                                <span>Nhấp để tải ảnh lên</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminProductDetail;
