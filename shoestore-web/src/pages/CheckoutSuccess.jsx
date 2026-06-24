import React from 'react';
import { Link } from 'react-router-dom';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
    return (
        <div className="success-page position-relative" style={{ minHeight: '80vh' }}>
            <div className="success-card animate__animated animate__zoomIn">
                <div className="success-icon animate__animated animate__bounceInDown animate__delay-1s">
                    <i className="fa fa-circle-check"></i>
                </div>
                <h2>ĐẶT HÀNG THÀNH CÔNG!</h2>
                <p>Cảm ơn Xếp đã tin tưởng ShoeStore. Đơn hàng của Xếp đang được hệ thống xử lý và sẽ sớm được giao tới địa chỉ yêu cầu.</p>
                <Link to="/" className="btn-home">TIẾP TỤC MUA SẮM</Link>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
