import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";
import Button from "../components/Button";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export default function ScannerScreen({ navigation }) {
  const { theme, radii, spacing } = useTheme();

  // Selected file staging state
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 1. Pick PDF / Document
  const handlePickDocument = async () => {
    setErrorMessage("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let filePayload;
        if (Platform.OS === "web") {
          filePayload = asset.file || (asset.uri ? await (await fetch(asset.uri)).blob() : null);
        } else {
          filePayload = {
            uri: asset.uri,
            name: asset.name || "document.pdf",
            type: asset.mimeType || "application/pdf"
          };
        }

        setSelectedFile({
          raw: filePayload,
          name: asset.name || "document.pdf",
          size: asset.size,
          type: "PDF Document"
        });
      }
    } catch (err) {
      setErrorMessage("Could not open document picker: " + err.message);
    }
  };

  // 2. Camera Capture
  const handleTakePhoto = async () => {
    setErrorMessage("");
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Camera access is needed to photograph legal documents.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        let filePayload;
        if (Platform.OS === "web") {
          filePayload = await (await fetch(photo.uri)).blob();
        } else {
          filePayload = {
            uri: photo.uri,
            name: photo.fileName || "camera_document.jpg",
            type: photo.mimeType || "image/jpeg"
          };
        }

        setSelectedFile({
          raw: filePayload,
          name: photo.fileName || "camera_document.jpg",
          size: photo.fileSize,
          type: "Camera Photo"
        });
      }
    } catch (err) {
      setErrorMessage("Camera error: " + err.message);
    }
  };

  // 3. Gallery Picker
  const handlePickImage = async () => {
    setErrorMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        let filePayload;
        if (Platform.OS === "web") {
          filePayload = await (await fetch(image.uri)).blob();
        } else {
          filePayload = {
            uri: image.uri,
            name: image.fileName || "gallery_document.jpg",
            type: image.mimeType || "image/jpeg"
          };
        }

        setSelectedFile({
          raw: filePayload,
          name: image.fileName || "gallery_document.jpg",
          size: image.fileSize,
          type: "Image File"
        });
      }
    } catch (err) {
      setErrorMessage("Gallery error: " + err.message);
    }
  };

  // 4. Execute Analysis
  const handleAnalyzeDocument = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setErrorMessage("");
    setProgressStep("Uploading file to secure instance...");

    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        formData.append("file", selectedFile.raw, selectedFile.name);
      } else {
        formData.append("file", {
          uri: selectedFile.raw.uri,
          name: selectedFile.name,
          type: selectedFile.raw.type || "application/pdf"
        });
      }
      formData.append("language", "en");

      // Progressive status updates reflecting actual backend stages
      setTimeout(() => setProgressStep("Extracting text via PyMuPDF..."), 800);
      setTimeout(() => setProgressStep("Analyzing clauses & evaluating risks with Qwen 2.5..."), 2000);

      const analysis = await apiService.scanDocument(formData);
      setLoading(false);
      setProgressStep("");

      if (!analysis) {
        throw new Error("Empty analysis returned from server.");
      }

      navigation.navigate("AnalysisResult", {
        analysis,
        filename: selectedFile.name
      });
    } catch (err) {
      setLoading(false);
      setProgressStep("");
      const msg = err.message || "Failed to analyze document. Verify backend is running.";
      setErrorMessage(msg);
      Alert.alert("Analysis Error", msg);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage("");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header with exact requested titles */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Understand your document</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Find important clauses, deadlines and potential risks.
        </Text>
      </View>

      {/* 2. File Selection Stage */}
      {!selectedFile ? (
        <View style={styles.uploadSection}>
          {/* Primary Upload Area */}
          <TouchableOpacity
            style={[
              styles.primaryUploadArea,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderRadius: radii.lg
              }
            ]}
            onPress={handlePickDocument}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View style={[styles.uploadIconBadge, { backgroundColor: theme.primaryBg }]}>
              <Icon name="upload" size={24} color={theme.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.uploadLabel, { color: theme.textPrimary }]}>Upload a PDF</Text>
            <Text style={[styles.uploadSupporting, { color: theme.textMuted }]}>
              Supports PDF and TXT files up to 15MB
            </Text>

            <View style={[styles.browseBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.sm }]}>
              <Text style={[styles.browseBtnText, { color: theme.textPrimary }]}>Browse files</Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Photo & Gallery Actions */}
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderRadius: radii.md
                }
              ]}
              onPress={handleTakePhoto}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Icon name="camera" size={18} color={theme.textPrimary} />
              <Text style={[styles.secondaryActionLabel, { color: theme.textPrimary }]}>Take a photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderRadius: radii.md
                }
              ]}
              onPress={handlePickImage}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Icon name="image" size={18} color={theme.textPrimary} />
              <Text style={[styles.secondaryActionLabel, { color: theme.textPrimary }]}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Selected Document Card with Filename, Type, Size, Actions & Analyze Button */
        <View
          style={[
            styles.selectedFileCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.primaryBorder,
              borderRadius: radii.lg
            }
          ]}
        >
          <View style={styles.selectedFileTop}>
            <View style={[styles.selectedIconBox, { backgroundColor: theme.primaryBg }]}>
              <Icon name="document" size={22} color={theme.primary} strokeWidth={2} />
            </View>
            <View style={styles.selectedDetails}>
              <Text style={[styles.selectedFileName, { color: theme.textPrimary }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={[styles.selectedFileMeta, { color: theme.textMuted }]}>
                {selectedFile.type}
                {formatFileSize(selectedFile.size) ? ` • ${formatFileSize(selectedFile.size)}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.sm }]}
              onPress={handleRemoveFile}
              disabled={loading}
            >
              <Icon name="close" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Replace Option */}
          <View style={styles.replaceRow}>
            <TouchableOpacity onPress={handlePickDocument} disabled={loading}>
              <Text style={[styles.replaceText, { color: theme.primary }]}>Change document</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <Button
            title="Analyze document"
            onPress={handleAnalyzeDocument}
            loading={loading}
            size="lg"
            style={{ marginTop: 14 }}
          />
        </View>
      )}

      {/* 3. Progress State with meaningful operations */}
      {loading && (
        <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}>
          <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>Processing Document</Text>
            <Text style={[styles.progressSubtitle, { color: theme.textMuted }]}>{progressStep}</Text>
          </View>
        </View>
      )}

      {/* 4. Error State */}
      {errorMessage ? (
        <View style={[styles.errorCard, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder, borderRadius: radii.md }]}>
          <Icon name="alert" size={18} color={theme.danger} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.errorTitle, { color: theme.dangerText }]}>Analysis Issue</Text>
            <Text style={[styles.errorSubtitle, { color: theme.dangerText }]}>{errorMessage}</Text>
          </View>
        </View>
      ) : null}

      {/* 5. What the Scanner Evaluates (Concise, credible breakdown) */}
      <View style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.lg }]}>
        <Text style={[styles.guideTitle, { color: theme.textPrimary }]}>Document Analysis Scope</Text>
        <Text style={[styles.guideSubtitle, { color: theme.textMuted }]}>
          Our RAG-assisted model analyzes agreements against standard Indian contract frameworks:
        </Text>

        {[
          { label: "Document classification", desc: "Tenancy lease, employment agreement, NDA, or legal notice." },
          { label: "Security deposits & deductions", desc: "Refund timelines, forfeiture terms, and maintenance deductions." },
          { label: "Lock-in & termination penalties", desc: "Unilateral exit fees, mandatory lock-ins, and notice fairness." },
          { label: "Jurisdiction & dispute clauses", desc: "Arbitration rules, governing courts, and statutory compliance." }
        ].map((item, idx) => (
          <View key={idx} style={styles.guideRow}>
            <View style={[styles.checkDot, { backgroundColor: theme.successBg }]}>
              <Icon name="check" size={10} color={theme.success} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guideItemLabel, { color: theme.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.guideItemDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 6. Legal Advice Disclaimer */}
      <View style={[styles.disclaimerBox, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.md }]}>
        <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
          Nyaya AI provides legal information and automated clause analysis, not a substitute for professional legal advice or advocate representation.
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
    paddingBottom: 36
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
  uploadSection: {
    marginBottom: 20
  },
  primaryUploadArea: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 12
  },
  uploadIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  uploadLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  uploadSupporting: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center"
  },
  browseBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  browseBtnText: {
    fontSize: 12,
    fontWeight: "600"
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 10
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 8
  },
  secondaryActionLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  selectedFileCard: {
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20
  },
  selectedFileTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  selectedIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  selectedDetails: {
    flex: 1
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: "700"
  },
  selectedFileMeta: {
    fontSize: 11,
    marginTop: 2
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  replaceRow: {
    marginTop: 10,
    alignItems: "flex-end"
  },
  replaceText: {
    fontSize: 12,
    fontWeight: "600"
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    marginBottom: 16
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "600"
  },
  progressSubtitle: {
    fontSize: 11,
    marginTop: 1
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2
  },
  errorSubtitle: {
    fontSize: 11,
    lineHeight: 16
  },
  guideCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4
  },
  guideSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  guideItemLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  guideItemDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1
  },
  disclaimerBox: {
    padding: 12
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  }
});
