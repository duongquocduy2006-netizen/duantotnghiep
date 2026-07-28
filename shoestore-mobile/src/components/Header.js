import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function Header({
  userName = 'NGUYỄN TRỌNG PHÚC',
  searchQuery = '',
  setSearchQuery = () => {},
  favoritesCount = 0,
  cartCount = 0,
  onFavoritesPress = () => {},
  onCartPress = () => {}
}) {
  return (
    <View style={styles.headerContainer}>
      {/* Welcome & Top Row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.welcomeText}>XIN CHÀO, {userName.toUpperCase()}! 👋</Text>
          <Text style={styles.logoText}>
            SHOE<Text style={styles.logoRed}>STORE</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={onFavoritesPress} activeOpacity={0.7}>
            <Ionicons name="heart" size={22} color={favoritesCount > 0 ? "#E51E25" : "#505050"} />
            {favoritesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{favoritesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.iconButton} onPress={onCartPress} activeOpacity={0.7}>
            <Ionicons name="cart" size={22} color="#000000" />
            {cartCount > 0 && (
              <View style={[styles.badge, styles.badgeRed]}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar & Filter Row */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#808080" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm mẫu sneaker yêu thích..."
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 9,
    color: '#808080',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f2f6', // Light gray background
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
  badgeRed: {
    backgroundColor: '#E51E25',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
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

});
