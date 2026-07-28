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
  FlatList,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import { API_BASE_URL } from '../config';

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

export default function ShopScreen({ navigation }) {
  const { favorites, toggleFavorite } = useContext(CartContext);
  const isFocused = useIsFocused();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Tất cả');
  const [selectedPriceRange, setSelectedPriceRange] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('Mặc định'); // 'Mặc định' | 'Giá tăng' | 'Giá giảm'
  const [userName, setUserName] = useState('Khách hàng');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Shop');

  // Load User Data
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
      setActiveTab('Shop');
    }
  }, [isFocused]);


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
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } else {
        throw new Error('API Error response');
      }
    } catch (error) {
      console.warn("Could not connect to API, using backup mock data:", error.message);
      setProducts(MOCK_PRODUCTS);
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

  // Get brands dynamically from products list
  const brandsList = useMemo(() => {
    const brands = new Set(products.map(p => p.brandName));
    return ['Tất cả', ...Array.from(brands)];
  }, [products]);

  // Format Image URL helper
  const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatVND = (num) => {
    if (!num) return 'Liên hệ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  // Filtering & Sorting Logic
  const processedProducts = useMemo(() => {
    let result = [...products];

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.productName.toLowerCase().includes(query) || 
        p.brandName.toLowerCase().includes(query)
      );
    }

    // 2. Filter by Brand
    if (selectedBrand !== 'Tất cả') {
      result = result.filter(p => p.brandName === selectedBrand);
    }

    // 3. Filter by Price Range
    if (selectedPriceRange !== 'Tất cả') {
      if (selectedPriceRange === 'Dưới 3tr') {
        result = result.filter(p => p.price < 3000000);
      } else if (selectedPriceRange === '3tr - 5tr') {
        result = result.filter(p => p.price >= 3000000 && p.price <= 5000000);
      } else if (selectedPriceRange === 'Trên 5tr') {
        result = result.filter(p => p.price > 5000000);
      }
    }

    // 4. Sort
    if (sortBy === 'Giá tăng') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Giá giảm') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, searchQuery, selectedBrand, selectedPriceRange, sortBy]);

  // Render Product Card
  const renderProductItem = ({ item }) => {
    const isFav = favorites.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigation.navigate('Detail', { productId: item.id, product: item })}
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>KHÁM PHÁ BỘ SƯU TẬP</Text>
          <Text style={styles.headerTitle}>Cửa Hàng Sneaker</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#808080" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc hãng giày..."
            placeholderTextColor="#808080"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#808080" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* HORIZONTAL FILTERS & SORT */}
      <View style={styles.filtersSection}>
        {/* Brand Scroll */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Thương hiệu:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {brandsList.map((brand, idx) => {
              const isActive = selectedBrand === brand;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.badge, isActive && styles.badgeActive]}
                  onPress={() => setSelectedBrand(brand)}
                >
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Price Ranges Scroll */}
        <View style={[styles.filterRow, { marginTop: 8 }]}>
          <Text style={styles.filterLabel}>Khoảng giá:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['Tất cả', 'Dưới 3tr', '3tr - 5tr', 'Trên 5tr'].map((range, idx) => {
              const isActive = selectedPriceRange === range;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.badge, isActive && styles.badgeActive]}
                  onPress={() => setSelectedPriceRange(range)}
                >
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sorting Tags */}
        <View style={[styles.filterRow, { marginTop: 8 }]}>
          <Text style={styles.filterLabel}>Sắp xếp:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['Mặc định', 'Giá tăng', 'Giá giảm'].map((sortTag, idx) => {
              const isActive = sortBy === sortTag;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sortBadge, isActive && styles.sortBadgeActive]}
                  onPress={() => setSortBy(sortTag)}
                >
                  <Ionicons 
                    name={sortTag === 'Giá tăng' ? 'trending-up-outline' : sortTag === 'Giá giảm' ? 'trending-down-outline' : 'funnel-outline'} 
                    size={12} 
                    color={isActive ? '#FFFFFF' : '#8E8E9F'} 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.sortBadgeText, isActive && styles.sortBadgeTextActive]}>
                    {sortTag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* PRODUCTS GRID */}
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#E51E25" />
          <Text style={styles.stateText}>Đang tải danh mục giày sneaker...</Text>
        </View>
      ) : processedProducts.length === 0 ? (
        <View style={styles.centeredState}>
          <MaterialCommunityIcons name="shoe-sneaker" size={70} color="#C0C0C0" />
          <Text style={styles.emptyTitle}>Không tìm thấy mẫu nào!</Text>
          <Text style={styles.emptySubtitle}>Hãy thay đổi bộ lọc hoặc từ khóa tìm kiếm.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryText}>Làm mới danh sách</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={processedProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
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
    paddingBottom: 10,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#808080',
    letterSpacing: 2,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FAF9FB',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 46,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    paddingBottom: 15,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#404040',
    width: 80,
  },
  filterScroll: {
    paddingRight: 20,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginRight: 8,
  },
  badgeActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#808080',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  sortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginRight: 8,
  },
  sortBadgeActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  sortBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E9F',
  },
  sortBadgeTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 85, // clear the absolute footer
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
  },
  gridCardImageWrapper: {
    width: '100%',
    height: 130,
    position: 'relative',
    backgroundColor: '#FAF9FB',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
  },
  gridFavoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
    fontSize: 12,
    marginVertical: 2,
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
    fontSize: 12,
  },
  actionArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  stateText: {
    color: '#808080',
    marginTop: 12,
    fontSize: 13,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 16,
  },
  retryText: {
    color: '#E51E25',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
