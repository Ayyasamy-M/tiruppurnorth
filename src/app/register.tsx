import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_ENDPOINTS, saveAuth } from "../config/api";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // ANDROID HARDWARE BACK
  // REGISTER → INDEX
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (loading) {
          return true;
        }

        // Always go to index.tsx
        router.replace("/");

        // IMPORTANT:
        // true = Android default back action is blocked
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [loading]),
  );

  // =====================================================
  // REGISTER
  // =====================================================

  const handleContinue = async () => {
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();

    if (!cleanName) {
      Alert.alert("Required", "Please enter your name");
      return;
    }

    if (cleanName.length < 2) {
      Alert.alert("Invalid Name", "Please enter your full name");
      return;
    }

    if (!cleanMobile) {
      Alert.alert("Required", "Please enter your mobile number");
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      Alert.alert(
        "Invalid Mobile",
        "Please enter a valid 10 digit mobile number",
      );
      return;
    }

    if (!password.trim()) {
      Alert.alert("Required", "Please create a password");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 6 characters",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.register, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: cleanName,
          mobile: cleanMobile,
          password,
          ward: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Registration Failed",
          data?.message || "Something went wrong",
        );

        return;
      }

      if (!data?.success || !data?.token || !data?.user) {
        Alert.alert("Registration Failed", "Invalid server response");

        return;
      }

      await saveAuth(data.token, data.user);

      Alert.alert(
        "Account Created",
        "Your account has been created successfully.",
        [
          {
            text: "Continue",

            onPress: () => {
              router.replace("/ward-selection");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Register Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server.\n\nMake sure backend is running and your phone and computer are connected to the same Wi-Fi.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BACK BUTTON → INDEX
  // =====================================================

  const goToHome = () => {
    if (loading) {
      return;
    }

    router.replace("/");
  };

  // =====================================================
  // LOGIN → LOGIN PAGE
  // =====================================================

  const goToLogin = () => {
    if (loading) {
      return;
    }

    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* =================================================
              BACK BUTTON
          ================================================= */}

          <TouchableOpacity
            style={styles.backButton}
            onPress={goToHome}
            disabled={loading}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.header}>
            <Image
              source={require("./images/profilelogo.png")}
              style={styles.headerImage}
              resizeMode="contain"
            />

            <Text style={styles.title}>Create Account</Text>

            <Text style={styles.subtitle}>
              உங்கள் தகவல்களை பதிவு செய்யுங்கள்
            </Text>
          </View>

          {/* =================================================
              FORM
          ================================================= */}

          <View style={styles.form}>
            {/* NAME */}

            <Text style={styles.label}>Full Name</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />

            {/* MOBILE */}

            <Text style={styles.label}>Mobile Number</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ""))}
              editable={!loading}
            />

            {/* PASSWORD */}

            <Text style={styles.label}>Password</Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}>
                <Text style={styles.showButtonText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* =================================================
                CONTINUE
            ================================================= */}

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={handleContinue}
              disabled={loading}
              activeOpacity={0.7}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />

                  <Text style={styles.loadingText}>Creating...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.registerText}>Continue</Text>

                  <Text style={styles.arrowText}>→</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* =================================================
              LOGIN
          ================================================= */}

          <View style={styles.loginRow}>
            <Text style={styles.loginQuestion}>Already have an account?</Text>

            <TouchableOpacity
              onPress={goToLogin}
              disabled={loading}
              activeOpacity={0.7}>
              <Text style={styles.loginLink}> Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // =====================================================
  // BACK
  // =====================================================

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    elevation: 2,
  },

  backText: {
    fontSize: 34,
    color: "#0F172A",
    lineHeight: 38,
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },

  headerImage: {
    width: "100%",
    height: 150,
    backgroundColor: "green",
    borderRadius: "40%",
    maxWidth: 150,
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
  },

  // =====================================================
  // FORM
  // =====================================================

  form: {
    width: "100%",
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    height: 56,
    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,

    paddingHorizontal: 16,

    fontSize: 16,
    color: "#0F172A",
  },

  // =====================================================
  // PASSWORD
  // =====================================================

  passwordContainer: {
    height: 56,
    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    height: "100%",

    paddingHorizontal: 16,

    fontSize: 16,
    color: "#0F172A",
  },

  showButton: {
    height: "100%",
    paddingHorizontal: 16,

    alignItems: "center",
    justifyContent: "center",
  },

  showButtonText: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "700",
  },

  // =====================================================
  // REGISTER BUTTON
  // =====================================================

  registerButton: {
    height: 56,
    backgroundColor: "#075985",

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    marginTop: 28,
  },

  disabledButton: {
    backgroundColor: "#94A3B8",
  },

  registerText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  arrowText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
  },

  // =====================================================
  // LOADING
  // =====================================================

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // =====================================================
  // LOGIN
  // =====================================================

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },

  loginQuestion: {
    color: "#64748B",
    fontSize: 15,
  },

  loginLink: {
    color: "#075985",
    fontSize: 15,
    fontWeight: "700",
  },
});
