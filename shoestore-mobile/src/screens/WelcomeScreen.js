import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  // Animation values for fading & rising elements
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const imageScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(imageScale, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      console.log('Error setting launch state', e);
      navigation.navigate('MainTabs');
    }
  };

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      navigation.navigate('Login');
    } catch (e) {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* 1. TOP LOGO SECTION */}
      <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="shoe-print" size={24} color="#E51E25" style={styles.footprintLeft} />
          <MaterialCommunityIcons name="shoe-print" size={24} color="#E51E25" style={styles.footprintRight} />
        </View>
        <Text style={styles.logoText}>
          SHOE<Text style={styles.logoRed}>STORE</Text>
        </Text>
      </Animated.View>

      {/* 2. HERO IMAGE CONTAINER */}
      <View style={styles.imageContainer}>
        {/* Decorative background shape */}
        <View style={styles.decorCircle} />
        <Animated.Image
          source={require('../../assets/welcome_sneaker.png')}
          style={[
            styles.sneakerImage,
            {
              transform: [{ scale: imageScale }]
            }
          ]}
          resizeMode="contain"
        />
      </View>

      {/* 3. TEXT & ACTIONS SECTION */}
      <Animated.View 
        style={[
          styles.contentSection, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <Text style={styles.tagline}>NÂNG NIU TỪNG BƯỚC CHÂN</Text>
        <Text style={styles.title}>Đỉnh Cao Phong Cách Sneaker</Text>
        <Text style={styles.description}>
          Khám phá và sở hữu những mẫu sneaker độc quyền, dẫn đầu xu hướng thế giới với trải nghiệm mua sắm đẳng cấp nhất tại SHOESTORE.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>BẮT ĐẦU NGAY</Text>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={16} color="#E51E25" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Đã có tài khoản? <Text style={styles.loginHighlight}>Đăng nhập</Text></Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: height * 0.015,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footprintLeft: {
    transform: [{ rotate: '-15deg' }],
    marginRight: 1,
  },
  footprintRight: {
    transform: [{ rotate: '15deg' }],
    marginLeft: 1,
    marginTop: 6,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
  },
  logoRed: {
    color: '#E51E25',
  },
  imageContainer: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  decorCircle: {
    position: 'absolute',
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    backgroundColor: '#FAF9FB',
    zIndex: 1,
  },
  sneakerImage: {
    width: width * 0.85,
    height: height * 0.35,
    zIndex: 2,
  },
  contentSection: {
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  tagline: {
    fontSize: 12,
    color: '#E51E25',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
  },
  description: {
    fontSize: 13,
    color: '#707070',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 22,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#E51E25',
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  arrowCircle: {
    position: 'absolute',
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: 15,
    padding: 10,
  },
  secondaryButtonText: {
    color: '#707070',
    fontSize: 13,
    fontWeight: '600',
  },
  loginHighlight: {
    color: '#E51E25',
    fontWeight: '700',
  }
});
