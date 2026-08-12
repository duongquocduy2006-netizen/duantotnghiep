import React, { useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import Toast from '../components/Toast';
import LoginPromptSheet from '../components/LoginPromptSheet';

const { width, height } = Dimensions.get('window');

// Local Fallback Address Data for major cities in Vietnam
const FALLBACK_PROVINCES = [
  { code: 1, name: "Thành phố Hà Nội" },
  { code: 79, name: "Thành phố Hồ Chí Minh" },
  { code: 48, name: "Thành phố Đà Nẵng" }
];

const FALLBACK_DISTRICTS = {
  1: [
    { code: 1, name: "Quận Ba Đình" },
    { code: 2, name: "Quận Hoàn Kiếm" },
    { code: 3, name: "Quận Tây Hồ" },
    { code: 4, name: "Quận Cầu Giấy" }
  ],
  79: [
    { code: 760, name: "Quận 1" },
    { code: 764, name: "Quận Gò Vấp" },
    { code: 769, name: "Quận 2" },
    { code: 778, name: "Quận 9" }
  ],
  48: [
    { code: 490, name: "Quận Hải Châu" },
    { code: 492, name: "Quận Thanh Khê" },
    { code: 494, name: "Quận Liên Chiểu" }
  ]
};

const FALLBACK_WARDS = {
  1: [
    { code: 1, name: "Phường Phúc Xá" },
    { code: 2, name: "Phường Trúc Bạch" },
    { code: 3, name: "Phường Vĩnh Phúc" }
  ],
  2: [
    { code: 10, name: "Phường Đồng Xuân" },
    { code: 11, name: "Phường Hàng Bạc" },
    { code: 12, name: "Phường Hàng Đào" }
  ],
  3: [
    { code: 20, name: "Phường Quảng An" },
    { code: 21, name: "Phường Nhật Tân" }
  ],
  4: [
    { code: 30, name: "Phường Dịch Vọng" },
    { code: 31, name: "Phường Quan Hoa" }
  ],
  760: [
    { code: 26734, name: "Phường Bến Nghé" },
    { code: 26737, name: "Phường Bến Thành" },
    { code: 26740, name: "Phường Cô Giang" }
  ],
  764: [
    { code: 26860, name: "Phường 1" },
    { code: 26863, name: "Phường 3" },
    { code: 26866, name: "Phường 5" }
  ],
  769: [
    { code: 26900, name: "Phường An Khánh" },
    { code: 26903, name: "Phường Thảo Điền" }
  ],
  778: [
    { code: 27000, name: "Phường Long Thạnh Mỹ" },
    { code: 27003, name: "Phường Phước Long A" }
  ],
  490: [
    { code: 20200, name: "Phường Bình Hiên" },
    { code: 20203, name: "Phường Bình Thuận" }
  ],
  492: [
    { code: 20300, name: "Phường An Khê" },
    { code: 20303, name: "Phường Hòa Khê" }
  ],
  494: [
    { code: 20400, name: "Phường Hòa Hiệp Bắc" },
    { code: 20403, name: "Phường Hòa Hiệp Nam" }
  ]
};


export default function CartScreen({ navigation }) {
  const { cart, totalAmount, updateCartQuantity, clearCart } = useContext(CartContext);

  // Checkout modal and fields state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // Login prompt sheet state
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const showLoginPrompt = () => setLoginPromptVisible(true);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [specificAddress, setSpecificAddress] = useState('');

  // Dropdown lists
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);

  // Selected Address Nodes
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  // Selection dropdown state - inline (no nested Modal)
  const [openDropdown, setOpenDropdown] = useState(''); // 'province' | 'district' | 'ward' | ''
  const [searchQuery, setSearchQuery] = useState('');

  // Membership Rank states
  const [userPoints, setUserPoints] = useState(0);

  // Vouchers state (fetch from database)
  const [vouchers, setVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [inputVoucherCode, setInputVoucherCode] = useState('');
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Checkout pricing details
  const [shippingFee] = useState(30000);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'BANK'

  const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatVND = (num) => {
    if (!num) return '0 đ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  const getMemberRankName = (points) => {
    if (points >= 10000) return 'Kim Cương (Diamond)';
    if (points >= 2000) return 'Vàng (Gold)';
    if (points >= 500) return 'Bạc (Silver)';
    return 'Đồng (Bronze)';
  };

  // Load provinces on load
  const fetchProvinces = async () => {
    setAddressLoading(true);
    try {
      const res = await fetch('https://provinces.open-api.vn/api/p/');
      if (res.ok) {
        const data = await res.json();
        setProvinces(data);
      } else {
        throw new Error('Provinces fetch error');
      }
    } catch (e) {
      console.log("Provinces API failed, using fallback database:", e.message);
      setProvinces(FALLBACK_PROVINCES);
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchRealVouchers = async (userId = null) => {
    setVouchersLoading(true);
    try {
      let requestUrl = `${API_BASE_URL}/api/vouchers`;
      if (userId) {
        requestUrl += `?accountId=${userId}`;
      } else {
        const storedUser = await AsyncStorage.getItem('userAccount');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            requestUrl += `?accountId=${user.id}`;
          }
        }
      }
      const response = await fetch(requestUrl, { headers: { 'Accept': 'application/json' } });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.vouchers)) {
        const mapped = data.vouchers.map((v, idx) => {
          const rawType = (v.discount_type || v.discountType || 'FIXED').toUpperCase();
          const isPercent = rawType === 'PERCENT';
          const isShipping = rawType === 'SHIPPING';
          const val = v.discount_value != null ? Number(v.discount_value) : (v.discountValue != null ? Number(v.discountValue) : 0);
          const maxDiscount = v.max_discount != null ? Number(v.max_discount) : (v.maxDiscount != null ? Number(v.maxDiscount) : null);
          const minOrderValue = v.min_order_value != null ? Number(v.min_order_value) : (v.minOrderValue != null ? Number(v.minOrderValue) : 0);

          return {
            id: v.id || idx + 1,
            code: v.code || `VOUCHER${idx + 1}`,
            desc: isPercent 
              ? `Giảm ${val}%${maxDiscount ? ` (Tối đa ${formatVND(maxDiscount)})` : ''}${minOrderValue ? ` (Đơn từ ${formatVND(minOrderValue)})` : ''}` 
              : (isShipping ? 'Miễn phí giao hàng toàn quốc' : `Giảm ngay ${formatVND(val)}${minOrderValue ? ` (Đơn từ ${formatVND(minOrderValue)})` : ''}`),
            type: isPercent ? 'percent' : (isShipping ? 'shipping' : 'value'),
            value: val,
            maxDiscount: maxDiscount,
            minSpend: minOrderValue,
            minPoints: v.min_points != null ? Number(v.min_points) : (v.minPoints != null ? Number(v.minPoints) : 0),
            rankName: v.rank_name || v.rankName || (minOrderValue ? `Đơn từ ${formatVND(minOrderValue)}` : 'Mọi đơn hàng / Mọi hạng')
          };
        });
        setVouchers(mapped.filter(v => userPoints >= (v.minPoints || 0)));
      } else {
        setVouchers([]);
      }
    } catch (e) {
      console.log("Error fetching real vouchers in CartScreen:", e.message);
      setVouchers([]);
    } finally {
      setVouchersLoading(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      // 1. Fetch provinces
      await fetchProvinces();

      // 1.5. Fetch real vouchers from database
      await fetchRealVouchers();

      // 2. Load user account (for userPoints and basic credentials)
      try {
        const storedUser = await AsyncStorage.getItem('userAccount');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setRecipientName(user.full_name || '');
          setRecipientPhone(user.phone || '');
          setUserPoints(user.points || 0);
          if (user.id) {
            fetchRealVouchers(user.id);
          }
        }
      } catch (e) {
        console.log("Error loading user info in checkout", e);
      }

      // 3. Load saved address
      try {
        const savedRecipientName = await AsyncStorage.getItem('lastRecipientName');
        const savedRecipientPhone = await AsyncStorage.getItem('lastRecipientPhone');
        const savedProvinceJson = await AsyncStorage.getItem('lastSelectedProvince');
        const savedDistrictJson = await AsyncStorage.getItem('lastSelectedDistrict');
        const savedWardJson = await AsyncStorage.getItem('lastSelectedWard');
        const savedSpecificAddress = await AsyncStorage.getItem('lastSpecificAddress');

        if (savedRecipientName) setRecipientName(savedRecipientName);
        if (savedRecipientPhone) setRecipientPhone(savedRecipientPhone);

        if (savedProvinceJson) {
          const prov = JSON.parse(savedProvinceJson);
          setSelectedProvince(prov);

          // Fetch districts for this province
          let loadedDistricts = [];
          setAddressLoading(true);
          try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${prov.code}?depth=2`);
            if (res.ok) {
              const data = await res.json();
              loadedDistricts = data.districts || [];
            } else {
              throw new Error();
            }
          } catch (e) {
            loadedDistricts = FALLBACK_DISTRICTS[prov.code] || [];
          }
          setDistricts(loadedDistricts);

          if (savedDistrictJson) {
            const dist = JSON.parse(savedDistrictJson);
            setSelectedDistrict(dist);

            // Fetch wards for this district
            let loadedWards = [];
            try {
              const res = await fetch(`https://provinces.open-api.vn/api/d/${dist.code}?depth=2`);
              if (res.ok) {
                const data = await res.json();
                loadedWards = data.wards || [];
              } else {
                throw new Error();
              }
            } catch (e) {
              loadedWards = FALLBACK_WARDS[dist.code] || [];
            }
            setWards(loadedWards);

            if (savedWardJson) {
              setSelectedWard(JSON.parse(savedWardJson));
            }
          }
          setAddressLoading(false);
        }

        if (savedSpecificAddress) {
          setSpecificAddress(savedSpecificAddress);
        }
      } catch (e) {
        console.log("Error loading saved address:", e);
        setAddressLoading(false);
      }
    };

    initData();
  }, []);

  const handleProvinceSelect = async (prov) => {
    setSelectedProvince(prov);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);

    setAddressLoading(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${prov.code}?depth=2`);
      if (res.ok) {
        const data = await res.json();
        setDistricts(data.districts || []);
      } else {
        throw new Error('Districts fetch failed');
      }
    } catch (e) {
      console.log("Districts API failed, using fallback:", e.message);
      setDistricts(FALLBACK_DISTRICTS[prov.code] || []);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDistrictSelect = async (dist) => {
    setSelectedDistrict(dist);
    setSelectedWard(null);
    setWards([]);

    setAddressLoading(true);
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${dist.code}?depth=2`);
      if (res.ok) {
        const data = await res.json();
        setWards(data.wards || []);
      } else {
        throw new Error('Wards fetch failed');
      }
    } catch (e) {
      console.log("Wards API failed, using fallback:", e.message);
      setWards(FALLBACK_WARDS[dist.code] || []);
    } finally {
      setAddressLoading(false);
    }
  };

  // Toggle inline dropdown
  const openSelectModal = (type) => {
    if (type === 'district' && !selectedProvince) {
      showToast("Vui lòng chọn Tỉnh/Thành phố trước!");
      return;
    }
    if (type === 'ward' && !selectedDistrict) {
      showToast("Vui lòng chọn Quận/Huyện trước!");
      return;
    }
    setSearchQuery('');
    setOpenDropdown(prev => prev === type ? '' : type);
  };

  // Select Voucher Code card
  const selectVoucher = (voucher) => {
    if (appliedVoucher?.code === voucher.code) {
      setAppliedVoucher(null);
      showToast(`Đã hủy áp dụng mã giảm giá ${voucher.code}`);
      return;
    }

    // Check rank qualification
    if (userPoints < (voucher.minPoints || 0)) {
      showToast(`Voucher ${voucher.code} yêu cầu ${voucher.rankName || 'hạng cao hơn'}. Hạng hiện tại của bạn chưa đủ điều kiện.`);
      return;
    }

    // Check spend requirement
    const minReq = voucher.minSpend !== undefined ? voucher.minSpend : (voucher.minOrderValue || 0);
    if (minReq > 0 && totalAmount < minReq) {
      showToast(`Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã (Yêu cầu từ ${formatVND(minReq)}).`);
      return;
    }

    setAppliedVoucher(voucher);
    showToast(`Đã áp dụng mã giảm giá ${voucher.code}!`);
  };

  const handleApplyCustomVoucher = async () => {
    const codeToApply = inputVoucherCode.trim().toUpperCase();
    if (!codeToApply) {
      showToast("Vui lòng nhập mã giảm giá!");
      return;
    }

    // 1. Check in currently loaded vouchers list
    const foundInList = vouchers.find(v => (v.code || '').toUpperCase() === codeToApply);
    if (foundInList) {
      selectVoucher(foundInList);
      setInputVoucherCode('');
      return;
    }

    // 2. If not found in local/fetched list, try validating from server or database
    setApplyingVoucher(true);
    try {
      let requestUrl = `${API_BASE_URL}/api/vouchers`;
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.id) {
          requestUrl += `?accountId=${user.id}`;
        }
      }
      const response = await fetch(requestUrl, { headers: { 'Accept': 'application/json' } });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.vouchers)) {
        const serverVoucher = data.vouchers.find(v => (v.code || '').toUpperCase() === codeToApply);
        if (serverVoucher) {
          const rawType = (serverVoucher.discount_type || serverVoucher.discountType || 'FIXED').toUpperCase();
          const isPercent = rawType === 'PERCENT';
          const isShipping = rawType === 'SHIPPING';
          const val = serverVoucher.discount_value != null ? Number(serverVoucher.discount_value) : (serverVoucher.discountValue != null ? Number(serverVoucher.discountValue) : 0);
          const maxDiscount = serverVoucher.max_discount != null ? Number(serverVoucher.max_discount) : (serverVoucher.maxDiscount != null ? Number(serverVoucher.maxDiscount) : null);
          const minOrderValue = serverVoucher.min_order_value != null ? Number(serverVoucher.min_order_value) : (serverVoucher.minOrderValue != null ? Number(serverVoucher.minOrderValue) : 0);

          const newVoucherObj = {
            id: serverVoucher.id || Date.now(),
            code: serverVoucher.code || codeToApply,
            desc: isPercent 
              ? `Giảm ${val}%${maxDiscount ? ` (Tối đa ${formatVND(maxDiscount)})` : ''}${minOrderValue ? ` (Đơn từ ${formatVND(minOrderValue)})` : ''}` 
              : (isShipping ? 'Miễn phí giao hàng toàn quốc' : `Giảm ngay ${formatVND(val)}${minOrderValue ? ` (Đơn từ ${formatVND(minOrderValue)})` : ''}`),
            type: isPercent ? 'percent' : (isShipping ? 'shipping' : 'value'),
            value: val,
            maxDiscount: maxDiscount,
            minSpend: minOrderValue,
            minPoints: 0,
            rankName: minOrderValue ? `Đơn từ ${formatVND(minOrderValue)}` : 'Mọi đơn hàng / Mọi hạng'
          };
          
          setVouchers(prev => [...prev, newVoucherObj]);
          selectVoucher(newVoucherObj);
          setInputVoucherCode('');
          setApplyingVoucher(false);
          return;
        }
      }
      
      showToast("Mã giảm giá không hợp lệ, hết hạn hoặc không tồn tại!");
    } catch (e) {
      console.log("Error checking custom voucher:", e);
      showToast("Mã giảm giá không tồn tại hoặc lỗi kết nối!");
    } finally {
      setApplyingVoucher(false);
    }
  };

  // Calculations
  const getVoucherDiscount = () => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.type === 'percent') {
      let discount = totalAmount * (appliedVoucher.value / 100);
      if (appliedVoucher.maxDiscount && discount > appliedVoucher.maxDiscount) {
        discount = appliedVoucher.maxDiscount;
      }
      return discount;
    }
    if (appliedVoucher.type === 'value' || appliedVoucher.type === 'fixed' || appliedVoucher.type === 'AMOUNT') {
      return appliedVoucher.value;
    }
    if (appliedVoucher.type === 'shipping') {
      return shippingFee;
    }
    return 0;
  };

  const finalTotalAmount = totalAmount + shippingFee - getVoucherDiscount();

  // Complete Checkout Action
  const submitCheckout = async () => {
    if (!recipientName.trim()) {
      showToast("Vui lòng nhập họ tên người nhận!");
      return;
    }
    if (!recipientPhone.trim()) {
      showToast("Vui lòng nhập số điện thoại giao hàng!");
      return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedWard || !specificAddress.trim()) {
      showToast("Vui lòng điền đầy đủ địa chỉ giao hàng!");
      return;
    }

    try {
      const fullAddress = `${specificAddress.trim()}, ${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;

      // Prepare items for checkout API payload
      const payloadItems = cart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));

      const payload = {
        fullName: recipientName.trim(),
        phone: recipientPhone.trim(),
        fullAddress: fullAddress,
        note: '',
        paymentMethod: paymentMethod, // 'COD' or 'BANK'
        voucherCode: appliedVoucher ? appliedVoucher.code : '',
        items: payloadItems
      };

      const response = await fetch(`${API_BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status === 401 || (data && data.message && data.message.includes("chưa đăng nhập"))) {
        Alert.alert(
          "Phiên đăng nhập hết hạn 🔑",
          "Vui lòng đăng nhập lại để thực hiện đặt hàng.",
          [
            {
              text: "Đăng nhập",
              onPress: async () => {
                await AsyncStorage.removeItem('userAccount');
                setCheckoutModalVisible(false);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            }
          ]
        );
        return;
      }

      if (response.ok && data.success) {
        // Save delivery details for subsequent orders
        await AsyncStorage.setItem('lastRecipientName', recipientName.trim());
        await AsyncStorage.setItem('lastRecipientPhone', recipientPhone.trim());
        await AsyncStorage.setItem('lastSelectedProvince', JSON.stringify(selectedProvince));
        await AsyncStorage.setItem('lastSelectedDistrict', JSON.stringify(selectedDistrict));
        await AsyncStorage.setItem('lastSelectedWard', JSON.stringify(selectedWard));
        await AsyncStorage.setItem('lastSpecificAddress', specificAddress.trim());

        // Close modals, clear cart
        setCheckoutModalVisible(false);
        
        // If payment method is BANK and checkout URL is provided, open it
        if (data.paymentMethod === 'BANK' && data.checkoutUrl) {
          showToast("Đang mở cổng thanh toán PayOS...");
          Linking.openURL(data.checkoutUrl).catch(err => {
            console.log("Could not open PayOS checkout URL:", err);
            Alert.alert("Lỗi", "Không thể mở cổng thanh toán PayOS. Vui lòng kiểm tra kết nối mạng.");
          });
        } else {
          showToast("Đặt hàng thành công! Đơn hàng đã được ghi nhận.");
        }

        setTimeout(() => {
          clearCart();
          if (data.paymentMethod === 'BANK') {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('Home');
          }
        }, 1200);
      } else {
        showToast(data.message || "Đặt hàng không thành công từ máy chủ.");
      }
    } catch (e) {
      console.log("Error during checkout", e);
      showToast("Không thể kết nối đến máy chủ để đặt hàng.");
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* CUSTOM NAV HEADER */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.circleHeaderBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.navHeaderTitle}>Giỏ Hàng Của Bạn</Text>
        <TouchableOpacity 
          style={styles.circleHeaderBtn} 
          onPress={() => {
            if (cart.length > 0) {
              Alert.alert(
                "Xóa Giỏ Hàng",
                "Bạn có muốn xóa toàn bộ sản phẩm khỏi giỏ hàng không?",
                [
                  { text: "Hủy", style: "cancel" },
                  { text: "Đồng ý", onPress: clearCart, style: "destructive" }
                ]
              );
            }
          }}
        >
          <Ionicons name="trash-outline" size={20} color={cart.length > 0 ? "#E51E25" : "#8E8E9F"} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={80} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Giỏ hàng đang trống!</Text>
            <Text style={styles.emptySubtitle}>Hãy quay lại trang chủ để tìm cho mình mẫu sneaker ưng ý nhất nhé.</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.exploreBtnText}>Khám phá ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={cart}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <Image source={{ uri: formatImageUrl(item.imageUrl) }} style={styles.cartItemImage} />
                  <View style={styles.cartItemDetails}>
                    <Text style={styles.cartItemBrand}>{item.brandName}</Text>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.cartItemSpecs}>Size: {item.size} | Màu: {item.color}</Text>
                    <Text style={styles.cartItemPrice}>{formatVND(item.price)}</Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity 
                      onPress={() => {
                        const itemStock = item.stock || 10;
                        if (item.quantity + 1 > itemStock) {
                          showToast(`Rất tiếc! Số lượng tối đa có sẵn là ${itemStock} đôi.`);
                        } else {
                          updateCartQuantity(item.id, 1);
                        }
                      }} 
                      style={styles.cartActionBtn}
                    >
                      <Feather name="plus" size={14} color="#000000" />
                    </TouchableOpacity>
                    <Text style={styles.cartQtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateCartQuantity(item.id, -1)} style={styles.cartActionBtn}>
                      <Feather 
                        name={item.quantity === 1 ? "trash-2" : "minus"} 
                        size={14} 
                        color={item.quantity === 1 ? "#E51E25" : "#000000"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* BILLING SUMMARY */}
            <View style={styles.billingSection}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Tổng giá trị sản phẩm</Text>
                <Text style={styles.billingValue}>{formatVND(totalAmount)}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Vận chuyển</Text>
                <Text style={[styles.billingValue, { color: '#2E7D32' }]}>Miễn Phí</Text>
              </View>
              <View style={styles.divider} />
              <View style={[styles.billingRow, { marginTop: 8 }]}>
                <Text style={styles.totalLabel}>Tổng Thanh Toán</Text>
                <Text style={styles.totalValue}>{formatVND(totalAmount)}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={async () => {
                  try {
                    const storedUser = await AsyncStorage.getItem('userAccount');
                    if (!storedUser) {
                      showLoginPrompt();
                      return;
                    }
                  } catch (e) {
                    console.warn('Error checking auth state:', e);
                  }
                  setCheckoutModalVisible(true);
                }}
              >
                <Text style={styles.checkoutBtnText}>TIẾN HÀNH ĐẶT HÀNG</Text>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ==================== MODAL THANH TOÁN (CHECKOUT MODAL) ==================== */}
      <Modal
        visible={checkoutModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Xác Nhận Đặt Hàng</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Membership Rank Display */}
              <View style={styles.rankBadgeContainer}>
                <MaterialCommunityIcons name="crown" size={20} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={styles.rankBadgeText}>
                  Thành viên: <Text style={{ fontWeight: 'bold' }}>{getMemberRankName(userPoints)}</Text> ({userPoints} điểm)
                </Text>
              </View>

              {/* Recipient Details Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>1. Thông tin người nhận</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Họ và tên người nhận"
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Số điện thoại liên hệ"
                  keyboardType="phone-pad"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                />
              </View>

              {/* Delivery Address Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>2. Địa chỉ giao hàng</Text>
                
                {addressLoading && (
                  <ActivityIndicator size="small" color="#E51E25" style={{ marginBottom: 10 }} />
                )}

                {/* Dropdown Province selector */}
                <TouchableOpacity 
                  style={[
                    styles.dropdownTrigger,
                    openDropdown === 'province' && styles.dropdownTriggerOpen
                  ]} 
                  onPress={() => openSelectModal('province')}
                >
                  <Text style={[styles.dropdownTriggerText, selectedProvince && { color: '#000000', fontWeight: 'bold' }]}>
                    {selectedProvince ? selectedProvince.name : "Chọn Tỉnh / Thành phố"}
                  </Text>
                  <Ionicons name={openDropdown === 'province' ? "chevron-up" : "chevron-down"} size={16} color="#808080" />
                </TouchableOpacity>

                {/* Inline Province List */}
                {openDropdown === 'province' && (
                  <View style={styles.inlineDropdown}>
                    <View style={styles.inlineSearchBox}>
                      <Ionicons name="search" size={14} color="#808080" style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.inlineSearchInput}
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {provinces
                        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(item => (
                          <TouchableOpacity
                            key={item.code.toString()}
                            style={styles.inlineDropdownItem}
                            onPress={() => {
                              handleProvinceSelect(item);
                              setOpenDropdown('');
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownItemText,
                              selectedProvince?.code === item.code && { color: '#E51E25', fontWeight: '900' }
                            ]}>
                              {item.name}
                            </Text>
                            {selectedProvince?.code === item.code && (
                              <Ionicons name="checkmark" size={16} color="#E51E25" />
                            )}
                          </TouchableOpacity>
                        ))
                      }
                    </ScrollView>
                  </View>
                )}

                {/* Dropdown District selector */}
                <TouchableOpacity 
                  style={[
                    styles.dropdownTrigger,
                    openDropdown === 'district' && styles.dropdownTriggerOpen
                  ]} 
                  onPress={() => openSelectModal('district')}
                >
                  <Text style={[styles.dropdownTriggerText, selectedDistrict && { color: '#000000', fontWeight: 'bold' }]}>
                    {selectedDistrict ? selectedDistrict.name : "Chọn Quận / Huyện"}
                  </Text>
                  <Ionicons name={openDropdown === 'district' ? "chevron-up" : "chevron-down"} size={16} color="#808080" />
                </TouchableOpacity>

                {/* Inline District List */}
                {openDropdown === 'district' && (
                  <View style={styles.inlineDropdown}>
                    <View style={styles.inlineSearchBox}>
                      <Ionicons name="search" size={14} color="#808080" style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.inlineSearchInput}
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {districts
                        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(item => (
                          <TouchableOpacity
                            key={item.code.toString()}
                            style={styles.inlineDropdownItem}
                            onPress={() => {
                              handleDistrictSelect(item);
                              setOpenDropdown('');
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownItemText,
                              selectedDistrict?.code === item.code && { color: '#E51E25', fontWeight: '900' }
                            ]}>
                              {item.name}
                            </Text>
                            {selectedDistrict?.code === item.code && (
                              <Ionicons name="checkmark" size={16} color="#E51E25" />
                            )}
                          </TouchableOpacity>
                        ))
                      }
                    </ScrollView>
                  </View>
                )}

                {/* Dropdown Ward selector */}
                <TouchableOpacity 
                  style={[
                    styles.dropdownTrigger,
                    openDropdown === 'ward' && styles.dropdownTriggerOpen
                  ]} 
                  onPress={() => openSelectModal('ward')}
                >
                  <Text style={[styles.dropdownTriggerText, selectedWard && { color: '#000000', fontWeight: 'bold' }]}>
                    {selectedWard ? selectedWard.name : "Chọn Phường / Xã"}
                  </Text>
                  <Ionicons name={openDropdown === 'ward' ? "chevron-up" : "chevron-down"} size={16} color="#808080" />
                </TouchableOpacity>

                {/* Inline Ward List */}
                {openDropdown === 'ward' && (
                  <View style={styles.inlineDropdown}>
                    <View style={styles.inlineSearchBox}>
                      <Ionicons name="search" size={14} color="#808080" style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.inlineSearchInput}
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {wards
                        .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item, index) => (
                          <TouchableOpacity
                            key={item.code ? item.code.toString() : index.toString()}
                            style={styles.inlineDropdownItem}
                            onPress={() => {
                              setSelectedWard(item);
                              setOpenDropdown('');
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownItemText,
                              selectedWard?.code === item.code && { color: '#E51E25', fontWeight: '900' }
                            ]}>
                              {item.name}
                            </Text>
                            {selectedWard?.code === item.code && (
                              <Ionicons name="checkmark" size={16} color="#E51E25" />
                            )}
                          </TouchableOpacity>
                        ))
                      }
                    </ScrollView>
                  </View>
                )}

                <TextInput
                  style={styles.formInput}
                  placeholder="Số nhà, tên đường, ngõ ngách..."
                  value={specificAddress}
                  onChangeText={setSpecificAddress}
                />
              </View>

              {/* Voucher Selector Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>3. Chọn Mã giảm giá (Voucher)</Text>
                
                {/* Custom Voucher Input Box */}
                <View style={styles.voucherInputRow}>
                  <View style={styles.voucherInputContainer}>
                    <MaterialCommunityIcons name="ticket-percent-outline" size={20} color="#808080" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.voucherInput}
                      placeholder="Nhập mã giảm giá..."
                      placeholderTextColor="#808080"
                      value={inputVoucherCode}
                      onChangeText={(text) => setInputVoucherCode(text.toUpperCase())}
                      autoCapitalize="characters"
                    />
                    {inputVoucherCode.length > 0 && (
                      <TouchableOpacity onPress={() => setInputVoucherCode('')} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={18} color="#808080" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.applyVoucherBtn, !inputVoucherCode.trim() && styles.applyVoucherBtnDisabled]}
                    onPress={handleApplyCustomVoucher}
                    disabled={!inputVoucherCode.trim() || applyingVoucher}
                  >
                    {applyingVoucher ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyVoucherBtnText}>ÁP DỤNG</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {appliedVoucher && (
                  <View style={styles.currentAppliedBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <Ionicons name="checkmark-circle" size={20} color="#2E7D32" style={{ marginRight: 6 }} />
                      <Text style={styles.currentAppliedText} numberOfLines={1}>
                        Đang dùng: <Text style={{ fontWeight: 'bold' }}>{appliedVoucher.code}</Text> (-{formatVND(getVoucherDiscount())})
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { setAppliedVoucher(null); showToast("Đã hủy áp dụng mã giảm giá"); }}>
                      <Text style={styles.removeVoucherText}>Bỏ chọn</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.formSectionSubInfo}>Danh sách mã giảm giá khả dụng cho bạn:</Text>
                
                {vouchersLoading ? (
                  <ActivityIndicator size="small" color="#E51E25" style={{ marginVertical: 15 }} />
                ) : (
                  vouchers.filter(voucher => userPoints >= (voucher.minPoints || 0)).map((voucher) => {
                    const isUnlocked = userPoints >= (voucher.minPoints || 0);
                    const isApplied = appliedVoucher?.code === voucher.code;

                    return (
                      <TouchableOpacity
                        key={voucher.code}
                        style={[
                          styles.voucherCard,
                          !isUnlocked && styles.voucherCardLocked,
                          isApplied && styles.voucherCardApplied
                        ]}
                        onPress={() => selectVoucher(voucher)}
                        activeOpacity={isUnlocked ? 0.7 : 1}
                      >
                        <View style={styles.voucherCardLeft}>
                          <MaterialCommunityIcons 
                            name={isUnlocked ? "ticket-percent" : "ticket-lock"} 
                            size={24} 
                            color={isApplied ? "#2E7D32" : (isUnlocked ? "#E51E25" : "#808080")} 
                          />
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={[styles.voucherCode, !isUnlocked && { color: '#808080' }]}>
                              {voucher.code}
                            </Text>
                            <Text style={styles.voucherDesc}>{voucher.desc}</Text>
                            <Text style={styles.voucherReqText}>Yêu cầu: {voucher.rankName || 'Mọi hạng thành viên'}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.voucherCardRight}>
                          {isApplied ? (
                            <View style={styles.applyIndicatorActive}>
                              <Text style={styles.applyIndicatorActiveText}>ĐANG DÙNG</Text>
                            </View>
                          ) : (
                            <View style={[styles.applyIndicator, !isUnlocked && styles.applyIndicatorLocked]}>
                              <Text style={[styles.applyIndicatorText, !isUnlocked && { color: '#808080' }]}>
                                {isUnlocked ? "CHỌN" : "KHÓA"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Payment Methods Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>4. Phương thức thanh toán</Text>
                
                {/* Option 1: COD */}
                <TouchableOpacity 
                  style={[styles.payOption, paymentMethod === 'COD' && styles.payOptionActive]} 
                  onPress={() => setPaymentMethod('COD')}
                >
                  <MaterialCommunityIcons 
                    name={paymentMethod === 'COD' ? "radiobox-marked" : "radiobox-blank"} 
                    size={20} 
                    color={paymentMethod === 'COD' ? "#E51E25" : "#808080"} 
                    style={{ marginRight: 12 }}
                  />
                  <View>
                    <Text style={styles.payOptionText}>Thanh toán khi nhận hàng (COD)</Text>
                    <Text style={styles.payOptionSub}>Nhận hàng và kiểm tra trước khi trả tiền</Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Bank Transfer (PayOS) */}
                <TouchableOpacity 
                  style={[styles.payOption, paymentMethod === 'BANK' && styles.payOptionActive]} 
                  onPress={() => setPaymentMethod('BANK')}
                >
                  <MaterialCommunityIcons 
                    name={paymentMethod === 'BANK' ? "radiobox-marked" : "radiobox-blank"} 
                    size={20} 
                    color={paymentMethod === 'BANK' ? "#E51E25" : "#808080"} 
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payOptionText}>Chuyển khoản QR (PayOS)</Text>
                    <Text style={styles.payOptionSub}>Quét mã QR tự động & Bảo mật tuyệt đối</Text>
                  </View>
                </TouchableOpacity>

                {paymentMethod === 'BANK' && (
                  <View style={styles.bankDetailContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <MaterialCommunityIcons name="shield-check" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
                      <Text style={[styles.bankDetailTitle, { color: '#2E7D32', marginBottom: 0 }]}>CỔNG THANH TOÁN TỰ ĐỘNG PAYOS</Text>
                    </View>
                    <Text style={styles.bankDetailText}>• <Text style={{ fontWeight: 'bold' }}>Quét mã QR:</Text> Tự động điền chính xác số tiền và nội dung đơn hàng.</Text>
                    <Text style={styles.bankDetailText}>• <Text style={{ fontWeight: 'bold' }}>Hỗ trợ:</Text> Tất cả Ngân hàng (MB, VCB, Techcombank, ACB...) & MoMo, ZaloPay, VietQR.</Text>
                    <Text style={styles.bankDetailText}>• <Text style={{ fontWeight: 'bold', color: '#E51E25' }}>Lưu ý:</Text> Sau khi nhấn <Text style={{ fontWeight: 'bold' }}>Xác nhận đặt hàng</Text>, ứng dụng sẽ tự động mở cổng thanh toán PayOS để bạn quét mã hoàn tất.</Text>
                  </View>
                )}
              </View>

              {/* Order Breakdown Section */}
              <View style={styles.orderSummarySection}>
                <Text style={styles.formSectionTitle}>Chi tiết hóa đơn</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tiền hàng</Text>
                  <Text style={styles.summaryValue}>{formatVND(totalAmount)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                  <Text style={styles.summaryValue}>{formatVND(shippingFee)}</Text>
                </View>

                {appliedVoucher && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#E51E25' }]}>Khấu trừ Voucher ({appliedVoucher.code})</Text>
                    <Text style={[styles.summaryValue, { color: '#E51E25' }]}>-{formatVND(getVoucherDiscount())}</Text>
                  </View>
                )}

                <View style={styles.summaryDivider} />

                <View style={[styles.summaryRow, { marginTop: 10 }]}>
                  <Text style={styles.summaryTotalLabel}>Tổng số tiền cần thanh toán</Text>
                  <Text style={styles.summaryTotalValue}>{formatVND(finalTotalAmount)}</Text>
                </View>
              </View>

              {/* Submit Order Button */}
              <TouchableOpacity style={styles.submitOrderBtn} onPress={submitCheckout} activeOpacity={0.8}>
                <Text style={styles.submitOrderBtnText}>XÁC NHẬN ĐẶT HÀNG</Text>
                <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

            </ScrollView>
            <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
      <LoginPromptSheet
        visible={loginPromptVisible}
        message="Bạn cần đăng nhập để tiến hành đặt hàng."
        onDismiss={() => setLoginPromptVisible(false)}
        onLogin={() => {
          setLoginPromptVisible(false);
          navigation.navigate('Login');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  circleHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navHeaderTitle: {
    color: '#000000',
    fontWeight: '950',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  exploreBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Cart List Item
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
  },
  cartItemImage: {
    width: 75,
    height: 75,
    borderRadius: 14,
    backgroundColor: '#FAF9FB',
  },
  cartItemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cartItemBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: '#808080',
    textTransform: 'uppercase',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  cartItemSpecs: {
    fontSize: 10,
    color: '#808080',
    marginTop: 3,
    fontWeight: '500',
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E51E25',
    marginTop: 5,
  },
  cartItemActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#FAF9FB',
  },
  cartActionBtn: {
    padding: 6,
  },
  cartQtyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginVertical: 2,
  },

  // Billing summary section
  billingSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#EAEAEA',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  billingLabel: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '500',
  },
  billingValue: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E51E25',
  },
  checkoutBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#FAF9FB',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  rankBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  rankBadgeText: {
    fontSize: 12,
    color: '#7B5700',
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 22,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formSectionSubInfo: {
    fontSize: 11,
    color: '#606060',
    marginBottom: 10,
    fontWeight: '500',
  },
  formInput: {
    height: 46,
    backgroundColor: '#FAF9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 10,
  },
  dropdownTrigger: {
    height: 46,
    backgroundColor: '#FAF9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownTriggerOpen: {
    borderColor: '#E51E25',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownTriggerText: {
    fontSize: 13,
    color: '#808080',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  inlineDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E51E25',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  inlineSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    height: 32,
  },
  inlineDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#F5F5F5',
  },
  inlineDropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },

  // Custom Voucher Input Box
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voucherInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    height: 46,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  voucherInput: {
    flex: 1,
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  applyVoucherBtn: {
    backgroundColor: '#E51E25',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyVoucherBtnDisabled: {
    backgroundColor: '#C0C0C0',
  },
  applyVoucherBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  currentAppliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  currentAppliedText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  removeVoucherText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E51E25',
    textDecorationLine: 'underline',
  },

  // Voucher Cards list design
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  voucherCardLocked: {
    backgroundColor: '#F8F8FA',
    opacity: 0.6,
  },
  voucherCardApplied: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F9F1',
  },
  voucherCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  voucherCode: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E51E25',
  },
  voucherDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  voucherReqText: {
    fontSize: 9,
    color: '#808080',
    fontWeight: '600',
    marginTop: 2,
  },
  voucherCardRight: {
    alignItems: 'flex-end',
  },
  applyIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
  },
  applyIndicatorLocked: {
    backgroundColor: '#EAEAEA',
  },
  applyIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  applyIndicatorActive: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  applyIndicatorActiveText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  // Payment Options
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  payOptionActive: {
    borderColor: '#E51E25',
    backgroundColor: '#FFF8F8',
  },
  payOptionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  payOptionSub: {
    fontSize: 10,
    color: '#808080',
    marginTop: 2,
    fontWeight: '500',
  },
  bankDetailContainer: {
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginLeft: 10,
  },
  bankDetailTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#808080',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bankDetailText: {
    fontSize: 12,
    color: '#404040',
    marginVertical: 2,
  },

  // Billing breakdown summary
  orderSummarySection: {
    backgroundColor: '#FAF9FB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 10,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E51E25',
  },

  submitOrderBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  submitOrderBtnText: {
    color: '#FFFFFF',
    fontWeight: '850',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Overlay lists for selection
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.65,
    padding: 20,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  overlaySearchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    alignItems: 'center',
    marginBottom: 15,
  },
  overlaySearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  overlayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F8F8FA',
    paddingHorizontal: 4,
  },
  overlayItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  }
});
