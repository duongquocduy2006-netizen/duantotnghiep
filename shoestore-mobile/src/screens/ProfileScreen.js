import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartContext } from '../context/CartContext';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import { API_BASE_URL } from '../config';

const mapStatusIntToString = (statusInt) => {
  switch (statusInt) {
    case 1: return 'Đang xử lý';
    case 2: return 'Đang giao hàng';
    case 3: return 'Hoàn thành';
    case 4: return 'Đã hủy';
    case 5: return 'Đã giao hàng';
    default: return 'Đang xử lý';
  }
};

const { width, height } = Dimensions.get('window');

const normalizeImagePath = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/images/')) return url;
  return `/images/${url}`;
};

export default function ProfileScreen({ navigation }) {
  const { addToCart } = useContext(CartContext);
  const isFocused = useIsFocused();
  const [userName, setUserName] = useState('Khách hàng');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Profile');

  // Modals Visibility
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [vouchersModalVisible, setVouchersModalVisible] = useState(false);

  // Info Modal states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [refreshingOrders, setRefreshingOrders] = useState(false);

  // Cancel Order Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [selectedReason, setSelectedReason] = useState('Thay đổi ý định');
  const [customReasonText, setCustomReasonText] = useState('');

  // Order Details Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Vouchers State (Fetches directly from database)
  const [vouchers, setVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState('ALL'); // 'ALL' | 'DISCOUNT' | 'SHIPPING'

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const fetchVouchers = async () => {
    setVouchersLoading(true);
    try {
      let requestUrl = `${API_BASE_URL}/api/vouchers`;
      const storedUser = await AsyncStorage.getItem('userAccount');

      const response = await fetch(requestUrl, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.vouchers)) {
        const mapped = data.vouchers.map((v, idx) => {
          const rawType = (v.discount_type || v.discountType || 'FIXED').toUpperCase();
          const isPercent = rawType === 'PERCENT';
          const isShipping = rawType === 'SHIPPING';
          const val = v.discount_value != null ? Number(v.discount_value) : (v.discountValue != null ? Number(v.discountValue) : 0);
          const maxDiscount = v.max_discount != null ? Number(v.max_discount) : (v.maxDiscount != null ? Number(v.maxDiscount) : null);
          const minOrderValue = v.min_order_value != null ? Number(v.min_order_value) : (v.minOrderValue != null ? Number(v.minOrderValue) : null);
          const endDate = v.end_date || v.endDate;

          return {
            id: v.id || idx + 1,
            code: v.code || `VOUCHER${idx + 1}`,
            title: v.code === 'WELCOME50K' ? 'Voucher Chào Mừng' : (isPercent ? `Ưu Đãi Giảm ${val}%` : (isShipping ? 'Miễn Phí Giao Hàng' : `Giảm ${formatVND(val)}`)),
            desc: (isPercent 
              ? `Giảm ${val}%${maxDiscount ? ` (Tối đa ${formatVND(maxDiscount)})` : ''}${minOrderValue ? ` cho đơn từ ${formatVND(minOrderValue)}` : ''}` 
              : (isShipping ? 'Miễn phí giao hàng toàn quốc' : `Giảm ngay ${formatVND(val)}${minOrderValue ? ` cho đơn từ ${formatVND(minOrderValue)}` : ''}`))
              + (v.rank_name ? ` • Yêu cầu: Hạng ${v.rank_name}` : ''),
            type: rawType,
            value: val,
            minSpend: minOrderValue ? formatVND(minOrderValue) : '0 đ',
            minPoints: v.min_points != null ? Number(v.min_points) : (v.minPoints != null ? Number(v.minPoints) : 0),
            expiry: endDate ? new Date(endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn',
            brand: 'SHOE STORE',
            color: isPercent ? '#00B4DB' : (isShipping ? '#FFB703' : '#E51E25')
          };
        });
        setVouchers(mapped);
      } else {
        setVouchers([]);
      }
    } catch (e) {
      console.log("Error fetching database vouchers:", e.message);
      setVouchers([]);
    } finally {
      setVouchersLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      fetchVouchers();
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.full_name || 'Khách hàng');
        setUserEmail(user.email || '');
        setUserPhone(user.phone || 'Chưa cập nhật');
        setUserPoints(user.points || 0);
        setIsLoggedIn(true);

        // Pre-fill edit fields
        setEditName(user.full_name || '');
        setEditPhone(user.phone || '');

        // Fetch Orders from backend
        try {
          const response = await fetch(`${API_BASE_URL}/api/orders`, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.status === 401) {
            // Session expired
            await AsyncStorage.removeItem('userAccount');
            await AsyncStorage.removeItem('userOrders');
            setIsLoggedIn(false);
            setOrders([]);
            return;
          }

          const data = await response.json();
          if (response.ok && data.success) {
            const mappedOrders = data.orders.map(o => ({
              id: o.order_code,
              date: (() => {
                try {
                  if (!o.created_at) return '';
                  const dateStr = typeof o.created_at === 'string' ? o.created_at.replace(' ', 'T') : o.created_at;
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return String(o.created_at);
                  return d.toLocaleString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  });
                } catch (err) {
                  return String(o.created_at || '');
                }
              })(),
              status: mapStatusIntToString(o.status),
              items: (o.items || []).map(item => ({
                productName: item.product_name || 'Sản phẩm',
                brandName: item.brand_name || 'Sneaker',
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                size: item.size_name || 'Default',
                color: item.color_name || 'Default',
                imageUrl: normalizeImagePath(item.image_url || o.first_product_image || ''),
                productId: item.product_id || o.first_product_id,
                variantId: item.product_variant_id
              })),
              firstProductId: o.first_product_id,
              isReviewed: (o.is_reviewed || 0) > 0,
              totalAmount: Number(o.final_amount) || 0,
              recipientName: o.receiving_name || '',
              recipientPhone: o.phone_number || '',
              shippingAddress: o.street_detail || '',
              paymentMethod: o.method_name === 'BANK' ? 'Chuyển khoản (PayOS)' : (o.method_name || 'Thanh toán COD'),
              discount: ((Number(o.total_amount) || 0) + (Number(o.shipping_fee) || 0)) - (Number(o.final_amount) || 0),
              voucherCode: o.voucher_code || ''
            }));
            setOrders(mappedOrders);
            await AsyncStorage.setItem('userOrders', JSON.stringify(mappedOrders));
          } else {
            const storedOrders = await AsyncStorage.getItem('userOrders');
            if (storedOrders) setOrders(JSON.parse(storedOrders));
          }
        } catch (fetchErr) {
          console.log("Error fetching orders from backend:", fetchErr);
          const storedOrders = await AsyncStorage.getItem('userOrders');
          if (storedOrders) setOrders(JSON.parse(storedOrders));
        }
      } else {
        setUserName('Khách hàng');
        setUserEmail('');
        setUserPhone('');
        setUserPoints(0);
        setIsLoggedIn(false);
        setOrders([]);
      }
    } catch (e) {
      console.log("Error loading user info", e);
    }
  };

  const refreshOrders = async () => {
    setRefreshingOrders(true);
    try {
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (!storedUser) {
        setOrders([]);
        setRefreshingOrders(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.status === 401) {
        await AsyncStorage.removeItem('userAccount');
        await AsyncStorage.removeItem('userOrders');
        setIsLoggedIn(false);
        setOrders([]);
        showToast("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
        setRefreshingOrders(false);
        return;
      }
      const data = await response.json();
      if (response.ok && data.success) {
        const mappedOrders = data.orders.map(o => ({
          id: o.order_code,
          date: (() => {
            try {
              if (!o.created_at) return '';
              const dateStr = typeof o.created_at === 'string' ? o.created_at.replace(' ', 'T') : o.created_at;
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return String(o.created_at);
              return d.toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              });
            } catch (err) {
              return String(o.created_at || '');
            }
          })(),
          status: mapStatusIntToString(o.status),
          items: (o.items || []).map(item => ({
            productName: item.product_name || 'Sản phẩm',
            brandName: item.brand_name || 'Sneaker',
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            size: item.size_name || 'Default',
            color: item.color_name || 'Default',
            imageUrl: normalizeImagePath(item.image_url || o.first_product_image || ''),
            productId: item.product_id || o.first_product_id,
            variantId: item.product_variant_id
          })),
          firstProductId: o.first_product_id,
          isReviewed: (o.is_reviewed || 0) > 0,
          totalAmount: Number(o.final_amount) || 0,
          recipientName: o.receiving_name || '',
          recipientPhone: o.phone_number || '',
          shippingAddress: o.street_detail || '',
          paymentMethod: o.method_name === 'BANK' ? 'Chuyển khoản (PayOS)' : (o.method_name || 'Thanh toán COD'),
          discount: ((Number(o.total_amount) || 0) + (Number(o.shipping_fee) || 0)) - (Number(o.final_amount) || 0),
          voucherCode: o.voucher_code || ''
        }));
        setOrders(mappedOrders);
        await AsyncStorage.setItem('userOrders', JSON.stringify(mappedOrders));
        showToast("Đã cập nhật danh sách đơn hàng mới nhất!");
      } else {
        showToast(data.message || "Không thể đồng bộ từ máy chủ, đang dùng dữ liệu lưu tạm.");
      }
    } catch (e) {
      console.log("Error refreshing orders:", e);
      showToast("Lỗi kết nối máy chủ, đang hiển thị dữ liệu lưu tạm.");
    } finally {
      setRefreshingOrders(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadUserData();
      setActiveTab('Profile');
    }
  }, [isFocused]);

  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất tài khoản không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đăng xuất", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('userAccount');
            await AsyncStorage.removeItem('userOrders');
            setIsLoggedIn(false);
            setUserName('Khách hàng');
            setUserEmail('');
            setUserPhone('');
            setUserPoints(0);
            setOrders([]);
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  // Save Info (Phone & Password)
  const handleSaveProfileInfo = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);

      // Validate inputs
      if (!editName.trim()) {
        showToast("Họ và tên không được để trống!");
        return;
      }
      if (!editPhone.trim()) {
        showToast("Số điện thoại không được để trống!");
        return;
      }

      // If they are trying to change password
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
          showToast("Vui lòng nhập mật khẩu hiện tại!");
          return;
        }
        if (!newPassword) {
          showToast("Vui lòng nhập mật khẩu mới!");
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast("Mật khẩu mới xác nhận không khớp!");
          return;
        }
        
        // 1. Call API to change password
        const passwordResponse = await fetch(`${API_BASE_URL}/api/profile/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            oldPassword: currentPassword,
            newPassword: newPassword,
            confirmPassword: confirmPassword
          })
        });
        
        const passwordData = await passwordResponse.json();
        if (!passwordResponse.ok || !passwordData.success) {
          showToast(passwordData.message || "Đổi mật khẩu thất bại!");
          return; // Stop here if password change fails
        }
      }

      // 2. Call API to update phone number
      const updateResponse = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fullName: editName.trim(),
          phone: editPhone.trim()
        })
      });
      
      const updateData = await updateResponse.json();
      if (!updateResponse.ok || !updateData.success) {
        showToast(updateData.message || "Cập nhật thông tin thất bại!");
        return;
      }

      // Save to AsyncStorage (sync updated data from server)
      if (updateData.account) {
        await AsyncStorage.setItem('userAccount', JSON.stringify(updateData.account));
      } else {
        user.full_name = editName.trim();
        user.phone = editPhone.trim();
        await AsyncStorage.setItem('userAccount', JSON.stringify(user));
      }
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Reload
      await loadUserData();
      setInfoModalVisible(false);
      showToast("Thông tin tài khoản đã được cập nhật thành công!");
    } catch (e) {
      console.log("Error saving profile info:", e);
      showToast("Không thể lưu thông tin thay đổi do lỗi kết nối.");
    }
  };


  const handleRebuy = (order) => {
    if (!order || !order.items || order.items.length === 0) {
      showToast("Đơn hàng không có sản phẩm để mua lại.");
      return;
    }

    setOrdersModalVisible(false);
    setDetailModalVisible(false);

    let addedCount = 0;
    order.items.forEach(item => {
      if (item.variantId) {
        const mockProduct = {
          id: item.productId,
          productName: item.productName,
          brandName: item.brandName,
          imageUrl: item.imageUrl,
          variants: [{
            id: item.variantId,
            sizeName: item.size,
            colorName: item.color,
            quantity: 10 // Mock stock, will be validated during checkout
          }]
        };
        addToCart(mockProduct, item.size, item.color, item.quantity, item.price);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      showToast("Đã thêm các sản phẩm vào giỏ hàng!");
      navigation.navigate('Cart');
    } else {
      showToast("Không thể mua lại đơn hàng này do thiếu thông tin sản phẩm.");
    }
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    let finalReason = selectedReason;
    if (selectedReason === 'Lý do khác') {
      if (!customReasonText.trim()) {
        showToast("Vui lòng nhập lý do hủy đơn!");
        return;
      }
      finalReason = customReasonText.trim();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ orderCode: orderToCancel.id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast("Đơn hàng đã được hủy thành công!");
        await loadUserData();
        setCancelModalVisible(false);
        setOrderToCancel(null);
        setCustomReasonText('');
        setSelectedReason('Thay đổi ý định');
      } else {
        showToast(data.message || "Không thể hủy đơn hàng.");
      }
    } catch (e) {
      console.log("Error canceling order:", e);
      showToast("Không thể kết nối đến máy chủ để hủy đơn hàng.");
    }
  };

  const handleConfirmReceived = (item) => {
    Alert.alert(
      "Xác nhận đã nhận hàng 📦",
      `Bạn xác nhận đã nhận được đơn hàng #${item.id}? Trạng thái đơn hàng sẽ cập nhật thành Hoàn thành.`,
      [
        { text: "Bỏ qua", style: "cancel" },
        { 
          text: "Xác nhận", 
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/orders/confirm`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ orderCode: item.id })
              });

              const data = await response.json();

              if (response.ok && data.success) {
                showToast("Xác nhận đã nhận hàng thành công!");
                await loadUserData();
              } else {
                showToast(data.message || "Không thể xác nhận đơn hàng.");
              }
            } catch (e) {
              console.log("Error confirming order receipt:", e);
              showToast("Không thể kết nối đến máy chủ.");
            }
          }
        }
      ]
    );
  };

  const handleOpenOrderDetail = (order) => {
    setSelectedOrder(order);
    setOrdersModalVisible(false);
    setTimeout(() => {
      setDetailModalVisible(true);
    }, Platform.OS === 'ios' ? 400 : 100);
  };

  const handleCloseOrderDetail = () => {
    setDetailModalVisible(false);
    setTimeout(() => {
      setOrdersModalVisible(true);
    }, Platform.OS === 'ios' ? 400 : 100);
  };

  const handleOpenReviewModal = (order) => {
    if (detailModalVisible) {
      setDetailModalVisible(false);
    } else {
      setOrdersModalVisible(false);
    }
    setTimeout(() => {
      setReviewTarget({ orderId: order.id, productId: order.firstProductId });
      setReviewRating(5);
      setReviewContent('');
      setReviewModalVisible(true);
    }, Platform.OS === 'ios' ? 400 : 100);
  };

  const handleCloseReviewModal = () => {
    setReviewModalVisible(false);
    setTimeout(() => {
      setOrdersModalVisible(true);
    }, Platform.OS === 'ios' ? 400 : 100);
  };

  const submitReview = async () => {
    if (!reviewContent.trim()) {
      showToast("Vui lòng nhập nội dung đánh giá!");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const bodyParams = `productId=${reviewTarget.productId}&rating=${reviewRating}&content=${encodeURIComponent(reviewContent)}`;
      const response = await fetch(`${API_BASE_URL}/api/reviews/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams
      });
      const data = await response.json();
      if (data.success) {
        showToast("Cảm ơn bạn đã đánh giá sản phẩm!");
        setReviewModalVisible(false);
        refreshOrders();
        setTimeout(() => {
          setOrdersModalVisible(true);
        }, Platform.OS === 'ios' ? 400 : 100);
      } else {
        showToast(data.message || "Lỗi khi gửi đánh giá");
      }
    } catch (e) {
      console.log(e);
      showToast("Lỗi kết nối khi gửi đánh giá");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenCancelModal = (order) => {
    setOrderToCancel(order);
    setSelectedReason('Thay đổi ý định');
    setCustomReasonText('');
    setCancelModalVisible(true);
  };

  const getFirstLetter = (name) => {
    if (!name) return 'K';
    return name.charAt(0).toUpperCase();
  };

  const formatVND = (num) => {
    if (!num) return '0 đ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  const getMemberRankName = (points) => {
    if (points >= 10000) return 'Hạng Kim Cương (Diamond)';
    if (points >= 2000) return 'Hạng Vàng (Gold)';
    if (points >= 500) return 'Hạng Bạc (Silver)';
    return 'Hạng Đồng (Bronze)';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ Sơ Cá Nhân</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoggedIn ? (
          // USER PROFILE VIEW
          <View style={styles.profileContainer}>
            {/* User Card */}
            <View style={styles.userCard}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getFirstLetter(userName)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{userEmail}</Text>
                <Text style={styles.userPhoneText}>SĐT: {userPhone}</Text>
              </View>
            </View>

            {/* Points Section */}
            <View style={styles.pointsCard}>
              <View style={styles.pointsLeft}>
                <MaterialCommunityIcons name="crown" size={24} color="#FFD700" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.pointsTitle}>Hạng thành viên</Text>
                  <Text style={styles.memberClass}>{getMemberRankName(userPoints)}</Text>
                </View>
              </View>
              <View style={styles.pointsRight}>
                <Text style={styles.pointsNumber}>{userPoints}</Text>
                <Text style={styles.pointsLabel}>Điểm tích lũy</Text>
              </View>
            </View>

            {/* Account settings / Option Menu */}
            <View style={styles.menuContainer}>
              <Text style={styles.menuSectionHeader}>TÀI KHOẢN CỦA TÔI</Text>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => setInfoModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: '#E3F2FD' }]}>
                    <Feather name="user" size={18} color="#1E88E5" />
                  </View>
                  <Text style={styles.menuItemText}>Thông tin cá nhân</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#8E8E9F" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setOrdersModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: '#E8F5E9' }]}>
                    <Feather name="shopping-bag" size={18} color="#43A047" />
                  </View>
                  <Text style={styles.menuItemText}>Đơn hàng của tôi</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#8E8E9F" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setVouchersModalVisible(true)}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: '#FFF3E0' }]}>
                    <Feather name="gift" size={18} color="#FB8C00" />
                  </View>
                  <Text style={styles.menuItemText}>Vouchers của tôi</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#8E8E9F" />
              </TouchableOpacity>


            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>ĐĂNG XUẤT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // GUEST / NOT LOGGED IN VIEW
          <View style={styles.guestContainer}>
            <View style={styles.guestGraphic}>
              <MaterialCommunityIcons name="account-circle-outline" size={100} color="#C0C0C0" />
            </View>
            <Text style={styles.guestTitle}>Chào mừng bạn đến với SHOE STORE</Text>
            <Text style={styles.guestSubtitle}>
              Đăng nhập tài khoản thành viên để tận hưởng đặc quyền mua sắm, lưu danh sách yêu thích, tích lũy điểm thưởng và nhận các ưu đãi hấp dẫn dành riêng cho bạn!
            </Text>
            <TouchableOpacity 
              style={styles.loginBtn} 
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>ĐĂNG NHẬP NGAY</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ==================== MODAL 1: THÔNG TIN CÁ NHÂN & ĐỔI MẬT KHẨU ==================== */}
      <Modal
        visible={infoModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Thông Tin Cá Nhân</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>HỌ VÀ TÊN</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nhập họ và tên của bạn"
                />
              </View>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>ĐỊA CHỈ EMAIL</Text>
                <Text style={styles.infoStaticText}>{userEmail}</Text>
              </View>

              {/* Editable Phone */}
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>SỐ ĐIỆN THOẠI</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Nhập số điện thoại của bạn"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalDivider} />

              {/* Change password section */}
              <Text style={styles.sectionSubTitle}>ĐỔI MẬT KHẨU TÀI KHOẢN</Text>
              <Text style={styles.sectionDesc}>Nếu không muốn đổi mật khẩu, vui lòng để trống các ô bên dưới.</Text>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>MẬT KHẨU HIỆN TẠI</Text>
                <TextInput
                  style={styles.modalInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Nhập mật khẩu hiện tại"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>MẬT KHẨU MỚI</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>XÁC NHẬN MẬT KHẨU MỚI</Text>
                <TextInput
                  style={styles.modalInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Xác nhận lại mật khẩu mới"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfileInfo} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>LƯU THAY ĐỔI</Text>
              </TouchableOpacity>
            </ScrollView>
            <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* ==================== MODAL 2: ĐƠN HÀNG CỦA TÔI ==================== */}
      <Modal
        visible={ordersModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setOrdersModalVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setOrdersModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Đơn Hàng Của Tôi</Text>
              <TouchableOpacity
                onPress={refreshOrders}
                style={[styles.modalCloseBtn, { backgroundColor: '#EFEFEF' }]}
              >
                {refreshingOrders ? (
                  <ActivityIndicator size="small" color="#E51E25" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#E51E25" />
                )}
              </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
              <ScrollView
                contentContainerStyle={[styles.emptyContainer, { flexGrow: 1, justifyContent: 'center' }]}
                refreshControl={
                  <RefreshControl refreshing={refreshingOrders} onRefresh={refreshOrders} colors={['#E51E25']} />
                }
              >
                <Ionicons name="cart-outline" size={70} color="#C0C0C0" />
                <Text style={styles.emptyTitle}>Chưa có đơn hàng nào!</Text>
                <Text style={styles.emptySubtitle}>Khi bạn mua sắm và tiến hành thanh toán, đơn hàng sẽ được lưu tại đây.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshOrders}>
                  <Text style={styles.retryText}>Tải lại danh sách</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                  <RefreshControl refreshing={refreshingOrders} onRefresh={refreshOrders} colors={['#E51E25']} />
                }
                renderItem={({ item }) => (
                  <View style={styles.orderCard}>
                    {/* Order Top Info */}
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderIdText}>{item.id}</Text>
                        <Text style={styles.orderDateText}>{item.date}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        item.status === 'Đã hủy' && styles.statusBadgeCancelled,
                        item.status === 'Hoàn thành' && styles.statusBadgeCompleted,
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          item.status === 'Đã hủy' && styles.statusBadgeTextCancelled,
                          item.status === 'Hoàn thành' && styles.statusBadgeTextCompleted,
                        ]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Order Items Preview */}
                    {item.items.map((prod, index) => (
                      <View key={index} style={styles.orderItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderItemName} numberOfLines={1}>{prod.productName}</Text>
                          <Text style={styles.orderItemSpecs}>Size: {prod.size} | Màu: {prod.color} | SL: {prod.quantity}</Text>
                        </View>
                        <Text style={styles.orderItemPrice}>{formatVND(prod.price * prod.quantity)}</Text>
                      </View>
                    ))}

                    {/* Shipping & Payment details */}
                    {(item.recipientName || item.shippingAddress) && (
                      <View style={styles.orderCardAddressSection}>
                        {item.recipientName && (
                          <Text style={styles.orderCardAddressText}>Người nhận: {item.recipientName} ({item.recipientPhone})</Text>
                        )}
                        {item.shippingAddress && (
                          <Text style={styles.orderCardAddressText} numberOfLines={2}>Địa chỉ: {item.shippingAddress}</Text>
                        )}
                        {item.paymentMethod && (
                          <Text style={styles.orderCardAddressText}>Thanh toán: {item.paymentMethod}</Text>
                        )}
                      </View>
                    )}

                    {/* Order Footer Info */}
                    <View style={styles.orderCardFooter}>
                      <Text style={styles.orderTotalLabel}>Tổng thanh toán:</Text>
                      <Text style={styles.orderTotalValue}>{formatVND(item.totalAmount)}</Text>
                    </View>

                    {/* Order Action Buttons */}
                    <View style={styles.orderCardButtonsRow}>
                      <TouchableOpacity 
                        style={styles.orderDetailBtn} 
                        onPress={() => handleOpenOrderDetail(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.orderDetailBtnText}>Xem chi tiết</Text>
                      </TouchableOpacity>
                      {item.status === 'Đang xử lý' && (
                        <TouchableOpacity 
                          style={styles.orderCancelBtn} 
                          onPress={() => handleOpenCancelModal(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.orderCancelBtnText}>Hủy đơn</Text>
                        </TouchableOpacity>
                      )}
                      {item.status === 'Đã giao hàng' && (
                        <TouchableOpacity 
                          style={styles.orderConfirmBtn} 
                          onPress={() => handleConfirmReceived(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.orderConfirmBtnText}>Đã nhận được hàng</Text>
                        </TouchableOpacity>
                      )}
                      {item.status === 'Hoàn thành' && (
                        <>
                          <TouchableOpacity 
                            style={[styles.orderDetailBtn, { backgroundColor: '#0f172a', borderColor: '#0f172a', marginLeft: 8 }]} 
                            onPress={() => handleRebuy(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.orderDetailBtnText, { color: '#fff' }]}>Mua lại</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.orderDetailBtn, { backgroundColor: item.isReviewed ? '#808080' : '#e50914', borderColor: item.isReviewed ? '#808080' : '#e50914', marginLeft: 8 }]} 
                            onPress={() => handleOpenReviewModal(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.orderDetailBtnText, { color: '#fff' }]}>{item.isReviewed ? 'Đánh giá lại' : 'Đánh giá'}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
            <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* ==================== MODAL 4: HỦY ĐƠN HÀNG (CANCELLATION MODAL) ==================== */}
      <Modal
        visible={cancelModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Hủy Đơn Hàng</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E9F" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.dialogScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.dialogSectionTitle}>Vui lòng chọn lý do hủy đơn hàng:</Text>
              
              {[
                "Thay đổi ý định mua hàng",
                "Sai thông tin giao hàng (SĐT, địa chỉ)",
                "Muốn chọn sản phẩm khác (size, màu sắc...)",
                "Tìm thấy giá tốt hơn ở cửa hàng khác",
                "Lý do khác"
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, selectedReason === reason && styles.reasonOptionActive]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <MaterialCommunityIcons 
                    name={selectedReason === reason ? "radiobox-marked" : "radiobox-blank"} 
                    size={20} 
                    color={selectedReason === reason ? "#E51E25" : "#808080"} 
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.reasonOptionText, selectedReason === reason && styles.reasonOptionTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'Lý do khác' && (
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Nhập lý do chi tiết của bạn..."
                  multiline={true}
                  numberOfLines={3}
                  value={customReasonText}
                  onChangeText={setCustomReasonText}
                />
              )}

              <View style={styles.dialogActionRow}>
                <TouchableOpacity 
                  style={styles.dialogCancelBtn} 
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={styles.dialogCancelBtnText}>Quay lại</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dialogConfirmBtn} 
                  onPress={confirmCancelOrder}
                >
                  <Text style={styles.dialogConfirmBtnText}>Xác nhận hủy</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 5: CHI TIẾT ĐƠN HÀNG (ORDER DETAIL MODAL) ==================== */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseOrderDetail}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseOrderDetail} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chi Tiết Đơn Hàng</Text>
              <View style={{ width: 44 }} />
            </View>

            {selectedOrder && (
              <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header Information */}
                <View style={styles.detailHeaderSection}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailOrderId}>{selectedOrder.id}</Text>
                    <Text style={styles.detailOrderDate}>Đặt lúc: {selectedOrder.date}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    selectedOrder.status === 'Đã hủy' && styles.statusBadgeCancelled,
                    selectedOrder.status === 'Hoàn thành' && styles.statusBadgeCompleted,
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      selectedOrder.status === 'Đã hủy' && styles.statusBadgeTextCancelled,
                      selectedOrder.status === 'Hoàn thành' && styles.statusBadgeTextCompleted,
                    ]}>{selectedOrder.status}</Text>
                  </View>
                </View>

                {/* Cancel Reason Display */}
                {selectedOrder.status === 'Đã hủy' && selectedOrder.cancelReason && (
                  <View style={styles.cancelReasonContainer}>
                    <Ionicons name="warning-outline" size={18} color="#E51E25" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cancelReasonTitle}>Lý do hủy đơn:</Text>
                      <Text style={styles.cancelReasonText}>{selectedOrder.cancelReason}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailDivider} />

                {/* Items List */}
                <Text style={styles.detailSectionHeader}>Sản phẩm đặt mua</Text>
                {selectedOrder.items.map((prod, index) => (
                  <View key={index} style={styles.detailItemRow}>
                    <View style={styles.detailItemLeft}>
                      <View style={styles.detailItemIconCircle}>
                        <MaterialCommunityIcons name="shoe-sneaker" size={22} color="#E51E25" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.detailItemName} numberOfLines={1}>{prod.productName}</Text>
                        <Text style={styles.detailItemSpecs}>Brand: {prod.brandName || 'Sneaker'} | Size: {prod.size} | Màu: {prod.color}</Text>
                        <Text style={styles.detailItemQty}>Số lượng: {prod.quantity} × {formatVND(prod.price)}</Text>
                      </View>
                    </View>
                    <Text style={styles.detailItemPrice}>{formatVND(prod.price * prod.quantity)}</Text>
                  </View>
                ))}

                <View style={styles.detailDivider} />

                {/* Delivery Information */}
                <Text style={styles.detailSectionHeader}>Thông tin giao nhận</Text>
                <View style={styles.detailInfoBox}>
                  <View style={styles.detailInfoRow}>
                    <Feather name="user" size={14} color="#808080" style={styles.detailInfoIcon} />
                    <Text style={styles.detailInfoValue}>Người nhận: {selectedOrder.recipientName || userName}</Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Feather name="phone" size={14} color="#808080" style={styles.detailInfoIcon} />
                    <Text style={styles.detailInfoValue}>Điện thoại: {selectedOrder.recipientPhone || userPhone}</Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Feather name="map-pin" size={14} color="#808080" style={styles.detailInfoIcon} />
                    <Text style={styles.detailInfoValue} numberOfLines={3}>Địa chỉ: {selectedOrder.shippingAddress || 'Chưa cập nhật'}</Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Feather name="credit-card" size={14} color="#808080" style={styles.detailInfoIcon} />
                    <Text style={styles.detailInfoValue}>Thanh toán: {selectedOrder.paymentMethod || 'Thanh toán COD'}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                {/* Pricing Summary */}
                <Text style={styles.detailSectionHeader}>Chi tiết hóa đơn</Text>
                <View style={styles.detailSummaryBox}>
                  <View style={styles.detailSummaryRow}>
                    <Text style={styles.detailSummaryLabel}>Tiền hàng</Text>
                    <Text style={styles.detailSummaryValue}>
                      {formatVND(selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                    </Text>
                  </View>
                  <View style={styles.detailSummaryRow}>
                    <Text style={styles.detailSummaryLabel}>Phí vận chuyển</Text>
                    <Text style={styles.detailSummaryValue}>{formatVND(30000)}</Text>
                  </View>
                  {selectedOrder.discount > 0 && (
                    <View style={styles.detailSummaryRow}>
                      <Text style={[styles.detailSummaryLabel, { color: '#E51E25' }]}>
                        Khấu trừ Voucher {selectedOrder.voucherCode ? `(${selectedOrder.voucherCode})` : ''}
                      </Text>
                      <Text style={[styles.detailSummaryValue, { color: '#E51E25' }]}>
                        -{formatVND(selectedOrder.discount)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailSummaryDivider} />
                  <View style={[styles.detailSummaryRow, { marginTop: 6 }]}>
                    <Text style={styles.detailTotalLabel}>Thực tế thanh toán</Text>
                    <Text style={styles.detailTotalValue}>{formatVND(selectedOrder.totalAmount)}</Text>
                  </View>
                </View>

                {/* Actions inside Detail Modal */}
                {selectedOrder.status === 'Đang xử lý' && (
                  <TouchableOpacity 
                    style={[styles.orderCancelBtn, { marginTop: 20, height: 48, justifyContent: 'center', alignItems: 'center', marginLeft: 0 }]} 
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handleOpenCancelModal(selectedOrder), Platform.OS === 'ios' ? 400 : 100); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.orderCancelBtnText, { fontSize: 13 }]}>HỦY ĐƠN HÀNG NÀY</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status === 'Đã giao hàng' && (
                  <TouchableOpacity 
                    style={[styles.orderConfirmBtn, { marginTop: 20, height: 48, justifyContent: 'center', alignItems: 'center', marginLeft: 0 }]} 
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handleConfirmReceived(selectedOrder), Platform.OS === 'ios' ? 400 : 100); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.orderConfirmBtnText, { fontSize: 13 }]}>ĐÃ NHẬN ĐƯỢC HÀNG</Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.status === 'Hoàn thành' && (
                  <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
                    <TouchableOpacity 
                      style={[styles.orderDetailBtn, { flex: 1, height: 48, backgroundColor: '#0f172a', borderColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginRight: 4 }]} 
                      onPress={() => handleRebuy(selectedOrder)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.orderDetailBtnText, { color: '#fff', fontSize: 13 }]}>Mua lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.orderDetailBtn, { flex: 1, height: 48, backgroundColor: selectedOrder.isReviewed ? '#808080' : '#e50914', borderColor: selectedOrder.isReviewed ? '#808080' : '#e50914', justifyContent: 'center', alignItems: 'center', marginLeft: 4 }]} 
                      onPress={() => handleOpenReviewModal(selectedOrder)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.orderDetailBtnText, { color: '#fff', fontSize: 13 }]}>{selectedOrder.isReviewed ? 'Đánh giá lại' : 'Đánh giá đơn hàng'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity 
                  style={[styles.detailCloseBtn, { marginTop: 12 }]} 
                  onPress={handleCloseOrderDetail}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailCloseBtnText}>ĐÓNG CHI TIẾT</Text>
                </TouchableOpacity>

              </ScrollView>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* ==================== MODAL 3: VOUCHERS CỦA TÔI ==================== */}
      <Modal
        visible={vouchersModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setVouchersModalVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setVouchersModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Kho Vouchers Ưu Đãi</Text>
              <TouchableOpacity onPress={fetchVouchers} style={styles.modalCloseBtn}>
                <Ionicons name="refresh" size={20} color="#E51E25" />
              </TouchableOpacity>
            </View>

            {/* Banner Header Section (Web Synced) */}
            <View style={styles.voucherBannerContainer}>
              <View style={styles.voucherBannerContent}>
                <Text style={styles.voucherBannerTitle}>
                  KHO <Text style={{ color: '#E51E25' }}>VOUCHERS</Text> ĐỘC QUYỀN
                </Text>
                <Text style={styles.voucherBannerSubtitle}>
                  Săn ngay mã giảm giá để nhận ưu đãi cực hời từ ShoeStore
                </Text>
              </View>

              {/* Filter Tabs */}
              <View style={styles.voucherFilterRow}>
                <TouchableOpacity
                  style={[styles.voucherFilterTab, voucherFilter === 'ALL' && styles.voucherFilterTabActive]}
                  onPress={() => setVoucherFilter('ALL')}
                >
                  <Text style={[styles.voucherFilterTabText, voucherFilter === 'ALL' && styles.voucherFilterTabTextActive]}>
                    Tất cả ({vouchers.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voucherFilterTab, voucherFilter === 'DISCOUNT' && styles.voucherFilterTabActive]}
                  onPress={() => setVoucherFilter('DISCOUNT')}
                >
                  <Text style={[styles.voucherFilterTabText, voucherFilter === 'DISCOUNT' && styles.voucherFilterTabTextActive]}>
                    Mã giảm giá
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voucherFilterTab, voucherFilter === 'SHIPPING' && styles.voucherFilterTabActive]}
                  onPress={() => setVoucherFilter('SHIPPING')}
                >
                  <Text style={[styles.voucherFilterTabText, voucherFilter === 'SHIPPING' && styles.voucherFilterTabTextActive]}>
                    Freeship 🚚
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Vouchers List */}
            {vouchersLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#E51E25" />
                <Text style={{ marginTop: 12, color: '#808080', fontSize: 13 }}>Đang tải danh sách voucher...</Text>
              </View>
            ) : (
              <FlatList
                data={vouchers.filter(v => {
                  if (voucherFilter === 'DISCOUNT') return v.type !== 'SHIPPING';
                  if (voucherFilter === 'SHIPPING') return v.type === 'SHIPPING';
                  return true;
                })}
                keyExtractor={(item, index) => item.code + index}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="ticket-outline" size={60} color="#C0C0C0" />
                    <Text style={styles.emptyTitle}>Chưa có voucher nào trong danh mục này</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const cardColor = item.color || (item.type === 'PERCENT' ? '#00B4DB' : (item.type === 'SHIPPING' ? '#FFB703' : '#E51E25'));
                  return (
                    <View style={[styles.voucherCineCard, { borderColor: `${cardColor}40` }]}>
                      {/* Left Coupon Notch / Value */}
                      <View style={[styles.voucherCineLeft, { backgroundColor: `${cardColor}15`, borderLeftColor: cardColor }]}>
                        <Text style={[styles.voucherCineVal, { color: cardColor }]}>
                          {item.type === 'PERCENT' 
                            ? `${item.value}%` 
                            : (item.type === 'SHIPPING' ? 'FREE' : `${item.value >= 1000 ? `${item.value / 1000}K` : item.value}`)}
                        </Text>
                        <Text style={styles.voucherCineLbl}>
                          {item.type === 'SHIPPING' ? 'SHIP' : 'OFF'}
                        </Text>
                      </View>

                      {/* Right Details */}
                      <View style={styles.voucherCineRight}>
                        <Text style={[styles.voucherCineBrand, { color: cardColor }]}>
                          {item.brand || 'SHOE STORE'}
                        </Text>
                        <Text style={styles.voucherCineTitle}>{item.title}</Text>
                        <Text style={styles.voucherCineDesc}>{item.desc}</Text>
                        
                        <View style={styles.voucherCineFooter}>
                          <Text style={styles.voucherCineExp}>HSD: {item.expiry}</Text>
                          <View style={styles.voucherCineCodeBox}>
                            <View style={styles.voucherCodeDashed}>
                              <Text style={styles.voucherCodeString}>{item.code}</Text>
                            </View>
                            <TouchableOpacity 
                              style={[styles.voucherCopyBtn, { backgroundColor: cardColor }]} 
                              onPress={() => {
                                showToast(`Đã sao chép mã ${item.code}! Sử dụng khi thanh toán.`);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.voucherCopyBtnText}>SAO CHÉP</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
            <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>


      {/* ==================== MODAL 6: ĐÁNH GIÁ SẢN PHẨM ==================== */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseReviewModal}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseReviewModal} style={styles.modalCloseBtn}>
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Đánh Giá Sản Phẩm</Text>
              <View style={{ width: 44 }} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginVertical: 30 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 15 }}>Bạn cảm thấy sản phẩm này thế nào?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)} style={{ padding: 5 }}>
                      <Ionicons
                        name={star <= reviewRating ? "star" : "star-outline"}
                        size={40}
                        color={star <= reviewRating ? "#FFD700" : "#C0C0C0"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>NỘI DUNG ĐÁNH GIÁ</Text>
                <TextInput
                  style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
                  value={reviewContent}
                  onChangeText={setReviewContent}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này nhé..."
                  multiline={true}
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={submitReview}
                disabled={isSubmittingReview}
                activeOpacity={0.8}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>GỬI ĐÁNH GIÁ</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
            <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 85,
  },
  profileContainer: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    color: '#808080',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  userPhoneText: {
    color: '#606060',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '700',
  },
  pointsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsTitle: {
    color: '#808080',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  memberClass: {
    color: '#E51E25',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  pointsRight: {
    alignItems: 'center',
  },
  pointsNumber: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '900',
  },
  pointsLabel: {
    color: '#808080',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 1,
  },
  menuContainer: {
    marginTop: 25,
  },
  menuSectionHeader: {
    color: '#808080',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FAF9FB',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  guestGraphic: {
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  loginBtn: {
    width: '100%',
    height: 50,
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
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Modal styling
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
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
  },
  modalContent: {
    padding: 20,
  },
  infoGroup: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#808080',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoStaticText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: '#FAF9FB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    backgroundColor: '#FAF9FB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 20,
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E51E25',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#808080',
    fontWeight: '500',
    marginBottom: 15,
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 35,
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Empty State inside Modal
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#808080',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  retryText: {
    color: '#E51E25',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Order List styles
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardAddressSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderCardAddressText: {
    fontSize: 10,
    color: '#606060',
    marginTop: 2,
    fontWeight: '500',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  orderDateText: {
    fontSize: 11,
    color: '#808080',
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FB8C00',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
  },
  orderItemSpecs: {
    fontSize: 10,
    color: '#808080',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E51E25',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    paddingTop: 10,
    marginTop: 10,
  },
  orderTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#808080',
  },
  orderTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E51E25',
  },

  // --- Web Synced Voucher Modal Styles ---
  voucherBannerContainer: {
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  voucherBannerContent: {
    alignItems: 'center',
    marginBottom: 14,
  },
  voucherBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  voucherBannerSubtitle: {
    fontSize: 11,
    color: '#A0A0A0',
    marginTop: 4,
    textAlign: 'center',
  },
  voucherFilterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  voucherFilterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#333333',
  },
  voucherFilterTabActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  voucherFilterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0B0B0',
  },
  voucherFilterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  voucherCineCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  voucherCineLeft: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
  },
  voucherCineVal: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  voucherCineLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#808080',
    marginTop: 2,
    letterSpacing: 1,
  },
  voucherCineRight: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  voucherCineBrand: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  voucherCineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 2,
  },
  voucherCineDesc: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 10,
    lineHeight: 15,
  },
  voucherCineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  voucherCineExp: {
    fontSize: 9,
    color: '#888888',
    fontWeight: '600',
    flex: 1,
  },
  voucherCineCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  voucherCodeDashed: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 5,
    marginRight: 4,
  },
  voucherCodeString: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
  },
  voucherCopyBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherCopyBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusBadgeCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeTextCancelled: {
    color: '#E51E25',
  },
  statusBadgeCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeTextCompleted: {
    color: '#2E7D32',
  },
  orderCardButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  orderDetailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginLeft: 8,
  },
  orderDetailBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  orderCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E51E25',
    marginLeft: 8,
  },
  orderCancelBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E51E25',
  },
  orderConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginLeft: 8,
  },
  orderConfirmBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    paddingBottom: 12,
    marginBottom: 15,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  dialogScrollContent: {
    paddingBottom: 10,
  },
  dialogSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 8,
    backgroundColor: '#FAF9FB',
  },
  reasonOptionActive: {
    borderColor: '#E51E25',
    backgroundColor: '#FFF8F8',
  },
  reasonOptionText: {
    fontSize: 13,
    color: '#606060',
    fontWeight: '500',
    flex: 1,
  },
  reasonOptionTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#000000',
    backgroundColor: '#FAF9FB',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 5,
    marginBottom: 15,
  },
  dialogActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FAF9FB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  dialogCancelBtnText: {
    color: '#808080',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dialogConfirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#E51E25',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  dialogConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailOrderId: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  detailOrderDate: {
    fontSize: 11,
    color: '#808080',
    marginTop: 2,
    fontWeight: '500',
  },
  cancelReasonContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  cancelReasonTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E51E25',
  },
  cancelReasonText: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
    lineHeight: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 18,
  },
  detailSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#808080',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  detailItemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  detailItemSpecs: {
    fontSize: 10,
    color: '#808080',
    marginTop: 2,
  },
  detailItemQty: {
    fontSize: 11,
    color: '#606060',
    marginTop: 2,
    fontWeight: '500',
  },
  detailItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E51E25',
  },
  detailInfoBox: {
    backgroundColor: '#FAF9FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  detailInfoIcon: {
    marginTop: 2,
    marginRight: 10,
    width: 14,
  },
  detailInfoValue: {
    fontSize: 12,
    color: '#404040',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  detailSummaryBox: {
    backgroundColor: '#FAF9FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  detailSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailSummaryLabel: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '500',
  },
  detailSummaryValue: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  detailSummaryDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 8,
  },
  detailTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  detailTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E51E25',
  },
  detailCloseBtn: {
    height: 48,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  detailCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  }
});
