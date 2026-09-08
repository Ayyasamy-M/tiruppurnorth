import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getAdminToken,
  getStoredAdmin,
  getStoredUser,
  getToken,
} from "../config/api";

/* =====================================================
   PUBLIC ROUTES

   These pages are available when logged out.
===================================================== */

const PUBLIC_ROUTES = [
  "/",
  "/auth-selection",
  "/login",
  "/register",
  "/admin-login",
];

/* =====================================================
   ROOT LAYOUT
===================================================== */

export default function RootLayout() {
  const pathname = usePathname();

  const [sessionReady, setSessionReady] = useState(false);

  const [hasUserSession, setHasUserSession] = useState(false);

  const [hasAdminSession, setHasAdminSession] = useState(false);

  /* =====================================================
     ANDROID BACK BUTTON

     Hardware back must NEVER logout.

     Expo Router handles the actual navigation history.
  ===================================================== */

  useEffect(() => {
    const handleAndroidBack = () => {
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleAndroidBack,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  /* =====================================================
     SESSION CHECK

     Runs when:
     - App starts
     - Browser opens
     - Browser refreshes
     - Route changes

     Session is stored using AsyncStorage.
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const [token, user, adminToken, adminUser] = await Promise.all([
          getToken(),
          getStoredUser(),
          getAdminToken(),
          getStoredAdmin(),
        ]);

        if (!mounted) {
          return;
        }

        /* ===============================================
           ADMIN SESSION
        =============================================== */

        const adminLoggedIn =
          Boolean(adminToken) &&
          Boolean(adminUser) &&
          adminUser?.role?.toLowerCase() === "admin";

        /* ===============================================
           NORMAL USER SESSION
        =============================================== */

        const userLoggedIn =
          Boolean(token) &&
          Boolean(user) &&
          user?.role?.toLowerCase() !== "admin";

        setHasAdminSession(adminLoggedIn);
        setHasUserSession(userLoggedIn);

        console.log("====================================");
        console.log("🔐 SESSION CHECK");
        console.log("Current Route:", pathname);
        console.log("Admin Session:", adminLoggedIn ? "ACTIVE" : "NOT FOUND");
        console.log("User Session:", userLoggedIn ? "ACTIVE" : "NOT FOUND");
        console.log("====================================");

        /* ===============================================
           ADMIN SESSION ROUTING
        =============================================== */

        if (adminLoggedIn) {
          if (PUBLIC_ROUTES.includes(pathname)) {
            console.log("➡️ Admin → Admin Dashboard");

            router.replace("/admin-dashboard");
          }

          return;
        }

        /* ===============================================
           USER SESSION ROUTING
        =============================================== */

        if (userLoggedIn) {
          if (PUBLIC_ROUTES.includes(pathname)) {
            console.log("🔐 User session active");

            if (user?.ward) {
              console.log("➡️ User → Ward Home");

              router.replace({
                pathname: "/ward-home",
                params: {
                  ward: user.ward.toString(),
                },
              });
            } else {
              console.log("➡️ User → Ward Selection");

              router.replace("/ward-selection");
            }
          }

          return;
        }

        /* ===============================================
           NO SESSION

           Protected route direct access:
           → Index
        =============================================== */

        if (!PUBLIC_ROUTES.includes(pathname)) {
          console.log("🔒 No active session");
          console.log("➡️ Protected route → Index");

          router.replace("/");
        }
      } catch (error) {
        console.error("Session Check Error:", error);

        if (!mounted) {
          return;
        }

        setHasAdminSession(false);
        setHasUserSession(false);
      } finally {
        if (mounted) {
          setSessionReady(true);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  /* =====================================================
     SESSION ROUTING SAFETY

     Re-check the current session state after it is loaded.

     This prevents stale session state from sending the
     user back to a protected screen after logout.
  ===================================================== */

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    /* ===============================================
       ADMIN
    =============================================== */

    if (hasAdminSession) {
      if (isPublicRoute) {
        router.replace("/admin-dashboard");
      }

      return;
    }

    /* ===============================================
       USER
    =============================================== */

    if (hasUserSession) {
      if (isPublicRoute) {
        getStoredUser()
          .then((user) => {
            if (!user) {
              return;
            }

            if (user?.ward) {
              router.replace({
                pathname: "/ward-home",
                params: {
                  ward: user.ward.toString(),
                },
              });
            } else {
              router.replace("/ward-selection");
            }
          })
          .catch((error) => {
            console.error("User Session Routing Error:", error);
          });
      }

      return;
    }

    /* ===============================================
       LOGGED OUT
    =============================================== */

    if (!isPublicRoute) {
      router.replace("/");
    }
  }, [pathname, sessionReady, hasUserSession, hasAdminSession]);

  /* =====================================================
     SESSION LOADING

     Prevents Index/Login flashing before session check.
  ===================================================== */

  if (!sessionReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />

        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>TSC</Text>
        </View>

        <Text style={styles.loadingTitle}>Tiruppur Smart City</Text>

        <Text style={styles.loadingSubtitle}>Loading your session...</Text>

        <ActivityIndicator size="small" style={styles.loadingIndicator} />
      </View>
    );
  }

  /* =====================================================
     APP NAVIGATION
  ===================================================== */

  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
        }}>
        {/* ===============================================
            PUBLIC
        =============================================== */}

        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="auth-selection"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-login"
          options={{
            headerShown: false,
          }}
        />

        {/* ===============================================
            ADMIN
        =============================================== */}

        <Stack.Screen
          name="admin-dashboard"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-complaints"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-wards"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-ward-members"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-users"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin-announcements"
          options={{
            headerShown: false,
          }}
        />

        {/* ===============================================
            USER
        =============================================== */}

        <Stack.Screen
          name="ward-selection"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="ward-home"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="report-problem"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="my-complaints"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="complaint-details"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="edit-profile"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#D71920",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingLogoText: {
    color: "#FFD400",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },

  loadingTitle: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  loadingSubtitle: {
    color: "#777777",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  loadingIndicator: {
    marginTop: 20,
  },
});
