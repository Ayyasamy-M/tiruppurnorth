// src/app/report-problem.tsx

import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetch as expoFetch } from "expo/fetch";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { API_ENDPOINTS, authHeaders } from "@/config/api";

/* =====================================================
   CATEGORIES
===================================================== */

const categories = [
  {
    id: "water",
    title: "Water",
    tamil: "தண்ணீர்",
    icon: "💧",
  },
  {
    id: "road",
    title: "Road",
    tamil: "சாலை",
    icon: "🛣️",
  },
  {
    id: "electricity",
    title: "Electricity",
    tamil: "மின்சாரம்",
    icon: "⚡",
  },
  {
    id: "drainage",
    title: "Drainage",
    tamil: "கழிவுநீர்",
    icon: "🚰",
  },
  {
    id: "street-light",
    title: "Street Light",
    tamil: "தெருவிளக்கு",
    icon: "💡",
  },
  {
    id: "other",
    title: "Other",
    tamil: "மற்றவை",
    icon: "📌",
  },
];

/* =====================================================
   SCREEN
===================================================== */

export default function ReportProblemScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "1";

  const isSmallMobile = width < 380;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const contentMaxWidth = isDesktop ? 1100 : isTablet ? 850 : undefined;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* =====================================================
     ANDROID BACK BUTTON
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (submitting) {
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
    }, [submitting]),
  );

  /* =====================================================
     HEADER BACK
  ===================================================== */

  const handleBack = () => {
    if (submitting) {
      return;
    }

    router.back();
  };

  /* =====================================================
     GALLERY
  ===================================================== */

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access to upload a problem photo.",
          );

          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        console.log("====================================");
        console.log("📷 GALLERY IMAGE SELECTED");
        console.log("====================================");
        console.log("URI:", selectedAsset.uri);
        console.log("File name:", selectedAsset.fileName);
        console.log("File type:", selectedAsset.mimeType);
        console.log("File size:", selectedAsset.fileSize);
        console.log("====================================");

        setImage(selectedAsset.uri);
      }
    } catch (error) {
      console.error("❌ Gallery Error:", error);

      Alert.alert("Error", "Unable to open photo library. Please try again.");
    }
  };

  /* =====================================================
     CAMERA
  ===================================================== */

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Camera",
        "Camera capture is available in the Android/iOS app. Please use Gallery on web.",
      );

      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take a photo.",
        );

        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        console.log("====================================");
        console.log("📷 CAMERA IMAGE SELECTED");
        console.log("====================================");
        console.log("URI:", selectedAsset.uri);
        console.log("File name:", selectedAsset.fileName);
        console.log("File type:", selectedAsset.mimeType);
        console.log("File size:", selectedAsset.fileSize);
        console.log("====================================");

        setImage(selectedAsset.uri);
      }
    } catch (error) {
      console.error("❌ Camera Error:", error);

      Alert.alert("Error", "Unable to open camera. Please try again.");
    }
  };

  /* =====================================================
     PHOTO OPTIONS
  ===================================================== */

  const showPhotoOptions = () => {
    if (Platform.OS === "web") {
      void pickImage();

      return;
    }

    Alert.alert("Add Problem Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: () => {
          void takePhoto();
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          void pickImage();
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  /* =====================================================
     REMOVE IMAGE
  ===================================================== */

  const removeImage = () => {
    setImage(null);
  };

  /* =====================================================
     SUBMIT COMPLAINT
  ===================================================== */

  const handleSubmit = async () => {
    /* ---------------------------------------------
       VALIDATION
    --------------------------------------------- */

    if (!selectedCategory) {
      Alert.alert("Select Category", "Please select the problem category.");

      return;
    }

    if (!description.trim()) {
      Alert.alert("Enter Problem", "Please describe the problem.");

      return;
    }

    if (description.trim().length < 5) {
      Alert.alert(
        "Problem Description",
        "Please provide a little more detail about the problem.",
      );

      return;
    }

    if (!location.trim()) {
      Alert.alert("Enter Location", "Please enter the problem location.");

      return;
    }

    if (!phone.trim()) {
      Alert.alert("Enter Mobile Number", "Please enter your mobile number.");

      return;
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      Alert.alert(
        "Invalid Mobile Number",
        "Please enter a valid 10-digit mobile number.",
      );

      return;
    }

    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      console.log("");
      console.log("====================================");
      console.log("📢 SUBMITTING COMPLAINT");
      console.log("====================================");

      /* ---------------------------------------------
         AUTH
      --------------------------------------------- */

      const headers = await authHeaders();

      console.log("Authorization available:", !!headers.Authorization);

      if (!headers.Authorization) {
        Alert.alert(
          "Login Required",
          "Please login again to submit a complaint.",
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

      /* ---------------------------------------------
         FORM DATA
      --------------------------------------------- */

      const formData = new FormData();

      formData.append("wardNumber", wardNumber.toString());

      const selectedCategoryData = categories.find(
        (item) => item.id === selectedCategory,
      );

      formData.append(
        "title",
        `${selectedCategoryData?.title || "General"} Problem`,
      );

      formData.append("description", description.trim());

      formData.append("location", location.trim());

      formData.append("phone", phone.trim());

      formData.append("category", selectedCategory);

      /* ---------------------------------------------
         PHOTO
      --------------------------------------------- */

      if (image) {
        console.log("");
        console.log("📸 PREPARING PHOTO");
        console.log("Image URI:", image);

        try {
          /* ==========================================
             WEB
          ========================================== */

          if (Platform.OS === "web") {
            console.log("🌐 Web photo upload mode");

            const imageResponse = await globalThis.fetch(image);

            console.log("Image fetch status:", imageResponse.status);

            if (!imageResponse.ok) {
              throw new Error(
                `Unable to read selected image. Status ${imageResponse.status}`,
              );
            }

            const blob = await imageResponse.blob();

            console.log("Blob type:", blob.type);
            console.log("Blob size:", blob.size);

            if (!blob.size) {
              throw new Error("Selected image is empty.");
            }

            const mimeType = blob.type || "image/jpeg";

            const extension = mimeType.includes("png")
              ? "png"
              : mimeType.includes("webp")
                ? "webp"
                : "jpg";

            formData.append("photo", blob, `complaint-photo.${extension}`);

            console.log("✅ Web photo added to FormData");
          } else {
            /* ========================================
               ANDROID / IOS
            ======================================== */

            console.log("📱 Native photo upload mode");

            const file = new File(image);

            console.log("File URI:", file.uri);
            console.log("File name:", file.name);
            console.log("File type:", file.type);
            console.log("File size:", file.size);
            console.log("File exists:", file.exists);

            if (!file.exists) {
              throw new Error("Selected image file does not exist.");
            }

            formData.append("photo", file);

            console.log("✅ Native photo added to FormData");
          }
        } catch (photoError) {
          console.error("❌ Photo preparation failed:", photoError);

          Alert.alert(
            "Photo Error",
            "Unable to prepare the selected photo for upload.",
          );

          return;
        }
      } else {
        console.log("ℹ️ No photo selected");
      }

      /* ---------------------------------------------
         REQUEST HEADERS
      --------------------------------------------- */

      const requestHeaders: Record<string, string> = {};

      /*
        DO NOT manually set Content-Type.
        FormData creates the multipart boundary.
      */

      if (headers.Authorization) {
        requestHeaders.Authorization = headers.Authorization;
      }

      console.log("");
      console.log("====================================");
      console.log("📤 SENDING COMPLAINT REQUEST");
      console.log("====================================");

      console.log("API:", API_ENDPOINTS.complaints);
      console.log("Ward:", wardNumber);
      console.log("Category:", selectedCategory);
      console.log("Has photo:", !!image);
      console.log("Authorization:", !!requestHeaders.Authorization);

      console.log("====================================");

      /* ---------------------------------------------
         SEND REQUEST
      --------------------------------------------- */

      let response: Response;

      if (Platform.OS === "web") {
        response = await globalThis.fetch(API_ENDPOINTS.complaints, {
          method: "POST",
          headers: requestHeaders,
          body: formData,
        });
      } else {
        response = await expoFetch(API_ENDPOINTS.complaints, {
          method: "POST",
          headers: requestHeaders,
          body: formData,
        });
      }

      /* ---------------------------------------------
         RESPONSE
      --------------------------------------------- */

      console.log("");
      console.log("====================================");
      console.log("📥 SERVER RESPONSE");
      console.log("====================================");

      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);

      const responseText = await response.text();

      console.log("Raw Response:", responseText);

      console.log("====================================");

      /* ---------------------------------------------
         PARSE JSON
      --------------------------------------------- */

      let data: any = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
        }
      }

      console.log("Parsed Response:", data);

      /* ---------------------------------------------
         UNAUTHORIZED
      --------------------------------------------- */

      if (response.status === 401 || response.status === 403) {
        Alert.alert(
          "Login Required",
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

      /* ---------------------------------------------
         BACKEND ERROR
      --------------------------------------------- */

      if (!response.ok) {
        console.error("❌ Complaint submission failed");
        console.error("HTTP Status:", response.status);
        console.error("Backend Response:", data);

        Alert.alert(
          "Submission Failed",
          data?.message ||
            data?.error ||
            `Unable to submit complaint. Error ${response.status}`,
        );

        return;
      }

      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

      console.log("====================================");
      console.log("✅ COMPLAINT SUBMITTED SUCCESSFULLY");
      console.log("====================================");

      const complaint = data?.complaint || {};

      const complaintId =
        complaint?.complaintId ||
        complaint?.id ||
        complaint?._id ||
        data?.complaintId ||
        data?.id ||
        "Submitted";

      console.log("MongoDB ID:", complaint?._id);
      console.log("Complaint ID:", complaint?.complaintId);
      console.log("Status:", complaint?.status);
      console.log("Photo:", complaint?.photo);
      console.log("Photo URL:", complaint?.photoUrl);

      console.log("====================================");

      /* ---------------------------------------------
         RESET FORM
      --------------------------------------------- */

      setSelectedCategory(null);
      setDescription("");
      setLocation("");
      setPhone("");
      setImage(null);

      /* ---------------------------------------------
         GO BACK TO WARD HOME
      --------------------------------------------- */

      if (Platform.OS === "web") {
        router.replace({
          pathname: "/ward-home",
          params: {
            ward: wardNumber.toString(),
          },
        });

        return;
      }

      Alert.alert(
        "Complaint Submitted",
        `Your complaint has been submitted successfully.\n\nComplaint ID: ${complaintId}`,
        [
          {
            text: "OK",
            onPress: () => {
              console.log("➡️ Going to Ward Home");

              router.replace({
                pathname: "/ward-home",
                params: {
                  ward: wardNumber.toString(),
                },
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error("❌ Submit Complaint Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to submit complaint. Please check your internet connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              disabled={submitting}
              activeOpacity={0.7}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text
                style={[
                  styles.headerTitle,
                  isSmallMobile && styles.headerTitleSmall,
                ]}
                numberOfLines={1}>
                Report a Problem
              </Text>

              <Text style={styles.headerSubtitle}>
                Ward {wardNumber} • Tiruppur Smart City
              </Text>
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
          keyboardShouldPersistTaps="handled"
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
            {/* =================================================
                INTRO
            ================================================= */}

            <View
              style={[styles.introCard, isTablet && styles.introCardTablet]}>
              <View style={styles.introIcon}>
                <Text style={styles.introIconText}>!</Text>
              </View>

              <View style={styles.introContent}>
                <Text style={styles.introTitle}>Report a Public Problem</Text>

                <Text style={styles.introText}>
                  உங்கள் வார்டில் உள்ள பொதுப் பிரச்சனையை பதிவு செய்யுங்கள்.
                  சரியான தகவல்களை வழங்குவதன் மூலம் பிரச்சனையை விரைவாக கவனிக்க
                  உதவலாம்.
                </Text>
              </View>
            </View>

            {/* =================================================
                CATEGORY
            ================================================= */}

            <Text style={styles.sectionTitle}>Problem Category</Text>

            <Text style={styles.sectionTamil}>
              பிரச்சனையின் வகையை தேர்வு செய்யுங்கள்
            </Text>

            <View
              style={[
                styles.categoryGrid,
                isTablet && styles.categoryGridTablet,
              ]}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      isTablet && styles.categoryCardTablet,
                      isSelected && styles.selectedCategoryCard,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.categoryIcon,
                        isSelected && styles.selectedCategoryIcon,
                      ]}>
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    </View>

                    <Text
                      style={[
                        styles.categoryTitle,
                        isSelected && styles.selectedCategoryTitle,
                      ]}>
                      {category.title}
                    </Text>

                    <Text style={styles.categoryTamil}>{category.tamil}</Text>

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

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <Text style={styles.sectionTitle}>Problem Description</Text>

            <Text style={styles.sectionTamil}>
              பிரச்சனையை தெளிவாக விவரிக்கவும்
            </Text>

            <TextInput
              style={styles.descriptionInput}
              placeholder="Example: கடந்த 5 நாட்களாக தண்ணீர் வரவில்லை..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
            />

            <Text style={styles.characterCount}>{description.length}/500</Text>

            {/* =================================================
                LOCATION
            ================================================= */}

            <Text style={styles.sectionTitle}>Problem Location</Text>

            <Text style={styles.sectionTamil}>
              பிரச்சனை இருக்கும் இடத்தை குறிப்பிடவும்
            </Text>

            <View style={styles.locationInputContainer}>
              <Text style={styles.locationIcon}>📍</Text>

              <TextInput
                style={styles.locationInput}
                placeholder="Enter location / street name"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* =================================================
                PHOTO
            ================================================= */}

            <Text style={styles.sectionTitle}>Problem Photo</Text>

            <Text style={styles.sectionTamil}>
              பிரச்சனைக்கான புகைப்படத்தை சேர்க்கவும்
            </Text>

            {!image ? (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={showPhotoOptions}
                activeOpacity={0.8}>
                <View style={styles.photoIcon}>
                  <Text style={styles.photoIconText}>📷</Text>
                </View>

                <View style={styles.photoContent}>
                  <Text style={styles.photoTitle}>Add Photo</Text>

                  <Text style={styles.photoDescription}>
                    Camera அல்லது Gallery மூலம் புகைப்படம் சேர்க்கலாம்
                  </Text>
                </View>

                <Text style={styles.photoArrow}>›</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imageCard}>
                <Image
                  source={{
                    uri: image,
                  }}
                  style={styles.previewImage}
                />

                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                  activeOpacity={0.8}>
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>

                <View style={styles.imageBottom}>
                  <Text style={styles.imageAddedText}>✓ Photo added</Text>

                  <TouchableOpacity
                    onPress={showPhotoOptions}
                    disabled={submitting}>
                    <Text style={styles.changePhotoText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* =================================================
                PHONE
            ================================================= */}

            <Text style={styles.sectionTitle}>Contact Number</Text>

            <Text style={styles.sectionTamil}>
              தேவையான நேரத்தில் தொடர்பு கொள்ள உங்கள் மொபைல் எண்ணை வழங்கவும்
            </Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
              />
            </View>

            {/* =================================================
                SUBMIT
            ================================================= */}

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={submitting}>
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />

                  <Text style={styles.submitText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitText}>Submit Complaint</Text>

                  <Text style={styles.submitArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.noteText}>
              உங்கள் புகார் சம்பந்தப்பட்ட அதிகாரியால் பரிசீலிக்கப்படும்.
            </Text>

            <View style={styles.bottomSpace} />
          </View>
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

  keyboard: {
    flex: 1,
  },

  /* =====================================================
     HEADER
  ===================================================== */

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

  backText: {
    fontSize: 31,
    color: "#0F172A",
    lineHeight: 34,
    marginTop: -3,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerTitleSmall: {
    fontSize: 17,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  /* =====================================================
     CONTENT
  ===================================================== */

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

  /* =====================================================
     INTRO
  ===================================================== */

  introCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 18,
    padding: 16,
    marginBottom: 26,
  },

  introCardTablet: {
    padding: 20,
    borderRadius: 20,
  },

  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },

  introIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  introContent: {
    flex: 1,
    marginLeft: 12,
  },

  introTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 5,
  },

  introText: {
    fontSize: 12,
    color: "#7C2D12",
    lineHeight: 19,
  },

  /* =====================================================
     SECTION
  ===================================================== */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 5,
  },

  sectionTamil: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 13,
  },

  /* =====================================================
     CATEGORY
  ===================================================== */

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  categoryGridTablet: {
    justifyContent: "flex-start",
    gap: 14,
  },

  categoryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
    position: "relative",
  },

  categoryCardTablet: {
    width: "31.8%",
    minHeight: 155,
    marginBottom: 0,
  },

  selectedCategoryCard: {
    borderColor: "#D71920",
    backgroundColor: "#FFF8F8",
  },

  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  selectedCategoryIcon: {
    backgroundColor: "#FEE2E2",
  },

  categoryEmoji: {
    fontSize: 25,
  },

  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  selectedCategoryTitle: {
    color: "#D71920",
  },

  categoryTamil: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },

  radio: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#D71920",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D71920",
  },

  /* =====================================================
     DESCRIPTION
  ===================================================== */

  descriptionInput: {
    minHeight: 130,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0F172A",
  },

  characterCount: {
    textAlign: "right",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 5,
    marginBottom: 20,
  },

  /* =====================================================
     LOCATION
  ===================================================== */

  locationInputContainer: {
    minHeight: 56,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 25,
  },

  locationIcon: {
    fontSize: 19,
    marginRight: 8,
  },

  locationInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 15,
    color: "#0F172A",
  },

  /* =====================================================
     PHOTO
  ===================================================== */

  photoButton: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },

  photoIconText: {
    fontSize: 23,
  },

  photoContent: {
    flex: 1,
    marginLeft: 12,
  },

  photoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  photoDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 17,
  },

  photoArrow: {
    fontSize: 28,
    color: "#64748B",
    marginLeft: 8,
  },

  imageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 25,
    position: "relative",
  },

  previewImage: {
    width: "100%",
    height: 190,
  },

  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  removeImageText: {
    fontSize: 25,
    color: "#DC2626",
    lineHeight: 27,
  },

  imageBottom: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  imageAddedText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "700",
  },

  changePhotoText: {
    fontSize: 12,
    color: "#075985",
    fontWeight: "700",
  },

  /* =====================================================
     PHONE
  ===================================================== */

  phoneInputContainer: {
    minHeight: 56,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    overflow: "hidden",
  },

  countryCode: {
    minHeight: 56,
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  countryCodeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  phoneInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
  },

  /* =====================================================
     SUBMIT
  ===================================================== */

  submitButton: {
    minHeight: 56,
    backgroundColor: "#D71920",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginLeft: 8,
  },

  submitArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
  },

  noteText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 18,
    marginTop: 14,
  },

  bottomSpace: {
    height: 30,
  },
});
