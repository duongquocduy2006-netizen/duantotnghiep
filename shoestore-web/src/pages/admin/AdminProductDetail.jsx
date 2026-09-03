import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import "./AdminProductDetail.css";

// ─── LocalStorage helpers for custom Sizes & Colors ──────────────────────────
const getStoredCustomSizes = () => {
    try {
        const raw = localStorage.getItem('shoestore_custom_sizes');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

const getStoredCustomColors = () => {
    try {
        const raw = localStorage.getItem('shoestore_custom_colors');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

const saveCustomSizeToStorage = (newSize) => {
    if (!newSize) return;
    try {
        const existing = getStoredCustomSizes();
        if (!existing.some(s => s.toLowerCase() === newSize.trim().toLowerCase())) {
            const updated = [...existing, newSize.trim()];
            localStorage.setItem('shoestore_custom_sizes', JSON.stringify(updated));
        }
    } catch {}
};

const saveCustomColorToStorage = (newColor) => {
    if (!newColor) return;
    try {
        const existing = getStoredCustomColors();
        if (!existing.some(c => c.toLowerCase() === newColor.trim().toLowerCase())) {
            const updated = [...existing, newColor.trim()];
            localStorage.setItem('shoestore_custom_colors', JSON.stringify(updated));
        }
    } catch {}
};

const removeCustomSizeFromStorage = (sizeName) => {
    if (!sizeName) return;
    try {
        const existing = getStoredCustomSizes();
        const updated = existing.filter(s => s.toLowerCase() !== sizeName.trim().toLowerCase());
        localStorage.setItem('shoestore_custom_sizes', JSON.stringify(updated));
    } catch {}
};

const removeCustomColorFromStorage = (colorName) => {
    if (!colorName) return;
    try {
        const existing = getStoredCustomColors();
        const updated = existing.filter(c => c.toLowerCase() !== colorName.trim().toLowerCase());
        localStorage.setItem('shoestore_custom_colors', JSON.stringify(updated));
    } catch {}
};

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
const TagInput = ({ label, tags, onAdd, onRemove, onEdit, onClearAll, onDeletePreset, placeholder, icon, presets = [], validate, hint }) => {
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
                            <div key={p} className={`preset-chip-wrapper ${selected ? "selected" : ""}`}>
                                <button
                                    type="button"
                                    className={`preset-chip ${selected ? "selected" : ""}`}
                                    onClick={() => !selected && handleAdd(p)}
                                    title={selected ? "Đã chọn" : `Thêm "${p}"`}
                                >
                                    {selected ? <i className="bi bi-check2"></i> : <i className="bi bi-plus"></i>}
                                    {p}
                                </button>
                                {onDeletePreset && (
                                    <button
                                        type="button"
                                        className="preset-chip-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePreset(p);
                                        }}
                                        title={`Xóa tùy chọn "${p}"`}
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>
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

    // Extra deleted presets state to hide deleted chips immediately
    const [deletedSizePresets, setDeletedSizePresets] = useState([]);
    const [deletedColorPresets, setDeletedColorPresets] = useState([]);

    // Tag-input selected sizes & colors for CREATING NEW VARIANTS
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");

    // Inline table editing state for UPDATING EXISTING VARIANTS IN TABLE DIRECTLY (Size, Color, Price, Quantity)
    const [inlineEditingId, setInlineEditingId] = useState(null);
    const [inlineSizeName, setInlineSizeName] = useState("");
    const [inlineColorName, setInlineColorName] = useState("");
    const [inlinePrice, setInlinePrice] = useState("");
    const [inlineQty, setInlineQty] = useState("");
    const [savingInlineId, setSavingInlineId] = useState(null);

    // Bulk Edit states for updating all/selected variants at once
    const [selectedVariantIds, setSelectedVariantIds] = useState([]);
    const [bulkPriceInput, setBulkPriceInput] = useState("");
    const [bulkQtyInput, setBulkQtyInput] = useState("");
    const [isSavingBulk, setIsSavingBulk] = useState(false);
    const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

    const handleSelectAllVariants = () => {
        if (selectedVariantIds.length === variants.length) {
            setSelectedVariantIds([]);
        } else {
            setSelectedVariantIds(variants.map(v => v.id));
        }
    };

    const handleToggleSelectVariant = (variantId) => {
        setSelectedVariantIds(prev =>
            prev.includes(variantId)
                ? prev.filter(vId => vId !== variantId)
                : [...prev, variantId]
        );
    };

    const handleApplyBulkPrice = () => {
        const numPrice = parseFloat(bulkPriceInput);
        if (!bulkPriceInput || isNaN(numPrice) || numPrice <= 5000) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Giá bán chung phải lớn hơn 5,000 VNĐ!' }));
            return;
        }

        const targetIds = selectedVariantIds.length > 0 ? selectedVariantIds : variants.map(v => v.id);
        setVariants(prev => prev.map(v => targetIds.includes(v.id) ? { ...v, price: numPrice } : v));
        
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: `Đã áp dụng giá mới ${numPrice.toLocaleString('vi-VN')} đ cho ${targetIds.length} biến thể! Vui lòng ấn "LƯU TẤT CẢ THAY ĐỔI" để cập nhật vào hệ thống cửa hàng.`
        }));
    };

    const handleApplyBulkQty = () => {
        const numQty = parseInt(bulkQtyInput);
        if (!bulkQtyInput || isNaN(numQty) || numQty < 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Số lượng tồn kho phải từ 1 trở lên!' }));
            return;
        }

        const targetIds = selectedVariantIds.length > 0 ? selectedVariantIds : variants.map(v => v.id);
        setVariants(prev => prev.map(v => targetIds.includes(v.id) ? { ...v, quantity: numQty } : v));

        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: `Đã áp dụng tồn kho ${numQty} đôi cho ${targetIds.length} biến thể! Vui lòng ấn "LƯU TẤT CẢ THAY ĐỔI" để cập nhật vào hệ thống cửa hàng.`
        }));
    };

    const handleSaveAllBulkVariants = () => {
        const invalidPriceVar = variants.find(v => !v.price || parseFloat(v.price) <= 5000);
        if (invalidPriceVar) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: Giá bán của tất cả biến thể phải lớn hơn 5,000 VNĐ (Biến thể Size ${invalidPriceVar.sizeName} - Màu ${translateColorToVietnamese(invalidPriceVar.colorName)} không hợp lệ)!` }));
            return;
        }

        const invalidQtyVar = variants.find(v => v.quantity === undefined || v.quantity === null || parseInt(v.quantity) < 1);
        if (invalidQtyVar) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: Số lượng tồn kho của tất cả biến thể phải từ 1 trở lên (Biến thể Size ${invalidQtyVar.sizeName} - Màu ${translateColorToVietnamese(invalidQtyVar.colorName)} không hợp lệ)!` }));
            return;
        }

        setShowBulkConfirmModal(true);
    };

    const confirmAndExecuteBulkSave = async () => {
        setIsSavingBulk(true);
        const payload = variants.map(v => ({
            id: v.id,
            price: parseFloat(v.price),
            quantity: parseInt(v.quantity)
        }));

        try {
            const res = await api.post('/api/products/variant/bulk-save', payload);
            if (res.data && res.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `🎉 ${res.data.message}` }));
                setShowBulkConfirmModal(false);
                fetchProductDetails();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data?.message || 'Không thể lưu thay đổi biến thể.' }));
            }
        } catch (err) {
            console.warn('Lỗi gọi /bulk-save, chuyển sang chế độ lưu tuần tự fallback...', err);
            try {
                let successCount = 0;
                for (const item of payload) {
                    const v = variants.find(varItem => varItem.id === item.id);
                    if (!v) continue;
                    const sizeId = getSizeId(v.sizeName);
                    const colorId = getColorId(v.colorName);
                    await api.post('/api/products/variant/save', {
                        productId: parseInt(id),
                        sku: product?.productCode || null,
                        variantId: item.id,
                        sizeId,
                        colorId,
                        price: item.price,
                        quantity: item.quantity
                    });
                    successCount++;
                }
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `🎉 Cập nhật thành công hàng loạt ${successCount} biến thể sản phẩm!` }));
                setShowBulkConfirmModal(false);
                fetchProductDetails();
            } catch (fallbackErr) {
                console.error('Lỗi lưu biến thể hàng loạt:', fallbackErr);
                const msg = fallbackErr.response?.data?.message || 'Không thể lưu các thay đổi biến thể hàng loạt.';
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: ${msg}` }));
            }
        } finally {
            setIsSavingBulk(false);
        }
    };

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
        if (!name) return null;
        const s = sizes.find(s => s.sizeName.trim().toLowerCase() === name.trim().toLowerCase());
        return s ? s.id : null;
    };
    const getColorId = (name) => {
        if (!name) return null;
        const c = colors.find(c => translateColorToVietnamese(c.colorName).toLowerCase() === name.trim().toLowerCase());
        return c ? c.id : null;
    };

    // Tag handlers with permanent local storage save
    const addSize = (val) => {
        saveCustomSizeToStorage(val);
        setSelectedSizes(prev => [...prev, val]);
        setDeletedSizePresets(prev => prev.filter(s => s.toLowerCase() !== val.toLowerCase()));
    };
    const removeSize = (idx) => setSelectedSizes(prev => prev.filter((_, i) => i !== idx));
    const editSize = (idx, val) => {
        saveCustomSizeToStorage(val);
        setSelectedSizes(prev => prev.map((s, i) => i === idx ? val : s));
    };

    const addColor = (val) => {
        saveCustomColorToStorage(val);
        setSelectedColors(prev => [...prev, val]);
        setDeletedColorPresets(prev => prev.filter(c => c.toLowerCase() !== val.toLowerCase()));
    };
    const removeColor = (idx) => setSelectedColors(prev => prev.filter((_, i) => i !== idx));
    const editColor = (idx, val) => {
        saveCustomColorToStorage(val);
        setSelectedColors(prev => prev.map((c, i) => i === idx ? val : c));
    };

    // Preset Chip Deletion Handlers
    const handleDeleteSizePreset = async (sizeName) => {
        if (!sizeName) return;
        removeCustomSizeFromStorage(sizeName);
        setSelectedSizes(prev => prev.filter(s => s.toLowerCase() !== sizeName.toLowerCase()));
        setSizes(prev => prev.filter(s => s.sizeName.trim().toLowerCase() !== sizeName.toLowerCase()));
        setDeletedSizePresets(prev => [...prev, sizeName.toLowerCase()]);
        try {
            await api.post("/api/products/size/delete-name", { sizeName });
        } catch {}
        window.dispatchEvent(new CustomEvent('show-toast', { detail: `Đã xóa tùy chọn Size ${sizeName}` }));
    };

    const handleDeleteColorPreset = async (colorName) => {
        if (!colorName) return;
        removeCustomColorFromStorage(colorName);
        setSelectedColors(prev => prev.filter(c => c.toLowerCase() !== colorName.toLowerCase()));
        setColors(prev => prev.filter(c => translateColorToVietnamese(c.colorName).toLowerCase() !== colorName.toLowerCase()));
        setDeletedColorPresets(prev => [...prev, colorName.toLowerCase()]);
        try {
            await api.post("/api/products/color/delete-name", { colorName });
        } catch {}
        window.dispatchEvent(new CustomEvent('show-toast', { detail: `Đã xóa tùy chọn Màu ${colorName}` }));
    };

    const resetVariantForm = () => {
        setSelectedSizes([]);
        setSelectedColors([]);
        setPrice("");
        setQuantity("");
    };

    // Start direct inline row editing (Size, Color, Price, Quantity) inside table
    const startInlineEdit = (v) => {
        setInlineEditingId(v.id);
        setInlineSizeName(v.sizeName || "");
        setInlineColorName(translateColorToVietnamese(v.colorName || ""));
        setInlinePrice(v.price !== null && v.price !== undefined ? v.price.toString() : "");
        setInlineQty(v.quantity !== null && v.quantity !== undefined ? v.quantity.toString() : "");
    };

    const cancelInlineEdit = () => {
        setInlineEditingId(null);
        setInlineSizeName("");
        setInlineColorName("");
        setInlinePrice("");
        setInlineQty("");
    };

    // Save direct inline editing row directly to backend
    const handleSaveInlineVariant = async (v) => {
        if (!inlineSizeName || !inlineSizeName.trim()) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Vui lòng chọn hoặc nhập Size.' }));
            return;
        }
        if (!inlineColorName || !inlineColorName.trim()) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Vui lòng chọn hoặc nhập Màu sắc.' }));
            return;
        }
        if (!inlinePrice || parseFloat(inlinePrice) <= 5000) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Giá bán phải lớn hơn 5,000 VNĐ.' }));
            return;
        }
        if (inlineQty === "" || parseInt(inlineQty) < 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Số lượng tồn kho khi thêm phải từ 1 trở lên.' }));
            return;
        }

        saveCustomSizeToStorage(inlineSizeName);
        saveCustomColorToStorage(inlineColorName);

        setSavingInlineId(v.id);
        try {
            const sizeId = getSizeId(inlineSizeName);
            const colorId = getColorId(inlineColorName);

            const res = await api.post("/api/products/variant/save", {
                productId: parseInt(id),
                sku: product?.productCode || null,
                variantId: v.id,
                sizeId,
                colorId,
                newSizeName: sizeId ? "" : inlineSizeName.trim(),
                newColorName: colorId ? "" : inlineColorName.trim(),
                price: parseFloat(inlinePrice),
                quantity: parseInt(inlineQty)
            });

            if (res.data?.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data.message || 'Đã cập nhật biến thể thành công!' }));
                cancelInlineEdit();
                fetchProductDetails();
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data?.message || 'Không thể cập nhật biến thể.' }));
            }
        } catch (err) {
            console.error("Lỗi cập nhật biến thể trực tiếp:", err);
            const msg = err.response?.data?.message || "Không thể cập nhật biến thể này.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Lỗi: ${msg}` }));
        } finally {
            setSavingInlineId(null);
        }
    };

    // Handle adding NEW variants via the top form
    const handleAddNewVariantsSubmit = async (e) => {
        e.preventDefault();
        if (!price || parseFloat(price) <= 5000) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Giá bán phải lớn hơn 5,000 VNĐ.' }));
            return;
        }
        if (quantity === "" || parseInt(quantity) < 1) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi: Số lượng tồn kho khi thêm phải từ 1 trở lên.' }));
            return;
        }
        if (selectedSizes.length === 0 || selectedColors.length === 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Vui lòng chọn ít nhất 1 Size và 1 Màu sắc.' }));
            return;
        }

        selectedSizes.forEach(sz => saveCustomSizeToStorage(sz));
        selectedColors.forEach(cl => saveCustomColorToStorage(cl));

        setSavingVariant(true);
        try {
            let count = 0;
            let lastMsg = "";
            let accumulatedCount = 0;
            for (const sz of selectedSizes) {
                for (const cl of selectedColors) {
                    try {
                        const sizeId = getSizeId(sz);
                        const colorId = getColorId(cl);
                        const res = await api.post('/api/products/variant/save', {
                            productId: parseInt(id),
                            sku: product?.productCode || null,
                            variantId: null,
                            sizeId, colorId,
                            newSizeName: sizeId ? "" : sz,
                            newColorName: colorId ? "" : cl,
                            price: parseFloat(price),
                            quantity: parseInt(quantity)
                        });
                        if (res.data?.success) {
                            count++;
                            if (res.data.accumulated) accumulatedCount++;
                            if (res.data.message) lastMsg = res.data.message;
                        }
                    } catch (err) {
                        console.error("Lỗi thêm biến thể:", err);
                    }
                }
            }
            const toastMsg = (count === 1 && lastMsg)
                ? lastMsg
                : (accumulatedCount > 0
                    ? `Đã xử lý & cộng dồn ${count} biến thể thành công!`
                    : `Đã tạo ${count} biến thể mới thành công!`);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: toastMsg }));
            resetVariantForm();
            fetchProductDetails();
        } catch (err) {
            const msg = err.response?.data?.message || "Không thể lưu biến thể mới.";
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
                <div className="spinner-border text-red" role="status" style={{ width: '3rem', height: '3rem', color: '#e50914' }}></div>
                <p style={{ marginTop: '16px', letterSpacing: '1px', fontWeight: '700' }}>ĐANG TẢI DỮ LIỆU SẢN PHẨM...</p>
            </div>
        </AdminLayout>
    );

    if (error || !product) return (
        <AdminLayout>
            <div className="error-screen">
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '48px', color: '#ef4444' }}></i>
                <h3>LỖI TẢI DỮ LIỆU</h3>
                <p>{error || "Không tìm thấy sản phẩm."}</p>
                <Link to="/admin/products" className="btn-outline">QUAY LẠI DANH SÁCH</Link>
            </div>
        </AdminLayout>
    );

    const totalVariantsCount = selectedSizes.length * selectedColors.length;

    // Dynamic preset lists combining: standard defaults + DB items + localStorage custom items + currently selected tags (minus deleted)
    const dynamicSizePresets = Array.from(new Set([
        '18','20','22','24','26','28','30','32','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48',
        ...(sizes || []).map(s => s.sizeName ? s.sizeName.trim() : ''),
        ...getStoredCustomSizes(),
        ...selectedSizes
    ]))
        .filter(Boolean)
        .filter(s => !deletedSizePresets.includes(s.toLowerCase()))
        .sort((a, b) => {
            const nA = parseFloat(a), nB = parseFloat(b);
            return (!isNaN(nA) && !isNaN(nB)) ? nA - nB : a.localeCompare(b);
        });

    const dynamicColorPresets = Array.from(new Set([
        'Đen','Trắng','Đỏ','Xanh dương','Xanh lá','Vàng','Hồng','Xám','Nâu','Cam','Tím','Kem','Be',
        ...(colors || []).map(c => translateColorToVietnamese(c.colorName)),
        ...getStoredCustomColors(),
        ...selectedColors
    ]))
        .filter(Boolean)
        .filter(c => !deletedColorPresets.includes(c.toLowerCase()));

    return (
        <AdminLayout>
            <div className="apd-page">
                {/* Header Bar */}
                <div className="apd-header">
                    <div>
                        <span className="apd-eyebrow">QUẢN LÝ SẢN PHẨM</span>
                        <h1 className="apd-title">{product.productName}</h1>
                    </div>
                    <div className="apd-header-actions">
                        <Link to={`/admin/products/edit/${id}`} className="btn-primary-dark">
                            <i className="bi bi-pencil-square"></i> Chỉnh sửa sản phẩm
                        </Link>
                        <Link to="/admin/products" className="btn-outline">
                            <i className="bi bi-arrow-left"></i> Quay lại
                        </Link>
                    </div>
                </div>

                {/* Balanced Top Row Grid (2 Columns) */}
                <div className="apd-top-grid">
                    {/* LEFT COLUMN: BASIC INFO + GALLERY */}
                    <div className="apd-col">
                        {/* Card 1: Thông tin cơ bản */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className="bi bi-info-circle-fill"></i> Thông tin cơ bản
                            </h3>
                            <div className="info-table">
                                <div className="info-row">
                                    <span className="info-key">Mã SKU</span>
                                    <span className="info-val sku-badge">{product.productCode}</span>
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
                                    <span className="info-val desc">{product.description || "Chưa có mô tả chi tiết."}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Thư viện ảnh */}
                        <div className="apd-card">
                            <h3 className="apd-card-title">
                                <i className="bi bi-images"></i> Thư viện ảnh ({images.length})
                            </h3>

                            {images.length === 0 ? (
                                <div className="empty-gallery-box">
                                    <i className="bi bi-image" style={{ fontSize: '32px', color: '#cbd5e1' }}></i>
                                    <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>Chưa có hình ảnh nào.</p>
                                </div>
                            ) : (
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
                                <span>Tải thêm ảnh mới lên</span>
                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Hỗ trợ JPG, PNG, WEBP</small>
                            </label>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: VARIANT CREATION FORM (EXCLUSIVELY FOR ADDING NEW VARIANTS) */}
                    <div className="apd-col">
                        <div className="apd-card h-100">
                            <h3 className="apd-card-title">
                                <i className="bi bi-plus-circle-fill" style={{ color: '#e50914' }}></i>
                                THÊM / CẤU HÌNH BIẾN THỂ MỚI
                            </h3>

                            <form onSubmit={handleAddNewVariantsSubmit}>
                                {/* SIZE TAG INPUT */}
                                <TagInput
                                    label={`KÍCH CỠ (SIZE) — ${selectedSizes.length} ĐÃ CHỌN`}
                                    tags={selectedSizes}
                                    onAdd={addSize}
                                    onRemove={removeSize}
                                    onEdit={editSize}
                                    onClearAll={() => setSelectedSizes([])}
                                    onDeletePreset={handleDeleteSizePreset}
                                    placeholder="Hoặc nhập size thủ công rồi Enter…"
                                    icon="bi-rulers"
                                    presets={dynamicSizePresets}
                                    validate={validateSize}
                                    hint={`Hợp lệ từ ${SIZE_MIN} đến ${SIZE_MAX}. Chỉ nhập số. Rê chuột vào chip để xóa.`}
                                />

                                {/* COLOR TAG INPUT */}
                                <TagInput
                                    label={`MÀU SẮC — ${selectedColors.length} ĐÃ CHỌN`}
                                    tags={selectedColors}
                                    onAdd={addColor}
                                    onRemove={removeColor}
                                    onEdit={editColor}
                                    onClearAll={() => setSelectedColors([])}
                                    onDeletePreset={handleDeleteColorPreset}
                                    placeholder="Hoặc nhập tên màu thủ công rồi Enter…"
                                    icon="bi-palette"
                                    presets={dynamicColorPresets}
                                    validate={validateColor}
                                    hint="Chỉ nhập tên màu bằng chữ, không nhập số. Rê chuột vào chip để xóa."
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
                                        ) : totalVariantsCount > 0 ? (
                                            <>
                                                <i className="bi bi-plus-lg me-1"></i> LƯU {totalVariantsCount} BIẾN THỂ MỚI
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-plus-lg me-1"></i> LƯU BIẾN THỂ MỚI
                                            </>
                                        )}
                                    </button>
                                    <button type="button" className="btn-cancel-v" onClick={resetVariantForm}>
                                        <i className="bi bi-arrow-clockwise me-1"></i>LÀM MỚI
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* FULL WIDTH BOTTOM CARD: EXISTING VARIANTS TABLE WITH DIRECT INLINE EDITING (SIZE, COLOR, PRICE, QUANTITY) */}
                <div className="apd-card full-width-card" style={{ marginTop: '24px' }}>
                    <div className="card-header-flex">
                        <h3 className="apd-card-title mb-0">
                            <i className="bi bi-box-seam-fill" style={{ color: '#e50914' }}></i>
                            DANH SÁCH BIẾN THỂ SẢN PHẨM ({variants.length})
                        </h3>
                        {variants.length > 0 && (
                            <span className="variant-summary-badge">
                                <i className="bi bi-box-seam me-1"></i>
                                TỔNG TỒN KHO: <b>{variants.reduce((sum, v) => sum + (v.quantity || 0), 0)} đôi</b>
                            </span>
                        )}
                    </div>

                    {/* KHUNG CHỈNH SỬA HÀNG LOẠT (BULK EDIT TOOLBAR) */}
                    {variants.length > 0 && (
                        <div style={{
                            background: '#f8fafc',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            margin: '15px 0 20px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>
                                    <i className="bi bi-pencil-square" style={{ color: '#e50914', fontSize: '18px' }}></i>
                                    <span>CHỈNH SỬA HÀNG LOẠT ({selectedVariantIds.length > 0 ? `Đã chọn ${selectedVariantIds.length}/${variants.length} biến thể` : `Áp dụng cho tất cả ${variants.length} biến thể`})</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={handleSelectAllVariants}
                                    style={{ fontWeight: '600', fontSize: '13px' }}
                                >
                                {selectedVariantIds.length === variants.length ? (
                                    <><i className="bi bi-x-circle me-1"></i> Bỏ chọn tất cả</>
                                ) : (
                                    <><i className="bi bi-check2-square me-1"></i> Chọn tất cả</>
                                )}
                                </button>
                            </div>

                            <div className="row g-3 align-items-end">
                                {/* 1. ÁP DỤNG GIÁ MỚI HÀNG LOẠT */}
                                <div className="col-md-4">
                                    <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '13px' }}>
                                        <i className="bi bi-cash-stack text-success me-1"></i> Giá bán chung (VNĐ):
                                    </label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            min="5001"
                                            className="form-control"
                                            placeholder="VD: 1600000"
                                            value={bulkPriceInput}
                                            onChange={e => setBulkPriceInput(e.target.value)}
                                            style={bulkPriceInput !== "" && parseFloat(bulkPriceInput) <= 5000 ? { borderColor: '#e50914' } : {}}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger fw-bold"
                                            onClick={handleApplyBulkPrice}
                                            disabled={!bulkPriceInput || parseFloat(bulkPriceInput) <= 5000}
                                        >
                                            ÁP DỤNG GIÁ
                                        </button>
                                    </div>
                                    {bulkPriceInput !== "" && parseFloat(bulkPriceInput) <= 5000 && (
                                        <div style={{ color: '#e50914', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>
                                            ⚠️ Giá bán phải lớn hơn 5,000đ
                                        </div>
                                    )}
                                </div>

                                {/* 2. ÁP DỤNG SỐ LƯỢNG KHO HÀNG LOẠT */}
                                <div className="col-md-4">
                                    <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '13px' }}>
                                        <i className="bi bi-box-seam text-primary me-1"></i> Số lượng tồn kho chung (Đôi):
                                    </label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            placeholder="VD: 10"
                                            value={bulkQtyInput}
                                            onChange={e => setBulkQtyInput(e.target.value)}
                                            style={bulkQtyInput !== "" && parseInt(bulkQtyInput) < 1 ? { borderColor: '#e50914' } : {}}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary fw-bold"
                                            onClick={handleApplyBulkQty}
                                            disabled={!bulkQtyInput || parseInt(bulkQtyInput) < 1}
                                        >
                                            ÁP DỤNG KHO
                                        </button>
                                    </div>
                                    {bulkQtyInput !== "" && parseInt(bulkQtyInput) < 1 && (
                                        <div style={{ color: '#e50914', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>
                                            ⚠️ Số lượng kho phải từ 1 trở lên
                                        </div>
                                    )}
                                </div>

                                {/* 3. NÚT LƯU HÀNG LOẠT VÀO DATABASE */}
                                <div className="col-md-4 text-end">
                                    <button
                                        type="button"
                                        className="btn btn-danger fw-bold w-100 py-2"
                                        style={{ background: '#e50914', border: 'none', boxShadow: '0 4px 12px rgba(229, 9, 20, 0.3)' }}
                                        onClick={handleSaveAllBulkVariants}
                                        disabled={isSavingBulk}
                                    >
                                        {isSavingBulk ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu hàng loạt...</>
                                        ) : (
                                            <><i className="bi bi-cloud-arrow-up-fill me-1"></i> LƯU TẤT CẢ THAY ĐỔI HÀNG LOẠT</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {variants.length === 0 ? (
                        <div className="empty-msg-box">
                            <i className="bi bi-box-seam" style={{ fontSize: '36px', color: '#cbd5e1' }}></i>
                            <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                                Chưa có biến thể nào. Chọn Size & Màu sắc ở khung phía trên để thêm biến thể mới cho sản phẩm này.
                            </p>
                        </div>
                    ) : (
                        <div className="table-responsive variant-table-wrapper">
                            <table className="table table-hover align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: '4%', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                                                checked={variants.length > 0 && selectedVariantIds.length === variants.length}
                                                onChange={handleSelectAllVariants}
                                                title="Chọn tất cả biến thể"
                                            />
                                        </th>
                                        <th style={{ width: '6%' }}>STT</th>
                                        <th style={{ width: '20%' }}>KÍCH CỠ</th>
                                        <th style={{ width: '23%' }}>MÀU SẮC</th>
                                        <th style={{ width: '24%' }}>GIÁ BÁN (VNĐ)</th>
                                        <th style={{ width: '15%' }}>KHO</th>
                                        <th style={{ width: '8%', textAlign: 'center' }}>THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variants.map((v, idx) => {
                                        const isInlineEditing = inlineEditingId === v.id;
                                        const isSelected = selectedVariantIds.includes(v.id);
                                        return (
                                            <tr key={v.id} className={isInlineEditing ? "editing-row-active" : isSelected ? "table-active" : ""}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectVariant(v.id)}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: '700', color: '#64748b' }}>#{idx + 1}</td>
                                                
                                                {/* KÍCH CỠ - Editable Select or Static Chip */}
                                                <td>
                                                    {isInlineEditing ? (
                                                        <select
                                                            className="form-control inline-table-select"
                                                            value={inlineSizeName}
                                                            onChange={(e) => setInlineSizeName(e.target.value)}
                                                        >
                                                            {dynamicSizePresets.map(sz => (
                                                                <option key={sz} value={sz}>Size {sz}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="badge-size-chip">Size {v.sizeName}</span>
                                                    )}
                                                </td>

                                                {/* MÀU SẮC - Editable Select or Static Chip */}
                                                <td>
                                                    {isInlineEditing ? (
                                                        <select
                                                            className="form-control inline-table-select"
                                                            value={inlineColorName}
                                                            onChange={(e) => setInlineColorName(e.target.value)}
                                                        >
                                                            {dynamicColorPresets.map(cl => (
                                                                <option key={cl} value={cl}>{cl}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="badge-color-chip">{translateColorToVietnamese(v.colorName)}</span>
                                                    )}
                                                </td>
                                                
                                                {/* GIÁ BÁN (VNĐ) - Direct inline edit or static label */}
                                                <td>
                                                    {isInlineEditing ? (
                                                        <>
                                                            <div className="inline-table-input-wrap">
                                                                <input
                                                                    type="number"
                                                                    min="5001"
                                                                    className="form-control inline-table-input"
                                                                    style={inlinePrice !== "" && parseFloat(inlinePrice) <= 5000 ? { borderColor: '#e50914', boxShadow: '0 0 0 2px rgba(229, 9, 20, 0.2)' } : {}}
                                                                    value={inlinePrice}
                                                                    onChange={(e) => setInlinePrice(e.target.value)}
                                                                    placeholder="Giá (> 5,000đ)..."
                                                                />
                                                                <span className="unit-label">đ</span>
                                                            </div>
                                                            {inlinePrice !== "" && parseFloat(inlinePrice) <= 5000 && (
                                                                <div style={{ color: '#e50914', fontSize: '11px', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <i className="bi bi-exclamation-triangle-fill"></i> Giá phải &gt; 5,000đ
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="price-cell">{v.price?.toLocaleString("vi-VN")} đ</span>
                                                    )}
                                                </td>

                                                {/* SỐ LƯỢNG KHO - Direct inline edit or static label */}
                                                <td>
                                                    {isInlineEditing ? (
                                                        <>
                                                            <div className="inline-table-input-wrap">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="form-control inline-table-input"
                                                                    style={inlineQty !== "" && parseInt(inlineQty) < 1 ? { borderColor: '#e50914', boxShadow: '0 0 0 2px rgba(229, 9, 20, 0.2)' } : {}}
                                                                    value={inlineQty}
                                                                    onChange={(e) => setInlineQty(e.target.value)}
                                                                    placeholder="Kho (>= 1)..."
                                                                />
                                                                <span className="unit-label">đôi</span>
                                                            </div>
                                                            {inlineQty !== "" && parseInt(inlineQty) < 1 && (
                                                                <div style={{ color: '#e50914', fontSize: '11px', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <i className="bi bi-exclamation-triangle-fill"></i> Kho phải &gt;= 1
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className={`qty-badge ${v.quantity > 0 ? "in" : "out"}`}>
                                                            {v.quantity} đôi
                                                        </span>
                                                    )}
                                                </td>

                                                {/* THAO TÁC BUTTONS */}
                                                <td style={{ textAlign: 'center' }}>
                                                    {isInlineEditing ? (
                                                        <div className="row-actions justify-content-center">
                                                            <button
                                                                type="button"
                                                                className="row-btn save-inline"
                                                                onClick={() => handleSaveInlineVariant(v)}
                                                                disabled={savingInlineId === v.id}
                                                                title="Lưu tất cả chỉnh sửa của dòng này"
                                                            >
                                                                {savingInlineId === v.id ? (
                                                                    <span className="spinner-border spinner-border-sm"></span>
                                                                ) : (
                                                                    <i className="bi bi-check-lg"></i>
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="row-btn cancel-inline"
                                                                onClick={cancelInlineEdit}
                                                                title="Hủy sửa"
                                                            >
                                                                <i className="bi bi-x-lg"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="row-actions justify-content-center">
                                                            <button
                                                                type="button"
                                                                className="row-btn edit"
                                                                onClick={() => startInlineEdit(v)}
                                                                title="Chỉnh sửa Size, Màu, Giá, Kho trực tiếp"
                                                            >
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="row-btn del"
                                                                onClick={() => handleDeleteVariant(v.id, v.sizeName, v.colorName)}
                                                                title="Xóa biến thể"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* CONFIRMATION MODAL FOR BULK SAVE */}
            {showBulkConfirmModal && (
                <div className="admin-confirm-overlay" style={{ zIndex: 10000 }}>
                    <div className="admin-confirm-box" style={{ width: '90%', maxWidth: '480px', padding: '28px', borderRadius: '16px', background: '#fff', color: '#333', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <div className="mb-3">
                            <i className="bi bi-question-circle-fill text-warning" style={{ fontSize: '54px' }}></i>
                        </div>
                        <h4 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '10px', color: '#111' }}>
                            XÁC NHẬN CẬP NHẬT BIẾN THỂ HÀNG LOẠT
                        </h4>
                        <p style={{ color: '#555', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                            Bạn có chắc chắn muốn lưu các thay đổi về Giá & Tồn kho cho <b>{selectedVariantIds.length > 0 ? selectedVariantIds.length : variants.length} biến thể</b> sản phẩm này không?
                        </p>
                        <div className="d-flex justify-content-center gap-3">
                            <button
                                type="button"
                                className="btn btn-secondary fw-bold px-4"
                                onClick={() => setShowBulkConfirmModal(false)}
                                disabled={isSavingBulk}
                            >
                                HỦY BỎ
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger fw-bold px-4"
                                style={{ background: '#e50914', border: 'none' }}
                                onClick={confirmAndExecuteBulkSave}
                                disabled={isSavingBulk}
                            >
                                {isSavingBulk ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                                ) : (
                                    'XÁC NHẬN LƯU'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminProductDetail;
