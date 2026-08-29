import { router } from "expo-router";
import { useEffect } from "react";
import {
  BackHandler,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  // =====================================================
  // ANDROID BACK BUTTON
  //
  // index.tsx தான் root/home page.
  //
  // Android Back press:
  // → Stay on index.tsx
  // → No logout popup
  // → No navigation
  // → No action
  // =====================================================

  useEffect(() => {
    const handleBackPress = () => {
      console.log("📱 Android Back pressed on index.tsx");
      console.log("🚫 No action - already on Home");

      // IMPORTANT:
      // true = Android default back navigation stop
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    console.log("📱 index.tsx BackHandler ENABLED");

    return () => {
      subscription.remove();

      console.log("📱 index.tsx BackHandler DISABLED");
    };
  }, []);

  // =====================================================
  // GO TO LOGIN
  // =====================================================

  const goToLogin = () => {
    console.log("➡️ Going to Login");

    router.push("/login");
  };

  // =====================================================
  // GO TO REGISTER
  // =====================================================

  const goToRegister = () => {
    console.log("➡️ Going to Register");

    router.push("/register");
  };

  // =====================================================
  // GO TO ADMIN LOGIN
  // =====================================================

  const goToAdminLogin = () => {
    console.log("➡️ Going to Admin Login");

    router.push("/admin-login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* =================================================
            HERO IMAGE
        ================================================= */}

        <View style={styles.heroImageContainer}>
          <Image
            source={require("./images/tirupurprofile.jpeg")}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>திருப்பூர் வடக்கு</Text>

            <Text style={styles.imageOverlaySubText}>Tiruppur North</Text>
          </View>
        </View>

        {/* =================================================
            TITLE
        ================================================= */}

        <Text style={styles.title}>Tiruppur North</Text>

        {/* =================================================
            SUBTITLE
        ================================================= */}

        <Text style={styles.subtitle}>
          உங்கள் வார்டு{"\n"}
          உங்கள் தகவல்
        </Text>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <Text style={styles.description}>
          உங்கள் வார்டில் நடைபெறும் நிகழ்வுகள்,
          {"\n"}
          தகவல்கள் மற்றும் பொதுமக்கள் குறைகளை
          {"\n"}
          ஒரே இடத்தில் தெரிந்துகொள்ளுங்கள்.
        </Text>

        {/* =================================================
            LOGIN + REGISTER
        ================================================= */}

        <View style={styles.buttonContainer}>
          {/* LOGIN */}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={goToLogin}
            activeOpacity={0.7}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          {/* REGISTER */}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={goToRegister}
            activeOpacity={0.7}>
            <Text style={styles.registerText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            ADMIN LOGIN
        ================================================= */}

        <TouchableOpacity
          style={styles.adminButton}
          onPress={goToAdminLogin}
          activeOpacity={0.7}>
          <Text style={styles.adminIcon}>🔐</Text>

          <Text style={styles.adminText}>Admin Login</Text>
        </TouchableOpacity>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Text style={styles.bottomText}>Tiruppur North Constituency</Text>
      </View>
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

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // =====================================================
  // HERO IMAGE
  // =====================================================

  heroImageContainer: {
    width: "100%",
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,

    elevation: 8,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,

    paddingHorizontal: 18,
    paddingVertical: 14,

    backgroundColor: "rgba(0,0,0,0.45)",
  },

  imageOverlayText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },

  imageOverlaySubText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  // =====================================================
  // TITLE
  // =====================================================

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },

  // =====================================================
  // SUBTITLE
  // =====================================================

  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#075985",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 15,
  },

  // =====================================================
  // DESCRIPTION
  // =====================================================

  description: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },

  // =====================================================
  // BUTTON CONTAINER
  // =====================================================

  buttonContainer: {
    width: "100%",
    gap: 12,
  },

  // =====================================================
  // LOGIN
  // =====================================================

  loginButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#075985",
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    elevation: 3,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // =====================================================
  // REGISTER
  // =====================================================

  registerButton: {
    width: "100%",
    height: 54,

    backgroundColor: "#FFFFFF",

    borderWidth: 1.5,
    borderColor: "#075985",

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",
  },

  registerText: {
    color: "#075985",
    fontSize: 17,
    fontWeight: "700",
  },

  // =====================================================
  // ADMIN
  // =====================================================

  adminButton: {
    marginTop: 20,

    height: 46,
    minWidth: 150,

    paddingHorizontal: 20,

    borderRadius: 23,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#CBD5E1",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    elevation: 2,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  adminIcon: {
    fontSize: 16,
    marginRight: 7,
  },

  adminText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
  },

  // =====================================================
  // FOOTER
  // =====================================================

  bottomText: {
    position: "absolute",

    bottom: 18,

    color: "#94A3B8",
    fontSize: 12,
  },
});
