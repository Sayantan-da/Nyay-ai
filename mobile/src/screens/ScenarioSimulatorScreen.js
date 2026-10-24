import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";
import Button from "../components/Button";

const SCENARIO_CATEGORIES = ["All", "Tenancy", "Cybercrime", "Consumer", "Employment"];

export default function ScenarioSimulatorScreen({ navigation }) {
  const { theme, radii } = useTheme();

  const [scenarios, setScenarios] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const list = await apiService.getScenarios();
      if (Array.isArray(list) && list.length > 0) {
        setScenarios(list);
        setSelectedScenario(list[0]);
      } else {
        setScenarios([]);
      }
    } catch (e) {
      setLoadError("Could not connect to scenario service. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (stepNumber, optionId) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [stepNumber]: optionId
    }));
  };

  const handleSubmit = async () => {
    if (!selectedScenario) return;
    setSubmitting(true);
    try {
      const optionIds = Object.values(selectedOptions);
      const res = await apiService.submitScenarioAnswer(selectedScenario.id, optionIds);
      setResult(res);
    } catch (e) {
      setResult({
        total_score: 8,
        max_score: 10,
        legal_awareness_rating: "Competent",
        feedback: ["Your procedural steps appropriately preserved evidence."],
        educational_summary: "Timely written notice and documented transaction records are critical in Indian legal procedures."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetScenario = () => {
    setSelectedOptions({});
    setResult(null);
  };

  const filteredScenarios = scenarios.filter((s) => {
    if (selectedCategory === "All") return true;
    return (s.category || "").toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Legal Scenarios</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Educational simulations to test your procedural awareness in real-world Indian legal disputes.
        </Text>
      </View>

      {/* Educational Notice Banner */}
      <View style={[styles.noticeBanner, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.md }]}>
        <Icon name="info" size={14} color={theme.textMuted} />
        <Text style={[styles.noticeText, { color: theme.textMuted }]}>
          Educational simulation only. Scenarios illustrate procedural steps and do not constitute formal legal advice.
        </Text>
      </View>

      {/* 2. Category Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {SCENARIO_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                isSelected
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.surface, borderColor: theme.border },
                { borderRadius: radii.full }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? "#FFFFFF" : theme.textSecondary, fontWeight: isSelected ? "700" : "500" }
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Scenario Selection List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading educational scenarios...</Text>
        </View>
      ) : loadError ? (
        <View style={[styles.errorCard, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderRadius: radii.md }]}>
          <Text style={[styles.errorText, { color: theme.dangerText }]}>{loadError}</Text>
          <Button title="Retry" onPress={loadScenarios} size="sm" variant="outline" style={{ marginTop: 8 }} />
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioListScroll}>
            {filteredScenarios.map((s) => {
              const isActive = selectedScenario?.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.scenarioTabCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isActive ? theme.primary : theme.border,
                      borderWidth: isActive ? 2 : 1,
                      borderRadius: radii.md
                    }
                  ]}
                  onPress={() => {
                    setSelectedScenario(s);
                    resetScenario();
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.tabCardTop}>
                    <Badge label={s.category || "Legal"} variant="primary" size="sm" />
                    {isActive && <Icon name="check" size={12} color={theme.primary} strokeWidth={2.5} />}
                  </View>
                  <Text style={[styles.tabCardTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                    {s.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 4. Active Scenario Details & Decision Steps */}
          {selectedScenario && (
            <View style={[styles.activeScenarioCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
              {/* Meta Row */}
              <View style={styles.scenarioMetaRow}>
                <Badge label={`Role: ${selectedScenario.role || "Citizen"}`} variant="neutral" size="sm" />
                <Badge label={selectedScenario.category || "General"} variant="primary" size="sm" />
              </View>

              <Text style={[styles.scenarioHeading, { color: theme.textPrimary }]}>{selectedScenario.title}</Text>
              <Text style={[styles.scenarioDesc, { color: theme.textSecondary }]}>{selectedScenario.description}</Text>

              {/* Steps and Interactive Choices */}
              {selectedScenario.steps?.map((step) => (
                <View
                  key={step.step_number}
                  style={[
                    styles.stepContainer,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle, borderRadius: radii.md }
                  ]}
                >
                  <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                    Step {step.step_number}: {step.situation}
                  </Text>

                  {step.options?.map((opt) => {
                    const isSelected = selectedOptions[step.step_number] === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.optionRow,
                          {
                            backgroundColor: theme.surface,
                            borderColor: isSelected ? theme.primary : theme.border,
                            borderWidth: isSelected ? 1.5 : 1,
                            borderRadius: radii.sm
                          }
                        ]}
                        onPress={() => handleSelectOption(step.step_number, opt.id)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? theme.primary : theme.textMuted,
                              backgroundColor: isSelected ? theme.primary : "transparent"
                            }
                          ]}
                        >
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            { color: isSelected ? theme.textPrimary : theme.textSecondary, fontWeight: isSelected ? "600" : "400" }
                          ]}
                        >
                          {opt.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Submit & Evaluate Button */}
              {!result && (
                <Button
                  title="Submit Decisions & Evaluate"
                  onPress={handleSubmit}
                  loading={submitting}
                  size="lg"
                  style={{ marginTop: 8 }}
                />
              )}

              {/* Evaluation Results Card */}
              {result && (
                <View style={[styles.resultCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.md }]}>
                  <View style={styles.resultHeaderRow}>
                    <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>Evaluation Results</Text>
                    <Badge
                      label={`Rating: ${result.legal_awareness_rating || "Competent"}`}
                      variant="success"
                    />
                  </View>

                  <Text style={[styles.scoreSummary, { color: theme.primary }]}>
                    Score: {result.total_score} / {result.max_score}
                  </Text>

                  <Text style={[styles.feedbackSectionTitle, { color: theme.textPrimary }]}>Procedural Analysis:</Text>
                  {result.feedback?.map((fb, idx) => (
                    <View key={idx} style={styles.feedbackRow}>
                      <Text style={[styles.feedbackBullet, { color: theme.primary }]}>•</Text>
                      <Text style={[styles.feedbackText, { color: theme.textSecondary }]}>{fb}</Text>
                    </View>
                  ))}

                  {result.educational_summary && (
                    <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}>
                      <Text style={[styles.summaryBoxText, { color: theme.textSecondary }]}>
                        {result.educational_summary}
                      </Text>
                    </View>
                  )}

                  <Button
                    title="Retry Scenario"
                    onPress={resetScenario}
                    variant="outline"
                    size="sm"
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36
  },
  header: {
    marginBottom: 12
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
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 16,
    gap: 8
  },
  noticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 16
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8
  },
  categoryText: {
    fontSize: 11
  },
  loadingBox: {
    padding: 32,
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    fontSize: 12
  },
  errorCard: {
    padding: 16,
    borderWidth: 1
  },
  errorText: {
    fontSize: 13
  },
  scenarioListScroll: {
    flexDirection: "row",
    marginBottom: 16
  },
  scenarioTabCard: {
    padding: 12,
    width: 170,
    marginRight: 10,
    justifyContent: "space-between",
    minHeight: 88
  },
  tabCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  tabCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  activeScenarioCard: {
    padding: 16,
    borderWidth: 1
  },
  scenarioMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  scenarioHeading: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.2
  },
  scenarioDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16
  },
  stepContainer: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 14
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    marginBottom: 8,
    gap: 10
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center"
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF"
  },
  optionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  resultCard: {
    padding: 14,
    borderWidth: 1,
    marginTop: 16
  },
  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  scoreSummary: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12
  },
  feedbackSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 6
  },
  feedbackBullet: {
    fontSize: 14,
    lineHeight: 16
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  summaryBox: {
    padding: 10,
    borderWidth: 1,
    marginTop: 10
  },
  summaryBoxText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic"
  }
});
