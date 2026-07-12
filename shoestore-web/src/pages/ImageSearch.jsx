import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import 'animate.css';

const ImageSearch = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { aiResult, products, imageUrl } = location.state || {}; // Nhận dữ liệu từ Header

    useEffect(() => {
        if (!aiResult) {
            navigate('/'); // Nếu không có data thì đá về home
        }
    }, [aiResult, navigate]);

    if (!aiResult) return null;

    // Helper format VND
    const formatPrice = (price) => {
        if (!price) return '0 đ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    return (
        <div className="container py-5" style={{ minHeight: '80vh' }}>
            <h2 className="mb-4 text-center font-oswald" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                <i className="fa fa-magic me-2 text-primary"></i>KẾT QUẢ TÌM KIẾM AI
            </h2>

            <div className="row mb-5 animate__animated animate__fadeInUp">
                <div className="col-md-4 text-center">
                    {imageUrl && (
                        <div className="position-relative" style={{ display: 'inline-block' }}>
                            <img src={imageUrl} alt="Uploaded" className="img-fluid rounded-4 shadow-lg" style={{ maxHeight: '300px', objectFit: 'cover' }} />
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '14px', zIndex: 10 }}>
                                Your Image
                            </span>
                        </div>
                    )}
                </div>
                <div className="col-md-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-light">
                        <div className="card-body p-4">
                            <h4 className="text-secondary mb-3"><i className="fa fa-microchip me-2"></i>Dữ liệu phân tích (JSON)</h4>
                            <div className="row g-3">
                                <div className="col-sm-6">
                                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-4 border-danger">
                                        <small className="text-muted d-block text-uppercase fw-bold">Thương hiệu</small>
                                        <span className="fs-5 fw-bold">{aiResult.brand || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-4 border-primary">
                                        <small className="text-muted d-block text-uppercase fw-bold">Màu sắc</small>
                                        <span className="fs-5 fw-bold">{aiResult.color || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-4 border-success">
                                        <small className="text-muted d-block text-uppercase fw-bold">Thể loại</small>
                                        <span className="fs-5 fw-bold">{aiResult.category || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-4 border-warning">
                                        <small className="text-muted d-block text-uppercase fw-bold">Phong cách</small>
                                        <span className="fs-5 fw-bold">{aiResult.style || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="my-5" />

            <h3 className="mb-4 pb-2 border-bottom d-inline-block">
                Top Sản Phẩm Tương Đồng (<span className="text-danger">{products?.length || 0}</span>)
            </h3>

            {(!products || products.length === 0) ? (
                <div className="text-center py-5">
                    <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-box-8120658-6515822.png" width="200" alt="empty" />
                    <h5 className="text-muted mt-3">Ối! Hệ thống chấm điểm chả thấy đôi giày nào giống như AI phân tích :(</h5>
                </div>
            ) : (
                <div className="row row-cols-2 row-cols-md-4 row-cols-lg-5 g-4 animate__animated animate__fadeIn">
                    {products.map((p, idx) => (
                        <div className="col" key={p.id}>
                            <div className="card h-100 border-0 shadow-sm product-card-hover" style={{ borderRadius: '15px', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                                {/* Label Top Match */}
                                {idx === 0 && (
                                    <div className="position-absolute top-0 start-0 z-3 p-2">
                                        <span className="badge bg-danger">Khớp nhất 🥇</span>
                                    </div>
                                )}

                                <div className="p-3 d-flex align-items-center justify-content-center bg-white" style={{ height: '220px' }}>
                                    {p.images && p.images.length > 0 ? (
                                        <img src={`/uploads/${p.images[0].imageUrl}`} className="img-fluid" alt={p.productName} style={{ maxHeight: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span className="text-muted"><i className="fa fa-shoe-prints fa-3x"></i></span>
                                    )}
                                </div>
                                <div className="card-body d-flex flex-column bg-light">
                                    <h6 className="card-title text-truncate fw-bold mb-1" title={p.productName}>{p.productName}</h6>
                                    <p className="card-text text-muted small mb-2">{p.brandName}</p>
                                    <div className="mt-auto">
                                        <span className="fw-bold text-danger fs-5">
                                            {p.variants && p.variants.length > 0 ? formatPrice(p.variants[0].price) : 'N/A'}
                                        </span>
                                    </div>
                                    <Link to={`/details?id=${p.id}`} className="btn btn-outline-dark btn-sm w-100 mt-3 rounded-pill fw-bold">
                                        XEM CHI TIẾT
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageSearch;
