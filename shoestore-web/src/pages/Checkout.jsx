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
    
    // Validate states
    const [voucherError, setVoucherError] = useState('');
    const [voucherSuccess, setVoucherSuccess] = useState('');
    const [submitError, setSubmitError] = useState('');
    
    // Address & GHN state
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [streetDetail, setStreetDetail] = useState('');
    
    const [shippingFee, setShippingFee] = useState(30000);

    // Map Picker states
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapSearchText, setMapSearchText] = useState('');
    const [pickerMap, setPickerMap] = useState(null);
    const [resolvedAddress, setResolvedAddress] = useState(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [isDraggingMap, setIsDraggingMap] = useState(false);

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
                const urlParams = new URLSearchParams(window.location.search);
                const buyNowVariantId = urlParams.get('buyNowVariantId');
                const buyNowQty = urlParams.get('buyNowQty');

                let cartRes;
                if (buyNowVariantId && buyNowQty) {
                    cartRes = await api.get(`/api/cart/buy-now?variantId=${buyNowVariantId}&qty=${buyNowQty}`);
                } else {
                    cartRes = await api.get('/api/cart');
                }

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
                const msg = err.response?.data?.message || err.message;
                alert('Không thể lấy thông tin sản phẩm hoặc giỏ hàng! Chi tiết: ' + msg);
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
                    const districtText = parts.length >= 4 ? parts[parts.length - 2] : '';
                    const wardText = parts.length >= 4 ? parts[parts.length - 3] : parts[parts.length - 2];
                    const streetText = parts.slice(0, parts.length >= 4 ? parts.length - 3 : parts.length - 2).join(', ');

                    setStreetDetail(streetText);

                    // Match Province
                    const matchedProv = provincesList.find(p => 
                        p.ProvinceName.toLowerCase().includes(provinceText.toLowerCase()) ||
                        provinceText.toLowerCase().includes(p.ProvinceName.toLowerCase())
                    );

                    if (matchedProv) {
                        const provId = matchedProv.ProvinceID;
                        setSelectedProvince(provId);

                        // Match District and Wards
                        try {
                            const distRes = await api.get(`/api/ghn/districts?provinceId=${provId}`);
                            if (distRes.data && distRes.data.code === 200) {
                                const districtsList = distRes.data.data || [];
                                setDistricts(districtsList);

                                const wardPromises = districtsList.map(async (d) => {
                                    try {
                                        const wRes = await api.get(`/api/ghn/wards?districtId=${d.DistrictID}`);
                                        if (wRes.data && wRes.data.code === 200) {
                                            return (wRes.data.data || []).map(w => ({
                                                ...w,
                                                DistrictID: d.DistrictID,
                                                DistrictName: d.DistrictName
                                            }));
                                        }
                                    } catch (err) {
                                        console.error('Lỗi tải xã prefill:', err);
                                    }
                                    return [];
                                });

                                const wardsNested = await Promise.all(wardPromises);
                                const allWards = wardsNested.flat();
                                allWards.sort((a, b) => a.WardName.localeCompare(b.WardName, 'vi'));
                                setWards(allWards);

                                const matchedWard = allWards.find(w => 
                                    w.WardName.toLowerCase().includes(wardText.toLowerCase()) ||
                                    wardText.toLowerCase().includes(w.WardName.toLowerCase())
                                );

                                if (matchedWard) {
                                    setSelectedWard(matchedWard.WardCode);
                                    setSelectedDistrict(matchedWard.DistrictID);
                                    const districtWards = allWards.filter(w => w.DistrictID === matchedWard.DistrictID);
                                    setWards(districtWards);
                                    // calculate fee
                                    calculateGHNFee(matchedWard.DistrictID, matchedWard.WardCode, cartTotal, accountData.membership_rank_id);
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

    const openMapModal = () => {
        setIsMapModalOpen(true);
        // Load Leaflet dynamically if not loaded
        if (!window.L) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
            script.async = true;
            script.onload = () => {
                setTimeout(initPickerMap, 200);
            };
            document.head.appendChild(script);
        } else {
            setTimeout(initPickerMap, 200);
        }
    };

    const closeMapModal = () => {
        setIsMapModalOpen(false);
        setPickerMap(null);
        setResolvedAddress(null);
        setMapSearchText('');
    };

    const initPickerMap = () => {
        if (!window.L) return;
        const L = window.L;
        const mapContainer = document.getElementById('picker-map');
        if (!mapContainer) return;

        const defaultLat = 10.0009;
        const defaultLng = 105.7851;

        const m = L.map('picker-map').setView([defaultLat, defaultLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(m);

        setPickerMap(m);

        reverseGeocode(defaultLat, defaultLng);

        // Track when map moves to apply bounce animation
        m.on('movestart', () => {
            setIsDraggingMap(true);
        });

        // Geocode coordinates in center when user finishes dragging/panning the map
        m.on('moveend', () => {
            setIsDraggingMap(false);
            const center = m.getCenter();
            reverseGeocode(center.lat, center.lng);
        });
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`);
            const data = await res.json();
            if (data && data.address) {
                setResolvedAddress(data);
            }
        } catch (err) {
            console.error('Lỗi reverse geocoding:', err);
        }
    };

    const handleSearchLocation = async (e) => {
        if (e) e.preventDefault();
        if (!mapSearchText.trim() || !pickerMap) return;
        setMapLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchText)}&limit=1&accept-language=vi`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                pickerMap.setView([lat, lng], 16);
            }
        } catch (err) {
            console.error('Lỗi tìm kiếm bản đồ:', err);
        } finally {
            setMapLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation && pickerMap) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    pickerMap.setView([lat, lng], 16);
                },
                (err) => {
                    console.error('Lỗi lấy định vị GPS:', err);
                    alert("Không thể định vị vị trí hiện tại. Vui lòng cấp quyền định vị GPS trên trình duyệt của bạn!");
                }
            );
        } else {
            alert("Trình duyệt không hỗ trợ dịch vụ định vị GPS!");
        }
    };

    const confirmLocation = async () => {
        if (!resolvedAddress || !resolvedAddress.address) return;
        const addr = resolvedAddress.address;

        // 1. Match Province
        const provText = addr.city || addr.state || addr.province || '';
        if (provText) {
            const matchedProv = provinces.find(p => 
                p.ProvinceName.toLowerCase().includes(provText.toLowerCase()) ||
                provText.toLowerCase().includes(p.ProvinceName.toLowerCase())
            );

            if (matchedProv) {
                const provId = matchedProv.ProvinceID;
                setSelectedProvince(provId);

                // 2. Load all wards then match
                try {
                    const res = await api.get(`/api/ghn/districts?provinceId=${provId}`);
                    if (res.data && res.data.code === 200) {
                        const districtsList = res.data.data || [];
                        setDistricts(districtsList);

                        const wardPromises = districtsList.map(async (d) => {
                            try {
                                const wRes = await api.get(`/api/ghn/wards?districtId=${d.DistrictID}`);
                                if (wRes.data && wRes.data.code === 200) {
                                    return (wRes.data.data || []).map(w => ({
                                        ...w,
                                        DistrictID: d.DistrictID,
                                        DistrictName: d.DistrictName
                                    }));
                                }
                            } catch (err) {
                                console.error('Lỗi tải xã khi geocode:', err);
                            }
                            return [];
                        });

                        const wardsNested = await Promise.all(wardPromises);
                        const allWards = wardsNested.flat();
                        allWards.sort((a, b) => a.WardName.localeCompare(b.WardName, 'vi'));
                        setWards(allWards);

                        // Collect all possible ward text candidates from OSM address
                        const wardCandidates = [
                            addr.suburb, addr.village, addr.quarter, addr.town, 
                            addr.commune, addr.city_district, addr.neighbourhood
                        ].filter(Boolean);

                        let matchedWard = null;

                        // Try each candidate
                        for (const candidate of wardCandidates) {
                            if (matchedWard) break;
                            const candidateLower = candidate.toLowerCase();
                            // Try exact includes match
                            matchedWard = allWards.find(w => {
                                const wNameLower = w.WardName.toLowerCase();
                                return wNameLower.includes(candidateLower) || candidateLower.includes(wNameLower);
                            });
                            if (!matchedWard) {
                                // Try stripped prefix match (remove Phường/Xã/Thị trấn)
                                const strippedCandidate = candidateLower.replace(/^(phường|xã|thị trấn)\s+/i, '').trim();
                                if (strippedCandidate) {
                                    matchedWard = allWards.find(w => {
                                        const strippedWard = w.WardName.toLowerCase().replace(/^(phường|xã|thị trấn)\s+/i, '').trim();
                                        return strippedWard === strippedCandidate || strippedWard.includes(strippedCandidate) || strippedCandidate.includes(strippedWard);
                                    });
                                }
                            }
                        }

                        // Final fallback: search display_name for any ward name
                        if (!matchedWard && resolvedAddress.display_name) {
                            const dispNameLower = resolvedAddress.display_name.toLowerCase();
                            matchedWard = allWards.find(w => {
                                const wNameLower = w.WardName.toLowerCase();
                                return dispNameLower.includes(wNameLower);
                            });
                            if (!matchedWard) {
                                matchedWard = allWards.find(w => {
                                    const strippedWard = w.WardName.toLowerCase().replace(/^(phường|xã|thị trấn)\s+/i, '').trim();
                                    return strippedWard.length >= 3 && dispNameLower.includes(strippedWard);
                                });
                            }
                        }

                        // District-level fallback: if no ward matched, try to find the district
                        // and pick the first ward in that district
                        if (!matchedWard) {
                            const districtCandidates = [
                                addr.city_district, addr.suburb, addr.village, 
                                addr.quarter, addr.town, addr.commune
                            ].filter(Boolean);

                            let matchedDistrict = null;
                            for (const candidate of districtCandidates) {
                                if (matchedDistrict) break;
                                const candidateLower = candidate.toLowerCase()
                                    .replace(/^(phường|xã|thị trấn|quận|huyện|thị xã|thành phố)\s+/i, '').trim();
                                if (candidateLower.length < 2) continue;
                                matchedDistrict = districtsList.find(d => {
                                    const dNameLower = d.DistrictName.toLowerCase()
                                        .replace(/^(quận|huyện|thị xã|thành phố)\s+/i, '').trim();
                                    return dNameLower === candidateLower || dNameLower.includes(candidateLower) || candidateLower.includes(dNameLower);
                                });
                            }

                            // Also try matching from display_name
                            if (!matchedDistrict && resolvedAddress.display_name) {
                                const dispLower = resolvedAddress.display_name.toLowerCase();
                                matchedDistrict = districtsList.find(d => {
                                    const dNameLower = d.DistrictName.toLowerCase();
                                    return dispLower.includes(dNameLower);
                                });
                            }

                            if (matchedDistrict) {
                                setSelectedDistrict(matchedDistrict.DistrictID);
                                // Pick first ward in matched district so form is not empty
                                const districtWards = allWards.filter(w => w.DistrictID === matchedDistrict.DistrictID);
                                if (districtWards.length > 0) {
                                    setSelectedWard(districtWards[0].WardCode);
                                    setWards(districtWards);
                                    calculateGHNFee(matchedDistrict.DistrictID, districtWards[0].WardCode);
                                }
                            }
                        }

                        if (matchedWard) {
                            setSelectedWard(matchedWard.WardCode);
                            setSelectedDistrict(matchedWard.DistrictID);
                            const districtWards = allWards.filter(w => w.DistrictID === matchedWard.DistrictID);
                            setWards(districtWards);
                            calculateGHNFee(matchedWard.DistrictID, matchedWard.WardCode);
                        }
                    }
                } catch (err) {
                    console.error('Lỗi tải thông tin GHN sau geocode:', err);
                }
            }
        }

        // 3. Điền địa chỉ chi tiết = toàn bộ display_name gốc, không cắt bỏ gì
        setStreetDetail(resolvedAddress.display_name || '');
        closeMapModal();
    };



    const normalizeName = (name) => {
        if (!name) return '';
        return name.toLowerCase()
            .replace(/^(tỉnh|thành phố|quận|huyện|thị xã|phường|xã|thị trấn)\s+/i, '')
            .trim();
    };

    const updateStreetDetailWithSelects = (newProvinceId, newDistrictId, newWardCode, currentStreetDetail, currentProvinces, currentDistricts, currentWards) => {
        const provinceObj = currentProvinces.find(p => String(p.ProvinceID) === String(newProvinceId));
        const districtObj = currentDistricts.find(d => String(d.DistrictID) === String(newDistrictId));
        const wardObj = currentWards.find(w => String(w.WardCode) === String(newWardCode));

        const pText = provinceObj ? provinceObj.ProvinceName : '';
        const dText = districtObj ? districtObj.DistrictName : '';
        const wText = wardObj ? wardObj.WardName : '';

        const suffixParts = [];
        if (wText) suffixParts.push(wText);
        if (dText) suffixParts.push(dText);
        if (pText) suffixParts.push(pText);
        const newSuffix = suffixParts.join(', ');

        let prefix = currentStreetDetail || '';
        const parts = prefix.split(',').map(item => item.trim());
        while (parts.length > 0) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            const isProvince = currentProvinces.some(p => normalizeName(p.ProvinceName) === normalizeName(lastPart));
            const isDistrict = currentDistricts.some(d => normalizeName(d.DistrictName) === normalizeName(lastPart));
            const isWard = currentWards.some(w => normalizeName(w.WardName) === normalizeName(lastPart));
            
            if (isProvince || isDistrict || isWard || lastPart === 'việt nam' || lastPart === 'vietnam' || /^\d{5,6}$/.test(lastPart)) {
                parts.pop();
            } else {
                break;
            }
        }
        prefix = parts.join(', ').trim();

        if (prefix && newSuffix) {
            return `${prefix}, ${newSuffix}`;
        } else if (newSuffix) {
            return newSuffix;
        } else {
            return prefix;
        }
    };

    const handleProvinceChange = async (e) => {
        const pId = e.target.value;
        
        // Update street detail with new province selection, resetting district/ward details
        const newStreetDetail = updateStreetDetailWithSelects(pId, '', '', streetDetail, provinces, districts, wards);
        setStreetDetail(newStreetDetail);

        setSelectedProvince(pId);
        setSelectedDistrict('');
        setSelectedWard('');
        setDistricts([]);
        setWards([]);
        
        if (pId) {
            try {
                const res = await api.get(`/api/ghn/districts?provinceId=${pId}`);
                if (res.data && res.data.code === 200) {
                    const districtsList = res.data.data || [];
                    setDistricts(districtsList);
                }
            } catch (err) {
                console.error('Lỗi tải quận huyện:', err);
            }
        }
    };

    const handleDistrictChange = async (e) => {
        const dId = e.target.value;

        // Update street detail with selected province & new district selection, resetting ward details
        const newStreetDetail = updateStreetDetailWithSelects(selectedProvince, dId, '', streetDetail, provinces, districts, wards);
        setStreetDetail(newStreetDetail);

        setSelectedDistrict(dId);
        setSelectedWard('');
        setWards([]);
        
        if (dId) {
            try {
                const res = await api.get(`/api/ghn/wards?districtId=${dId}`);
                if (res.data && res.data.code === 200) {
                    const wardsList = res.data.data || [];
                    wardsList.sort((a, b) => a.WardName.localeCompare(b.WardName, 'vi'));
                    setWards(wardsList);
                }
            } catch (err) {
                console.error('Lỗi tải phường xã:', err);
            }
        }
    };

    const handleWardChange = (e) => {
        const wCode = e.target.value;

        // Update street detail with selected province, district, and new ward selection
        const newStreetDetail = updateStreetDetailWithSelects(selectedProvince, selectedDistrict, wCode, streetDetail, provinces, districts, wards);
        setStreetDetail(newStreetDetail);

        setSelectedWard(wCode);
        if (selectedDistrict && wCode) {
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
            setVoucherError('Vui lòng nhập mã giảm giá!');
            setVoucherSuccess('');
            return;
        }
        try {
            setVoucherError('');
            setVoucherSuccess('');
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
                setVoucherSuccess(response.data.message || 'Áp dụng mã giảm giá thành công!');
            } else {
                setVoucherError(response.data.message || 'Mã giảm giá không hợp lệ!');
                setAppliedVoucher(null);
                setDiscount(0);
            }
        } catch (err) {
            console.error('Lỗi áp dụng voucher:', err);
            const errMsg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện!';
            setVoucherError(errMsg);
            setAppliedVoucher(null);
            setDiscount(0);
        }
    };

    const handleCancelVoucher = () => {
        setAppliedVoucher(null);
        setDiscount(0);
        setVoucherCode('');
        setVoucherError('');
        setVoucherSuccess('');
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
        setSubmitError('');
        
        if (!selectedProvince || !selectedDistrict || !selectedWard || !streetDetail.trim()) {
            setSubmitError('Vui lòng điền đầy đủ địa chỉ nhận hàng!');
            return;
        }

        const provinceObj = provinces.find(p => String(p.ProvinceID) === String(selectedProvince));
        const districtObj = districts.find(d => String(d.DistrictID) === String(selectedDistrict));
        const wardObj = wards.find(w => String(w.WardCode) === String(selectedWard));

        const pText = provinceObj ? provinceObj.ProvinceName : '';
        const dText = districtObj ? districtObj.DistrictName : '';
        const wText = wardObj ? wardObj.WardName : '';

        // Strip any existing location suffix from streetDetail.trim() to get the clean user prefix, then append select names.
        let baseStreet = streetDetail.trim();
        const parts = baseStreet.split(',').map(item => item.trim());
        while (parts.length > 0) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            const isProvince = provinces.some(p => normalizeName(p.ProvinceName) === normalizeName(lastPart));
            const isDistrict = districts.some(d => normalizeName(d.DistrictName) === normalizeName(lastPart));
            const isWard = wards.some(w => normalizeName(w.WardName) === normalizeName(lastPart));
            
            if (isProvince || isDistrict || isWard || lastPart === 'việt nam' || lastPart === 'vietnam' || /^\d{5,6}$/.test(lastPart)) {
                parts.pop();
            } else {
                break;
            }
        }
        baseStreet = parts.join(', ').trim();

        let full = baseStreet;
        if (wText) full += (full ? ', ' : '') + wText;
        if (dText) full += (full ? ', ' : '') + dText;
        if (pText) full += (full ? ', ' : '') + pText;

        const urlParams = new URLSearchParams(window.location.search);
        const buyNowVariantId = urlParams.get('buyNowVariantId');
        const buyNowQty = urlParams.get('buyNowQty');

        const payload = {
            fullName: account.full_name,
            phone: account.phone,
            fullAddress: full,
            note: note.trim(),
            paymentMethod: paymentMethod,
            voucherCode: appliedVoucher ? appliedVoucher.code : '',
            shippingFee: shippingFee,
            buyNowVariantId: buyNowVariantId ? parseInt(buyNowVariantId) : null,
            buyNowQty: buyNowQty ? parseInt(buyNowQty) : null
        };

        try {
            const response = await api.post('/api/orders/checkout', payload);
            if (response.data && response.data.success) {
                if (response.data.paymentMethod === 'BANK' && response.data.checkoutUrl) {
                    window.location.href = response.data.checkoutUrl;
                } else {
                    navigate(`/checkout-success?orderCode=${response.data.orderCode}`);
                }
            } else {
                setSubmitError(response.data.message || 'Đặt hàng thất bại!');
            }
        } catch (err) {
            console.error('Lỗi đặt hàng:', err);
            setSubmitError(err.response?.data?.message || 'Lỗi hệ thống khi đặt hàng!');
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
                                    <div className="col-12 mt-2">
                                         <button type="button" className="btn btn-outline-danger w-100 font-orbitron fw-bold py-2 d-flex align-items-center justify-content-center gap-2" onClick={openMapModal} style={{ borderRadius: '8px', border: '1px dashed #e50914', background: 'rgba(229, 9, 20, 0.03)', color: '#e50914', transition: 'all 0.2s' }}>
                                             <i className="fa-solid fa-map-location-dot"></i> CHỌN VỊ TRÍ TỪ BẢN ĐỒ (GOOGLE MAPS)
                                         </button>
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
                                            <input type="text" className="form-control" placeholder="Nhập mã giảm giá..." value={voucherCode} onChange={e => {
                                                setVoucherCode(e.target.value);
                                                if (voucherError) setVoucherError('');
                                                if (voucherSuccess) setVoucherSuccess('');
                                            }} />
                                            <button className="btn btn-outline-danger" type="button" onClick={() => handleApplyVoucher()}>ÁP DỤNG</button>
                                        </div>
                                        {voucherError && <div className="text-danger mt-1 fw-bold" style={{ fontSize: '13px' }}><i className="fa-solid fa-circle-exclamation me-1"></i>{voucherError}</div>}
                                        {voucherSuccess && <div className="text-success mt-1 fw-bold" style={{ fontSize: '13px' }}><i className="fa-solid fa-circle-check me-1"></i>{voucherSuccess}</div>}
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

                                {submitError && (
                                    <div className="alert alert-danger py-2 px-3 mb-3 text-center animate__animated animate__shakeX" style={{ fontSize: '13px', borderRadius: '8px', border: 'none', background: 'rgba(229, 9, 20, 0.1)', color: '#ea868f' }}>
                                        <i className="fa-solid fa-triangle-exclamation me-1"></i> {submitError}
                                    </div>
                                )}
                                <button type="submit" className="btn-place-order" disabled={cartItems.length === 0}>
                                    XÁC NHẬN ĐẶT HÀNG <i className="fa fa-arrow-right ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            </div>

            {isMapModalOpen && (
                <div className="admin-confirm-overlay" style={{ zIndex: 10000 }}>
                    <div className="admin-confirm-box" style={{ width: '90%', maxWidth: '700px', padding: '25px', borderRadius: '16px', background: '#fff', color: '#333' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="font-orbitron m-0" style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>
                                <i className="fa-solid fa-map-location-dot text-danger me-2"></i> CHỌN VỊ TRÍ GIAO HÀNG
                            </h4>
                            <button type="button" className="btn-close" onClick={closeMapModal}></button>
                        </div>
                        
                        <form onSubmit={handleSearchLocation} className="mb-3">
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Tìm kiếm địa chỉ, tên đường, khu vực..." 
                                    value={mapSearchText}
                                    onChange={e => setMapSearchText(e.target.value)}
                                    style={{ background: '#f8f9fa', border: '1px solid #ddd', color: '#333' }}
                                />
                                <button type="submit" className="btn btn-danger font-orbitron fw-bold" disabled={mapLoading}>
                                    {mapLoading ? 'ĐANG TÌM...' : 'TÌM KIẾM'}
                                </button>
                            </div>
                        </form>

                        <div className="position-relative" style={{ height: 'min(300px, 40vh)', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                            <div id="picker-map" style={{ height: '100%', width: '100%' }}></div>
                            
                            {/* Fixed center pin indicator */}
                            <div style={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                transform: isDraggingMap ? 'translate(-50%, -120%)' : 'translate(-50%, -100%)', 
                                transition: 'transform 0.15s ease-out',
                                zIndex: 1000, 
                                pointerEvents: 'none' 
                            }}>
                                <i className="fa-solid fa-location-pin text-danger" style={{ fontSize: '38px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}></i>
                            </div>

                            {/* Geolocation target GPS button */}
                            <button 
                                type="button" 
                                className="btn btn-light" 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleGetCurrentLocation();
                                }}
                                style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', border: '1px solid #ddd', background: '#fff', color: '#333' }}
                                title="Vị trí của tôi"
                            >
                                <i className="fa-solid fa-crosshairs fs-5"></i>
                            </button>
                        </div>
                        
                        {resolvedAddress && (
                            <div className="mt-3 p-3 bg-light rounded" style={{ fontSize: '13px', borderLeft: '4px solid #e50914', color: '#333', textAlign: 'left' }}>
                                <strong>Vị trí đã chọn:</strong> {resolvedAddress.display_name}
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" className="btn btn-secondary font-orbitron fw-bold" onClick={closeMapModal} style={{ borderRadius: '8px' }}>
                                HỦY BỎ
                            </button>
                            <button type="button" className="btn btn-danger font-orbitron fw-bold" onClick={confirmLocation} disabled={!resolvedAddress} style={{ borderRadius: '8px' }}>
                                XÁC NHẬN VỊ TRÍ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Checkout;
