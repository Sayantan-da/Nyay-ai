import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { apiService } from "../services/api";
import Icon from "../components/Icon";
import Badge from "../components/Badge";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "bn", label: "বাংলা" }
];

const STARTER_QUESTIONS = [
  "What are my rights if my landlord refuses to refund my security deposit?",
  "How do I report a UPI payment scam within the golden hour?",
  "Can police refuse to file an FIR if the crime occurred in another area?",
  "What is the statutory notice period required under Indian tenancy law?"
];

export default function ChatScreen({ route, navigation }) {
  const { theme, radii, spacing } = useTheme();

  const [messages, setMessages] = useState([
    {
      id: "intro",
      sender: "assistant",
      content: "Namaste! I am Nyaya AI, your Indian legal literacy assistant.\n\nConsult me on tenancy leases, consumer disputes, cyber fraud, workplace compliance, or police procedures. What legal matter can I assist you with today?",
      sources: []
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [conversationId, setConversationId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  const loadingSecondsRef = useRef(0);

  // Check if an initialQuery was passed from HomeScreen
  useEffect(() => {
    if (route?.params?.initialQuery) {
      const q = route.params.initialQuery;
      setInputText(q);
      // Auto-trigger send if desired or leave in composer
      handleSendWithQuery(q);
    }
  }, [route?.params?.initialQuery]);

  // Loading timer for truthful progress phases
  useEffect(() => {
    if (loading) {
      loadingSecondsRef.current = 0;
      setLoadingSeconds(0);
      timerRef.current = setInterval(() => {
        loadingSecondsRef.current += 1;
        setLoadingSeconds(loadingSecondsRef.current);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const handleSendWithQuery = (queryText) => {
    const textToSend = queryText.trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      content: textToSend
    };

    const aiMsgId = (Date.now() + 1).toString();
    const placeholderAiMsg = {
      id: aiMsgId,
      sender: "assistant",
      content: "",
      sources: [],
      disclaimer: "",
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMsg, placeholderAiMsg]);
    setInputText("");
    setLoading(true);

    let accumulatedContent = "";

    apiService.streamChatMessage(
      textToSend,
      conversationId,
      language,
      true,
      null,
      {
        onMeta: (meta) => {
          if (meta.conversation_id) {
            setConversationId(meta.conversation_id);
          }
        },
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, sources: sources || [] } : m))
          );
        },
        onToken: (token) => {
          accumulatedContent += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: accumulatedContent } : m
            )
          );
        },
        onDone: (doneEvent) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: accumulatedContent || m.content,
                    sources: doneEvent.sources || m.sources,
                    disclaimer: doneEvent.disclaimer || "",
                    isStreaming: false
                  }
                : m
            )
          );
          setLoading(false);
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: accumulatedContent
                      ? `${accumulatedContent}\n\n⚠️ [Response stream interrupted: ${err.message}]`
                      : `⚠️ Server connection error: ${err.message}\n\nPlease check Settings → Connection Settings to verify the FastAPI and Ollama backend status.`,
                    isError: true,
                    isStreaming: false
                  }
                : m
            )
          );
          setLoading(false);
        }
      }
    );
  };

  const handleSend = () => {
    handleSendWithQuery(inputText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "intro",
        sender: "assistant",
        content: "Chat reset. Ask a new legal inquiry in English, Hindi, or Bengali.",
        sources: []
      }
    ]);
    setConversationId(null);
  };

  const handleCopyMessage = async (msgId, text) => {
    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        await Share.share({ message: text });
      }
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const getLoadingPhaseText = (secs) => {
    if (secs < 3) return "Retrieving statutory knowledge base...";
    if (secs < 12) return `Grounding legal context... (${secs}s)`;
    if (secs < 30) return `Generating verified response with Qwen 2.5... (${secs}s)`;
    return `Finalizing detailed statutory guidance... (${secs}s)`;
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === "user";

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
        {!isUser && (
          <View style={styles.assistantMetaRow}>
            <View style={styles.assistantBadge}>
              <Icon name="rights" size={13} color={theme.primary} />
              <Text style={[styles.assistantName, { color: theme.primary }]}>Nyaya AI</Text>
            </View>
            {item.sources && item.sources.length > 0 && (
              <Badge label={`${item.sources.length} sources`} variant="primary" size="sm" />
            )}
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]
              : [styles.assistantBubble, { backgroundColor: theme.surface, borderColor: item.isError ? theme.dangerBorder : theme.border }],
            { borderRadius: radii.md }
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? theme.textPrimary : item.isError ? theme.dangerText : theme.textPrimary }
            ]}
          >
            {item.content || (item.isStreaming ? "Thinking..." : "")}
            {item.isStreaming && item.content ? " ▌" : ""}
          </Text>

          {/* Sources and Retrieved Legal References */}
          {!isUser && item.sources && item.sources.length > 0 && (
            <View style={[styles.sourcesContainer, { borderTopColor: theme.divider }]}>
              <Text style={[styles.sourcesHeader, { color: theme.textMuted }]}>VERIFIED STATUTORY GROUNDS:</Text>
              {item.sources.map((s, idx) => (
                <View key={idx} style={styles.sourceRow}>
                  <Text style={[styles.sourceBullet, { color: theme.primary }]}>•</Text>
                  <Text style={[styles.sourceTitle, { color: theme.textSecondary }]}>
                    {s.title} {s.category ? `(${s.category})` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Row for Assistant Bubble (Copy & Disclaimer) */}
          {!isUser && !item.isError && !item.isStreaming && (
            <View style={styles.bubbleActionRow}>
              <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
                {item.disclaimer || "Statutory guidance grounded in Indian legal frameworks."}
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.sm }]}
                onPress={() => handleCopyMessage(item.id, item.content)}
              >
                <Icon name="copy" size={11} color={theme.textSecondary} />
                <Text style={[styles.copyText, { color: theme.textSecondary }]}>
                  {copiedId === item.id ? "Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Header Controls: Languages & New Chat */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.borderSubtle }]}>
        <View style={styles.langPillsRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[
                styles.langPill,
                language === l.code
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                { borderRadius: radii.full }
              ]}
              onPress={() => setLanguage(l.code)}
            >
              <Text
                style={[
                  styles.langPillText,
                  { color: language === l.code ? "#FFFFFF" : theme.textSecondary, fontWeight: language === l.code ? "700" : "500" }
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radii.sm }]}
          onPress={handleClearChat}
        >
          <Text style={[styles.newChatText, { color: theme.textPrimary }]}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          messages.length === 1 ? (
            <View style={styles.starterContainer}>
              <Text style={[styles.starterHeader, { color: theme.textMuted }]}>SUGGESTED LEGAL QUESTIONS:</Text>
              {STARTER_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.starterCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}
                  onPress={() => handleSendWithQuery(q)}
                >
                  <Text style={[styles.starterText, { color: theme.textPrimary }]}>{q}</Text>
                  <Icon name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {/* Loading Progress State */}
      {loading && !messages.some((m) => m.isStreaming && m.content) && (
        <View style={styles.loadingRow}>
          <View style={[styles.loadingBox, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}>
            <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>Nyaya AI Reasoning</Text>
              <Text style={[styles.loadingSubtitle, { color: theme.textMuted }]}>
                {getLoadingPhaseText(loadingSeconds)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Persistent Message Composer */}
      <View style={[styles.composerContainer, { backgroundColor: theme.surface, borderTopColor: theme.borderSubtle }]}>
        <TextInput
          style={[styles.composerInput, { backgroundColor: theme.surfaceSecondary, borderColor: theme.inputBorder, color: theme.textPrimary, borderRadius: radii.md }]}
          placeholder="Ask a legal inquiry under Indian law..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: !inputText.trim() || loading ? theme.border : theme.primary, borderRadius: radii.md }
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          <Icon name="chevron-right" size={16} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  langPillsRow: {
    flexDirection: "row",
    gap: 6
  },
  langPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1
  },
  langPillText: {
    fontSize: 11
  },
  newChatBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1
  },
  newChatText: {
    fontSize: 11,
    fontWeight: "600"
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20
  },
  bubbleWrapper: {
    marginBottom: 16,
    maxWidth: "92%"
  },
  userWrapper: {
    alignSelf: "flex-end"
  },
  assistantWrapper: {
    alignSelf: "flex-start"
  },
  assistantMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  assistantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  assistantName: {
    fontSize: 11,
    fontWeight: "700"
  },
  bubble: {
    padding: 14,
    borderWidth: 1
  },
  userBubble: {
    borderBottomRightRadius: 2
  },
  assistantBubble: {
    borderBottomLeftRadius: 2
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20
  },
  sourcesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1
  },
  sourcesHeader: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2
  },
  sourceBullet: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 16
  },
  sourceTitle: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16
  },
  bubbleActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6
  },
  disclaimerText: {
    fontSize: 9,
    fontStyle: "italic",
    flex: 1,
    marginRight: 8
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 7,
    gap: 4
  },
  copyText: {
    fontSize: 10,
    fontWeight: "600"
  },
  starterContainer: {
    marginTop: 16
  },
  starterHeader: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  starterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  starterText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    marginRight: 10
  },
  loadingRow: {
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1
  },
  loadingTitle: {
    fontSize: 12,
    fontWeight: "600"
  },
  loadingSubtitle: {
    fontSize: 11,
    marginTop: 1
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    gap: 8
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 100
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  }
});
