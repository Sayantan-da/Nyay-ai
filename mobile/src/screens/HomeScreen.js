import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";

export default function HomeScreen({ navigation }) {
  const { theme, radii, spacing } = useTheme();
  const [backendHealth, setBackendHealth] = useState(null);
  const [currentUser, setCurrentUser] = useState(apiService.getCachedUser());
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentConversations, setRecentConversations] = useState([]);
  const [quickQuery, setQuickQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const unsub = apiService.onAuthChange((u) => {
      setCurrentUser(u);
      loadUserData();
    });
    return unsub;
  }, []);

  const loadData = async () => {
    checkStatus();
    loadUserData();
  };

  const checkStatus = async () => {
    const health = await apiService.checkHealth();
    setBackendHealth(health);
  };

  const loadUserData = async () => {
    try {
      const user = await apiService.getMe().catch(() => null);
      if (user) setCurrentUser(user);

      // Only fetch history if backend supports it or user is authenticated
      const [docs, convos] = await Promise.all([
        apiService.getDocumentsHistory().catch(() => []),
        apiService.getConversations().catch(() => [])
      ]);
      setRecentDocs(Array.isArray(docs) ? docs.slice(0, 3) : []);
      setRecentConversations(Array.isArray(convos) ? convos.slice(0, 3) : []);
    } catch {
      setRecentDocs([]);
      setRecentConversations([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickQuestionSubmit = () => {
    const query = quickQuery.trim();
    setQuickQuery("");
    navigation.navigate("Chat", { initialQuery: query });
  };

  const isOnline = backendHealth?.api === "healthy";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* 1. Header Bar: Branding & Compact Profile Action */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={[styles.brandBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder, borderRadius: radii.sm }]}>
            <Icon name="rights" size={18} color={theme.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.brandName, { color: theme.textPrimary }]}>NYAYA AI</Text>
            <Text style={[styles.brandTagline, { color: theme.textMuted }]}>Legal Literacy & Intelligence</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.profilePill, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.full }]}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isOnline ? theme.success : theme.warning }
            ]}
          />
          <Icon name="user" size={14} color={theme.textSecondary} />
          <Text style={[styles.profilePillText, { color: theme.textPrimary }]}>
            {currentUser ? (currentUser.full_name?.split(" ")[0] || "Account") : "Profile"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Greeting & Value Proposition */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>
          {currentUser ? `Namaste, ${currentUser.full_name?.split(" ")[0]}` : "Legal clarity for every citizen."}
        </Text>
        <Text style={[styles.greetingSubtitle, { color: theme.textSecondary }]}>
          Analyze contracts, evaluate risks, and understand your statutory rights under Indian law.
        </Text>
      </View>

      {/* 3. Prominent Legal Question Input leading to Chat */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.inputBorder, borderRadius: radii.lg }]}>
        <View style={styles.searchIconSlot}>
          <Icon name="search" size={18} color={theme.textMuted} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Ask a legal question (e.g. deposit refund, cyber fraud)..."
          placeholderTextColor={theme.textMuted}
          value={quickQuery}
          onChangeText={setQuickQuery}
          onSubmitEditing={handleQuickQuestionSubmit}
          returnKeyType="search"
        />
        {quickQuery.trim().length > 0 && (
          <TouchableOpacity
            style={[styles.searchSendBtn, { backgroundColor: theme.primary, borderRadius: radii.sm }]}
            onPress={handleQuickQuestionSubmit}
          >
            <Icon name="chevron-right" size={14} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Two Primary Action Surfaces: Scan a Document + Explore Rights */}
      <View style={styles.primaryActionsGrid}>
        {/* Primary Action 1: Scan a Document */}
        <TouchableOpacity
          style={[
            styles.primaryActionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.primaryBorder,
              borderRadius: radii.lg
            }
          ]}
          onPress={() => navigation.navigate("Scanner")}
          activeOpacity={0.8}
        >
          <View style={styles.primaryActionTop}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.primaryBg }]}>
              <Icon name="scanner" size={22} color={theme.primary} strokeWidth={2} />
            </View>
            <Badge label="Primary" variant="primary" size="sm" />
          </View>
          <Text style={[styles.primaryActionTitle, { color: theme.textPrimary }]}>Scan a Document</Text>
          <Text style={[styles.primaryActionDesc, { color: theme.textSecondary }]}>
            Upload contracts, tenancy leases, or notices for clause and risk breakdown.
          </Text>
          <View style={styles.actionFooterRow}>
            <Text style={[styles.actionLinkText, { color: theme.primary }]}>Upload or photograph</Text>
            <Icon name="chevron-right" size={14} color={theme.primary} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Primary Action 2: Explore Legal Rights */}
        <TouchableOpacity
          style={[
            styles.primaryActionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: radii.lg
            }
          ]}
          onPress={() => navigation.navigate("Learning")}
          activeOpacity={0.8}
        >
          <View style={styles.primaryActionTop}>
            <View style={[styles.actionIconBox, { backgroundColor: theme.surfaceSecondary }]}>
              <Icon name="rights" size={22} color={theme.textPrimary} strokeWidth={2} />
            </View>
            <Badge label="Library" variant="neutral" size="sm" />
          </View>
          <Text style={[styles.primaryActionTitle, { color: theme.textPrimary }]}>Explore Legal Rights</Text>
          <Text style={[styles.primaryActionDesc, { color: theme.textSecondary }]}>
            Verified provisions for tenancy, consumer protection, cybercrime, and POSH.
          </Text>
          <View style={styles.actionFooterRow}>
            <Text style={[styles.actionLinkText, { color: theme.textPrimary }]}>Browse statutory guide</Text>
            <Icon name="chevron-right" size={14} color={theme.textPrimary} strokeWidth={2} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 5. Compact Section for Learning Scenarios */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Interactive Scenarios</Text>
          <Text style={[styles.sectionSub, { color: theme.textMuted }]}>Simulate legal decisions and test your rights</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Scenarios")}>
          <Text style={[styles.seeAllText, { color: theme.primary }]}>View all →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scenarioPreviewRow}>
        {[
          { title: "Rental Deposit Withheld", tag: "Tenancy", icon: "document" },
          { title: "UPI Payment Fraud", tag: "Cybercrime", icon: "shield" },
          { title: "E-Commerce Defective Return", tag: "Consumer", icon: "rights" }
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.scenarioCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderRadius: radii.md
              }
            ]}
            onPress={() => navigation.navigate("Scenarios")}
            activeOpacity={0.75}
          >
            <View style={styles.scenarioCardTop}>
              <Icon name={item.icon} size={16} color={theme.primary} />
              <Badge label={item.tag} variant="neutral" size="sm" />
            </View>
            <Text style={[styles.scenarioCardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 6. Recently Viewed Documents or Conversations (Only shown when real data exists) */}
      {recentDocs.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Documents</Text>
          {recentDocs.map((doc, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.recentRow,
                { backgroundColor: theme.surface, borderColor: theme.borderSubtle, borderRadius: radii.md }
              ]}
              onPress={() => navigation.navigate("AnalysisResult", { analysis: doc, filename: doc.filename })}
            >
              <Icon name="document" size={18} color={theme.primary} />
              <View style={styles.recentInfo}>
                <Text style={[styles.recentTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  {doc.filename || doc.document_type || "Analyzed Document"}
                </Text>
                <Text style={[styles.recentDate, { color: theme.textMuted }]}>
                  {doc.document_type || "Contract"} • {doc.analysis_date ? new Date(doc.analysis_date).toLocaleDateString() : "Saved"}
                </Text>
              </View>
              <Icon name="chevron-right" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 7. Unobtrusive Privacy Note */}
      <View style={[styles.privacyBanner, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle, borderRadius: radii.md }]}>
        <Icon name="shield" size={16} color={theme.textSecondary} />
        <View style={styles.privacyContent}>
          <Text style={[styles.privacyTitle, { color: theme.textPrimary }]}>Private & Local AI Processing</Text>
          <Text style={[styles.privacySub, { color: theme.textMuted }]}>
            Document text is processed through your private instance running Qwen 2.5 7B. No user data is sold or stored without permission.
          </Text>
        </View>
      </View>

      {/* 8. Verified Emergency Contact Strip */}
      <View style={[styles.helplineStrip, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}>
        <View style={styles.helplineItem}>
          <Text style={[styles.helplineNum, { color: theme.primary }]}>1930</Text>
          <Text style={[styles.helplineLabel, { color: theme.textSecondary }]}>Cyber Fraud</Text>
        </View>
        <View style={[styles.helplineDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.helplineItem}>
          <Text style={[styles.helplineNum, { color: theme.primary }]}>1915</Text>
          <Text style={[styles.helplineLabel, { color: theme.textSecondary }]}>Consumer</Text>
        </View>
        <View style={[styles.helplineDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.helplineItem}>
          <Text style={[styles.helplineNum, { color: theme.primary }]}>181</Text>
          <Text style={[styles.helplineLabel, { color: theme.textSecondary }]}>Women Helpline</Text>
        </View>
        <View style={[styles.helplineDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.helplineItem}>
          <Text style={[styles.helplineNum, { color: theme.primary }]}>15100</Text>
          <Text style={[styles.helplineLabel, { color: theme.textSecondary }]}>NALSA Legal Aid</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  brandTagline: {
    fontSize: 11
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  profilePillText: {
    fontSize: 12,
    fontWeight: "600"
  },
  greetingSection: {
    marginBottom: 16
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 4
  },
  greetingSubtitle: {
    fontSize: 13,
    lineHeight: 19
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 20
  },
  searchIconSlot: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  searchSendBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6
  },
  primaryActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24
  },
  primaryActionCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 156
  },
  primaryActionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2
  },
  primaryActionDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
    flex: 1
  },
  actionFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6
  },
  actionLinkText: {
    fontSize: 11,
    fontWeight: "600"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 2
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600"
  },
  scenarioPreviewRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24
  },
  scenarioCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 88
  },
  scenarioCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  scenarioCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  recentSection: {
    marginBottom: 20
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12
  },
  recentInfo: {
    flex: 1
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "600"
  },
  recentDate: {
    fontSize: 11,
    marginTop: 2
  },
  privacyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10
  },
  privacyContent: {
    flex: 1
  },
  privacyTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2
  },
  privacySub: {
    fontSize: 11,
    lineHeight: 16
  },
  helplineStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1
  },
  helplineItem: {
    flex: 1,
    alignItems: "center"
  },
  helplineNum: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2
  },
  helplineLabel: {
    fontSize: 9,
    textAlign: "center"
  },
  helplineDivider: {
    width: 1,
    height: 24
  }
});
