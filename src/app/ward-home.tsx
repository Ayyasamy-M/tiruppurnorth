import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
} from "../config/api";

export default function WardHomeScreen() {
  const params = useLocalSearchParams();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "1";

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [wardData, setWardData] = useState<any>(null);

  /* =====================================================
     ANDROID PHONE BACK BUTTON
     
     Dashboard-ல் இருக்கும்போது phone back button
     press செய்தால் நேரடியாக வெளியே போகாது.
     Logout confirmation மட்டும் வரும்.
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (loggingOut) {
          return true;
        }

        handleLogout();

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
     LOAD WARD DATA
  ===================================================== */

  useEffect(() => {
    loadWardData();
  }, [wardNumber]);

  const loadWardData = async () => {
    try {
      setLoading(true);

      const storedUser = await getStoredUser();
      setUser(storedUser);

      const headers = await authHeaders();

      const response = await fetch(`${API_ENDPOINTS.wards}/${wardNumber}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      console.log("Ward API Response:", data);

      /* =================================================
         AUTH SESSION CHECK
      ================================================= */

      if (response.status === 401) {
        await clearAuth();

        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please login again.",
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/login");
              },
            },
          ],
        );

        return;
      }

      if (!response.ok) {
        Alert.alert(
          "Ward Error",
          data.message || "Unable to load ward information",
        );

        return;
      }

      if (data.success) {
        setWardData(data);
      } else {
        Alert.alert(
          "Ward Error",
          data.message || "Unable to load ward information",
        );
      }
    } catch (error) {
      console.error("Ward Load Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server. Make sure backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOGOUT CONFIRMATION
  ===================================================== */

  const handleLogout = () => {
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
  };

  /* =====================================================
     PERFORM LOGOUT
  ===================================================== */

  const performLogout = async () => {
    try {
      setLoggingOut(true);

      /* ---------------------------------------------
         GET AUTH HEADERS
      --------------------------------------------- */

      const headers = await authHeaders();

      /* ---------------------------------------------
         LOGOUT API
      --------------------------------------------- */

      try {
        await fetch(API_ENDPOINTS.logout, {
          method: "POST",
          headers,
        });
      } catch (error) {
        console.log("Logout API Error:", error);
      }

      /* ---------------------------------------------
         CLEAR LOCAL SESSION
      --------------------------------------------- */

      await clearAuth();

      /* ---------------------------------------------
         GO LOGIN
      --------------------------------------------- */

      router.replace("/login");
    } catch (error) {
      console.error("Logout Error:", error);

      /* ---------------------------------------------
         EVEN IF API FAILS,
         CLEAR LOCAL SESSION
      --------------------------------------------- */

      await clearAuth();

      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  /* =====================================================
     REPORT PROBLEM
  ===================================================== */

  const handleReportProblem = () => {
    router.push({
      pathname: "/report-problem",
      params: {
        ward: wardNumber.toString(),
      },
    });
  };

  /* =====================================================
     OPEN COMPLAINT DETAILS
  ===================================================== */

  /* =====================================================
   OPEN COMPLAINT DETAILS
   Ward Home → Complaint Details

   IMPORTANT:
   Current ward number is passed along with complaint.
   So Complaint Details knows exactly which Ward Home
   it should return to.
===================================================== */

  const handleComplaintPress = (complaint: any) => {
    const complaintId = complaint._id || complaint.id;

    if (!complaintId) {
      Alert.alert(
        "Complaint Error",
        "Complaint ID is missing. Unable to open complaint details.",
      );

      return;
    }

    console.log("Opening Complaint:", complaint);
    console.log("Current Ward:", wardNumber);

    router.push({
      pathname: "/complaint-details",
      params: {
        complaint: JSON.stringify({
          ...complaint,
          id: complaintId.toString(),
        }),

        // IMPORTANT
        // Send the current user's/current ward's ward number
        ward: wardNumber.toString(),
      },
    });
  };

  /* =====================================================
     BACKEND DATA
  ===================================================== */

  const ward = wardData?.ward || {};
  const members = wardData?.members || [];
  const updates = wardData?.updates || [];
  const complaints = wardData?.complaints || [];
  const stats = wardData?.stats || {};

  const wardName = ward.name || ward.wardName || `Ward ${wardNumber}`;

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContent}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>TN</Text>
          </View>

          <ActivityIndicator
            size="large"
            color="#075985"
            style={styles.loader}
          />

          <Text style={styles.loadingTitle}>Loading Ward</Text>

          <Text style={styles.loadingText}>
            உங்கள் வார்டு தகவல்களை ஏற்றுகிறது...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Text style={styles.backText}>‹</Text>
          )}
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{wardName}</Text>

          <Text style={styles.headerSubtitle}>Tiruppur North Constituency</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{wardNumber}</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={loggingOut}>
            {loggingOut ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.logoutIcon}>↪</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* =================================================
            WELCOME
        ================================================= */}

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Text style={styles.welcomeIconText}>TN</Text>
          </View>

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome to {wardName}</Text>

            <Text style={styles.welcomeText}>
              {user?.name ? `வணக்கம் ${user.name}! ` : ""}
              உங்கள் வார்டில் நடைபெறும் முக்கியமான தகவல்கள், உறுப்பினர்கள்
              மற்றும் பொதுமக்கள் குறைகளை இங்கே தெரிந்துகொள்ளலாம்.
            </Text>
          </View>
        </View>

        {/* =================================================
            WARD INFORMATION
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ward Information</Text>
          <Text style={styles.sectionTamil}>வார்டு தகவல்கள்</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoNumber}>
              {stats.totalPeople ?? ward.totalPeople ?? "--"}
            </Text>

            <Text style={styles.infoLabel}>Total People</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoNumber}>
              {stats.wardMembers ?? members.length}
            </Text>

            <Text style={styles.infoLabel}>Ward Members</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoNumber}>{stats.registeredUsers ?? 0}</Text>

            <Text style={styles.infoLabel}>Registered Users</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoNumber}>
              {stats.complaints ?? complaints.length}
            </Text>

            <Text style={styles.infoLabel}>Complaints</Text>
          </View>
        </View>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        {ward.description ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About This Ward</Text>
              <Text style={styles.sectionTamil}>வார்டு பற்றி</Text>
            </View>

            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{ward.description}</Text>
            </View>
          </>
        ) : null}

        {/* =================================================
            MEMBERS
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ward Members</Text>
          <Text style={styles.sectionTamil}>வார்டு உறுப்பினர்கள்</Text>
        </View>

        {members.length > 0 ? (
          <View style={styles.card}>
            {members.map((member: any, index: number) => (
              <View
                key={member._id || member.id || index}
                style={[
                  styles.memberRow,
                  index === members.length - 1 && styles.lastRow,
                ]}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(member.name || "W").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>

                  <Text style={styles.memberRole}>{member.role}</Text>

                  {member.mobile ? (
                    <Text style={styles.memberMobile}>{member.mobile}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👤</Text>

            <Text style={styles.emptyTitle}>No ward members</Text>

            <Text style={styles.emptyText}>
              Ward member information will appear here.
            </Text>
          </View>
        )}

        {/* =================================================
            UPDATES
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ward Updates</Text>
          <Text style={styles.sectionTamil}>வார்டு செய்திகள்</Text>
        </View>

        {updates.length > 0 ? (
          updates.map((update: any, index: number) => (
            <View
              key={update._id || update.id || index}
              style={styles.updateCard}>
              <View style={styles.updateIcon}>
                <Text style={styles.updateIconText}>N</Text>
              </View>

              <View style={styles.updateContent}>
                <View style={styles.updateTopRow}>
                  <Text style={styles.updateTitle}>{update.title}</Text>

                  <Text style={styles.updateDate}>
                    {update.date
                      ? new Date(update.date).toLocaleDateString()
                      : ""}
                  </Text>
                </View>

                <Text style={styles.updateDescription}>
                  {update.description}
                </Text>

                {update.category ? (
                  <Text style={styles.updateCategory}>{update.category}</Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📰</Text>

            <Text style={styles.emptyTitle}>No updates</Text>

            <Text style={styles.emptyText}>
              New ward updates will appear here.
            </Text>
          </View>
        )}

        {/* =================================================
            REPORT PROBLEM
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public Complaint</Text>
          <Text style={styles.sectionTamil}>பொதுமக்கள் குறை</Text>
        </View>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={handleReportProblem}
          activeOpacity={0.8}>
          <View style={styles.reportIcon}>
            <Text style={styles.reportIconText}>!</Text>
          </View>

          <View style={styles.reportContent}>
            <Text style={styles.reportTitle}>Report a Problem</Text>

            <Text style={styles.reportDescription}>
              தண்ணீர், சாலை, மின்சாரம் அல்லது உங்கள் பகுதியில் உள்ள ஏதேனும்
              பிரச்சனையை பதிவு செய்யுங்கள்.
            </Text>
          </View>

          <Text style={styles.reportArrow}>›</Text>
        </TouchableOpacity>

        {/* =================================================
            PUBLIC COMPLAINTS
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public Complaints</Text>

          <Text style={styles.sectionTamil}>பொதுமக்கள் புகார்கள்</Text>
        </View>

        {complaints.length > 0 ? (
          complaints.map((complaint: any, index: number) => (
            <TouchableOpacity
              key={complaint._id || complaint.id || index}
              style={styles.complaintCard}
              onPress={() => handleComplaintPress(complaint)}
              activeOpacity={0.75}>
              <View style={styles.complaintContent}>
                <Text style={styles.complaintTitle} numberOfLines={2}>
                  {complaint.title || "Untitled Complaint"}
                </Text>

                {complaint.location ? (
                  <Text style={styles.complaintLocation}>
                    📍 {complaint.location}
                  </Text>
                ) : null}

                {complaint.category ? (
                  <Text style={styles.complaintCategory}>
                    {complaint.category}
                  </Text>
                ) : null}

                <Text style={styles.viewDetailsText}>View details →</Text>
              </View>

              <View style={styles.complaintRight}>
                <View
                  style={[
                    styles.statusBadge,
                    complaint.status === "Resolved" && styles.statusResolved,
                    complaint.status === "Rejected" && styles.statusRejected,
                    complaint.status === "In Progress" && styles.statusProgress,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      complaint.status === "Resolved" &&
                        styles.statusResolvedText,
                      complaint.status === "Rejected" &&
                        styles.statusRejectedText,
                      complaint.status === "In Progress" &&
                        styles.statusProgressText,
                    ]}>
                    {complaint.status || "Pending"}
                  </Text>
                </View>

                <Text style={styles.complaintArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>

            <Text style={styles.emptyTitle}>No complaints</Text>

            <Text style={styles.emptyText}>
              No public complaints have been registered for this ward yet.
            </Text>
          </View>
        )}

        {/* =================================================
            REFRESH
        ================================================= */}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadWardData}
          activeOpacity={0.8}
          disabled={loading}>
          <Text style={styles.refreshText}>↻ Refresh Ward Data</Text>
        </TouchableOpacity>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <TouchableOpacity
          style={styles.bottomLogoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              <Text style={styles.bottomLogoutIcon}>↪</Text>

              <Text style={styles.bottomLogoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>Tiruppur North Constituency</Text>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  loadingLogoText: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },

  loader: {
    marginBottom: 15,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
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
    flex: 1,
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

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
  },

  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  logoutIcon: {
    fontSize: 23,
    color: "#DC2626",
    fontWeight: "800",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  welcomeCard: {
    flexDirection: "row",
    backgroundColor: "#075985",
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
  },

  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  welcomeIconText: {
    color: "#075985",
    fontSize: 17,
    fontWeight: "900",
  },

  welcomeContent: {
    flex: 1,
    marginLeft: 14,
  },

  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 7,
  },

  welcomeText: {
    color: "#E0F2FE",
    fontSize: 12,
    lineHeight: 19,
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

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },

  infoBox: {
    width: "48%",
    minHeight: 92,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#075985",
  },

  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },

  descriptionText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },

  memberAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#075985",
  },

  memberInfo: {
    flex: 1,
    marginLeft: 13,
  },

  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  memberRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  memberMobile: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },

  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },

  updateCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  updateIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },

  updateIconText: {
    color: "#075985",
    fontSize: 16,
    fontWeight: "900",
  },

  updateContent: {
    flex: 1,
    marginLeft: 12,
  },

  updateTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  updateTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  updateDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginLeft: 8,
  },

  updateDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 5,
  },

  updateCategory: {
    fontSize: 10,
    color: "#075985",
    fontWeight: "700",
    marginTop: 6,
  },

  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 15,
    marginBottom: 28,
  },

  reportIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },

  reportIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  reportContent: {
    flex: 1,
    marginLeft: 12,
  },

  reportTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9A3412",
  },

  reportDescription: {
    fontSize: 12,
    color: "#7C2D12",
    lineHeight: 18,
    marginTop: 4,
  },

  reportArrow: {
    fontSize: 28,
    color: "#C2410C",
    marginLeft: 8,
  },

  complaintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },

  complaintContent: {
    flex: 1,
  },

  complaintTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  complaintLocation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  complaintCategory: {
    fontSize: 10,
    color: "#075985",
    fontWeight: "700",
    marginTop: 5,
  },

  viewDetailsText: {
    fontSize: 11,
    color: "#075985",
    fontWeight: "700",
    marginTop: 8,
  },

  complaintRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },

  complaintArrow: {
    fontSize: 24,
    color: "#94A3B8",
    marginTop: 6,
  },

  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },

  statusProgress: {
    backgroundColor: "#DBEAFE",
  },

  statusProgressText: {
    color: "#1D4ED8",
  },

  statusResolved: {
    backgroundColor: "#DCFCE7",
  },

  statusResolvedText: {
    color: "#166534",
  },

  statusRejected: {
    backgroundColor: "#FEE2E2",
  },

  statusRejectedText: {
    color: "#991B1B",
  },

  refreshButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  refreshText: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomLogoutButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 18,
  },

  bottomLogoutIcon: {
    color: "#DC2626",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },

  bottomLogoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },
});
