import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  ActivityIndicator
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const { width } = Dimensions.get('window');

export default function NotificationScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchNotificationsData();
    }
  }, [isFocused]);

  const fetchNotificationsData = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (!storedUser) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      
      setIsLoggedIn(true);
      const user = JSON.parse(storedUser);
      const realNotis = [];
      const readNotiIdsStr = await AsyncStorage.getItem('readNotifications');
      const readNotiIds = readNotiIdsStr ? JSON.parse(readNotiIdsStr) : [];

      // 1. Đơn hàng
      try {
        const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
          headers: { 'Accept': 'application/json' }
        });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          if (orderData.success && Array.isArray(orderData.orders)) {
            orderData.orders.forEach(o => {
              let notiTitle = '';
              let notiDesc = '';
              const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.final_amount || 0);

              if (o.status === 1) {
                notiTitle = `Đơn hàng #${o.order_code} đang chờ duyệt`;
                notiDesc = `Đơn hàng trị giá ${amountStr} đã được hệ thống ghi nhận và đang chờ đóng gói.`;
              } else if (o.status === 2) {
                notiTitle = `Đơn hàng #${o.order_code} đang được giao`;
                notiDesc = `Đơn hàng đang trên đường vận chuyển. Hãy chú ý điện thoại nhé!`;
              } else if (o.status === 3) {
                notiTitle = `Đơn hàng #${o.order_code} đã giao thành công`;
                notiDesc = `Giao hàng thành công! Bạn đã tích thêm điểm thành viên cho đơn hàng này.`;
              } else if (o.status === 4) {
                notiTitle = `Đơn hàng #${o.order_code} đã bị hủy`;
                notiDesc = o.cancel_reason ? `Lý do hủy: ${o.cancel_reason}` : `Đơn hàng đã được hủy thành công.`;
              }

              if (notiTitle) {
                const notiId = `order_${o.order_code}_${o.status}`;
                const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : 'Gần đây';
                realNotis.push({
                  id: notiId,
                  type: 'order',
                  title: notiTitle,
                  content: notiDesc,
                  time: dateStr,
                  read: readNotiIds.includes(notiId),
                  image: o.first_product_image,
                  status: o.status,
                  orderCode: o.order_code
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn('Lỗi lấy thông báo đơn hàng', e);
      }

      // 2. Flash Sale
      try {
        const fsRes = await fetch(`${API_BASE_URL}/api/flash-sales/active`, {
          headers: { 'Accept': 'application/json' }
        });
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          if (fsData.success && fsData.campaign) {
            const camp = fsData.campaign;
            const notiId = `fs_${camp.id}`;
            realNotis.push({
              id: notiId,
              type: 'sale',
              title: `Flash Sale: ${camp.name || 'Giờ Vàng Giá Sốc'}`,
              content: `Khung giờ săn deal nảy lửa đang diễn ra. Đừng bỏ lỡ sản phẩm giảm đến 50%!`,
              time: 'Đang diễn ra',
              read: readNotiIds.includes(notiId),
            });
          }
        }
      } catch (e) {
        console.warn('Lỗi lấy thông báo Flash Sale', e);
      }

      // 3. Mã giảm giá
      try {
        const vRes = await fetch(`${API_BASE_URL}/api/vouchers`, {
          headers: { 'Accept': 'application/json' }
        });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.success && Array.isArray(vData.vouchers)) {
            vData.vouchers.forEach(v => {
              const notiId = `voucher_${v.id || v.code}`;
              const discountVal = (v.discount_percent && Number(v.discount_percent) > 0)
                  ? `${v.discount_percent}%`
                  : ((v.discount_amount && Number(v.discount_amount) > 0)
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.discount_amount)
                      : 'đặc biệt');
              realNotis.push({
                id: notiId,
                type: 'promo',
                title: `Mã giảm giá mới: ${v.code}`,
                content: `Ưu đãi giảm ${discountVal} cho đơn hàng mua sắm hôm nay!`,
                time: 'Mã mới',
                read: readNotiIds.includes(notiId),
              });
            });
          }
        }
      } catch (e) {
        console.warn('Lỗi lấy thông báo Vouchers', e);
      }

      // 4. Thành viên
      if (user) {
        const points = user.points !== undefined ? user.points : 0;
        const rankName = user.rank_name || 'Thành Viên';
        const notiId = `member_${user.id || 'usr'}_${points}`;
        const pointsStr = new Intl.NumberFormat('vi-VN').format(points || 0);
        realNotis.push({
          id: notiId,
          type: 'points',
          title: `Hạng thành viên: ${rankName}`,
          content: `Tích lũy hiện tại: ${pointsStr} PTS. Mua sắm thêm để nâng hạng tích ưu đãi!`,
          time: 'Thành viên',
          read: readNotiIds.includes(notiId),
        });
      }

      setNotifications(realNotis);
    } catch (err) {
      console.error("Lỗi lấy thông tin thông báo:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveReadStatus = async (updatedList) => {
    try {
      const readIds = updatedList.filter(n => n.read).map(n => n.id);
      await AsyncStorage.setItem('readNotifications', JSON.stringify(readIds));
    } catch (e) {
      console.warn('Lỗi lưu trạng thái thông báo:', e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotificationsData();
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveReadStatus(updated);
  };

  const handleNotiClick = (item) => {
    const updated = notifications.map(n => {
      if (n.id === item.id) return { ...n, read: true };
      return n;
    });
    setNotifications(updated);
    saveReadStatus(updated);

    if (item.type === 'order') {
      // Navigate to order details if you have one, or profile
      navigation.navigate('Profile');
    } else if (item.type === 'sale') {
      navigation.navigate('Shop'); // Or wherever flash sale is
    } else if (item.type === 'promo') {
      navigation.navigate('Cart');
    } else if (item.type === 'points') {
      navigation.navigate('Profile');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'promo':
        return <Feather name="gift" size={20} color="#1E88E5" />;
      case 'sale':
        return <Ionicons name="flame-outline" size={20} color="#E51E25" />;
      case 'points':
        return <MaterialCommunityIcons name="crown-outline" size={22} color="#FB8C00" />;
      case 'order':
        return <Feather name="shopping-bag" size={18} color="#43A047" />;
      default:
        return <Feather name="bell" size={18} color="#8E8E9F" />;
    }
  };

  const getIconBgColor = (type) => {
    switch (type) {
      case 'promo': return '#E3F2FD';
      case 'sale': return '#FFF5F5';
      case 'points': return '#FFF3E0';
      case 'order': return '#E8F5E9';
      default: return '#FAF9FB';
    }
  };

  const getImageUrl = (url) => {
    if (!url) return 'https://ui-avatars.com/api/?name=SP&background=f1f5f9&color=94a3b8&bold=true';
    if (url.startsWith('http')) return url;
    const prefix = url.startsWith('/') ? '' : '/images/';
    return `${API_BASE_URL}${prefix}${url}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notiItem, !item.read && styles.notiUnread]}
      onPress={() => handleNotiClick(item)}
      activeOpacity={0.7}
    >
      {item.type === 'order' && item.image ? (
        <Image 
          source={{ uri: getImageUrl(item.image) }} 
          style={styles.orderImage} 
        />
      ) : (
        <View style={[styles.iconWrapper, { backgroundColor: getIconBgColor(item.type) }]}>
          {getNotificationIcon(item.type)}
        </View>
      )}
      <View style={styles.notiContent}>
        <View style={styles.notiHeader}>
          <Text style={styles.notiTitle} numberOfLines={1}>{item.title}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notiText}>{item.content}</Text>
        <Text style={styles.notiTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E51E25" />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thông Báo Của Bạn</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={80} color="#C0C0C0" />
          <Text style={styles.emptyTitle}>Bạn chưa đăng nhập!</Text>
          <Text style={styles.emptySubtitle}>Vui lòng đăng nhập để xem danh sách thông báo của bạn.</Text>
          <TouchableOpacity 
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>ĐĂNG NHẬP NGAY</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông Báo Của Bạn</Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markReadText}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* NOTIFICATIONS LIST */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#C0C0C0" />
          <Text style={styles.emptyTitle}>Chưa có thông báo nào!</Text>
          <Text style={styles.emptySubtitle}>Quản lý tất cả các cập nhật đơn hàng, khuyến mãi và thông báo tài khoản tại đây.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E51E25"
              colors={["#E51E25"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  markReadText: {
    color: '#E51E25',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 85,
  },
  notiItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F8F8FA',
    backgroundColor: '#FFFFFF',
  },
  notiUnread: {
    backgroundColor: '#FFF8F8', // soft red highlight for unread
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  orderImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  notiContent: {
    flex: 1,
  },
  notiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E51E25',
  },
  notiText: {
    fontSize: 12,
    color: '#606060',
    lineHeight: 18,
    fontWeight: '500',
  },
  notiTime: {
    fontSize: 10,
    color: '#8E8E9F',
    marginTop: 6,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 85,
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
  },
  loginBtn: {
    marginTop: 20,
    backgroundColor: '#E51E25',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
