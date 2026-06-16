import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Shop.css'; // Sử dụng chung style card của Shop

const Favourites = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);

    const fetchFavourites = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/favourites');
            if (response.data && response.data.success) {
                setLoggedIn(true);
                setProducts(response.data.products || []);
            } else {
                setLoggedIn(false);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách yêu thích:", err);
            setLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFavourites();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleRemove = async (id) => {
        try {
            const response = await api.post('/api/favourites/toggle', { productId: id });
            if (response.data && response.data.success) {
                setProducts(products.filter(p => p.id !== id));
            } else {
                alert('Có lỗi xảy ra khi xóa sản phẩm yêu thích.');
            }
        } catch (err) {
            console.error("Lỗi xóa sản phẩm yêu thích:", err);
            alert('Lỗi kết nối khi xóa sản phẩm yêu thích.');
        }
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://ui-avatars.com/api/?name=SP&background=fff&color=000&bold=true';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '4rem', height: '4rem', borderWidth: '5px' }}></div>
                        <p className="mt-3 font-oswald fw-bold text-uppercase letter-spacing-1">ĐANG TẢI DỮ LIỆU...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn) {
        return (
            <Layout>
                <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                    <div className="container py-5" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="text-center py-5 px-4 border border-dark border-4 bg-white" style={{boxShadow: '10px 10px 0 #e50914', maxWidth: '600px', width: '100%'}}>
                            <i className="fa-solid fa-user-lock fa-4x text-danger mb-4 opacity-75"></i>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark" style={{fontSize: '40px'}}>CHƯA ĐĂNG NHẬP</h3>
                            <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 my-4">Đăng nhập để lưu lại danh sách những sản phẩm bạn yêu thích và trải nghiệm mua sắm tốt hơn.</p>
                            <Link to="/login" className="btn-god-tier mt-2 d-inline-block">
                                <span>ĐĂNG NHẬP NGAY</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="home-god-tier position-relative bg-white" style={{minHeight: '100vh', paddingBottom: '100px'}}>
                {/* FILM GRAIN TEXTURE */}
                <div className="god-film-grain" style={{opacity: 0.05}}></div>

                {/* EPIC HERO */}
                <div className="epic-page-header py-5 bg-white position-relative overflow-hidden border-bottom border-dark border-3">
                    <div className="god-watermark-bg text-dark opacity-10" style={{fontSize: '15vw', top: '10%'}}>FAVOURITES</div>
                    
                    <div className="container text-center position-relative z-1 py-5">
                        <span className="bg-danger text-white px-4 py-1 font-oswald fw-bold fs-5 text-uppercase animate__animated animate__fadeInDown d-inline-block border border-dark border-2" style={{boxShadow: '4px 4px 0 #000'}}>YOUR COLLECTION</span>
                        <h1 className="font-oswald fw-bold mt-3 mb-0 text-uppercase animate__animated animate__fadeInUp text-dark" style={{fontSize: '5rem', letterSpacing: '4px', textShadow: '4px 4px 0 #e50914'}}>SẢN PHẨM YÊU THÍCH</h1>
                        <p className="font-oswald text-muted mx-auto mt-4 letter-spacing-1 fw-bold text-uppercase fs-5" style={{ maxWidth: '600px' }}>
                            Danh sách những thiết kế bạn đã chọn lọc. Đừng bỏ lỡ cơ hội sở hữu chúng trước khi hết hàng.
                        </p>
                    </div>
                </div>

                <div className="container py-5 position-relative z-1">
                    {products.length > 0 ? (
                        <div className="row g-4">
                            {products.map((p, index) => (
                                <div key={p.id} className="col-lg-3 col-md-4 col-6 animate__animated animate__fadeInUp" style={{ animationDelay: `${index * 0.15}s` }}>
                                    <div className="epic-product-card h-100 bg-white border border-dark border-4 position-relative d-flex flex-column" style={{boxShadow: '8px 8px 0 #e50914', transition: 'transform 0.2s'}}>
                                        <Link to={`/details?id=${p.id}`} className="stretched-link" style={{ zIndex: 1 }}></Link>
                                        
                                        <div className="epic-card-img-box position-relative border-bottom border-dark border-4 p-4 overflow-hidden" style={{aspectRatio: '1', backgroundColor: '#f8f9fa'}}>
                                            <img src={getImageUrl(p.image_url)} alt={p.product_name} className="w-100 h-100 object-fit-contain" />
                                            
                                            <div className="epic-card-actions position-absolute" style={{ top: '10px', left: '10px', zIndex: 10 }}>
                                                <button 
                                                    className="btn rounded-0 border border-dark border-2 bg-white text-danger"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(p.id); }}
                                                    title="Xóa khỏi danh sách"
                                                    style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 #000', transition: 'all 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-2px, -2px)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(0, 0)'}
                                                >
                                                    <i className="fa-solid fa-heart" style={{ fontSize: '18px' }}></i>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="epic-card-info p-3 text-center d-flex flex-column flex-grow-1">
                                            <div className="epic-brand text-danger fw-bold font-oswald text-uppercase">{p.brand_name}</div>
                                            <h5 className="epic-name font-oswald fw-bold text-uppercase mt-2 mb-2 text-dark" style={{ minHeight: '45px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.product_name}
                                            </h5>
                                            <div className="epic-price mb-3">
                                                <span className="price-new font-oswald fs-4 fw-bold text-danger">{p.min_price != null ? formatCurrency(p.min_price) : 'Liên hệ'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto border-top border-dark border-4" style={{ position: 'relative', zIndex: 10 }}>
                                            <Link 
                                                to={`/details?id=${p.id}`} 
                                                className="btn w-100 font-oswald text-uppercase fw-bold rounded-0 text-white"
                                                style={{ padding: '12px', background: '#e50914' }}
                                            >
                                                <i className="fa-solid fa-cart-shopping me-2"></i> THÊM GIỎ HÀNG
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5 border border-dark border-4 bg-white" style={{boxShadow: '10px 10px 0 #e50914', maxWidth: '800px', margin: '0 auto'}}>
                            <i className="fa-solid fa-heart-crack fa-4x text-danger mb-4 opacity-75"></i>
                            <h3 className="font-oswald fw-bold text-uppercase text-dark" style={{fontSize: '40px'}}>DANH SÁCH TRỐNG</h3>
                            <p className="fw-bold text-muted font-oswald letter-spacing-1 fs-5 my-4">Bạn chưa lưu sản phẩm nào vào danh sách yêu thích.</p>
                            <Link to="/shop" className="btn-god-tier mt-2 d-inline-block">
                                <span>TIẾP TỤC MUA SẮM</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Favourites;
