import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Modal,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import Header from '../components/Header';
import { API_BASE_URL } from '../config';
import Toast from '../components/Toast';

const { width } = Dimensions.get('window');
const API_TIMEOUT = 4000;

const MOCK_PRODUCTS = [
  {
    id: 101,
    productName: "Air Jordan 1 Low 'Shadow'",
    brandName: "Jordan",
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80",
    price: 3890000,
  },
  {
    id: 102,
    productName: "Nike Air Max Plus 'Volt'",
    brandName: "Nike",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    price: 4890000,
  },
  {
    id: 103,
    productName: "Yeezy Boost 350 V2 'Carbon'",
    brandName: "Yeezy",
    imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80",
    price: 6500000,
  },
  {
    id: 104,
    productName: "Adidas NMD R1 V2 Streetwear",
    brandName: "Adidas",
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
    price: 3450000,
  },
  {
    id: 105,
    productName: "Puma RS-X Reinvention",
    brandName: "Puma",
    imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
    price: 2990000,
  },
  {
    id: 106,
    productName: "Nike Dunk Low Retro 'Panda'",
    brandName: "Nike",
    imageUrl: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&auto=format&fit=crop&q=80",
    price: 3200000,
  }
];

export default function HomeScreen({ navigation }) {
  const { favorites, toggleFavorite, cartCount } = useContext(CartContext);
  const isFocused = useIsFocused();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isOnline, setIsOnline] = useState(false);
  const [userName, setUserName] = useState('Khách hàng');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);



  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userAccount');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.full_name) {
            setUserName(user.full_name);
            setIsLoggedIn(true);
            return;
          }
        }
        setUserName('Khách hàng');
        setIsLoggedIn(false);
      } catch (e) {
        console.log("Error loading user info", e);
      }
    };
    if (isFocused) {
      getUserData();
      setActiveTab('Home');
    }
  }, [isFocused]);


  // Format Image URL helper
  const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Fetch Products API call
  const fetchProducts = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          setIsOnline(true);
        } else {
          setProducts(MOCK_PRODUCTS);
          setIsOnline(false);
        }
      } else {
        throw new Error('API Error response');
      }
    } catch (error) {
      console.warn("Could not connect to API, using backup mock data:", error.message);
      setProducts(MOCK_PRODUCTS);
      setIsOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const brands = new Set(products.map(p => p.brandName));
    return ['Tất cả', ...Array.from(brands)];
  }, [products]);

  // Filtered products with search query and category brand selection
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. Search Query Match
      const matchSearch = product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.brandName.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category selection from brand scroll list
      const matchCategory = selectedCategory === 'Tất cả' || product.brandName === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const formatVND = (num) => {
    if (!num) return 'Liên hệ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Reusable Header Component */}
      <Header
        userName={userName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        favoritesCount={favorites.length}
        cartCount={cartCount}
        onFavoritesPress={() => navigation.navigate('Favorites')}
        onCartPress={() => navigation.navigate('Cart')}
      />

      {/* API STATUS BAR INDICATOR */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>Chế độ Demo (Offline) • Kiểm tra kết nối tới IP backend</Text>
        </View>
      )}

      {/* MAIN CONTAINER */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E51E25"
            colors={["#E51E25"]}
          />
        }
      >

        {/* CATEGORIES */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionHeading}>Thương Hiệu</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categoriesList.map((cat, index) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryCardText, isActive && styles.categoryCardTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ALL PRODUCTS */}
        <View style={styles.gridHeader}>
          <Text style={styles.sectionHeading}>
            {selectedCategory === 'Tất cả' ? 'Tất cả sản phẩm' : `Sản phẩm ${selectedCategory}`}
          </Text>
          <Text style={styles.gridCount}>{filteredProducts.length} mẫu</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#E51E25" />
            <Text style={styles.loadingText}>Đang tải kho sneaker cực chất...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="shoe-sneaker" size={60} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Không tìm thấy mẫu nào!</Text>
            <Text style={styles.emptySubtitle}>Hãy thử từ khóa khác hoặc làm mới danh mục.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
              <Text style={styles.retryText}>Làm mới danh sách</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.gridContainer}>
              {paginatedProducts.map((item) => {
                const isFav = favorites.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridCard}
                    onPress={() => navigation.navigate('Detail', { productId: item.id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.gridCardImageWrapper}>
                      <Image
                        source={{ uri: formatImageUrl(item.imageUrl) }}
                        style={styles.gridCardImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.gridFavoriteBtn}
                        onPress={() => toggleFavorite(item.id)}
                      >
                        <Ionicons
                          name={isFav ? "heart" : "heart-outline"}
                          size={16}
                          color={isFav ? "#E51E25" : "#606060"}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.gridCardContent}>
                      <Text style={styles.gridCardBrand}>{item.brandName}</Text>
                      <Text style={styles.gridCardTitle} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <View style={styles.gridCardFooter}>
                        <Text style={styles.gridCardPrice}>
                          {formatVND(item.price)}
                        </Text>
                        <View style={styles.actionArrow}>
                          <Feather name="chevron-right" size={14} color="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#C0C0C0' : '#E51E25'} />
                </TouchableOpacity>

                <View style={styles.pageNumberContainer}>
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[styles.pageNumberBtn, isCurrent && styles.pageNumberBtnActive]}
                        onPress={() => setCurrentPage(pageNum)}
                      >
                        <Text style={[styles.pageNumberText, isCurrent && styles.pageNumberTextActive]}>
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#C0C0C0' : '#E51E25'} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FLOATING CHATBOT BUTTON */}
      <TouchableOpacity 
        style={styles.floatingChatBtn} 
        onPress={() => navigation.navigate('Chat')}
        activeOpacity={0.9}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
      </TouchableOpacity>



      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  headerSub: {
    fontSize: 9,
    color: '#808080',
    letterSpacing: 2,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    marginTop: 2,
  },
  logoRed: {
    color: '#E51E25',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF9FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  offlineBanner: {
    backgroundColor: '#FF8C00',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAF9FB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: '600',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  categoryScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  categoryCard: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FAF9FB',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  categoryCardActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  categoryCardText: {
    color: '#808080',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryCardTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  gridCount: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 36) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
  },
  gridCardImageWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#FAF9FB',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
  },
  gridFavoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  gridCardContent: {
    padding: 12,
  },
  gridCardBrand: {
    color: '#808080',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gridCardTitle: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    marginVertical: 3,
  },
  gridCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  gridCardPrice: {
    color: '#E51E25',
    fontWeight: '800',
    fontSize: 13,
  },
  loadingState: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#808080',
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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

  floatingChatBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 999,
  },
  actionArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  pageBtnDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EAEAEA',
  },
  pageNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  pageNumberBtnActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  pageNumberText: {
    fontSize: 12,
    color: '#808080',
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
});
