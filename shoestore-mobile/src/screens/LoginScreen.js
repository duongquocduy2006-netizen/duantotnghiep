import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Dimensions
} from 'react-native';
import Toast from '../components/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  // Mode switcher: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  // --- LOGIN STATES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- REGISTER STATES ---
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [regFullNameError, setRegFullNameError] = useState(false);
  const [regEmailError, setRegEmailError] = useState(false);
  const [regPasswordError, setRegPasswordError] = useState(false);
  const [regConfirmPasswordError, setRegConfirmPasswordError] = useState(false);
  
  const [isRegPasswordVisible, setIsRegPasswordVisible] = useState(false);
  const [isRegConfirmPasswordVisible, setIsRegConfirmPasswordVisible] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // --- FORGOT PASSWORD STATES ---
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState(false);

  // Focus tracking for input highlights
  const [focusedField, setFocusedField] = useState('');

  // Switch modes helper
  const switchMode = (newMode) => {
    setMode(newMode);
    // Reset all errors and fields when switching
    setEmailError(false);
    setPasswordError(false);
    setRegFullNameError(false);
    setRegEmailError(false);
    setRegPasswordError(false);
    setRegConfirmPasswordError(false);
    setForgotEmailError(false);
  };

  // --- LOGIN SUBMIT FLOW ---
  const handleLogin = async () => {
    let valid = true;

    if (!email.trim()) {
      setEmailError(true);
      valid = false;
    } else {
      setEmailError(false);
    }

    if (!password.trim()) {
      setPasswordError(true);
      valid = false;
    } else {
      setPasswordError(false);
    }

    if (!valid) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Only allow USER role on mobile app
        if (data.account && data.account.role !== 'USER') {
          showToast("Tài khoản quản trị không được phép đăng nhập trên Mobile!");
          setLoading(false);
          return;
        }

        // Save account locally
        await AsyncStorage.setItem('userAccount', JSON.stringify(data.account));
        
        showToast("Đăng nhập thành công!");
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }, 1200);
      } else {
        showToast(data.message || "Tài khoản hoặc mật khẩu không đúng.");
      }
    } catch (error) {
      console.warn("Login Connection Error:", error.message);
      Alert.alert(
        "Lỗi Kết Nối 🔌",
        "Không thể kết nối đến máy chủ. Bạn có muốn tiếp tục bằng tài khoản Demo?",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Dùng tài khoản Demo", 
            onPress: async () => {
              const demoUser = {
                id: 99,
                full_name: "Khách hàng VIP",
                email: email || "demo@shoestore.com",
                role: "USER",
                points: 120
              };
              await AsyncStorage.setItem('userAccount', JSON.stringify(demoUser));
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER SUBMIT FLOW ---
  const handleRegister = async () => {
    let valid = true;

    if (!regFullName.trim()) {
      setRegFullNameError(true);
      valid = false;
    } else {
      setRegFullNameError(false);
    }

    if (!regEmail.trim()) {
      setRegEmailError(true);
      valid = false;
    } else {
      setRegEmailError(false);
    }

    if (!regPassword.trim()) {
      setRegPasswordError(true);
      valid = false;
    } else {
      setRegPasswordError(false);
    }

    if (!regConfirmPassword.trim()) {
      setRegConfirmPasswordError(true);
      valid = false;
    } else {
      setRegConfirmPasswordError(false);
    }

    if (!valid) return;

    if (regPassword !== regConfirmPassword) {
      showToast("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (!agreeTerms) {
      showToast("Vui lòng đồng ý với điều khoản sử dụng!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
          fullName: regFullName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast("Đăng ký tài khoản thành công!");
        setTimeout(() => {
          switchMode('login');
        }, 1200);
      } else {
        showToast(data.message || "Đăng ký không thành công.");
      }
    } catch (error) {
      console.warn("Register Connection Error:", error.message);
      showToast("Không thể gửi dữ liệu đăng ký tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD FLOW ---
  const handleForgot = async () => {
    if (!forgotEmail.trim()) {
      setForgotEmailError(true);
      return;
    }
    setForgotEmailError(false);

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast("Mã OTP khôi phục mật khẩu đã được gửi!");
        setTimeout(() => {
          switchMode('login');
        }, 1200);
      } else {
        showToast(data.message || "Email không tồn tại trong hệ thống.");
      }
    } catch (error) {
      console.warn("Forgot Password Connection Error:", error.message);
      showToast("Không thể gửi yêu cầu đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* HEADER LOGO SECTION */}
          <View style={styles.logoSection}>
            <View style={styles.footprintRow}>
              <MaterialCommunityIcons name="shoe-print" size={26} color="#E51E25" style={styles.footprintLeft} />
              <MaterialCommunityIcons name="shoe-print" size={26} color="#E51E25" style={styles.footprintRight} />
            </View>
            <Text style={styles.logoText}>
              SHOE<Text style={styles.logoRed}>STORE</Text>
            </Text>
            
            <Text style={styles.subtitleText}>
              {mode === 'login' && 'Chào mừng trở lại'}
              {mode === 'register' && 'Đăng ký thành viên mới'}
              {mode === 'forgot' && 'Khôi phục mật khẩu'}
            </Text>
          </View>

          {/* ==================== 1. MODE: LOGIN ==================== */}
          {mode === 'login' && (
            <View style={styles.formContainer}>
              {/* Email */}
              <Text style={styles.inputLabel}>EMAIL TÀI KHOẢN</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'email' && styles.inputWrapperFocused,
                emailError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="NHẬP EMAIL CỦA BẠN"
                  placeholderTextColor="#B0B0B0"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (val.trim()) setEmailError(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
              {emailError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập email tài khoản!</Text>
                </View>
              )}

              {/* Password */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>MẬT KHẨU</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'password' && styles.inputWrapperFocused,
                passwordError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="NHẬP MẬT KHẨU"
                  placeholderTextColor="#B0B0B0"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (val.trim()) setPasswordError(false);
                  }}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                />
                <TouchableOpacity 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color="#8E8E9F" 
                  />
                </TouchableOpacity>
              </View>
              {passwordError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập mật khẩu!</Text>
                </View>
              )}

              {/* Remember Me & Forgot Password Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={10} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>GHI NHỚ TÔI</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => switchMode('forgot')}>
                  <Text style={styles.forgotLink}>QUÊN MẬT KHẨU?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>ĐĂNG NHẬP</Text>
                )}
              </TouchableOpacity>

            </View>
          )}

          {/* ==================== 2. MODE: REGISTER ==================== */}
          {mode === 'register' && (
            <View style={styles.formContainer}>
              {/* Full Name */}
              <Text style={styles.inputLabel}>HỌ VÀ TÊN</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'regName' && styles.inputWrapperFocused,
                regFullNameError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="NHẬP HỌ VÀ TÊN CỦA BẠN"
                  placeholderTextColor="#B0B0B0"
                  value={regFullName}
                  onChangeText={(val) => {
                    setRegFullName(val);
                    if (val.trim()) setRegFullNameError(false);
                  }}
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('regName')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
              {regFullNameError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập họ và tên!</Text>
                </View>
              )}

              {/* Email */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>EMAIL TÀI KHOẢN</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'regEmail' && styles.inputWrapperFocused,
                regEmailError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="NHẬP EMAIL CỦA BẠN"
                  placeholderTextColor="#B0B0B0"
                  value={regEmail}
                  onChangeText={(val) => {
                    setRegEmail(val);
                    if (val.trim()) setRegEmailError(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('regEmail')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
              {regEmailError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập email tài khoản!</Text>
                </View>
              )}

              {/* Password */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>MẬT KHẨU</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'regPassword' && styles.inputWrapperFocused,
                regPasswordError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="NHẬP MẬT KHẨU"
                  placeholderTextColor="#B0B0B0"
                  secureTextEntry={!isRegPasswordVisible}
                  value={regPassword}
                  onChangeText={(val) => {
                    setRegPassword(val);
                    if (val.trim()) setRegPasswordError(false);
                  }}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('regPassword')}
                  onBlur={() => setFocusedField('')}
                />
                <TouchableOpacity 
                  onPress={() => setIsRegPasswordVisible(!isRegPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={isRegPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color="#8E8E9F" 
                  />
                </TouchableOpacity>
              </View>
              {regPasswordError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập mật khẩu!</Text>
                </View>
              )}

              {/* Confirm Password */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>NHẬP LẠI MẬT KHẨU</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'regConfirm' && styles.inputWrapperFocused,
                regConfirmPasswordError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="XÁC NHẬN MẬT KHẨU"
                  placeholderTextColor="#B0B0B0"
                  secureTextEntry={!isRegConfirmPasswordVisible}
                  value={regConfirmPassword}
                  onChangeText={(val) => {
                    setRegConfirmPassword(val);
                    if (val.trim()) setRegConfirmPasswordError(false);
                  }}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('regConfirm')}
                  onBlur={() => setFocusedField('')}
                />
                <TouchableOpacity 
                  onPress={() => setIsRegConfirmPasswordVisible(!isRegConfirmPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={isRegConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={18} 
                    color="#8E8E9F" 
                  />
                </TouchableOpacity>
              </View>
              {regConfirmPasswordError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng xác nhận mật khẩu!</Text>
                </View>
              )}

              {/* Terms Checkbox */}
              <TouchableOpacity 
                style={[styles.checkboxRow, { marginTop: 16 }]} 
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && <Ionicons name="checkmark" size={10} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  TÔI ĐỒNG Ý VỚI <Text style={styles.termsLink}>ĐIỀU KHOẢN SỬ DỤNG</Text>
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>ĐĂNG KÝ</Text>
                )}
              </TouchableOpacity>

            </View>
          )}

          {/* ==================== 3. MODE: FORGOT PASSWORD ==================== */}
          {mode === 'forgot' && (
            <View style={styles.formContainer}>
              {/* Forgot Email */}
              <Text style={styles.inputLabel}>NHẬP EMAIL CỦA BẠN</Text>
              <View style={[
                styles.inputWrapper, 
                focusedField === 'forgotEmail' && styles.inputWrapperFocused,
                forgotEmailError && styles.inputWrapperError
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor="#B0B0B0"
                  value={forgotEmail}
                  onChangeText={(val) => {
                    setForgotEmail(val);
                    if (val.trim()) setForgotEmailError(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('forgotEmail')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
              {forgotEmailError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#E51E25" style={{ marginRight: 4 }} />
                  <Text style={styles.errorText}>Vui lòng nhập địa chỉ email!</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleForgot}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.submitWithIcon}>
                    <Feather name="send" size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>GỬI MÃ XÁC THỰC</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Back to Login link */}
              <View style={styles.forgotBackContainer}>
                <Text style={styles.forgotBackText}>Nhớ ra mật khẩu rồi?</Text>
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={styles.forgotBackLink}>ĐĂNG NHẬP NGAY →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SOCIAL & FOOTER NAVIGATION */}
          {mode !== 'forgot' && (
            <View style={{ width: '100%' }}>
              {/* Divider */}
              <View style={styles.socialDividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {mode === 'login' ? 'Hoặc đăng nhập bằng' : 'Hoặc đăng ký bằng'}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button */}
              <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
                <Text style={styles.googleBtnG}>G</Text>
                <Text style={styles.googleBtnText}>TÀI KHOẢN GOOGLE</Text>
              </TouchableOpacity>

              {/* Bottom Mode Switch Link */}
              <View style={styles.footerContainer}>
                {mode === 'login' ? (
                  <>
                    <Text style={styles.footerText}>Chưa có tài khoản?</Text>
                    <TouchableOpacity onPress={() => switchMode('register')}>
                      <Text style={styles.footerLink}>ĐĂNG KÝ NGAY</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.footerText}>Đã có tài khoản?</Text>
                    <TouchableOpacity onPress={() => switchMode('login')}>
                      <Text style={styles.footerLink}>ĐĂNG NHẬP NGAY</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

// STYLING - High-fidelity match with white theme and red highlights
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean White Theme
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  footprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footprintLeft: {
    transform: [{ rotate: '-15deg' }],
    marginRight: 2,
  },
  footprintRight: {
    transform: [{ rotate: '15deg' }],
    marginLeft: 2,
    marginTop: 8,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
  logoRed: {
    color: '#E51E25', // ShoeStore Red
  },
  subtitleText: {
    fontSize: 13,
    color: '#808080',
    fontWeight: '600',
    marginTop: 6,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB', // Soft tinted background
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    height: 48,
    paddingHorizontal: 18,
  },
  inputWrapperFocused: {
    borderColor: '#E51E25',
    backgroundColor: '#FFF8F8', // Slightly pinkish focused tint
  },
  inputWrapperError: {
    borderColor: '#E51E25',
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 12,
  },
  errorText: {
    color: '#E51E25',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C0C0C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#E51E25',
    borderColor: '#E51E25',
  },
  checkboxLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#606060',
    letterSpacing: 0.2,
  },
  termsLink: {
    color: '#E51E25',
    fontWeight: '900',
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E51E25',
    letterSpacing: 0.2,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#E51E25', // ShoeStore Red
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 10,
    marginBottom: 10,
  },
  submitWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  forgotBackContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  forgotBackText: {
    fontSize: 12,
    color: '#808080',
    fontWeight: '600',
  },
  forgotBackLink: {
    fontSize: 12,
    color: '#E51E25',
    fontWeight: '800',
    marginTop: 6,
  },
  socialDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  dividerText: {
    fontSize: 11,
    color: '#B0B0B0',
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  googleBtn: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  googleBtnG: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4', // Google Blue
    marginRight: 10,
  },
  googleBtnText: {
    color: '#404040',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#808080',
    fontWeight: '600',
    marginRight: 6,
  },
  footerLink: {
    fontSize: 12,
    color: '#E51E25',
    fontWeight: '800',
  }
});
