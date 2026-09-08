import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  RefreshControl,
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
  getStoredUser,
  saveAuth,
} from "../config/api";

/* =====================================================
   COLORS
===================================================== */

const RED = "#D71920";
const YELLOW = "#FFD400";
const BLACK = "#111111";
const WHITE = "#FFFFFF";

const LIGHT = "#F7F7F7";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

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
  const { width } = useWindowDimensions();

  /* =====================================================
     RESPONSIVE SETTINGS
  ===================================================== */

  const isSmallMobile = width < 380;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const pageMaxWidth = isDesktop ? 1100 : isTablet ? 850 : width;

  const horizontalPadding = isDesktop
    ? 32
    : isTablet
      ? 28
      : isSmallMobile
        ? 16
        : 20;

  const contentWidth = Math.min(
    pageMaxWidth - horizontalPadding * 2,
    isDesktop ? 1036 : isTablet ? 794 : width - horizontalPadding * 2,
  );

  const wardCardWidth = isMobile ? "100%" : isDesktop ? "48.8%" : "48.5%";

  /* =====================================================
     STATE
  ===================================================== */

  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedWard, setSelectedWard] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     LOAD WARDS
  ===================================================== */

  const loadWards = useCallback(async () => {
    try {
      console.log("");
      console.log("====================================");
      console.log("🏘️ LOADING WARDS");
      console.log("====================================");

      const headers = await authHeaders();

      console.log("Authorization available:", Boolean(headers?.Authorization));

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
     ANDROID HARDWARE BACK
     
     Dynamic history:
     
     Auth Selection → Register → Ward Selection
                              ↓ Back
                           Register

     Auth Selection → Login → Ward Selection
                           ↓ Back
                         Login

     router.back() preserves actual navigation history.
  ===================================================== */

  useEffect(() => {
    const handleBackPress = () => {
      if (loading) {
        console.log("⛔ Back blocked because screen is loading");

        return true;
      }

      console.log("");
      console.log("====================================");
      console.log("📱 Android Back pressed");
      console.log("⬅️ Ward Selection → Previous Screen");
      console.log("Can Go Back:", router.canGoBack());
      console.log("====================================");

      if (router.canGoBack()) {
        router.back();
      } else {
        console.log("⚠️ No navigation history. Going to Auth Selection.");

        router.replace("/auth-selection");
      }

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    console.log("📱 Ward Selection BackHandler ENABLED");

    return () => {
      subscription.remove();

      console.log("📱 Ward Selection BackHandler DISABLED");
    };
  }, [loading]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    if (refreshing || loading) {
      return;
    }

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
     SELECT WARD
  ===================================================== */

  const handleWardSelect = (wardNumber: number) => {
    if (loading) {
      return;
    }

    console.log("");
    console.log("====================================");
    console.log("🏘️ WARD SELECTED");
    console.log("Selected Ward:", wardNumber);
    console.log("====================================");

    setSelectedWard(wardNumber);
  };

  /* =====================================================
     CONTINUE
  ===================================================== */

  const handleContinue = async () => {
    console.log("");
    console.log("====================================");
    console.log("🟡 CONTINUE BUTTON PRESSED");
    console.log("Selected Ward:", selectedWard);
    console.log("Loading:", loading);
    console.log("====================================");

    /* ===================================================
       VALIDATE SELECTION
    =================================================== */

    if (!selectedWard) {
      console.log("⛔ No ward selected");

      Alert.alert("Select Ward", "Please select your ward before continuing.");

      return;
    }

    /* ===================================================
       PREVENT DOUBLE SUBMIT
    =================================================== */

    if (loading) {
      console.log("⛔ Continue blocked because loading is true");

      return;
    }

    try {
      setLoading(true);

      console.log("");
      console.log("====================================");
      console.log("🏘️ WARD UPDATE STARTED");
      console.log("====================================");

      console.log("Selected Ward:", selectedWard);

      /* =================================================
         GET AUTH HEADERS
      ================================================= */

      const headers = await authHeaders();

      console.log("Authorization available:", Boolean(headers?.Authorization));

      /* =================================================
         CHECK LOGIN SESSION
      ================================================= */

      if (!headers?.Authorization) {
        console.log("❌ Authorization token not found");

        Alert.alert(
          "Login Required",
          "Your login session was not found. Please login again.",
        );

        router.replace("/login");

        return;
      }

      /* =================================================
         UPDATE WARD API
      ================================================= */

      console.log("➡️ Calling updateWard API");

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

      const responseText = await response.text();

      console.log("Update Ward API Status:", response.status);

      console.log("Update Ward API Response:", responseText);

      /* =================================================
         PARSE RESPONSE
      ================================================= */

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        console.log("❌ Update Ward response is not JSON");
      }

      /* =================================================
         API ERROR
      ================================================= */

      if (!response.ok) {
        console.log("❌ Ward update failed:", response.status);

        Alert.alert(
          "Ward Update Failed",
          data?.message || `Unable to update ward (${response.status})`,
        );

        return;
      }

      /* =================================================
         SUCCESS VALIDATION
      ================================================= */

      if (!data?.success) {
        console.log("❌ Backend returned success:false");

        Alert.alert(
          "Ward Update Failed",
          data?.message || "Unable to save your ward.",
        );

        return;
      }

      /* =================================================
         TOKEN
      ================================================= */

      const token = headers.Authorization.replace("Bearer ", "").trim();

      console.log("Token available:", Boolean(token));

      /* =================================================
         UPDATE LOCAL USER SESSION
      ================================================= */

      if (data?.user) {
        console.log("✅ Backend returned updated user");

        console.log("Updated User Ward:", data.user.ward);

        await saveAuth(token, data.user);

        console.log("✅ Updated user session saved");
      } else {
        /*
         * Backend did not return user.
         *
         * To make sure the selected ward is still
         * remembered locally, update the existing
         * stored user.
         */

        console.log("ℹ️ Backend did not return updated user");

        const existingUser = await getStoredUser();

        if (existingUser) {
          const updatedUser = {
            ...existingUser,
            ward: selectedWard.toString(),
          };

          await saveAuth(token, updatedUser);

          console.log("✅ Existing user session updated locally");

          console.log("Local User Ward:", updatedUser.ward);
        } else {
          console.log("⚠️ Existing user session not found");
        }
      }

      /* =================================================
         FINAL SUCCESS
      ================================================= */

      console.log("");
      console.log("====================================");
      console.log("✅ WARD SELECTION SUCCESS");
      console.log("====================================");

      console.log("Selected Ward:", selectedWard);

      console.log("➡️ Navigating to Ward Home");

      console.log("====================================");

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
      console.error("❌ Ward Update Error:", error);

      Alert.alert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     GO BACK
  ===================================================== */

  const goBack = () => {
    if (loading) {
      return;
    }

    console.log("");
    console.log("====================================");
    console.log("⬅️ Ward Selection → Previous Screen");
    console.log("Can Go Back:", router.canGoBack());
    console.log("====================================");

    if (router.canGoBack()) {
      router.back();
    } else {
      console.log("⚠️ No navigation history. Going to Auth Selection.");

      router.replace("/auth-selection");
    }
  };

  /* =====================================================
     LOADING SCREEN
  ===================================================== */

  if (loading && wards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={LIGHT} />

        <View
          style={[
            styles.loadingContainer,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          <View style={styles.loadingLogo}>
            <View style={styles.loadingLogoRed} />

            <View style={styles.loadingLogoYellow} />
          </View>

          <ActivityIndicator size="large" color={RED} />

          <Text
            style={[
              styles.loadingTitle,
              isSmallMobile && styles.loadingTitleSmall,
            ]}>
            Loading Wards
          </Text>

          <Text style={styles.loadingSubtitle}>
            வார்டு விவரங்கள் ஏற்றப்படுகிறது...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View
        style={[
          styles.pageWrapper,
          {
            width: pageMaxWidth,
            alignSelf: "center",
          },
        ]}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={[
            styles.header,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          {/* BACK BUTTON */}

          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            disabled={loading}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          {/* HEADER TEXT */}

          <View style={styles.headerTextContainer}>
            <View style={styles.headerEyebrowRow}>
              <View style={styles.headerDot} />

              <Text style={styles.headerEyebrow}>TIRUPPUR SMART CITY</Text>
            </View>

            <Text style={[styles.title, isSmallMobile && styles.titleSmall]}>
              உங்கள் வார்டை தேர்வு செய்யுங்கள்
            </Text>

            <Text style={styles.subtitle}>Select your ward to continue</Text>
          </View>

          {/* WARD COUNT */}

          <View style={styles.wardCount}>
            <Text style={styles.wardCountNumber}>{wards.length}</Text>

            <Text style={styles.wardCountLabel}>WARDS</Text>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              width: contentWidth,
              alignSelf: "center",
              paddingHorizontal: 0,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[RED]}
              tintColor={RED}
            />
          }>
          {/* =================================================
              INFO CARD
          ================================================= */}

          <View style={styles.infoCard}>
            <View style={styles.infoAccent} />

            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>⌖</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>உங்கள் பகுதி • உங்கள் குரல்</Text>

              <Text style={styles.infoText}>
                உங்கள் வார்டை தேர்வு செய்தவுடன், அந்த பகுதியில் உள்ள தகவல்கள்,
                மக்கள் பிரச்சனைகள் மற்றும் சேவைகளை எளிதாக அணுகலாம்.
              </Text>
            </View>
          </View>

          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>WARD DIRECTORY</Text>

              <Text
                style={[
                  styles.sectionTitle,
                  isSmallMobile && styles.sectionTitleSmall,
                ]}>
                Tiruppur Smart City Wards
              </Text>
            </View>

            <View style={styles.sectionMark}>
              <View style={styles.sectionMarkRed} />

              <View style={styles.sectionMarkYellow} />
            </View>
          </View>

          {/* =================================================
              WARD LIST
          ================================================= */}

          {wards.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>⌂</Text>
              </View>

              <Text style={styles.emptyTitle}>No Wards Available</Text>

              <Text style={styles.emptyText}>
                தற்போது எந்த வார்டும் சேர்க்கப்படவில்லை.
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
                disabled={refreshing}
                activeOpacity={0.7}>
                {refreshing ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <Text style={styles.retryText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
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
                      {
                        width: wardCardWidth,
                      },
                      isSelected && styles.selectedWardCard,
                    ]}
                    onPress={() => handleWardSelect(wardNumber)}
                    activeOpacity={0.75}
                    disabled={loading}>
                    {/* SELECTION ACCENT */}

                    {isSelected && <View style={styles.selectedAccent} />}

                    {/* WARD NUMBER */}

                    <View
                      style={[
                        styles.wardNumber,
                        isSelected && styles.selectedWardNumber,
                      ]}>
                      <Text
                        style={[
                          styles.wardNumberLabel,
                          isSelected && styles.selectedWardNumberLabel,
                        ]}>
                        WARD
                      </Text>

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
                        ]}
                        numberOfLines={2}>
                        {wardName}
                      </Text>

                      <Text style={styles.wardDescription}>
                        உங்கள் பகுதி தகவல்கள்
                      </Text>
                    </View>

                    {/* RADIO */}

                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* =================================================
              SELECTION NOTE
          ================================================= */}

          {wards.length > 0 && (
            <View style={styles.selectionNote}>
              <View style={styles.noteDot} />

              <Text style={styles.selectionNoteText}>
                ஒரு வார்டை மட்டும் தேர்வு செய்யவும்
              </Text>
            </View>
          )}

          {/* BOTTOM SPACE */}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* =================================================
            BOTTOM ACTION
        ================================================= */}

        <View
          style={[
            styles.bottomContainer,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          <View style={styles.bottomInner}>
            {/* SELECTED INFO */}
            <View style={styles.selectedInfo}>
              <View
                style={[
                  styles.selectedMiniIcon,
                  !selectedWard && styles.selectedMiniIconInactive,
                ]}>
                <Text style={styles.selectedMiniIconText}>
                  {selectedWard || "—"}
                </Text>
              </View>

              <View style={styles.selectedInfoText}>
                <Text style={styles.selectedLabel}>
                  {selectedWard ? "Selected Ward" : "Ward not selected"}
                </Text>

                <Text style={styles.selectedSubLabel}>
                  {selectedWard
                    ? `Ward ${selectedWard}`
                    : "தொடர உங்கள் வார்டை தேர்வு செய்யவும்"}
                </Text>
              </View>
            </View>
            {/* =================================================
                CONTINUE BUTTON
            ================================================= */}
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,

                (!selectedWard || loading) && styles.disabledButton,

                Boolean(pressed && selectedWard && !loading)
                  ? styles.continueButtonPressed
                  : null,
              ]}
              onPress={() => {
                console.log("🟡 CONTINUE BUTTON PRESSED");

                console.log("Selected Ward:", selectedWard);

                console.log("Loading:", loading);

                if (!selectedWard || loading) {
                  console.log("⛔ Continue blocked");

                  return;
                }

                handleContinue();
              }}
              disabled={!selectedWard || loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with selected ward">
              {loading ? (
                <View style={styles.continueLoadingRow}>
                  <ActivityIndicator color={WHITE} />

                  <Text style={styles.continueLoadingText}>Saving...</Text>
                </View>
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
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
     CONTAINER
  ===================================================== */

  container: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  pageWrapper: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  /* =====================================================
     LOADING
  ===================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
  },

  loadingLogoRed: {
    flex: 1,
    backgroundColor: RED,
  },

  loadingLogoYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "900",
    color: BLACK,
  },

  loadingTitleSmall: {
    fontSize: 16,
  },

  loadingSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 92,
    backgroundColor: RED,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 13,
    paddingBottom: 13,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  backText: {
    color: WHITE,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -2,
  },

  headerTextContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  headerEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: YELLOW,
    marginRight: 6,
  },

  headerEyebrow: {
    color: YELLOW,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  title: {
    color: WHITE,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
  },

  titleSmall: {
    fontSize: 17,
    lineHeight: 22,
  },

  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  wardCount: {
    minWidth: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    marginLeft: 10,
    flexShrink: 0,
  },

  wardCountNumber: {
    color: BLACK,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },

  wardCountLabel: {
    color: BLACK,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  /* =====================================================
     SCROLL
  ===================================================== */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 22,
    paddingBottom: 20,
  },

  /* =====================================================
     INFO CARD
  ===================================================== */

  infoCard: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  infoAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: YELLOW,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    flexShrink: 0,
  },

  infoIconText: {
    color: YELLOW,
    fontSize: 25,
    fontWeight: "900",
  },

  infoContent: {
    flex: 1,
    minWidth: 0,
  },

  infoTitle: {
    color: BLACK,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },

  infoText: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "600",
  },

  /* =====================================================
     SECTION HEADER
  ===================================================== */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 15,
  },

  sectionHeading: {
    flex: 1,
    minWidth: 0,
  },

  sectionEyebrow: {
    color: RED,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  sectionTitle: {
    color: BLACK,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },

  sectionTitleSmall: {
    fontSize: 17,
    lineHeight: 23,
  },

  sectionMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 10,
    flexShrink: 0,
  },

  sectionMarkRed: {
    flex: 1,
    backgroundColor: RED,
  },

  sectionMarkYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  /* =====================================================
     WARD LIST
  ===================================================== */

  wardList: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  wardCard: {
    minHeight: 92,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 12,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  selectedWardCard: {
    backgroundColor: "#FFF9D9",
    borderColor: RED,
    borderWidth: 1.5,
  },

  selectedAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: RED,
  },

  /* =====================================================
     WARD NUMBER
  ===================================================== */

  wardNumber: {
    width: 55,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  selectedWardNumber: {
    backgroundColor: RED,
  },

  wardNumberLabel: {
    color: TEXT_MUTED,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 1,
  },

  selectedWardNumberLabel: {
    color: YELLOW,
  },

  wardNumberText: {
    color: BLACK,
    fontSize: 20,
    fontWeight: "900",
  },

  selectedWardNumberText: {
    color: WHITE,
  },

  /* =====================================================
     DETAILS
  ===================================================== */

  wardDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },

  wardName: {
    color: BLACK,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },

  selectedWardName: {
    color: RED,
  },

  wardDescription: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },

  /* =====================================================
     RADIO
  ===================================================== */

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  radioSelected: {
    borderColor: RED,
    backgroundColor: RED,
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: YELLOW,
  },

  /* =====================================================
     SELECTION NOTE
  ===================================================== */

  selectionNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RED,
    marginRight: 6,
  },

  selectionNoteText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 25,
    paddingVertical: 40,
    alignItems: "center",
  },

  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    color: RED,
    fontSize: 32,
    fontWeight: "900",
  },

  emptyTitle: {
    color: BLACK,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14,
  },

  emptyText: {
    color: TEXT_MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
  },

  retryButton: {
    minWidth: 110,
    height: 42,
    borderRadius: 12,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 18,
  },

  retryText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  /* =====================================================
     BOTTOM SPACER
  ===================================================== */

  bottomSpacer: {
    height: 125,
  },

  /* =====================================================
     BOTTOM ACTION
  ===================================================== */

  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: -3,
    },
    elevation: 12,
  },

  bottomInner: {
    width: "100%",
    maxWidth: 1036,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },

  selectedMiniIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  selectedMiniIconInactive: {
    backgroundColor: "#E5E7EB",
  },

  selectedMiniIconText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  selectedInfoText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  selectedLabel: {
    color: BLACK,
    fontSize: 11,
    fontWeight: "900",
  },

  selectedSubLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 2,
  },

  /* =====================================================
     CONTINUE BUTTON
  ===================================================== */

  continueButton: {
    minWidth: 145,
    height: 52,
    borderRadius: 15,
    backgroundColor: RED,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: RED,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  continueButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },

  continueLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  continueLoadingText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },

  disabledButton: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },

  continueText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  arrowText: {
    color: YELLOW,
    fontSize: 22,
    fontWeight: "900",
    marginLeft: 9,
  },

  disabledText: {
    color: "#6B7280",
  },
});
