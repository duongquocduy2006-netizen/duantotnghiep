import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const AdminSizesColors = () => {
    const [sizes, setSizes] = useState([]);
    const [colors, setColors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modal, setModal] = useState(null); // { type: 'size'|'color', item: null|{id, name} }
    const [inputVal, setInputVal] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [sizeSearch, setSizeSearch] = useState('');
    const [colorSearch, setColorSearch] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/products/metadata');
            if (res.data && res.data.success) {
                setSizes(res.data.sizes || []);
                setColors(res.data.colors || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (type, item = null) => {
        setModal({ type, item });
        setInputVal(item ? (type === 'size' ? item.sizeName : item.colorName) : '');
        setErrorMsg('');
    };
    const closeModal = () => { setModal(null); setInputVal(''); setErrorMsg(''); };

    const handleSave = async () => {
        if (!inputVal.trim()) { setErrorMsg('Tên không được để trống!'); return; }
        setSaving(true);
        setErrorMsg('');
        try {
            const params = new URLSearchParams();
            const isSize = modal.type === 'size';
            const isEdit = !!modal.item;

            if (isEdit) {
                // Edit
                params.append('id', modal.item.id);
                params.append(isSize ? 'sizeName' : 'colorName', inputVal.trim());
                const res = await api.post(
                    isSize ? '/api/products/size/update' : '/api/products/color/update',
                    params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                if (res.data && res.data.success) {
                    if (isSize) setSizes(prev => prev.map(s => s.id === modal.item.id ? { ...s, sizeName: inputVal.trim() } : s));
                    else setColors(prev => prev.map(c => c.id === modal.item.id ? { ...c, colorName: inputVal.trim() } : c));
                    closeModal();
                } else {
                    setErrorMsg(res.data?.message || 'Lỗi cập nhật!');
                }
            } else {
                // Add
                params.append(isSize ? 'sizeName' : 'colorName', inputVal.trim());
                const res = await api.post(
                    isSize ? '/api/products/size/add' : '/api/products/color/add',
                    params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                if (res.data && res.data.success) {
                    if (isSize) setSizes(prev => [...prev, { id: res.data.id, sizeName: inputVal.trim() }]);
                    else setColors(prev => [...prev, { id: res.data.id, colorName: inputVal.trim() }]);
                    closeModal();
                } else {
                    setErrorMsg(res.data?.message || 'Lỗi thêm mới!');
                }
            }
        } catch (err) {
            setErrorMsg('Lỗi kết nối: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (type, item) => {
        const name = type === 'size' ? item.sizeName : item.colorName;
        if (!window.confirm(`Xóa ${type === 'size' ? 'size' : 'màu'} "${name}"? Các biến thể dùng ${type === 'size' ? 'size' : 'màu'} này có thể bị ảnh hưởng!`)) return;
        try {
            const params = new URLSearchParams();
            params.append('id', item.id);
            const res = await api.post(
                type === 'size' ? '/api/products/size/delete' : '/api/products/color/delete',
                params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            if (res.data && res.data.success) {
                if (type === 'size') setSizes(prev => prev.filter(s => s.id !== item.id));
                else setColors(prev => prev.filter(c => c.id !== item.id));
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Xóa thành công!' }));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: res.data?.message || 'Không thể xóa!' }));
            }
        } catch (err) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Lỗi kết nối: ' + (err.response?.data?.message || err.message) }));
        }
    };

    const filteredSizes = sizes.filter(s => !sizeSearch || s.sizeName.toLowerCase().includes(sizeSearch.toLowerCase()));
    const filteredColors = colors.filter(c => !colorSearch || c.colorName.toLowerCase().includes(colorSearch.toLowerCase()));

    const cardStyle = {
        background: '#181818', border: '1px solid #2e2e2e', borderRadius: '16px', padding: '28px', flex: 1, minWidth: '340px'
    };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '16px' };
    const thStyle = { padding: '10px 14px', background: '#1f1f1f', color: '#888', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #2e2e2e' };
    const tdStyle = { padding: '11px 14px', borderBottom: '1px solid #222', color: '#e5e5e5', fontSize: '14px', verticalAlign: 'middle' };
    const btnEdit = { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' };
    const btnDel = { background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' };
    const btnAdd = { background: '#e50914', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Oswald, sans-serif', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' };
    const searchStyle = { background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 14px', color: '#fff', fontSize: '13px', outline: 'none', width: '180px' };
    const tagStyle = { background: '#252525', border: '1px solid #3a3a3a', borderRadius: '6px', padding: '4px 12px', fontSize: '13px', fontWeight: 600, color: '#f0f0f0', display: 'inline-block' };

    return (
        <AdminLayout>
            <div style={{ padding: '0 0 40px 0' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div>
                        <span style={{ color: '#e50914', fontSize: '12px', fontFamily: 'Oswald', letterSpacing: '2px' }}>QUẢN LÝ SẢN PHẨM</span>
                        <h1 style={{ color: '#fff', fontFamily: 'Oswald', fontSize: '28px', margin: '4px 0 0' }}>SIZE & MÀU SẮC</h1>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        <div className="spinner-border" role="status" style={{ color: '#e50914' }} />
                        <p style={{ marginTop: '16px' }}>Đang tải...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {/* === SIZES === */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <h3 style={{ color: '#fff', fontFamily: 'Oswald', margin: 0, fontSize: '18px' }}>
                                    <i className="bi bi-rulers" style={{ color: '#e50914', marginRight: '8px' }} />
                                    KÍCH CỠ (SIZE) — {sizes.length}
                                </h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        style={searchStyle}
                                        placeholder="Tìm size..."
                                        value={sizeSearch}
                                        onChange={e => setSizeSearch(e.target.value)}
                                    />
                                    <button style={btnAdd} onClick={() => openModal('size')}>
                                        <i className="bi bi-plus-lg" /> THÊM SIZE
                                    </button>
                                </div>
                            </div>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Tên Size</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSizes.length === 0 ? (
                                        <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#555', fontStyle: 'italic' }}>Không có dữ liệu</td></tr>
                                    ) : filteredSizes.map((s, i) => (
                                        <tr key={s.id} style={{ transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ ...tdStyle, color: '#666', width: '40px' }}>{i + 1}</td>
                                            <td style={tdStyle}>
                                                <span style={tagStyle}>Size {s.sizeName}</span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button style={btnEdit} onClick={() => openModal('size', s)}>
                                                    <i className="bi bi-pencil-fill" /> Sửa
                                                </button>
                                                {' '}
                                                <button style={btnDel} onClick={() => handleDelete('size', s)}>
                                                    <i className="bi bi-trash-fill" /> Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* === COLORS === */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                <h3 style={{ color: '#fff', fontFamily: 'Oswald', margin: 0, fontSize: '18px' }}>
                                    <i className="bi bi-palette-fill" style={{ color: '#e50914', marginRight: '8px' }} />
                                    MÀU SẮC (COLOR) — {colors.length}
                                </h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        style={searchStyle}
                                        placeholder="Tìm màu..."
                                        value={colorSearch}
                                        onChange={e => setColorSearch(e.target.value)}
                                    />
                                    <button style={btnAdd} onClick={() => openModal('color')}>
                                        <i className="bi bi-plus-lg" /> THÊM MÀU
                                    </button>
                                </div>
                            </div>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Tên Màu</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredColors.length === 0 ? (
                                        <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#555', fontStyle: 'italic' }}>Không có dữ liệu</td></tr>
                                    ) : filteredColors.map((c, i) => (
                                        <tr key={c.id}
                                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ ...tdStyle, color: '#666', width: '40px' }}>{i + 1}</td>
                                            <td style={tdStyle}>
                                                <span style={tagStyle}>{c.colorName}</span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button style={btnEdit} onClick={() => openModal('color', c)}>
                                                    <i className="bi bi-pencil-fill" /> Sửa
                                                </button>
                                                {' '}
                                                <button style={btnDel} onClick={() => handleDelete('color', c)}>
                                                    <i className="bi bi-trash-fill" /> Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* === MODAL === */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90vw' }}>
                        <h3 style={{ color: '#fff', fontFamily: 'Oswald', margin: '0 0 20px', fontSize: '20px' }}>
                            {modal.item ? '✏️ SỬA' : '➕ THÊM'} {modal.type === 'size' ? 'SIZE' : 'MÀU SẮC'}
                        </h3>
                        <label style={{ color: '#aaa', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {modal.type === 'size' ? 'Tên Size (VD: 40, 41, 42...)' : 'Tên Màu (VD: Đỏ, Xanh Navy...)'}
                        </label>
                        <input
                            autoFocus
                            style={{ width: '100%', background: '#111', border: `1px solid ${errorMsg ? '#e50914' : '#333'}`, borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '15px', outline: 'none', marginTop: '8px', boxSizing: 'border-box' }}
                            value={inputVal}
                            onChange={e => { setInputVal(e.target.value); setErrorMsg(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            placeholder={modal.type === 'size' ? 'VD: 43' : 'VD: Xanh biển'}
                        />
                        {errorMsg && (
                            <div style={{ color: '#e50914', fontSize: '13px', marginTop: '6px' }}>
                                <i className="bi bi-exclamation-circle" /> {errorMsg}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button onClick={closeModal} style={{ background: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                                Hủy
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ background: '#e50914', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Oswald', letterSpacing: '1px', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Đang lưu...' : (modal.item ? 'CẬP NHẬT' : 'THÊM MỚI')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminSizesColors;
