import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReviewModal = ({ orderCode, onClose }) => {
    const [reviewProduct, setReviewProduct] = useState(null);
    const [rating, setRating] = useState(5);
    const [content, setContent] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderCode) return;
        const fetchOrder = async () => {
            try {
                const res = await api.get(`/api/orders/${orderCode}`);
                console.log("ReviewModal: fetched order:", orderCode, res.data);
                if (res.data && res.data.success && res.data.items && res.data.items.length > 0) {
                    setReviewProduct(res.data.items[0]);
                } else {
                    console.error("ReviewModal: Empty or failed items list:", res.data);
                    setIsError(true);
                    setMessage('Không tìm thấy sản phẩm trong đơn hàng này để đánh giá.');
                }
            } catch (err) {
                console.error("ReviewModal: Lỗi lấy đơn hàng:", err);
                setIsError(true);
                setMessage('Lỗi tải thông tin đơn hàng để đánh giá.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderCode]);

    const submitReview = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!content.trim()) {
            setIsError(true);
            setMessage('Vui lòng nhập nội dung đánh giá!');
            return;
        }
        try {
            const fd = new FormData();
            fd.append('productId', reviewProduct.product_id);
            fd.append('rating', rating);
            fd.append('content', content);
            
            const res = await api.post('/api/reviews/add', fd);
            if (res.data && res.data.success) {
                setIsError(false);
                setMessage('Cảm ơn Xếp đã đánh giá!');
                setTimeout(() => onClose(), 2000);
            } else {
                setIsError(true);
                setMessage(res.data.message || 'Lỗi gửi đánh giá');
            }
        } catch (err) {
            console.error(err);
            setIsError(true);
            setMessage('Lỗi khi gửi đánh giá');
        }
    };

    if (loading) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div className="bg-dark text-light p-4 rounded text-center" style={{ width: '400px', maxWidth: '90%', border: '1px solid #333' }}>
                    <div className="spinner-border text-danger mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}></div>
                    <p className="mb-0 text-muted" style={{ fontFamily: 'Orbitron, sans-serif' }}>ĐANG TẢI THÔNG TIN SẢN PHẨM...</p>
                </div>
            </div>
        );
    }

    if (!reviewProduct) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div className="bg-dark text-light p-4 rounded position-relative" style={{ width: '400px', maxWidth: '90%', border: '1px solid #333' }}>
                    <button 
                        onClick={onClose} 
                        style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                        &times;
                    </button>
                    <h4 className="mb-3 text-center text-danger" style={{ fontFamily: 'Orbitron, sans-serif' }}>LỖI</h4>
                    <div className="alert alert-danger py-2 px-3 mb-0" style={{ fontSize: '0.9rem' }}>
                        {message || 'Không thể hiển thị thông tin sản phẩm.'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="bg-dark text-light p-4 rounded position-relative animate__animated animate__fadeInUp" style={{ width: '400px', maxWidth: '90%', border: '1px solid #333' }}>
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                    &times;
                </button>
                <h4 className="mb-3 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>ĐÁNH GIÁ SẢN PHẨM</h4>
                <p className="text-center text-muted mb-4">Sản phẩm: {reviewProduct.product_name}</p>
                
                <form onSubmit={submitReview}>
                    <div className="text-center mb-4">
                        {[1, 2, 3, 4, 5].map(num => (
                            <button 
                                type="button" 
                                key={num} 
                                onClick={() => setRating(num)} 
                                style={{ border: 'none', background: 'none', color: num <= rating ? '#ffb800' : '#ddd', fontSize: '2rem', cursor: 'pointer' }}>
                                ★
                            </button>
                        ))}
                    </div>
                    <div className="mb-3">
                        <textarea 
                            className="form-control bg-dark text-light border-secondary" 
                            rows="3" 
                            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        ></textarea>
                    </div>
                    
                    {message && (
                        <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} py-2 px-3 mb-3`} style={{ fontSize: '0.9rem' }}>
                            {message}
                        </div>
                    )}

                    <button type="submit" className="btn btn-danger w-100 fw-bold" style={{ letterSpacing: '1px' }}>GỬI ĐÁNH GIÁ</button>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
