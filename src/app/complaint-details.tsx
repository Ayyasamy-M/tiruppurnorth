import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useCallback, useMemo, useState } from "react";

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
  API_BASE_URL,
  API_ENDPOINTS,
  authHeaders,
  clearAuth,
  getToken,
} from "../config/api";

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
  photo?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: {
    _id?: string;
    name?: string;
    mobile?: string;
    email?: string;
    address?: string;
    ward?: string;
  };
};

export default function ComplaintDetailsScreen() {
  const params = useLocalSearchParams();

  /* =====================================================
     SOURCE
  ===================================================== */

  const source = useMemo(() => {
    const sourceParam = Array.isArray(params.source)
      ? params.source[0]
      : params.source;

    return sourceParam?.toString() || "user";
  }, [params.source]);

  const isAdminSource = source === "admin";

  /* =====================================================
     WARD NUMBER
  ===================================================== */

  const wardNumber = useMemo(() => {
    const wardParam = Array.isArray(params.ward) ? params.ward[0] : params.ward;

    return wardParam?.toString() || "";
  }, [params.ward]);

  /* =====================================================
     COMPLAINT MONGO ID
  ===================================================== */

  const complaintMongoId = useMemo(() => {
    const idParam = Array.isArray(params.id) ? params.id[0] : params.id;

    return idParam?.toString().trim() || "";
  }, [params.id]);

  /* =====================================================
     STATE
  ===================================================== */

  const [complaint, setComplaint] = useState<Complaint | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /* =====================================================
     GO BACK
     
     IMPORTANT:
     Use router.back() so Expo Router follows
     the real navigation history.
     
     User flow:
     
     Ward Home
        ↓
     My Complaints
        ↓
     Complaint Details
        ↓ Back
     My Complaints
  ===================================================== */

  const goBackToSource = useCallback(() => {
    router.back();
  }, []);

  /* =====================================================
     ANDROID BACK BUTTON
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goBackToSource();

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [goBackToSource]),
  );

  /* =====================================================
     LOAD COMPLAINT
  ===================================================== */

  const loadComplaint = useCallback(async () => {
    if (!complaintMongoId) {
      setErrorMessage("Complaint ID is missing.");
      setComplaint(null);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getToken();

      if (!token) {
        await clearAuth();

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "Login",
              onPress: () => {
                router.replace("/login");
              },
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      const headers = await authHeaders();

      const response = await fetch(
        API_ENDPOINTS.complaintDetails(complaintMongoId),
        {
          method: "GET",
          headers,
        },
      );

      const rawText = await response.text();

      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        console.error("Complaint Details JSON Parse Error:", parseError);
      }

      console.log("Complaint Details API Status:", response.status);

      console.log("Complaint Details API Response:", data);

      /* =================================================
         AUTH ERROR
      ================================================= */

      if (response.status === 401 || response.status === 403) {
        await clearAuth();

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "Login",
              onPress: () => {
                router.replace("/login");
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
         HTTP ERROR
      ================================================= */

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load complaint details.");
      }

      /* =================================================
         API ERROR
      ================================================= */

      if (!data?.success || !data?.complaint) {
        throw new Error(
          data?.message || "Complaint details are not available.",
        );
      }

      setComplaint(data.complaint);
    } catch (error: any) {
      console.error("Complaint Details Load Error:", error);

      setComplaint(null);

      setErrorMessage(error?.message || "Unable to load complaint details.");
    } finally {
      setLoading(false);
    }
  }, [complaintMongoId]);

  /* =====================================================
     LOAD WHEN SCREEN FOCUSES
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      loadComplaint();
    }, [loadComplaint]),
  );

  /* =====================================================
     PHOTO URL
  ===================================================== */

  const photo = useMemo(() => {
    if (!complaint) {
      return "";
    }

    const rawPhoto = complaint.photoUrl || complaint.photo || "";

    if (!rawPhoto) {
      return "";
    }

    if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
      return rawPhoto;
    }

    if (rawPhoto.startsWith("/")) {
      return `${API_BASE_URL}${rawPhoto}`;
    }

    return `${API_BASE_URL}/${rawPhoto}`;
  }, [complaint]);

  /* =====================================================
     STATUS
  ===================================================== */

  const status = complaint?.status || "Pending";

  const statusStyle =
    status === "Resolved"
      ? styles.statusResolved
      : status === "Rejected"
        ? styles.statusRejected
        : status === "In Progress"
          ? styles.statusProgress
          : styles.statusPending;

  const statusTextStyle =
    status === "Resolved"
      ? styles.statusResolvedText
      : status === "Rejected"
        ? styles.statusRejectedText
        : status === "In Progress"
          ? styles.statusProgressText
          : styles.statusPendingText;

  /* =====================================================
     DATE
  ===================================================== */

  const createdDate = complaint?.createdAt
    ? new Date(complaint.createdAt).toLocaleString("en-IN")
    : "Not available";

  const updatedDate = complaint?.updatedAt
    ? new Date(complaint.updatedAt).toLocaleString("en-IN")
    : "Not available";

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBackToSource}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Complaint Details</Text>

            <Text style={styles.headerSubtitle}>பொதுமக்கள் புகார் விவரம்</Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Text style={styles.loadingIcon}>📋</Text>
          </View>

          <ActivityIndicator size="large" color="#D71920" />

          <Text style={styles.loadingTitle}>Loading complaint...</Text>

          <Text style={styles.loadingTamil}>
            புகார் விவரங்கள் ஏற்றப்படுகிறது...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     ERROR / NOT FOUND
  ===================================================== */

  if (!complaint) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBackToSource}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Complaint Details</Text>

            <Text style={styles.headerSubtitle}>பொதுமக்கள் புகார் விவரம்</Text>
          </View>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>

          <Text style={styles.errorTitle}>Complaint not found</Text>

          <Text style={styles.errorDescription}>
            {errorMessage || "Unable to load this complaint."}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadComplaint}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBackButton}
            onPress={goBackToSource}
            activeOpacity={0.8}>
            <Text style={styles.secondaryBackText}>← Go Back</Text>
          </TouchableOpacity>
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
          onPress={goBackToSource}
          activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Complaint Details</Text>

          <Text style={styles.headerSubtitle}>
            {isAdminSource
              ? "பொதுமக்கள் புகார் விவரம் • Admin"
              : `பொதுமக்கள் புகார் விவரம் • Ward ${
                  complaint.wardNumber || wardNumber || "N/A"
                }`}
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {isAdminSource ? "ADMIN" : "USER"}
          </Text>
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
            TITLE
        ================================================= */}

        <View style={styles.titleCard}>
          <View style={styles.titleTopRow}>
            <View style={styles.titleIcon}>
              <Text style={styles.titleIconText}>!</Text>
            </View>

            <View style={styles.titleContent}>
              <Text style={styles.title} numberOfLines={3}>
                {complaint.title || "Complaint"}
              </Text>

              {complaint.complaintId ? (
                <Text style={styles.complaintId}>{complaint.complaintId}</Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.statusBadge, statusStyle]}>
            <Text style={[styles.statusText, statusTextStyle]}>{status}</Text>
          </View>
        </View>

        {/* =================================================
            PHOTO
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Complaint Photo</Text>

          <Text style={styles.sectionTamil}>புகார் புகைப்படம்</Text>
        </View>

        {photo ? (
          <View style={styles.photoCard}>
            <Image
              source={{ uri: photo }}
              style={styles.complaintPhoto}
              resizeMode="cover"
              onError={(error) => {
                console.error("Complaint Photo Load Error:", error.nativeEvent);
              }}
            />
          </View>
        ) : (
          <View style={styles.noPhotoCard}>
            <Text style={styles.noPhotoIcon}>📷</Text>

            <Text style={styles.noPhotoTitle}>No photo attached</Text>

            <Text style={styles.noPhotoText}>
              இந்த புகாருடன் புகைப்படம் இணைக்கப்படவில்லை.
            </Text>
          </View>
        )}

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Description</Text>

          <Text style={styles.sectionTamil}>புகார் விவரம்</Text>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            {complaint.description || "No description provided."}
          </Text>
        </View>

        {/* =================================================
            COMPLAINT INFORMATION
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Complaint Information</Text>

          <Text style={styles.sectionTamil}>புகார் தகவல்கள்</Text>
        </View>

        <View style={styles.infoCard}>
          {complaint.complaintId ? (
            <InfoRow label="Complaint ID" value={complaint.complaintId} />
          ) : null}

          <InfoRow
            label="Category"
            value={complaint.category || "Not specified"}
          />

          <InfoRow
            label="Location"
            value={complaint.location || "Not specified"}
          />

          <InfoRow
            label="Ward"
            value={`Ward ${complaint.wardNumber || wardNumber || "N/A"}`}
          />

          {complaint.phone ? (
            <InfoRow label="Phone" value={complaint.phone} />
          ) : null}

          {complaint.userId?.name ? (
            <InfoRow label="Submitted By" value={complaint.userId.name} />
          ) : null}

          <InfoRow label="Submitted" value={createdDate} />

          <InfoRow label="Last Updated" value={updatedDate} last />
        </View>

        {/* =================================================
            STATUS
        ================================================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Complaint Status</Text>

          <Text style={styles.sectionTamil}>புகார் நிலை</Text>
        </View>

        <View style={[styles.largeStatusCard, statusStyle]}>
          <View style={styles.statusCircle}>
            <Text style={[styles.statusCircleText, statusTextStyle]}>
              {status === "Rejected"
                ? "!"
                : status === "Resolved"
                  ? "✓"
                  : status === "In Progress"
                    ? "..."
                    : "•"}
            </Text>
          </View>

          <View style={styles.largeStatusContent}>
            <Text style={[styles.largeStatusTitle, statusTextStyle]}>
              {status}
            </Text>

            <Text style={styles.largeStatusDescription}>
              {status === "Resolved"
                ? "இந்த புகார் தீர்வு செய்யப்பட்டுள்ளது."
                : status === "Rejected"
                  ? "இந்த புகார் நிராகரிக்கப்பட்டுள்ளது."
                  : status === "In Progress"
                    ? "இந்த புகார் தற்போது பரிசீலனையில் உள்ளது."
                    : "இந்த புகார் பதிவு செய்யப்பட்டு நடவடிக்கைக்காக காத்திருக்கிறது."}
            </Text>
          </View>
        </View>

        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={goBackToSource}
          activeOpacity={0.8}>
          <Text style={styles.bottomButtonText}>
            ← {isAdminSource ? "Back" : "Back to My Complaints"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Tiruppur Smart City</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   INFO ROW
===================================================== */

type InfoRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

function InfoRow({ label, value, last = false }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, last && styles.lastInfoRow]}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue} numberOfLines={5}>
        {value}
      </Text>
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

  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    marginLeft: 12,
    marginRight: 8,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFF7D6",
  },

  headerBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#92400E",
    letterSpacing: 0.5,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 50,
  },

  titleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  titleTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  titleIconText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#D71920",
  },

  titleContent: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 25,
  },

  complaintId: {
    fontSize: 11,
    color: "#D71920",
    fontWeight: "800",
    marginTop: 5,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 14,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  statusPending: {
    backgroundColor: "#FFF7D6",
  },

  statusPendingText: {
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

  sectionHeader: {
    marginBottom: 13,
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },

  sectionTamil: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  photoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
    overflow: "hidden",
  },

  complaintPhoto: {
    width: "100%",
    height: 300,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },

  noPhotoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
  },

  noPhotoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  noPhotoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#334155",
  },

  noPhotoText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 5,
  },

  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
  },

  descriptionText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    flex: 0.8,
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1.2,
    textAlign: "right",
  },

  largeStatusCard: {
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
  },

  statusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  statusCircleText: {
    fontSize: 20,
    fontWeight: "900",
  },

  largeStatusContent: {
    flex: 1,
    marginLeft: 13,
  },

  largeStatusTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  largeStatusDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginTop: 4,
  },

  bottomButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  bottomButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
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
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 16,
  },

  loadingTamil: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF7D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  errorIcon: {
    fontSize: 34,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
  },

  errorDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 450,
  },

  retryButton: {
    minWidth: 130,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#D71920",
    alignItems: "center",
    marginBottom: 12,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  secondaryBackButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0F172A",
  },

  secondaryBackText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
