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

type WardMember = {
  _id?: string;
  id?: string;
  wardNumber: string;
  name: string;
  role: string;
  mobile?: string;
  photo?: string;
};

export default function AdminWardMembersScreen() {
  const [members, setMembers] = useState<WardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<WardMember | null>(null);

  const [wardNumber, setWardNumber] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [mobile, setMobile] = useState("");

  // --------------------------------------------------
  // GO TO ADMIN DASHBOARD
  // --------------------------------------------------
  const goToAdminDashboard = useCallback(() => {
    if (modalVisible) {
      setModalVisible(false);
      return;
    }

    router.replace("/admin-dashboard");
  }, [modalVisible]);

  // --------------------------------------------------
  // ANDROID HARDWARE BACK BUTTON
  // --------------------------------------------------
  useEffect(() => {
    const onBackPress = () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }

      router.replace("/admin-dashboard");
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [modalVisible]);

  // --------------------------------------------------
  // LOAD MEMBERS
  // --------------------------------------------------
  const loadMembers = useCallback(async () => {
    try {
      const headers = await adminAuthHeaders();

      const response = await fetch(API_ENDPOINTS.adminWardMembers, {
        headers,
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin-login");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load ward members");
      }

      setMembers(data?.members || []);
    } catch (error: any) {
      console.error("Load Members Error:", error);

      Alert.alert("Error", error?.message || "Unable to load ward members.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // --------------------------------------------------
  // ADD MEMBER
  // --------------------------------------------------
  const openAdd = () => {
    setEditingMember(null);
    setWardNumber("");
    setName("");
    setRole("");
    setMobile("");
    setModalVisible(true);
  };

  // --------------------------------------------------
  // EDIT MEMBER
  // --------------------------------------------------
  const openEdit = (member: WardMember) => {
    setEditingMember(member);
    setWardNumber(member.wardNumber || "");
    setName(member.name || "");
    setRole(member.role || "");
    setMobile(member.mobile || "");
    setModalVisible(true);
  };

  // --------------------------------------------------
  // SAVE MEMBER
  // --------------------------------------------------
  const saveMember = async () => {
    if (!wardNumber.trim() || !name.trim() || !role.trim()) {
      Alert.alert(
        "Required",
        "Ward number, member name and role are required.",
      );
      return;
    }

    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      Alert.alert("Invalid Mobile", "Enter a valid 10 digit mobile number.");
      return;
    }

    try {
      const headers = await adminAuthHeaders();

      const url = editingMember?._id
        ? `${API_ENDPOINTS.adminWardMembers}/${editingMember._id}`
        : API_ENDPOINTS.adminWardMembers;

      const response = await fetch(url, {
        method: editingMember ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          wardNumber: wardNumber.trim(),
          name: name.trim(),
          role: role.trim(),
          mobile: mobile.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data?.message || "Unable to save member.");
        return;
      }

      setModalVisible(false);

      Alert.alert(
        "Success",
        editingMember
          ? "Ward member updated successfully."
          : "Ward member added successfully.",
      );

      await loadMembers();
    } catch (error) {
      console.error("Save Member Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  // --------------------------------------------------
  // DELETE MEMBER
  // --------------------------------------------------
  const deleteMember = (member: WardMember) => {
    Alert.alert(
      "Delete Member",
      `Delete ${member.name} from Ward ${member.wardNumber}?`,
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
              const headers = await adminAuthHeaders();

              const response = await fetch(
                `${API_ENDPOINTS.adminWardMembers}/${member._id}`,
                {
                  method: "DELETE",
                  headers,
                },
              );

              const data = await response.json();

              if (!response.ok) {
                Alert.alert(
                  "Error",
                  data?.message || "Unable to delete member.",
                );
                return;
              }

              await loadMembers();
            } catch {
              Alert.alert("Error", "Unable to connect to server.");
            }
          },
        },
      ],
    );
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#075985" />

          <Text style={styles.loadingText}>Loading Ward Members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // SCREEN
  // --------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goToAdminDashboard}
            activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Ward Members</Text>

            <Text style={styles.headerSubtitle}>Constituency ward members</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAdd}
          activeOpacity={0.8}>
          <Text style={styles.addText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMembers();
            }}
            colors={["#075985"]}
          />
        }>
        {members.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧑‍💼</Text>

            <Text style={styles.emptyTitle}>No Ward Members Found</Text>

            <Text style={styles.emptyText}>Add the first ward member.</Text>
          </View>
        ) : (
          members.map((member) => (
            <View
              style={styles.card}
              key={
                member._id || member.id || `${member.wardNumber}-${member.name}`
              }>
              {/* ICON */}
              <View style={styles.iconBox}>
                <Text style={styles.icon}>🧑‍💼</Text>
              </View>

              {/* DETAILS */}
              <View style={styles.cardContent}>
                <Text style={styles.name}>{member.name}</Text>

                <Text style={styles.role}>{member.role}</Text>

                <Text style={styles.ward}>🏘️ Ward {member.wardNumber}</Text>

                {member.mobile ? (
                  <Text style={styles.mobile}>📱 {member.mobile}</Text>
                ) : null}
              </View>

              {/* ACTIONS */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEdit(member)}
                  activeOpacity={0.8}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteMember(member)}
                  activeOpacity={0.8}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ================= BACK TO DASHBOARD ================= */}
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={goToAdminDashboard}
          activeOpacity={0.85}>
          <Text style={styles.dashboardButtonIcon}>‹</Text>

          <Text style={styles.dashboardButtonText}>
            Back to Admin Dashboard
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= EDIT / ADD MODAL ================= */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingMember ? "Edit Ward Member" : "Add Ward Member"}
              </Text>

              {/* WARD NUMBER */}
              <Text style={styles.label}>Ward Number</Text>

              <TextInput
                style={styles.input}
                value={wardNumber}
                onChangeText={setWardNumber}
                placeholder="Example: 1"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              {/* NAME */}
              <Text style={styles.label}>Name</Text>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Member name"
                placeholderTextColor="#94A3B8"
              />

              {/* ROLE */}
              <Text style={styles.label}>Role</Text>

              <TextInput
                style={styles.input}
                value={role}
                onChangeText={setRole}
                placeholder="Example: Ward Representative"
                placeholderTextColor="#94A3B8"
              />

              {/* MOBILE */}
              <Text style={styles.label}>Mobile</Text>

              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                placeholder="10 digit mobile"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />

              {/* BUTTONS */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveMember}
                  activeOpacity={0.8}>
                  <Text style={styles.saveText}>
                    {editingMember ? "Update" : "Save"}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
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

  // --------------------------------------------------
  // HEADER
  // --------------------------------------------------
  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 14,
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
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "400",
    color: "#0F172A",
    marginTop: -2,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
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
    marginLeft: 8,
  },

  addText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // --------------------------------------------------
  // CONTENT
  // --------------------------------------------------
  content: {
    padding: 18,
    paddingBottom: 35,
  },

  // --------------------------------------------------
  // CARD
  // --------------------------------------------------
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
    backgroundColor: "#EFF6FF",
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

  name: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },

  role: {
    fontSize: 11,
    color: "#075985",
    fontWeight: "800",
    marginTop: 3,
  },

  ward: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },

  mobile: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  // --------------------------------------------------
  // ACTIONS
  // --------------------------------------------------
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

  // --------------------------------------------------
  // EMPTY STATE
  // --------------------------------------------------
  empty: {
    alignItems: "center",
    paddingTop: 90,
    paddingBottom: 40,
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
    fontSize: 13,
  },

  // --------------------------------------------------
  // BACK TO ADMIN DASHBOARD
  // --------------------------------------------------
  dashboardButton: {
    marginTop: 10,
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  dashboardButtonIcon: {
    fontSize: 28,
    color: "#075985",
    marginRight: 8,
    marginTop: -2,
  },

  dashboardButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#075985",
  },

  // --------------------------------------------------
  // MODAL
  // --------------------------------------------------
  overlay: {
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

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 15,
  },

  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },

  input: {
    height: 47,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },

  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    marginBottom: 10,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelText: {
    fontWeight: "800",
    color: "#475569",
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
