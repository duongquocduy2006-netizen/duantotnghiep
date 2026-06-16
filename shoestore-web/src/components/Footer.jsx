import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {

    return (
        <>
            <footer className="custom-footer">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-4 col-md-6 mb-5 footer-col">
                            <h5 className="footer-heading">Về SHOESTORE</h5>
                            <p className="mb-4" style={{ color: '#888', lineHeight: '1.8' }}>
                                Chúng tôi không chỉ bán giày, chúng tôi mang đến phong cách sống. Khám phá bộ sưu tập Sneaker chính hãng.
                            </p>
                            <div className="contact-item">
                                <i className="fas fa-map-marker-alt contact-icon"></i>
                                <span>Đường Trương Vĩnh Nguyên, Q. Cái Răng, TP. Cần Thơ</span>
                            </div>
                            <div className="contact-item">
                                <i className="fas fa-envelope contact-icon"></i>
                                <span>cskh@shoestore.vn</span>
                            </div>
                        </div>

                        <div className="col-lg-2 col-md-6 mb-5 footer-col">
                            <h5 className="footer-heading">Hỗ Trợ</h5>
                            <ul className="footer-links">
                                <li><Link to="#">Tra cứu đơn hàng</Link></li>
                                <li><Link to="#">Hướng dẫn chọn size</Link></li>
                                <li><Link to="#">Chính sách đổi trả</Link></li>
                                <li><Link to="#">Chính sách bảo mật</Link></li>
                            </ul>
                        </div>

                        <div className="col-lg-2 col-md-6 mb-5 footer-col">
                            <h5 className="footer-heading">Khám Phá</h5>
                            <ul className="footer-links">
                                <li><Link to="#">Về chúng tôi</Link></li>
                                <li><Link to="#">Blog thời trang</Link></li>
                                <li><Link to="#">Tuyển dụng</Link></li>
                                <li><Link to="#">Liên hệ hợp tác</Link></li>
                            </ul>
                        </div>

                        <div className="col-lg-4 col-md-6 mb-5 footer-col">
                            <h5 className="footer-heading">Đăng Ký Nhận Tin</h5>
                            <p className="small text-white opacity-75">Nhận mã giảm giá <strong>10%</strong> ngay hôm nay.</p>
                            <form action="#" className="newsletter-form">
                                <input type="email" className="newsletter-input" placeholder="Email của bạn..." />
                                <button type="button" className="newsletter-btn"><i className="fas fa-arrow-right"></i></button>
                            </form>
                            <div className="mt-4">
                                <div className="social-icons">
                                    <Link to="#" className="social-btn fb"><i className="fab fa-facebook-f"></i></Link>
                                    <Link to="#" className="social-btn ins"><i className="fab fa-instagram"></i></Link>
                                    <Link to="#" className="social-btn tt"><i className="fab fa-tiktok"></i></Link>
                                    <Link to="#" className="social-btn yt"><i className="fab fa-youtube"></i></Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="container">
                        <div className="row align-items-center">
                            <div className="col-md-6 text-center text-md-start">
                                <p className="mb-0 text-secondary small">&copy; 2026 <strong>SHOESTORE</strong>. All Rights Reserved.</p>
                            </div>
                            <div className="col-md-6 text-center text-md-end payment-icons">
                                <i className="fab fa-cc-visa"></i>
                                <i className="fab fa-cc-mastercard"></i>
                                <i className="fab fa-cc-paypal"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

        </>
    );
};

export default Footer;
