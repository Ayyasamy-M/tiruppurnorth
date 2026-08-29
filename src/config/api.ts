import AsyncStorage from "@react-native-async-storage/async-storage";

/* =====================================================
   API CONFIG
===================================================== */

export const API_BASE_URL = "http://192.168.31.87:5000";

/* =====================================================
   API ENDPOINTS
===================================================== */

export const API_ENDPOINTS = {
  /* ===================================================
     AUTH
  =================================================== */

  register: `${API_BASE_URL}/api/auth/register`,

  login: `${API_BASE_URL}/api/auth/login`,

  me: `${API_BASE_URL}/api/auth/me`,

  updateWard: `${API_BASE_URL}/api/auth/ward`,

  logout: `${API_BASE_URL}/api/auth/logout`,

  /* ===================================================
     ADMIN
  =================================================== */

  adminMe: `${API_BASE_URL}/api/admin/me`,

  adminDashboard: `${API_BASE_URL}/api/admin/dashboard`,

  adminUsers: `${API_BASE_URL}/api/admin/users`,

  adminWards: `${API_BASE_URL}/api/admin/wards`,

  adminWardMembers: `${API_BASE_URL}/api/admin/ward-members`,

  adminComplaints: `${API_BASE_URL}/api/admin/complaints`,

  adminAnnouncements: `${API_BASE_URL}/api/admin/announcements`,

  /* ===================================================
     PUBLIC WARDS
  =================================================== */

  wards: `${API_BASE_URL}/api/wards`,

  wardDetails: (wardNumber: string) =>
    `${API_BASE_URL}/api/wards/${wardNumber}`,

  /* ===================================================
     COMPLAINTS
  =================================================== */

  complaints: `${API_BASE_URL}/api/complaints`,

  complaintDetails: (id: string) => `${API_BASE_URL}/api/complaints/${id}`,
};

/* =====================================================
   SAVE AUTH
===================================================== */

export const saveAuth = async (token: string, user: any) => {
  try {
    await AsyncStorage.setItem("token", token);

    await AsyncStorage.setItem("user", JSON.stringify(user));

    /* ================================================
       ADMIN SESSION
    ================================================ */

    if (user?.role === "admin") {
      await AsyncStorage.setItem("adminToken", token);

      await AsyncStorage.setItem("adminUser", JSON.stringify(user));
    }

    console.log("✅ Auth saved");
  } catch (error) {
    console.error("Save Auth Error:", error);
  }
};

/* =====================================================
   GET USER TOKEN
===================================================== */

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem("token");
  } catch (error) {
    console.error("Get Token Error:", error);

    return null;
  }
};

/* =====================================================
   GET ADMIN TOKEN
===================================================== */

export const getAdminToken = async () => {
  try {
    const adminToken = await AsyncStorage.getItem("adminToken");

    if (adminToken) {
      return adminToken;
    }

    const token = await AsyncStorage.getItem("token");

    return token;
  } catch (error) {
    console.error("Get Admin Token Error:", error);

    return null;
  }
};

/* =====================================================
   GET STORED USER
===================================================== */

export const getStoredUser = async () => {
  try {
    const user = await AsyncStorage.getItem("user");

    if (!user) {
      return null;
    }

    return JSON.parse(user);
  } catch (error) {
    console.error("Stored User Parse Error:", error);

    return null;
  }
};

/* =====================================================
   GET STORED ADMIN
===================================================== */

export const getStoredAdmin = async () => {
  try {
    const adminUser = await AsyncStorage.getItem("adminUser");

    if (adminUser) {
      return JSON.parse(adminUser);
    }

    const user = await AsyncStorage.getItem("user");

    if (user) {
      const parsedUser = JSON.parse(user);

      if (parsedUser?.role === "admin") {
        return parsedUser;
      }
    }

    return null;
  } catch (error) {
    console.error("Stored Admin Parse Error:", error);

    return null;
  }
};

/* =====================================================
   CLEAR AUTH
===================================================== */

export const clearAuth = async () => {
  try {
    await AsyncStorage.removeItem("token");

    await AsyncStorage.removeItem("user");

    await AsyncStorage.removeItem("adminToken");

    await AsyncStorage.removeItem("adminUser");

    console.log("✅ Auth cleared");
  } catch (error) {
    console.error("Clear Auth Error:", error);
  }
};

/* =====================================================
   NORMAL AUTH HEADERS
===================================================== */

export const authHeaders = async () => {
  const token = await getToken();

  return {
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

/* =====================================================
   ADMIN AUTH HEADERS
===================================================== */

export const adminAuthHeaders = async () => {
  const token = await getAdminToken();

  return {
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

/* =====================================================
   MULTIPART AUTH HEADERS
===================================================== */

export const authMultipartHeaders = async () => {
  const token = await getToken();

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

/* =====================================================
   ADMIN MULTIPART AUTH HEADERS
===================================================== */

export const adminMultipartHeaders = async () => {
  const token = await getAdminToken();

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};
