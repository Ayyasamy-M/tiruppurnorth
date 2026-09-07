import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_ENDPOINTS, authHeaders, saveAuth } from "../config/api";

/* =====================================================
   TYPES
===================================================== */

type Ward = {
  _id?: string;
  id?: number | string;
  wardNumber?: number | string;
  name?: string;
  wardName?: string;
};

/* =====================================================
   SCREEN
===================================================== */

export default function WardSelectionScreen() {
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedWard, setSelectedWard] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     LOAD WARDS
  ===================================================== */

  const loadWards = useCallback(async () => {
    try {
      const headers = await authHeaders();

      console.log("");
      console.log("====================================");
      console.log("🏘️ LOADING WARDS");
      console.log("====================================");

      /*
       * IMPORTANT:
       * API_ENDPOINTS.wards should point to:
       *
       * GET /api/wards
       */

      const response = await fetch(API_ENDPOINTS.wards, {
        method: "GET",
        headers,
      });

      const responseText = await response.text();

      console.log("Ward API Status:", response.status);
      console.log("Ward API Response:", responseText);

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        console.log("Ward response is not JSON");
      }

      if (!response.ok) {
        Alert.alert(
          "Ward Loading Failed",
          data?.message || `Unable to load wards (${response.status})`,
        );

        return;
      }

      if (!data?.success) {
        Alert.alert(
          "Ward Loading Failed",
          data?.message || "Unable to load wards.",
        );

        return;
      }

      /*
       * Backend response:
       *
       * {
       *   success: true,
       *   wards: [...]
       * }
       */

      const wardData = Array.isArray(data?.wards) ? data.wards : [];

      setWards(wardData);

      console.log("✅ Wards loaded:", wardData.length);
    } catch (error) {
      console.error("Load Wards Error:", error);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWards();
  }, [loadWards]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadWards();
  };

  /* =====================================================
     GET WARD NUMBER
  ===================================================== */

  const getWardNumber = (ward: Ward): number => {
    const value = ward.wardNumber ?? ward.id;

    return Number(value);
  };

  /* =====================================================
     GET WARD NAME
  ===================================================== */

  const getWardName = (ward: Ward): string => {
    return ward.name || ward.wardName || `Ward ${getWardNumber(ward)}`;
  };

  /* =====================================================
     CONTINUE
  ===================================================== */

  const handleContinue = async () => {
    if (!selectedWard) {
      Alert.alert("Select Ward", "Please select your ward");
      return;
    }

    try {
      setLoading(true);

      const headers = await authHeaders();

      if (!headers?.Authorization) {
        Alert.alert(
          "Login Required",
          "Please login before selecting your ward.",
        );

        router.replace("/login");

        return;
      }

      const response = await fetch(API_ENDPOINTS.updateWard, {
        method: "PUT",

        headers: {
          ...headers,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ward: selectedWard.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Ward Update Failed",
          data.message || "Unable to update ward",
        );

        return;
      }

      if (!data.success) {
        Alert.alert("Ward Update Failed", "Unable to save your ward");

        return;
      }

      /* =================================================
         UPDATE STORED USER
      ================================================= */

      const token = headers.Authorization?.replace("Bearer ", "");

      if (token && data.user) {
        await saveAuth(token, data.user);
      }

      /* =================================================
         GO TO WARD HOME
      ================================================= */

      router.replace({
        pathname: "/ward-home",
        params: {
          ward: selectedWard.toString(),
        },
      });
    } catch (error) {
      console.error("Ward Update Error:", error);

      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading && wards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075985" />

          <Text style={styles.loadingTitle}>Loading Wards</Text>

          <Text style={styles.loadingSubtitle}>
            வார்டு விவரங்கள் ஏற்றப்படுகிறது...
          </Text>
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

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          disabled={loading}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Select Your Ward</Text>

          <Text style={styles.subtitle}>உங்கள் வார்டை தேர்வு செய்யுங்கள்</Text>
        </View>

        <View style={styles.wardCount}>
          <Text style={styles.wardCountText}>{wards.length}</Text>
        </View>
      </View>

      {/* CONTENT */}

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
        {/* INFO */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Your Ward</Text>

            <Text style={styles.infoText}>
              உங்கள் பகுதியில் நடைபெறும் தகவல்கள் மற்றும் பொதுமக்கள் குறைகளை
              தெரிந்துகொள்ள உங்கள் வார்டை தேர்வு செய்யுங்கள்.
            </Text>
          </View>
        </View>

        {/* SECTION */}

        <Text style={styles.sectionTitle}>Tiruppur North Wards</Text>

        {/* EMPTY */}

        {wards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏘️</Text>

            <Text style={styles.emptyTitle}>No Wards Available</Text>

            <Text style={styles.emptyText}>
              தற்போது எந்த வார்டும் சேர்க்கப்படவில்லை.
            </Text>
          </View>
        ) : (
          /* WARD LIST */

          <View style={styles.wardList}>
            {wards.map((ward, index) => {
              const wardNumber = getWardNumber(ward);

              const wardName = getWardName(ward);

              const isSelected = selectedWard === wardNumber;

              return (
                <TouchableOpacity
                  key={ward._id || ward.id?.toString() || `ward-${index}`}
                  style={[
                    styles.wardCard,
                    isSelected && styles.selectedWardCard,
                  ]}
                  onPress={() => setSelectedWard(wardNumber)}
                  activeOpacity={0.7}
                  disabled={loading}>
                  {/* WARD NUMBER */}

                  <View
                    style={[
                      styles.wardNumber,
                      isSelected && styles.selectedWardNumber,
                    ]}>
                    <Text
                      style={[
                        styles.wardNumberText,
                        isSelected && styles.selectedWardNumberText,
                      ]}>
                      {wardNumber}
                    </Text>
                  </View>

                  {/* DETAILS */}

                  <View style={styles.wardDetails}>
                    <Text
                      style={[
                        styles.wardName,
                        isSelected && styles.selectedWardName,
                      ]}>
                      {wardName}
                    </Text>

                    <Text style={styles.wardDescription}>
                      View ward information
                    </Text>
                  </View>

                  {/* RADIO */}

                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM */}

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedWard || loading) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedWard || loading}
          activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text
                style={[
                  styles.continueText,
                  !selectedWard && styles.disabledText,
                ]}>
                Continue
              </Text>

              <Text
                style={[
                  styles.arrowText,
                  !selectedWard && styles.disabledText,
                ]}>
                →
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 34,
    color: "#0F172A",
    lineHeight: 38,
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
  },

  wardCount: {
    minWidth: 42,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  wardCountText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#075985",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#075985",
    marginBottom: 5,
  },

  infoText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  wardList: {
    gap: 12,
  },

  wardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
  },

  selectedWardCard: {
    borderColor: "#075985",
    backgroundColor: "#F0F9FF",
  },

  wardNumber: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedWardNumber: {
    backgroundColor: "#075985",
  },

  wardNumberText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#475569",
  },

  selectedWardNumberText: {
    color: "#FFFFFF",
  },

  wardDetails: {
    flex: 1,
    marginLeft: 14,
  },

  wardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  selectedWardName: {
    color: "#075985",
  },

  wardDescription: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#075985",
  },

  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#075985",
  },

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
    fontSize: 12,
    color: "#64748B",
    marginTop: 5,
    textAlign: "center",
  },

  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  continueButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#075985",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    backgroundColor: "#CBD5E1",
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  arrowText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
  },

  disabledText: {
    color: "#64748B",
  },
});
