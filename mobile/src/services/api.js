import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Automatically choose suitable default based on platform:
// - Web browser: http://localhost:8000/api
// - Physical device / Mobile: Current host Wi-Fi LAN IP (hotspot/router)
// UPDATE this if your IP changes: run `ipconfig` and look for Wi-Fi IPv4
const CURRENT_LAN_IP = "172.20.10.2";
const DEFAULT_URL = Platform.OS === "web" 
  ? "http://localhost:8000/api" 
  : `http://${CURRENT_LAN_IP}:8000/api`;

let BASE_URL = DEFAULT_URL;
let AUTH_TOKEN = null;
let CACHED_USER = null;
const AUTH_LISTENERS = new Set();

// Initialize saved URL and Token on startup with migration of stale IP addresses
AsyncStorage.getItem("@nyaya_server_url").then((saved) => {
  if (saved) {
    // Migrate any stale old IP addresses to the current active LAN IP
    const staleIPs = ["172.20.10.4", "10.248.27.215"];
    const isStale = staleIPs.some((ip) => saved.includes(ip));
    if (isStale) {
      let updated = saved;
      staleIPs.forEach((ip) => {
        updated = updated.replace(new RegExp(ip.replace(/\./g, "\\."), "g"), CURRENT_LAN_IP);
      });
      BASE_URL = Platform.OS === "web" ? "http://localhost:8000/api" : updated;
      AsyncStorage.setItem("@nyaya_server_url", BASE_URL).catch(() => {});
    } else if (Platform.OS === "web") {
      BASE_URL = "http://localhost:8000/api";
    } else {
      BASE_URL = saved;
    }
  }
}).catch(() => {});

// Restore token and cached user profile on app startup
AsyncStorage.getItem("@nyaya_auth_token").then((token) => {
  if (token) {
    AUTH_TOKEN = token;
  }
}).catch(() => {});

AsyncStorage.getItem("@nyaya_user_profile").then((u) => {
  if (u) {
    try {
      CACHED_USER = JSON.parse(u);
    } catch {}
  }
}).catch(() => {});

const notifyAuth = (user) => {
  CACHED_USER = user;
  AUTH_LISTENERS.forEach((cb) => {
    try { cb(user); } catch {}
  });
};

export const ApiConfig = {
  getBaseUrl: () => BASE_URL.replace("/api", ""),
  getApiUrl: () => BASE_URL,
  setBaseUrl: (url) => {
    let clean = url.trim().replace(/\/$/, "");
    if (!clean.endsWith("/api")) {
      clean = `${clean}/api`;
    }
    BASE_URL = clean;
    AsyncStorage.setItem("@nyaya_server_url", clean).catch(() => {});
  },
  setAuthToken: (token) => {
    AUTH_TOKEN = token;
    if (token) {
      AsyncStorage.setItem("@nyaya_auth_token", token).catch(() => {});
    } else {
      AsyncStorage.removeItem("@nyaya_auth_token").catch(() => {});
    }
  },
  getAuthToken: () => AUTH_TOKEN
};

const getHeaders = (isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
};

