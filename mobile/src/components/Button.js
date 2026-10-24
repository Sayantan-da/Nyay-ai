import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function Button({
  title,
  onPress,
  variant = "primary", // "primary" | "secondary" | "outline" | "danger" | "ghost"
  size = "md", // "sm" | "md" | "lg"
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle
}) {
  const { theme, radii } = useTheme();

  const getVariantStyles = () => {
    if (disabled) {
      return {
        bg: theme.surfaceSecondary,
        border: theme.border,
        text: theme.textMuted
      };
    }
    switch (variant) {
      case "primary":
        return {
          bg: theme.primary,
          border: theme.primary,
          text: "#FFFFFF"
        };
      case "secondary":
        return {
          bg: theme.primaryBg,
          border: theme.primaryBorder,
          text: theme.primary
        };
      case "outline":
        return {
          bg: theme.surface,
          border: theme.border,
          text: theme.textPrimary
        };
      case "danger":
        return {
          bg: theme.dangerBg,
          border: theme.dangerBorder,
          text: theme.danger
        };
      case "ghost":
        return {
          bg: "transparent",
          border: "transparent",
          text: theme.primary
        };
      default:
        return {
          bg: theme.primary,
          border: theme.primary,
          text: "#FFFFFF"
        };
    }
  };

  const v = getVariantStyles();

  const getPadding = () => {
    switch (size) {
      case "sm":
        return { py: 8, px: 12, fontSize: 12, radius: radii.sm };
      case "lg":
        return { py: 14, px: 20, fontSize: 15, radius: radii.md };
      case "md":
      default:
        return { py: 11, px: 16, fontSize: 13, radius: radii.md };
    }
  };

  const p = getPadding();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: p.py,
          paddingHorizontal: p.px,
          borderRadius: p.radius,
          opacity: disabled ? 0.7 : 1
        },
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              {
                color: v.text,
                fontSize: p.fontSize
              },
              textStyle
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  iconSlot: {
    marginRight: 8
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2
  }
});
