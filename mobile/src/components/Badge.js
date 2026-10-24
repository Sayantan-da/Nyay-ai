import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function Badge({
  label,
  variant = "neutral", // "primary" | "success" | "warning" | "danger" | "neutral"
  size = "md", // "sm" | "md"
  style,
  textStyle
}) {
  const { theme, radii } = useTheme();

  const getColors = () => {
    switch (variant) {
      case "primary":
        return { bg: theme.primaryBg, text: theme.primary, border: theme.primaryBorder };
      case "success":
        return { bg: theme.successBg, text: theme.successText, border: theme.successBorder };
      case "warning":
        return { bg: theme.warningBg, text: theme.warningText, border: theme.warningBorder };
      case "danger":
        return { bg: theme.dangerBg, text: theme.dangerText, border: theme.dangerBorder };
      case "neutral":
      default:
        return { bg: theme.surfaceSecondary, text: theme.textSecondary, border: theme.border };
    }
  };

  const colors = getColors();
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: radii.sm,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 8
        },
        style
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSm ? 10 : 11
          },
          textStyle
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center"
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2
  }
});
