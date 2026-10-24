import React from "react";
import { View, StyleSheet } from "react-native";

export default function Icon({ name, size = 20, color = "#0F172A", strokeWidth = 1.75, style }) {
  const s = size;
  const sw = strokeWidth;

  // Render vector line icons using React Native Views with border and layout precision
  switch (name) {
    case "home":
      return (
        <View style={[{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }, style]}>
          {/* Roof */}
          <View
            style={{
              position: "absolute",
              top: s * 0.1,
              width: s * 0.65,
              height: s * 0.65,
              borderTopWidth: sw,
              borderLeftWidth: sw,
              borderColor: color,
              transform: [{ rotate: "45deg" }]
            }}
          />
          {/* Base */}
          <View
            style={{
              width: s * 0.62,
              height: s * 0.48,
              borderWidth: sw,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              alignItems: "center",
              justifyContent: "flex-end",
              marginBottom: s * 0.08
            }}
          >
            <View
              style={{
                width: s * 0.22,
                height: s * 0.26,
                borderWidth: sw,
                borderBottomWidth: 0,
                borderColor: color,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2
              }}
            />
          </View>
        </View>
      );

    case "chat":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.62,
              borderRadius: s * 0.2,
              borderWidth: sw,
              borderColor: color,
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {/* 3 message dots */}
            <View style={{ flexDirection: "row", gap: s * 0.08 }}>
              <View style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: color }} />
              <View style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: color }} />
              <View style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: color }} />
            </View>
          </View>
          {/* Tail */}
          <View
            style={{
              position: "absolute",
              bottom: s * 0.12,
              left: s * 0.22,
              width: s * 0.18,
              height: s * 0.18,
              backgroundColor: "transparent",
              borderLeftWidth: sw,
              borderBottomWidth: sw,
              borderColor: color,
              transform: [{ rotate: "25deg" }]
            }}
          />
        </View>
      );

    case "scanner":
    case "document":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.82,
              borderWidth: sw,
              borderColor: color,
              borderRadius: 3,
              padding: s * 0.08,
              justifyContent: "space-around"
            }}
          >
            <View style={{ width: "70%", height: sw, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: "90%", height: sw, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: "60%", height: sw, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case "rights":
    case "book":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View style={{ flexDirection: "row", width: s * 0.8, height: s * 0.65 }}>
            {/* Left Page */}
            <View
              style={{
                flex: 1,
                borderWidth: sw,
                borderRightWidth: 0,
                borderColor: color,
                borderTopLeftRadius: 3,
                borderBottomLeftRadius: 3,
                padding: s * 0.06,
                justifyContent: "space-around"
              }}
            >
              <View style={{ width: "80%", height: sw, backgroundColor: color }} />
              <View style={{ width: "60%", height: sw, backgroundColor: color }} />
            </View>
            {/* Center spine */}
            <View style={{ width: sw, height: "100%", backgroundColor: color }} />
            {/* Right Page */}
            <View
              style={{
                flex: 1,
                borderWidth: sw,
                borderLeftWidth: 0,
                borderColor: color,
                borderTopRightRadius: 3,
                borderBottomRightRadius: 3,
                padding: s * 0.06,
                justifyContent: "space-around"
              }}
            >
              <View style={{ width: "80%", height: sw, backgroundColor: color }} />
              <View style={{ width: "60%", height: sw, backgroundColor: color }} />
            </View>
          </View>
        </View>
      );

    case "scenarios":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          {/* Branching flow icon */}
          <View style={{ width: s * 0.75, height: s * 0.75, justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ width: s * 0.22, height: s * 0.22, borderRadius: 3, borderWidth: sw, borderColor: color }} />
              <View style={{ height: sw, flex: 1, backgroundColor: color, marginHorizontal: 2 }} />
              <View style={{ width: s * 0.22, height: s * 0.22, borderRadius: 3, borderWidth: sw, borderColor: color }} />
            </View>
            <View style={{ width: sw, height: s * 0.2, backgroundColor: color, alignSelf: "center" }} />
            <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, borderWidth: sw, borderColor: color, alignSelf: "center" }} />
          </View>
        </View>
      );

    case "settings":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          {/* Sliders line icon */}
          <View style={{ width: s * 0.75, height: s * 0.65, justifyContent: "space-between" }}>
            {/* Line 1 */}
            <View style={{ flexDirection: "row", alignItems: "center", height: s * 0.18 }}>
              <View style={{ height: sw, width: s * 0.2, backgroundColor: color }} />
              <View style={{ width: s * 0.18, height: s * 0.18, borderRadius: s * 0.09, borderWidth: sw, borderColor: color }} />
              <View style={{ height: sw, flex: 1, backgroundColor: color }} />
            </View>
            {/* Line 2 */}
            <View style={{ flexDirection: "row", alignItems: "center", height: s * 0.18 }}>
              <View style={{ height: sw, flex: 1, backgroundColor: color }} />
              <View style={{ width: s * 0.18, height: s * 0.18, borderRadius: s * 0.09, borderWidth: sw, borderColor: color }} />
              <View style={{ height: sw, width: s * 0.2, backgroundColor: color }} />
            </View>
          </View>
        </View>
      );

    case "search":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.52,
              height: s * 0.52,
              borderRadius: s * 0.26,
              borderWidth: sw,
              borderColor: color,
              marginTop: -s * 0.1,
              marginLeft: -s * 0.1
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: s * 0.18,
              right: s * 0.2,
              width: s * 0.3,
              height: sw + 0.5,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: "45deg" }]
            }}
          />
        </View>
      );

    case "upload":
      return (
        <View style={[{ width: s, height: s, alignItems: "center", justifyContent: "center" }, style]}>
          {/* Arrow up */}
          <View
            style={{
              width: s * 0.28,
              height: s * 0.28,
              borderTopWidth: sw,
              borderLeftWidth: sw,
              borderColor: color,
              transform: [{ rotate: "45deg" }],
              marginTop: -s * 0.05
            }}
          />
          <View style={{ width: sw, height: s * 0.32, backgroundColor: color, marginTop: -s * 0.06 }} />
          {/* Tray */}
          <View
            style={{
              width: s * 0.65,
              height: s * 0.22,
              borderWidth: sw,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
              marginTop: s * 0.08
            }}
          />
        </View>
      );

    case "camera":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.24,
              height: s * 0.08,
              backgroundColor: color,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              marginBottom: -1
            }}
          />
          <View
            style={{
              width: s * 0.78,
              height: s * 0.54,
              borderRadius: 4,
              borderWidth: sw,
              borderColor: color,
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <View
              style={{
                width: s * 0.26,
                height: s * 0.26,
                borderRadius: s * 0.13,
                borderWidth: sw,
                borderColor: color
              }}
            />
          </View>
        </View>
      );

    case "image":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.74,
              height: s * 0.62,
              borderRadius: 3,
              borderWidth: sw,
              borderColor: color,
              padding: 2,
              overflow: "hidden"
            }}
          >
            <View
              style={{
                width: s * 0.14,
                height: s * 0.14,
                borderRadius: s * 0.07,
                backgroundColor: color,
                alignSelf: "flex-end",
                margin: 2
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -s * 0.08,
                left: s * 0.05,
                width: s * 0.4,
                height: s * 0.4,
                borderTopWidth: sw,
                borderLeftWidth: sw,
                borderColor: color,
                transform: [{ rotate: "45deg" }]
              }}
            />
          </View>
        </View>
      );

    case "check":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.28,
              borderLeftWidth: sw + 0.5,
              borderBottomWidth: sw + 0.5,
              borderColor: color,
              transform: [{ rotate: "-45deg" }],
              marginTop: -s * 0.08
            }}
          />
        </View>
      );

    case "chevron-right":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.32,
              height: s * 0.32,
              borderTopWidth: sw,
              borderRightWidth: sw,
              borderColor: color,
              transform: [{ rotate: "45deg" }],
              marginLeft: -s * 0.08
            }}
          />
        </View>
      );

    case "chevron-down":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.32,
              height: s * 0.32,
              borderBottomWidth: sw,
              borderRightWidth: sw,
              borderColor: color,
              transform: [{ rotate: "45deg" }],
              marginTop: -s * 0.08
            }}
          />
        </View>
      );

    case "chevron-up":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.32,
              height: s * 0.32,
              borderTopWidth: sw,
              borderLeftWidth: sw,
              borderColor: color,
              transform: [{ rotate: "45deg" }],
              marginTop: s * 0.08
            }}
          />
        </View>
      );

    case "user":
      return (
        <View style={[{ width: s, height: s, alignItems: "center", justifyContent: "center" }, style]}>
          <View
            style={{
              width: s * 0.34,
              height: s * 0.34,
              borderRadius: s * 0.17,
              borderWidth: sw,
              borderColor: color,
              marginBottom: 1
            }}
          />
          <View
            style={{
              width: s * 0.62,
              height: s * 0.32,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              borderWidth: sw,
              borderBottomWidth: 0,
              borderColor: color
            }}
          />
        </View>
      );

    case "shield":
      return (
        <View style={[{ width: s, height: s, alignItems: "center", justifyContent: "center" }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.75,
              borderWidth: sw,
              borderColor: color,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: s * 0.3,
              borderBottomRightRadius: s * 0.3,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <View style={{ width: sw, height: s * 0.32, backgroundColor: color }} />
          </View>
        </View>
      );

    case "copy":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          {/* Back sheet */}
          <View
            style={{
              position: "absolute",
              top: s * 0.15,
              right: s * 0.15,
              width: s * 0.48,
              height: s * 0.58,
              borderWidth: sw,
              borderColor: color,
              borderRadius: 2
            }}
          />
          {/* Front sheet */}
          <View
            style={{
              position: "absolute",
              bottom: s * 0.15,
              left: s * 0.15,
              width: s * 0.48,
              height: s * 0.58,
              borderWidth: sw,
              borderColor: color,
              borderRadius: 2,
              backgroundColor: "transparent"
            }}
          />
        </View>
      );

    case "alert":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.68,
              borderWidth: sw,
              borderColor: color,
              borderRadius: 4,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <View style={{ width: sw, height: s * 0.24, backgroundColor: color, marginBottom: 2 }} />
            <View style={{ width: sw + 0.5, height: sw + 0.5, borderRadius: 1, backgroundColor: color }} />
          </View>
        </View>
      );

    case "close":
    case "remove":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              position: "absolute",
              width: s * 0.55,
              height: sw,
              backgroundColor: color,
              transform: [{ rotate: "45deg" }]
            }}
          />
          <View
            style={{
              position: "absolute",
              width: s * 0.55,
              height: sw,
              backgroundColor: color,
              transform: [{ rotate: "-45deg" }]
            }}
          />
        </View>
      );

    case "server":
    case "cpu":
      return (
        <View style={[{ width: s, height: s, justifyContent: "center", alignItems: "center" }, style]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.68,
              borderWidth: sw,
              borderColor: color,
              borderRadius: 3,
              justifyContent: "space-around",
              paddingVertical: 2
            }}
          >
            <View style={{ height: sw, width: "100%", backgroundColor: color }} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingRight: 4, gap: 2 }}>
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
            </View>
          </View>
        </View>
      );

    default:
      return (
        <View
          style={[
            {
              width: s * 0.4,
              height: s * 0.4,
              borderRadius: s * 0.2,
              borderWidth: sw,
              borderColor: color
            },
            style
          ]}
        />
      );
  }
}
