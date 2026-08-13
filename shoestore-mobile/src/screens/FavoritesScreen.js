import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
const API_TIMEOUT = 4000;

export default function FavoritesScreen({ navigation }) {
  const { favorites, toggleFavorite } = useContext(CartContext);
  const [allProducts, setAllProducts] = useState([]);

  // Fetch products so we can filter and match favorites list
  const fetchAllProducts = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAllProducts(data);
          return;
        }
      }
      throw new Error();
    } catch {
      setAllProducts([]);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatVND = (num) => {
    if (!num) return '0 đ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  const favoriteProducts = allProducts.filter(p => favorites.includes(p.id));

  return (
    <SafeAreaView style={styles.container}>
      {/* CUSTOM NAV HEADER */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.circleHeaderBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.navHeaderTitle}>Danh Sách Yêu Thích</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1 }}>
        {favoriteProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#C0C0C0" />
            <Text style={styles.emptyTitle}>Chưa có đôi giày yêu thích nào!</Text>
            <Text style={styles.emptySubtitle}>Hãy bấm vào biểu tượng trái tim để lưu lại các mẫu cực chất nhé.</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.exploreBtnText}>Quay lại xem giày</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favoriteProducts}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.favItem}
                onPress={() => navigation.navigate('Detail', { productId: item.id, product: item })}
              >
                <Image source={{ uri: formatImageUrl(item.imageUrl) }} style={styles.favItemImage} />
                <View style={styles.favItemDetails}>
                  <Text style={styles.favItemBrand}>{item.brandName}</Text>
                  <Text style={styles.favItemName} numberOfLines={1}>{item.productName}</Text>
                  <Text style={styles.favItemPrice}>{formatVND(item.price)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite(item.id)}
                  style={styles.trashBtn}
                >
                  <Ionicons name="trash-outline" size={22} color="#E51E25" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    color: '#000000',
    fontSize: 18,
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
  exploreBtn: {
    backgroundColor: '#E51E25',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 24,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  favItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
  },
  favItemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#FAF9FB',
  },
  favItemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  favItemBrand: {
    color: '#E51E25',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  favItemName: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
    marginVertical: 1,
  },
  favItemPrice: {
    color: '#E51E25',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trashBtn: {
    padding: 8,
  }
});
