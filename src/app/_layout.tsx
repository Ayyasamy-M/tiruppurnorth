import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    const handleAndroidBack = () => {
      // IMPORTANT:
      // Android hardware back button logout செய்யக்கூடாது.
      // Expo Router-ஐ navigation handle செய்ய விடுகிறோம்.
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

  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",

          // Android back navigation normal-ஆக இருக்கட்டும்
          gestureEnabled: true,
        }}>
        <Stack.Screen
          name="index"
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

        <Stack.Screen
          name="admin-complaints"
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
      </Stack>
    </>
  );
}
