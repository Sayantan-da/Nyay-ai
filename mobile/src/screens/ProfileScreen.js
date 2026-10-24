import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Platform
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService, ApiConfig } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";
import Button from "../components/Button";

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, toggleTheme, radii } = useTheme();

  // User state
  const [currentUser, setCurrentUser] = useState(apiService.getCachedUser());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [languagePreference, setLanguagePreference] = useState("English");

  // Advanced / Developer State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiConfig.getBaseUrl());
  const [healthData, setHealthData] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testError, setTestError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    checkUser();
    runHealthCheck();

    const unsubscribe = apiService.onAuthChange((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  const checkUser = async () => {
    try {
      const me = await apiService.getMe();
      setCurrentUser(me);
    } catch {
      setCurrentUser(null);
    }
  };

  const runHealthCheck = async () => {
    setTestingConnection(true);
    setTestError(null);
    try {
      ApiConfig.setBaseUrl(serverUrl);
      const res = await apiService.checkHealth();
      setHealthData(res);
      if (res.api !== "healthy") {
        setTestError(res.error || "FastAPI server unreachable.");
      }
    } catch (e) {
      setHealthData({ api: "offline", error: e.message });
      setTestError(e.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleApplyPreset = (url) => {
    setServerUrl(url);
    ApiConfig.setBaseUrl(url);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your Nyaya AI account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await apiService.logout();
            setCurrentUser(null);
          }
        }
      ]
    );
  };

  // Status computation strictly from real responses
  const isApiHealthy = healthData?.api === "healthy";
  const isOllamaConnected = isApiHealthy && healthData?.ollama === "healthy";
  const isModelReady = isApiHealthy && Boolean(healthData?.active_model_ready);
  const isRagReady = isApiHealthy && (healthData?.rag === "healthy" || healthData?.rag === "ready");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Top Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          User preferences, privacy controls, and developer gateway settings.
        </Text>
      </View>

      {/* ======================================================== */}
      {/* SECTION 1: NORMAL USER SETTINGS */}
      {/* ======================================================== */}
      <Text style={[styles.sectionCategoryTitle, { color: theme.textMuted }]}>
        ACCOUNT & PREFERENCES
      </Text>

      {/* Account Card (Dedicated Screen for Login/Registration) */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        {currentUser ? (
          <View style={styles.accountRow}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {(currentUser.full_name || "C")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountMeta}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>{currentUser.full_name}</Text>
              <Text style={[styles.userEmail, { color: theme.textMuted }]}>{currentUser.email}</Text>
              <Badge label="Verified Citizen Account" variant="success" size="sm" style={{ marginTop: 4 }} />
            </View>
            <TouchableOpacity
              style={[styles.signOutBtn, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderRadius: radii.sm }]}
              onPress={handleSignOut}
            >
              <Text style={[styles.signOutText, { color: theme.dangerText }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestRow}>
            <View style={[styles.guestIconBox, { backgroundColor: theme.surfaceSecondary }]}>
              <Icon name="user" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.guestDetails}>
              <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>Guest Mode</Text>
              <Text style={[styles.guestDesc, { color: theme.textMuted }]}>
                Sign in to sync your legal documents and consultations.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: theme.primary, borderRadius: radii.sm }]}
              onPress={() => navigation.navigate("Auth")}
            >
              <Text style={styles.signInBtnText}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Preferences List Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        {/* Language Selection */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => {
            const next = languagePreference === "English" ? "हिंदी" : languagePreference === "हिंदी" ? "বাংলা" : "English";
            setLanguagePreference(next);
          }}
        >
          <View style={styles.settingLabelRow}>
            <Icon name="rights" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Language Preference</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>Statutory guidance and UI language</Text>
            </View>
          </View>
          <View style={styles.settingValueRow}>
            <Text style={[styles.settingValText, { color: theme.primary }]}>{languagePreference}</Text>
            <Icon name="chevron-right" size={14} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />

        {/* Theme Selection: Warm Ivory vs Dark Navy */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelRow}>
            <Icon name="settings" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                {isDark ? "Dark Navy theme active" : "Warm Ivory theme active"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />

        {/* Notifications */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelRow}>
            <Icon name="alert" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Notifications</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>Analysis completions & updates</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Privacy & About Info */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        {/* Local Processing Privacy */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Alert.alert(
            "Privacy & Local Processing",
            "Nyaya AI is engineered for citizen document sovereignty. Document analysis and queries are executed on an isolated local inference server (Qwen 2.5 7B) without commercial third-party cloud data logging."
          )}
        >
          <View style={styles.settingLabelRow}>
            <Icon name="shield" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Privacy & Local AI</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>Data isolation & local model execution</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={14} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />

        {/* Legal Disclaimer */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Alert.alert(
            "Legal Disclaimer",
            "Nyaya AI provides automated statutory explanations and clause risk detection for educational purposes under Indian law. It is not an advocate and does not provide legal representation."
          )}
        >
          <View style={styles.settingLabelRow}>
            <Icon name="document" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Legal Disclaimer & Support</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>Scope of automated legal intelligence</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={14} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />

        {/* About App */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Alert.alert("About Nyaya AI", "Nyaya AI v1.2.0\nIndian Legal Literacy & Document Understanding\nDeveloped with FastAPI, Qwen 2.5 7B, and PyMuPDF.")}
        >
          <View style={styles.settingLabelRow}>
            <Icon name="info" size={16} color={theme.textSecondary} />
            <View>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>About Nyaya AI</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>Version 1.2.0 • Qwen 2.5 RAG</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={14} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* SECTION 2: ADVANCED / DEVELOPER SETTINGS (COLLAPSIBLE) */}
      {/* ======================================================== */}
      <View style={styles.devSectionHeader}>
        <Text style={[styles.sectionCategoryTitle, { color: theme.textMuted, marginBottom: 0 }]}>
          DEVELOPER & GATEWAY CONTROLS
        </Text>
        <TouchableOpacity
          style={[styles.collapseToggle, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={[styles.collapseToggleText, { color: theme.primary }]}>
            {showAdvanced ? "Hide Technical Settings" : "Configure Backend"}
          </Text>
          <Icon name={showAdvanced ? "chevron-up" : "chevron-down"} size={12} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {showAdvanced && (
        <View style={[styles.advancedContainer, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          {/* Base URL Field */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FastAPI Gateway Base URL</Text>
          <TextInput
            style={[
              styles.urlInput,
              {
                backgroundColor: theme.surfaceSecondary,
                borderColor: theme.inputBorder,
                color: theme.textPrimary,
                borderRadius: radii.md
              }
            ]}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://172.20.10.2:8000"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Connection Type Presets */}
          <Text style={[styles.presetLabel, { color: theme.textMuted }]}>Connection Presets:</Text>
          <View style={styles.presetButtonsRow}>
            {[
              { label: "Web / Local", url: "http://localhost:8000" },
              { label: "Wi-Fi LAN", url: "http://172.20.10.2:8000" },
              { label: "Android Emulator", url: "http://10.0.2.2:8000" }
            ].map((p) => {
              const isActive = serverUrl === p.url;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: isActive ? theme.primaryBg : theme.surfaceSecondary,
                      borderColor: isActive ? theme.primary : theme.border,
                      borderRadius: radii.sm
                    }
                  ]}
                  onPress={() => handleApplyPreset(p.url)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      { color: isActive ? theme.primary : theme.textSecondary, fontWeight: isActive ? "700" : "500" }
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action: Test Backend & Ollama Connection */}
          <Button
            title="Test Backend and Ollama Connection"
            onPress={runHealthCheck}
            loading={testingConnection}
            variant="primary"
            size="md"
            style={{ marginTop: 12, marginBottom: 16 }}
          />

          {/* Compact Truthful Status Rows */}
          <View style={[styles.statusTable, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle, borderRadius: radii.md }]}>
            {/* FastAPI Connection Status */}
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Icon name="server" size={14} color={theme.textSecondary} />
                <Text style={[styles.statusRowLabel, { color: theme.textPrimary }]}>FastAPI Gateway</Text>
              </View>
              <Badge
                label={isApiHealthy ? "Operational (HTTP 200)" : "Unreachable"}
                variant={isApiHealthy ? "success" : "danger"}
                size="sm"
              />
            </View>

            <View style={[styles.tableDivider, { backgroundColor: theme.divider }]} />

            {/* Ollama Availability */}
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Icon name="cpu" size={14} color={theme.textSecondary} />
                <Text style={[styles.statusRowLabel, { color: theme.textPrimary }]}>Ollama Server</Text>
              </View>
              <Badge
                label={!isApiHealthy ? "Unknown" : isOllamaConnected ? "Connected" : "Offline"}
                variant={isOllamaConnected ? "success" : "danger"}
                size="sm"
              />
            </View>

            <View style={[styles.tableDivider, { backgroundColor: theme.divider }]} />

            {/* Active Model Name & Loaded State */}
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Icon name="rights" size={14} color={theme.textSecondary} />
                <Text style={[styles.statusRowLabel, { color: theme.textPrimary }]}>Active Model</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.modelNameText, { color: theme.textPrimary }]}>
                  {healthData?.model || "qwen2.5:7b-instruct"}
                </Text>
                <Text
                  style={[
                    styles.modelStateSub,
                    { color: isModelReady ? theme.success : theme.warning }
                  ]}
                >
                  {isModelReady ? "Loaded in Memory" : "Model Not Initialized"}
                </Text>
              </View>
            </View>

            <View style={[styles.tableDivider, { backgroundColor: theme.divider }]} />

            {/* RAG Knowledge Base Status */}
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <Icon name="document" size={14} color={theme.textSecondary} />
                <Text style={[styles.statusRowLabel, { color: theme.textPrimary }]}>RAG Knowledge Base</Text>
              </View>
              <Badge
                label={!isApiHealthy ? "Unknown" : isRagReady ? "Indexed & Ready" : "Uninitialized"}
                variant={isRagReady ? "success" : "warning"}
                size="sm"
              />
            </View>
          </View>

          {/* Actionable Error Messages */}
          {testError && (
            <View style={[styles.diagnosticErrorBox, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderRadius: radii.sm }]}>
              <Text style={[styles.diagErrorTitle, { color: theme.dangerText }]}>Connection Diagnostic:</Text>
              <Text style={[styles.diagErrorDesc, { color: theme.dangerText }]}>{testError}</Text>
              <Text style={[styles.diagTip, { color: theme.dangerText }]}>
                Ensure the backend is active on your host machine with:{"\n"}
                python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
              </Text>
            </View>
          )}

          {/* Expandable Diagnostic Details */}
          <TouchableOpacity
            style={styles.diagToggleRow}
            onPress={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Text style={[styles.diagToggleText, { color: theme.textMuted }]}>
              {showDiagnostics ? "Hide JSON Diagnostics" : "View Raw Diagnostics →"}
            </Text>
          </TouchableOpacity>

          {showDiagnostics && healthData && (
            <View style={[styles.rawDiagBox, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.sm }]}>
              <Text style={[styles.rawDiagCode, { color: theme.textSecondary }]}>
                {JSON.stringify(healthData, null, 2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerBrand, { color: theme.textMuted }]}>NYAYA AI • PRODUCTION READY</Text>
        <Text style={[styles.footerLegal, { color: theme.textMuted }]}>
          Indian Legal Document Intelligence • Safe local AI processing
        </Text>
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
    paddingBottom: 40
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19
  },
  sectionCategoryTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 16
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800"
  },
  accountMeta: {
    flex: 1
  },
  userName: {
    fontSize: 14,
    fontWeight: "700"
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1
  },
  signOutText: {
    fontSize: 11,
    fontWeight: "600"
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  guestIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  guestDetails: {
    flex: 1,
    marginRight: 8
  },
  guestTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  guestDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2
  },
  signInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: "600"
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2
  },
  settingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  settingValText: {
    fontSize: 12,
    fontWeight: "600"
  },
  rowDivider: {
    height: 1,
    marginVertical: 4
  },
  devSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8
  },
  collapseToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 4
  },
  collapseToggleText: {
    fontSize: 11,
    fontWeight: "600"
  },
  advancedContainer: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6
  },
  urlInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6
  },
  presetButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    borderWidth: 1,
    alignItems: "center"
  },
  presetBtnText: {
    fontSize: 10
  },
  statusTable: {
    borderWidth: 1,
    padding: 12
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6
  },
  statusRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  statusRowLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  modelNameText: {
    fontSize: 11,
    fontWeight: "700"
  },
  modelStateSub: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1
  },
  tableDivider: {
    height: 1,
    marginVertical: 4
  },
  diagnosticErrorBox: {
    padding: 10,
    borderWidth: 1,
    marginTop: 12
  },
  diagErrorTitle: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2
  },
  diagErrorDesc: {
    fontSize: 11,
    lineHeight: 16
  },
  diagTip: {
    fontSize: 10,
    marginTop: 4,
    fontStyle: "italic"
  },
  diagToggleRow: {
    marginTop: 12,
    alignItems: "center"
  },
  diagToggleText: {
    fontSize: 11,
    fontWeight: "600"
  },
  rawDiagBox: {
    padding: 10,
    marginTop: 8
  },
  rawDiagCode: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  },
  footer: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 12
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1
  },
  footerLegal: {
    fontSize: 10,
    marginTop: 2
  }
});
