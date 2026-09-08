import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_ENDPOINTS, getToken } from "../config/api";

type Complaint = {
  _id?: string;
  id?: string;
  complaintId?: string;
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  wardNumber?: string | number;
  phone?: string;
  status?: string;
  photo?: string | null;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StatusStyle = {
  backgroundColor: string;
  textColor: string;
};

const getStatusStyle = (status?: string): StatusStyle => {
  switch (status) {
    case "Resolved":
      return {
        backgroundColor: "#DCFCE7",
        textColor: "#166534",
      };

    case "In Progress":
      return {
        backgroundColor: "#FEF3C7",
        textColor: "#92400E",
      };

    case "Rejected":
      return {
        backgroundColor: "#FEE2E2",
        textColor: "#991B1B",
      };

    case "Pending":
    default:
      return {
        backgroundColor: "#FFF7D6",
        textColor: "#92400E",
      };
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) {
    return "Date not available";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeComplaints = (data: any): Complaint[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.complaints)) {
    return data.complaints;
  }

  if (Array.isArray(data?.data?.complaints)) {
    return data.data.complaints;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

export default function MyComplaintsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    ward?: string;
  }>();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /*
  |------------------------------------------------------------------
  | LOAD COMPLAINTS
  |------------------------------------------------------------------
  */

  const loadComplaints = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const token = await getToken();

        console.log("==============================");
        console.log("MY COMPLAINTS - TOKEN:", token ? "AVAILABLE" : "MISSING");
        console.log("MY COMPLAINTS API:", API_ENDPOINTS.myComplaints);

        if (!token) {
          setComplaints([]);

          if (showLoader) {
            Alert.alert(
              "Login Required",
              "Please login again to view your complaints.",
            );
          }

          return;
        }

        const response = await fetch(API_ENDPOINTS.myComplaints, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        console.log("MY COMPLAINTS STATUS:", response.status);

        const rawText = await response.text();

        console.log("MY COMPLAINTS RAW RESPONSE:", rawText);

        let data: any = null;

        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch (parseError) {
          console.error("My Complaints JSON Parse Error:", parseError);

          throw new Error("Invalid response received from server");
        }

        console.log("MY COMPLAINTS PARSED RESPONSE:", data);

        if (response.status === 401 || response.status === 403) {
          setComplaints([]);

          if (showLoader) {
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
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message || `Unable to load complaints (${response.status})`,
          );
        }

        if (data?.success === false) {
          throw new Error(data?.message || "Unable to load complaints");
        }

        const complaintList = normalizeComplaints(data);

        console.log("MY COMPLAINTS COUNT:", complaintList.length);

        setComplaints(complaintList);
      } catch (error: any) {
        console.error("My Complaints Error:", error);

        setComplaints([]);

        if (showLoader) {
          Alert.alert(
            "Unable to Load",
            error?.message || "Something went wrong while loading complaints.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  /*
  |------------------------------------------------------------------
  | SCREEN FOCUS
  |------------------------------------------------------------------
  */

  useFocusEffect(
    useCallback(() => {
      loadComplaints(true);
    }, [loadComplaints]),
  );

  /*
  |------------------------------------------------------------------
  | ANDROID BACK BUTTON
  |
  | Important:
  | Back should NOT logout.
  |
  | My Complaints
  |       ↓
  | Ward Home
  |
  |------------------------------------------------------------------
  */

  useFocusEffect(
    useCallback(() => {
      const handleAndroidBack = () => {
        router.back();

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleAndroidBack,
      );

      return () => {
        subscription.remove();
      };
    }, [router]),
  );

  /*
  |------------------------------------------------------------------
  | REFRESH
  |------------------------------------------------------------------
  */

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    void loadComplaints(false);
  };

  /*
  |------------------------------------------------------------------
  | COMPLAINT DETAILS
  |------------------------------------------------------------------
  */

  const handleComplaintPress = (complaint: Complaint) => {
    const mongoId = complaint._id;

    if (!mongoId) {
      Alert.alert("Unable to Open", "Complaint database ID is not available.");

      return;
    }

    console.log("Opening Complaint MongoDB ID:", mongoId);

    router.push({
      pathname: "/complaint-details",
      params: {
        id: mongoId,
        source: "user",
        ward: complaint.wardNumber?.toString() || wardNumber?.toString() || "",
      },
    });
  };

  /*
  |------------------------------------------------------------------
  | NAVIGATION
  |------------------------------------------------------------------
  */

  const handleHome = () => {
    /*
      Go back to the actual Ward Home.

      If Ward Home is the previous screen,
      router.back() preserves the navigation history.
    */

    router.back();
  };

  const handleComplaints = () => {
    // Already on Complaints screen.
  };

  const handleProfile = () => {
    router.push({
      pathname: "/profile",
      params: {
        ward: wardNumber.toString(),
      },
    });
  };

  /*
  |------------------------------------------------------------------
  | REPORT PROBLEM
  |------------------------------------------------------------------
  */

  const handleReportProblem = () => {
    if (wardNumber) {
      router.push({
        pathname: "/report-problem",
        params: {
          ward: wardNumber.toString(),
        },
      });

      return;
    }

    router.push("/ward-selection");
  };

  /*
  |------------------------------------------------------------------
  | RENDER COMPLAINT
  |------------------------------------------------------------------
  */

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const statusStyle = getStatusStyle(item.status);

    const imageUrl = item.photoUrl || (item.photo ? String(item.photo) : "");

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleComplaintPress(item)}>
        {/* IMAGE */}

        {imageUrl ? (
          <Image
            source={{
              uri: imageUrl,
            }}
            style={styles.complaintImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>📋</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          {/* TOP ROW */}

          <View style={styles.cardTopRow}>
            <View style={styles.complaintIdContainer}>
              <Text style={styles.complaintIdLabel}>Complaint ID</Text>

              <Text style={styles.complaintId} numberOfLines={1}>
                {item.complaintId || item.id || item._id || "Not available"}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusStyle.backgroundColor,
                },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color: statusStyle.textColor,
                  },
                ]}>
                {item.status || "Pending"}
              </Text>
            </View>
          </View>

          {/* TITLE */}

          <Text style={styles.title} numberOfLines={2}>
            {item.title || "Complaint"}
          </Text>

          {/* DESCRIPTION */}

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* META */}

          <View style={styles.metaContainer}>
            {item.category ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🏷️</Text>

                <Text style={styles.metaText} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            ) : null}

            {item.wardNumber ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📍</Text>

                <Text style={styles.metaText}>Ward {item.wardNumber}</Text>
              </View>
            ) : null}

            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>

              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>

          {/* VIEW DETAILS */}

          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>

            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  /*
  |------------------------------------------------------------------
  | EMPTY STATE
  |------------------------------------------------------------------
  */

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
        </View>

        <Text style={styles.emptyTitle}>No Complaints Yet</Text>

        <Text style={styles.emptyDescription}>
          You haven&apos;t submitted any complaints yet.
          {"\n"}
          Report a problem from your ward home.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleReportProblem}>
          <Text style={styles.reportButtonText}>Report a Problem</Text>

          <Text style={styles.reportButtonArrow}>→</Text>
        </Pressable>
      </View>
    );
  };

  /*
  |------------------------------------------------------------------
  | LOADING SCREEN
  |------------------------------------------------------------------
  */

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Text style={styles.loadingIcon}>📋</Text>
          </View>

          <ActivityIndicator size="large" color="#D71920" />

          <Text style={styles.loadingTitle}>Loading your complaints...</Text>

          <Text style={styles.loadingSubtitle}>
            உங்கள் புகார்களை ஏற்றுகிறது...
          </Text>
        </View>

        <BottomNavigation
          active="complaints"
          onHome={handleHome}
          onComplaints={handleComplaints}
          onProfile={handleProfile}
        />
      </SafeAreaView>
    );
  }

  /*
  |------------------------------------------------------------------
  | MAIN SCREEN
  |------------------------------------------------------------------
  */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerSmall}>TIRUPPUR SMART CITY</Text>

            <Text style={styles.headerTitle}>My Complaints</Text>

            <Text style={styles.headerSubtitle}>
              Track your reported problems
            </Text>
          </View>

          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>📋</Text>
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{complaints.length}</Text>

            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {complaints.filter((item) => item.status === "Pending").length}
            </Text>

            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {
                complaints.filter((item) => item.status === "In Progress")
                  .length
              }
            </Text>

            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {complaints.filter((item) => item.status === "Resolved").length}
            </Text>

            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
        </View>

        {/* COMPLAINT LIST */}

        <FlatList
          data={complaints}
          keyExtractor={(item, index) =>
            item._id || item.id || item.complaintId || `complaint-${index}`
          }
          renderItem={renderComplaint}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            complaints.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#D71920"
              colors={["#D71920"]}
            />
          }
        />
      </View>

      {/* BOTTOM NAVIGATION */}

      <BottomNavigation
        active="complaints"
        onHome={handleHome}
        onComplaints={handleComplaints}
        onProfile={handleProfile}
      />
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| BOTTOM NAVIGATION
|--------------------------------------------------------------------------
*/

