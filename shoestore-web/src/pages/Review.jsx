import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';

const Review = () => {
    const { orderCode } = useParams();
    const navigate = useNavigate();
    const [reviewProduct, setReviewProduct] = useState(null);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [content, setContent] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);

    const [submitHovered, setSubmitHovered] = useState(false);
    const [textareaFocused, setTextareaFocused] = useState(false);

    useEffect(() => {
        if (!orderCode) return;
        const fetchOrder = async () => {
            try {
                const res = await api.get(`/api/orders/${orderCode}`);
                if (res.data && res.data.success && res.data.items && res.data.items.length > 0) {
                    setReviewProduct(res.data.items[0]);
                } else {
                    setIsError(true);
                    setMessage('Không tìm thấy sản phẩm trong đơn hàng này để đánh giá.');
                }
            } catch (err) {
                console.error("Lỗi lấy đơn hàng:", err);
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
                setMessage('Cảm ơn bạn đã gửi đánh giá! Đang quay lại trang đơn hàng...');
                setTimeout(() => navigate('/orders'), 2000);
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

    const getRatingLabel = (val) => {
        switch(val) {
            case 1: return 'Tệ';
            case 2: return 'Không hài lòng';
            case 3: return 'Bình thường';
            case 4: return 'Rất tốt';
            case 5: return 'Tuyệt vời!';
            default: return '';
        }
    };

    // Styling definitions
    const containerStyle = {
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '40px 16px'
    };

    const cardStyle = {
        background: 'linear-gradient(145deg, #1e1e24, #121216)',
        color: '#f8fafc',
        padding: '40px 32px',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(229, 9, 20, 0.08)',
        width: '460px',
        maxWidth: '100%',
        position: 'relative',
        fontFamily: "'Poppins', sans-serif",
    };

    const titleStyle = {
        fontFamily: "'Oswald', sans-serif",
        fontSize: '24px',
        fontWeight: '700',
        letterSpacing: '1px',
        textAlign: 'center',
        marginBottom: '6px',
        color: '#fff',
        textTransform: 'uppercase'
    };

    const productTitleStyle = {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '13px',
        marginBottom: '28px',
        fontWeight: '500',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        paddingBottom: '16px'
    };

    const textareaStyle = {
        width: '100%',
        height: '120px',
        background: 'rgba(0, 0, 0, 0.25)',
        border: textareaFocused ? '1px solid rgba(229, 9, 20, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: textareaFocused ? '0 0 10px rgba(229, 9, 20, 0.15)' : 'none',
        borderRadius: '14px',
        color: '#fff',
        padding: '14px 18px',
        fontSize: '14px',
        lineHeight: '1.6',
        resize: 'none',
        transition: 'all 0.3s ease',
        outline: 'none',
        marginBottom: '16px'
    };

    const submitBtnStyle = {
        background: 'linear-gradient(135deg, #e50914, #ff3838)',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        padding: '14px 20px',
        fontSize: '14px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        width: '100%',
        cursor: 'pointer',
        boxShadow: '0 8px 24px -6px rgba(229, 9, 20, 0.4)',
        transition: 'all 0.3s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        outline: 'none',
        ...(submitHovered && {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 28px -6px rgba(229, 9, 20, 0.6)',
            filter: 'brightness(1.15)'
        })
    };

    const backBtnStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#64748b',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '24px',
        transition: 'color 0.2s ease'
    };

    if (loading) {
        return (
            <Layout>
                <div style={containerStyle}>
                    <div style={{...cardStyle, textAlign: 'center', width: '350px'}}>
                        <div className="spinner-border text-danger mb-4" role="status" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }}></div>
                        <p className="mb-0 text-muted" style={{ fontFamily: "'Oswald', sans-serif", fontSize: '14px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Đang tải sản phẩm...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!reviewProduct) {
        return (
            <Layout>
                <div style={containerStyle}>
                    <div style={{...cardStyle, width: '400px'}}>
                        <h4 className="mb-3 text-center text-danger" style={{ fontFamily: "'Oswald', sans-serif", fontWeight: '700', letterSpacing: '1px' }}>CÓ LỖI XẢY RA</h4>
                        <div className="alert alert-danger py-2 px-3 text-center mb-4" style={{ fontSize: '0.85rem', background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)', color: '#ea868f', borderRadius: '12px' }}>
                            {message || 'Không thể hiển thị thông tin sản phẩm.'}
                        </div>
                        <Link to="/orders" className="btn btn-outline-secondary w-100" style={{borderRadius: '12px', fontSize: '14px'}}>
                            Quay lại trang đơn hàng
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const currentActiveRating = hoverRating || rating;

    return (
        <Layout>
            {/* PAGE HEADER */}
            <div className="profile-page-header py-4">
                <div className="container">
                    <div className="d-flex align-items-center gap-2" style={{fontSize: '13px', color: '#64748b'}}>
                        <Link to="/" style={{color: '#64748b', textDecoration: 'none'}}>Trang chủ</Link>
                        <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                        <Link to="/orders" style={{color: '#64748b', textDecoration: 'none'}}>Lịch sử đơn hàng</Link>
                        <i className="fa-solid fa-chevron-right" style={{fontSize: '10px'}}></i>
                        <span style={{color: '#0f172a', fontWeight: 600}}>Đánh giá sản phẩm</span>
                    </div>
                </div>
            </div>

            <div style={containerStyle}>
                <div className="container d-flex flex-column align-items-center">
                    <div style={{width: '460px', maxWidth: '100%'}}>
                        <Link to="/orders" style={backBtnStyle} onMouseEnter={(e) => e.target.style.color = '#0f172a'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>
                            <i className="fa-solid fa-arrow-left"></i> Quay lại lịch sử đơn hàng
                        </Link>
                    </div>

                    <div style={cardStyle} className="animate__animated animate__fadeInUp">
                        <h4 style={titleStyle}>ĐÁNH GIÁ SẢN PHẨM</h4>
                        <p style={productTitleStyle}>Sản phẩm: {reviewProduct.product_name}</p>
                        
                        <form onSubmit={submitReview}>
                            <div className="text-center mb-2">
                                {[1, 2, 3, 4, 5].map(num => {
                                    const isLit = num <= currentActiveRating;
                                    return (
                                        <button 
                                            type="button" 
                                            key={num} 
                                            onClick={() => setRating(num)}
                                            onMouseEnter={() => setHoverRating(num)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            style={{ 
                                                border: 'none', 
                                                background: 'none', 
                                                color: isLit ? '#ffb800' : 'rgba(255,255,255,0.15)', 
                                                fontSize: '2.5rem', 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                padding: '0 4px',
                                                filter: isLit ? 'drop-shadow(0 0 8px rgba(255, 184, 0, 0.6))' : 'none',
                                                transform: num <= hoverRating ? 'scale(1.15)' : 'none',
                                                outline: 'none'
                                            }}
                                        >
                                            ★
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <div className="text-center mb-4" style={{ height: '20px', fontSize: '13px', color: '#ffb800', fontWeight: '600' }}>
                                {getRatingLabel(currentActiveRating)}
                            </div>

                            <div className="mb-3">
                                <textarea 
                                    style={textareaStyle}
                                    placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    onFocus={() => setTextareaFocused(true)}
                                    onBlur={() => setTextareaFocused(false)}
                                ></textarea>
                            </div>
                            
                            {message && (
                                <div 
                                    className={`alert ${isError ? 'alert-danger' : 'alert-success'} py-2 px-3 mb-3`} 
                                    style={{ 
                                        fontSize: '0.85rem',
                                        borderRadius: '12px',
                                        background: isError ? 'rgba(220, 53, 69, 0.1)' : 'rgba(25, 135, 84, 0.1)',
                                        border: isError ? '1px solid rgba(220, 53, 69, 0.2)' : '1px solid rgba(25, 135, 84, 0.2)',
                                        color: isError ? '#ea868f' : '#75b798'
                                    }}
                                >
                                    {message}
                                </div>
                            )}
        
                            <button 
                                type="submit" 
                                style={submitBtnStyle}
                                onMouseEnter={() => setSubmitHovered(true)}
                                onMouseLeave={() => setSubmitHovered(false)}
                            >
                                <i className="fa-regular fa-paper-plane" style={{fontSize: '13px'}}></i>
                                GỬI ĐÁNH GIÁ
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Review;
