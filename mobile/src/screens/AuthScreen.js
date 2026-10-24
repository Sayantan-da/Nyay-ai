import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Button from "../components/Button";

export default function AuthScreen({ navigation, onSuccess }) {
  const { theme, radii } = useTheme();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email address and password.");
      return;
    }

    if (mode === "register" && !fullName.trim()) {
      setErrorMsg("Please enter your full legal name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await apiService.login(email.trim(), password);
        Alert.alert("Welcome Back", `Signed in as ${res.full_name || "Citizen"}.`);
      } else {
        const res = await apiService.register(email.trim(), password, fullName.trim(), "en");
        Alert.alert("Account Created", `Welcome to Nyaya AI, ${res.full_name}!`);
      }
      setLoading(false);
      if (onSuccess) {
        onSuccess();
      } else if (navigation?.navigate) {
        navigation.navigate("Profile");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || "Authentication failed. Check your network connection.");
    }
  };

  const handleGuestContinue = () => {
    if (navigation?.navigate) {
      navigation.navigate("Home");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Close/Back Button */}
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}
          onPress={() => navigation.navigate("Home")}
        >
          <Icon name="close" size={14} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.brandBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder, borderRadius: radii.md }]}>
            <Icon name="rights" size={24} color={theme.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>NYAYA AI</Text>
          <Text style={[styles.brandSub, { color: theme.textMuted }]}>
            Citizen Legal Document Intelligence
          </Text>
        </View>

        {/* Mode Toggle Tabs */}
        <View style={[styles.modeTabsRow, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === "login" && { backgroundColor: theme.primary },
              { borderRadius: radii.sm }
            ]}
            onPress={() => { setMode("login"); setErrorMsg(""); }}
          >
            <Text
              style={[
                styles.modeTabText,
                { color: mode === "login" ? "#FFFFFF" : theme.textSecondary, fontWeight: mode === "login" ? "700" : "500" }
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === "register" && { backgroundColor: theme.primary },
              { borderRadius: radii.sm }
            ]}
            onPress={() => { setMode("register"); setErrorMsg(""); }}
          >
            <Text
              style={[
                styles.modeTabText,
                { color: mode === "register" ? "#FFFFFF" : theme.textSecondary, fontWeight: mode === "register" ? "700" : "500" }
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <Text style={[styles.formHeading, { color: theme.textPrimary }]}>
            {mode === "login" ? "Welcome back" : "Create citizen account"}
          </Text>
          <Text style={[styles.formSub, { color: theme.textSecondary }]}>
            {mode === "login"
              ? "Access your analyzed contracts and legal consultations."
              : "Sync your uploaded documents securely across devices."}
          </Text>

          {errorMsg ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderRadius: radii.sm }]}>
              <Text style={[styles.errorText, { color: theme.dangerText }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Full Name for Registration */}
          {mode === "register" && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    borderColor: theme.inputBorder,
                    color: theme.textPrimary,
                    borderRadius: radii.md
                  }
                ]}
                placeholder="e.g. Sayan Roy"
                placeholderTextColor={theme.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                  borderRadius: radii.md
                }
              ]}
              placeholder="name@example.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                  borderRadius: radii.md
                }
              ]}
              placeholder="Enter your password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Button
            title={mode === "login" ? "Sign In" : "Register Citizen Account"}
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Guest Continue */}
        <View style={styles.guestSection}>
          <TouchableOpacity
            style={[styles.guestBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}
            onPress={handleGuestContinue}
          >
            <Text style={[styles.guestBtnTitle, { color: theme.textPrimary }]}>Continue in Guest Mode</Text>
            <Text style={[styles.guestBtnSub, { color: theme.textMuted }]}>
              Analyze documents and chat without signing in
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Seal */}
        <View style={styles.securitySeal}>
          <Icon name="shield" size={14} color={theme.textMuted} />
          <Text style={[styles.securitySealText, { color: theme.textMuted }]}>
            Protected with local instance data isolation & SSL
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  backBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 20
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1.5
  },
  brandSub: {
    fontSize: 12,
    marginTop: 2
  },
  modeTabsRow: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 4,
    marginBottom: 16
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center"
  },
  modeTabText: {
    fontSize: 12
  },
  formCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 20
  },
  formHeading: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2
  },
  formSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16
  },
  errorBox: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 12
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16
  },
  inputGroup: {
    marginBottom: 14
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13
  },
  guestSection: {
    marginBottom: 20
  },
  guestBtn: {
    borderWidth: 1,
    padding: 14,
    alignItems: "center"
  },
  guestBtnTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2
  },
  guestBtnSub: {
    fontSize: 11
  },
  securitySeal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  securitySealText: {
    fontSize: 11
  }
});
