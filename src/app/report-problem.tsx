// app/report-problem.tsx

import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

import {
  Alert,
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

  const wardNumber = Array.isArray(params.ward)
    ? params.ward[0]
    : params.ward || "1";

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");

  const [phone, setPhone] = useState("");

  const [image, setImage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  /* =====================================================
     GALLERY
  ===================================================== */

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access to upload a problem photo.",
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;

        console.log("📷 Gallery Image Selected:");
        console.log(selectedUri);

        setImage(selectedUri);
      }
    } catch (error) {
      console.error("Gallery Error:", error);

      Alert.alert("Error", "Unable to open photo library. Please try again.");
    }
  };

  /* =====================================================
     CAMERA
  ===================================================== */

  const takePhoto = async () => {
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;

        console.log("📷 Camera Image Selected:");
        console.log(selectedUri);

        setImage(selectedUri);
      }
    } catch (error) {
      console.error("Camera Error:", error);

      Alert.alert("Error", "Unable to open camera. Please try again.");
    }
  };

  /* =====================================================
     PHOTO OPTIONS
  ===================================================== */

  const showPhotoOptions = () => {
    Alert.alert("Add Problem Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: takePhoto,
      },
      {
        text: "Gallery",
        onPress: pickImage,
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

      /* ---------------------------------------------
         GET AUTH TOKEN
      --------------------------------------------- */

      const headers = await authHeaders();

      /* ---------------------------------------------
         CREATE FORMDATA
      --------------------------------------------- */

      const formData = new FormData();

      /* ---------------------------------------------
         BASIC FIELDS
      --------------------------------------------- */

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
        try {
          console.log("");
          console.log("====================================");
          console.log("📸 PREPARING PHOTO");
          console.log("====================================");

          console.log("Image URI:", image);

          /*
            Expo File API

            Convert local image URI
            into an actual File object.
          */

          const file = new File(image);

          console.log("File URI:", file.uri);
          console.log("File Name:", file.name);
          console.log("File Type:", file.type);
          console.log("File Size:", file.size);
          console.log("File Exists:", file.exists);

          if (!file.exists) {
            throw new Error("Selected image file does not exist.");
          }

          /*
            IMPORTANT:

            Backend expects:

            upload.single("photo")

            Therefore field name MUST be:

            photo
          */

          formData.append("photo", file);

          console.log("✅ Photo successfully appended to FormData");

          console.log("====================================");
          console.log("");
        } catch (photoError) {
          console.error("❌ Photo preparation error:", photoError);

          Alert.alert("Photo Error", "Unable to prepare the selected photo.");

          return;
        }
      } else {
        console.log("⚠️ No photo selected");
      }

      /* ---------------------------------------------
         DEBUG
      --------------------------------------------- */

      console.log("");
      console.log("====================================");
      console.log("📢 SUBMITTING COMPLAINT");
      console.log("====================================");

      console.log("Ward:", wardNumber);

      console.log("Category:", selectedCategory);

      console.log(
        "Title:",
        `${selectedCategoryData?.title || "General"} Problem`,
      );

      console.log("Description:", description.trim());

      console.log("Location:", location.trim());

      console.log("Phone:", phone.trim());

      console.log("Image:", image);

      console.log("API:", API_ENDPOINTS.complaints);

      console.log("====================================");
      console.log("");

      /* ---------------------------------------------
         POST REQUEST
      --------------------------------------------- */

      const response = await fetch(API_ENDPOINTS.complaints, {
        method: "POST",

        /*
            IMPORTANT:

            DO NOT add:

            Content-Type: application/json

            DO NOT manually add:

            multipart/form-data

            Expo fetch will automatically
            create the correct multipart boundary.
          */

        headers: {
          ...(headers.Authorization
            ? {
                Authorization: headers.Authorization,
              }
            : {}),
        },

        body: formData,
      });

      /* ---------------------------------------------
         SERVER RESPONSE
      --------------------------------------------- */

      const responseText = await response.text();

      console.log("");
      console.log("====================================");
      console.log("📥 SERVER RESPONSE");
      console.log("====================================");

      console.log("Status:", response.status);

      console.log("Raw Response:", responseText);

      console.log("====================================");
      console.log("");

      /* ---------------------------------------------
         PARSE RESPONSE
      --------------------------------------------- */

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
      }

      console.log("Complaint Response:", data);

      /* ---------------------------------------------
         UNAUTHORIZED
      --------------------------------------------- */

      if (response.status === 401) {
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
         OTHER BACKEND ERROR
      --------------------------------------------- */

      if (!response.ok) {
        Alert.alert(
          "Submission Failed",
          data?.message ||
            `Unable to submit complaint. Error ${response.status}`,
        );

        return;
      }

      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

      const complaint = data?.complaint || {};

      const complaintId = complaint.complaintId || "Complaint Submitted";

      console.log("");
      console.log("====================================");
      console.log("✅ COMPLAINT SUBMITTED");
      console.log("====================================");

      console.log("Complaint ID:", complaintId);

      console.log("Photo:", complaint.photo);

      console.log("Status:", complaint.status);

      console.log("====================================");
      console.log("");

      /* ---------------------------------------------
         SUCCESS ALERT
      --------------------------------------------- */

      Alert.alert(
        "Complaint Submitted",
        `Your complaint has been submitted successfully.\n\nComplaint ID: ${complaintId}`,
        [
          {
            text: "OK",

            onPress: () => {
              setSelectedCategory(null);

              setDescription("");

              setLocation("");

              setPhone("");

              setImage(null);

              router.back();
            },
          },
        ],
      );
    } catch (error) {
      console.error("❌ Submit Complaint Error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to connect to server.\n\nPlease check whether the backend is running and your mobile is connected to the same Wi-Fi network.",
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Report a Problem</Text>

            <Text style={styles.headerSubtitle}>
              Ward {wardNumber} • Tiruppur North
            </Text>
          </View>
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* =================================================
              INTRO
          ================================================= */}

          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Text style={styles.introIconText}>!</Text>
            </View>

            <View style={styles.introContent}>
              <Text style={styles.introTitle}>Report a Public Problem</Text>

              <Text style={styles.introText}>
                உங்கள் வார்டில் உள்ள பொதுப் பிரச்சனையை பதிவு செய்யுங்கள். சரியான
                தகவல்களை வழங்குவதன் மூலம் பிரச்சனையை விரைவாக கவனிக்க உதவலாம்.
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

          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
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
                    style={[styles.radio, isSelected && styles.radioSelected]}>
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

                <TouchableOpacity onPress={showPhotoOptions}>
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
            <Text style={styles.submitText}>
              {submitting ? "Submitting..." : "Submit Complaint"}
            </Text>

            {!submitting && <Text style={styles.submitArrow}>→</Text>}
          </TouchableOpacity>

          <Text style={styles.noteText}>
            உங்கள் புகார் சம்பந்தப்பட்ட அதிகாரியால் பரிசீலிக்கப்படும்.
          </Text>
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
    flex: 1,
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
    paddingBottom: 50,
  },

  introCard: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 18,
    padding: 16,
    marginBottom: 26,
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

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
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

  selectedCategoryCard: {
    borderColor: "#075985",
    backgroundColor: "#F0F9FF",
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
    backgroundColor: "#E0F2FE",
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
    color: "#075985",
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
    borderColor: "#075985",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#075985",
  },

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

  locationInputContainer: {
    height: 56,
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
    height: "100%",
    fontSize: 15,
    color: "#0F172A",
  },

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
    height: 48,
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

  phoneInputContainer: {
    height: 56,
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
    height: "100%",
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
    height: "100%",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
  },

  submitButton: {
    height: 56,
    backgroundColor: "#075985",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
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
});
