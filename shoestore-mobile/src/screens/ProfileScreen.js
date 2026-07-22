import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const MOCK_VOUCHERS = [
  { code: 'NEW10', desc: 'Giảm 10% cho đơn hàng đầu tiên', minSpend: '0 đ', expiry: '31/12/2026' },
  { code: 'FREESHIP', desc: 'Miễn phí vận chuyển toàn quốc', minSpend: '0 đ', expiry: '31/12/2026' },
  { code: 'SHOE200', desc: 'Giảm ngay 200.000 đ cho đơn hàng từ 4.000.000 đ', minSpend: '4.000.000 đ', expiry: '30/09/2026' }
];

export default function ProfileScreen({ navigation }) {
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
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);

  // Cancel Order Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [selectedReason, setSelectedReason] = useState('Thay đổi ý định');
  const [customReasonText, setCustomReasonText] = useState('');

  // Order Details Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const loadUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.full_name || 'Khách hàng');
        setUserEmail(user.email || '');
        setUserPhone(user.phone || 'Chưa cập nhật');
        setUserPoints(user.points || 0);
        setIsLoggedIn(true);

        // Pre-fill edit phone
        setEditPhone(user.phone || '');

        // Fetch Orders from backend
        try {
          const response = await fetch(`${API_BASE_URL}/api/orders`, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.status === 401) {
            // Session expired
            await AsyncStorage.removeItem('userAccount');
            setIsLoggedIn(false);
            setOrders([]);
            return;
          }

          const data = await response.json();
          if (response.ok && data.success) {
            const mappedOrders = data.orders.map(o => ({
              id: o.order_code,
              date: new Date(o.created_at).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }),
              status: mapStatusIntToString(o.status),
              items: (o.items || []).map(item => ({
                productName: item.product_name,
                brandName: item.brand_name || 'Sneaker',
                price: item.price,
                quantity: item.quantity,
                size: item.size_name,
                color: item.color_name,
                imageUrl: item.image_url
              })),
              totalAmount: o.final_amount,
              recipientName: o.receiving_name,
              recipientPhone: o.phone_number,
              shippingAddress: o.street_detail,
              paymentMethod: o.method_name === 'BANK' ? 'Chuyển khoản NH' : (o.method_name || 'Thanh toán COD'),
              discount: (o.total_amount + o.shipping_fee) - o.final_amount,
              voucherCode: o.voucher_code
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
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
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

      // Validate phone number
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
        // Save new password
        user.password = newPassword;
      }

      // Update phone number
      user.phone = editPhone;

      // Save to AsyncStorage
      await AsyncStorage.setItem('userAccount', JSON.stringify(user));
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Reload
      await loadUserData();
      setInfoModalVisible(false);
      showToast("Thông tin tài khoản đã được cập nhật thành công!");
    } catch (e) {
      showToast("Không thể lưu thông tin thay đổi.");
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
    setDetailModalVisible(true);
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
    if (points >= 1000) return 'Hạng Kim Cương (Diamond)';
    if (points >= 500) return 'Hạng Vàng (Gold)';
    if (points >= 100) return 'Hạng Bạc (Silver)';
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

              <TouchableOpacity style={styles.menuItem} onPress={() => showToast("Đường dây nóng hỗ trợ khách hàng SHOE STORE: 1900 1234")}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: '#F3E5F5' }]}>
                    <Feather name="help-circle" size={18} color="#8E24AA" />
                  </View>
                  <Text style={styles.menuItemText}>Hỗ trợ khách hàng</Text>
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
              {/* Display static details */}
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>HỌ VÀ TÊN</Text>
                <Text style={styles.infoStaticText}>{userName}</Text>
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
              <View style={{ width: 44 }} />
            </View>

            {orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cart-outline" size={70} color="#C0C0C0" />
                <Text style={styles.emptyTitle}>Chưa có đơn hàng nào!</Text>
                <Text style={styles.emptySubtitle}>Khi bạn mua sắm và tiến hành thanh toán, đơn hàng sẽ được lưu tại đây.</Text>
              </View>
            ) : (
              <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
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
                          <Text style={styles.orderConfirmBtnText}>Đã nhận hàng</Text>
                        </TouchableOpacity>
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
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.modalCloseBtn}>
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

                {/* Close Button */}
                <TouchableOpacity 
                  style={styles.detailCloseBtn} 
                  onPress={() => setDetailModalVisible(false)}
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
              <Text style={styles.modalTitle}>Vouchers Ưu Đãi</Text>
              <View style={{ width: 44 }} />
            </View>

            <FlatList
              data={MOCK_VOUCHERS}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <View style={styles.voucherCard}>
                  <View style={styles.voucherLeft}>
                    <View style={styles.voucherIconCircle}>
                      <MaterialCommunityIcons name="ticket-percent-outline" size={24} color="#E51E25" />
                    </View>
                  </View>
                  <View style={styles.voucherRight}>
                    <Text style={styles.voucherCodeText}>{item.code}</Text>
                    <Text style={styles.voucherDescText}>{item.desc}</Text>
                    <Text style={styles.voucherExpiryText}>Hạn dùng: {item.expiry}</Text>
                    <TouchableOpacity 
                      style={styles.copyBtn} 
                      onPress={() => {
                        showToast(`Đã sao chép mã ưu đãi ${item.code}!`);
                      }}
                    >
                      <Text style={styles.copyBtnText}>SAO CHÉP MÃ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
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

  // Voucher modal styles
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  voucherLeft: {
    marginRight: 16,
  },
  voucherIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherRight: {
    flex: 1,
  },
  voucherCodeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E51E25',
  },
  voucherDescText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  voucherExpiryText: {
    fontSize: 10,
    color: '#808080',
    marginTop: 4,
    fontWeight: '500',
  },
  copyBtn: {
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E51E25',
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
