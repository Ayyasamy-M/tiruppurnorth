import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { API_ENDPOINTS } from "../config/api";

type Complaint = {
  _id?: string;
  id?: string;
  complaintId?: string;
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  wardNumber?: string;
  phone?: string;
  status?: string;
  photo?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AuthData = {
  token?: string;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    mobile?: string;
    ward?: string;
    role?: string;
  };
};

const getStatusStyle = (status?: string) => {
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
        backgroundColor: "#FEE2E2",
        textColor: "#B91C1C",
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

export default function MyComplaintsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ward?: string }>();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadComplaints = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const storedAuth = await AsyncStorage.getItem("auth");

      if (!storedAuth) {
        setComplaints([]);
        return;
      }

      const auth: AuthData = JSON.parse(storedAuth);

      if (!auth.token) {
        setComplaints([]);
        return;
      }

      const response = await fetch(API_ENDPOINTS.myComplaints, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load complaints");
      }

      if (!data?.success) {
        throw new Error(data?.message || "Unable to load complaints");
      }

      setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
    } catch (error: any) {
      console.error("My Complaints Error:", error);

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
  };

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadComplaints(false);
  };

  const handleComplaintPress = (complaint: Complaint) => {
    const complaintId = complaint.id || complaint._id || complaint.complaintId;

    if (!complaintId) {
      return;
    }

    router.push({
      pathname: "/complaint-details",
      params: {
        id: complaintId,
      },
    });
  };

  const handleHome = () => {
    router.replace("/");
  };

  const handleComplaints = () => {
    // Already on complaints screen.
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const statusStyle = getStatusStyle(item.status);

    const imageUrl = item.photoUrl || item.photo || "";

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleComplaintPress(item)}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.complaintImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>📋</Text>
          </View>
        )}

        <View style={styles.cardContent}>
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

          <Text style={styles.title} numberOfLines={2}>
            {item.title || "Complaint"}
          </Text>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

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

          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
          You haven't submitted any complaints yet.
          {"\n"}
          Report a problem from your ward home.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {
            const ward = params.ward;

            if (ward) {
              router.push({
                pathname: "/report-problem",
                params: { ward },
              });
            } else {
              router.push("/ward-selection");
            }
          }}>
          <Text style={styles.reportButtonText}>Report a Problem</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D71920" />

          <Text style={styles.loadingText}>Loading your complaints...</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
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

        {/* LIST */}
        <FlatList
          data={complaints}
          keyExtractor={(item, index) =>
            item.id || item._id || item.complaintId || `complaint-${index}`
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

      <BottomNavigation
        active="complaints"
        onHome={handleHome}
        onComplaints={handleComplaints}
        onProfile={handleProfile}
      />
    </SafeAreaView>
  );
}

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
      <Pressable style={styles.navItem} onPress={onHome}>
        <Text
          style={[styles.navIcon, active === "home" && styles.navIconActive]}>
          ⌂
        </Text>

        <Text
          style={[styles.navLabel, active === "home" && styles.navLabelActive]}>
          Home
        </Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={onComplaints}>
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

      <Pressable style={styles.navItem} onPress={onProfile}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  container: {
    flex: 1,
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  headerSmall: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D71920",
    letterSpacing: 1,
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#171717",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#777777",
    marginTop: 3,
  },

  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF4D6",
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    fontSize: 23,
  },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
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
  },

  summaryNumber: {
    fontSize: 19,
    fontWeight: "800",
    color: "#D71920",
  },

  summaryLabel: {
    fontSize: 10,
    color: "#777777",
    marginTop: 2,
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E5E5",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  complaintImage: {
    width: "100%",
    height: 165,
    backgroundColor: "#EEEEEE",
  },

  imagePlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderIcon: {
    fontSize: 35,
    opacity: 0.6,
  },

  cardContent: {
    padding: 15,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  complaintIdContainer: {
    flex: 1,
  },

  complaintIdLabel: {
    fontSize: 10,
    color: "#999999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  complaintId: {
    fontSize: 12,
    color: "#555555",
    fontWeight: "700",
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginTop: 12,
    lineHeight: 23,
  },

  description: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 19,
    marginTop: 6,
  },

  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
  },

  metaIcon: {
    fontSize: 11,
    marginRight: 4,
  },

  metaText: {
    fontSize: 11,
    color: "#666666",
    fontWeight: "600",
  },

  viewDetailsRow: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewDetailsText: {
    fontSize: 13,
    color: "#D71920",
    fontWeight: "800",
  },

  arrow: {
    fontSize: 24,
    color: "#D71920",
    lineHeight: 20,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 60,
  },

  emptyIconContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFF4D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
  },

  emptyDescription: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  reportButton: {
    marginTop: 20,
    backgroundColor: "#D71920",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#777777",
    fontSize: 14,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
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
    width: 36,
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
    color: "#777777",
  },

  navIconActive: {
    color: "#D71920",
  },

  navLabel: {
    fontSize: 10,
    color: "#777777",
    fontWeight: "600",
    marginTop: 2,
  },

  navLabelActive: {
    color: "#D71920",
    fontWeight: "800",
  },
});
