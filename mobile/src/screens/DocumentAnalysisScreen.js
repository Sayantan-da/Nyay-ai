import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Platform
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";
import Button from "../components/Button";

export default function DocumentAnalysisScreen({ route, navigation }) {
  const { theme, radii, spacing } = useTheme();
  const { analysis, filename } = route.params || {};

  const [docMessages, setDocMessages] = useState([]);
  const [docQuery, setDocQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  if (!analysis) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <Icon name="document" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No analysis available</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Upload a contract or agreement in the Scanner to view detailed clause breakdown.
          </Text>
          <Button
            title="Go to Scanner"
            onPress={() => navigation.navigate("Scanner")}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  const getSeverityVariant = (severity) => {
    const s = (severity || "").toLowerCase();
    if (s === "high") return "danger";
    if (s === "medium") return "warning";
    return "success";
  };

  const getImportanceVariant = (importance) => {
    const i = (importance || "").toLowerCase();
    if (i === "high") return "primary";
    if (i === "medium") return "warning";
    return "neutral";
  };

  // Detect key terms like deposits, lock-in, notice period, or penalty from clauses/risks
  const detectedTerms = [];
  const allItems = [...(analysis.important_clauses || []), ...(analysis.potential_risks || [])];
  allItems.forEach((item) => {
    const str = `${item.title} ${item.explanation} ${item.text || ""} ${item.source_context || ""}`.toLowerCase();
    if (str.includes("deposit") && !detectedTerms.some((t) => t.category === "Security Deposit")) {
      detectedTerms.push({
        category: "Security Deposit",
        title: item.title,
        detail: item.explanation || item.text
      });
    } else if ((str.includes("lock-in") || str.includes("lock in")) && !detectedTerms.some((t) => t.category === "Lock-in Period")) {
      detectedTerms.push({
        category: "Lock-in Period",
        title: item.title,
        detail: item.explanation || item.text
      });
    } else if ((str.includes("notice period") || str.includes("notice")) && !detectedTerms.some((t) => t.category === "Notice Period")) {
      detectedTerms.push({
        category: "Notice Period",
        title: item.title,
        detail: item.explanation || item.text
      });
    } else if ((str.includes("penalty") || str.includes("forfeit") || str.includes("late fee")) && !detectedTerms.some((t) => t.category === "Penalties & Fees")) {
      detectedTerms.push({
        category: "Penalties & Fees",
        title: item.title,
        detail: item.explanation || item.text
      });
    }
  });

  const handleAskQuestion = async (queryText) => {
    const question = (queryText || docQuery).trim();
    if (!question || asking) return;

    setDocQuery("");
    const newHistory = [...docMessages, { role: "user", text: question }];
    setDocMessages(newHistory);
    setAsking(true);

    try {
      const docContext = `DOCUMENT SUMMARY:
${analysis.summary || ""}

DOCUMENT TYPE: ${analysis.document_type || "Legal Agreement"}

KEY EXTRACTED CLAUSES:
${(analysis.important_clauses || []).map((c) => `• ${c.title}: "${c.text}" (${c.explanation})`).join("\n")}

POTENTIAL RISKS IDENTIFIED:
${(analysis.potential_risks || []).map((r) => `• ${r.title} (${r.severity} severity): ${r.explanation}`).join("\n")}`;

      const res = await apiService.sendChatMessage(question, null, "en", true, docContext);
      setDocMessages([
        ...newHistory,
        {
          role: "assistant",
          text: res.response || "No answer returned.",
          sources: res.sources || []
        }
      ]);
    } catch (err) {
      setDocMessages([
        ...newHistory,
        {
          role: "assistant",
          text: "Could not answer inquiry: " + (err.message || "Network error. Check backend connection.")
        }
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleShareSummary = async () => {
    try {
      const shareContent = `Nyaya AI Analysis Report: ${analysis.document_type || "Contract"}
File: ${filename || "Document"}

SUMMARY:
${analysis.summary}

KEY CONCERNS:
${(analysis.potential_risks || []).map((r) => `• ${r.title} (${r.severity}): ${r.explanation}`).join("\n")}

Disclaimer: Educational legal analysis only.`;

      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareContent);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 2500);
      } else {
        await Share.share({ message: shareContent, title: "Nyaya AI Analysis" });
      }
    } catch {}
  };

  const SUGGESTED_QUESTIONS = [
    "Is there any lock-in period penalty?",
    "Can the other party terminate without notice?",
    "Under what terms is the security deposit refundable?",
    "Which court holds jurisdiction in a dispute?"
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar with Back and Share Action */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}
          onPress={() => navigation.navigate("Scanner")}
        >
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <Icon name="chevron-right" size={16} color={theme.textPrimary} />
          </View>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}
          onPress={handleShareSummary}
        >
          <Icon name="copy" size={14} color={theme.textSecondary} />
          <Text style={[styles.shareBtnText, { color: theme.textSecondary }]}>
            {copiedNotice ? "Copied Report" : "Copy Report"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. Document Type & Classification Header */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.surface,
            borderColor: analysis.is_legal_document ? theme.border : theme.warningBorder,
            borderRadius: radii.lg
          }
        ]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.docTypeLabel, { color: theme.textMuted }]}>Document Classification</Text>
            <Text style={[styles.docTypeTitle, { color: theme.textPrimary }]}>
              {analysis.document_type || "Legal Document"}
            </Text>
          </View>
          <Badge
            label={analysis.is_legal_document ? `${Math.round((analysis.confidence || 0.9) * 100)}% Match` : "Non-Contractual"}
            variant={analysis.is_legal_document ? "primary" : "warning"}
          />
        </View>
        {filename && (
          <Text style={[styles.fileNameText, { color: theme.textMuted }]} numberOfLines={1}>
            Source: {filename}
          </Text>
        )}
      </View>

      {/* Non-legal document alert if applicable */}
      {!analysis.is_legal_document && (
        <View style={[styles.alertBanner, { backgroundColor: theme.warningBg, borderColor: theme.warningBorder, borderRadius: radii.md }]}>
          <Icon name="alert" size={18} color={theme.warning} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.alertTitle, { color: theme.warningText }]}>Non-Legal Document Detected</Text>
            <Text style={[styles.alertDesc, { color: theme.warningText }]}>
              The uploaded file does not appear to contain binding covenants, statutory obligations, or enforceable legal terms.
            </Text>
          </View>
        </View>
      )}

      {/* 2. Short Plain-Language Summary */}
      <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Executive Summary</Text>
        <Text style={[styles.summaryBody, { color: theme.textSecondary }]}>{analysis.summary}</Text>
      </View>

      {/* 3. Potential Risks with Explanations and Severity */}
      {analysis.potential_risks && analysis.potential_risks.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
              Identified Risks & Red Flags ({analysis.potential_risks.length})
            </Text>
            <Badge label="Needs Attention" variant="danger" size="sm" />
          </View>

          {analysis.potential_risks.map((risk, idx) => (
            <View
              key={idx}
              style={[
                styles.riskCard,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.borderSubtle,
                  borderRadius: radii.md
                }
              ]}
            >
              <View style={styles.riskHeader}>
                <Text style={[styles.riskTitle, { color: theme.textPrimary }]}>{risk.title}</Text>
                <Badge
                  label={`${(risk.severity || "medium").toUpperCase()} RISK`}
                  variant={getSeverityVariant(risk.severity)}
                  size="sm"
                />
              </View>

              {/* Interpretation */}
              <Text style={[styles.riskExplanation, { color: theme.textSecondary }]}>
                {risk.explanation}
              </Text>

              {/* Distinguish extracted excerpt from interpretation */}
              {risk.source_context ? (
                <View style={[styles.excerptBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}>
                  <Text style={[styles.excerptLabel, { color: theme.textMuted }]}>EXTRACTED EXCERPT FROM DOCUMENT:</Text>
                  <Text style={[styles.excerptText, { color: theme.textPrimary }]}>
                    "{risk.source_context}"
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* 4. Important Clauses (Extracted Text vs AI Interpretation) */}
      {analysis.important_clauses && analysis.important_clauses.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
              Key Extracted Clauses ({analysis.important_clauses.length})
            </Text>
            <Badge label="Contract Terms" variant="neutral" size="sm" />
          </View>

          {analysis.important_clauses.map((clause, idx) => (
            <View
              key={idx}
              style={[
                styles.clauseCard,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.borderSubtle,
                  borderRadius: radii.md
                }
              ]}
            >
              <View style={styles.clauseHeader}>
                <Text style={[styles.clauseTitle, { color: theme.textPrimary }]}>{clause.title}</Text>
                <Badge
                  label={clause.importance || "Standard"}
                  variant={getImportanceVariant(clause.importance)}
                  size="sm"
                />
              </View>

              {/* Extracted Document Text */}
              <View style={[styles.excerptBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.sm }]}>
                <Text style={[styles.excerptLabel, { color: theme.textMuted }]}>DOCUMENT CLAUSE TEXT:</Text>
                <Text style={[styles.excerptText, { color: theme.textPrimary }]}>"{clause.text}"</Text>
              </View>

              {/* Plain Language Interpretation */}
              <View style={styles.interpretationBox}>
                <Text style={[styles.interpretationLabel, { color: theme.primary }]}>PLAIN-LANGUAGE MEANING:</Text>
                <Text style={[styles.interpretationText, { color: theme.textSecondary }]}>
                  {clause.explanation}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 5. Detected Deadlines, Deposits, Lock-ins & Notice Periods */}
      {detectedTerms.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
            Detected Key Terms & Deadlines
          </Text>
          <Text style={[styles.sectionSub, { color: theme.textMuted, marginBottom: 12 }]}>
            Specific covenants identified in the contract regarding payments, lock-ins, and exits:
          </Text>

          {detectedTerms.map((term, idx) => (
            <View
              key={idx}
              style={[
                styles.detectedRow,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.borderSubtle,
                  borderRadius: radii.sm
                }
              ]}
            >
              <View style={[styles.termCategoryBadge, { backgroundColor: theme.primaryBg }]}>
                <Text style={[styles.termCategoryText, { color: theme.primary }]}>{term.category}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.termTitle, { color: theme.textPrimary }]}>{term.title}</Text>
                <Text style={[styles.termDetail, { color: theme.textSecondary }]}>{term.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 6. Recommended Next Steps */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Recommended Next Steps</Text>
          {analysis.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recRow}>
              <View style={[styles.recBullet, { backgroundColor: theme.successBg }]}>
                <Icon name="check" size={10} color={theme.success} strokeWidth={2.5} />
              </View>
              <Text style={[styles.recText, { color: theme.textSecondary }]}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 7. Interactive Document Q&A Section */}
      <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Ask Nyaya AI About This Agreement</Text>
        <Text style={[styles.sectionSub, { color: theme.textMuted, marginBottom: 12 }]}>
          Ask specific questions grounded in this agreement's clauses and Indian statutes:
        </Text>

        {/* Suggested Starter Questions */}
        <View style={styles.suggestedPillRow}>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestedPill, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.full }]}
              onPress={() => handleAskQuestion(q)}
              disabled={asking}
            >
              <Text style={[styles.suggestedPillText, { color: theme.textPrimary }]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Q&A Thread */}
        {docMessages.length > 0 && (
          <View style={styles.qnaThread}>
            {docMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.qnaMsg,
                  msg.role === "user"
                    ? [styles.userMsg, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]
                    : [styles.assistantMsg, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }],
                  { borderRadius: radii.md }
                ]}
              >
                <Text style={[styles.qnaSender, { color: msg.role === "user" ? theme.textSecondary : theme.primary }]}>
                  {msg.role === "user" ? "You" : "Nyaya AI"}
                </Text>
                <Text style={[styles.qnaText, { color: theme.textPrimary }]}>{msg.text}</Text>
              </View>
            ))}
          </View>
        )}

        {asking && (
          <View style={styles.askingRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.askingText, { color: theme.textMuted }]}>Analyzing clause evidence...</Text>
          </View>
        )}

        {/* Ask Input */}
        <View style={[styles.askInputContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.md }]}>
          <TextInput
            style={[styles.askInput, { color: theme.textPrimary }]}
            placeholder="Ask a question about this document..."
            placeholderTextColor={theme.textMuted}
            value={docQuery}
            onChangeText={setDocQuery}
            editable={!asking}
          />
          <TouchableOpacity
            style={[
              styles.askBtn,
              { backgroundColor: !docQuery.trim() || asking ? theme.border : theme.primary, borderRadius: radii.sm }
            ]}
            onPress={() => handleAskQuestion(docQuery)}
            disabled={!docQuery.trim() || asking}
          >
            <Icon name="chevron-right" size={14} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 8. Statutory Disclaimer */}
      <View style={[styles.disclaimerCard, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.md }]}>
        <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
          {analysis.disclaimer || "This analysis is for educational and literacy purposes only and does not constitute formal legal advice. Please consult a qualified advocate for representation."}
        </Text>
      </View>

      {/* Return Action */}
      <Button
        title="Return to Scanner"
        variant="outline"
        onPress={() => navigation.navigate("Scanner")}
        style={{ marginTop: 8 }}
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  headerCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6
  },
  docTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  docTypeTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  fileNameText: {
    fontSize: 11,
    marginTop: 4
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    marginBottom: 14
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2
  },
  alertDesc: {
    fontSize: 12,
    lineHeight: 17
  },
  sectionCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 8
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 17
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 20
  },
  riskCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8
  },
  riskExplanation: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8
  },
  clauseCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 10
  },
  clauseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  clauseTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8
  },
  excerptBox: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 8
  },
  excerptLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  excerptText: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 17
  },
  interpretationBox: {
    paddingTop: 4
  },
  interpretationLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  interpretationText: {
    fontSize: 12,
    lineHeight: 18
  },
  detectedRow: {
    padding: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10
  },
  termCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  termCategoryText: {
    fontSize: 10,
    fontWeight: "700"
  },
  termTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2
  },
  termDetail: {
    fontSize: 11,
    lineHeight: 16
  },
  recRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8
  },
  recBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  recText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18
  },
  suggestedPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12
  },
  suggestedPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1
  },
  suggestedPillText: {
    fontSize: 11,
    fontWeight: "500"
  },
  qnaThread: {
    marginBottom: 12,
    gap: 8
  },
  qnaMsg: {
    padding: 10,
    borderWidth: 1
  },
  userMsg: {
    alignSelf: "flex-end",
    maxWidth: "88%"
  },
  assistantMsg: {
    alignSelf: "flex-start",
    maxWidth: "92%"
  },
  qnaSender: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 3
  },
  qnaText: {
    fontSize: 12,
    lineHeight: 18
  },
  askingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  askingText: {
    fontSize: 11
  },
  askInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 4
  },
  askInput: {
    flex: 1,
    fontSize: 12
  },
  askBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  disclaimerCard: {
    padding: 12,
    marginBottom: 14
  },
  disclaimerText: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center"
  }
});
