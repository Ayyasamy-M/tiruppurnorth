import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  API_ENDPOINTS,
  authHeaders,
  clearAuth,
  getStoredUser,
  saveAuth,
} from "../config/api";

export default function ProfileScreen() {
  const params = useLocalSearchParams();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "";

  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [loggingOut, setLoggingOut] = useState(false);

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const headers = await authHeaders();

      const response = await fetch(API_ENDPOINTS.profile, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (response.ok && data?.success && data?.user) {
        setUser(data.user);

        /*
         * Keep latest profile data in local storage.
         */
        const token = headers.Authorization?.replace("Bearer ", "");

        if (token) {
          await saveAuth(token, data.user);
        }
      } else {
        /*
         * Fallback to locally stored user
         * if API request fails.
         */
        const storedUser = await getStoredUser();

        setUser(storedUser);
      }
    } catch (error) {
      console.error("Profile Load Error:", error);

      /*
       * Offline / API failure fallback.
       */
      try {
        const storedUser = await getStoredUser();

        setUser(storedUser);
      } catch (storageError) {
        console.error("Stored User Error:", storageError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Refresh profile every time screen gets focus.
  |--------------------------------------------------------------------------
  */

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  /* =====================================================
     LOGOUT
  ===================================================== */

  const performLogout = useCallback(async () => {
    try {
      setLoggingOut(true);

      const headers = await authHeaders();

      try {
        await fetch(API_ENDPOINTS.logout, {
          method: "POST",
          headers,
        });
      } catch (error) {
        console.log("Logout API Error:", error);
      }

      await clearAuth();

      router.replace("/login");
    } catch (error) {
      console.error("Logout Error:", error);

      await clearAuth();

      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  }, [loggingOut, performLogout]);

  /* =====================================================
     ANDROID BACK
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, []),
  );

  /* =====================================================
     EDIT PROFILE
  ===================================================== */

  const handleEditProfile = () => {
    router.push({
      pathname: "/edit-profile",
      params: {
        ward: wardNumber.toString(),
      },
    });
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <ActivityIndicator size="large" color="#DC2626" />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  /* =====================================================
     USER DATA
  ===================================================== */

  const userName = user?.name || "User";

  const firstLetter = userName.charAt(0).toUpperCase();

  const userWard = user?.ward || wardNumber || "";

  const photoUrl = user?.photoUrl || "";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Profile</Text>

          <Text style={styles.headerSubtitle}>உங்கள் சுயவிவரம்</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image
                source={{
                  uri: photoUrl,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{firstLetter}</Text>
            )}
          </View>

          <Text style={styles.profileName}>{userName}</Text>

          <Text style={styles.profileRole}>
            {user?.role === "admin" ? "Administrator" : "Registered Citizen"}
          </Text>

          {userWard ? (
            <View style={styles.wardBadge}>
              <Text style={styles.wardBadgeText}>Ward {userWard}</Text>
            </View>
          ) : (
            <View style={[styles.wardBadge, styles.wardBadgeEmpty]}>
              <Text style={[styles.wardBadgeText, styles.wardBadgeEmptyText]}>
                Ward Not Assigned
              </Text>
            </View>
          )}
        </View>

        {/* =================================================
            PERSONAL DETAILS
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <Text style={styles.sectionTamil}>தனிப்பட்ட தகவல்கள்</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow
            icon="👤"
            label="Full Name"
            value={user?.name || "Not provided"}
          />

          <DetailRow
            icon="📱"
            label="Mobile Number"
            value={user?.mobile || user?.phone || "Not provided"}
          />

          <DetailRow
            icon="📧"
            label="Email"
            value={user?.email || "Not provided"}
          />

          <DetailRow
            icon="🏠"
            label="Address"
            value={user?.address || "Not provided"}
          />

          <DetailRow
            icon="🗳️"
            label="Ward"
            value={userWard ? `Ward ${userWard}` : "Not assigned"}
            last
          />
        </View>

        {/* =================================================
            EDIT PROFILE
        ================================================= */}

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
          activeOpacity={0.8}>
          <Text style={styles.editButtonIcon}>✎</Text>

          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* =================================================
            ACCOUNT INFO
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Text style={styles.sectionTamil}>கணக்கு தகவல்கள்</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text>🔒</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Ward Assignment</Text>

            <Text style={styles.infoDescription}>
              உங்கள் Ward நிர்வாகத்தால் ஒதுக்கப்பட்டுள்ளது. இதை Profile-ல் மாற்ற
              முடியாது.
            </Text>
          </View>
        </View>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}>
          {loggingOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              <Text style={styles.logoutIcon}>↪</Text>

              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>Tiruppur Smart City</Text>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* =================================================
          BOTTOM NAV
      ================================================= */}

      <View style={styles.bottomNav}>
        {/* HOME */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.replace({
              pathname: "/ward-home",
              params: {
                ward: userWard.toString(),
              },
            })
          }
          activeOpacity={0.7}>
          <Text style={styles.navIcon}>⌂</Text>

          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        {/* COMPLAINTS */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/my-complaints",
              params: {
                ward: userWard.toString(),
              },
            })
          }
          activeOpacity={0.7}>
          <Text style={styles.navIcon}>✓</Text>

          <Text style={styles.navText}>Complaints</Text>
        </TouchableOpacity>

        {/* ME */}

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <View
            style={[styles.profileNavCircle, styles.profileNavCircleActive]}>
            <Text style={[styles.profileNavText, styles.profileNavTextActive]}>
              {firstLetter}
            </Text>
          </View>

          <Text style={[styles.navText, styles.navTextActive]}>Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* =====================================================
   DETAIL ROW
===================================================== */

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <View style={styles.detailIcon}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  header: {
    height: 76,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 32,
    color: "#0F172A",
    lineHeight: 36,
  },

  headerContent: {
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#DC2626",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 14,
    textAlign: "center",
  },

  profileRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  wardBadge: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  wardBadgeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },

  wardBadgeEmpty: {
    backgroundColor: "#F1F5F9",
  },

  wardBadgeEmptyText: {
    color: "#64748B",
  },

  sectionHeader: {
    marginBottom: 13,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionTamil: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  detailRowLast: {
    borderBottomWidth: 0,
  },

  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  detailIconText: {
    fontSize: 18,
  },

  detailContent: {
    flex: 1,
    marginLeft: 13,
  },

  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 3,
  },

  editButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 28,
  },

  editButtonIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    marginRight: 8,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  infoDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },

  logoutButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },

  logoutIcon: {
    color: "#DC2626",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },

  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },

  bottomSpace: {
    height: 30,
  },

  bottomNav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },

  navItem: {
    flex: 1,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    fontSize: 22,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 3,
  },

  navText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  navTextActive: {
    color: "#DC2626",
    fontWeight: "800",
  },

  profileNavCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  profileNavCircleActive: {
    backgroundColor: "#FEE2E2",
  },

  profileNavText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "900",
  },

  profileNavTextActive: {
    color: "#DC2626",
  },
});
