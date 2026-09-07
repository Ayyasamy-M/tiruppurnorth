import { router } from "expo-router";
import { useEffect, useState } from "react";

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

export default function LoginScreen() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // ANDROID BACK BUTTON
  //
  // Login Page
  //      ↓
  // Android Back
  //      ↓
  // index.tsx
  //
  // NO LOGOUT POPUP
  // =====================================================

  useEffect(() => {
    const handleBackPress = () => {
      console.log("📱 Android Back pressed on Login");
      console.log("➡️ Going to index.tsx");

      if (!loading) {
        router.replace("/");
      }

      // Stop default Android back navigation
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    console.log("📱 Login BackHandler ENABLED");

    return () => {
      subscription.remove();

      console.log("📱 Login BackHandler DISABLED");
    };
  }, [loading]);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {
    const cleanMobile = mobile.trim();

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
      Alert.alert("Required", "Please enter your password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_ENDPOINTS.login, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          mobile: cleanMobile,
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Login Failed",
          data?.message || "Invalid mobile number or password",
        );

        return;
      }

      if (!data?.success || !data?.token || !data?.user) {
        Alert.alert("Login Failed", "Invalid server response");

        return;
      }

      await saveAuth(data.token, data.user);

      // =================================================
      // ADMIN
      // =================================================

      if (data.user?.role?.toLowerCase() === "admin") {
        router.replace("/admin-dashboard");

        return;
      }

      // =================================================
      // USER WITH WARD
      // =================================================

      if (data.user?.ward) {
        router.replace({
          pathname: "/ward-home",
          params: {
            ward: data.user.ward.toString(),
          },
        });

        return;
      }

      // =================================================
      // USER WITHOUT WARD
      // =================================================

      router.replace("/ward-selection");
    } catch (error) {
      console.error("Login Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server.\n\nMake sure backend is running and your phone and computer are connected to the same Wi-Fi.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GO REGISTER
  // =====================================================

  const goToRegister = () => {
    if (!loading) {
      /*
         IMPORTANT:
         Login → Register

         Register page back → index.tsx
      */

      router.replace("/register");
    }
  };

  // =====================================================
  // GO HOME
  //
  // Login screen top-left button
  // → index.tsx
  // =====================================================

  const goToHome = () => {
    if (!loading) {
      console.log("⬅️ Login → index.tsx");

      router.replace("/");
    }
  };

  // =====================================================
  // UI
  // =====================================================

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
            activeOpacity={0.7}
            disabled={loading}>
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

            <Text style={styles.title}>Welcome Back</Text>

            <Text style={styles.subtitle}>
              உங்கள் கணக்கில் Login செய்யுங்கள்
            </Text>
          </View>

          {/* =================================================
              FORM
          ================================================= */}

          <View style={styles.form}>
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
                placeholder="Enter password"
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

            {/* LOGIN BUTTON */}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />

                  <Text style={styles.loadingText}>Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* =================================================
              REGISTER
          ================================================= */}

          <View style={styles.registerRow}>
            <Text style={styles.registerQuestion}>Account இல்லையா?</Text>

            <TouchableOpacity onPress={goToRegister} disabled={loading}>
              <Text style={styles.registerLink}> Register</Text>
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
    marginTop: 35,
    marginBottom: 40,
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
    marginTop: 18,
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
  // LOGIN BUTTON
  // =====================================================

  loginButton: {
    height: 56,
    backgroundColor: "#075985",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },

  disabledButton: {
    backgroundColor: "#94A3B8",
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

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
  // REGISTER
  // =====================================================

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },

  registerQuestion: {
    color: "#64748B",
    fontSize: 15,
  },

  registerLink: {
    color: "#075985",
    fontSize: 15,
    fontWeight: "700",
  },
});
