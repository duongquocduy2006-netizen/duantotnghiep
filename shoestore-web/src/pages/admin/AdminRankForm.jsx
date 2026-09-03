import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AdminRankForm.css';

const AdminRankForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        rankName: '',
        minPoints: '',
        colorCode: '#94A3B8',
        discountPercent: '',
        freeShipping: false
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (isEdit) {
            const fetchRank = async () => {
                try {
                    const res = await api.get(`/api/membership/ranks/${id}`);
                    if (res.data && res.data.success) {
                        setForm({
                            id: res.data.rank.id,
                            rankName: res.data.rank.rankName,
                            minPoints: res.data.rank.minPoints,
                            colorCode: res.data.rank.colorCode || '#94A3B8',
                            discountPercent: res.data.rank.discountPercent !== null && res.data.rank.discountPercent !== undefined ? res.data.rank.discountPercent : '',
                            freeShipping: !!res.data.rank.freeShipping
                        });
                    }
                } catch (err) {
                    console.error('Lỗi tải thông tin hạng thành viên:', err);
                }
            };
            fetchRank();
        } else {
            setForm({
                rankName: '',
                minPoints: '',
                colorCode: '#94A3B8',
                discountPercent: '',
                freeShipping: false
            });
        }
    }, [isEdit, id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const errors = {};
        if (!form.rankName || !form.rankName.trim()) {
            errors.rankName = "Vui lòng nhập tên hạng thành viên!";
        }
        if (form.minPoints === '' || isNaN(form.minPoints) || parseInt(form.minPoints) < 0) {
            errors.minPoints = "Vui lòng nhập ngưỡng điểm tối thiểu (>= 0)!";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lưu thất bại. Vui lòng kiểm tra các lỗi nhập liệu bên dưới!" }));
            return;
        }
        setFormErrors({});

        try {
            const payload = {
                id: isEdit ? parseInt(id) : null,
                rankName: form.rankName.trim(),
                minPoints: parseInt(form.minPoints),
                colorCode: form.colorCode,
                discountPercent: 0,
                freeShipping: form.freeShipping
            };
            const res = await api.post('/api/membership/ranks', payload);
            if (res.data && res.data.success) {
                sessionStorage.setItem('toast_message', isEdit ? 'Cập nhật hạng thành công!' : 'Thêm hạng thành viên thành công!');
                navigate('/admin/ranks');
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: "Lỗi: " + (res.data.message || "Không thể lưu.") }));
            }
        } catch (err) {
            console.error('Lỗi khi lưu hạng thành viên:', err);
            const errMsg = err.response?.data?.message || err.message || "Có lỗi xảy ra khi lưu hạng thành viên.";
            if (errMsg.includes("Tên hạng")) {
                setFormErrors(p => ({ ...p, rankName: errMsg }));
            } else if (errMsg.includes("Ngưỡng điểm")) {
                setFormErrors(p => ({ ...p, minPoints: errMsg }));
            }
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        }
    };

    return (
        <AdminLayout>
            <div className="admin-rank-form-page">
                <div className="admin-page-header" style={{ marginBottom: '30px', marginTop: '10px' }}>
                    <div className="header-left">
                        <span className="sub-title-neon"><i className="bi bi-star"></i> MEMBERSHIP</span>
                        <h1 className="cinematic-title">{isEdit ? 'CHỈNH SỬA HẠNG' : 'THÊM HẠNG MỚI'}</h1>
                    </div>
                </div>

                <div className="card-cinematic">
                    <h3 className="card-section-title">Thông Tin Hạng Thành Viên</h3>
                    <p style={{ fontFamily: 'Inter', fontSize: '14px', marginBottom: '25px', color: '#666' }}>Thiết lập tên hạng và ngưỡng điểm để đạt được hạng này.</p>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label className="form-label"><i className="bi bi-tag"></i> Tên hạng thành viên *</label>
                            <input 
                                type="text" 
                                className={`form-input-cinematic ${formErrors.rankName ? 'input-error' : ''}`} 
                                placeholder="Ví dụ: Đồng, Bạc, Vàng, Kim Cương..." 
                                required
                                value={form.rankName}
                                onChange={(e) => {
                                    setForm({...form, rankName: e.target.value});
                                    if (formErrors.rankName) setFormErrors(p => ({...p, rankName: ''}));
                                }}
                            />
                            {formErrors.rankName && <span className="field-error">{formErrors.rankName}</span>}
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label"><i className="bi bi-lightning"></i> Ngưỡng điểm tối thiểu *</label>
                            <input 
                                type="number" 
                                className={`form-input-cinematic ${formErrors.minPoints ? 'input-error' : ''}`} 
                                placeholder="Ví dụ: 0, 5000, 10000..." 
                                required 
                                min="0"
                                value={form.minPoints}
                                onChange={(e) => {
                                    setForm({...form, minPoints: e.target.value});
                                    if (formErrors.minPoints) setFormErrors(p => ({...p, minPoints: ''}));
                                }}
                            />
                            {formErrors.minPoints && <span className="field-error">{formErrors.minPoints}</span>}
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label"><i className="bi bi-palette"></i> Màu sắc hiển thị (Mã màu Hex)</label>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <input 
                                    type="color" 
                                    className="form-input-cinematic" 
                                    style={{ width: '80px', padding: '5px', height: '48px', cursor: 'pointer' }}
                                    value={form.colorCode}
                                    onChange={(e) => setForm({...form, colorCode: e.target.value})}
                                />
                                <input 
                                    type="text" 
                                    className="form-input-cinematic" 
                                    placeholder="#000000"
                                    value={form.colorCode.toUpperCase()}
                                    onChange={(e) => setForm({...form, colorCode: e.target.value})}
                                    style={{ flex: 1 }}
                                    maxLength="7"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                                type="checkbox" 
                                id="freeShippingCheckbox"
                                className="form-check-input-cinematic"
                                checked={form.freeShipping}
                                onChange={(e) => setForm({...form, freeShipping: e.target.checked})}
                                style={{
                                    width: '22px',
                                    height: '22px',
                                    accentColor: '#e50914',
                                    cursor: 'pointer'
                                }}
                            />
                            <label htmlFor="freeShippingCheckbox" className="form-label" style={{ margin: 0, cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'Inter' }}>
                                <i className="bi bi-truck" style={{ color: '#e50914' }}></i> Miễn phí giao hàng (Free Shipping) cho hạng này
                            </label>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label">Xem trước Badge</label>
                            <div style={{ padding: '25px', background: '#f8f9fa', border: '1px dashed #dcdcdc', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
                                <span 
                                    style={{ 
                                        color: '#fff', 
                                        backgroundColor: form.colorCode,
                                        padding: '6px 18px', 
                                        borderRadius: '100px', 
                                        fontSize: '11px', 
                                        fontWeight: 700, 
                                        textTransform: 'uppercase', 
                                        border: '1px solid rgba(0,0,0,0.08)', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <i className="bi bi-star-fill" style={{ fontSize: '10px' }}></i>
                                    <span>{form.rankName || 'Tên Hạng'}</span>
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                            <button type="submit" className="btn-red-flat" style={{ minWidth: '180px' }}>
                                <i className="bi bi-save"></i> &nbsp;LƯU THÔNG TIN
                            </button>
                            <Link to="/admin/ranks" className="btn-outline-flat" style={{ minWidth: '120px', textAlign: 'center' }}>
                                <i className="bi bi-arrow-left"></i> &nbsp;QUAY LẠI
                            </Link>
                        </div>
                    </form>
                </div>
                <style>{`
                    .sub-title-neon { display: block; color: #e50914; font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-bottom: 5px; text-transform: uppercase; }
                    .cinematic-title { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 800; color: #111; margin: 0; line-height: 1.2; letter-spacing: -0.5px; }
                    
                    .card-cinematic { background: #fff; border: 1px solid #eaeaea; box-shadow: 0 4px 20px rgba(0,0,0,0.02); padding: 35px; margin-bottom: 30px; border-radius: 16px; }
                    .card-section-title { font-family: 'Inter'; color: #111; font-size: 20px; font-weight: 700; margin-bottom: 6px; }
                    
                    .form-label { display: block; color: #444; font-size: 13px; font-weight: 600; margin-bottom: 8px; font-family: 'Inter'; }
                    .form-input-cinematic { width: 100%; background: #fff; border: 1px solid #dcdcdc; border-radius: 8px; padding: 12px; color: #222; outline: none; transition: all 0.3s ease; font-size: 14px; font-weight: 500; font-family: 'Inter'; }
                    .form-input-cinematic:focus { border-color: #e50914; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1); }

                    .btn-red-flat { 
                        background: #e50914; color: #fff; border: none; padding: 12px 24px; font-family: 'Inter', sans-serif; font-weight: 700; text-transform: uppercase; 
                        transition: all 0.3s ease; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
                        border-radius: 10px; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
                    }
                    .btn-red-flat:hover { background: #b8070f; box-shadow: 0 6px 18px rgba(229, 9, 20, 0.35); transform: translateY(-2px); color: #fff; }

                    .btn-outline-flat {
                        background: transparent; color: #4a5568; border: 1px solid #e2e8f0; padding: 12px 24px; font-family: 'Inter', sans-serif; font-weight: 700; text-transform: uppercase;
                        transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;
                        border-radius: 10px;
                    }
                    .btn-outline-flat:hover { background: #f7fafc; color: #1a202c; border-color: #cbd5e0; }
                    .input-error {
                        border-color: #ef4444 !important;
                        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                    }
                    .field-error {
                        display: block;
                        color: #ef4444;
                        font-size: 11px;
                        font-weight: 600;
                        margin-top: 5px;
                        letter-spacing: 0.3px;
                        font-family: 'Inter', sans-serif;
                    }
                `}</style>
            </div>
        </AdminLayout>
    );
};

export default AdminRankForm;
