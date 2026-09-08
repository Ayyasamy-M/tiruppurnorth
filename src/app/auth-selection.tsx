// src/app/auth-selection.tsx

import { router } from "expo-router";
import { useEffect } from "react";

import {
  BackHandler,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const RED = "#D71920";
const YELLOW = "#FFD400";
const BLACK = "#111111";
const WHITE = "#FFFFFF";
const LIGHT = "#F7F9FC";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";

export default function AuthSelectionScreen() {
  /* =====================================================
     ANDROID BACK
     Auth Selection → Home
  ===================================================== */

  useEffect(() => {
    const handleBackPress = () => {
      console.log("📱 Android Back pressed on auth-selection");
      router.replace("/");
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const goToHome = () => {
    router.replace("/");
  };

  const goToUserLogin = () => {
    console.log("➡️ Auth Selection → User Login");
    router.push("/login");
  };

  const goToRegister = () => {
    console.log("➡️ Auth Selection → Register");
    router.push("/register");
  };

  const goToAdminLogin = () => {
    console.log("➡️ Auth Selection → Admin Login");
    router.push("/admin-login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={LIGHT} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}>
        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={goToHome}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          {/* LOGO */}

          <View style={styles.logo}>
            <View style={styles.logoRed} />
            <View style={styles.logoYellow} />
          </View>

          <Text style={styles.smallTitle}>மக்கள் சேவை</Text>

          <Text style={styles.mainTitle}>TIRUPPUR SMART CITY</Text>

          <View style={styles.titleLine}>
            <View style={styles.titleLineRed} />
            <View style={styles.titleLineYellow} />
          </View>

          <Text style={styles.tamilTitle}>எங்களுடன் இணையுங்கள்</Text>

          <Text style={styles.description}>
            உங்கள் நகரத்திற்கான சேவையைத் தொடர கீழே உள்ள விருப்பங்களில் ஒன்றைத்
            தேர்வு செய்யுங்கள்.
          </Text>
        </View>

        {/* =================================================
            OPTIONS
        ================================================= */}

        <View style={styles.optionsContainer}>
          {/* =================================================
              USER LOGIN
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToUserLogin}>
            <View style={styles.userIconBox}>
              <Text style={styles.iconText}>👤</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Login</Text>

              <Text style={styles.optionTamil}>பயனர் உள்நுழைவு</Text>

              <Text style={styles.optionDescription}>
                ஏற்கனவே கணக்கு வைத்துள்ளவர்கள் Login செய்யலாம்.
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </Pressable>

          {/* =================================================
              REGISTER
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToRegister}>
            <View style={styles.registerIconBox}>
              <Text style={styles.iconText}>📝</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Create Account</Text>

              <Text style={styles.optionTamil}>
                புதிய கணக்கு உருவாக்குங்கள்
              </Text>

              <Text style={styles.optionDescription}>
                புதிய பயனர்கள் தங்கள் கணக்கை இங்கே உருவாக்கலாம்.
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </Pressable>

          {/* =================================================
              ADMIN LOGIN
          ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.adminCard,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToAdminLogin}>
            <View style={styles.adminIconBox}>
              <Text style={styles.iconText}>🔐</Text>
            </View>

            <View style={styles.optionContent}>
              <View style={styles.adminTitleRow}>
                <Text style={styles.adminTitle}>Admin Login</Text>

                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              </View>

              <Text style={styles.adminTamil}>நிர்வாகி உள்நுழைவு</Text>

              <Text style={styles.adminDescription}>
                அங்கீகரிக்கப்பட்ட நிர்வாகிகள் மட்டும் இங்கே Login செய்யலாம்.
              </Text>
            </View>

            <View style={styles.adminArrowCircle}>
              <Text style={styles.adminArrowText}>→</Text>
            </View>
          </Pressable>
        </View>

        {/* =================================================
            INFO
        ================================================= */}

        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Text style={styles.infoIcon}>i</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>பாதுகாப்பான உள்நுழைவு</Text>

            <Text style={styles.infoText}>
              உங்கள் கணக்கு தொடர்பான தகவல்களை பாதுகாப்பாக பயன்படுத்துங்கள்.
            </Text>
          </View>
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <View style={styles.footer}>
          <View style={styles.footerAccent}>
            <View style={styles.footerRed} />
            <View style={styles.footerYellow} />
          </View>

          <Text style={styles.footerTitle}>TIRUPPUR SMART CITY</Text>

          <Text style={styles.footerSubtitle}>
            நமது நகரம் • நமது மக்கள் • நமது சேவை
          </Text>

          <Text style={styles.footerCopyright}>© 2026 SSS SureshKumar</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  container: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 35,
  },

  /* =====================================================
     BACK
  ===================================================== */

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backArrow: {
    color: BLACK,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -4,
  },

  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 27,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 19,
    overflow: "hidden",
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  logoRed: {
    flex: 1,
    backgroundColor: RED,
  },

  logoYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  smallTitle: {
    color: RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  mainTitle: {
    color: BLACK,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  titleLine: {
    width: 55,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
    marginTop: 11,
  },

  titleLineRed: {
    flex: 1,
    backgroundColor: RED,
  },

  titleLineYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  tamilTitle: {
    color: RED,
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 15,
  },

  description: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 350,
  },

  /* =====================================================
     OPTIONS
  ===================================================== */

  optionsContainer: {
    gap: 13,
  },

  optionCard: {
    width: "100%",
    minHeight: 108,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  /* =====================================================
     ICONS
  ===================================================== */

  userIconBox: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    flexShrink: 0,
  },

  registerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: "#FFF8D9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    flexShrink: 0,
  },

  adminIconBox: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    flexShrink: 0,
  },

  iconText: {
    fontSize: 25,
  },

  /* =====================================================
     CONTENT
  ===================================================== */

  optionContent: {
    flex: 1,
    minWidth: 0,
  },

  optionTitle: {
    color: BLACK,
    fontSize: 17,
    fontWeight: "900",
  },

  optionTamil: {
    color: RED,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  optionDescription: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "600",
    marginTop: 4,
  },

  /* =====================================================
     ARROW
  ===================================================== */

  arrowCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },

  arrowText: {
    color: RED,
    fontSize: 21,
    fontWeight: "900",
  },

  /* =====================================================
     ADMIN CARD
  ===================================================== */

  adminCard: {
    width: "100%",
    minHeight: 108,
    backgroundColor: BLACK,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BLACK,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  adminTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  adminTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "900",
  },

  adminBadge: {
    backgroundColor: RED,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 7,
  },

  adminBadgeText: {
    color: WHITE,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  adminTamil: {
    color: YELLOW,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  adminDescription: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "600",
    marginTop: 4,
  },

  adminArrowCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },

  adminArrowText: {
    color: YELLOW,
    fontSize: 21,
    fontWeight: "900",
  },

  /* =====================================================
     INFO
  ===================================================== */

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFF9D9",
    borderWidth: 1,
    borderColor: "#F0DD75",
    borderRadius: 17,
    padding: 14,
    marginTop: 21,
  },

  infoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  infoIcon: {
    color: BLACK,
    fontSize: 18,
    fontWeight: "900",
  },

  infoContent: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    color: BLACK,
    fontSize: 12,
    fontWeight: "900",
  },

  infoText: {
    color: "#6B5B00",
    fontSize: 9,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 3,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    alignItems: "center",
    marginTop: 30,
    paddingTop: 23,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  footerAccent: {
    width: 55,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12,
  },

  footerRed: {
    flex: 1,
    backgroundColor: RED,
  },

  footerYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  footerTitle: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  footerSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 5,
  },

  footerCopyright: {
    color: "#94A3B8",
    fontSize: 8,
    marginTop: 9,
  },
});
