import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('zi');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: ''
  });

  const { login, register } = useAuth();

  const validateForm = () => {
    const newErrors = { email: '', password: '', name: '' };
    let isValid = true;

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Name validation for registration
    if (isRegistering && !name) {
      newErrors.name = 'Full name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await register(email, password, name, role);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      Alert.alert(
        isRegistering ? 'Registration Failed' : 'Login Failed',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRole('zi');
    setErrors({ email: '', password: '', name: '' });
  };



  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Background Gradient Effect */}
          <View style={styles.backgroundGradient} />

          <View style={styles.content}>
            {/* Modern Header with Logo */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="shield-checkmark" size={40} color="white" />
                </View>
                <View style={styles.logoGlow} />
              </View>

              <Text style={styles.title}>
                PMC Admin Portal
              </Text>
              <Text style={styles.subtitle}>
                Pune Municipal Corporation
              </Text>
              <Text style={styles.description}>
                {isRegistering ? '🚀 Join our admin team' : '👋 Welcome back, Admin'}
              </Text>
            </View>

            {/* Modern Card Container */}
            <View style={styles.cardContainer}>
              <View style={styles.card}>

                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, !isRegistering && styles.activeTab]}
                    onPress={() => !isRegistering || toggleMode()}
                  >
                    <Text style={[styles.tabText, !isRegistering && styles.activeTabText]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, isRegistering && styles.activeTab]}
                    onPress={() => isRegistering || toggleMode()}
                  >
                    <Text style={[styles.tabText, isRegistering && styles.activeTabText]}>
                      Register
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                  {/* Name Input (Registration only) */}
                  {isRegistering && (
                    <View style={styles.inputGroup}>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color={Colors.primary[400]} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, errors.name ? styles.inputError : null]}
                          placeholder="Full Name"
                          placeholderTextColor={Colors.neutral[400]}
                          value={name}
                          onChangeText={setName}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </View>
                      {errors.name ? (
                        <Text style={styles.errorText}>{errors.name}</Text>
                      ) : null}
                    </View>
                  )}

                  {/* Role Selection (Registration only) */}
                  {isRegistering && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Select Role</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={role}
                          onValueChange={(value) => setRole(value)}
                          style={styles.picker}
                        >
                          <Picker.Item label="Zone Incharge - Manage zone requests" value="zi" />
                          <Picker.Item label="HR Manager - Manage workers" value="hr" />
                          <Picker.Item label="Contractor - Manage assigned workers" value="contractor" />
                          <Picker.Item label="Driver - View routes and update status" value="driver" />
                        </Picker>
                      </View>
                    </View>
                  )}

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color={Colors.primary[400]} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, errors.email ? styles.inputError : null]}
                        placeholder="Email Address"
                        placeholderTextColor={Colors.neutral[400]}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {errors.email ? (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    ) : null}
                  </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password *
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password ? styles.inputError : null]}
                  placeholder={isRegistering ? "Create a password (min 6 characters)" : "Enter your password"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      loading ? styles.submitButtonDisabled : null
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="white" size="small" />
                        <Text style={styles.loadingText}>
                          {isRegistering ? 'Creating Account...' : 'Signing in...'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons
                          name={isRegistering ? "person-add" : "log-in"}
                          size={20}
                          color="white"
                          style={styles.buttonIcon}
                        />
                        <Text style={styles.submitButtonText}>
                          {isRegistering ? 'Create Account' : 'Sign In'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Info */}
                  <View style={styles.demoInfo}>
                    <Ionicons name="information-circle" size={16} color={Colors.primary[400]} />
                    <Text style={styles.demoText}>
                      {isRegistering
                        ? 'Registration requests require admin approval'
                        : 'Enter your credentials to access the system'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: Colors.primary[500],
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[200],
    opacity: 0.3,
    top: -10,
    left: -10,
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  cardContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: 24,
    padding: 32,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  activeTabText: {
    color: 'white',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 16,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputError: {
    borderColor: Colors.error[500],
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
    color: '#111827',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginButtonActive: {
    backgroundColor: '#2563EB',
  },
  loginButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  demoInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  demoText: {
    fontSize: 12,
    color: '#1D4ED8',
    textAlign: 'center',
  },

  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  toggleButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  // New modern styles
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 32,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutral[400],
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.neutral[700],
  },

});

export default LoginScreen;