type BottomNavigationProps = {
  active: "home" | "complaints" | "profile";
  onHome: () => void;
  onComplaints: () => void;
  onProfile: () => void;
};

function BottomNavigation({
  active,
  onHome,
  onComplaints,
  onProfile,
}: BottomNavigationProps) {
  return (
    <View style={styles.bottomNav}>
      {/* HOME */}

      <Pressable
        style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]}
        onPress={onHome}>
        <Text
          style={[styles.navIcon, active === "home" && styles.navIconActive]}>
          ⌂
        </Text>

        <Text
          style={[styles.navLabel, active === "home" && styles.navLabelActive]}>
          Home
        </Text>
      </Pressable>

      {/* COMPLAINTS */}

      <Pressable
        style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]}
        onPress={onComplaints}>
        <View
          style={[
            styles.navIconWrapper,
            active === "complaints" && styles.navIconWrapperActive,
          ]}>
          <Text
            style={[
              styles.navIcon,
              active === "complaints" && styles.navIconActive,
            ]}>
            📋
          </Text>
        </View>

        <Text
          style={[
            styles.navLabel,
            active === "complaints" && styles.navLabelActive,
          ]}>
          Complaints
        </Text>
      </Pressable>

      {/* PROFILE */}

      <Pressable
        style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]}
        onPress={onProfile}>
        <Text
          style={[
            styles.navIcon,
            active === "profile" && styles.navIconActive,
          ]}>
          👤
        </Text>

        <Text
          style={[
            styles.navLabel,
            active === "profile" && styles.navLabelActive,
          ]}>
          Me
        </Text>
      </Pressable>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  container: {
    flex: 1,
  },

  header: {
    backgroundColor: "#FFFFFF",
    minHeight: 86,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 8,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
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
    marginRight: 10,
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 36,
    color: "#0F172A",
    fontWeight: "400",
  },

  headerContent: {
    flex: 1,
  },

  headerSmall: {
    fontSize: 10,
    fontWeight: "900",
    color: "#D71920",
    letterSpacing: 1,
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  headerIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFF7D6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  headerIcon: {
    fontSize: 22,
  },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  summaryNumber: {
    fontSize: 19,
    fontWeight: "900",
    color: "#D71920",
  },

  summaryLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 3,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E8F0",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 105,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  complaintImage: {
    width: "100%",
    height: 165,
    backgroundColor: "#F1F5F9",
  },

  imagePlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderIcon: {
    fontSize: 35,
    opacity: 0.55,
  },

  cardContent: {
    padding: 15,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  complaintIdContainer: {
    flex: 1,
    marginRight: 10,
  },

  complaintIdLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  complaintId: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "800",
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 12,
    lineHeight: 23,
  },

  description: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginTop: 6,
  },

  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 7,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  metaIcon: {
    fontSize: 10,
    marginRight: 4,
  },

  metaText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },

  viewDetailsRow: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewDetailsText: {
    fontSize: 13,
    color: "#D71920",
    fontWeight: "900",
  },

  arrow: {
    fontSize: 24,
    color: "#D71920",
    lineHeight: 20,
    fontWeight: "700",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 55,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFF7D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },

  emptyDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  reportButton: {
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#D71920",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  reportButtonArrow: {
    color: "#FFD400",
    fontSize: 19,
    fontWeight: "900",
    marginLeft: 9,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  navPressed: {
    opacity: 0.7,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#FFF7D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingIcon: {
    fontSize: 30,
  },

  loadingTitle: {
    marginTop: 14,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },

  loadingSubtitle: {
    marginTop: 5,
    color: "#94A3B8",
    fontSize: 12,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 8 : 2,
  },

  navItem: {
    flex: 1,
    height: 65,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrapper: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrapperActive: {
    backgroundColor: "#FFF0F0",
  },

  navIcon: {
    fontSize: 21,
    color: "#64748B",
  },

  navIconActive: {
    color: "#D71920",
  },

  navLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },

  navLabelActive: {
    color: "#D71920",
    fontWeight: "900",
  },
});
