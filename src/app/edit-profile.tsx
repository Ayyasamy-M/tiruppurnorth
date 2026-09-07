import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  API_ENDPOINTS,
  authHeaders,
  getStoredUser,
  saveAuth,
} from "../config/api";

export default function EditProfileScreen() {
  const params = useLocalSearchParams();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "";

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");

  const [mobile, setMobile] = useState("");

  const [email, setEmail] = useState("");

  const [address, setAddress] = useState("");

  const [assignedWard, setAssignedWard] = useState(wardNumber);

  /* =====================================================
     LOAD USER DETAILS
  ===================================================== */

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const headers = await authHeaders();

      /*
        |--------------------------------------------------------------------------
        | Load fresh profile from backend
        |--------------------------------------------------------------------------
        */

      try {
        const response = await fetch(API_ENDPOINTS.profile, {
          method: "GET",
          headers,
        });

        const data = await response.json();

        if (response.ok && data?.success && data?.user) {
          const user = data.user;

          setName(user.name || "");

          setMobile(user.mobile || user.phone || "");

          setEmail(user.email || "");

          setAddress(user.address || "");

          setAssignedWard(user.ward || wardNumber || "");

          return;
        }
      } catch (apiError) {
        console.log("Profile API Load Error:", apiError);
      }

      /*
        |--------------------------------------------------------------------------
        | Fallback to local storage
        |--------------------------------------------------------------------------
        */

      const storedUser = await getStoredUser();

      if (!storedUser) {
        Alert.alert(
          "Session Error",
          "Unable to load your profile. Please login again.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ],
        );

        return;
      }

      setName(storedUser.name || "");

      setMobile(storedUser.mobile || storedUser.phone || "");

      setEmail(storedUser.email || "");

      setAddress(storedUser.address || "");

      setAssignedWard(storedUser.ward || wardNumber || "");
    } catch (error) {
      console.error("Edit Profile Load Error:", error);

      Alert.alert("Error", "Unable to load profile details.");
    } finally {
      setLoading(false);
    }
  }, [wardNumber]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  /* =====================================================
     ANDROID BACK
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (saving) {
          return true;
        }

        router.back();

        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [saving]),
  );

  /* =====================================================
     SAVE PROFILE
  ===================================================== */

  const handleSave = async () => {
    const trimmedName = name.trim();

    const trimmedMobile = mobile.trim();

    const trimmedEmail = email.trim();

    const trimmedAddress = address.trim();

    /* =================================================
         VALIDATION
      ================================================= */

    if (!trimmedName) {
      Alert.alert("Name Required", "Please enter your name.");

      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert("Invalid Name", "Please enter a valid name.");

      return;
    }

    if (!trimmedMobile) {
      Alert.alert("Mobile Number Required", "Please enter your mobile number.");

      return;
    }

    if (!/^[0-9]{10}$/.test(trimmedMobile)) {
      Alert.alert(
        "Invalid Mobile Number",
        "Please enter a valid 10-digit mobile number.",
      );

      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");

      return;
    }

    /* =================================================
         API UPDATE
      ================================================= */

    try {
      setSaving(true);

      const headers = await authHeaders();

      const response = await fetch(API_ENDPOINTS.profile, {
        method: "PUT",

        headers,

        body: JSON.stringify({
          name: trimmedName,
          mobile: trimmedMobile,
          email: trimmedEmail,
          address: trimmedAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Update Failed",
          data?.message || "Unable to update your profile.",
        );

        return;
      }

      if (!data?.success || !data?.user) {
        Alert.alert(
          "Update Failed",
          data?.message || "Unable to update your profile.",
        );

        return;
      }

      /* =================================================
           UPDATE LOCAL SESSION
        ================================================= */

      const storedUser = await getStoredUser();

      const updatedUser = {
        ...(storedUser || {}),
        ...data.user,
      };

      /*
        |--------------------------------------------------------------------------
        | Keep existing authentication token.
        |--------------------------------------------------------------------------
        */

      const token = headers.Authorization?.replace("Bearer ", "");

      if (token) {
        await saveAuth(token, updatedUser);
      }

      /* =================================================
           SUCCESS
        ================================================= */

      Alert.alert(
        "Profile Updated",
        "Your profile has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Save Profile Error:", error);

      Alert.alert(
        "Update Failed",
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     CHANGE PHOTO
  ===================================================== */

  const handleChangePhoto = () => {
    Alert.alert("Profile Photo", "Photo selection will be connected next.");
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />

        <ActivityIndicator size="large" color="#DC2626" />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Edit Profile</Text>

            <Text style={styles.headerSubtitle}>
              உங்கள் தகவல்களை மாற்றுங்கள்
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* =================================================
              PROFILE PHOTO
          ================================================= */}

          <View style={styles.photoSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.changePhotoButton}
              activeOpacity={0.7}
              disabled={saving}
              onPress={handleChangePhoto}>
              <Text style={styles.changePhotoText}>📷 Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Text style={styles.sectionTamil}>தனிப்பட்ட தகவல்கள்</Text>
          </View>

          {/* NAME */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          {/* MOBILE */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>

            <View style={styles.mobileContainer}>
              <Text style={styles.countryCode}>+91</Text>

              <TextInput
                style={styles.mobileInput}
                value={mobile}
                onChangeText={(value) =>
                  setMobile(value.replace(/[^0-9]/g, "").slice(0, 10))
                }
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!saving}
              />
            </View>

            <Text style={styles.helperText}>
              Mobile number மாற்றினால் OTP verification தேவைப்படும்.
            </Text>
          </View>

          {/* EMAIL */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          {/* ADDRESS */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>

            <TextInput
              style={[styles.input, styles.addressInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          {/* =================================================
              WARD
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ward</Text>

            <Text style={styles.sectionTamil}>வார்டு</Text>
          </View>

          <View style={styles.lockedCard}>
            <View style={styles.lockedIcon}>
              <Text>🗳️</Text>
            </View>

            <View style={styles.lockedContent}>
              <Text style={styles.lockedLabel}>Assigned Ward</Text>

              <Text style={styles.lockedValue}>
                {assignedWard
                  ? `Ward ${assignedWard}`
                  : "Ward assigned by system"}
              </Text>

              <Text style={styles.lockedHelper}>
                Ward cannot be changed from your profile.
              </Text>
            </View>

            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          {/* =================================================
              SAVE BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveButtonIcon}>✓</Text>

                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* =================================================
              CANCEL
          ================================================= */}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  keyboardContainer: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  photoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },

  avatarText: {
    fontSize: 42,
    fontWeight: "900",
    color: "#DC2626",
  },

  changePhotoButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
  },

  changePhotoText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
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

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#0F172A",
  },

  addressInput: {
    height: 110,
    paddingTop: 14,
  },

  mobileContainer: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  countryCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    paddingLeft: 15,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },

  mobileInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0F172A",
  },

  helperText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
    lineHeight: 17,
  },

  lockedCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  lockedIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  lockedContent: {
    flex: 1,
    marginLeft: 12,
  },

  lockedLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  lockedValue: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "800",
    marginTop: 3,
  },

  lockedHelper: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
  },

  lockIcon: {
    fontSize: 18,
    marginLeft: 8,
  },

  saveButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonIcon: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    marginRight: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  cancelButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },

  bottomSpace: {
    height: 30,
  },
});
