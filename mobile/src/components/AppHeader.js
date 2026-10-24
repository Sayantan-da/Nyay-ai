import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  showLogo = false,
  status, // "online" | "offline" | "connecting" | null
  style
}) {
  const { theme, radii } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: theme.borderSubtle }, style]}>
      <View style={styles.leftRow}>
        {onBack ? (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.sm }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <Icon name="chevron-right" size={16} color={theme.textPrimary} />
            </View>
          </TouchableOpacity>
        ) : showLogo ? (
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder, borderRadius: radii.sm }]}>
            <Icon name="rights" size={16} color={theme.primary} />
          </View>
        ) : null}

        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {status ? (
          <View style={[styles.statusPill, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.full }]}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === "online"
                      ? theme.success
                      : status === "connecting"
                      ? theme.warning
                      : theme.danger
                }
              ]}
            />
            <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>
              {status === "online" ? "Local AI Ready" : status === "connecting" ? "Connecting" : "Offline"}
            </Text>
          </View>
        ) : null}

        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  backBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  titleCol: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600"
  }
});
