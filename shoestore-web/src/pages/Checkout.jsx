import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Checkout.css';
import './Membership.css';

const Checkout = () => {
    const navigate = useNavigate();

    const [account, setAccount] = useState({ full_name: '', phone: '', email: '' });
    const [cartItems, setCartItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [voucherCode, setVoucherCode] = useState('');
    const [availableVouchers, setAvailableVouchers] = useState([]);
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [note, setNote] = useState('');
    
    // Address & GHN state
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [streetDetail, setStreetDetail] = useState('');
    
    const [shippingFee, setShippingFee] = useState(30000);

    // Map states & refs
    const [map, setMap] = useState(null);
    const customerMarkerRef = useRef(null);
    const routeLineRef = useRef(null);

    useEffect(() => {
        const fetchCheckoutData = async () => {
            let accountData = null;
            let lastAddr = null;
            try {
                const profileRes = await api.get('/api/profile');
                if (profileRes.data && profileRes.data.success) {
                    accountData = profileRes.data.account;
                    setAccount(accountData);
                    lastAddr = profileRes.data.lastAddress;
                }
            } catch (err) {
                console.error('Lỗi profile:', err);
                if (err.response && err.response.status === 401) {
                    navigate('/login');
                    return;
                }
            }

            let cartTotal = 0;
            try {
                const cartRes = await api.get('/api/cart');
                if (cartRes.data && cartRes.data.success) {
                    const items = cartRes.data.cartItems || [];
                    setCartItems(items);
                    cartTotal = cartRes.data.totalPrice || 0;
                    setTotalPrice(cartTotal);
                    
                    if (items.length === 0) {
                        alert('Giỏ hàng của bạn đang trống!');
                        navigate('/cart');
                        return;
                    }
                }
            } catch (err) {
                console.error('Lỗi cart:', err);
                alert('Không thể lấy thông tin giỏ hàng!');
                return;
            }

            try {
                const voucherRes = await api.get('/api/vouchers');
                if (voucherRes.data && voucherRes.data.success) {
                    setAvailableVouchers(voucherRes.data.vouchers || []);
                }
            } catch (err) {
                console.error('Lỗi tải voucher:', err);
            }

            // Load Provinces
            let provincesList = [];
            try {
                const res = await api.get('/api/ghn/provinces');
                if (res.data && res.data.code === 200) {
                    provincesList = res.data.data || [];
                    setProvinces(provincesList);
                }
            } catch (err) {
                console.error('Lỗi tải tỉnh thành:', err);
            }

            // Prefill last address
            if (lastAddr && lastAddr.street_detail) {
                if (accountData) {
                    setAccount(prev => ({
                        ...prev,
                        full_name: lastAddr.receiving_name || prev.full_name,
                        phone: lastAddr.phone_number || prev.phone
                    }));
                }

                // Parse address
                const parts = lastAddr.street_detail.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    const provinceText = parts[parts.length - 1];
                    const districtText = parts[parts.length - 2];
                    const wardText = parts[parts.length - 3];
                    const streetText = parts.slice(0, parts.length - 3).join(', ');

                    setStreetDetail(streetText);

                    // Match Province
                    const matchedProv = provincesList.find(p => 
                        p.ProvinceName.toLowerCase().includes(provinceText.toLowerCase()) ||
                        provinceText.toLowerCase().includes(p.ProvinceName.toLowerCase())
                    );

                    if (matchedProv) {
                        const provId = matchedProv.ProvinceID;
                        setSelectedProvince(provId);

                        // Match District
                        try {
                            const distRes = await api.get(`/api/ghn/districts?provinceId=${provId}`);
                            if (distRes.data && distRes.data.code === 200) {
                                const districtsList = distRes.data.data || [];
                                setDistricts(districtsList);

                                const matchedDist = districtsList.find(d => 
                                    d.DistrictName.toLowerCase().includes(districtText.toLowerCase()) ||
                                    districtText.toLowerCase().includes(d.DistrictName.toLowerCase())
                                );

                                if (matchedDist) {
                                    const distId = matchedDist.DistrictID;
                                    setSelectedDistrict(distId);

                                    // Match Ward
                                    try {
                                        const wardRes = await api.get(`/api/ghn/wards?districtId=${distId}`);
                                        if (wardRes.data && wardRes.data.code === 200) {
                                            const wardsList = wardRes.data.data || [];
                                            setWards(wardsList);

                                            const matchedWard = wardsList.find(w => 
                                                w.WardName.toLowerCase().includes(wardText.toLowerCase()) ||
                                                wardText.toLowerCase().includes(w.WardName.toLowerCase())
                                            );

                                            if (matchedWard) {
                                                setSelectedWard(matchedWard.WardCode);
                                                // calculate fee
                                                calculateGHNFee(distId, matchedWard.WardCode, cartTotal, accountData.membership_rank_id);
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Lỗi tải xã khi prefill:', err);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Lỗi tải huyện khi prefill:', err);
                        }
                    }
                } else {
                    setStreetDetail(lastAddr.street_detail);
                }
            }

            setLoading(false);
        };

        fetchCheckoutData();
    }, [navigate]);

    // Load Leaflet dynamically
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
            initMap();
        };
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(link);
            document.head.removeChild(script);
        };
    }, []);

    const initMap = () => {
        if (!window.L) return;
        const L = window.L;
        const mapContainer = document.getElementById('checkout-map');
        if (!mapContainer) return;
        
        const m = L.map('checkout-map').setView([10.0009, 105.7851], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(m);

        const shopIconHtml = `
            <div style='text-align:center;'>
                <i class='fa fa-home text-danger' style='font-size: 18px; margin-bottom:4px;'></i><br>
                <b style='font-family: Orbitron, sans-serif; font-size: 14px;'>VBee Shoe Store</b><br>
                <span style='color: #666;'>Lê Bình, Cần Thơ</span>
            </div>
        `;

        L.marker([10.0009, 105.7851])
            .addTo(m)
            .bindPopup(shopIconHtml)
            .openPopup();

        setMap(m);
    };

    const getCoordinates = async (address) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
            );
            const data = await response.json();
            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (err) {
            console.error('Lỗi geocoding:', err);
        }
        return null;
    };

    const showRoute = async (customerAddress) => {
        if (!map || !window.L) return;
        const L = window.L;
        const customerCoords = await getCoordinates(customerAddress);
        if (!customerCoords) return;

        if (customerMarkerRef.current) {
            map.removeLayer(customerMarkerRef.current);
        }
        if (routeLineRef.current) {
            map.removeLayer(routeLineRef.current);
        }

        const newMarker = L.marker([customerCoords.lat, customerCoords.lng])
            .addTo(map)
            .bindPopup("Địa chỉ khách")
            .openPopup();
        customerMarkerRef.current = newMarker;

        const newLine = L.polyline([
            [10.0009, 105.7851],
            [customerCoords.lat, customerCoords.lng]
        ], {
            color: 'red',
            weight: 4
        }).addTo(map);
        routeLineRef.current = newLine;

        map.fitBounds(newLine.getBounds(), { padding: [50, 50] });
    };

    useEffect(() => {
        if (!map) return;
        const provinceObj = provinces.find(p => String(p.ProvinceID) === String(selectedProvince));
        const districtObj = districts.find(d => String(d.DistrictID) === String(selectedDistrict));
        const wardObj = wards.find(w => String(w.WardCode) === String(selectedWard));

        const pText = provinceObj ? provinceObj.ProvinceName : '';
        const dText = districtObj ? districtObj.DistrictName : '';
        const wText = wardObj ? wardObj.WardName : '';

        let full = streetDetail.trim();
        if (wText) full += `, ${wText}`;
        if (dText) full += `, ${dText}`;
        if (pText) full += `, ${pText}`;

        if (full.length > 10) {
            const timer = setTimeout(() => {
                showRoute(full);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [selectedProvince, selectedDistrict, selectedWard, streetDetail, map]);

    const handleProvinceChange = async (e) => {
        const pId = e.target.value;
        setSelectedProvince(pId);
        setSelectedDistrict('');
        setSelectedWard('');
        setDistricts([]);
        setWards([]);
        
        if (pId) {
            try {
                const res = await api.get(`/api/ghn/districts?provinceId=${pId}`);
                if (res.data && res.data.code === 200) {
                    setDistricts(res.data.data || []);
                }
            } catch (err) {
                console.error('Lỗi tải quận huyện:', err);
            }
        }
    };

    const handleDistrictChange = async (e) => {
        const dId = e.target.value;
        setSelectedDistrict(dId);
        setSelectedWard('');
        setWards([]);

        if (dId) {
            try {
                const res = await api.get(`/api/ghn/wards?districtId=${dId}`);
                if (res.data && res.data.code === 200) {
                    setWards(res.data.data || []);
                }
            } catch (err) {
                console.error('Lỗi tải phường xã:', err);
            }
            calculateGHNFee(dId, '');
        }
    };

    const handleWardChange = (e) => {
        const wCode = e.target.value;
        setSelectedWard(wCode);
        if (selectedDistrict) {
            calculateGHNFee(selectedDistrict, wCode);
        }
    };

    const calculateGHNFee = async (dId, wCode, customTotal = null, customRankId = null) => {
        const currentTotal = customTotal !== null ? customTotal : totalPrice;
        
        const hasFreeShip = account?.free_shipping || (customRankId && account?.membership_rank_id === customRankId && account?.free_shipping);
        if (hasFreeShip) {
            setShippingFee(0);
            return;
        }
        if (currentTotal >= 500000) {
            setShippingFee(0);
            return;
        }
        try {
            const response = await api.post('/api/ghn/calculate-fee', {
                toDistrictId: parseInt(dId),
                toWardCode: wCode || "",
                totalAmount: Math.round(currentTotal)
            });
            if (response.data && response.data.code === 200) {
                setShippingFee(response.data.data.total || 30000);
            } else {
                setShippingFee(30000);
            }
        } catch (err) {
            console.error('Lỗi tính phí ship GHN:', err);
            setShippingFee(30000);
        }
    };

    useEffect(() => {
        if (account?.free_shipping) {
            setShippingFee(0);
        } else if (totalPrice >= 500000) {
            setShippingFee(0);
        }
    }, [totalPrice, account]);

    const finalTotal = cartItems.length > 0 ? Math.max(0, totalPrice + shippingFee - discount) : 0;

    const handleApplyVoucher = async (codeToApply) => {
        const code = typeof codeToApply === 'string' ? codeToApply : voucherCode;
        if (!code || !code.trim()) {
            alert('Vui lòng nhập mã giảm giá!');
            return;
        }
        try {
            const response = await api.post('/api/vouchers/apply', {
                voucherCode: code.trim().toUpperCase(),
                cartTotal: totalPrice
            });
            if (response.data && response.data.success) {
                const discountValue = response.data.discount || 0;
                const v = response.data.voucher;
                setAppliedVoucher({
                    code: response.data.code,
                    discountType: v.discountType || v.discount_type,
                    discountValue: v.discountValue || v.discount_value
                });
                setDiscount(discountValue);
                alert(response.data.message || 'Áp dụng mã giảm giá thành công!');
            } else {
                alert(response.data.message || 'Mã giảm giá không hợp lệ!');
                setAppliedVoucher(null);
                setDiscount(0);
            }
        } catch (err) {
            console.error('Lỗi áp dụng voucher:', err);
            const errMsg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện!';
            alert(errMsg);
            setAppliedVoucher(null);
            setDiscount(0);
        }
    };

    const handleCancelVoucher = () => {
        setAppliedVoucher(null);
        setDiscount(0);
        setVoucherCode('');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getImageUrl = (url) => {
        if (!url) return 'https://placehold.co/100x100?text=No+Image';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedProvince || !selectedDistrict || !selectedWard || !streetDetail.trim()) {
            alert('Vui lòng điền đầy đủ địa chỉ nhận hàng!');
            return;
        }

        const provinceObj = provinces.find(p => String(p.ProvinceID) === String(selectedProvince));
        const districtObj = districts.find(d => String(d.DistrictID) === String(selectedDistrict));
        const wardObj = wards.find(w => String(w.WardCode) === String(selectedWard));

        const pText = provinceObj ? provinceObj.ProvinceName : '';
        const dText = districtObj ? districtObj.DistrictName : '';
        const wText = wardObj ? wardObj.WardName : '';

        let full = streetDetail.trim();
        if (wText) full += `, ${wText}`;
        if (dText) full += `, ${dText}`;
        if (pText) full += `, ${pText}`;

        const payload = {
            fullName: account.full_name,
            phone: account.phone,
            fullAddress: full,
            note: note.trim(),
            paymentMethod: paymentMethod,
            voucherCode: appliedVoucher ? appliedVoucher.code : ''
        };

        try {
            const response = await api.post('/api/orders/checkout', payload);
            if (response.data && response.data.success) {
                if (response.data.paymentMethod === 'BANK' && response.data.checkoutUrl) {
                    window.location.href = response.data.checkoutUrl;
                } else {
                    alert('Đặt hàng thành công!');
                    navigate('/checkout-success');
                }
            } else {
                alert(response.data.message || 'Đặt hàng thất bại!');
            }
        } catch (err) {
            console.error('Lỗi đặt hàng:', err);
            alert(err.response?.data?.message || 'Lỗi hệ thống khi đặt hàng!');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="container py-5 text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
                    <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">ĐANG TẢI THÔNG TIN THANH TOÁN...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="shop-epic-theme checkout-page-wrapper position-relative">
                <div className="epic-member-header">
                    <div className="container text-center">
                        <span className="epic-tag animate__animated animate__fadeInDown d-inline-block">THANH TOÁN</span>
                        <h1 className="epic-header-title mt-3 animate__animated animate__fadeInUp">THANH TOÁN</h1>
                        <p className="font-oswald text-light mx-auto mt-4 letter-spacing-1 fw-bold text-uppercase fs-5" style={{ maxWidth: '600px', opacity: 0.8 }}>
                            Hoàn tất thông tin nhận hàng và phương thức thanh toán để nhận ngay đôi giày bạn yêu thích.
                        </p>
                    </div>
                </div>
                <div className="container checkout-container py-5 position-relative z-1">
                    <form onSubmit={handleSubmit}>
                    <div className="row g-5">
                        <div className="col-lg-7 animate__animated animate__fadeInLeft">
                            <h3 className="section-title">THÔNG TIN GIAO HÀNG</h3>
                            <div className="checkout-card">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label">Họ và tên người nhận</label>
                                        <input type="text" name="fullName" className="form-control" 
                                            value={account.full_name || ''} 
                                            onChange={e => setAccount({ ...account, full_name: e.target.value })} 
                                            required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Số điện thoại</label>
                                        <input type="text" name="phone" className="form-control" 
                                            value={account.phone || ''} 
                                            onChange={e => setAccount({ ...account, phone: e.target.value })} 
                                            required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" value={account.email || ''} readOnly />
                                    </div>
                                    
                                    <div className="col-md-4">
                                        <label className="form-label">Tỉnh / Thành phố</label>
                                        <select className="form-select form-control" value={selectedProvince} onChange={handleProvinceChange} required>
                                            <option value="">Chọn Tỉnh/Thành</option>
                                            {provinces.map(p => (
                                                <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Quận / Huyện</label>
                                        <select className="form-select form-control" value={selectedDistrict} onChange={handleDistrictChange} disabled={!selectedProvince} required style={{ opacity: !selectedProvince ? 0.5 : 1, filter: !selectedProvince ? 'blur(1px)' : 'none', transition: '0.3s' }}>
                                            <option value="">Chọn Quận/Huyện</option>
                                            {districts.map(d => (
                                                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Phường / Xã</label>
                                        <select className="form-select form-control" value={selectedWard} onChange={handleWardChange} disabled={!selectedDistrict} required style={{ opacity: !selectedDistrict ? 0.5 : 1, filter: !selectedDistrict ? 'blur(1px)' : 'none', transition: '0.3s' }}>
                                            <option value="">Chọn Phường/Xã</option>
                                            {wards.map(w => (
                                                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="col-12">
                                        <label className="form-label">Địa chỉ chi tiết</label>
                                        <input type="text" className="form-control" 
                                            placeholder="Số nhà, tên đường..." 
                                            value={streetDetail}
                                            onChange={e => setStreetDetail(e.target.value)}
                                            required />
                                    </div>
                                    
                                    <div className="col-12">
                                        <label className="form-label">Ghi chú (Tùy chọn)</label>
                                        <textarea name="note" className="form-control" rows="3" 
                                            placeholder="Ví dụ: Giao vào giờ hành chính..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}></textarea>
                                    </div>
                                </div>

                                <h4 className="mt-5 mb-4 font-orbitron" style={{ fontSize: '16px' }}>PHƯƠNG THỨC THANH TOÁN</h4>
                                <div className="payment-options">
                                    <div className={`payment-option ${paymentMethod === 'COD' ? 'active' : ''}`} onClick={() => setPaymentMethod('COD')}>
                                        <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} readOnly style={{ display: 'none' }} />
                                        <i className="fa fa-truck-fast fa-lg text-danger"></i>
                                        <div>
                                            <div className="fw-bold">Thanh toán khi nhận hàng (COD)</div>
                                            <div className="small text-muted">Trả tiền mặt khi Shipper giao hàng</div>
                                        </div>
                                    </div>
                                    <div className={`payment-option ${paymentMethod === 'BANK' ? 'active' : ''}`} onClick={() => setPaymentMethod('BANK')}>
                                        <input type="radio" name="paymentMethod" value="BANK" checked={paymentMethod === 'BANK'} readOnly style={{ display: 'none' }} />
                                        <i className="fa fa-building-columns fa-lg text-primary"></i>
                                        <div>
                                            <div className="fw-bold">Chuyển khoản ngân hàng</div>
                                            <div className="small text-muted">Thanh toán nhanh qua QR Code</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-card mt-4 animate__animated animate__fadeInUp">
                                <h4 className="font-orbitron" style={{ fontSize: '16px' }}><i className="fa fa-map-location-dot text-danger me-2"></i>BẢN ĐỒ GIAO HÀNG</h4>
                                <div id="checkout-map" style={{ height: '400px', width: '100%', borderRadius: '12px', marginTop: '15px' }}></div>
                            </div>
                        </div>

                        <div className="col-lg-5 animate__animated animate__fadeInRight">
                            <h3 className="section-title">ĐƠN HÀNG CỦA BẠN</h3>
                            <div className="checkout-card">
                                <div className="order-summary-list mb-4">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="order-summary-item">
                                            <img src={getImageUrl(item.image_url)} className="item-img" alt="Shoe" />
                                            <div className="item-info">
                                                <div className="item-name">{item.product_name}</div>
                                                <div className="item-meta">{item.quantity} x {formatCurrency(item.price)}</div>
                                                <div className="item-meta">Biến thể: {item.size_name} / {item.color_name}</div>
                                            </div>
                                            <div className="fw-bold">{formatCurrency(item.price * item.quantity)}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="summary-details">
                                    <div className="summary-row">
                                        <span>Tạm tính</span>
                                        <span>{formatCurrency(totalPrice)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Phí vận chuyển</span>
                                        <span>{shippingFee > 0 ? formatCurrency(shippingFee) : 'MIỄN PHÍ'}</span>
                                    </div>

                                    {discount > 0 && appliedVoucher && (
                                        <div className="summary-row text-success fw-bold" style={{ alignItems: 'center' }}>
                                            <div>
                                                <span style={{ color: '#198754' }}>Giảm giá (Voucher: {appliedVoucher.code})</span>
                                                <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#555' }}>
                                                    {appliedVoucher.discountType === 'PERCENT' ? `Giảm ${appliedVoucher.discountValue}%` : `Giảm ${formatCurrency(appliedVoucher.discountValue)}`}
                                                </div>
                                                <button type="button" className="btn btn-sm btn-link text-danger p-0 mt-1" style={{ textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }} onClick={handleCancelVoucher}>
                                                    <i className="bi bi-x-circle"></i> Hủy mã
                                                </button>
                                            </div>
                                            <span style={{ color: '#198754' }}>-{formatCurrency(discount)}</span>
                                        </div>
                                    )}

                                    <div className="mt-3 mb-4">
                                        <div className="input-group mb-2">
                                            <input type="text" className="form-control" placeholder="Nhập mã giảm giá..." value={voucherCode} onChange={e => setVoucherCode(e.target.value)} />
                                            <button className="btn btn-outline-danger" type="button" onClick={() => handleApplyVoucher()}>ÁP DỤNG</button>
                                        </div>
                                        {availableVouchers.length > 0 && (
                                            <div className="available-vouchers mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {availableVouchers.map(v => {
                                                    const isEligible = totalPrice >= (v.min_order_value || 0);
                                                    return (
                                                        <div key={v.id} className={`p-2 mb-2 border ${isEligible ? 'border-danger' : 'border-dark opacity-50'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderWidth: '3px !important', boxShadow: isEligible ? '4px 4px 0 var(--accent-red)' : '4px 4px 0 #000', transition: '0.3s' }}>
                                                            <div>
                                                                <div className="fw-bold text-danger" style={{ fontFamily: 'Oswald', fontSize: '15px' }}><i className="bi bi-ticket-perforated"></i> {v.code}</div>
                                                                <div style={{ fontSize: '13px', color: '#000', fontWeight: '700' }}>
                                                                    {v.discount_type === 'PERCENT' ? `Giảm ${v.discount_value}%` : `Giảm ${formatCurrency(v.discount_value)}`} 
                                                                    {v.max_discount ? ` (Tối đa ${formatCurrency(v.max_discount)})` : ''}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>
                                                                    Đơn tối thiểu: {formatCurrency(v.min_order_value || 0)}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                className={`btn btn-sm ${isEligible ? 'btn-danger' : 'btn-secondary'}`}
                                                                disabled={!isEligible}
                                                                onClick={() => {
                                                                    setVoucherCode(v.code);
                                                                    handleApplyVoucher(v.code);
                                                                }}
                                                                style={{ fontWeight: 'bold' }}
                                                            >
                                                                Dùng
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="summary-total">
                                        <span>TỔNG CỘNG</span>
                                        <span>{formatCurrency(finalTotal)}</span>
                                    </div>
                                </div>

                                <button type="submit" className="btn-place-order" disabled={cartItems.length === 0}>
                                    XÁC NHẬN ĐẶT HÀNG <i className="fa fa-arrow-right ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            </div>
        </Layout>
    );
};

export default Checkout;
