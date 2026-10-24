import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import Icon from "./src/components/Icon";

import HomeScreen from "./src/screens/HomeScreen";
import ChatScreen from "./src/screens/ChatScreen";
import ScannerScreen from "./src/screens/ScannerScreen";
import DocumentAnalysisScreen from "./src/screens/DocumentAnalysisScreen";
import LearningHubScreen from "./src/screens/LearningHubScreen";
import ScenarioSimulatorScreen from "./src/screens/ScenarioSimulatorScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AuthScreen from "./src/screens/AuthScreen";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState("Home");
  const [screenParams, setScreenParams] = useState({});
  const { theme, isDark } = useTheme();

  // Unified navigation controller
  const navigation = {
    navigate: (screenName, params = {}) => {
      setScreenParams(params);
      setCurrentScreen(screenName);
    },
    goBack: () => {
      setCurrentScreen("Home");
    }
  };

  const renderCurrentScreen = () => {
    const route = { params: screenParams };
    switch (currentScreen) {
      case "Home":
        return <HomeScreen navigation={navigation} route={route} />;
      case "Chat":
        return <ChatScreen navigation={navigation} route={route} />;
      case "Scanner":
        return <ScannerScreen navigation={navigation} route={route} />;
      case "AnalysisResult":
        return <DocumentAnalysisScreen navigation={navigation} route={route} />;
      case "Scenarios":
        return <ScenarioSimulatorScreen navigation={navigation} route={route} />;
      case "Learning":
        return <LearningHubScreen navigation={navigation} route={route} />;
      case "Profile":
        return <ProfileScreen navigation={navigation} route={route} />;
      case "Auth":
        return <AuthScreen navigation={navigation} onSuccess={() => setCurrentScreen("Profile")} />;
      default:
        return <HomeScreen navigation={navigation} route={route} />;
    }
  };

  // Six core destinations as required by design spec
  const tabs = [
    { name: "Home", label: "Home", icon: "home" },
    { name: "Chat", label: "Chat", icon: "chat" },
    { name: "Scanner", label: "Scan", icon: "scanner", isPrimary: true },
    { name: "Scenarios", label: "Simulate", icon: "scenarios" },
    { name: "Learning", label: "Rights", icon: "rights" },
    { name: "Profile", label: "Settings", icon: "settings" }
  ];

  const hideTabBar = currentScreen === "Auth" || currentScreen === "AnalysisResult";

  return (
    <SafeAreaView style={[styles.appContainer, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.background} />
      
      {/* Active Screen Surface */}
      <View style={styles.screenContainer}>
        {renderCurrentScreen()}
      </View>

      {/* Refined Bottom Tab Navigation */}
      {!hideTabBar && (
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.borderSubtle
            }
          ]}
        >
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.name;
            const activeColor = theme.primary;
            const inactiveColor = theme.textMuted;

            return (
              <TouchableOpacity
                key={tab.name}
                style={[
                  styles.tabItem,
                  tab.isPrimary && styles.tabItemPrimary,
                  isActive && !tab.isPrimary && { backgroundColor: theme.surfaceSecondary }
                ]}
                onPress={() => navigation.navigate(tab.name)}
                activeOpacity={0.75}
              >
                {tab.isPrimary ? (
                  <View style={[styles.primaryBadge, { backgroundColor: theme.primary }]}>
                    <Icon name={tab.icon} size={18} color="#FFFFFF" strokeWidth={2} />
                  </View>
                ) : (
                  <Icon
                    name={tab.icon}
                    size={18}
                    color={isActive ? activeColor : inactiveColor}
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />
                )}
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? activeColor : inactiveColor,
                      fontWeight: isActive ? "700" : "500"
                    }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1
  },
  screenContainer: {
    flex: 1
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 18 : 8,
    paddingHorizontal: 4,
    justifyContent: "space-around",
    alignItems: "center"
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 54
  },
  tabItemPrimary: {
    marginTop: -8
  },
  primaryBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    shadowColor: "#4338CA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1
  }
});
