import React, { createContext, useState, useMemo } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Toggle favorite
  const toggleFavorite = (productId) => {
    setFavorites(prevFavs => {
      if (prevFavs.includes(productId)) {
        return prevFavs.filter(id => id !== productId);
      } else {
        return [...prevFavs, productId];
      }
    });
  };

  // Add item to cart
  const addToCart = (product, size, color, quantity, price) => {
    const cartItemId = `${product.id}-${size}-${color}`;
    
    // Look up stock and variant ID for this variant
    let stock = 10; // default fallback
    let variantId = null;
    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        v => String(v.sizeName).trim() === String(size).trim() && String(v.colorName).trim() === String(color).trim()
      );
      if (matchedVariant) {
        stock = matchedVariant.quantity;
        variantId = matchedVariant.id;
      } else {
        // Fallback to first variant if size/color didn't match exactly
        variantId = product.variants[0].id;
        stock = product.variants[0].quantity;
      }
    } else if (product.quantity !== undefined) {
      stock = product.quantity;
    }
    
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        // Cap at stock limit
        updated[existingIndex].quantity = Math.min(newQty, stock);
        return updated;
      }
      
      const newItem = {
        id: cartItemId,
        productId: product.id,
        variantId: variantId, // Save variant ID
        productName: product.productName,
        brandName: product.brandName,
        imageUrl: product.imageUrl,
        size: size || 'Standard',
        color: color || 'Standard',
        price: price || product.price,
        quantity: quantity,
        stock: stock
      };
      return [...prevCart, newItem];
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId, delta) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          if (delta > 0 && newQty > (item.stock || 10)) {
            return item; // Do not increase beyond stock limit
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean)
    );
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Memoized values
  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  return (
    <CartContext.Provider value={{
      cart,
      favorites,
      toggleFavorite,
      addToCart,
      updateCartQuantity,
      clearCart,
      cartCount,
      totalAmount
    }}>
      {children}
    </CartContext.Provider>
  );
};
