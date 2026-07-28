import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'promo',
    title: 'Khuyến mãi chào mừng 🎉',
    content: 'Chào mừng bạn đến với SHOE STORE! Sử dụng mã NEW10 để được giảm ngay 10% cho đơn hàng đầu tiên của bạn.',
    time: '10 phút trước',
    read: false,
  },
  {
    id: '2',
    type: 'sale',
    title: 'Ưu đãi Flash Sale hôm nay 🔥',
    content: 'Giảm giá lên đến 30% cho toàn bộ giày dòng Jordan & Adidas NMD duy nhất ngày hôm nay. Số lượng có hạn!',
    time: '2 giờ trước',
    read: false,
  },
  {
    id: '3',
    type: 'points',
    title: 'Tích lũy điểm thành viên 👑',
    content: 'Bạn vừa nhận được +120 điểm tích lũy thành viên VIP từ hệ thống sau khi tạo tài khoản thành công.',
    time: '1 ngày trước',
    read: true,
  },
  {
    id: '4',
    type: 'shipping',
    title: 'Giao hàng siêu tốc miễn phí 🚚',
    content: 'SHOE STORE hỗ trợ miễn phí vận chuyển toàn quốc cho toàn bộ đơn hàng. Mua sắm cực đã không lo phí ship!',
    time: '3 ngày trước',
    read: true,
  }
];

export default function NotificationScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Notifications');

  useEffect(() => {
    if (isFocused) {
      setActiveTab('Notifications');
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'promo':
        return <Feather name="gift" size={20} color="#1E88E5" />;
      case 'sale':
        return <Ionicons name="flame-outline" size={20} color="#E51E25" />;
      case 'points':
        return <MaterialCommunityIcons name="crown-outline" size={22} color="#FB8C00" />;
      case 'shipping':
        return <Feather name="truck" size={18} color="#43A047" />;
      default:
        return <Feather name="bell" size={18} color="#8E8E9F" />;
    }
  };

  const getIconBgColor = (type) => {
    switch (type) {
      case 'promo': return '#E3F2FD';
      case 'sale': return '#FFF5F5';
      case 'points': return '#FFF3E0';
      case 'shipping': return '#E8F5E9';
      default: return '#FAF9FB';
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.notiItem, !item.read && styles.notiUnread]}>
      <View style={[styles.iconWrapper, { backgroundColor: getIconBgColor(item.type) }]}>
        {getNotificationIcon(item.type)}
      </View>
      <View style={styles.notiContent}>
        <View style={styles.notiHeader}>
          <Text style={styles.notiTitle}>{item.title}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notiText}>{item.content}</Text>
        <Text style={styles.notiTime}>{item.time}</Text>
      </View>
    </View>
  );

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
          <Text style={styles.emptySubtitle}>Ứng dụng sẽ cập nhật thông tin khuyến mãi và trạng thái đơn hàng của bạn tại đây.</Text>
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
  }
});
