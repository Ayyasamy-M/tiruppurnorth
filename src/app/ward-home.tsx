import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Pressable,
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
  API_ENDPOINTS,
  authHeaders,
  clearAuth,
  getStoredUser,
} from "../config/api";

export default function WardHomeScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "1";

  const isSmallMobile = width < 380;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const contentMaxWidth = isDesktop ? 1120 : isTablet ? 900 : undefined;

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [wardData, setWardData] = useState<any>(null);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  /*
    Prevent an already-running Ward API request from
    showing session-expired UI after logout starts.
  */
  const logoutInProgressRef = useRef(false);

  /*
    Abort the current Ward API request when the screen
    loses focus or logout starts.
  */
  const wardRequestControllerRef = useRef<AbortController | null>(null);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const performLogout = useCallback(async () => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    setLoggingOut(true);
    setLogoutModalVisible(false);

    /*
      Cancel any Ward API request currently running.
    */
    if (wardRequestControllerRef.current) {
      wardRequestControllerRef.current.abort();
      wardRequestControllerRef.current = null;
    }

    try {
      console.log("====================================");
      console.log("🚪 USER LOGOUT STARTED");
      console.log("====================================");

      /*
        Try logout API.

        Even if this API fails, local authentication
        will still be cleared.
      */

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

      /*
        Clear local authentication/session.
      */

      await clearAuth();

      console.log("✅ Local user session cleared");
      console.log("➡️ Going to Home");

      /*
        Go directly to index.tsx.
      */

      router.replace("/");
    } catch (error) {
      console.error("Logout Error:", error);

      /*
        Always clear local session.
      */

      try {
        await clearAuth();
      } catch (clearError) {
        console.error("Clear Auth Error:", clearError);
      }

      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  }, []);

  /* =====================================================
     SHOW LOGOUT MODAL
  ===================================================== */

  const handleLogout = useCallback(() => {
    if (loggingOut || logoutInProgressRef.current) {
      return;
    }

    console.log("🔔 Opening user logout confirmation");

    setLogoutModalVisible(true);
  }, [loggingOut]);

  /* =====================================================
     CLOSE LOGOUT MODAL
  ===================================================== */

  const closeLogoutModal = useCallback(() => {
    if (loggingOut) {
      return;
    }

    console.log("❌ Logout cancelled");

    setLogoutModalVisible(false);
  }, [loggingOut]);

  /* =====================================================
     LOAD WARD DATA
  ===================================================== */

  const loadWardData = useCallback(async () => {
    /*
      Never start a new request while logout is running.
    */
    if (logoutInProgressRef.current) {
      console.log("⏭️ Ward API skipped because logout is in progress");
      return;
    }

    /*
      Cancel previous request if one exists.
    */
    if (wardRequestControllerRef.current) {
      wardRequestControllerRef.current.abort();
    }

    const controller = new AbortController();

    wardRequestControllerRef.current = controller;

    try {
      setLoading(true);

      /*
        Check session before making the Ward API request.
      */
      const storedUser = await getStoredUser();

      if (logoutInProgressRef.current || controller.signal.aborted) {
        return;
      }

      if (!storedUser) {
        console.log("⏭️ Ward API skipped because user session is missing");

        return;
      }

      setUser(storedUser);

      const headers = await authHeaders();

      if (logoutInProgressRef.current || controller.signal.aborted) {
        return;
      }

      if (!headers?.Authorization) {
        console.log("⚠️ Ward authorization missing");

        await clearAuth();

        if (logoutInProgressRef.current || controller.signal.aborted) {
          return;
        }

        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please login again.",
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

      console.log("====================================");
      console.log("🏘️ LOADING WARD DATA");
      console.log("Ward:", wardNumber);
      console.log("====================================");

      const response = await fetch(`${API_ENDPOINTS.wards}/${wardNumber}`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      /*
        IMPORTANT:
        Logout may have started while fetch was running.

        In that case completely ignore the response.
      */

      if (logoutInProgressRef.current || controller.signal.aborted) {
        console.log(
          "⏭️ Ward API response ignored because request was cancelled",
        );
        return;
      }

      const data = await response.json();

      console.log("Ward API Response:", data);

      /* =================================================
         SESSION EXPIRED
      ================================================= */

      if (response.status === 401 || response.status === 403) {
        /*
          Double protection:
          Never show this alert during logout.
        */
        if (logoutInProgressRef.current) {
          return;
        }

        console.log("⚠️ Ward session expired");

        await clearAuth();

        if (logoutInProgressRef.current) {
          return;
        }

        Alert.alert(
          "Session Expired",
          "Your login session has expired. Please login again.",
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
         API ERROR
      ================================================= */

      if (!response.ok) {
        Alert.alert(
          "Ward Error",
          data.message || "Unable to load ward information",
        );

        return;
      }

      /* =================================================
         SUCCESS
      ================================================= */

      if (data.success) {
        setWardData(data);

        console.log("✅ Ward data loaded successfully");
      } else {
        Alert.alert(
          "Ward Error",
          data.message || "Unable to load ward information",
        );
      }
    } catch (error: any) {
      /*
        AbortController cancellation is expected.

        Do NOT show connection error when request
        was cancelled because of logout/navigation.
      */

      if (
        error?.name === "AbortError" ||
        controller.signal.aborted ||
        logoutInProgressRef.current
      ) {
        console.log("⏭️ Ward API request cancelled");
        return;
      }

      console.error("Ward Load Error:", error);

      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      if (wardRequestControllerRef.current === controller) {
        wardRequestControllerRef.current = null;
      }

      /*
        Don't change loading state after logout.
      */
      if (!logoutInProgressRef.current) {
        setLoading(false);
      }
    }
  }, [wardNumber]);

  /* =====================================================
     SCREEN FOCUS
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      /*
        Reset request state when screen becomes active.
      */
      logoutInProgressRef.current = false;

      const onBackPress = () => {
        /*
          Android Back NEVER logs out.

          If logout confirmation is open,
          close only the modal.
        */

        if (logoutModalVisible) {
          closeLogoutModal();

          return true;
        }

        if (loggingOut) {
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

      loadWardData();

      return () => {
        subscription.remove();

        /*
          Cancel Ward request when leaving this screen.
        */
        if (wardRequestControllerRef.current) {
          wardRequestControllerRef.current.abort();
          wardRequestControllerRef.current = null;
        }
      };
    }, [loggingOut, logoutModalVisible, closeLogoutModal, loadWardData]),
  );

  /* =====================================================
     HEADER BACK
  ===================================================== */

  const handleBack = () => {
    if (loggingOut) {
      return;
    }

    router.back();
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
     COMPLAINT DETAILS
  ===================================================== */

  const handleComplaintPress = (complaint: any) => {
    const complaintId = complaint?._id || complaint?.id;

    if (!complaintId) {
      Alert.alert("Complaint Error", "Complaint ID is missing.");

      return;
    }

    router.push({
      pathname: "/complaint-details",
      params: {
        id: complaintId.toString(),
        source: "user",
        ward: wardNumber.toString(),
      },
    });
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const openComplaints = () => {
    router.push({
      pathname: "/my-complaints",
      params: {
        ward: wardNumber.toString(),
      },
    });
  };

  const openProfile = () => {
    router.push({
      pathname: "/profile",
      params: {
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
            <Text style={styles.loadingLogoText}>TS</Text>
          </View>

          <ActivityIndicator
            size="large"
            color="#D71920"
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
        <View
          style={[
            styles.headerInner,
            contentMaxWidth
              ? {
                  width: "100%",
                  maxWidth: contentMaxWidth,
                  alignSelf: "center",
                }
              : null,
          ]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={loggingOut}
            activeOpacity={0.75}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text
              style={[
                styles.headerTitle,
                isSmallMobile && styles.headerTitleSmall,
              ]}
              numberOfLines={1}>
              {wardName}
            </Text>

            <Text style={styles.headerSubtitle}>Tiruppur Smart City</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{wardNumber}</Text>
            </View>

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
        </View>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.pageContent,
            contentMaxWidth
              ? {
                  width: "100%",
                  maxWidth: contentMaxWidth,
                  alignSelf: "center",
                }
              : null,
          ]}>
          {/* WELCOME */}

          <View
            style={[styles.welcomeCard, isTablet && styles.welcomeCardTablet]}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeIconText}>TS</Text>
            </View>

            <View style={styles.welcomeContent}>
              <Text
                style={[
                  styles.welcomeTitle,
                  isSmallMobile && styles.welcomeTitleSmall,
                ]}>
                Welcome to {wardName}
              </Text>

              <Text style={styles.welcomeText}>
                {user?.name ? `வணக்கம் ${user.name}! ` : ""}
                உங்கள் வார்டில் நடைபெறும் முக்கியமான தகவல்கள், உறுப்பினர்கள்
                மற்றும் பொதுமக்கள் குறைகளை இங்கே தெரிந்துகொள்ளலாம்.
              </Text>
            </View>
          </View>

          {/* WARD INFORMATION */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ward Information</Text>

            <Text style={styles.sectionTamil}>வார்டு தகவல்கள்</Text>
          </View>

          <View style={[styles.infoGrid, isTablet && styles.infoGridTablet]}>
            <View style={[styles.infoBox, isTablet && styles.infoBoxTablet]}>
              <Text style={styles.infoNumber}>
                {stats.totalPeople ?? ward.totalPeople ?? "--"}
              </Text>

              <Text style={styles.infoLabel}>Total People</Text>
            </View>

            <View style={[styles.infoBox, isTablet && styles.infoBoxTablet]}>
              <Text style={styles.infoNumber}>
                {stats.wardMembers ?? members.length}
              </Text>

              <Text style={styles.infoLabel}>Ward Members</Text>
            </View>

            <View style={[styles.infoBox, isTablet && styles.infoBoxTablet]}>
              <Text style={styles.infoNumber}>
                {stats.registeredUsers ?? 0}
              </Text>

              <Text style={styles.infoLabel}>Registered Users</Text>
            </View>

            <View style={[styles.infoBox, isTablet && styles.infoBoxTablet]}>
              <Text style={styles.infoNumber}>
                {stats.complaints ?? complaints.length}
              </Text>

              <Text style={styles.infoLabel}>Complaints</Text>
            </View>
          </View>

          {/* DESCRIPTION */}

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

          {/* MEMBERS */}

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
                    <Text style={styles.memberName}>
                      {member.name || "Ward Member"}
                    </Text>

                    <Text style={styles.memberRole}>
                      {member.role || "Ward Member"}
                    </Text>

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

          {/* UPDATES */}

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
                    <Text style={styles.updateTitle}>
                      {update.title || "Ward Update"}
                    </Text>

                    <Text style={styles.updateDate}>
                      {update.date
                        ? new Date(update.date).toLocaleDateString()
                        : ""}
                    </Text>
                  </View>

                  <Text style={styles.updateDescription}>
                    {update.description || ""}
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

          {/* REPORT PROBLEM */}

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

          {/* PUBLIC COMPLAINTS */}

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
                      complaint.status === "In Progress" &&
                        styles.statusProgress,
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

          {/* REFRESH */}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadWardData}
            activeOpacity={0.8}
            disabled={loggingOut}>
            <Text style={styles.refreshText}>↻ Refresh Ward Data</Text>
          </TouchableOpacity>

          {/* BOTTOM LOGOUT */}

          <TouchableOpacity
            style={styles.bottomLogoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={loggingOut}>
            {loggingOut ? (
              <ActivityIndicator color="#D71920" />
            ) : (
              <>
                <Text style={styles.bottomLogoutIcon}>↪</Text>

                <Text style={styles.bottomLogoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>Tiruppur Smart City</Text>

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>

      {/* =================================================
          BOTTOM NAVIGATION
      ================================================= */}

      <View style={styles.bottomNav}>
        <View
          style={[
            styles.bottomNavInner,
            contentMaxWidth
              ? {
                  width: "100%",
                  maxWidth: contentMaxWidth,
                  alignSelf: "center",
                }
              : null,
          ]}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>

            <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={openComplaints}
            activeOpacity={0.7}>
            <Text style={styles.navIcon}>✓</Text>

            <Text style={styles.navText}>Complaints</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={openProfile}
            activeOpacity={0.7}>
            <View style={styles.profileNavCircle}>
              <Text style={styles.profileNavText}>
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.navText}>Me</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          LOGOUT CONFIRMATION MODAL
      ================================================= */}

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLogoutModal}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeLogoutModal}
          />

          <View style={styles.logoutModal}>
            <View style={styles.logoutModalIcon}>
              <Text style={styles.logoutModalIconText}>↪</Text>
            </View>

            <Text style={styles.logoutModalTitle}>Logout?</Text>

            <Text style={styles.logoutModalDescription}>
              Are you sure you want to logout from Tiruppur Smart City?
            </Text>

            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeLogoutModal}
                disabled={loggingOut}
                activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

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
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  loadingLogoText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  loader: {
    marginBottom: 15,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },

  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerInner: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  backIcon: {
    color: "#111827",
    fontSize: 31,
    fontWeight: "400",
    lineHeight: 32,
    marginTop: -3,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  headerTitleSmall: {
    fontSize: 17,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    gap: 8,
  },

  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#D71920",
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
    color: "#D71920",
    fontWeight: "800",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },

  scrollContentTablet: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  pageContent: {
    width: "100%",
  },

  welcomeCard: {
    flexDirection: "row",
    backgroundColor: "#D71920",
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
  },

  welcomeCardTablet: {
    padding: 22,
    borderRadius: 22,
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
    color: "#D71920",
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

  welcomeTitleSmall: {
    fontSize: 15,
  },

  welcomeText: {
    color: "#FEE2E2",
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
    color: "#111827",
  },

  sectionTamil: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  infoGridTablet: {
    gap: 14,
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
    marginBottom: 12,
  },

  infoBoxTablet: {
    width: "23.5%",
    marginBottom: 0,
  },

  infoNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#D71920",
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
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  memberAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D71920",
  },

  memberInfo: {
    flex: 1,
    marginLeft: 13,
  },

  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  updateIconText: {
    color: "#D71920",
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
    color: "#111827",
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
    color: "#D71920",
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
    minWidth: 0,
  },

  complaintTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  complaintLocation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  complaintCategory: {
    fontSize: 10,
    color: "#D71920",
    fontWeight: "700",
    marginTop: 5,
  },

  viewDetailsText: {
    fontSize: 11,
    color: "#D71920",
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
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  refreshText: {
    color: "#D71920",
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
    color: "#D71920",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },

  bottomLogoutText: {
    color: "#D71920",
    fontSize: 16,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },

  bottomSpace: {
    height: 80,
  },

  bottomNav: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  bottomNavInner: {
    minHeight: 72,
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

  navIconActive: {
    color: "#D71920",
  },

  navText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  navTextActive: {
    color: "#D71920",
    fontWeight: "800",
  },

  profileNavCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  profileNavText: {
    fontSize: 11,
    color: "#D71920",
    fontWeight: "900",
  },

  /* =====================================================
     LOGOUT MODAL
  ===================================================== */

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
