import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_ENDPOINTS, authHeaders } from "@/config/api";

/* =====================================================
   TYPES
===================================================== */

type DashboardStats = {
  totalUsers: number;
  totalWards: number;
  totalWardMembers: number;
  totalComplaints: number;
};

type AdminUser = {
  _id?: string;
  id?: string;
  name?: string;
  mobile?: string;
  ward?: string;
  role?: string;
};

/* =====================================================
   SCREEN
===================================================== */

export default function AdminDashboardScreen() {
  /* =====================================================
     STATE
  ===================================================== */

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalWards: 0,
    totalWardMembers: 0,
    totalComplaints: 0,
  });

  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  /*
    Prevent multiple logout popups.
  */
  const logoutAlertVisibleRef = useRef(false);

  /*
    Prevent logout from running multiple times.
  */
  const loggingOutRef = useRef(false);

  /* =====================================================
     LOAD ADMIN USER
  ===================================================== */

  const loadAdminUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("adminUser");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        setAdmin(parsedUser);

        console.log("✅ Admin user loaded:", parsedUser);
      } else {
        console.log("⚠️ Admin user not found in storage");
      }
    } catch (error) {
      console.error("Load Admin User Error:", error);
    }
  }, []);

  /* =====================================================
     CLEAR ADMIN SESSION
  ===================================================== */

  const clearAdminSession = useCallback(async () => {
    try {
      /*
        Clear all authentication/session data.
      */

      await AsyncStorage.multiRemove([
        "token",
        "user",
        "adminToken",
        "adminUser",
      ]);

      /*
        Verify storage was cleared.
      */

      const adminToken = await AsyncStorage.getItem("adminToken");
      const adminUser = await AsyncStorage.getItem("adminUser");

      console.log("====================================");
      console.log("🔐 ADMIN SESSION CLEARED");
      console.log("adminToken:", adminToken ? "STILL EXISTS" : "REMOVED");
      console.log("adminUser:", adminUser ? "STILL EXISTS" : "REMOVED");
      console.log("====================================");
    } catch (error) {
      console.error("Clear Admin Session Error:", error);
    }
  }, []);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const performLogout = useCallback(async () => {
    /*
      Prevent duplicate logout.
    */

    if (loggingOutRef.current) {
      console.log("⚠️ Logout already in progress");
      return;
    }

    loggingOutRef.current = true;

    try {
      console.log("====================================");
      console.log("🚪 ADMIN LOGOUT STARTED");
      console.log("====================================");

      /*
        STEP 1
        Clear admin session.
      */

      await clearAdminSession();

      /*
        STEP 2
        Clear local state.
      */

      setAdmin(null);

      /*
        STEP 3
        IMPORTANT

        DO NOT USE:

        router.push("/admin-login")

        DO NOT USE:

        router.replace("/admin-login")

        We want to go directly to index.tsx.
      */

      console.log("➡️ Going to index.tsx");

      router.replace("/");
    } catch (error) {
      console.error("Logout Error:", error);

      /*
        Even if something fails,
        go directly to index.tsx.
      */

      router.replace("/");
    } finally {
      /*
        Allow logout again after a small delay.
      */

      setTimeout(() => {
        loggingOutRef.current = false;
      }, 500);
    }
  }, [clearAdminSession]);

  /* =====================================================
     LOGOUT CONFIRMATION
  ===================================================== */

  const showLogoutConfirmation = useCallback(() => {
    /*
      Don't show another popup if one is
      already visible.
    */

    if (logoutAlertVisibleRef.current) {
      console.log("⚠️ Logout popup already visible");
      return;
    }

    /*
      Don't show popup while logout is processing.
    */

    if (loggingOutRef.current) {
      console.log("⚠️ Logout already processing");
      return;
    }

    logoutAlertVisibleRef.current = true;

    Alert.alert(
      "Logout",
      "Are you sure you want to logout from admin panel?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            logoutAlertVisibleRef.current = false;

            console.log("❌ Logout cancelled");
          },
        },

        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            logoutAlertVisibleRef.current = false;

            await performLogout();
          },
        },
      ],
      {
        /*
          If Android closes the popup using
          Android back button, reset the flag.
        */

        cancelable: true,

        onDismiss: () => {
          logoutAlertVisibleRef.current = false;
        },
      },
    );
  }, [performLogout]);

  /* =====================================================
     ANDROID HARDWARE BACK BUTTON
  ===================================================== */

  useEffect(() => {
    /*
      This BackHandler belongs ONLY to
      Admin Dashboard.

      When this screen is unmounted,
      the listener is removed.

      Therefore index.tsx will NOT show
      the admin logout popup.
    */

    const onBackPress = () => {
      console.log("📱 Android Back pressed on Admin Dashboard");

      showLogoutConfirmation();

      /*
        true means:

        React Native handled the event.

        Android will NOT automatically
        navigate back.
      */

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    console.log("📱 Admin Dashboard BackHandler ENABLED");

    return () => {
      subscription.remove();

      console.log("📱 Admin Dashboard BackHandler DISABLED");
    };
  }, [showLogoutConfirmation]);

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  const loadDashboard = useCallback(async () => {
    try {
      const headers = await authHeaders();

      /* =================================================
         AUTHORIZATION MISSING
      ================================================= */

      if (!headers?.Authorization) {
        console.log("⚠️ Admin authorization missing");

        await clearAdminSession();

        Alert.alert(
          "Login Required",
          "Admin login session not found.",
          [
            {
              text: "OK",
              onPress: () => {
                /*
                  Go to index.tsx,
                  NOT admin-login.
                */

                router.replace("/");
              },
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      console.log("");
      console.log("====================================");
      console.log("📊 ADMIN DASHBOARD");
      console.log("====================================");
      console.log("API:", API_ENDPOINTS.adminDashboard);
      console.log("Authorization: Present");
      console.log("====================================");
      console.log("");

      /* =================================================
         API REQUEST
      ================================================= */

      const response = await fetch(API_ENDPOINTS.adminDashboard, {
        method: "GET",

        headers: {
          Authorization: headers.Authorization,
        },
      });

      const responseText = await response.text();

      console.log("Dashboard HTTP Status:", response.status);
      console.log("Dashboard Response:", responseText);

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error("Dashboard JSON Parse Error:", error);
      }

      /* =================================================
         401
      ================================================= */

      if (response.status === 401) {
        console.log("⚠️ Admin session expired");

        await clearAdminSession();

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "OK",
              onPress: () => {
                /*
                  Session expired also goes to
                  index.tsx.
                */

                router.replace("/");
              },
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      /* =================================================
         403
      ================================================= */

      if (response.status === 403) {
        console.log("⛔ Admin access denied");

        await clearAdminSession();

        Alert.alert(
          "Access Denied",
          "You do not have administrator access.",
          [
            {
              text: "OK",
              onPress: () => {
                /*
                  Access denied also goes to
                  index.tsx.
                */

                router.replace("/");
              },
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      /* =================================================
         OTHER API ERROR
      ================================================= */

      if (!response.ok) {
        Alert.alert(
          "Dashboard Error",
          data?.message || `Unable to load dashboard. Error ${response.status}`,
        );

        return;
      }

      /* =================================================
         SUCCESS
      ================================================= */

      if (data?.success) {
        setStats({
          totalUsers: Number(data?.stats?.totalUsers) || 0,
          totalWards: Number(data?.stats?.totalWards) || 0,
          totalWardMembers: Number(data?.stats?.totalWardMembers) || 0,
          totalComplaints: Number(data?.stats?.totalComplaints) || 0,
        });

        /* ---------------------------------------------
           ADMIN FROM API
        --------------------------------------------- */

        if (data?.admin) {
          setAdmin(data.admin);

          await AsyncStorage.setItem("adminUser", JSON.stringify(data.admin));
        }

        console.log("====================================");
        console.log("✅ DASHBOARD LOADED SUCCESSFULLY");
        console.log("Stats:", JSON.stringify(data.stats));
        console.log("Admin:", JSON.stringify(data.admin));
        console.log("====================================");
      } else {
        Alert.alert(
          "Dashboard Error",
          data?.message || "Unable to load dashboard.",
        );
      }
    } catch (error) {
      console.error("Load Dashboard Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server. Please check whether the backend is running.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clearAdminSession]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const initializeDashboard = async () => {
      await loadAdminUser();

      await loadDashboard();
    };

    initializeDashboard();
  }, [loadAdminUser, loadDashboard]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadDashboard();
  };

  /* =====================================================
     HEADER LOGOUT
  ===================================================== */

  const handleLogout = () => {
    showLogoutConfirmation();
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openComplaints = () => {
    router.push("/admin-complaints");
  };

  const openWards = () => {
    router.push("/admin-wards");
  };

  const openWardMembers = () => {
    router.push("/admin-ward-members");
  };

  const openUsers = () => {
    router.push("/admin-users");
  };

  const openAnnouncements = () => {
    router.push("/admin-announcements" as any);
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Text style={styles.loadingIconText}>⚙️</Text>
          </View>

          <ActivityIndicator size="large" color="#075985" />

          <Text style={styles.loadingTitle}>Loading Admin Dashboard</Text>

          <Text style={styles.loadingSubtitle}>Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>⚙️</Text>
          </View>

          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>

            <Text style={styles.headerSubtitle}>Tiruppur North</Text>
          </View>
        </View>

        {/* HEADER LOGOUT BUTTON */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <Text style={styles.logoutIcon}>↪</Text>
        </TouchableOpacity>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#075985"]}
            tintColor="#075985"
          />
        }>
        {/* =================================================
            WELCOME
        ================================================= */}

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeSmall}>Welcome back</Text>

            <Text style={styles.welcomeName}>
              {admin?.name || "Administrator"}
            </Text>

            <Text style={styles.welcomeText}>
              Manage Tiruppur North constituency from one place.
            </Text>
          </View>

          <View style={styles.welcomeIcon}>
            <Text style={styles.welcomeIconText}>👨‍💼</Text>
          </View>
        </View>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        <Text style={styles.sectionTitle}>Overview</Text>

        <Text style={styles.sectionSubtitle}>
          Constituency management summary
        </Text>

        <View style={styles.overviewGrid}>
          {/* USERS */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={openUsers}
            activeOpacity={0.75}>
            <View style={styles.statIcon}>
              <Text>👥</Text>
            </View>

            <Text style={styles.statNumber}>{stats.totalUsers}</Text>

            <Text style={styles.statLabel}>Users</Text>

            <Text style={styles.viewText}>View Users →</Text>
          </TouchableOpacity>

          {/* WARDS */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={openWards}
            activeOpacity={0.75}>
            <View style={styles.statIcon}>
              <Text>🏘️</Text>
            </View>

            <Text style={styles.statNumber}>{stats.totalWards}</Text>

            <Text style={styles.statLabel}>Wards</Text>

            <Text style={styles.viewText}>View Wards →</Text>
          </TouchableOpacity>

          {/* WARD MEMBERS */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={openWardMembers}
            activeOpacity={0.75}>
            <View style={styles.statIcon}>
              <Text>🧑‍💼</Text>
            </View>

            <Text style={styles.statNumber}>{stats.totalWardMembers}</Text>

            <Text style={styles.statLabel}>Ward Members</Text>

            <Text style={styles.viewText}>View Members →</Text>
          </TouchableOpacity>

          {/* COMPLAINTS */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={openComplaints}
            activeOpacity={0.75}>
            <View style={styles.statIcon}>
              <Text>📢</Text>
            </View>

            <Text style={styles.statNumber}>{stats.totalComplaints}</Text>

            <Text style={styles.statLabel}>Complaints</Text>

            <Text style={styles.viewText}>View Complaints →</Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            MANAGEMENT
        ================================================= */}

        <Text style={styles.sectionTitle}>Management</Text>

        <Text style={styles.sectionSubtitle}>
          Manage constituency information
        </Text>

        {/* COMPLAINTS */}

        <TouchableOpacity
          style={styles.managementCard}
          onPress={openComplaints}
          activeOpacity={0.75}>
          <View style={[styles.managementIcon, styles.complaintManagementIcon]}>
            <Text>📢</Text>
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Complaints</Text>

            <Text style={styles.managementDescription}>
              View complaints, details and update complaint status.
            </Text>

            <Text style={styles.managementTamil}>புகார்கள்</Text>
          </View>

          <Text style={styles.managementArrow}>›</Text>
        </TouchableOpacity>

        {/* WARDS */}

        <TouchableOpacity
          style={styles.managementCard}
          onPress={openWards}
          activeOpacity={0.75}>
          <View style={[styles.managementIcon, styles.wardManagementIcon]}>
            <Text>🏘️</Text>
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Wards</Text>

            <Text style={styles.managementDescription}>
              Add, edit, delete and view ward details.
            </Text>

            <Text style={styles.managementTamil}>வார்டுகள்</Text>
          </View>

          <Text style={styles.managementArrow}>›</Text>
        </TouchableOpacity>

        {/* WARD MEMBERS */}

        <TouchableOpacity
          style={styles.managementCard}
          onPress={openWardMembers}
          activeOpacity={0.75}>
          <View style={[styles.managementIcon, styles.memberManagementIcon]}>
            <Text>🧑‍💼</Text>
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Ward Members</Text>

            <Text style={styles.managementDescription}>
              Manage ward member profiles and contact details.
            </Text>

            <Text style={styles.managementTamil}>வார்டு உறுப்பினர்கள்</Text>
          </View>

          <Text style={styles.managementArrow}>›</Text>
        </TouchableOpacity>

        {/* USERS */}

        <TouchableOpacity
          style={styles.managementCard}
          onPress={openUsers}
          activeOpacity={0.75}>
          <View style={[styles.managementIcon, styles.userManagementIcon]}>
            <Text>👥</Text>
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Users</Text>

            <Text style={styles.managementDescription}>
              View registered users and manage their accounts.
            </Text>

            <Text style={styles.managementTamil}>பயனர்கள்</Text>
          </View>

          <Text style={styles.managementArrow}>›</Text>
        </TouchableOpacity>

        {/* ANNOUNCEMENTS */}

        <TouchableOpacity
          style={styles.managementCard}
          onPress={openAnnouncements}
          activeOpacity={0.75}>
          <View
            style={[styles.managementIcon, styles.announcementManagementIcon]}>
            <Text>📣</Text>
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Announcements</Text>

            <Text style={styles.managementDescription}>
              Create and manage constituency announcements.
            </Text>

            <Text style={styles.managementTamil}>அறிவிப்புகள்</Text>
          </View>

          <Text style={styles.managementArrow}>›</Text>
        </TouchableOpacity>

        {/* =================================================
            ADMIN INFO
        ================================================= */}

        <View style={styles.adminInfoCard}>
          <View style={styles.adminInfoIcon}>
            <Text>🔐</Text>
          </View>

          <View style={styles.adminInfoContent}>
            <Text style={styles.adminInfoTitle}>Administrator</Text>

            <Text style={styles.adminInfoName}>
              {admin?.name || "Administrator"}
            </Text>

            <Text style={styles.adminInfoMobile}>{admin?.mobile || ""}</Text>

            <View style={styles.adminRoleBadge}>
              <Text style={styles.adminRoleText}>ADMIN</Text>
            </View>
          </View>
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Text style={styles.footerText}>
          Tiruppur North Administration Portal
        </Text>

        <Text style={styles.footerVersion}>Admin Panel</Text>
      </ScrollView>
    </SafeAreaView>
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

  /* =================================================
     LOADING
  ================================================= */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  loadingIconText: {
    fontSize: 32,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  loadingSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#64748B",
  },

  /* =================================================
     HEADER
  ================================================= */

  header: {
    height: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerIconText: {
    fontSize: 22,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  logoutButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutIcon: {
    fontSize: 23,
    color: "#DC2626",
    fontWeight: "800",
  },

  /* =================================================
     SCROLL
  ================================================= */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },

  /* =================================================
     WELCOME
  ================================================= */

  welcomeCard: {
    minHeight: 125,
    backgroundColor: "#075985",
    borderRadius: 21,
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 26,
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeSmall: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "600",
  },

  welcomeName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },

  welcomeText: {
    color: "#E0F2FE",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 230,
  },

  welcomeIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#0369A1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  welcomeIconText: {
    fontSize: 34,
  },

  /* =================================================
     SECTION
  ================================================= */

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 3,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    marginBottom: 14,
  },

  /* =================================================
     OVERVIEW
  ================================================= */

  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    minHeight: 145,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0F172A",
  },

  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  viewText: {
    fontSize: 10,
    color: "#075985",
    fontWeight: "800",
    marginTop: 8,
  },

  /* =================================================
     MANAGEMENT
  ================================================= */

  managementCard: {
    minHeight: 92,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  managementIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  complaintManagementIcon: {
    backgroundColor: "#FFF7ED",
  },

  wardManagementIcon: {
    backgroundColor: "#F0FDF4",
  },

  memberManagementIcon: {
    backgroundColor: "#EFF6FF",
  },

  userManagementIcon: {
    backgroundColor: "#F5F3FF",
  },

  announcementManagementIcon: {
    backgroundColor: "#FFF7ED",
  },

  managementContent: {
    flex: 1,
    marginLeft: 12,
  },

  managementTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },

  managementDescription: {
    fontSize: 10,
    color: "#64748B",
    lineHeight: 15,
    marginTop: 3,
  },

  managementTamil: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },

  managementArrow: {
    fontSize: 28,
    color: "#64748B",
    marginLeft: 7,
  },

  /* =================================================
     ADMIN INFO
  ================================================= */

  adminInfoCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
  },

  adminInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  adminInfoContent: {
    flex: 1,
    marginLeft: 12,
  },

  adminInfoTitle: {
    fontSize: 11,
    color: "#64748B",
  },

  adminInfoName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },

  adminInfoMobile: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  adminRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },

  adminRoleText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#166534",
  },

  /* =================================================
     FOOTER
  ================================================= */

  footerText: {
    textAlign: "center",
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 25,
  },

  footerVersion: {
    textAlign: "center",
    fontSize: 9,
    color: "#CBD5E1",
    marginTop: 3,
  },
});
