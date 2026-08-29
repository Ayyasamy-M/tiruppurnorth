import { router } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
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

export default function AdminLoginScreen() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  const handleAdminLogin = async () => {
    const cleanMobile = mobile.trim();

    if (!cleanMobile) {
      Alert.alert("Mobile Number", "Please enter admin mobile number.");
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      Alert.alert(
        "Invalid Mobile Number",
        "Please enter a valid 10-digit mobile number.",
      );
      return;
    }

    if (!password.trim()) {
      Alert.alert("Password", "Please enter admin password.");
      return;
    }

    if (loading) {
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
          password: password,
        }),
      });

      const responseText = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        console.log("Response is not JSON");
      }

      // =================================================
      // ERROR
      // =================================================

      if (!response.ok) {
        Alert.alert(
          "Login Failed",
          data?.message || `Login failed (${response.status})`,
        );

        return;
      }

      // =================================================
      // RESPONSE
      // =================================================

      if (!data?.token || !data?.user) {
        Alert.alert("Login Error", "Invalid response received from server.");

        return;
      }

      // =================================================
      // ADMIN ONLY
      // =================================================

      if (data.user.role?.toLowerCase() !== "admin") {
        Alert.alert(
          "Access Denied",
          "This account does not have administrator access.",
        );

        return;
      }

      // =================================================
      // SAVE AUTH
      // =================================================

      await saveAuth(data.token, data.user);

      // =================================================
      // ADMIN DASHBOARD
      // =================================================

      router.replace("/admin-dashboard");
    } catch (error) {
      console.error("Admin Login Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server. Please check whether the backend is running and the mobile is connected to the same Wi-Fi.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BACK → INDEX
  // =====================================================

  const goToHome = () => {
    if (!loading) {
      router.replace("/");
    }
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
              BACK
          ================================================= */}

          <TouchableOpacity
            style={styles.backButton}
            onPress={goToHome}
            disabled={loading}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          {/* =================================================
              HERO
          ================================================= */}

          <Image
            source={require("./images/tirupurprofile.jpeg")}
            style={styles.headerImage}
            resizeMode="cover"
          />

          {/* =================================================
              TITLE
          ================================================= */}

          <Text style={styles.title}>Admin Login</Text>

          <Text style={styles.subtitle}>Tiruppur North Administration</Text>

          <Text style={styles.tamilSubtitle}>நிர்வாகி உள்நுழைவு</Text>

          {/* =================================================
              BADGE
          ================================================= */}

          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeIcon}>🔐</Text>

            <View style={styles.adminBadgeContent}>
              <Text style={styles.adminBadgeTitle}>Authorized Access</Text>

              <Text style={styles.adminBadgeText}>
                Admin account மட்டும் இந்த பகுதியில் நுழைய முடியும்.
              </Text>
            </View>
          </View>

          {/* =================================================
              MOBILE
          ================================================= */}

          <Text style={styles.label}>Admin Mobile Number</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>📱</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter admin mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ""))}
              editable={!loading}
            />
          </View>

          {/* =================================================
              PASSWORD
          ================================================= */}

          <Text style={styles.label}>Password</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔑</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter admin password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}>
              <Text style={styles.showPassword}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* =================================================
              LOGIN
          ================================================= */}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginText}>Admin Login</Text>

                <Text style={styles.loginArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          {/* =================================================
              FOOTER
          ================================================= */}

          <Text style={styles.footerText}>Authorized administrators only</Text>

          {/* =================================================
              USER LOGIN
          ================================================= */}

          <TouchableOpacity
            style={styles.userLoginButton}
            onPress={goToHome}
            disabled={loading}>
            <Text style={styles.userLoginText}>← User Login</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  backText: {
    fontSize: 32,
    lineHeight: 35,
    color: "#0F172A",
  },

  headerImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    marginTop: 18,
  },

  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 18,
  },

  subtitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#475569",
    marginTop: 6,
  },

  tamilSubtitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  adminBadge: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 14,
    marginTop: 28,
    marginBottom: 25,
  },

  adminBadgeIcon: {
    fontSize: 25,
  },

  adminBadgeContent: {
    flex: 1,
    marginLeft: 10,
  },

  adminBadgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#075985",
  },

  adminBadgeText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 17,
    marginTop: 3,
  },

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
  },

  inputContainer: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  inputIcon: {
    fontSize: 19,
    marginRight: 10,
  },

  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0F172A",
  },

  showPassword: {
    fontSize: 12,
    fontWeight: "700",
    color: "#075985",
  },

  loginButton: {
    height: 56,
    borderRadius: 15,
    backgroundColor: "#075985",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  loginArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginLeft: 10,
  },

  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 18,
  },

  userLoginButton: {
    alignItems: "center",
    marginTop: 18,
  },

  userLoginText: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "700",
  },
});
