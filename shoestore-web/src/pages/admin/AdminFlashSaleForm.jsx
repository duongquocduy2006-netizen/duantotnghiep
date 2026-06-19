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
            alert("Không thể tải thông tin chiến dịch Flash Sale.");
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
            alert("Vui lòng đợi tải sản phẩm hoặc tạo sản phẩm trước!");
            return;
        }
        setForm({
            ...form,
            flashSaleProducts: [
                ...form.flashSaleProducts,
                { id: "temp." + Date.now(), productId: products[0].id, variantId: null, salePrice: 0, quantityLimit: 5, soldQuantity: 0 }
            ]
        });
    };

    const handleRemoveRow = (idx) => {
        const updated = [...form.flashSaleProducts];
        updated.splice(idx, 1);
        setForm({ ...form, flashSaleProducts: updated });
    };

    const handleRowChange = (idx, field, value) => {
        const updated = [...form.flashSaleProducts];
        updated[idx] = { ...updated[idx], [field]: value };
        setForm({ ...form, flashSaleProducts: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (form.flashSaleProducts.length === 0) {
            alert("Vui lòng chọn ít nhất 1 sản phẩm tham gia Flash Sale!");
            return;
        }

        const start = new Date(form.startDate);
        const end = new Date(form.endDate);
        if (start >= end) {
            alert("Ngày kết thúc phải diễn ra sau ngày bắt đầu!");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...form,
                status: parseInt(form.status)
            };
            const response = await api.post('/api/flash-sales/save', payload);
            if (response.data && response.data.success) {
                alert("Lưu chiến dịch Flash Sale thành công!");
                navigate('/admin/flashsales');
            } else {
                alert(response.data.message || "Lưu thất bại.");
            }
        } catch (err) {
            console.error("Lỗi lưu chiến dịch:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể kết nối đến server để lưu chiến dịch.";
            alert(errMsg);
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

                <form onSubmit={handleSubmit}>
                    <div className="card-cinematic">
                        <h3 className="card-section-title">THÔNG TIN CƠ BẢN</h3>
                        <div className="form-grid-cinematic">
                            <div className="form-group">
                                <label className="form-label">Tên chương trình</label>
                                <input 
                                    type="text" 
                                    className="form-input-cinematic" 
                                    placeholder="Ví dụ: Flash Sale Cuối Tuần" 
                                    value={form.name}
                                    onChange={(e) => setForm({...form, name: e.target.value})}
                                    required
                                />
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
                                <label className="form-label">Ngày bắt đầu</label>
                                <input 
                                    type="datetime-local" 
                                    className="form-input-cinematic" 
                                    value={form.startDate}
                                    onChange={(e) => setForm({...form, startDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày kết thúc</label>
                                <input 
                                    type="datetime-local" 
                                    className="form-input-cinematic" 
                                    value={form.endDate}
                                    onChange={(e) => setForm({...form, endDate: e.target.value})}
                                    required
                                />
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
                                                className="form-input-cinematic"
                                                value={fsp.productId}
                                                onChange={(e) => {
                                                    const updated = [...form.flashSaleProducts];
                                                    updated[idx] = { ...updated[idx], productId: e.target.value, variantId: null };
                                                    setForm({ ...form, flashSaleProducts: updated });
                                                }}
                                            >
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.productName}</option>
                                                ))}
                                            </select>
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
                                                className="form-input-cinematic" 
                                                value={fsp.salePrice}
                                                onChange={(e) => handleRowChange(idx, 'salePrice', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <input 
                                                type="number" 
                                                className="form-input-cinematic" 
                                                value={fsp.quantityLimit}
                                                onChange={(e) => handleRowChange(idx, 'quantityLimit', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <button type="button" className="action-btn-icon icon-delete" onClick={() => handleRemoveRow(idx)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}

                                {form.flashSaleProducts.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontStyle: 'italic', fontSize: '13px' }}>
                                        Chưa có sản phẩm nào được chọn tham gia Flash Sale.
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
    .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
    .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
    
    .card-cinematic { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 30px; margin-bottom: 30px; border-radius: 12px; }
    .card-section-title { font-family: 'Oswald'; color: #000; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; display: inline-block; text-transform: uppercase; }
    .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }

    .form-grid-cinematic { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-label { display: block; color: #000; font-size: 13px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase; font-family: 'Oswald'; }
    .form-input-cinematic { width: 100%; background: #fff; border: 1.5px solid #dadce0; padding: 12px; color: #3c4043; outline: none; transition: 0.2s; font-size: 14px; font-weight: 500; box-shadow: none; border-radius: 8px; }
    .form-input-cinematic:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }

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