// Fetch wrapper with timeout to prevent hanging on slow mobile networks
const fetchWithTimeout = (url, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

export const apiService = {
  // Authentication Listeners
  onAuthChange(cb) {
    AUTH_LISTENERS.add(cb);
    return () => AUTH_LISTENERS.delete(cb);
  },

  getCachedUser() {
    return CACHED_USER;
  },

  isLoggedIn() {
    return !!AUTH_TOKEN;
  },

  // 1. Health Check (8s timeout so it fails fast and doesn't block mobile UI)
  async checkHealth() {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/health`, {}, 8000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      return { api: "offline", error: e.message };
    }
  },

  // 2. Authentication
  async register(email, password, fullName = "Citizen", language = "en") {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName, preferred_language: language })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed");
    
    AUTH_TOKEN = data.access_token;
    await AsyncStorage.setItem("@nyaya_auth_token", data.access_token).catch(() => {});
    await AsyncStorage.setItem("@nyaya_user_profile", JSON.stringify(data)).catch(() => {});
    notifyAuth(data);
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    
    AUTH_TOKEN = data.access_token;
    await AsyncStorage.setItem("@nyaya_auth_token", data.access_token).catch(() => {});
    await AsyncStorage.setItem("@nyaya_user_profile", JSON.stringify(data)).catch(() => {});
    notifyAuth(data);
    return data;
  },

  async logout() {
    AUTH_TOKEN = null;
    await AsyncStorage.removeItem("@nyaya_auth_token").catch(() => {});
    await AsyncStorage.removeItem("@nyaya_user_profile").catch(() => {});
    notifyAuth(null);
  },

  async getMe() {
    // Check if token exists
    if (!AUTH_TOKEN) {
      const token = await AsyncStorage.getItem("@nyaya_auth_token").catch(() => null);
      if (token) AUTH_TOKEN = token;
      else throw new Error("Not authenticated");
    }

    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        await this.logout();
      }
      throw new Error("Not authenticated");
    }
    const data = await res.json();
    await AsyncStorage.setItem("@nyaya_user_profile", JSON.stringify(data)).catch(() => {});
    CACHED_USER = data;
    return data;
  },

  // 3. AI Legal Chat (Grounded RAG through FastAPI -> Ollama Qwen 2.5)
  // 90s timeout — Qwen 2.5 on CPU can take up to 60s for complex queries
  async sendChatMessage(message, conversationId = null, language = "en", useRag = true, documentContext = null) {
    const res = await fetchWithTimeout(`${BASE_URL}/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        language,
        use_rag: useRag,
        document_context: documentContext
      })
    }, 90000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Chat request failed");
    return data;
  },

  // 3b. AI Legal Chat Real-Time SSE Stream (Token-by-Token)
  streamChatMessage(
    message,
    conversationId = null,
    language = "en",
    useRag = true,
    documentContext = null,
    { onMeta, onSources, onToken, onDone, onError } = {}
  ) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/chat/stream`);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (AUTH_TOKEN) {
      xhr.setRequestHeader("Authorization", `Bearer ${AUTH_TOKEN}`);
    }

    let seenIndex = 0;
    let buffer = "";

    const processBuffer = () => {
      const text = xhr.responseText || "";
      if (text.length <= seenIndex) return;
      const newChunk = text.slice(seenIndex);
      seenIndex = text.length;
      buffer += newChunk;

      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        const lines = trimmed.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.slice(5).trim();
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "meta") onMeta?.(event);
              else if (event.type === "sources") onSources?.(event.sources);
              else if (event.type === "token") onToken?.(event.token);
              else if (event.type === "done") onDone?.(event);
              else if (event.type === "error") onError?.(new Error(event.error));
            } catch (err) {}
          }
        }
      }
    };

    xhr.onprogress = () => {
      processBuffer();
    };

    xhr.onload = () => {
      processBuffer();
    };

    xhr.onerror = () => {
      onError?.(new Error("Network connection error during stream"));
    };

    xhr.ontimeout = () => {
      onError?.(new Error("Stream request timed out"));
    };

    xhr.timeout = 120000;

    xhr.send(JSON.stringify({
      message,
      conversation_id: conversationId,
      language,
      use_rag: useRag,
      document_context: documentContext
    }));

    return () => {
      try {
        xhr.abort();
      } catch {}
    };
  },

  async getConversations() {
    const res = await fetch(`${BASE_URL}/chat/conversations`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async getConversationMessages(conversationId) {
    const res = await fetch(`${BASE_URL}/chat/${conversationId}/messages`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // 4. Auto Smart Scanner (Document Upload & Instant Pydantic Analysis)
  async scanDocument(fileBlobOrFormData, language = "en") {
    // Accepts FormData containing file
    const headers = {};
    if (AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }
    
    const res = await fetch(`${BASE_URL}/scanner/upload`, {
      method: "POST",
      headers,
      body: fileBlobOrFormData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Document analysis failed");
    return data;
  },

  // 5. Document History
  async getDocumentsHistory() {
    const res = await fetch(`${BASE_URL}/documents/history`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // 6. Interactive Legal Scenario Simulator
  async getScenarios() {
    const res = await fetch(`${BASE_URL}/scenarios`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async submitScenarioAnswer(scenarioId, selectedOptionIds) {
    const res = await fetch(`${BASE_URL}/scenarios/answer`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        scenario_id: scenarioId,
        selected_option_ids: selectedOptionIds
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Evaluation failed");
    return data;
  }
};
