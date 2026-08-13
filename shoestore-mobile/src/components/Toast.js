import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Toast({ message, visible, onDismiss, type = 'success' }) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      // Slide down & fade in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 10,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      const timer = setTimeout(() => {
        // Slide up & fade out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          if (onDismiss) onDismiss();
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, message]);

  if (!visible || !message) return null;

  // Detect error types to color code like shoestore-web
  const messageStr = String(message).toLowerCase();
  const isError = type === 'error' || 
                  messageStr.includes('lỗi') || 
                  messageStr.includes('thất bại') || 
                  messageStr.includes('vui lòng') || 
                  messageStr.includes('chưa') || 
                  messageStr.includes('không') ||
                  messageStr.includes('giới hạn') ||
                  messageStr.includes('từ chối') ||
                  messageStr.includes('hết hàng') ||
                  messageStr.includes('hủy') ||
                  messageStr.includes('hợp lệ');

  const bgColor = isError ? '#dc2626' : '#198754';
  const iconName = isError ? 'alert-circle' : 'checkmark-circle';

  return (
    <Animated.View style={[
      styles.toastContainer, 
      { 
        transform: [{ translateY }], 
        opacity,
        backgroundColor: bgColor
      }
    ]}>
      <Ionicons name={iconName} size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  }
});
