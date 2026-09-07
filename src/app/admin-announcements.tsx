import { router } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AdminAnnouncementsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/admin-dashboard")}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Announcements</Text>
          <Text style={styles.subtitle}>Constituency announcements</Text>
        </View>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.icon}>📣</Text>
        <Text style={styles.emptyTitle}>Announcements</Text>
        <Text style={styles.emptyText}>
          The announcements management screen is ready for the next API
          integration.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    minHeight: 76,
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
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  emptyCard: {
    margin: 20,
    padding: 28,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  icon: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },
});
