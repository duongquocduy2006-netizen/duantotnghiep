import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Footer({
  activeTab = 'Home',
  onTabPress = () => {}
}) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }
  const tabs = [
    { key: 'Home', label: 'Trang chủ', icon: 'home', iconOutline: 'home-outline' },
    { key: 'Shop', label: 'Cửa hàng', icon: 'search', iconOutline: 'search-outline' },
    { key: 'Notifications', label: 'Thông báo', icon: 'notifications', iconOutline: 'notifications-outline' },
    { key: 'Profile', label: 'Tài khoản', icon: 'person', iconOutline: 'person-outline' }
  ];

  return (
    <View style={styles.footerContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconName = isActive ? tab.icon : tab.iconOutline;
        const tintColor = isActive ? '#E51E25' : '#8E8E9F';

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={22} color={tintColor} />
            <Text style={[styles.tabLabel, { color: tintColor, fontWeight: isActive ? '800' : '500' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0, // Safe padding for iOS home indicator
    
    // Shadow styling
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10, // Elevation for Android
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 4,
  }
});
