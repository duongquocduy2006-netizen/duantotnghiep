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
    const [formErrors, setFormErrors] = useState({});
    
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
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);

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
                    let items = cartRes.data.cartItems || [];

                    // Lọc danh sách sản phẩm theo các sản phẩm người dùng đã tích chọn từ giỏ hàng
                    const savedSelectedIds = location.state?.selectedItemIds || JSON.parse(sessionStorage.getItem('selectedCartItemIds') || 'null');
                    if (!buyNowVariantId && savedSelectedIds && Array.isArray(savedSelectedIds) && savedSelectedIds.length > 0) {
                        items = items.filter(item => savedSelectedIds.includes(item.id));
                    }

                    setCartItems(items);
                    cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    setTotalPrice(cartTotal);
                    
                    if (items.length === 0) {
                        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Chưa có sản phẩm nào được chọn để thanh toán!' }));
                        navigate('/cart');
                        return;
                    }
                }
            } catch (err) {
                console.error('Lỗi cart:', err);
                const msg = err.response?.data?.message || err.message;
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không thể lấy thông tin sản phẩm hoặc giỏ hàng! Chi tiết: ' + msg }));
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
        setTimeout(initPickerMap, 150);
    };

    const closeMapModal = () => {
        if (pickerMap) {
            try { pickerMap.remove(); } catch (e) {}
        }
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

        if (pickerMap) {
            try { pickerMap.remove(); } catch (e) {}
        }

        const defaultLat = 10.0009;
        const defaultLng = 105.7851;

        const m = L.map('picker-map', {
            center: [defaultLat, defaultLng],
            zoom: 15,
            zoomControl: true
        });

        // Use CartoDB Voyager tiles (fast, reliable, beautiful, no adblock blocking)
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 19,
            subdomains: 'abcd'
        });

        // Fallback to OSM standard if any tile fails
        tileLayer.on('tileerror', (error) => {
            if (error.coords && error.tile) {
                const { z, x, y } = error.coords;
                error.tile.src = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
            }
        });

        tileLayer.addTo(m);
        setPickerMap(m);

        // Force Leaflet to recalculate dimensions after DOM renders
        const invalidate = () => {
            if (m) m.invalidateSize();
        };
        invalidate();
        setTimeout(invalidate, 50);
        setTimeout(invalidate, 200);
        setTimeout(invalidate, 500);

        reverseGeocode(defaultLat, defaultLng);

        // Track when map moves
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

    const formatVietnameseAddress = (addr, rawDisplayName) => {
        if (!addr) return (rawDisplayName || '').replace(/\s*\((phường|xã|quận|huyện|tỉnh|tp)\)/gi, '');

        const cleanStr = (s) => (s || '').replace(/\s*\((phường|xã|thị trấn|quận|huyện|thị xã|tỉnh|tp|thành phố)\)/gi, '').trim();

        // 1. Số nhà & Đường
        let roadPart = '';
        if (addr.road) {
            roadPart = addr.house_number ? `${addr.house_number} ${cleanStr(addr.road)}` : cleanStr(addr.road);
        } else if (addr.pedestrian || addr.footway || addr.path) {
            roadPart = cleanStr(addr.pedestrian || addr.footway || addr.path);
        }

        // 2. Phường / Xã / Thị trấn
        let wardRaw = cleanStr(addr.suburb || addr.village || addr.quarter || addr.commune || addr.neighbourhood || addr.hamlet);
        let wardPart = '';
        if (wardRaw) {
            if (/^(phường|xã|thị trấn)/i.test(wardRaw)) {
                wardPart = wardRaw;
            } else {
                wardPart = `Phường ${wardRaw}`;
            }
        }

        // 3. Quận / Huyện / Thị xã
        let districtRaw = cleanStr(addr.city_district || addr.district || addr.county || addr.town);
        let districtPart = '';
        if (districtRaw) {
            if (!/^(quận|huyện|thị xã|thành phố)/i.test(districtRaw)) {
                districtPart = `Quận ${districtRaw}`;
            } else {
                districtPart = districtRaw;
            }
        }

        // 4. Tỉnh / Thành phố
        let cityRaw = cleanStr(addr.city || addr.state || addr.province);
        let cityPart = '';
        if (cityRaw) {
            const cityLower = cityRaw.toLowerCase();
            const wardLower = wardRaw.toLowerCase();
            const distLower = districtRaw.toLowerCase();

            // Bỏ qua nếu cityRaw trùng tên phường hoặc quận (tránh biến "Cái Răng" thành "Tỉnh Cái Răng")
            if (cityLower !== wardLower && cityLower !== distLower) {
                if (/^(thành phố|tỉnh|tp\.)/i.test(cityRaw)) {
                    cityPart = cityRaw;
                } else if (['Cần Thơ', 'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng'].some(c => cityRaw.includes(c))) {
                    cityPart = `TP. ${cityRaw}`;
                } else if (provinces.some(p => p.ProvinceName.toLowerCase().includes(cityLower))) {
                    cityPart = `Tỉnh ${cityRaw}`;
                }
            }
        }

        // Nếu cityPart bị trống, tìm tỉnh từ display_name hoặc danh sách tỉnh GHN
        if (!cityPart && rawDisplayName) {
            const matchedP = provinces.find(p => rawDisplayName.toLowerCase().includes(p.ProvinceName.toLowerCase().replace(/^(tỉnh|thành phố|tp\.)\s+/i, '').trim()));
            if (matchedP) {
                cityPart = matchedP.ProvinceName;
            }
        }

        // Lọc danh sách các mục duy nhất
        const candidates = [roadPart, wardPart, districtPart, cityPart].filter(Boolean);
        const finalParts = [];

        candidates.forEach(item => {
            const itemTrim = item.trim();
            const coreName = itemTrim.replace(/^(phường|quận|huyện|xã|thị trấn|thành phố|tỉnh|tp\.)\s+/i, '').trim().toLowerCase();
            
            const alreadyExists = finalParts.some(p => {
                const existingCore = p.replace(/^(phường|quận|huyện|xã|thị trấn|thành phố|tỉnh|tp\.)\s+/i, '').trim().toLowerCase();
                return existingCore === coreName;
            });

            if (!alreadyExists) {
                finalParts.push(itemTrim);
            }
        });

        if (finalParts.length > 0) {
            return finalParts.join(', ');
        }

        return (rawDisplayName || '')
            .replace(/\s*\((phường|xã|quận|huyện|tỉnh|tp)\)/gi, '')
            .split(',')
            .map(s => s.trim())
            .filter((val, idx, self) => self.indexOf(val) === idx)
            .join(', ');
    };

    const reverseGeocode = async (lat, lng) => {
        setIsGeocoding(true);
        let addressName = null;
        let addressObj = null;

        // 1. Try Nominatim (OSM primary)
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    addressObj = data.address || {};
                    addressName = formatVietnameseAddress(addressObj, data.display_name);
                }
            }
        } catch (e) {
            console.warn("Nominatim failed, trying Photon fallback...", e);
        }

        // 2. Try Photon (Komoot OSM Geocoder)
        if (!addressName) {
            try {
                const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=vi`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.features && data.features.length > 0) {
                        const props = data.features[0].properties || {};
                        addressObj = {
                            road: props.street || props.name || '',
                            suburb: props.district || props.suburb || '',
                            city_district: props.county || '',
                            city: props.city || props.state || ''
                        };
                        addressName = formatVietnameseAddress(addressObj, [props.name, props.street, props.district, props.city, props.state].filter(Boolean).join(', '));
                    }
                }
            } catch (e) {
                console.warn("Photon failed, trying BigDataCloud fallback...", e);
            }
        }

        // 3. Try BigDataCloud Free Client Geocode API
        if (!addressName) {
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        addressObj = {
                            suburb: data.locality || '',
                            city: data.city || data.principalSubdivision || ''
                        };
                        const parts = [data.locality, data.city || data.principalSubdivision, data.countryName].filter(Boolean);
                        addressName = formatVietnameseAddress(addressObj, parts.join(', '));
                    }
                }
            } catch (e) {
                console.warn("BigDataCloud failed...", e);
            }
        }

        // Fallback if all 3 failed:
        if (!addressName) {
            addressName = `Vị trí tại tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            addressObj = { road: 'Vị trí đã chọn trên bản đồ' };
        }

        setResolvedAddress({
            display_name: addressName,
            address: addressObj,
            lat,
            lon: lng
        });
        setIsGeocoding(false);
    };

    const VIETNAM_PROVINCE_COORDS = {
        'trà vinh': { lat: 9.9347, lng: 106.3458, display_name: 'Tỉnh Trà Vinh, Việt Nam' },
        'cần thơ': { lat: 10.0371, lng: 105.7882, display_name: 'Thành phố Cần Thơ, Việt Nam' },
        'hồ chí minh': { lat: 10.7769, lng: 106.7009, display_name: 'Thành phố Hồ Chí Minh, Việt Nam' },
        'sài gòn': { lat: 10.7769, lng: 106.7009, display_name: 'Thành phố Hồ Chí Minh, Việt Nam' },
        'hà nội': { lat: 21.0285, lng: 105.8542, display_name: 'Thủ đô Hà Nội, Việt Nam' },
        'đà nẵng': { lat: 16.0544, lng: 108.2022, display_name: 'Thành phố Đà Nẵng, Việt Nam' },
        'hải phòng': { lat: 20.8449, lng: 106.6881, display_name: 'Thành phố Hải Phòng, Việt Nam' },
        'an giang': { lat: 10.5216, lng: 105.1259, display_name: 'Tỉnh An Giang, Việt Nam' },
        'bà rịa': { lat: 10.4963, lng: 107.1685, display_name: 'Tỉnh Bà Rịa - Vũng Tàu, Việt Nam' },
        'vũng tàu': { lat: 10.3460, lng: 107.0843, display_name: 'Thành phố Vũng Tàu, Tỉnh Bà Rịa - Vũng Tàu, Việt Nam' },
        'bắc giang': { lat: 21.2731, lng: 106.1946, display_name: 'Tỉnh Bắc Giang, Việt Nam' },
        'bắc kạn': { lat: 22.1470, lng: 105.8348, display_name: 'Tỉnh Bắc Kạn, Việt Nam' },
        'bạc liêu': { lat: 9.2941, lng: 105.7244, display_name: 'Tỉnh Bạc Liêu, Việt Nam' },
        'bắc ninh': { lat: 21.1861, lng: 106.0763, display_name: 'Tỉnh Bắc Ninh, Việt Nam' },
        'bến tre': { lat: 10.2432, lng: 106.3758, display_name: 'Tỉnh Bến Tre, Việt Nam' },
        'bình định': { lat: 13.7820, lng: 109.2194, display_name: 'Tỉnh Bình Định, Việt Nam' },
        'quy nhơn': { lat: 13.7765, lng: 109.2241, display_name: 'Thành phố Quy Nhơn, Tỉnh Bình Định, Việt Nam' },
        'bình dương': { lat: 11.1624, lng: 106.6480, display_name: 'Tỉnh Bình Dương, Việt Nam' },
        'thủ dầu một': { lat: 10.9805, lng: 106.6519, display_name: 'Thành phố Thủ Dầu Một, Tỉnh Bình Dương, Việt Nam' },
        'bình phước': { lat: 11.7510, lng: 106.9184, display_name: 'Tỉnh Bình Phước, Việt Nam' },
        'bình thuận': { lat: 11.0903, lng: 108.0720, display_name: 'Tỉnh Bình Thuận, Việt Nam' },
        'phan thiết': { lat: 10.9333, lng: 108.1000, display_name: 'Thành phố Phan Thiết, Tỉnh Bình Thuận, Việt Nam' },
        'cà mau': { lat: 9.1769, lng: 105.1524, display_name: 'Tỉnh Cà Mau, Việt Nam' },
        'cao bằng': { lat: 22.6657, lng: 105.9573, display_name: 'Tỉnh Cao Bằng, Việt Nam' },
        'đắk lắk': { lat: 12.6667, lng: 108.0500, display_name: 'Tỉnh Đắk Lắk, Việt Nam' },
        'buôn ma thuột': { lat: 12.6667, lng: 108.0500, display_name: 'Thành phố Buôn Ma Thuột, Tỉnh Đắk Lắk, Việt Nam' },
        'đắk nông': { lat: 12.0042, lng: 107.6875, display_name: 'Tỉnh Đắk Nông, Việt Nam' },
        'điện biên': { lat: 21.3854, lng: 103.0188, display_name: 'Tỉnh Điện Biên, Việt Nam' },
        'đồng nai': { lat: 11.0528, lng: 107.1685, display_name: 'Tỉnh Đồng Nai, Việt Nam' },
        'biên hòa': { lat: 10.9575, lng: 106.8427, display_name: 'Thành phố Biên Hòa, Tỉnh Đồng Nai, Việt Nam' },
        'đồng tháp': { lat: 10.4938, lng: 105.6513, display_name: 'Tỉnh Đồng Tháp, Việt Nam' },
        'cao lãnh': { lat: 10.4571, lng: 105.6322, display_name: 'Thành phố Cao Lãnh, Tỉnh Đồng Tháp, Việt Nam' },
        'gia lai': { lat: 13.9833, lng: 108.0000, display_name: 'Tỉnh Gia Lai, Việt Nam' },
        'pleiku': { lat: 13.9833, lng: 108.0000, display_name: 'Thành phố Pleiku, Tỉnh Gia Lai, Việt Nam' },
        'hà giang': { lat: 22.8233, lng: 104.9839, display_name: 'Tỉnh Hà Giang, Việt Nam' },
        'hà nam': { lat: 20.5839, lng: 105.9239, display_name: 'Tỉnh Hà Nam, Việt Nam' },
        'hà tĩnh': { lat: 18.3431, lng: 105.9058, display_name: 'Tỉnh Hà Tĩnh, Việt Nam' },
        'hải dương': { lat: 20.9372, lng: 106.3146, display_name: 'Tỉnh Hải Dương, Việt Nam' },
        'hậu giang': { lat: 9.7839, lng: 105.4697, display_name: 'Tỉnh Hậu Giang, Việt Nam' },
        'vị thanh': { lat: 9.7839, lng: 105.4697, display_name: 'Thành phố Vị Thanh, Tỉnh Hậu Giang, Việt Nam' },
        'hòa bình': { lat: 20.8174, lng: 105.3380, display_name: 'Tỉnh Hòa Bình, Việt Nam' },
        'hưng yên': { lat: 20.6464, lng: 106.0511, display_name: 'Tỉnh Hưng Yên, Việt Nam' },
        'khánh hòa': { lat: 12.2388, lng: 109.1967, display_name: 'Tỉnh Khánh Hòa, Việt Nam' },
        'nha trang': { lat: 12.2388, lng: 109.1967, display_name: 'Thành phố Nha Trang, Tỉnh Khánh Hòa, Việt Nam' },
        'kiên giang': { lat: 10.0125, lng: 105.0809, display_name: 'Tỉnh Kiên Giang, Việt Nam' },
        'rạch giá': { lat: 10.0125, lng: 105.0809, display_name: 'Thành phố Rạch Giá, Tỉnh Kiên Giang, Việt Nam' },
        'phú quốc': { lat: 10.2289, lng: 103.9572, display_name: 'Thành phố Phú Quốc, Tỉnh Kiên Giang, Việt Nam' },
        'kon tum': { lat: 14.3500, lng: 108.0000, display_name: 'Tỉnh Kon Tum, Việt Nam' },
        'lai châu': { lat: 22.3964, lng: 103.4589, display_name: 'Tỉnh Lai Châu, Việt Nam' },
        'lâm đồng': { lat: 11.9404, lng: 108.4583, display_name: 'Tỉnh Lâm Đồng, Việt Nam' },
        'đà lạt': { lat: 11.9404, lng: 108.4583, display_name: 'Thành phố Đà Lạt, Tỉnh Lâm Đồng, Việt Nam' },
        'lạng sơn': { lat: 21.8537, lng: 106.7612, display_name: 'Tỉnh Lạng Sơn, Việt Nam' },
        'lào cai': { lat: 22.4856, lng: 103.9707, display_name: 'Tỉnh Lào Cai, Việt Nam' },
        'sa pa': { lat: 22.3364, lng: 103.8438, display_name: 'Thị xã Sa Pa, Tỉnh Lào Cai, Việt Nam' },
        'long an': { lat: 10.5362, lng: 106.4103, display_name: 'Tỉnh Long An, Việt Nam' },
        'tân an': { lat: 10.5362, lng: 106.4103, display_name: 'Thành phố Tân An, Tỉnh Long An, Việt Nam' },
        'nam định': { lat: 20.4389, lng: 106.1806, display_name: 'Tỉnh Nam Định, Việt Nam' },
        'nghệ an': { lat: 19.3833, lng: 104.9167, display_name: 'Tỉnh Nghệ An, Việt Nam' },
        'vinh': { lat: 18.6734, lng: 105.6813, display_name: 'Thành phố Vinh, Tỉnh Nghệ An, Việt Nam' },
        'ninh bình': { lat: 20.2506, lng: 105.9744, display_name: 'Tỉnh Ninh Bình, Việt Nam' },
        'ninh thuận': { lat: 11.5653, lng: 108.9884, display_name: 'Tỉnh Ninh Thuận, Việt Nam' },
        'phan rang': { lat: 11.5653, lng: 108.9884, display_name: 'Thành phố Phan Rang - Tháp Chàm, Tỉnh Ninh Thuận, Việt Nam' },
        'phú thọ': { lat: 21.3228, lng: 105.2280, display_name: 'Tỉnh Phú Thọ, Việt Nam' },
        'việt trì': { lat: 21.3228, lng: 105.2280, display_name: 'Thành phố Việt Trì, Tỉnh Phú Thọ, Việt Nam' },
        'phú yên': { lat: 13.0882, lng: 109.3149, display_name: 'Tỉnh Phú Yên, Việt Nam' },
        'tuy hòa': { lat: 13.0882, lng: 109.3149, display_name: 'Thành phố Tuy Hòa, Tỉnh Phú Yên, Việt Nam' },
        'quảng bình': { lat: 17.4667, lng: 106.6000, display_name: 'Tỉnh Quảng Bình, Việt Nam' },
        'đồng hới': { lat: 17.4667, lng: 106.6000, display_name: 'Thành phố Đồng Hới, Tỉnh Quảng Bình, Việt Nam' },
        'quảng nam': { lat: 15.5667, lng: 108.4833, display_name: 'Tỉnh Quảng Nam, Việt Nam' },
        'tam kỳ': { lat: 15.5667, lng: 108.4833, display_name: 'Thành phố Tam Kỳ, Tỉnh Quảng Nam, Việt Nam' },
        'hội an': { lat: 15.8801, lng: 108.3380, display_name: 'Thành phố Hội An, Tỉnh Quảng Nam, Việt Nam' },
        'quảng ngãi': { lat: 15.1205, lng: 108.7923, display_name: 'Tỉnh Quảng Ngãi, Việt Nam' },
        'quảng ninh': { lat: 21.0069, lng: 107.2925, display_name: 'Tỉnh Quảng Ninh, Việt Nam' },
        'hạ long': { lat: 20.9505, lng: 107.0733, display_name: 'Thành phố Hạ Long, Tỉnh Quảng Ninh, Việt Nam' },
        'quảng trị': { lat: 16.7500, lng: 107.1833, display_name: 'Tỉnh Quảng Trị, Việt Nam' },
        'đông hà': { lat: 16.8167, lng: 107.1000, display_name: 'Thành phố Đông Hà, Tỉnh Quảng Trị, Việt Nam' },
        'sóc trăng': { lat: 9.6033, lng: 105.9800, display_name: 'Tỉnh Sóc Trăng, Việt Nam' },
        'sơn la': { lat: 21.3275, lng: 103.9189, display_name: 'Tỉnh Sơn La, Việt Nam' },
        'tây ninh': { lat: 11.3653, lng: 106.0984, display_name: 'Tỉnh Tây Ninh, Việt Nam' },
        'thái bình': { lat: 20.4464, lng: 106.3364, display_name: 'Tỉnh Thái Bình, Việt Nam' },
        'thái nguyên': { lat: 21.5928, lng: 105.8442, display_name: 'Tỉnh Thái Nguyên, Việt Nam' },
        'thanh hóa': { lat: 19.8067, lng: 105.7852, display_name: 'Tỉnh Thanh Hóa, Việt Nam' },
        'thừa thiên huế': { lat: 16.4637, lng: 107.5909, display_name: 'Tỉnh Thừa Thiên Huế, Việt Nam' },
        'huế': { lat: 16.4637, lng: 107.5909, display_name: 'Thành phố Huế, Tỉnh Thừa Thiên Huế, Việt Nam' },
        'tiền giang': { lat: 10.4493, lng: 106.3422, display_name: 'Tỉnh Tiền Giang, Việt Nam' },
        'mỹ tho': { lat: 10.3600, lng: 106.3600, display_name: 'Thành phố Mỹ Tho, Tỉnh Tiền Giang, Việt Nam' },
        'tuyên quang': { lat: 21.8244, lng: 105.2153, display_name: 'Tỉnh Tuyên Quang, Việt Nam' },
        'vĩnh long': { lat: 10.2537, lng: 105.9722, display_name: 'Tỉnh Vĩnh Long, Việt Nam' },
        'vĩnh phúc': { lat: 21.3089, lng: 105.6047, display_name: 'Tỉnh Vĩnh Phúc, Việt Nam' },
        'yên bái': { lat: 21.7228, lng: 104.9113, display_name: 'Tỉnh Yên Bái, Việt Nam' }
    };

    const searchPlaces = async (queryText) => {
        if (!queryText || !queryText.trim()) return [];
        const rawQuery = queryText.trim();
        const normQuery = rawQuery.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/^(tỉnh|thành phố|tp\.|quận|huyện|thị xã)\s+/i, '').trim();

        let results = [];

        // 0. Khởi tạo từ Từ điển Tỉnh/Thành Việt Nam cố định (Search Trà Vinh, Cần Thơ, Sài Gòn, v.v. luôn ra kết quả 100%)
        Object.keys(VIETNAM_PROVINCE_COORDS).forEach(key => {
            const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (normQuery.includes(normKey) || normKey.includes(normQuery)) {
                const item = VIETNAM_PROVINCE_COORDS[key];
                if (!results.some(r => r.display_name === item.display_name)) {
                    results.push(item);
                }
            }
        });

        // 1. Tìm kiếm qua API Photon (Komoot Geocoder)
        try {
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(rawQuery)}&limit=5&lang=vi`);
            if (photonRes.ok) {
                const data = await photonRes.json();
                if (data && data.features && data.features.length > 0) {
                    data.features.forEach(f => {
                        const p = f.properties || {};
                        const parts = [p.name, p.street, p.district || p.suburb, p.city || p.county, p.state].filter(Boolean);
                        const label = parts.join(', ');
                        const coords = f.geometry?.coordinates || [0, 0];
                        if (coords[0] !== 0 && coords[1] !== 0) {
                            results.push({
                                display_name: label || p.name || rawQuery,
                                lat: coords[1],
                                lng: coords[0]
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Photon search error:", e);
        }

        // 2. Tìm kiếm qua API OpenStreetMap Nominatim
        try {
            const nomQuery = rawQuery.toLowerCase().includes('việt nam') || rawQuery.toLowerCase().includes('vietnam') ? rawQuery : `${rawQuery}, Việt Nam`;
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nomQuery)}&countrycodes=vn&limit=5&accept-language=vi`);
            if (nomRes.ok) {
                const data = await nomRes.json();
                if (data && data.length > 0) {
                    data.forEach(item => {
                        results.push({
                            display_name: item.display_name,
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon)
                        });
                    });
                }
            }
        } catch (e) {
            console.warn("Nominatim search error:", e);
        }

        // Lọc kết quả trùng tọa độ
        const uniqueResults = [];
        results.forEach(r => {
            if (!uniqueResults.some(u => Math.abs(u.lat - r.lat) < 0.001 && Math.abs(u.lng - r.lng) < 0.001)) {
                uniqueResults.push(r);
            }
        });

        return uniqueResults;
    };

    const handleFetchSuggestions = async (text) => {
        if (!text || text.trim().length < 2) {
            setSearchSuggestions([]);
            return;
        }
        const res = await searchPlaces(text);
        setSearchSuggestions(res);
    };

    const handleSelectSuggestion = (item) => {
        setMapSearchText(item.display_name);
        setSearchSuggestions([]);
        if (pickerMap && item.lat && item.lng) {
            pickerMap.setView([item.lat, item.lng], 16);
            reverseGeocode(item.lat, item.lng);
        }
    };

    const handleSearchLocation = async (e) => {
        if (e) e.preventDefault();
        if (!mapSearchText.trim() || !pickerMap) return;
        setMapLoading(true);
        setIsGeocoding(true);
        setSearchSuggestions([]);
        try {
            const results = await searchPlaces(mapSearchText);
            if (results && results.length > 0) {
                const first = results[0];
                pickerMap.setView([first.lat, first.lng], 16);
                reverseGeocode(first.lat, first.lng);
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Không tìm thấy địa điểm này. Vui lòng thử từ khóa rõ ràng hơn (VD: Cái Răng, Cần Thơ)!' }));
            }
        } catch (err) {
            console.error('Lỗi tìm kiếm bản đồ:', err);
        } finally {
            setMapLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation && pickerMap) {
            setIsGeocoding(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    pickerMap.setView([lat, lng], 16);
                    reverseGeocode(lat, lng);
                },
                (err) => {
                    console.error('Lỗi lấy định vị GPS:', err);
                    setIsGeocoding(false);
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: "Không thể định vị vị trí hiện tại. Vui lòng cấp quyền định vị GPS trên trình duyệt của bạn!" }));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: "Trình duyệt không hỗ trợ dịch vụ định vị GPS!" }));
        }
    };

    const confirmLocation = async () => {
        if (!resolvedAddress) return;
        const addr = resolvedAddress.address || {};

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

    const isRankFreeShip = Boolean(
        account?.free_shipping === true || account?.free_shipping === 1 || String(account?.free_shipping) === 'true' || String(account?.free_shipping) === '1' ||
        account?.freeShipping === true || account?.freeShipping === 1 || String(account?.freeShipping) === 'true' || String(account?.freeShipping) === '1'
    );

    const calculateGHNFee = async (dId, wCode, customTotal = null, customRankId = null) => {
        if (isRankFreeShip) {
            setShippingFee(0);
            return;
        }
        const currentTotal = customTotal !== null ? customTotal : totalPrice;
        try {
            const response = await api.post('/api/ghn/calculate-fee', {
                toDistrictId: parseInt(dId),
                toWardCode: wCode || "",
                totalAmount: Math.round(currentTotal)
            });
            if (isRankFreeShip) {
                setShippingFee(0);
                return;
            }
            if (response.data && response.data.code === 200) {
                setShippingFee(response.data.data.total || 30000);
            } else {
                setShippingFee(30000);
            }
        } catch (err) {
            console.error('Lỗi tính phí ship GHN:', err);
            if (isRankFreeShip) {
                setShippingFee(0);
            } else {
                setShippingFee(30000);
            }
        }
    };

    useEffect(() => {
        if (isRankFreeShip) {
            setShippingFee(0);
        }
    }, [totalPrice, account, isRankFreeShip]);

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

            const urlParams = new URLSearchParams(window.location.search);
            const buyNowVariantId = urlParams.get('buyNowVariantId');
            const buyNowQty = urlParams.get('buyNowQty');

            const response = await api.post('/api/vouchers/apply', {
                voucherCode: code.trim().toUpperCase(),
                cartTotal: totalPrice,
                buyNowVariantId: buyNowVariantId ? parseInt(buyNowVariantId) : null,
                buyNowQty: buyNowQty ? parseInt(buyNowQty) : null
            });
            if (response.data && response.data.success) {
                const discountValue = response.data.discount || 0;
                const v = response.data.voucher;
                setAppliedVoucher({
                    code: response.data.code,
                    discountType: 'PERCENT',
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
        setFormErrors({});

        let newErrors = {};
        if (!account?.full_name || !account.full_name.trim()) {
            newErrors.fullName = 'Vui lòng nhập họ và tên người nhận!';
        }
        if (!account?.phone || !account.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại người nhận!';
        } else if (!/^[0-9]{10,11}$/.test(account.phone.trim())) {
            newErrors.phone = 'Số điện thoại phải từ 10 - 11 chữ số!';
        }
        if (!selectedProvince) {
            newErrors.selectedProvince = 'Vui lòng chọn Tỉnh / Thành phố!';
        }
        if (!selectedDistrict) {
            newErrors.selectedDistrict = 'Vui lòng chọn Quận / Huyện!';
        }
        if (!selectedWard) {
            newErrors.selectedWard = 'Vui lòng chọn Phường / Xã!';
        }
        if (!streetDetail || !streetDetail.trim()) {
            newErrors.streetDetail = 'Vui lòng nhập địa chỉ chi tiết!';
        }

        if (Object.keys(newErrors).length > 0) {
            setFormErrors(newErrors);
            setSubmitError('Vui lòng kiểm tra lại các trường thông tin giao hàng còn thiếu bên dưới!');
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
                    <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-5">
                        <div className="col-lg-7 animate__animated animate__fadeInLeft">
                            <h3 className="section-title">THÔNG TIN GIAO HÀNG</h3>
                            <div className="checkout-card">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label">Họ và tên người nhận <span className="text-danger">*</span></label>
                                        <input type="text" name="fullName" className={`form-control ${formErrors.fullName ? 'is-invalid border-danger' : ''}`}
                                            value={account.full_name || ''} 
                                            onChange={e => {
                                                setAccount({ ...account, full_name: e.target.value });
                                                if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: null });
                                            }} />
                                        {formErrors.fullName && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.fullName}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Số điện thoại <span className="text-danger">*</span></label>
                                        <input type="text" name="phone" className={`form-control ${formErrors.phone ? 'is-invalid border-danger' : ''}`}
                                            value={account.phone || ''} 
                                            onChange={e => {
                                                setAccount({ ...account, phone: e.target.value });
                                                if (formErrors.phone) setFormErrors({ ...formErrors, phone: null });
                                            }} />
                                        {formErrors.phone && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.phone}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" value={account.email || ''} readOnly />
                                    </div>
                                    
                                    <div className="col-md-4">
                                        <label className="form-label">Tỉnh / Thành phố <span className="text-danger">*</span></label>
                                        <select className={`form-select form-control ${formErrors.selectedProvince ? 'is-invalid border-danger' : ''}`} value={selectedProvince} onChange={e => {
                                            handleProvinceChange(e);
                                            if (formErrors.selectedProvince) setFormErrors({ ...formErrors, selectedProvince: null });
                                        }}>
                                            <option value="">Chọn Tỉnh/Thành</option>
                                            {provinces.map(p => (
                                                <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                                            ))}
                                        </select>
                                        {formErrors.selectedProvince && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.selectedProvince}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Quận / Huyện <span className="text-danger">*</span></label>
                                        <select className={`form-select form-control ${formErrors.selectedDistrict ? 'is-invalid border-danger' : ''}`} value={selectedDistrict} onChange={e => {
                                            handleDistrictChange(e);
                                            if (formErrors.selectedDistrict) setFormErrors({ ...formErrors, selectedDistrict: null });
                                        }} disabled={!selectedProvince} style={{ opacity: !selectedProvince ? 0.5 : 1, filter: !selectedProvince ? 'blur(1px)' : 'none', transition: '0.3s' }}>
                                            <option value="">Chọn Quận/Huyện</option>
                                            {districts.map(d => (
                                                <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                                            ))}
                                        </select>
                                        {formErrors.selectedDistrict && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.selectedDistrict}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Phường / Xã <span className="text-danger">*</span></label>
                                        <select className={`form-select form-control ${formErrors.selectedWard ? 'is-invalid border-danger' : ''}`} value={selectedWard} onChange={e => {
                                            handleWardChange(e);
                                            if (formErrors.selectedWard) setFormErrors({ ...formErrors, selectedWard: null });
                                        }} disabled={!selectedDistrict} style={{ opacity: !selectedDistrict ? 0.5 : 1, filter: !selectedDistrict ? 'blur(1px)' : 'none', transition: '0.3s' }}>
                                            <option value="">Chọn Phường/Xã</option>
                                            {wards.map(w => (
                                                <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                                            ))}
                                        </select>
                                        {formErrors.selectedWard && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.selectedWard}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-12 mt-2">
                                         <button type="button" className="btn btn-outline-danger w-100 font-orbitron fw-bold py-2 d-flex align-items-center justify-content-center gap-2" onClick={openMapModal} style={{ borderRadius: '8px', border: '1px dashed #e50914', background: 'rgba(229, 9, 20, 0.03)', color: '#e50914', transition: 'all 0.2s' }}>
                                             <i className="fa-solid fa-map-location-dot"></i> CHỌN VỊ TRÍ TỪ BẢN ĐỒ (GOOGLE MAPS)
                                         </button>
                                     </div>
                                    
                                    <div className="col-12">
                                        <label className="form-label">Địa chỉ chi tiết <span className="text-danger">*</span></label>
                                        <input type="text" className={`form-control ${formErrors.streetDetail ? 'is-invalid border-danger' : ''}`} 
                                            placeholder="Số nhà, tên đường..." 
                                            value={streetDetail}
                                            onChange={e => {
                                                setStreetDetail(e.target.value);
                                                if (formErrors.streetDetail) setFormErrors({ ...formErrors, streetDetail: null });
                                            }} />
                                        {formErrors.streetDetail && (
                                            <div className="text-danger small mt-1 font-oswald fw-bold">
                                                <i className="bi bi-exclamation-circle me-1"></i>{formErrors.streetDetail}
                                            </div>
                                        )}
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
                                        <i className="fa fa-qrcode fa-lg text-primary"></i>
                                        <div>
                                            <div className="fw-bold">Chuyển khoản QR (PayOS)</div>
                                            <div className="small text-muted">Quét mã tự động & Bảo mật tuyệt đối</div>
                                        </div>
                                    </div>
                                    {paymentMethod === 'BANK' && (
                                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(13, 110, 253, 0.05)', border: '1px dashed #0d6efd', fontSize: '13px' }}>
                                            <div className="fw-bold text-primary mb-1"><i className="fa-solid fa-shield-halved me-1"></i> CỔNG THANH TOÁN TỰ ĐỘNG PAYOS</div>
                                            <ul className="mb-0 ps-3 text-muted" style={{ lineHeight: '1.6' }}>
                                                <li><b>Quét mã tự động:</b> Không cần nhập số tài khoản hay số tiền, hệ thống tự động nhận diện đơn hàng.</li>
                                                <li><b>Hỗ trợ:</b> Tất cả Ngân hàng & MoMo, ZaloPay, VietQR.</li>
                                                <li><b>Lưu ý:</b> Sau khi nhấn <b>Xác nhận đặt hàng</b>, hệ thống sẽ mở cổng thanh toán PayOS để bạn quét mã QR.</li>
                                            </ul>
                                        </div>
                                    )}
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
                                         <span className={shippingFee === 0 ? 'text-success fw-bold' : ''}>
                                             {shippingFee > 0 ? formatCurrency(shippingFee) : 'MIỄN PHÍ'}
                                         </span>
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
                        
                        <form onSubmit={handleSearchLocation} className="mb-3 position-relative">
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Tìm kiếm địa chỉ, tên đường, khu vực (VD: Cái Răng, Cần Thơ)..." 
                                    value={mapSearchText}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setMapSearchText(val);
                                        handleFetchSuggestions(val);
                                    }}
                                    onFocus={() => {
                                        if (mapSearchText.trim().length >= 2) handleFetchSuggestions(mapSearchText);
                                    }}
                                    style={{ background: '#f8f9fa', border: '1px solid #ddd', color: '#333' }}
                                />
                                <button type="submit" className="btn btn-danger font-orbitron fw-bold" disabled={mapLoading}>
                                    {mapLoading ? 'ĐANG TÌM...' : 'TÌM KIẾM'}
                                </button>
                            </div>

                            {/* GỢI Ý TÌM KIẾM ĐỊA ĐIỂM (AUTOCOMPLETE DROPDOWN) */}
                            {searchSuggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 10000,
                                    background: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '0 0 12px 12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    maxHeight: '220px',
                                    overflowY: 'auto'
                                }}>
                                    {searchSuggestions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="px-3 py-2 border-bottom"
                                            style={{ cursor: 'pointer', fontSize: '13px', color: '#333', textAlign: 'left' }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSuggestion(item);
                                            }}
                                        >
                                            <i className="fa-solid fa-location-dot text-danger me-2"></i>
                                            <span>{item.display_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form>

                        <div className="position-relative" style={{ height: '350px', minHeight: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#e2e8f0' }}>
                            <div id="picker-map" style={{ height: '350px', minHeight: '350px', width: '100%', zIndex: 1 }}></div>
                            
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
                        
                        {isGeocoding ? (
                            <div className="mt-3 p-3 bg-light rounded" style={{ fontSize: '13px', borderLeft: '4px solid #0d6efd', color: '#333', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                                <span>Đang đọc địa chỉ từ bản đồ...</span>
                            </div>
                        ) : resolvedAddress ? (
                            <div className="mt-3 p-3 bg-light rounded" style={{ fontSize: '13px', borderLeft: '4px solid #e50914', color: '#333', textAlign: 'left' }}>
                                <strong>Vị trí đã chọn:</strong> {resolvedAddress.display_name}
                            </div>
                        ) : (
                            <div className="mt-3 p-3 bg-light rounded" style={{ fontSize: '13px', borderLeft: '4px solid #6c757d', color: '#666', textAlign: 'left' }}>
                                <i className="fa-solid fa-location-dot me-1"></i> Di chuyển bản đồ để chọn vị trí giao hàng.
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" className="btn btn-secondary font-orbitron fw-bold" onClick={closeMapModal} style={{ borderRadius: '8px' }}>
                                HỦY BỎ
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger font-orbitron fw-bold"
                                onClick={confirmLocation}
                                disabled={isGeocoding || !resolvedAddress}
                                style={{ borderRadius: '8px', cursor: (isGeocoding || !resolvedAddress) ? 'not-allowed' : 'pointer' }}
                            >
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
