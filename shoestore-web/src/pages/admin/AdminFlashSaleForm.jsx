import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AdminFlashSaleForm.css';

const AdminFlashSaleForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        id: null,
        name: '',
        status: '1',
        startDate: '',
        endDate: '',
        flashSaleProducts: []
    });

    const [products, setProducts] = useState([]);
    const [productVariants, setProductVariants] = useState({});
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Returns current local datetime string in YYYY-MM-DDTHH:mm format for min attributes & default values
    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Helper to add hours to a datetime-local string (YYYY-MM-DDTHH:mm)
    const addHoursToDateTime = (dateTimeStr, hoursToAdd) => {
        if (!dateTimeStr) return '';
        const d = new Date(dateTimeStr);
        if (isNaN(d.getTime())) return '';
        d.setHours(d.getHours() + hoursToAdd);
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${da}T${h}:${mi}`;
    };

    // Helper: Format ISO/backend string to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatToDateTimeLocal = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr.substring(0, 16);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            return dateStr.substring(0, 16);
        }
    };

    // Helper: get original price info for product / variant
    const getOriginalPriceInfo = (fsp) => {
        if (!fsp || !fsp.productId) return null;
        
        const vars = productVariants[fsp.productId] || [];
        
        if (fsp.variantId) {
            const found = vars.find(v => String(v.id) === String(fsp.variantId));
            if (found && found.price != null) {
                return {
                    minPrice: Number(found.price),
                    maxPrice: Number(found.price),
                    isSingle: true,
                    displayText: new Intl.NumberFormat('vi-VN').format(found.price) + 'đ'
                };
            }
        }
        
        if (vars.length > 0) {
            const prices = vars.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
            if (prices.length > 0) {
                const minP = Math.min(...prices);
                const maxP = Math.max(...prices);
                if (minP === maxP) {
                    return {
                        minPrice: minP,
                        maxPrice: maxP,
                        isSingle: true,
                        displayText: new Intl.NumberFormat('vi-VN').format(minP) + 'đ'
                    };
                } else {
                    return {
                        minPrice: minP,
                        maxPrice: maxP,
                        isSingle: false,
                        displayText: `${new Intl.NumberFormat('vi-VN').format(minP)}đ - ${new Intl.NumberFormat('vi-VN').format(maxP)}đ`
                    };
                }
            }
        }
        
        const prod = products.find(p => String(p.id) === String(fsp.productId));
        if (prod && prod.price != null) {
            return {
                minPrice: Number(prod.price),
                maxPrice: Number(prod.price),
                isSingle: true,
                displayText: new Intl.NumberFormat('vi-VN').format(prod.price) + 'đ'
            };
        }
        
        return null;
    };

    // 1. Fetch available products list for dropdown selection
    const fetchProducts = async () => {
        try {
            const response = await api.get('/api/products');
            const prods = response.data || [];
            setProducts(prods);

            const variantsMap = {};
            await Promise.all(prods.map(async (p) => {
                if (p.variants && p.variants.length > 0) {
                    variantsMap[p.id] = p.variants;
                } else {
                    try {
                        const detailRes = await api.get(`/api/products/${p.id}`);
                        if (detailRes.data && detailRes.data.variants) {
                            variantsMap[p.id] = detailRes.data.variants;
                        }
                    } catch (e) {
                        console.error("Lỗi lấy variants cho sp", p.id);
                    }
                }
            }));
            setProductVariants(variantsMap);
        } catch (err) {
            console.error("Lỗi tải danh sách sản phẩm:", err);
        }
    };

    // 2. Fetch campaign details if editing
    const fetchFlashSaleDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/flash-sales/${id}`);
            if (response.data && response.data.success) {
                const fs = response.data.flashSale;
                const loadedProducts = (fs.flashSaleProducts || []).map(fsp => ({
                    ...fsp,
                    salePrice: fsp.salePrice != null ? String(fsp.salePrice) : '',
                    quantityLimit: fsp.quantityLimit === 0 || fsp.quantityLimit == null ? 0 : String(fsp.quantityLimit),
                    isUnlimited: fsp.quantityLimit === 0 || fsp.quantityLimit == null
                }));

                setForm({
                    id: fs.id,
                    name: fs.name || '',
                    status: String(fs.status != null ? fs.status : 1),
                    startDate: formatToDateTimeLocal(fs.startDate),
                    endDate: formatToDateTimeLocal(fs.endDate),
                    flashSaleProducts: loadedProducts
                });
            }
        } catch (err) {
            console.error("Lỗi tải chi tiết Flash Sale:", err);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể tải thông tin chiến dịch Flash Sale." }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        if (isEdit) {
            fetchFlashSaleDetail();
        }
    }, [isEdit, id]);

    const handleAddRow = () => {
        if (products.length === 0) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Vui lòng đợi tải sản phẩm hoặc tạo sản phẩm trước!" }));
            return;
        }
        setForm({
            ...form,
            flashSaleProducts: [
                ...form.flashSaleProducts,
                { id: "temp." + Date.now(), productId: products[0].id, variantId: null, salePrice: '', quantityLimit: '5', isUnlimited: false, soldQuantity: 0 }
            ]
        });
        setFormErrors(p => {
            const next = { ...p };
            delete next.productsList;
            Object.keys(next).forEach(k => {
                if (k.startsWith('products.')) {
                    delete next[k];
                }
            });
            return next;
        });
    };

    const handleRemoveRow = (idx) => {
        const updated = [...form.flashSaleProducts];
        updated.splice(idx, 1);
        setForm({ ...form, flashSaleProducts: updated });
        
        setFormErrors(p => {
            const next = { ...p };
            Object.keys(next).forEach(k => {
                if (k.startsWith('products.')) {
                    delete next[k];
                }
            });
            return next;
        });
    };

    const handleRowChange = (idx, field, value) => {
        const updated = [...form.flashSaleProducts];
        updated[idx] = { ...updated[idx], [field]: value };
        setForm({ ...form, flashSaleProducts: updated });
        
        const errKey = `products.${idx}.${field}`;
        const prodErrKey = `products.${idx}.productId`;
        setFormErrors(p => {
            const next = { ...p };
            if (next[errKey]) delete next[errKey];
            if (next[prodErrKey]) delete next[prodErrKey];
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const errors = {};

        if (!form.name || !form.name.trim()) {
            errors.name = "Vui lòng nhập tên chương trình Flash Sale!";
        }

        if (!form.startDate) {
            errors.startDate = "Vui lòng chọn thời gian bắt đầu!";
        } else if (!isEdit) {
            const startObj = new Date(form.startDate);
            const nowObj = new Date();
            if (startObj < new Date(nowObj.getTime() - 60000)) {
                errors.startDate = "Thời gian bắt đầu không được nằm trong quá khứ!";
            }
        }

        if (!form.endDate) {
            errors.endDate = "Vui lòng chọn thời gian kết thúc!";
        } else if (form.startDate) {
            const startObj = new Date(form.startDate);
            const endObj = new Date(form.endDate);
            if (endObj <= startObj) {
                errors.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu!";
            }
        }

        if (form.flashSaleProducts.length === 0) {
            errors.productsList = "Vui lòng chọn ít nhất 1 sản phẩm tham gia Flash Sale!";
        }

        const uniqueProductKeys = new Set();
        for (let i = 0; i < form.flashSaleProducts.length; i++) {
            const fsp = form.flashSaleProducts[i];
            
            const sPrice = Number(fsp.salePrice);
            if (fsp.salePrice === '' || fsp.salePrice === null || isNaN(sPrice) || sPrice <= 0) {
                errors[`products.${i}.salePrice`] = "Vui lòng nhập giá sale lớn hơn 0đ!";
            }

            if (!fsp.isUnlimited) {
                const qLimit = Number(fsp.quantityLimit);
                if (fsp.quantityLimit === '' || fsp.quantityLimit === null || isNaN(qLimit) || qLimit <= 0) {
                    errors[`products.${i}.quantityLimit`] = "Vui lòng nhập số lượng giới hạn!";
                }
            }

            const comboKey = `${fsp.productId}-${fsp.variantId || 'all'}`;
            if (uniqueProductKeys.has(comboKey)) {
                errors[`products.${i}.productId`] = `Không được chọn trùng sản phẩm và biến thể ở dòng thứ ${i + 1}!`;
            } else {
                uniqueProductKeys.add(comboKey);
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lưu thất bại. Vui lòng kiểm tra các lỗi nhập liệu bên dưới!" }));
            return;
        }
        setFormErrors({});

        try {
            setLoading(true);
            const submittedProducts = form.flashSaleProducts.map(fsp => ({
                ...fsp,
                salePrice: Number(fsp.salePrice),
                quantityLimit: fsp.isUnlimited ? 0 : Number(fsp.quantityLimit || 0)
            }));

            const payload = {
                ...form,
                status: parseInt(form.status),
                flashSaleProducts: submittedProducts
            };
            const response = await api.post('/api/flash-sales/save', payload);
            if (response.data && response.data.success) {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lưu chiến dịch Flash Sale thành công!" }));
                navigate('/admin/flashsales');
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Lưu thất bại." }));
            }
        } catch (err) {
            console.error("Lỗi lưu chiến dịch:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể kết nối đến server để lưu chiến dịch.";
                
            if (errMsg.includes("quá khứ")) {
                setFormErrors(prev => ({ ...prev, startDate: errMsg }));
            } else if (errMsg.includes("kết thúc")) {
                setFormErrors(prev => ({ ...prev, endDate: errMsg }));
            }
            
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="admin-flash-sale-form-page">
                <div className="admin-page-header" style={{ marginBottom: '30px', marginTop: '20px' }}>
                    <div className="header-left">
                        <span className="sub-title-neon"><i className="bi bi-pencil-square"></i> FLASH SALE EDITOR</span>
                        <h1 className="cinematic-title">{isEdit ? 'CHỈNH SỬA FLASH SALE' : 'TẠO FLASH SALE MỚI'}</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="card-cinematic">
                        <h3 className="card-section-title">THÔNG TIN CƠ BẢN</h3>
                        <div className="form-grid-cinematic">
                            <div className="form-group">
                                <label className="form-label">Tên chương trình *</label>
                                <input 
                                    type="text" 
                                    className={`form-input-cinematic ${formErrors.name ? 'input-error' : ''}`} 
                                    placeholder="Ví dụ: Flash Sale Cuối Tuần" 
                                    value={form.name}
                                    onChange={(e) => {
                                        setForm({...form, name: e.target.value});
                                        if (formErrors.name) setFormErrors(p => ({...p, name: ''}));
                                    }}
                                    required
                                />
                                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select 
                                    className="form-input-cinematic"
                                    value={form.status}
                                    onChange={(e) => setForm({...form, status: e.target.value})}
                                >
                                    <option value="1">KÍCH HOẠT</option>
                                    <option value="0">TẠM DỪNG</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                {/* ===== LỊCH TRÌNH CHIẾN DỊCH ===== */}
                                <div className="schedule-section">
                                    <div className="schedule-section-header">
                                        <span className="schedule-section-label">
                                            <i className="bi bi-calendar2-week me-2"></i>LỊCH TRÌNH CHIẾN DỊCH
                                        </span>
                                        <span className="schedule-past-badge">
                                            <i className="bi bi-shield-check me-1"></i>Chỉ chọn thời gian từ hiện tại trở đi
                                        </span>
                                    </div>

                                    <div className="schedule-body">
                                        {/* ---- THỜI GIAN BẮT ĐẦU ---- */}
                                        <div className="schedule-col">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label mb-0">
                                                    <i className="bi bi-play-circle-fill text-danger me-1"></i>
                                                    THỜI GIAN BẮT ĐẦU *
                                                </label>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                                    style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                                    onClick={() => {
                                                        const nowStr = getCurrentDateTimeLocal();
                                                        setForm(prev => ({
                                                            ...prev,
                                                            startDate: nowStr,
                                                            endDate: prev.endDate && prev.endDate > nowStr ? prev.endDate : addHoursToDateTime(nowStr, 2)
                                                        }));
                                                        if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: '' }));
                                                    }}
                                                >
                                                    <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                                </button>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                className={`form-input-cinematic ${formErrors.startDate ? 'input-error' : ''}`}
                                                value={form.startDate}
                                                min={getCurrentDateTimeLocal()}
                                                onChange={(e) => {
                                                    const newStart = e.target.value;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        startDate: newStart,
                                                        endDate: prev.endDate && prev.endDate > newStart ? prev.endDate : addHoursToDateTime(newStart, 2)
                                                    }));
                                                    if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: '' }));
                                                }}
                                                required
                                            />
                                            {formErrors.startDate && <span className="field-error">{formErrors.startDate}</span>}
                                            {form.startDate && (
                                                <div className="schedule-preview-chip schedule-preview-green mt-2">
                                                    <i className="bi bi-calendar-check me-1"></i>
                                                    <span>{new Date(form.startDate).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* ---- DIVIDER ---- */}
                                        <div className="schedule-divider">
                                            <div className="schedule-divider-line"></div>
                                            <div className="schedule-divider-pill">
                                                <i className="bi bi-arrow-right"></i>
                                            </div>
                                            <div className="schedule-divider-line"></div>
                                        </div>

                                        {/* ---- THỜI GIAN KẾT THÚC ---- */}
                                        <div className="schedule-col">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label mb-0">
                                                    <i className="bi bi-flag-fill text-danger me-1"></i>
                                                    THỜI GIAN KẾT THÚC *
                                                </label>
                                                <div className="d-flex gap-1 align-items-center">
                                                    <span className="text-muted" style={{ fontSize: '10px' }}>Gợi ý:</span>
                                                    {[1, 3, 6, 12, 24].map(h => (
                                                        <button
                                                            key={h}
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger py-0 px-1 font-oswald"
                                                            style={{ fontSize: '10px', borderRadius: '4px' }}
                                                            onClick={() => {
                                                                const baseStart = form.startDate || getCurrentDateTimeLocal();
                                                                setForm(prev => ({
                                                                    ...prev,
                                                                    startDate: baseStart,
                                                                    endDate: addHoursToDateTime(baseStart, h)
                                                                }));
                                                                if (formErrors.endDate) setFormErrors(p => ({ ...p, endDate: '' }));
                                                            }}
                                                        >
                                                            +{h}h
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                className={`form-input-cinematic ${formErrors.endDate ? 'input-error' : ''}`}
                                                value={form.endDate}
                                                min={form.startDate || getCurrentDateTimeLocal()}
                                                onChange={(e) => {
                                                    setForm(prev => ({ ...prev, endDate: e.target.value }));
                                                    if (formErrors.endDate) setFormErrors(p => ({ ...p, endDate: '' }));
                                                }}
                                                required
                                            />
                                            {formErrors.endDate && <span className="field-error">{formErrors.endDate}</span>}
                                            {form.endDate && (
                                                <div className="schedule-preview-chip schedule-preview-red mt-2">
                                                    <i className="bi bi-flag-fill me-1"></i>
                                                    <span>Kết thúc: {new Date(form.endDate).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-cinematic">
                        <div className="card-header-flex">
                            <h3 className="card-section-title" style={{ margin: 0 }}>SẢN PHẨM THAM GIA</h3>
                            <button type="button" className="btn-red-skew" style={{ fontSize: '12px' }} onClick={handleAddRow}>
                                <i className="bi bi-plus-lg"></i> &nbsp;THÊM SẢN PHẨM
                            </button>
                        </div>

                            <div className="product-list-container-alt">
                                <div className="product-row header">
                                    <div className="form-label">SẢN PHẨM</div>
                                    <div className="form-label">BIẾN THỂ</div>
                                    <div className="form-label">GIÁ SALE (Đ)</div>
                                    <div className="form-label">GIỚI HẠN (SL)</div>
                                    <div className="form-label"></div>
                                </div>

                                {form.flashSaleProducts.map((fsp, idx) => {
                                    const origInfo = getOriginalPriceInfo(fsp);
                                    const numericSale = Number(fsp.salePrice);
                                    const isValidSale = fsp.salePrice !== '' && !isNaN(numericSale) && numericSale > 0;
                                    
                                    let discountPct = null;
                                    let savingsAmount = null;
                                    let isHigherThanOrig = false;

                                    if (origInfo && isValidSale) {
                                        if (numericSale >= origInfo.minPrice) {
                                            isHigherThanOrig = true;
                                        } else {
                                            discountPct = Math.round(((origInfo.minPrice - numericSale) / origInfo.minPrice) * 100);
                                            savingsAmount = origInfo.minPrice - numericSale;
                                        }
                                    }

                                    return (
                                        <div key={fsp.id} className="product-row align-items-start">
                                            <div>
                                                <select 
                                                    className={`form-input-cinematic ${formErrors[`products.${idx}.productId`] ? 'input-error' : ''}`}
                                                    value={fsp.productId}
                                                    onChange={(e) => {
                                                        const updated = [...form.flashSaleProducts];
                                                        updated[idx] = { ...updated[idx], productId: e.target.value, variantId: null };
                                                        setForm({ ...form, flashSaleProducts: updated });
                                                        setFormErrors(p => {
                                                            const next = { ...p };
                                                            delete next[`products.${idx}.productId`];
                                                            delete next[`products.${idx}.variantId`];
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.productName}</option>
                                                    ))}
                                                </select>
                                                {formErrors[`products.${idx}.productId`] && <span className="field-error">{formErrors[`products.${idx}.productId`]}</span>}
                                            </div>

                                            <div>
                                                <select 
                                                    className="form-input-cinematic"
                                                    value={fsp.variantId || ''}
                                                    onChange={(e) => handleRowChange(idx, 'variantId', e.target.value === '' ? null : parseInt(e.target.value))}
                                                >
                                                    <option value="">Tất cả biến thể</option>
                                                    {(productVariants[fsp.productId] || []).map(v => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.colorName} - {v.sizeName} ({new Intl.NumberFormat('vi-VN').format(v.price)}đ)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    className={`form-input-cinematic ${formErrors[`products.${idx}.salePrice`] ? 'input-error' : ''}`} 
                                                    placeholder="Nhập giá sale..."
                                                    value={fsp.salePrice === null || fsp.salePrice === undefined ? '' : fsp.salePrice}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || /^\d*$/.test(val)) {
                                                            handleRowChange(idx, 'salePrice', val);
                                                        }
                                                    }}
                                                />

                                                {/* Display Original Price (Giá Gốc) & Live Discount Percentage */}
                                                {origInfo && (
                                                    <div className="mt-1" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
                                                        <div style={{ color: '#64748b', fontWeight: 600 }}>
                                                            Giá gốc: <span style={{ textDecoration: isValidSale && !isHigherThanOrig ? 'line-through' : 'none', color: '#334155' }}>{origInfo.displayText}</span>
                                                        </div>
                                                        {isValidSale && !isHigherThanOrig && discountPct > 0 && (
                                                            <div className="mt-1" style={{ color: '#e50914', fontWeight: 700 }}>
                                                                <i className="bi bi-fire me-1"></i>
                                                                Giảm {discountPct}% <span className="text-muted font-normal">(Tiết kiệm {new Intl.NumberFormat('vi-VN').format(savingsAmount)}đ)</span>
                                                            </div>
                                                        )}
                                                        {isValidSale && isHigherThanOrig && (
                                                            <div className="mt-1 text-danger font-bold" style={{ fontSize: '11px' }}>
                                                                ⚠️ Giá sale ≥ giá gốc ({origInfo.displayText})
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {formErrors[`products.${idx}.salePrice`] && <span className="field-error">{formErrors[`products.${idx}.salePrice`]}</span>}
                                            </div>

                                            <div>
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    disabled={!!fsp.isUnlimited}
                                                    className={`form-input-cinematic ${formErrors[`products.${idx}.quantityLimit`] ? 'input-error' : ''}`} 
                                                    placeholder={fsp.isUnlimited ? "∞ Không giới hạn" : "Nhập số lượng..."}
                                                    value={fsp.isUnlimited ? '∞ Không giới hạn' : (fsp.quantityLimit === null || fsp.quantityLimit === undefined ? '' : fsp.quantityLimit)}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || /^\d*$/.test(val)) {
                                                            handleRowChange(idx, 'quantityLimit', val);
                                                        }
                                                    }}
                                                />
                                                <label className="d-flex align-items-center gap-1 mt-1 cursor-pointer select-none" style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-check-input mt-0"
                                                        style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                                                        checked={!!fsp.isUnlimited}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            const updated = [...form.flashSaleProducts];
                                                            updated[idx] = {
                                                                ...updated[idx],
                                                                isUnlimited: isChecked,
                                                                quantityLimit: isChecked ? 0 : '5'
                                                            };
                                                            setForm({ ...form, flashSaleProducts: updated });
                                                            setFormErrors(p => {
                                                                const next = { ...p };
                                                                delete next[`products.${idx}.quantityLimit`];
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                    <span>Không giới hạn (∞)</span>
                                                </label>
                                                {formErrors[`products.${idx}.quantityLimit`] && <span className="field-error">{formErrors[`products.${idx}.quantityLimit`]}</span>}
                                            </div>

                                            <button type="button" className="action-btn-icon icon-delete align-self-start mt-1" onClick={() => handleRemoveRow(idx)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    );
                                })}

                                {form.flashSaleProducts.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontStyle: 'italic', fontSize: '13px' }}>
                                        {formErrors.productsList ? (
                                            <span className="field-error" style={{ fontSize: '13px' }}>{formErrors.productsList}</span>
                                        ) : (
                                            "Chưa có sản phẩm nào được chọn tham gia Flash Sale."
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '50px', marginTop: '30px' }}>
                            <button type="submit" className="btn-red-skew" style={{ minWidth: '200px' }}>LƯU CHIẾN DỊCH</button>
                            <Link to="/admin/flashsales" className="btn-red-skew" style={{ background: 'transparent', border: '1px solid #dadce0', color: '#000', borderRadius: '8px', boxShadow: 'none' }}>HỦY BỎ</Link>
                        </div>
                    </form>
                </div>

                <style>{`
    .sub-title-neon { display: block; color: var(--accent-red) !important; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
    .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }

    .card-cinematic { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 30px; margin-bottom: 30px; border-radius: 12px; }
    .card-section-title { font-family: 'Oswald'; color: #000; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; display: inline-block; text-transform: uppercase; }
    .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }

    .form-grid-cinematic { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-label { display: block; color: #000; font-size: 13px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; font-family: 'Oswald'; }
    .form-input-cinematic { width: 100%; background: #fff; border: 1.5px solid #dadce0; padding: 12px; color: #3c4043; outline: none; transition: 0.2s; font-size: 14px; font-weight: 500; box-shadow: none; border-radius: 8px; box-sizing: border-box; }
    .form-input-cinematic:focus { border-color: #e50914; box-shadow: 0 0 0 3px rgba(229,9,20,0.08); }
    .input-error { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229,9,20,0.1) !important; }
    .field-error { color: #e50914; font-size: 12.5px; margin-top: 6px; display: block; font-weight: 500; }
    .flex-1 { flex: 1; }

    .btn-red-skew {
        background: #fff; color: #000; border: none; padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase;
        transition: 0.3s; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;
    }
    .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-2px); }

    .product-list-container-alt { border: 1px solid #e2e8f0; overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .product-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 60px; gap: 15px; padding: 15px 20px; border-bottom: 1px solid #f1f5f9; align-items: center; }
    .product-row.header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; }
    .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
    .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }

    /* ===== SCHEDULE SECTION ===== */
    .schedule-section {
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
    }
    .schedule-section-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 20px;
        background: #f8fafc;
        border-bottom: 1.5px solid #e2e8f0;
    }
    .schedule-section-label {
        font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 800;
        letter-spacing: 1.5px; color: #000; text-transform: uppercase;
    }
    .schedule-past-badge {
        font-size: 11px; font-weight: 600; color: #6b7280;
        background: #f1f5f9; border: 1px solid #e2e8f0;
        padding: 4px 10px; border-radius: 20px;
    }
    .schedule-body {
        display: grid; grid-template-columns: 1fr 60px 1fr;
        padding: 24px 20px; gap: 0;
    }
    .schedule-col { display: flex; flex-direction: column; gap: 12px; }

    /* Shift quick-pick pills */
    .shift-hint-text { font-size: 11.5px; color: #6b7280; font-weight: 600; margin-bottom: 6px; margin-top: 0; }
    .shift-pill {
        flex: 1; min-width: 80px;
        background: #f8fafc; border: 1.5px solid #dadce0;
        color: #3c4043; padding: 8px 12px; border-radius: 8px;
        font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: all 0.18s; letter-spacing: 0.5px; text-align: center;
    }
    .shift-pill:hover { background: #fff0f0; border-color: #e50914; color: #e50914; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(229,9,20,0.12); }
    .shift-pill-active { background: #e50914 !important; border-color: #e50914 !important; color: #fff !important; box-shadow: 0 4px 12px rgba(229,9,20,0.3); }

    /* Start date input */
    .schedule-input-row { display: flex; gap: 8px; align-items: stretch; }
    .now-pill {
        display: flex; align-items: center; gap: 5px; flex-shrink: 0;
        background: #f8fafc; border: 1.5px solid #dadce0;
        color: #3c4043; padding: 0 14px; border-radius: 8px;
        font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 700;
        cursor: pointer; transition: 0.18s; white-space: nowrap; letter-spacing: 0.5px;
    }
    .now-pill:hover { background: #fff0f0; border-color: #e50914; color: #e50914; }

    /* Preview chips */
    .schedule-preview-chip {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; border-radius: 8px;
        font-size: 12.5px; font-weight: 500;
    }
    .schedule-preview-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .schedule-preview-red   { background: #fff5f5; border: 1px solid #fecaca; color: #991b1b; }
    .schedule-preview-red strong { color: #e50914; font-weight: 700; }

    /* Timeline divider */
    .schedule-divider {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0 16px; gap: 4px;
    }
    .schedule-divider-line { flex: 1; width: 1px; background: linear-gradient(to bottom, transparent, #dadce0, transparent); min-height: 20px; }
    .schedule-divider-pill {
        display: flex; flex-direction: column; align-items: center; gap: 2px;
        background: #fff0f0; border: 1.5px solid #fecaca;
        color: #e50914; border-radius: 20px; padding: 6px 10px;
        font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 800;
        letter-spacing: 0.5px;
    }

    /* Duration slider */
    .duration-block { padding: 4px 0; }
    .dur-tick { font-size: 10px; color: #9ca3af; font-weight: 600; font-family: 'Oswald'; }
    .dur-slider {
        width: 100%; -webkit-appearance: none; appearance: none;
        height: 5px; border-radius: 5px; outline: none; cursor: pointer;
        background: linear-gradient(to right, #e50914 var(--pct, 0%), #e2e8f0 var(--pct, 0%));
        transition: background 0.1s;
    }
    .dur-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 18px; height: 18px; border-radius: 50%;
        background: #e50914; cursor: pointer;
        box-shadow: 0 0 0 3px rgba(229,9,20,0.15), 0 2px 6px rgba(229,9,20,0.3);
        transition: 0.15s;
    }
    .dur-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
    .dur-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #e50914; border: none; cursor: pointer; }

    /* Duration stepper */
    .dur-stepper {
        display: flex; align-items: center; gap: 0;
        border: 1.5px solid #dadce0; border-radius: 8px; overflow: hidden; background: #fff;
    }
    .dur-step-btn {
        background: #f8fafc; border: none; color: #3c4043;
        width: 36px; height: 36px; font-size: 16px;
        cursor: pointer; transition: 0.15s;
        display: flex; align-items: center; justify-content: center;
    }
    .dur-step-btn:hover { background: #e50914; color: #fff; }
    .dur-number {
        width: 52px; border: none;
        border-left: 1.5px solid #dadce0; border-right: 1.5px solid #dadce0;
        color: #000; font-size: 16px; font-weight: 800; text-align: center;
        outline: none; padding: 6px 4px; font-family: 'Oswald', sans-serif;
        background: #fff;
    }
    .dur-number::-webkit-inner-spin-button, .dur-number::-webkit-outer-spin-button { display: none; }
    .dur-unit { font-size: 11px; font-weight: 800; color: #9ca3af; font-family: 'Oswald'; letter-spacing: 1px; padding: 0 10px; }
    .dur-range-note { font-size: 11px; color: #9ca3af; font-style: italic; }

    @media (max-width: 640px) {
        .schedule-body { grid-template-columns: 1fr; }
        .schedule-divider { flex-direction: row; padding: 10px 0; }
        .schedule-divider-line { flex: 1; width: auto; height: 1px; min-height: unset; }
    }
`}</style>
            </AdminLayout>
        );
    };

export default AdminFlashSaleForm;
