import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QuickCartModal = ({ productId, isOpen = true, onClose }) => {
    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && productId) {
            setLoading(true);
            setProduct(null);
            setVariants([]);
            setSelectedVariantId(null);
            setQty(1);
            
            api.get(`/api/products/${productId}`)
                .then(res => {
                    if (res.data && res.data.success) {
                        setProduct(res.data.product);
                        const v = res.data.variants || [];
                        setVariants(v);
                        if (v.length > 0) {
                            const inStock = v.find(item => item.quantity > 0) || v[0];
                            setSelectedVariantId(inStock.id);
                        }
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, productId]);

    if (!isOpen) return null;

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=f0f2f5&color=333&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleAddToCart = async () => {
        if (!selectedVariantId) { alert("Vui lòng chọn phân loại!"); return; }
        const variant = variants.find(v => v.id === selectedVariantId);
        if (!variant || variant.quantity <= 0) { alert("Sản phẩm này đã hết hàng!"); return; }
        
        try {
            const response = await api.post('/api/cart/add', { variantId: selectedVariantId, quantity: qty });
            if (response.data && response.data.success) {
                onClose();
                window.dispatchEvent(new Event('cartUpdated'));
            } else {
                alert(response.data.message || 'Lỗi thêm vào giỏ hàng.');
            }
        } catch (err) {
            if (err.response && err.response.status === 401) alert('Vui lòng đăng nhập!');
            else alert('Lỗi xử lý giỏ hàng.');
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050, fontFamily: "'Inter', sans-serif" }} onClick={onClose}>
            <div className="modal-dialog modal-dialog-centered modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-content border-0" style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                    <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 position-relative">
                        <button type="button" className="btn-close position-absolute top-0 end-0 m-3" onClick={onClose} style={{ zIndex: 10, opacity: 0.5 }}></button>
                    </div>
                    
                    <div className="modal-body px-4 pb-4 pt-2 text-dark">
                        {loading ? (
                            <div className="text-center py-5"><div className="spinner-border text-primary" style={{ width: '2rem', height: '2rem' }}></div></div>
                        ) : product ? (
                            <>
                                {/* PRODUCT INFO */}
                                <div className="d-flex mb-4 align-items-center bg-white">
                                    <div style={{ width: '90px', height: '90px', backgroundColor: '#f5f7fa', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={getImageUrl(product.imageUrl || (product.images && product.images.length > 0 ? (product.images.find(i => i.isPrimary)?.url || product.images[0].url) : ''))} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                                    </div>
                                    <div className="ms-3 flex-grow-1">
                                        <div className="text-uppercase fw-bold mb-1" style={{ fontSize: '11px', color: '#ff4d4d', letterSpacing: '1px' }}>{product.brandName || 'SHOES'}</div>
                                        <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '15px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {product.productName}
                                        </h6>
                                        <div className="fw-bold" style={{ fontSize: '18px', color: '#111' }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(variants.find(v => v.id === selectedVariantId)?.price || product.price || 0)}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* VARIANTS */}
                                <div className="mb-4">
                                    <label className="fw-semibold mb-3 text-dark" style={{ fontSize: '14px' }}>Kích cỡ & Màu sắc</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {variants.map(v => {
                                            const isSelected = selectedVariantId === v.id;
                                            const isOut = v.quantity === 0;
                                            return (
                                                <button 
                                                    key={v.id} 
                                                    onClick={() => setSelectedVariantId(v.id)}
                                                    disabled={isOut}
                                                    className="btn fw-semibold"
                                                    style={{ 
                                                        borderRadius: '10px', 
                                                        padding: '8px 16px', 
                                                        fontSize: '13px',
                                                        backgroundColor: isSelected ? '#111' : '#f0f2f5',
                                                        color: isSelected ? '#fff' : (isOut ? '#a0a0a0' : '#333'),
                                                        border: 'none',
                                                        opacity: isOut ? 0.6 : 1,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {v.sizeName} - {v.colorName} {isOut && '(Hết)'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {/* QUANTITY */}
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                    <span className="fw-semibold text-dark" style={{ fontSize: '14px' }}>Số lượng</span>
                                    <div className="d-flex align-items-center" style={{ backgroundColor: '#f0f2f5', borderRadius: '12px', padding: '4px' }}>
                                        <button className="btn btn-sm d-flex align-items-center justify-content-center border-0 text-dark" style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} onClick={() => setQty(Math.max(1, qty - 1))}><i className="fa-solid fa-minus" style={{ fontSize: '12px' }}></i></button>
                                        <span className="fw-bold text-dark" style={{ width: '40px', textAlign: 'center', fontSize: '15px' }}>{qty}</span>
                                        <button className="btn btn-sm d-flex align-items-center justify-content-center border-0 text-dark" style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} onClick={() => {
                                            const max = variants.find(v => v.id === selectedVariantId)?.quantity || 1;
                                            if (qty < max) setQty(qty + 1);
                                        }}><i className="fa-solid fa-plus" style={{ fontSize: '12px' }}></i></button>
                                    </div>
                                </div>
                                
                                {/* ACTION */}
                                <button 
                                    className="btn w-100 fw-bold shadow-none" 
                                    onClick={handleAddToCart} 
                                    disabled={loading || !product || !selectedVariantId}
                                    style={{ 
                                        backgroundColor: '#ff4d4d', 
                                        color: '#fff', 
                                        borderRadius: '14px', 
                                        padding: '14px',
                                        fontSize: '15px',
                                        letterSpacing: '0.5px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    THÊM VÀO GIỎ HÀNG
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-muted py-4">Không tải được thông tin sản phẩm.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickCartModal;
