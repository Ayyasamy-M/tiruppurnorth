// src/app/profile.tsx

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import {
  API_BASE_URL,
  API_ENDPOINTS,
  authHeaders,
  clearAuth,
  getStoredUser,
  saveAuth,
} from "../config/api";

/* =====================================================
   TYPES
===================================================== */

type User = {
  _id?: string;
  id?: string;

  name?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  address?: string;

  ward?: string | number;

  role?: "user" | "admin" | "ward_member" | string;

  photo?: string;
  photoUrl?: string;
};

/* =====================================================
   PHOTO URL
===================================================== */

const getPhotoUrl = (rawPhoto?: string) => {
  if (!rawPhoto) {
    return "";
  }

  const photo = String(rawPhoto).trim();

  if (!photo) {
    return "";
  }

  if (photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }

  if (photo.startsWith("/")) {
    return `${API_BASE_URL}${photo}`;
  }

  return `${API_BASE_URL}/${photo}`;
};

/* =====================================================
   SCREEN
===================================================== */

export default function ProfileScreen() {
  const params = useLocalSearchParams();

  const { width } = useWindowDimensions();

  const isSmallMobile = width < 380;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const maxContentWidth = isDesktop ? 900 : isTablet ? 760 : undefined;

  /* =====================================================
     WARD
  ===================================================== */

  const wardNumber = useMemo(() => {
    const wardParam = Array.isArray(params.ward) ? params.ward[0] : params.ward;

    return wardParam?.toString() || "";
  }, [params.ward]);

  /* =====================================================
     STATE
  ===================================================== */

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [loggingOut, setLoggingOut] = useState(false);

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const headers = await authHeaders();

      /* =================================================
         NO AUTH HEADER
      ================================================= */

      if (!headers?.Authorization) {
        const storedUser = await getStoredUser();

        if (storedUser) {
          setUser(storedUser);
        } else {
          Alert.alert(
            "Login Required",
            "Please login to view your profile.",
            [
              {
                text: "Login",
                onPress: () => router.replace("/"),
              },
            ],
            {
              cancelable: false,
            },
          );
        }

        return;
      }

      /* =================================================
         GET PROFILE
      ================================================= */

      const response = await fetch(API_ENDPOINTS.profile, {
        method: "GET",
        headers,
      });

      const rawText = await response.text();

      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        console.error("Profile JSON Parse Error:", parseError);
      }

      console.log("PROFILE API STATUS:", response.status);
      console.log("PROFILE API RESPONSE:", data);

      /* =================================================
         SESSION EXPIRED
      ================================================= */

      if (response.status === 401 || response.status === 403) {
        await clearAuth();

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "Login",
              onPress: () => router.replace("/"),
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      /* =================================================
         SUCCESS
      ================================================= */

      if (response.ok && data?.success && data?.user) {
        const latestUser = data.user as User;

        setUser(latestUser);

        const token = headers.Authorization.replace("Bearer ", "").trim();

        if (token) {
          await saveAuth(token, latestUser);
        }

        return;
      }

      /* =================================================
         API FAILED → LOCAL FALLBACK
      ================================================= */

      const storedUser = await getStoredUser();

      if (storedUser) {
        setUser(storedUser);
      } else {
        throw new Error(data?.message || "Unable to load your profile.");
      }
    } catch (error: any) {
      console.error("Profile Load Error:", error);

      try {
        const storedUser = await getStoredUser();

        if (storedUser) {
          setUser(storedUser);
          return;
        }
      } catch (storageError) {
        console.error("Stored User Error:", storageError);
      }

      Alert.alert(
        "Unable to Load Profile",
        error?.message || "Something went wrong while loading your profile.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* =====================================================
     REFRESH ON FOCUS
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  /* =====================================================
     ANDROID BACK
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (loggingOut) {
          return true;
        }

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
    }, [loggingOut]),
  );

  /* =====================================================
     LOGOUT
  ===================================================== */

  const performLogout = useCallback(async () => {
    try {
      setLoggingOut(true);

      /* =================================================
         LOGOUT API
      ================================================= */

      try {
        const headers = await authHeaders();

        if (headers?.Authorization) {
          await fetch(API_ENDPOINTS.logout, {
            method: "POST",
            headers,
          });
        }
      } catch (error) {
        console.log("Logout API Error:", error);
      }

      /* =================================================
         CLEAR LOCAL SESSION
      ================================================= */

      await clearAuth();

      /* =================================================
         LOGOUT → HOME
      ================================================= */

      router.replace("/");
    } catch (error) {
      console.error("Logout Error:", error);

      await clearAuth();

      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: performLogout,
        },
      ],
      {
        cancelable: true,
      },
    );
  }, [loggingOut, performLogout]);

  /* =====================================================
     EDIT PROFILE
  ===================================================== */

  const handleEditProfile = useCallback(() => {
    router.push({
      pathname: "/edit-profile",
      params: {
        ward: user?.ward?.toString() || wardNumber,
      },
    });
  }, [user?.ward, wardNumber]);

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleHome = useCallback(() => {
    const userWard = user?.ward?.toString() || wardNumber;

    router.replace({
      pathname: "/ward-home",
      params: {
        ward: userWard,
      },
    });
  }, [user?.ward, wardNumber]);

  const handleComplaints = useCallback(() => {
    const userWard = user?.ward?.toString() || wardNumber;

    router.push({
      pathname: "/my-complaints",
      params: {
        ward: userWard,
      },
    });
  }, [user?.ward, wardNumber]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <ActivityIndicator size="large" color="#D71920" />

        <Text style={styles.loadingText}>Loading profile...</Text>

        <Text style={styles.loadingTamil}>
          உங்கள் சுயவிவரம் ஏற்றப்படுகிறது...
        </Text>
      </SafeAreaView>
    );
  }

  /* =====================================================
     USER DATA
  ===================================================== */

  const userName = user?.name?.trim() || "User";

  const firstLetter = userName.charAt(0).toUpperCase() || "U";

  const userWard = user?.ward?.toString() || wardNumber;

  const rawPhoto = user?.photoUrl || user?.photo || "";

  const photoUrl = getPhotoUrl(rawPhoto);

  const isAdmin = user?.role === "admin";

  const roleLabel = isAdmin
    ? "Administrator"
    : user?.role === "ward_member"
      ? "Ward Member"
      : "Registered Citizen";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View
          style={[
            styles.headerInner,
            maxContentWidth
              ? {
                  width: "100%",
                  maxWidth: maxContentWidth,
                  alignSelf: "center",
                }
              : null,
          ]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loggingOut}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text
              style={[
                styles.headerTitle,
                isSmallMobile && styles.headerTitleSmall,
              ]}>
              My Profile
            </Text>

            <Text style={styles.headerSubtitle}>உங்கள் சுயவிவரம்</Text>
          </View>

          <View style={styles.headerBrand}>
            <Text style={styles.headerBrandText}>TSC</Text>
          </View>
        </View>
      </View>

      {/* =================================================
          MAIN SCROLL
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          maxContentWidth
            ? {
                width: "100%",
                maxWidth: maxContentWidth,
                alignSelf: "center",
              }
            : null,
        ]}
        showsVerticalScrollIndicator={false}>
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {photoUrl ? (
                <Image
                  source={{
                    uri: photoUrl,
                  }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{firstLetter}</Text>
              )}
            </View>

            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          </View>

          <Text
            style={[
              styles.profileName,
              isSmallMobile && styles.profileNameSmall,
            ]}
            numberOfLines={2}>
            {userName}
          </Text>

          <Text style={styles.profileRole}>{roleLabel}</Text>

          {userWard ? (
            <View style={styles.wardBadge}>
              <Text style={styles.wardBadgeIcon}>⌂</Text>

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
            locked
          />
        </View>

        {/* =================================================
            EDIT PROFILE
        ================================================= */}

        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
          disabled={loggingOut}
          activeOpacity={0.8}>
          <View style={styles.editButtonIconBox}>
            <Text style={styles.editButtonIcon}>✎</Text>
          </View>

          <View style={styles.editButtonContent}>
            <Text style={styles.editButtonText}>Edit Profile</Text>

            <Text style={styles.editButtonSubtext}>
              Update your personal details & photo
            </Text>
          </View>

          <Text style={styles.editButtonArrow}>›</Text>
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
            <Text style={styles.infoIconText}>🔒</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Ward Assignment</Text>

            <Text style={styles.infoDescription}>
              உங்கள் Ward நிர்வாகத்தால் ஒதுக்கப்பட்டுள்ளது. இதை Profile-ல் மாற்ற
              முடியாது.
            </Text>

            <View style={styles.lockedTag}>
              <Text style={styles.lockedTagText}>🔒 Locked</Text>
            </View>
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
            <>
              <ActivityIndicator color="#D71920" />

              <Text style={styles.logoutLoadingText}>Logging out...</Text>
            </>
          ) : (
            <>
              <Text style={styles.logoutIcon}>↪</Text>

              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>Tiruppur Smart City</Text>

        <Text style={styles.footerTamil}>
          பொதுமக்கள் சேவைக்கான டிஜிட்டல் தளம்
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* =================================================
          BOTTOM NAVIGATION
      ================================================= */}

      <View style={styles.bottomNav}>
        {/* HOME */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={handleHome}
          disabled={loggingOut}
          activeOpacity={0.7}>
          <View style={styles.navIconWrapper}>
            <Text style={styles.navIcon}>⌂</Text>
          </View>

          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        {/* COMPLAINTS */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={handleComplaints}
          disabled={loggingOut}
          activeOpacity={0.7}>
          <View style={styles.navIconWrapper}>
            <Text style={styles.navIcon}>✓</Text>
          </View>

          <Text style={styles.navText}>Complaints</Text>
        </TouchableOpacity>

        {/* ME */}

        <TouchableOpacity style={styles.navItem} disabled activeOpacity={1}>
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
  locked = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
  locked?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <View style={styles.detailIcon}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text
          style={[styles.detailValue, locked && styles.detailValueLocked]}
          numberOfLines={3}>
          {value}
        </Text>
      </View>

      {locked ? (
        <View style={styles.rowLock}>
          <Text style={styles.rowLockText}>🔒</Text>
        </View>
      ) : null}
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  /* ===================================================
     LOADING
  =================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 25,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  loadingTamil: {
    marginTop: 5,
    fontSize: 11,
    color: "#94A3B8",
  },

  /* ===================================================
     HEADER
  =================================================== */

  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  headerInner: {
    height: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 31,
    lineHeight: 34,
    color: "#0F172A",
  },

  headerContent: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  headerTitleSmall: {
    fontSize: 18,
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  headerBrand: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
  },

  headerBrandText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* ===================================================
     SCROLL
  =================================================== */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  /* ===================================================
     PROFILE CARD
  =================================================== */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 27,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#FFF7ED",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#D71920",
  },

  verifiedBadge: {
    position: "absolute",
    right: -2,
    bottom: 3,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#D71920",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginTop: 14,
    textAlign: "center",
  },

  profileNameSmall: {
    fontSize: 20,
  },

  profileRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  wardBadge: {
    marginTop: 12,
    backgroundColor: "#FFF4D6",
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  wardBadgeIcon: {
    fontSize: 13,
    color: "#A16207",
    marginRight: 5,
  },

  wardBadgeText: {
    color: "#A16207",
    fontSize: 12,
    fontWeight: "900",
  },

  wardBadgeEmpty: {
    backgroundColor: "#F1F5F9",
  },

  wardBadgeEmptyText: {
    color: "#64748B",
  },

  /* ===================================================
     SECTION
  =================================================== */

  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  sectionTamil: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  /* ===================================================
     DETAILS
  =================================================== */

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },

  detailRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  detailRowLast: {
    borderBottomWidth: 0,
  },

  detailIcon: {
    width: 43,
    height: 43,
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
    marginRight: 8,
  },

  detailLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
  },

  detailValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
    marginTop: 3,
  },

  detailValueLocked: {
    color: "#64748B",
  },

  rowLock: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  rowLockText: {
    fontSize: 11,
  },

  /* ===================================================
     EDIT BUTTON
  =================================================== */

  editButton: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#D71920",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 27,
    shadowColor: "#D71920",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  editButtonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
  },

  editButtonIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  editButtonContent: {
    flex: 1,
    marginLeft: 11,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  editButtonSubtext: {
    color: "#FEE2E2",
    fontSize: 10,
    marginTop: 2,
  },

  editButtonArrow: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "400",
    marginLeft: 8,
  },

  /* ===================================================
     ACCOUNT INFO
  =================================================== */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  infoIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#FFF4D6",
    alignItems: "center",
    justifyContent: "center",
  },

  infoIconText: {
    fontSize: 18,
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  infoDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },

  lockedTag: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },

  lockedTagText: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "800",
  },

  /* ===================================================
     LOGOUT
  =================================================== */

  logoutButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },

  logoutIcon: {
    color: "#D71920",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },

  logoutText: {
    color: "#D71920",
    fontSize: 15,
    fontWeight: "900",
  },

  logoutLoadingText: {
    color: "#D71920",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 9,
  },

  /* ===================================================
     FOOTER
  =================================================== */

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 20,
  },

  footerTamil: {
    textAlign: "center",
    color: "#CBD5E1",
    fontSize: 10,
    marginTop: 3,
  },

  bottomSpace: {
    height: 30,
  },

  /* ===================================================
     BOTTOM NAV
  =================================================== */

  bottomNav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === "ios" ? 5 : 1,
  },

  navItem: {
    flex: 1,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrapper: {
    width: 32,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    fontSize: 21,
    color: "#94A3B8",
    fontWeight: "700",
  },

  navText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 2,
  },

  navTextActive: {
    color: "#D71920",
    fontWeight: "900",
  },

  profileNavCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
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
    color: "#D71920",
  },
});
