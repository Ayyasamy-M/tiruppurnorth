import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
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

import { API_ENDPOINTS, adminAuthHeaders } from "@/config/api";

type Ward = {
  _id?: string;
  id?: string;
  wardNumber: string;
  name: string;
  description?: string;
  totalPeople?: number;
};

export default function AdminWardsScreen() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);

  const [wardNumber, setWardNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalPeople, setTotalPeople] = useState("");

  /* =====================================================
     ADMIN DASHBOARD NAVIGATION
  ===================================================== */

  const goToAdminDashboard = useCallback(() => {
    if (modalVisible) {
      setModalVisible(false);
      return;
    }

    router.replace("/admin-dashboard");
  }, [modalVisible]);

  /* =====================================================
     ANDROID BACK BUTTON
     - Prevent default Android back navigation
     - No popup
     - Go directly to Admin Dashboard
  ===================================================== */

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (modalVisible) {
          setModalVisible(false);
          return true;
        }

        router.replace("/admin-dashboard");

        return true;
      },
    );

    return () => backHandler.remove();
  }, [modalVisible]);

  /* =====================================================
     LOAD WARDS
  ===================================================== */

  const loadWards = useCallback(async () => {
    try {
      const headers = await adminAuthHeaders();

      const response = await fetch(API_ENDPOINTS.adminWards, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        Alert.alert("Access Denied", "Please login again.", [
          {
            text: "OK",
            onPress: () => router.replace("/admin-login"),
          },
        ]);

        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load wards");
      }

      setWards(data?.wards || []);
    } catch (error: any) {
      console.error("Load Wards Error:", error);

      Alert.alert(
        "Error",
        error?.message || "Unable to load ward information.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  /* =====================================================
     ADD WARD
  ===================================================== */

  const openAddModal = () => {
    setEditingWard(null);
    setWardNumber("");
    setName("");
    setDescription("");
    setTotalPeople("");
    setModalVisible(true);
  };

  /* =====================================================
     EDIT WARD
  ===================================================== */

  const openEditModal = (ward: Ward) => {
    setEditingWard(ward);

    setWardNumber(ward.wardNumber || "");
    setName(ward.name || "");
    setDescription(ward.description || "");
    setTotalPeople(String(ward.totalPeople || ""));

    setModalVisible(true);
  };

  /* =====================================================
     SAVE WARD
  ===================================================== */

  const saveWard = async () => {
    if (!wardNumber.trim() || !name.trim()) {
      Alert.alert("Required", "Ward number and ward name are required.");

      return;
    }

    try {
      const headers = await adminAuthHeaders();

      const url = editingWard?._id
        ? `${API_ENDPOINTS.adminWards}/${editingWard._id}`
        : API_ENDPOINTS.adminWards;

      const response = await fetch(url, {
        method: editingWard ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          wardNumber: wardNumber.trim(),
          name: name.trim(),
          description: description.trim(),
          totalPeople: Number(totalPeople) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data?.message || "Unable to save ward.");

        return;
      }

      setModalVisible(false);

      Alert.alert(
        "Success",
        editingWard ? "Ward updated successfully." : "Ward added successfully.",
      );

      await loadWards();
    } catch (error) {
      console.error("Save Ward Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  /* =====================================================
     DELETE WARD
  ===================================================== */

  const deleteWard = (ward: Ward) => {
    Alert.alert(
      "Delete Ward",
      `Are you sure you want to delete Ward ${ward.wardNumber}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              if (!ward._id) {
                Alert.alert("Error", "Ward ID not found.");

                return;
              }

              const headers = await adminAuthHeaders();

              const response = await fetch(
                `${API_ENDPOINTS.adminWards}/${ward._id}`,
                {
                  method: "DELETE",
                  headers,
                },
              );

              const data = await response.json();

              if (!response.ok) {
                Alert.alert("Error", data?.message || "Unable to delete ward.");

                return;
              }

              await loadWards();
            } catch (error) {
              console.error("Delete Ward Error:", error);

              Alert.alert("Error", "Unable to connect to server.");
            }
          },
        },
      ],
    );
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#075985" />

          <Text style={styles.loadingText}>Loading Wards...</Text>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToAdminDashboard}
            activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Wards</Text>

            <Text style={styles.headerSubtitle}>
              Tiruppur North • {wards.length} wards
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}>
          <Text style={styles.addButtonText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadWards();
            }}
            colors={["#075985"]}
          />
        }>
        {wards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏘️</Text>

            <Text style={styles.emptyTitle}>No Wards Found</Text>

            <Text style={styles.emptyText}>
              Add the first ward to the constituency.
            </Text>
          </View>
        ) : (
          wards.map((ward) => (
            <View style={styles.card} key={ward._id || ward.wardNumber}>
              <View style={styles.iconBox}>
                <Text style={styles.icon}>🏘️</Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.wardNumber}>Ward {ward.wardNumber}</Text>

                <Text style={styles.name}>{ward.name}</Text>

                {ward.description ? (
                  <Text style={styles.description}>{ward.description}</Text>
                ) : null}

                <Text style={styles.people}>
                  👥 {ward.totalPeople || 0} People
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(ward)}
                  activeOpacity={0.8}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteWard(ward)}
                  activeOpacity={0.8}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* =================================================
            BACK TO ADMIN DASHBOARD
        ================================================= */}

        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={goToAdminDashboard}
          activeOpacity={0.8}>
          <Text style={styles.dashboardButtonText}>
            ← Back to Admin Dashboard
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Tiruppur North Constituency</Text>
      </ScrollView>

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingWard ? "Edit Ward" : "Add Ward"}
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    {editingWard
                      ? "Update ward information"
                      : "Create a new ward"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}>
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* WARD NUMBER */}

              <Text style={styles.label}>Ward Number</Text>

              <TextInput
                value={wardNumber}
                onChangeText={setWardNumber}
                placeholder="Example: 1"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.input}
              />

              {/* WARD NAME */}

              <Text style={styles.label}>Ward Name</Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ward name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />

              {/* DESCRIPTION */}

              <Text style={styles.label}>Description</Text>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ward description"
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.textArea]}
              />

              {/* TOTAL PEOPLE */}

              <Text style={styles.label}>Total People</Text>

              <TextInput
                value={totalPeople}
                onChangeText={setTotalPeople}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.input}
              />

              {/* MODAL BUTTONS */}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveWard}
                  activeOpacity={0.8}>
                  <Text style={styles.saveText}>
                    {editingWard ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  /* =====================================================
     LOADING
  ===================================================== */

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 15,
    color: "#64748B",
    fontWeight: "700",
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: -3,
  },

  headerContent: {
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0F172A",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  addButton: {
    backgroundColor: "#075985",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* =====================================================
     CONTENT
  ===================================================== */

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  /* =====================================================
     WARD CARD
  ===================================================== */

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 17,
    padding: 13,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: 25,
  },

  cardContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  wardNumber: {
    fontSize: 11,
    color: "#075985",
    fontWeight: "900",
  },

  name: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },

  description: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  people: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 5,
  },

  /* =====================================================
     ACTIONS
  ===================================================== */

  actions: {
    marginLeft: 8,
    gap: 6,
  },

  editButton: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },

  editText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "800",
  },

  deleteButton: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },

  deleteText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "800",
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingBottom: 50,
  },

  emptyIcon: {
    fontSize: 45,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 5,
    color: "#64748B",
    textAlign: "center",
  },

  /* =====================================================
     BACK TO ADMIN DASHBOARD
  ===================================================== */

  dashboardButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  footerText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 18,
  },

  /* =====================================================
     MODAL
  ===================================================== */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },

  modalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontSize: 28,
    color: "#475569",
    lineHeight: 30,
    marginTop: -2,
  },

  /* =====================================================
     INPUTS
  ===================================================== */

  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    height: 47,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },

  textArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  /* =====================================================
     MODAL BUTTONS
  ===================================================== */

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    paddingBottom: 5,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelText: {
    color: "#475569",
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#075985",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
