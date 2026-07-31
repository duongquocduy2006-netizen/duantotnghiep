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

    const getCurrentDateTimeString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    // 2. Fetch campaign details if editing
    const fetchFlashSaleDetail = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/flash-sales/${id}`);
            if (response.data && response.data.success) {
                const fs = response.data.flashSale;
                // Format dates to datetime-local format (YYYY-MM-DDTHH:mm)
                const startFormatted = fs.startDate ? fs.startDate.substring(0, 16) : '';
                const endFormatted = fs.endDate ? fs.endDate.substring(0, 16) : '';

                setForm({
                    id: fs.id,
                    name: fs.name || '',
                    status: String(fs.status != null ? fs.status : 1),
                    startDate: startFormatted,
                    endDate: endFormatted,
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

        if (!form.endDate) {
            errors.endDate = "Vui lòng chọn ngày kết thúc chiến dịch!";
        }

        if (form.startDate && form.endDate) {
            const start = new Date(form.startDate);
            const end = new Date(form.endDate);
            
            const startHour = start.getHours();
            const startMinute = start.getMinutes();
            
            let isValidShift = false;
            let maxEnd = new Date(start);
            
            if (startHour === 9 && startMinute === 0) {
                isValidShift = true;
                maxEnd.setHours(14, 0, 0, 0);
            } else if (startHour === 14 && startMinute === 0) {
                isValidShift = true;
                maxEnd.setHours(20, 0, 0, 0);
            } else if (startHour === 20 && startMinute === 0) {
                isValidShift = true;
                maxEnd.setDate(maxEnd.getDate() + 1);
                maxEnd.setHours(9, 0, 0, 0);
            }

            if (!isValidShift) {
                errors.startDate = "Flash Sale chỉ được phép bắt đầu vào các khung giờ cố định (09:00, 14:00, 20:00) và mỗi khung giờ chỉ được có 1 chiến dịch hoạt động. Vui lòng chỉnh sửa lại thời gian.";
            } else {
                if (start >= end) {
                    errors.endDate = "Ngày kết thúc phải diễn ra sau ngày bắt đầu!";
                } else if (end > maxEnd) {
                    const nextShiftHour = startHour === 9 ? '14:00' : (startHour === 14 ? '20:00' : '09:00 ngày hôm sau');
                    errors.endDate = `Ca ${startHour.toString().padStart(2, '0')}:00 phải kết thúc trước ${nextShiftHour}!`;
                }
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
                ...form,
                status: parseInt(form.status)
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
                            <div className="form-group">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label mb-0">Ngày bắt đầu *</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                        style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                        onClick={() => {
                                            setForm({...form, startDate: getCurrentDateTimeString()});
                                            if (formErrors.startDate) setFormErrors(p => ({...p, startDate: ''}));
                                        }}
                                    >
                                        <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                    </button>
                                </div>
                                <input 
                                    type="datetime-local" 
                                    className={`form-input-cinematic ${formErrors.startDate ? 'input-error' : ''}`} 
                                    value={form.startDate}
                                    onChange={(e) => {
                                        setForm({...form, startDate: e.target.value});
                                        if (formErrors.startDate) setFormErrors(p => ({...p, startDate: ''}));
                                    }}
                                    required
                                />
                                {formErrors.startDate && <span className="field-error">{formErrors.startDate}</span>}
                            </div>
                            <div className="form-group">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label mb-0">Ngày kết thúc *</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-link p-0 text-danger text-decoration-none font-oswald text-uppercase fw-bold" 
                                        style={{ fontSize: '11px', letterSpacing: '0.5px' }}
                                        onClick={() => {
                                            setForm({...form, endDate: getCurrentDateTimeString()});
                                            if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                        }}
                                    >
                                        <i className="bi bi-clock-history me-1"></i> Ngay lúc này
                                    </button>
                                </div>
                                <input 
                                    type="datetime-local" 
                                    className={`form-input-cinematic ${formErrors.endDate ? 'input-error' : ''}`} 
                                    value={form.endDate}
                                    onChange={(e) => {
                                        setForm({...form, endDate: e.target.value});
                                        if (formErrors.endDate) setFormErrors(p => ({...p, endDate: ''}));
                                    }}
                                    required
                                />
                                {formErrors.endDate && <span className="field-error">{formErrors.endDate}</span>}
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
    .form-input-cinematic { width: 100%; background: #fff; border: 1.5px solid #dadce0; padding: 12px; color: #3c4043; outline: none; transition: 0.2s; font-size: 14px; font-weight: 500; box-shadow: none; border-radius: 8px; }
    .form-input-cinematic:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
    .input-error { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229,9,20,0.1) !important; }
    .field-error { color: #e50914; font-size: 12.5px; margin-top: 6px; display: block; font-weight: 500; }

    .btn-red-skew { 
        background: #fff; color: #000; border: none; padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
        transition: 0.3s; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;
    }
    .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

    .product-list-container-alt { border: 1px solid #e2e8f0; overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .product-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 60px; gap: 15px; padding: 15px 20px; border-bottom: 1px solid #f1f5f9; align-items: center; }
    .product-row.header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .product-row.header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    
    .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; }
    .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
    .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }
`}</style>
            </AdminLayout>
        );
    };

export default AdminFlashSaleForm;
