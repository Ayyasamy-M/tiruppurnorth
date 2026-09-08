import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Pressable,
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
    Custom logout modal
  */
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  /*
    Prevent multiple logout operations.
  */
  const [loggingOut, setLoggingOut] = useState(false);

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

    if (loggingOut) {
      console.log("⚠️ Logout already in progress");
      return;
    }

    try {
      setLoggingOut(true);

      console.log("====================================");
      console.log("🚪 ADMIN LOGOUT STARTED");
      console.log("====================================");

      /*
        Close modal.
      */

      setLogoutModalVisible(false);

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
        Go directly to Home.
      */

      console.log("➡️ Going to index.tsx");

      router.replace("/");
    } catch (error) {
      console.error("Logout Error:", error);

      /*
        Even if something fails,
        clear session and go Home.
      */

      try {
        await clearAdminSession();
      } catch (clearError) {
        console.error("Final Session Clear Error:", clearError);
      }

      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  }, [clearAdminSession, loggingOut]);

  /* =====================================================
     LOGOUT CONFIRMATION
  ===================================================== */

  const showLogoutConfirmation = useCallback(() => {
    if (loggingOut) {
      console.log("⚠️ Logout already processing");
      return;
    }

    console.log("🔔 Opening logout confirmation");

    setLogoutModalVisible(true);
  }, [loggingOut]);

  /* =====================================================
     CLOSE LOGOUT MODAL
  ===================================================== */

  const closeLogoutConfirmation = useCallback(() => {
    if (loggingOut) {
      return;
    }

    console.log("❌ Logout cancelled");

    setLogoutModalVisible(false);
  }, [loggingOut]);

  /* =====================================================
     ANDROID HARDWARE BACK BUTTON
  ===================================================== */

  useEffect(() => {
    /*
      IMPORTANT:

      Android Back must NEVER logout.

      Back button simply navigates back.
    */

    const onBackPress = () => {
      console.log("📱 Android Back pressed on Admin Dashboard");

      /*
        If logout modal is open,
        first close the modal.
      */

      if (logoutModalVisible) {
        closeLogoutConfirmation();

        return true;
      }

      /*
        Normal Android Back.
      */

      router.back();

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
  }, [closeLogoutConfirmation, logoutModalVisible]);

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

          <ActivityIndicator size="large" color="#D71920" />

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

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>

            <Text style={styles.headerSubtitle}>Tiruppur Smart City</Text>
          </View>
        </View>

        {/* HEADER LOGOUT BUTTON */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#D71920" />
          ) : (
            <Text style={styles.logoutIcon}>↪</Text>
          )}
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
            colors={["#D71920"]}
            tintColor="#D71920"
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
              Manage Tiruppur Smart City from one place.
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
          Smart City management summary
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
          Manage Smart City information
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
              Create and manage Smart City announcements.
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
          Tiruppur Smart City Administration Portal
        </Text>

        <Text style={styles.footerVersion}>Admin Panel</Text>
      </ScrollView>

      {/* =====================================================
          CUSTOM LOGOUT MODAL
      ===================================================== */}

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLogoutConfirmation}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeLogoutConfirmation}
          />

          <View style={styles.logoutModal}>
            {/* ICON */}

            <View style={styles.logoutModalIcon}>
              <Text style={styles.logoutModalIconText}>↪</Text>
            </View>

            {/* TITLE */}

            <Text style={styles.logoutModalTitle}>Logout?</Text>

            {/* DESCRIPTION */}

            <Text style={styles.logoutModalDescription}>
              Are you sure you want to logout from the admin panel?
            </Text>

            {/* BUTTONS */}

            <View style={styles.logoutModalActions}>
              {/* CANCEL */}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeLogoutConfirmation}
                disabled={loggingOut}
                activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* LOGOUT */}

              <TouchableOpacity
                style={styles.confirmLogoutButton}
                onPress={performLogout}
                disabled={loggingOut}
                activeOpacity={0.8}>
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmLogoutText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#FFF0F1",
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
    minHeight: 76,
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
    flex: 1,
    minWidth: 0,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    flexShrink: 0,
  },

  headerIconText: {
    fontSize: 22,
  },

  headerTextContainer: {
    flex: 1,
    minWidth: 0,
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
    marginLeft: 10,
    flexShrink: 0,
  },

  logoutIcon: {
    fontSize: 23,
    color: "#D71920",
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
    backgroundColor: "#D71920",
    borderRadius: 21,
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 26,
  },

  welcomeContent: {
    flex: 1,
    minWidth: 0,
  },

  welcomeSmall: {
    color: "#FFE5E7",
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
    color: "#FEE2E2",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 250,
  },

  welcomeIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#A90F15",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    flexShrink: 0,
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
    backgroundColor: "#FFF0F1",
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
    color: "#D71920",
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
    flexShrink: 0,
  },

  complaintManagementIcon: {
    backgroundColor: "#FFF0F1",
  },

  wardManagementIcon: {
    backgroundColor: "#FFF8D6",
  },

  memberManagementIcon: {
    backgroundColor: "#F1F1F1",
  },

  userManagementIcon: {
    backgroundColor: "#FFF0F1",
  },

  announcementManagementIcon: {
    backgroundColor: "#FFF8D6",
  },

  managementContent: {
    flex: 1,
    minWidth: 0,
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
    backgroundColor: "#FFF8D6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  adminInfoContent: {
    flex: 1,
    minWidth: 0,
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
    backgroundColor: "#FFF8D6",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },

  adminRoleText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#111111",
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

  /* =================================================
     LOGOUT MODAL
  ================================================= */

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  logoutModal: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },

  logoutModalIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#FFF0F1",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  logoutModalIconText: {
    color: "#D71920",
    fontSize: 31,
    fontWeight: "900",
  },

  logoutModalTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  logoutModalDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 310,
  },

  logoutModalActions: {
    width: "100%",
    flexDirection: "row",
    marginTop: 22,
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800",
  },

  confirmLogoutButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmLogoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
