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
        durationHours: 1,
        flashSaleProducts: []
    });

    // Track which fixed shift is selected (9, 14, or 20). null = none chosen yet.
    const [selectedShift, setSelectedShift] = useState(null);

    const [products, setProducts] = useState([]);
    const [productVariants, setProductVariants] = useState({});
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Returns today's date string (YYYY-MM-DD) for date picker
    const getTodayDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Returns today's date string for use as `min` attribute (blocks past dates)
    const getMinDateString = () => {
        return getTodayDateString();
    };

    // Quick-pick: select a fixed shift hour (9, 14, or 20)
    const pickShift = (shiftHour) => {
        setSelectedShift(shiftHour);
        // If no date is picked yet, auto-set to today (or tomorrow if shift has passed)
        if (!form.startDate) {
            const now = new Date();
            const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), shiftHour, 0, 0, 0);
            if (candidate <= now) {
                candidate.setDate(candidate.getDate() + 1);
            }
            const y = candidate.getFullYear();
            const mo = String(candidate.getMonth() + 1).padStart(2, '0');
            const d = String(candidate.getDate()).padStart(2, '0');
            setForm(prev => ({ ...prev, startDate: `${y}-${mo}-${d}` }));
        }
        if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: '' }));
    };

    // 1. Fetch available products list for dropdown selection
    const fetchProducts = async () => {
        try {
            const response = await api.get('/api/products');
            const prods = response.data || [];
            setProducts(prods);

            // Xử lý nạp variants cho từng sản phẩm (tránh lỗi khi backend chưa restart)
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

    // Helper: build a full datetime string from date (YYYY-MM-DD) + shift hour
    const buildFullStartDate = (dateStr, shiftHour) => {
        if (!dateStr || shiftHour == null) return '';
        return `${dateStr}T${String(shiftHour).padStart(2, '0')}:00`;
    };

    // Helper: compute endDate string from full startDate datetime + durationHours
    const computeEndDate = (startDateStr, hours) => {
        if (!startDateStr || !hours) return '';
        const start = new Date(startDateStr);
        if (isNaN(start.getTime())) return '';
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        const y = end.getFullYear();
        const mo = String(end.getMonth() + 1).padStart(2, '0');
        const d = String(end.getDate()).padStart(2, '0');
        const h = String(end.getHours()).padStart(2, '0');
        const mi = String(end.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${d}T${h}:${mi}`;
    };

    // 2. Fetch campaign details if editing
    const fetchFlashSaleDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/flash-sales/${id}`);
            if (response.data && response.data.success) {
                const fs = response.data.flashSale;
                // Extract date (YYYY-MM-DD) and shift hour from existing startDate
                const startFormatted = fs.startDate ? fs.startDate.substring(0, 16) : '';
                const startDateOnly = fs.startDate ? fs.startDate.substring(0, 10) : '';
                const endFormatted = fs.endDate ? fs.endDate.substring(0, 16) : '';

                // Detect shift hour from startDate
                let detectedShift = null;
                if (startFormatted) {
                    const startObj = new Date(startFormatted);
                    const h = startObj.getHours();
                    if ([9, 14, 20].includes(h)) detectedShift = h;
                }

                // Compute durationHours from start and end
                let durHours = 1;
                if (startFormatted && endFormatted) {
                    const diffMs = new Date(endFormatted) - new Date(startFormatted);
                    const diffH = Math.round(diffMs / (1000 * 60 * 60));
                    if (diffH >= 1 && diffH <= 24) durHours = diffH;
                }

                setSelectedShift(detectedShift);
                setForm({
                    id: fs.id,
                    name: fs.name || '',
                    status: String(fs.status != null ? fs.status : 1),
                    startDate: startDateOnly,
                    endDate: endFormatted,
                    durationHours: durHours,
                    flashSaleProducts: fs.flashSaleProducts || []
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
                { id: "temp." + Date.now(), productId: products[0].id, variantId: null, salePrice: 0, quantityLimit: 5, soldQuantity: 0 }
            ]
        });
        // Clear productsList error and any row errors to prevent mismatch
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
        
        // Reset product row errors to prevent misalignment
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
        
        // Clear specific row error and duplicate error
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
        
        // Inline Validation - collect all errors
        const errors = {};

        if (!form.name || !form.name.trim()) {
            errors.name = "Vui lòng nhập tên chương trình Flash Sale!";
        }

        if (!form.startDate) {
            errors.startDate = "Vui lòng chọn ngày bắt đầu chiến dịch!";
        }

        if (selectedShift == null) {
            errors.startDate = (errors.startDate || '') + (errors.startDate ? ' ' : '') + "Vui lòng chọn khung giờ (ca) Flash Sale!";
        }

        if (!form.durationHours || form.durationHours < 1) {
            errors.durationHours = "Thời lượng tối thiểu là 1 giờ!";
        } else if (form.durationHours > 24) {
            errors.durationHours = "Thời lượng tối đa là 24 giờ!";
        }

        // Build full startDate datetime from date + shift
        const fullStartDate = buildFullStartDate(form.startDate, selectedShift);
        const computedEndDate = computeEndDate(fullStartDate, form.durationHours);
        const submittedForm = { ...form, startDate: fullStartDate, endDate: computedEndDate };

        if (fullStartDate && computedEndDate) {
            const start = new Date(fullStartDate);
            const end = new Date(computedEndDate);
            
            let maxEnd = new Date(start);
            
            if (selectedShift === 9) {
                maxEnd.setHours(14, 0, 0, 0);
            } else if (selectedShift === 14) {
                maxEnd.setHours(20, 0, 0, 0);
            } else if (selectedShift === 20) {
                maxEnd.setDate(maxEnd.getDate() + 1);
                maxEnd.setHours(9, 0, 0, 0);
            }

            if (start >= end) {
                errors.durationHours = "Thời gian kết thúc phải sau thời gian bắt đầu!";
            } else if (end > maxEnd) {
                const nextShiftHour = selectedShift === 9 ? '14:00' : (selectedShift === 14 ? '20:00' : '09:00 ngày hôm sau');
                errors.durationHours = `Ca ${String(selectedShift).padStart(2, '0')}:00 phải kết thúc trước ${nextShiftHour}!`;
            }
        }

        if (form.flashSaleProducts.length === 0) {
            errors.productsList = "Vui lòng chọn ít nhất 1 sản phẩm tham gia Flash Sale!";
        }

        // Validate each product row
        const uniqueProductKeys = new Set();
        for (let i = 0; i < form.flashSaleProducts.length; i++) {
            const fsp = form.flashSaleProducts[i];
            
            // Check for valid sale price
            if (fsp.salePrice === undefined || fsp.salePrice === null || fsp.salePrice <= 0) {
                errors[`products.${i}.salePrice`] = "Vui lòng nhập giá sale lớn hơn 0đ!";
            }

            // Check for valid quantity limit
            if (fsp.quantityLimit === undefined || fsp.quantityLimit === null || fsp.quantityLimit <= 0) {
                errors[`products.${i}.quantityLimit`] = "Vui lòng nhập số lượng giới hạn lớn hơn 0!";
            }

            // Check duplicate product + variant combo
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
            const payload = {
                ...submittedForm,
                status: parseInt(submittedForm.status)
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
                
            if (errMsg.includes("chỉ được phép bắt đầu vào các khung giờ cố định") || errMsg.includes("một chiến dịch hoạt động")) {
                setFormErrors(prev => ({ ...prev, startDate: errMsg }));
            } else if (errMsg.includes("phải kết thúc trước")) {
                setFormErrors(prev => ({ ...prev, durationHours: errMsg }));
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
                                    {/* Section label */}
                                    <div className="schedule-section-header">
                                        <span className="schedule-section-label">
                                            <i className="bi bi-calendar2-week me-2"></i>LỊCH TRÌNH CHIẾN DỊCH
                                        </span>
                                        <span className="schedule-past-badge">
                                            <i className="bi bi-shield-check me-1"></i>Chỉ từ hôm nay trở đi
                                        </span>
                                    </div>

                                    <div className="schedule-body">
                                        {/* ---- CỔT TRÁI: NGÀY BẮT ĐẦU ---- */}
                                        <div className="schedule-col">
                                            <label className="form-label">
                                                <i className="bi bi-play-circle-fill text-danger me-1"></i>
                                                BẮT ĐẦU *
                                            </label>

                                            {/* Quick-pick ca */}
                                            <div className="mb-2">
                                                <p className="shift-hint-text"><i className="bi bi-lightning-fill me-1"></i>Chọn ca Flash Sale: *</p>
                                                <div className="d-flex gap-2 flex-wrap">
                                                    {[9, 14, 20].map(h => (
                                                        <button
                                                            key={h}
                                                            type="button"
                                                            className={`shift-pill ${
                                                                selectedShift === h
                                                                    ? 'shift-pill-active'
                                                                    : ''
                                                            }`}
                                                            onClick={() => pickShift(h)}
                                                        >
                                                            <i className="bi bi-clock me-1"></i>
                                                            {String(h).padStart(2, '0')}:00
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Date picker + nút Hôm nay */}
                                            <div className="schedule-input-row">
                                                <input
                                                    type="date"
                                                    className={`form-input-cinematic flex-1 ${formErrors.startDate ? 'input-error' : ''}`}
                                                    value={form.startDate}
                                                    min={getMinDateString()}
                                                    onChange={(e) => {
                                                        setForm({ ...form, startDate: e.target.value });
                                                        if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: '' }));
                                                    }}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="now-pill"
                                                    title="Chọn ngày hôm nay"
                                                    onClick={() => {
                                                        setForm({ ...form, startDate: getTodayDateString() });
                                                        if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: '' }));
                                                    }}
                                                >
                                                    <i className="bi bi-calendar-event"></i>
                                                    <span>Hôm nay</span>
                                                </button>
                                            </div>
                                            {formErrors.startDate && <span className="field-error">{formErrors.startDate}</span>}

                                            {/* Preview ngày + ca đầy đủ */}
                                            {form.startDate && selectedShift != null && (
                                                <div className="schedule-preview-chip schedule-preview-green">
                                                    <i className="bi bi-calendar-check"></i>
                                                    <span>{(() => {
                                                        const fullDt = buildFullStartDate(form.startDate, selectedShift);
                                                        if (!fullDt) return '—';
                                                        return new Date(fullDt).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                    })()}</span>
                                                </div>
                                            )}
                                            {form.startDate && selectedShift == null && (
                                                <div className="schedule-preview-chip" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                                                    <i className="bi bi-exclamation-triangle"></i>
                                                    <span>Vui lòng chọn ca (09:00 / 14:00 / 20:00) ở trên</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* ---- DIVIDER ---- */}
                                        <div className="schedule-divider">
                                            <div className="schedule-divider-line"></div>
                                            <div className="schedule-divider-pill">
                                                <i className="bi bi-arrow-right"></i>
                                                <span>{selectedShift != null ? `${String(selectedShift).padStart(2,'0')}:00` : '??:00'} +{form.durationHours}h</span>
                                            </div>
                                            <div className="schedule-divider-line"></div>
                                        </div>

                                        {/* ---- CỔT PHẢI: THỜI LƯỢNG ---- */}
                                        <div className="schedule-col">
                                            <label className="form-label">
                                                <i className="bi bi-hourglass-split text-danger me-1"></i>
                                                THỜI LƯỢNG KếT THÚC *
                                            </label>

                                            {/* Slider */}
                                            <div className="duration-block">
                                                <div className="d-flex justify-content-between mb-1">
                                                    {[1,6,12,18,24].map(t => (
                                                        <span key={t} className="dur-tick">{t}h</span>
                                                    ))}
                                                </div>
                                                <input
                                                    type="range" min="1" max="24" step="1"
                                                    className="dur-slider"
                                                    value={form.durationHours}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setForm({ ...form, durationHours: val });
                                                        if (formErrors.durationHours) setFormErrors(p => ({ ...p, durationHours: '' }));
                                                    }}
                                                    style={{ '--pct': `${((form.durationHours - 1) / 23) * 100}%` }}
                                                />
                                            </div>

                                            {/* Stepper */}
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="dur-stepper">
                                                    <button type="button" className="dur-step-btn" onClick={() => {
                                                        const v = Math.max(1, form.durationHours - 1);
                                                        setForm({ ...form, durationHours: v });
                                                        if (formErrors.durationHours) setFormErrors(p => ({ ...p, durationHours: '' }));
                                                    }}>
                                                        <i className="bi bi-dash"></i>
                                                    </button>
                                                    <input
                                                        type="number" min="1" max="24"
                                                        className={`dur-number ${formErrors.durationHours ? 'input-error' : ''}`}
                                                        value={form.durationHours}
                                                        onChange={(e) => {
                                                            let val = parseInt(e.target.value) || 1;
                                                            if (val < 1) val = 1;
                                                            if (val > 24) val = 24;
                                                            setForm({ ...form, durationHours: val });
                                                            if (formErrors.durationHours) setFormErrors(p => ({ ...p, durationHours: '' }));
                                                        }}
                                                    />
                                                    <button type="button" className="dur-step-btn" onClick={() => {
                                                        const v = Math.min(24, form.durationHours + 1);
                                                        setForm({ ...form, durationHours: v });
                                                        if (formErrors.durationHours) setFormErrors(p => ({ ...p, durationHours: '' }));
                                                    }}>
                                                        <i className="bi bi-plus"></i>
                                                    </button>
                                                    <span className="dur-unit">GIỜ</span>
                                                </div>
                                                <span className="dur-range-note">Tối thiểu 1h • Tối đa 24h</span>
                                            </div>

                                            {formErrors.durationHours && <span className="field-error">{formErrors.durationHours}</span>}

                                            {/* Kết thúc preview */}
                                            {form.startDate && selectedShift != null && (
                                                <div className="schedule-preview-chip schedule-preview-red">
                                                    <i className="bi bi-flag-fill"></i>
                                                    <span>Kết thúc lúc&nbsp;<strong>{(() => {
                                                        const fullStart = buildFullStartDate(form.startDate, selectedShift);
                                                        const end = computeEndDate(fullStart, form.durationHours);
                                                        if (!end) return '—';
                                                        return new Date(end).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                    })()}</strong></span>
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

                                {form.flashSaleProducts.map((fsp, idx) => (
                                    <div key={fsp.id} className="product-row">
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
                                                    <option key={v.id} value={v.id}>{v.colorName} - {v.sizeName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <input 
                                                type="number" 
                                                className={`form-input-cinematic ${formErrors[`products.${idx}.salePrice`] ? 'input-error' : ''}`} 
                                                value={fsp.salePrice}
                                                onChange={(e) => handleRowChange(idx, 'salePrice', parseInt(e.target.value) || 0)}
                                            />
                                            {formErrors[`products.${idx}.salePrice`] && <span className="field-error">{formErrors[`products.${idx}.salePrice`]}</span>}
                                        </div>
                                        <div>
                                            <input 
                                                type="number" 
                                                className={`form-input-cinematic ${formErrors[`products.${idx}.quantityLimit`] ? 'input-error' : ''}`} 
                                                value={fsp.quantityLimit}
                                                onChange={(e) => handleRowChange(idx, 'quantityLimit', parseInt(e.target.value) || 0)}
                                            />
                                            {formErrors[`products.${idx}.quantityLimit`] && <span className="field-error">{formErrors[`products.${idx}.quantityLimit`]}</span>}
                                        </div>
                                        <button type="button" className="action-btn-icon icon-delete" onClick={() => handleRemoveRow(idx)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}

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
