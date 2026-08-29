import { router, useFocusEffect } from "expo-router";
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

type AdminUser = {
  _id?: string;
  id?: string;
  name: string;
  mobile: string;
  ward?: string;
  role?: string;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [ward, setWard] = useState("");
  const [role, setRole] = useState("user");

  /* =====================================================
     ADMIN DASHBOARD NAVIGATION
  ===================================================== */

  const goToAdminDashboard = useCallback(() => {
    // Close modal first if it is open
    if (modalVisible) {
      setModalVisible(false);
      return;
    }

    // Directly go to Admin Dashboard
    // No confirmation popup
    router.replace("/admin-dashboard");
  }, [modalVisible]);

  /* =====================================================
     ANDROID HARDWARE BACK BUTTON
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
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

      return () => {
        subscription.remove();
      };
    }, [modalVisible]),
  );

  /* =====================================================
     LOAD USERS
  ===================================================== */

  const loadUsers = useCallback(async () => {
    try {
      const headers = await adminAuthHeaders();

      const response = await fetch(API_ENDPOINTS.adminUsers, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin-login");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load users");
      }

      setUsers(data?.users || []);
    } catch (error: any) {
      console.error("Load Users Error:", error);

      Alert.alert("Error", error?.message || "Unable to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* =====================================================
     EDIT USER
  ===================================================== */

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);

    setName(user.name || "");
    setMobile(user.mobile || "");
    setWard(user.ward || "");
    setRole(user.role || "user");

    setModalVisible(true);
  };

  /* =====================================================
     SAVE USER
  ===================================================== */

  const saveUser = async () => {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert("Required", "Name and mobile number are required.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      Alert.alert("Invalid Mobile", "Enter a valid 10 digit mobile number.");
      return;
    }

    if (!editingUser?._id) {
      Alert.alert("Error", "User ID is missing.");
      return;
    }

    try {
      const headers = await adminAuthHeaders();

      const response = await fetch(
        `${API_ENDPOINTS.adminUsers}/${editingUser._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            name: name.trim(),
            mobile: mobile.trim(),
            ward: ward.trim(),
            role: role.trim() || "user",
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setModalVisible(false);
        router.replace("/admin-login");
        return;
      }

      if (!response.ok) {
        Alert.alert("Error", data?.message || "Unable to update user.");
        return;
      }

      setModalVisible(false);

      Alert.alert("Success", "User updated successfully.");

      await loadUsers();
    } catch (error) {
      console.error("Update User Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  /* =====================================================
     DELETE USER
  ===================================================== */

  const deleteUser = (user: AdminUser) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            if (!user._id) {
              Alert.alert("Error", "User ID is missing.");
              return;
            }

            try {
              const headers = await adminAuthHeaders();

              const response = await fetch(
                `${API_ENDPOINTS.adminUsers}/${user._id}`,
                {
                  method: "DELETE",
                  headers,
                },
              );

              const data = await response.json();

              if (response.status === 401 || response.status === 403) {
                router.replace("/admin-login");
                return;
              }

              if (!response.ok) {
                Alert.alert("Error", data?.message || "Unable to delete user.");
                return;
              }

              await loadUsers();
            } catch (error) {
              console.error("Delete User Error:", error);

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

          <Text style={styles.loadingText}>Loading Users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     MAIN SCREEN
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
          onPress={goToAdminDashboard}
          activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Users</Text>

          <Text style={styles.headerSubtitle}>
            Registered constituency users
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{users.length}</Text>
        </View>
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
              loadUsers();
            }}
            colors={["#075985"]}
          />
        }>
        {users.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>

            <Text style={styles.emptyTitle}>No Users Found</Text>

            <Text style={styles.emptyText}>
              No registered users are available.
            </Text>
          </View>
        ) : (
          users.map((user) => (
            <View style={styles.card} key={user._id || user.id || user.mobile}>
              {/* USER ICON */}

              <View style={styles.iconBox}>
                <Text style={styles.icon}>👥</Text>
              </View>

              {/* USER CONTENT */}

              <View style={styles.cardContent}>
                <Text style={styles.name}>{user.name}</Text>

                <Text style={styles.mobile}>📱 {user.mobile}</Text>

                <Text style={styles.ward}>
                  🏘️ {user.ward ? `Ward ${user.ward}` : "Ward not selected"}
                </Text>

                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {(user.role || "user").toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* ACTIONS */}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEdit(user)}
                  activeOpacity={0.7}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteUser(user)}
                  activeOpacity={0.7}>
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
          EDIT USER MODAL
      ================================================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
        }}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* MODAL HEADER */}

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit User</Text>

                  <Text style={styles.modalSubtitle}>
                    Update user information
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}>
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* NAME */}

              <Text style={styles.label}>Name</Text>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="User name"
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

              {/* WARD */}

              <Text style={styles.label}>Ward</Text>

              <TextInput
                style={styles.input}
                value={ward}
                onChangeText={setWard}
                placeholder="Ward number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              {/* ROLE */}

              <Text style={styles.label}>Role</Text>

              <TextInput
                style={styles.input}
                value={role}
                onChangeText={setRole}
                placeholder="user"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
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
                  onPress={saveUser}
                  activeOpacity={0.8}>
                  <Text style={styles.saveText}>Update</Text>
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

  /* ===================================================
     LOADING
  =================================================== */

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

  /* ===================================================
     HEADER
  =================================================== */

  header: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 18,
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
    marginTop: -2,
  },

  headerContent: {
    flex: 1,
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

  countBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#7C3AED",
  },

  /* ===================================================
     CONTENT
  =================================================== */

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  /* ===================================================
     USER CARD
  =================================================== */

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
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: 25,
  },

  cardContent: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },

  mobile: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },

  ward: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
  },

  roleText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#166534",
  },

  /* ===================================================
     ACTIONS
  =================================================== */

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

  /* ===================================================
     EMPTY
  =================================================== */

  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 20,
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

  /* ===================================================
     BACK TO DASHBOARD BUTTON
  =================================================== */

  dashboardButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#075985",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
    marginTop: 20,
  },

  /* ===================================================
     MODAL
  =================================================== */

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

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontSize: 27,
    color: "#475569",
    lineHeight: 30,
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

  /* ===================================================
     MODAL BUTTONS
  =================================================== */

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
