import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import Toast from '../components/Toast';
import LoginPromptSheet from '../components/LoginPromptSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_TIMEOUT = 4000;

export default function DetailScreen({ route, navigation }) {
  const initialProduct = route.params?.product || null;
  const productId = route.params?.productId || route.params?.id || initialProduct?.id;
  const { cart, favorites, toggleFavorite, addToCart, cartCount } = useContext(CartContext);

  const [loading, setLoading] = useState(true);
  const [productDetail, setProductDetail] = useState(initialProduct || null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // Login prompt sheet state
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState('');
  const showLoginPrompt = (msg) => {
    setLoginPromptMessage(msg);
    setLoginPromptVisible(true);
  };
  
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Sync selected variant's stock with quantity state
  const currentVariant = productDetail?.variants?.find(
    v => v.sizeName === selectedSize && v.colorName === selectedColor
  );
  const availableStock = currentVariant ? (currentVariant.quantity !== undefined ? currentVariant.quantity : 10) : 10;

  useEffect(() => {
    if (productDetail) {
      if (availableStock === 0) {
        setQuantity(0);
      } else {
        setQuantity(1);
      }
    }
  }, [selectedSize, selectedColor, productDetail]);

  // Format Image URL safe helper
  const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Fetch product detail from API
  const fetchProductDetail = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.product) {
          const product = result.product;
          
          let mainImgUrl = '';
          if (result.images && result.images.length > 0 && result.images[0].url) {
            mainImgUrl = result.images[0].url;
          } else if (product.imageUrl) {
            mainImgUrl = product.imageUrl;
          } else if (initialProduct?.imageUrl) {
            mainImgUrl = initialProduct.imageUrl;
          }

          let defaultVariants = result.variants && result.variants.length > 0 ? result.variants : (initialProduct?.variants || []);

          const defaultPrice = defaultVariants[0]?.price || product.price || initialProduct?.price || 3000000;

          const mappedDetail = {
            id: product.id || productId,
            productName: product.productName || initialProduct?.productName || 'Sneaker Cao Cấp',
            brandName: product.brandName || initialProduct?.brandName || 'Sneaker',
            categoryName: product.categoryName || initialProduct?.categoryName || 'Chưa phân loại',
            description: product.description || initialProduct?.description || 'Chưa có mô tả chi tiết cho sản phẩm này.',
            imageUrl: mainImgUrl,
            price: defaultPrice,
            variants: defaultVariants,
            avgRating: result.avgRating || 4.8,
            reviewCount: result.reviewCount || 12,
            flashSale: result.flashSale || null
          };

          setProductDetail(mappedDetail);
          
          if (mappedDetail.variants && mappedDetail.variants.length > 0) {
            setSelectedSize(mappedDetail.variants[0].sizeName);
            setSelectedColor(mappedDetail.variants[0].colorName);
          }
        } else {
          throw new Error("Invalid API structure");
        }
      } else {
        throw new Error("API response error");
      }
    } catch (error) {
      console.log("Detail API failed:", error.message);
      
      // Use initialProduct passed in route params if available
      if (initialProduct) {
        const basePrice = initialProduct.price || 0;
        const matched = {
          id: initialProduct.id || productId,
          productName: initialProduct.productName || 'Sản phẩm',
          brandName: initialProduct.brandName || '',
          categoryName: initialProduct.categoryName || 'Chưa phân loại',
          imageUrl: initialProduct.imageUrl || '',
          price: basePrice,
          description: initialProduct.description || 'Chưa có mô tả chi tiết cho sản phẩm này.',
          variants: initialProduct.variants || [],
          avgRating: initialProduct.avgRating || null,
          reviewCount: initialProduct.reviewCount || 0
        };
        setProductDetail(matched);
        if (matched.variants && matched.variants.length > 0) {
          setSelectedSize(matched.variants[0].sizeName);
          setSelectedColor(matched.variants[0].colorName);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

  const handleAddToCartAction = async () => {
    if (!productDetail) return;

    // Check if user is logged in
    try {
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (!storedUser) {
        showLoginPrompt('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.');
        return;
      }
    } catch (e) {
      console.warn('Error checking auth state:', e);
    }

    if (availableStock === 0) {
      showToast("Sản phẩm phiên bản này hiện tại đang hết hàng!");
      return;
    }

    if (quantity <= 0) {
      showToast("Vui lòng chọn ít nhất 1 sản phẩm!");
      return;
    }

    // Check quantity in cart
    const cartItemId = `${productDetail.id}-${selectedSize}-${selectedColor}`;
    const existingCartItem = cart.find(item => item.id === cartItemId);
    const existingQuantityInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (existingQuantityInCart + quantity > availableStock) {
      showToast(`Không thể thêm: Bạn đã có ${existingQuantityInCart} đôi trong giỏ hàng, tồn kho chỉ còn ${availableStock}.`);
      return;
    }

    // Pricing calculation
    const finalPrice = productDetail.flashSale ? productDetail.flashSale.salePrice : (currentVariant ? currentVariant.price : productDetail.price);

    addToCart(productDetail, selectedSize, selectedColor, quantity, finalPrice);
    showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
  };

  const handleBuyNowAction = async () => {
    if (!productDetail) return;

    // Check if user is logged in
    try {
      const storedUser = await AsyncStorage.getItem('userAccount');
      if (!storedUser) {
        showLoginPrompt('Bạn cần đăng nhập để mua hàng.');
        return;
      }
    } catch (e) {
      console.warn('Error checking auth state:', e);
    }

    if (availableStock === 0) {
      showToast("Sản phẩm phiên bản này hiện tại đang hết hàng!");
      return;
    }

    if (quantity <= 0) {
      showToast("Vui lòng chọn ít nhất 1 sản phẩm!");
      return;
    }

    // Check quantity in cart
    const cartItemId = `${productDetail.id}-${selectedSize}-${selectedColor}`;
    const existingCartItem = cart.find(item => item.id === cartItemId);
    const existingQuantityInCart = existingCartItem ? existingCartItem.quantity : 0;

    if (existingQuantityInCart + quantity > availableStock) {
      showToast(`Không thể mua: Bạn đã có ${existingQuantityInCart} đôi trong giỏ hàng, tồn kho chỉ còn ${availableStock}.`);
      return;
    }

    // Pricing calculation
    const finalPrice = productDetail.flashSale ? productDetail.flashSale.salePrice : (currentVariant ? currentVariant.price : productDetail.price);

    addToCart(productDetail, selectedSize, selectedColor, quantity, finalPrice);
    
    // Redirect directly to Cart screen
    navigation.navigate('Cart');
  };

  const formatVND = (num) => {
    if (!num) return 'Liên hệ';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ' đ';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00F2FE" />
        <Text style={styles.loadingText}>Đang lấy chi tiết sản phẩm...</Text>
      </View>
    );
  }

  if (!productDetail) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#FF4960" />
        <Text style={styles.errorText}>Không tìm thấy sản phẩm!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentVariantPrice = productDetail.variants.find(
    v => v.sizeName === selectedSize && v.colorName === selectedColor
  )?.price || productDetail.price;

  return (
    <SafeAreaView style={styles.container}>
      {/* CUSTOM NAV HEADER */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.circleHeaderBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.navHeaderTitle} numberOfLines={1}>{productDetail.brandName} Edition</Text>
        <TouchableOpacity style={styles.circleHeaderBtn} onPress={() => navigation.navigate('Cart')} activeOpacity={0.7}>
          <Ionicons name="cart" size={24} color="#000000" />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* BIG IMAGE */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: formatImageUrl(productDetail.imageUrl) }}
            style={styles.image}
            resizeMode="cover"
          />
          {productDetail.flashSale && (
            <View style={styles.flashSaleBadge}>
              <Text style={styles.flashSaleBadgeText}>FLASH SALE -{productDetail.flashSale.discountPercent}%</Text>
            </View>
          )}
        </View>

        {/* DETAILS INFO */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>{productDetail.brandName}</Text>
              <Text style={styles.productName}>{productDetail.productName}</Text>
            </View>
            <View style={styles.priceContainer}>
              {productDetail.flashSale ? (
                <>
                  <Text style={styles.originalPrice}>{formatVND(productDetail.flashSale.originalPrice)}</Text>
                  <Text style={styles.salePrice}>{formatVND(productDetail.flashSale.salePrice)}</Text>
                </>
              ) : (
                <Text style={styles.salePrice}>{formatVND(currentVariantPrice)}</Text>
              )}
            </View>
          </View>

          {/* RATING */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#FFD700" style={{ marginRight: 4 }} />
            <Text style={styles.ratingText}>
              {productDetail.avgRating} ★ ({productDetail.reviewCount} đánh giá của giới điệu mộ)
            </Text>
          </View>

          <View style={styles.divider} />

          {/* SIZES */}
          {productDetail.variants.length > 0 && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>Chọn Kích Thước (Size)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizesScroll}>
                {Array.from(new Set(productDetail.variants.map(v => v.sizeName))).filter(Boolean).map((size) => {
                  const isChosen = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[styles.sizeOption, isChosen && styles.sizeOptionActive]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[styles.sizeOptionText, isChosen && styles.sizeOptionTextActive]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* COLORS */}
          {productDetail.variants.length > 0 && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>Chọn Màu Sắc</Text>
              <View style={styles.colorsGrid}>
                {Array.from(new Set(productDetail.variants.map(v => v.colorName))).filter(Boolean).map((color) => {
                  const isChosen = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, isChosen && styles.colorOptionActive]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <Text style={[styles.colorOptionText, isChosen && styles.colorOptionTextActive]}>
                        {color}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STOCK STATUS */}
          <View style={styles.stockSection}>
            {availableStock > 0 ? (
              <Text style={styles.stockAvailableText}>
                Số lượng có sẵn: <Text style={{ fontWeight: '900', color: '#2E7D32' }}>{availableStock}</Text> đôi
              </Text>
            ) : (
              <Text style={styles.stockUnavailableText}>TẠM HẾT HÀNG 🚫</Text>
            )}
          </View>

          {/* QUANTITY */}
          <View style={styles.qtyContainer}>
            <Text style={styles.selectorTitle}>Số Lượng Mua</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={[styles.qtyBtn, (quantity <= 1 || availableStock === 0) && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || availableStock === 0}
              >
                <Feather name="minus" size={16} color={(quantity <= 1 || availableStock === 0) ? "#C0C0C0" : "#000000"} />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={String(quantity)}
                onChangeText={(text) => {
                  if (availableStock === 0) return;
                  
                  if (text === '') {
                    setQuantity('');
                    return;
                  }

                  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                  if (isNaN(num) || num < 1) {
                    setQuantity(1);
                  } else if (num > availableStock) {
                    showToast(`Rất tiếc! Số lượng tối đa có sẵn là ${availableStock} đôi.`);
                    setQuantity(availableStock);
                  } else {
                    setQuantity(num);
                  }
                }}
                onBlur={() => {
                  if (quantity === '' || isNaN(parseInt(quantity, 10))) {
                    setQuantity(availableStock === 0 ? 0 : 1);
                  }
                }}
                keyboardType="number-pad"
                editable={availableStock > 0}
              />
              <TouchableOpacity
                style={[styles.qtyBtn, (quantity >= availableStock || availableStock === 0) && styles.qtyBtnDisabled]}
                onPress={() => {
                  if (quantity < availableStock) {
                    setQuantity(quantity + 1);
                  } else {
                    showToast(`Rất tiếc! Số lượng tối đa có sẵn là ${availableStock} đôi.`);
                  }
                }}
                disabled={quantity >= availableStock || availableStock === 0}
              >
                <Feather name="plus" size={16} color={(quantity >= availableStock || availableStock === 0) ? "#C0C0C0" : "#000000"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* DESCRIPTION */}
          <View style={styles.descSection}>
            <Text style={styles.selectorTitle}>Mô Tả Sản Phẩm</Text>
            <Text style={styles.descriptionText}>{productDetail.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTION BUTTONS */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(productDetail.id)}
        >
          <Ionicons
            name={favorites.includes(productDetail.id) ? "heart" : "heart-outline"}
            size={24}
            color={favorites.includes(productDetail.id) ? "#E51E25" : "#606060"}
          />
        </TouchableOpacity>
        
        {/* ADD TO CART - ICON ONLY */}
        <TouchableOpacity 
          style={[styles.addToCartBtn, availableStock === 0 && styles.addToCartBtnDisabled]} 
          onPress={handleAddToCartAction}
          disabled={availableStock === 0}
          activeOpacity={0.7}
        >
          <Feather name="shopping-cart" size={20} color={availableStock === 0 ? "#C0C0C0" : "#E51E25"} />
        </TouchableOpacity>

        {/* BUY NOW BUTTON */}
        <TouchableOpacity
          style={[styles.buyNowBtn, availableStock === 0 && styles.buyNowBtnDisabled]}
          onPress={handleBuyNowAction}
          disabled={availableStock === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.buyNowText}>
            {availableStock > 0 ? "MUA NGAY" : "HẾT HÀNG"}
          </Text>
        </TouchableOpacity>
      </View>
      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
      <LoginPromptSheet
        visible={loginPromptVisible}
        message={loginPromptMessage}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#808080',
    marginTop: 12,
    fontSize: 13,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#E51E25',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    position: 'relative',
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
  navHeaderTitle: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
    maxWidth: width * 0.5,
  },
  imageContainer: {
    width: width,
    height: 380,
    backgroundColor: '#FAF9FB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  flashSaleBadge: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    backgroundColor: '#E51E25',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  flashSaleBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  infoSection: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandName: {
    color: '#E51E25',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  productName: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    color: '#808080',
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  salePrice: {
    color: '#E51E25',
    fontSize: 20,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    color: '#808080',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 20,
  },
  selectorSection: {
    marginBottom: 20,
  },
  selectorTitle: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 10,
  },
  sizesScroll: {
    flexDirection: 'row',
  },
  sizeOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sizeOptionActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  sizeOptionText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
  sizeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginRight: 8,
    marginBottom: 8,
  },
  colorOptionActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  colorOptionText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  colorOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  qtyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: '#FAF9FB',
    borderColor: '#EAEAEA',
    opacity: 0.5,
  },
  qtyText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  qtyInput: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 8,
    textAlign: 'center',
    width: 50,
    height: 32,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    marginHorizontal: 8,
    backgroundColor: '#FAF9FB',
    paddingVertical: 0,
  },
  stockSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  stockAvailableText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#606060',
  },
  stockUnavailableText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E51E25',
    letterSpacing: 0.5,
  },
  descSection: {
    marginTop: 10,
  },
  descriptionText: {
    color: '#606060',
    fontSize: 13,
    lineHeight: 22,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#EAEAEA',
    alignItems: 'center',
  },
  favBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addToCartBtnDisabled: {
    backgroundColor: '#EAEAEA',
    borderColor: '#EAEAEA',
    opacity: 0.5,
  },
  buyNowBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#E51E25',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  buyNowBtnDisabled: {
    backgroundColor: '#B0B0B0',
    shadowColor: 'transparent',
    elevation: 0,
  },
  buyNowText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  }
});
