import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useCallback, useMemo } from "react";

import {
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

import { API_BASE_URL } from "../config/api";

export default function ComplaintDetailsScreen() {
  const params = useLocalSearchParams();

  /* =====================================================
     NAVIGATION SOURCE

     source=user
       → Complaint Details opened from Ward Home
       → Back goes to same Ward Home

     source=admin
       → Complaint Details opened from Admin Complaints
       → Back goes to Admin Complaints

     Default:
       → user
  ===================================================== */

  const source = useMemo(() => {
    const sourceParam = Array.isArray(params.source)
      ? params.source[0]
      : params.source;

    return sourceParam?.toString() || "user";
  }, [params.source]);

  const isAdminSource = source === "admin";

  console.log("Complaint Details Source:", source);

  /* =====================================================
     GET WARD NUMBER

     User Ward Home இருந்து வந்தால் ward number இருக்கும்.

     Example:
     Ward 2 → complaint-details → ward = "2"
     Ward 4 → complaint-details → ward = "4"

     Admin-க்கு ward number இருந்தாலும்,
     Back navigation Admin Complaints-க்குத்தான் போகும்.
  ===================================================== */

  const wardNumber = useMemo(() => {
    const wardParam = Array.isArray(params.ward) ? params.ward[0] : params.ward;

    return wardParam?.toString() || "1";
  }, [params.ward]);

  console.log("Complaint Details Ward:", wardNumber);

  /* =====================================================
     GO BACK TO CORRECT PAGE

     USER:
       Complaint Details
              ↓
       Ward Home

     ADMIN:
       Complaint Details
              ↓
       Admin Complaints
  ===================================================== */

  const goBackToSource = useCallback(() => {
    if (isAdminSource) {
      console.log("Complaint Details → Admin Complaints");

      router.replace("/admin-complaints");

      return;
    }

    console.log("Complaint Details → Ward Home:", wardNumber);

    router.replace({
      pathname: "/ward-home",
      params: {
        ward: wardNumber,
      },
    });
  }, [isAdminSource, wardNumber]);

  /* =====================================================
     ANDROID PHONE BACK BUTTON

     USER:
       Complaint Details
            ↓ Android Back
       Same Ward Home

     ADMIN:
       Complaint Details
            ↓ Android Back
       Admin Complaints
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
     GET COMPLAINT DATA
  ===================================================== */

  const complaint = useMemo(() => {
    try {
      const raw = Array.isArray(params.complaint)
        ? params.complaint[0]
        : params.complaint;

      if (!raw) {
        console.log("Complaint parameter missing");

        return null;
      }

      const parsedComplaint = JSON.parse(raw);

      console.log("Complaint Details:", parsedComplaint);

      return parsedComplaint;
    } catch (error) {
      console.error("Complaint Parse Error:", error);

      return null;
    }
  }, [params.complaint]);

  /* =====================================================
     INVALID COMPLAINT
  ===================================================== */

  if (!complaint) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorTitle}>Complaint not found</Text>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={goBackToSource}
            activeOpacity={0.8}>
            <Text style={styles.backHomeText}>
              {isAdminSource
                ? "Go to Admin Complaints"
                : `Go to Ward ${wardNumber} Home`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     PHOTO
  ===================================================== */

  const rawPhoto =
    complaint.photo || complaint.image || complaint.imageUrl || "";

  const photo = rawPhoto
    ? rawPhoto.startsWith("http")
      ? rawPhoto
      : `${API_BASE_URL}${rawPhoto}`
    : "";

  console.log("Raw Photo:", rawPhoto);
  console.log("Final Photo URL:", photo);

  /* =====================================================
     STATUS
  ===================================================== */

  const status = complaint.status || "Pending";

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

  const createdDate = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleString()
    : "Not available";

  const updatedDate = complaint.updatedAt
    ? new Date(complaint.updatedAt).toLocaleString()
    : "Not available";

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
              : `பொதுமக்கள் புகார் விவரம் • Ward ${wardNumber}`}
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
            COMPLAINT TITLE
        ================================================= */}

        <View style={styles.titleCard}>
          <View style={styles.titleTopRow}>
            <View style={styles.titleIcon}>
              <Text style={styles.titleIconText}>!</Text>
            </View>

            <View style={styles.titleContent}>
              <Text style={styles.title}>{complaint.title || "Complaint"}</Text>

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
              source={{
                uri: photo,
              }}
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
          {/* COMPLAINT ID */}

          {complaint.complaintId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Complaint ID</Text>

              <Text style={styles.infoValue}>{complaint.complaintId}</Text>
            </View>
          ) : null}

          {/* CATEGORY */}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>

            <Text style={styles.infoValue}>
              {complaint.category || "Not specified"}
            </Text>
          </View>

          {/* LOCATION */}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>

            <Text style={styles.infoValue}>
              {complaint.location || "Not specified"}
            </Text>
          </View>

          {/* WARD */}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ward</Text>

            <Text style={styles.infoValue}>
              Ward {complaint.wardNumber || wardNumber || "N/A"}
            </Text>
          </View>

          {/* PHONE */}

          {complaint.phone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>

              <Text style={styles.infoValue}>{complaint.phone}</Text>
            </View>
          ) : null}

          {/* USER */}

          {complaint.userId?.name ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted By</Text>

              <Text style={styles.infoValue}>{complaint.userId.name}</Text>
            </View>
          ) : null}

          {/* CREATED */}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted</Text>

            <Text style={styles.infoValue}>{createdDate}</Text>
          </View>

          {/* UPDATED */}

          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Text style={styles.infoLabel}>Last Updated</Text>

            <Text style={styles.infoValue}>{updatedDate}</Text>
          </View>
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
            <Text style={styles.statusCircleText}>
              {status === "Rejected" ? "!" : status === "Resolved" ? "✓" : "•"}
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
            BACK TO CORRECT PAGE
        ================================================= */}

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={goBackToSource}
          activeOpacity={0.8}>
          <Text style={styles.bottomButtonText}>
            {isAdminSource
              ? "← Back to Admin Complaints"
              : `← Back to Ward ${wardNumber} Home`}
          </Text>
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

  /* HEADER */

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
    flex: 1,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  /* SCROLL */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* TITLE */

  titleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
  },

  titleTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  titleIconText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F97316",
  },

  titleContent: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  complaintId: {
    fontSize: 11,
    color: "#075985",
    fontWeight: "700",
    marginTop: 5,
  },

  /* STATUS */

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 14,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  statusPending: {
    backgroundColor: "#FEF3C7",
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

  /* SECTION */

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

  /* PHOTO */

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
    height: 260,
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
    fontWeight: "800",
    color: "#334155",
  },

  noPhotoText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 5,
  },

  /* DESCRIPTION */

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

  /* INFO */

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

  /* LARGE STATUS */

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
    color: "#075985",
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

  /* BOTTOM BUTTON */

  bottomButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  bottomButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* FOOTER */

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },

  /* ERROR */

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },

  backHomeButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#075985",
  },

  backHomeText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
