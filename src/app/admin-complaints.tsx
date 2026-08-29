import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_ENDPOINTS, authHeaders } from "@/config/api";

/* =====================================================
   TYPES
===================================================== */

type ComplaintStatus = "Pending" | "In Progress" | "Resolved" | "Rejected";

type ComplaintUser =
  | {
      name?: string;
      mobile?: string;
    }
  | string
  | null;

type Complaint = {
  _id?: string;
  id?: string;

  complaintId?: string;

  wardNumber?: string;

  title?: string;

  description?: string;

  location?: string;

  phone?: string;

  category?: string;

  photo?: string;

  status?: ComplaintStatus;

  createdAt?: string;

  updatedAt?: string;

  userId?: ComplaintUser;
};

/* =====================================================
   FILTERS
===================================================== */

const STATUS_FILTERS = [
  "All",
  "Pending",
  "In Progress",
  "Resolved",
  "Rejected",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

const DATE_FILTERS = ["Latest", "Oldest"] as const;

type DateFilter = (typeof DATE_FILTERS)[number];

/* =====================================================
   SCREEN
===================================================== */

export default function AdminComplaintsScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  /* STATUS */
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>("All");

  /* SEARCH */
  const [searchText, setSearchText] = useState("");

  /* WARD */
  const [selectedWard, setSelectedWard] = useState<string>("All");

  /* CATEGORY */
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  /* DATE */
  const [selectedDateFilter, setSelectedDateFilter] =
    useState<DateFilter>("Latest");

  /* UI */
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* =====================================================
     ANDROID BACK BUTTON
     
     Physical Android back button:
     Complaints → Admin Dashboard
     
     No popup
     No router.back()
===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/admin-dashboard");

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  /* =====================================================
     GET COMPLAINTS
===================================================== */

  const loadComplaints = useCallback(async () => {
    try {
      const headers = await authHeaders();

      if (!headers?.Authorization) {
        Alert.alert("Login Required", "Admin login session not found.", [
          {
            text: "OK",
            onPress: () => {
              router.replace("/admin-login");
            },
          },
        ]);

        return;
      }

      console.log("");
      console.log("====================================");
      console.log("📢 ADMIN COMPLAINTS");
      console.log("====================================");

      const endpoint = API_ENDPOINTS.adminComplaints;

      console.log("API:", endpoint);

      const response = await fetch(endpoint, {
        method: "GET",

        headers: {
          Authorization: headers.Authorization,
        },
      });

      const responseText = await response.text();

      console.log("HTTP Status:", response.status);

      console.log("Response:", responseText);

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        console.log("Response is not JSON");
      }

      /* SESSION */

      if (response.status === 401) {
        Alert.alert("Session Expired", "Please login again.", [
          {
            text: "OK",
            onPress: () => {
              router.replace("/admin-login");
            },
          },
        ]);

        return;
      }

      /* ACCESS */

      if (response.status === 403) {
        Alert.alert("Access Denied", "Administrator access required.");

        return;
      }

      /* ERROR */

      if (!response.ok) {
        Alert.alert(
          "Complaints Error",
          data?.message || `Unable to load complaints (${response.status})`,
        );

        return;
      }

      /* SUCCESS */

      if (data?.success) {
        setComplaints(Array.isArray(data?.complaints) ? data.complaints : []);

        console.log("✅ Complaints loaded:", data?.complaints?.length || 0);
      } else {
        Alert.alert(
          "Complaints Error",
          data?.message || "Unable to load complaints.",
        );
      }
    } catch (error) {
      console.error("Load Complaints Error:", error);

      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* =====================================================
     INITIAL LOAD
===================================================== */

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  /* =====================================================
     REFRESH
===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadComplaints();
  };

  /* =====================================================
     USER NAME
===================================================== */

  const getUserName = (complaint: Complaint) => {
    if (complaint.userId && typeof complaint.userId === "object") {
      return complaint.userId.name || "Unknown User";
    }

    return "Unknown User";
  };

  /* =====================================================
     USER MOBILE
===================================================== */

  const getUserMobile = (complaint: Complaint) => {
    if (complaint.userId && typeof complaint.userId === "object") {
      return complaint.userId.mobile || complaint.phone || "";
    }

    return complaint.phone || "";
  };

  /* =====================================================
     WARD LIST
===================================================== */

  const wardFilters = useMemo(() => {
    const wards = complaints
      .map((complaint) =>
        complaint.wardNumber ? String(complaint.wardNumber) : "",
      )
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set(wards)).sort((a, b) => Number(a) - Number(b)),
    ];
  }, [complaints]);

  /* =====================================================
     CATEGORY LIST
===================================================== */

  const categoryFilters = useMemo(() => {
    const categories = complaints
      .map((complaint) => (complaint.category ? complaint.category.trim() : ""))
      .filter(Boolean);

    return ["All", ...Array.from(new Set(categories)).sort()];
  }, [complaints]);

  /* =====================================================
     COUNTS
===================================================== */

  const getCount = (status: StatusFilter) => {
    if (status === "All") {
      return complaints.length;
    }

    return complaints.filter(
      (complaint) => (complaint.status || "Pending") === status,
    ).length;
  };

  /* =====================================================
     FILTER + SEARCH + SORT
===================================================== */

  const filteredComplaints = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    let result = complaints.filter((complaint) => {
      /* STATUS */

      const status = complaint.status || "Pending";

      if (selectedFilter !== "All" && status !== selectedFilter) {
        return false;
      }

      /* WARD */

      if (
        selectedWard !== "All" &&
        String(complaint.wardNumber || "") !== selectedWard
      ) {
        return false;
      }

      /* CATEGORY */

      if (
        selectedCategory !== "All" &&
        String(complaint.category || "") !== selectedCategory
      ) {
        return false;
      }

      /* SEARCH */

      if (search) {
        const searchableText = [
          complaint.title,
          complaint.description,
          complaint.location,
          complaint.category,
          complaint.wardNumber,
          complaint.complaintId,
          complaint.phone,
          getUserName(complaint),
          getUserMobile(complaint),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(search)) {
          return false;
        }
      }

      return true;
    });

    /* DATE SORT */

    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;

      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (selectedDateFilter === "Latest") {
        return dateB - dateA;
      }

      return dateA - dateB;
    });

    return result;
  }, [
    complaints,
    selectedFilter,
    selectedWard,
    selectedCategory,
    selectedDateFilter,
    searchText,
  ]);

  /* =====================================================
     CLEAR FILTERS
===================================================== */

  const clearFilters = () => {
    setSelectedFilter("All");
    setSelectedWard("All");
    setSelectedCategory("All");
    setSelectedDateFilter("Latest");
    setSearchText("");
  };

  const hasActiveFilters =
    selectedFilter !== "All" ||
    selectedWard !== "All" ||
    selectedCategory !== "All" ||
    selectedDateFilter !== "Latest" ||
    searchText.trim() !== "";

  /* =====================================================
     OPEN DETAILS
===================================================== */

  const openComplaintDetails = (complaint: Complaint) => {
    router.push({
      pathname: "/complaint-details",
      params: {
        complaint: JSON.stringify(complaint),

        // IMPORTANT:
        // Complaint Details opened from ADMIN
        source: "admin",

        // Ward information is still passed for displaying
        // the complaint's ward inside details page.
        ward: complaint.wardNumber ? String(complaint.wardNumber) : "1",
      },
    });
  };

  /* =====================================================
     UPDATE STATUS
===================================================== */

  const updateStatus = (complaint: Complaint, status: ComplaintStatus) => {
    const complaintId = complaint._id || complaint.id;

    if (!complaintId) {
      Alert.alert("Error", "Complaint ID not found.");

      return;
    }

    if (complaint.status === status) {
      return;
    }

    Alert.alert("Update Complaint", `Change status to "${status}"?`, [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Update",

        onPress: async () => {
          try {
            setUpdatingId(complaintId);

            const headers = await authHeaders();

            const response = await fetch(
              `${API_ENDPOINTS.adminComplaints}/${complaintId}/status`,
              {
                method: "PUT",

                headers: {
                  "Content-Type": "application/json",

                  Authorization: headers.Authorization,
                },

                body: JSON.stringify({
                  status,
                }),
              },
            );

            const responseText = await response.text();

            console.log("Status Update Response:", responseText);

            let data: any = {};

            try {
              data = JSON.parse(responseText);
            } catch {}

            if (!response.ok) {
              Alert.alert(
                "Update Failed",
                data?.message || `Error ${response.status}`,
              );

              return;
            }

            if (data?.success) {
              setComplaints((current) =>
                current.map((item) =>
                  (item._id || item.id) === complaintId
                    ? {
                        ...item,
                        status,
                      }
                    : item,
                ),
              );

              Alert.alert("Updated", "Complaint status updated successfully.");
            } else {
              Alert.alert(
                "Update Failed",
                data?.message || "Unable to update status.",
              );
            }
          } catch (error) {
            console.error("Update Status Error:", error);

            Alert.alert("Connection Error", "Unable to connect to server.");
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  /* =====================================================
     STATUS STYLE
===================================================== */

  const getStatusStyle = (status: ComplaintStatus) => {
    switch (status) {
      case "Resolved":
        return {
          box: styles.resolvedBadge,
          text: styles.resolvedText,
        };

      case "Rejected":
        return {
          box: styles.rejectedBadge,
          text: styles.rejectedText,
        };

      case "In Progress":
        return {
          box: styles.progressBadge,
          text: styles.progressText,
        };

      default:
        return {
          box: styles.pendingBadge,
          text: styles.pendingText,
        };
    }
  };

  /* =====================================================
     LOADING
===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075985" />

          <Text style={styles.loadingTitle}>Loading Complaints</Text>

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/admin-dashboard")}
          activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Complaints</Text>

          <Text style={styles.headerSubtitle}>பொதுமக்கள் புகார்கள்</Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{complaints.length}</Text>
        </View>
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
            SUMMARY
        ================================================= */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text>📢</Text>
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Complaint Management</Text>

            <Text style={styles.summaryText}>
              View complaints and manage their status from here.
            </Text>
          </View>
        </View>

        {/* =================================================
            SEARCH
        ================================================= */}

        <Text style={styles.sectionTitle}>Search Complaints</Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search title, user, mobile, ward, location..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          {searchText.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              style={styles.clearSearch}>
              <Text style={styles.clearSearchText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* =================================================
            STATUS FILTER
        ================================================= */}

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
          Complaint Status
        </Text>

        <Text style={styles.sectionSubtitle}>Filter complaints by status</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}>
          {STATUS_FILTERS.map((filter) => {
            const active = selectedFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  active && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.75}>
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}>
                  {filter}
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    active && styles.filterCountActive,
                  ]}>
                  <Text
                    style={[
                      styles.filterCountText,
                      active && styles.filterCountTextActive,
                    ]}>
                    {getCount(filter)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =================================================
            WARD FILTER
        ================================================= */}

        <Text style={styles.filterHeading}>Ward</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}>
          {wardFilters.map((ward) => {
            const active = selectedWard === ward;

            return (
              <TouchableOpacity
                key={ward}
                style={[
                  styles.smallFilterButton,
                  active && styles.smallFilterButtonActive,
                ]}
                onPress={() => setSelectedWard(ward)}>
                <Text
                  style={[
                    styles.smallFilterText,
                    active && styles.smallFilterTextActive,
                  ]}>
                  {ward === "All" ? "All Wards" : `Ward ${ward}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =================================================
            CATEGORY FILTER
        ================================================= */}

        <Text style={styles.filterHeading}>Category</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}>
          {categoryFilters.map((category) => {
            const active = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.smallFilterButton,
                  active && styles.smallFilterButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}>
                <Text
                  style={[
                    styles.smallFilterText,
                    active && styles.smallFilterTextActive,
                  ]}>
                  {category === "All" ? "All Categories" : category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =================================================
            DATE FILTER
        ================================================= */}

        <Text style={styles.filterHeading}>Sort By</Text>

        <View style={styles.dateFilterRow}>
          {DATE_FILTERS.map((filter) => {
            const active = selectedDateFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.dateButton, active && styles.dateButtonActive]}
                onPress={() => setSelectedDateFilter(filter)}>
                <Text
                  style={[
                    styles.dateButtonText,
                    active && styles.dateButtonTextActive,
                  ]}>
                  {filter === "Latest" ? "↓ Latest First" : "↑ Oldest First"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =================================================
            CLEAR FILTERS
        ================================================= */}

        {hasActiveFilters ? (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
            activeOpacity={0.75}>
            <Text style={styles.clearFiltersText}>✕ Clear All Filters</Text>
          </TouchableOpacity>
        ) : null}

        {/* =================================================
            RESULT
        ================================================= */}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            {selectedFilter === "All" ? "All Complaints" : selectedFilter}
          </Text>

          <Text style={styles.resultCount}>
            {filteredComplaints.length} complaint
            {filteredComplaints.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* =================================================
            EMPTY
        ================================================= */}

        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>

            <Text style={styles.emptyTitle}>No Complaints</Text>

            <Text style={styles.emptyText}>
              No complaints match the selected filters.
            </Text>

            {hasActiveFilters ? (
              <TouchableOpacity
                style={styles.emptyClearButton}
                onPress={clearFilters}>
                <Text style={styles.emptyClearText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          /* =================================================
             COMPLAINT LIST
          ================================================= */

          filteredComplaints.map((complaint) => {
            const status = complaint.status || "Pending";

            const statusStyle = getStatusStyle(status);

            const complaintId = complaint._id || complaint.id || "";

            const isUpdating = updatingId === complaintId;

            return (
              <View key={complaintId} style={styles.complaintCard}>
                {/* TOP */}

                <View style={styles.cardTop}>
                  <View style={styles.complaintIcon}>
                    <Text>📢</Text>
                  </View>

                  <View style={styles.cardTopContent}>
                    <Text style={styles.complaintTitle} numberOfLines={2}>
                      {complaint.title || "Complaint"}
                    </Text>

                    <Text style={styles.complaintId}>
                      {complaint.complaintId || `ID: ${complaintId}`}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, statusStyle.box]}>
                    <Text style={[styles.statusBadgeText, statusStyle.text]}>
                      {status}
                    </Text>
                  </View>
                </View>

                {/* USER */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>👤</Text>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>User</Text>

                    <Text style={styles.infoValue}>
                      {getUserName(complaint)}
                    </Text>
                  </View>
                </View>

                {/* MOBILE */}

                {getUserMobile(complaint) ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📱</Text>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Mobile</Text>

                      <Text style={styles.infoValue}>
                        {getUserMobile(complaint)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* WARD */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🏘️</Text>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Ward</Text>

                    <Text style={styles.infoValue}>
                      {complaint.wardNumber || "Not available"}
                    </Text>
                  </View>
                </View>

                {/* CATEGORY */}

                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🏷️</Text>

                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Category</Text>

                    <Text style={styles.infoValue}>
                      {complaint.category || "General"}
                    </Text>
                  </View>
                </View>

                {/* LOCATION */}

                {complaint.location ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📍</Text>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Location</Text>

                      <Text style={styles.infoValue}>{complaint.location}</Text>
                    </View>
                  </View>
                ) : null}

                {/* DESCRIPTION */}

                {complaint.description ? (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionLabel}>Description</Text>

                    <Text style={styles.descriptionText} numberOfLines={4}>
                      {complaint.description}
                    </Text>
                  </View>
                ) : null}

                {/* DATE */}

                {complaint.createdAt ? (
                  <Text style={styles.dateText}>
                    Submitted: {new Date(complaint.createdAt).toLocaleString()}
                  </Text>
                ) : null}

                {/* STATUS UPDATE */}

                <Text style={styles.statusUpdateTitle}>Update Status</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.statusButtons}>
                    {["Pending", "In Progress", "Resolved", "Rejected"].map(
                      (nextStatus) => {
                        const active = status === nextStatus;

                        return (
                          <TouchableOpacity
                            key={nextStatus}
                            style={[
                              styles.statusButton,
                              active && styles.statusButtonActive,
                            ]}
                            onPress={() =>
                              updateStatus(
                                complaint,
                                nextStatus as ComplaintStatus,
                              )
                            }
                            disabled={isUpdating}
                            activeOpacity={0.75}>
                            {isUpdating && active ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text
                                style={[
                                  styles.statusButtonText,
                                  active && styles.statusButtonTextActive,
                                ]}>
                                {nextStatus}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </ScrollView>

                {/* DETAILS */}

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => openComplaintDetails(complaint)}
                  activeOpacity={0.75}>
                  <Text style={styles.detailsButtonText}>
                    View Complaint Details →
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* FOOTER */}

        <Text style={styles.footerText}>Tiruppur North Administration</Text>

        <Text style={styles.footerTamil}>பொதுமக்கள் புகார் மேலாண்மை</Text>
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

  /* LOADING */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
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

  /* HEADER */

  header: {
    height: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 43,
    height: 43,
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
    marginLeft: 12,
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

  headerCount: {
    minWidth: 42,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  headerCountText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#075985",
  },

  /* SCROLL */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: "#075985",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  summaryIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: "#0369A1",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
    marginLeft: 13,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  summaryText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#E0F2FE",
    marginTop: 4,
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    marginBottom: 13,
  },

  filterHeading: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
    marginTop: 6,
    marginBottom: 8,
  },

  /* SEARCH */

  searchBox: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginTop: 11,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 12,
    color: "#0F172A",
  },

  clearSearch: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  clearSearchText: {
    fontSize: 19,
    color: "#64748B",
    lineHeight: 20,
  },

  /* FILTER */

  filterContainer: {
    paddingBottom: 15,
    gap: 8,
  },

  filterButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  filterButtonActive: {
    backgroundColor: "#075985",
    borderColor: "#075985",
  },

  filterText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountActive: {
    backgroundColor: "#0369A1",
  },

  filterCountText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#475569",
  },

  filterCountTextActive: {
    color: "#FFFFFF",
  },

  /* SMALL FILTER */

  smallFilterButton: {
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  smallFilterButtonActive: {
    backgroundColor: "#075985",
    borderColor: "#075985",
  },

  smallFilterText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },

  smallFilterTextActive: {
    color: "#FFFFFF",
  },

  /* DATE */

  dateFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  dateButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  dateButtonActive: {
    backgroundColor: "#075985",
    borderColor: "#075985",
  },

  dateButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },

  dateButtonTextActive: {
    color: "#FFFFFF",
  },

  /* CLEAR */

  clearFiltersButton: {
    height: 42,
    borderRadius: 11,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  clearFiltersText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#B91C1C",
  },

  /* RESULT */

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },

  resultCount: {
    fontSize: 11,
    color: "#64748B",
  },

  /* CARD */

  complaintCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 15,
    marginBottom: 13,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  complaintIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTopContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  complaintTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 20,
  },

  complaintId: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 4,
  },

  /* STATUS */

  statusBadge: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },

  pendingText: {
    color: "#92400E",
  },

  progressBadge: {
    backgroundColor: "#DBEAFE",
  },

  progressText: {
    color: "#1D4ED8",
  },

  resolvedBadge: {
    backgroundColor: "#DCFCE7",
  },

  resolvedText: {
    color: "#166534",
  },

  rejectedBadge: {
    backgroundColor: "#FEE2E2",
  },

  rejectedText: {
    color: "#991B1B",
  },

  /* INFO */

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  infoIcon: {
    width: 30,
    fontSize: 16,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 9,
    color: "#94A3B8",
  },

  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 1,
  },

  /* DESCRIPTION */

  descriptionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 11,
    marginTop: 3,
    marginBottom: 10,
  },

  descriptionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },

  descriptionText: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 17,
    marginTop: 4,
  },

  dateText: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 3,
  },

  /* STATUS UPDATE */

  statusUpdateTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#334155",
    marginTop: 15,
    marginBottom: 9,
  },

  statusButtons: {
    flexDirection: "row",
    gap: 7,
    paddingBottom: 3,
  },

  statusButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  statusButtonActive: {
    backgroundColor: "#075985",
    borderColor: "#075985",
  },

  statusButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },

  statusButtonTextActive: {
    color: "#FFFFFF",
  },

  /* DETAILS */

  detailsButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },

  detailsButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#075985",
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 10,
  },

  emptyText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 5,
    textAlign: "center",
  },

  emptyClearButton: {
    marginTop: 15,
    backgroundColor: "#075985",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  emptyClearText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  /* FOOTER */

  footerText: {
    textAlign: "center",
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 25,
  },

  footerTamil: {
    textAlign: "center",
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 3,
  },
});
