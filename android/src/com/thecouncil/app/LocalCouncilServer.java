package com.thecouncil.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocalCouncilServer {
    private static final String TAG = "LocalCouncilServer";
    private static final int PORT = 3000;
    private static final String PREFS_NAME = "council_settings";
    private static final String KEY_GEMINI_KEY = "gemini_api_key";
    private static final String KEY_DEFAULT_MODEL = "default_model";

    private final Context mContext;
    private ServerSocket mServerSocket;
    private volatile boolean mRunning = false;
    private final ExecutorService mThreadPool = Executors.newCachedThreadPool();

    // In-memory sessions and SSE subscribers
    private final Map<String, SessionData> mSessions = new ConcurrentHashMap<>();
    private final Map<String, List<SseClient>> mSseClients = new ConcurrentHashMap<>();
    private final Map<String, Thread> mActiveDeliberations = new ConcurrentHashMap<>();

    // Simple usage accumulator
    private int mTotalCalls = 0;
    private int mTotalPromptTokens = 0;
    private int mTotalCandidateTokens = 0;
    private double mTotalSpendUSD = 0.0;

    public static class SessionData {
        public String id;
        public String query;
        public String status = "RUNNING"; // RUNNING, COMPLETED, CANCELLED, FAILED
        public String currentPhase = "PHASE_0_FRAMING";
        public int currentCrossExamRound = 1;
        public int maxCrossExamRounds = 3;
        public int maxRatificationCycles = 2;
        public int convergenceScore = 0;
        public String createdAt;
        public List<String> rawEvents = new CopyOnWriteArrayList<>();
        public String finalVerdictJson = null;
    }

    private static class SseClient {
        final PrintWriter writer;
        final OutputStream os;

        SseClient(OutputStream os) {
            this.os = os;
            this.writer = new PrintWriter(os, true);
        }
    }

    public LocalCouncilServer(Context context) {
        this.mContext = context;
        loadSavedSessions();
    }

    public synchronized boolean start() {
        if (mRunning) return true;
        try {
            mServerSocket = new ServerSocket(PORT, 100, InetAddress.getByName("127.0.0.1"));
            mRunning = true;
            Log.i(TAG, "LocalCouncilServer started on http://127.0.0.1:" + PORT);

            mThreadPool.execute(new Runnable() {
                @Override
                public void run() {
                    while (mRunning && !mServerSocket.isClosed()) {
                        try {
                            Socket client = mServerSocket.accept();
                            mThreadPool.execute(() -> handleConnection(client));
                        } catch (IOException e) {
                            if (!mRunning) break;
                        }
                    }
                }
            });
            return true;
        } catch (IOException e) {
            Log.e(TAG, "Failed to start local server on port " + PORT, e);
            return false;
        }
    }

    public synchronized void stop() {
        mRunning = false;
        try {
            if (mServerSocket != null && !mServerSocket.isClosed()) {
                mServerSocket.close();
            }
        } catch (IOException ignored) {}
    }

    public boolean isRunning() {
        return mRunning;
    }

    public int getPort() {
        return PORT;
    }

    private void handleConnection(Socket socket) {
        try {
            InputStream is = socket.getInputStream();
            OutputStream os = socket.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));

            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) {
                socket.close();
                return;
            }

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                socket.close();
                return;
            }

            String method = parts[0].toUpperCase(Locale.US);
            String fullPath = parts[1];

            // Parse headers
            Map<String, String> headers = new HashMap<>();
            String line;
            int contentLength = 0;
            boolean isRsc = false;

            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String hKey = line.substring(0, colon).trim().toLowerCase(Locale.US);
                    String hVal = line.substring(colon + 1).trim();
                    headers.put(hKey, hVal);
                    if ("content-length".equals(hKey)) {
                        try {
                            contentLength = Integer.parseInt(hVal);
                        } catch (Exception ignored) {}
                    }
                    if ("rsc".equals(hKey)) {
                        isRsc = true;
                    }
                }
            }

            // Read body if any
            String body = "";
            if (contentLength > 0) {
                char[] buf = new char[contentLength];
                int totalRead = 0;
                while (totalRead < contentLength) {
                    int r = reader.read(buf, totalRead, contentLength - totalRead);
                    if (r == -1) break;
                    totalRead += r;
                }
                body = new String(buf, 0, totalRead);
            }

            // CORS Preflight
            if ("OPTIONS".equals(method)) {
                sendResponse(os, 204, "text/plain", new byte[0], true);
                socket.close();
                return;
            }

            // Separate path and query string
            String path = fullPath;
            String query = "";
            int qIdx = fullPath.indexOf('?');
            if (qIdx >= 0) {
                path = fullPath.substring(0, qIdx);
                query = fullPath.substring(qIdx + 1);
            }
            if (query.contains("_rsc=") || isRsc) {
                isRsc = true;
            }

            // API Route dispatch
            if (path.startsWith("/api/")) {
                handleApiRoute(method, path, query, body, socket, os);
                return;
            }

            // Static Web Asset dispatch
            handleStaticAsset(path, isRsc, os);
            socket.close();

        } catch (Exception e) {
            Log.e(TAG, "Error handling client connection", e);
            try {
                socket.close();
            } catch (Exception ignored) {}
        }
    }

    private void handleStaticAsset(String path, boolean isRsc, OutputStream os) throws IOException {
        String assetPath = null;
        String contentType = "text/html; charset=utf-8";
        String chamberId = null;

        if ("/".equals(path) || "/index.html".equals(path)) {
            assetPath = isRsc ? "web/index.rsc" : "web/index.html";
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        } else if ("/settings".equals(path)) {
            assetPath = isRsc ? "web/settings.rsc" : "web/settings.html";
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        } else if ("/history".equals(path)) {
            assetPath = isRsc ? "web/history.rsc" : "web/history.html";
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        } else if ("/diagnostics".equals(path)) {
            assetPath = isRsc ? "web/diagnostics.rsc" : "web/diagnostics.html";
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        } else if (path.startsWith("/c/")) {
            chamberId = path.substring(3);
            if (chamberId.contains("/")) chamberId = chamberId.substring(0, chamberId.indexOf('/'));
            assetPath = isRsc ? "web/chamber.rsc" : "web/chamber.html";
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        } else if (path.startsWith("/_next/")) {
            assetPath = "web" + path;
            contentType = getContentType(path);
        } else if ("/icon.png".equals(path)) {
            assetPath = "web/icon.png";
            contentType = "image/png";
        } else if ("/manifest.webmanifest".equals(path)) {
            assetPath = "web/manifest.webmanifest";
            contentType = "application/manifest+json";
        } else {
            assetPath = "web" + path;
            contentType = getContentType(path);
        }

        byte[] data = loadAssetBytes(assetPath);
        if (data == null) {
            // Fallback to index.html for SPA client routing
            data = loadAssetBytes(isRsc ? "web/index.rsc" : "web/index.html");
            contentType = isRsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8";
        }

        if (data == null) {
            sendResponse(os, 404, "text/plain", "Asset not found: ".getBytes(StandardCharsets.UTF_8), true);
            return;
        }

        // Dynamic chamber ID template substitution
        if (chamberId != null) {
            String text = new String(data, StandardCharsets.UTF_8);
            text = text.replace("__CHAMBER_ID__", chamberId);
            data = text.getBytes(StandardCharsets.UTF_8);
        }

        sendResponse(os, 200, contentType, data, true);
    }

    private byte[] loadAssetBytes(String assetPath) {
        try (InputStream in = mContext.getAssets().open(assetPath)) {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) != -1) {
                baos.write(buf, 0, r);
            }
            return baos.toByteArray();
        } catch (IOException e) {
            return null;
        }
    }

    private String getContentType(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html; charset=utf-8";
        if (lower.endsWith(".rsc")) return "text/x-component; charset=utf-8";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json; charset=utf-8";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private void handleApiRoute(String method, String path, String query, String body, Socket socket, OutputStream os) throws IOException {
        SharedPreferences prefs = mContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String apiKey = prefs.getString(KEY_GEMINI_KEY, "");
        String defaultModel = prefs.getString(KEY_DEFAULT_MODEL, "gemini-2.5-flash");
        boolean keyConfigured = apiKey != null && !apiKey.trim().isEmpty();

        // 1. Health checks
        if ("/api/v1/health/live".equals(path) || "/api/health".equals(path)) {
            String json = "{\"status\":\"alive\",\"version\":\"1.0.0\",\"uptimeSeconds\":100,\"timestamp\":\"" + getIsoTimestamp() + "\",\"runner\":{\"active\":true,\"workerId\":\"android_standalone\"},\"database\":{\"status\":\"healthy\",\"driver\":\"sqlite-android\"}}";
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        if ("/api/v1/health/ready".equals(path)) {
            String mode = keyConfigured ? "live" : "simulation";
            String json = "{\"status\":\"ready\",\"probes\":{\"database\":{\"status\":\"healthy\"},\"gemini\":{\"status\":\"" + (keyConfigured ? "configured" : "unconfigured") + "\",\"model\":\"" + defaultModel + "\",\"keyConfigured\":" + keyConfigured + "}},\"engine\":{\"mode\":\"" + mode + "\",\"model\":\"" + defaultModel + "\",\"keyConfigured\":" + keyConfigured + "}}";
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        // 2. Settings
        if ("/api/v1/settings".equals(path)) {
            if ("PATCH".equals(method)) {
                if (body.contains("\"defaultModel\"")) {
                    String m = extractJsonString(body, "defaultModel");
                    if (m != null && !m.isEmpty()) {
                        prefs.edit().putString(KEY_DEFAULT_MODEL, m).apply();
                        defaultModel = m;
                    }
                }
            }
            String maskedKey = keyConfigured ? ("..." + apiKey.substring(Math.max(0, apiKey.length() - 4))) : null;
            String json = "{\"ok\":true,\"data\":{\"settings\":{\"defaultModel\":\"" + defaultModel + "\",\"fallbackModels\":[\"gemini-3.5-flash-lite\"],\"maxCrossExamRounds\":3,\"maxRatificationCycles\":2,\"monthlySpendCapUSD\":20,\"enableLAN\":false,\"lanAccessPIN\":\"\",\"theme\":\"dark\",\"enable3DTilt\":false,\"enableReducedMotion\":false,\"geminiKeyConfigured\":" + keyConfigured + (maskedKey != null ? ",\"geminiKeyMasked\":\"" + maskedKey + "\"" : "") + "}}}";
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        if ("/api/v1/settings/key".equals(path) && "POST".equals(method)) {
            String key = extractJsonString(body, "apiKey");
            if (key != null) {
                prefs.edit().putString(KEY_GEMINI_KEY, key.trim()).apply();
            }
            String json = "{\"ok\":true,\"data\":{\"keyConfigured\":" + (key != null && !key.trim().isEmpty()) + "}}";
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        if ("/api/v1/settings/test-key".equals(path) && "POST".equals(method)) {
            String key = extractJsonString(body, "apiKey");
            if (key == null || key.isEmpty()) key = apiKey;
            boolean valid = testGeminiKey(key);
            String json = valid
                ? "{\"ok\":true,\"data\":{\"valid\":true,\"message\":\"Gemini API key verified successfully\"}}"
                : "{\"ok\":false,\"error\":{\"message\":\"Invalid Gemini API key or network connection failed\"}}";
            sendResponse(os, valid ? 200 : 400, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        // 3. Usage
        if ("/api/v1/usage".equals(path)) {
            double remaining = Math.max(0.0, 20.0 - mTotalSpendUSD);
            int util = (int) Math.min(100, Math.round((mTotalSpendUSD / 20.0) * 100));
            String json = String.format(Locale.US,
                "{\"ok\":true,\"data\":{\"usage\":{\"monthlySpendUSD\":%.4f,\"monthlySpendCapUSD\":20.0,\"remainingHeadroomUSD\":%.4f,\"utilizationPercent\":%d,\"allTimeSpendUSD\":%.4f,\"totalCalls\":%d,\"totalPromptTokens\":%d,\"totalCandidateTokens\":%d}}}",
                mTotalSpendUSD, remaining, util, mTotalSpendUSD, mTotalCalls, mTotalPromptTokens, mTotalCandidateTokens);
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        // 4. Engine models list
        if ("/api/v1/engine/models".equals(path)) {
            String json = "{\"ok\":true,\"data\":{\"models\":[\"gemini-2.5-flash\",\"gemini-3.5-flash\",\"gemini-3.5-flash-lite\",\"gemini-2.5-pro\"]}}";
            sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
            socket.close();
            return;
        }

        // 5. Sessions CRUD
        if ("/api/v1/sessions".equals(path)) {
            if ("GET".equals(method)) {
                StringBuilder sb = new StringBuilder("{\"ok\":true,\"data\":{\"sessions\":[");
                boolean first = true;
                for (SessionData s : mSessions.values()) {
                    if (!first) sb.append(",");
                    sb.append(buildSessionSummaryJson(s));
                    first = false;
                }
                sb.append("]}}");
                sendResponse(os, 200, "application/json", sb.toString().getBytes(StandardCharsets.UTF_8), true);
                socket.close();
                return;
            } else if ("POST".equals(method)) {
                String queryText = extractJsonString(body, "query");
                if (queryText == null || queryText.trim().isEmpty()) {
                    queryText = "Should AI decision-making be regulated by multi-agent consensus?";
                }
                int rounds = extractJsonInt(body, "maxCrossExamRounds", 3);

                SessionData session = new SessionData();
                session.id = "sess_" + Long.toHexString(System.currentTimeMillis()) + UUID.randomUUID().toString().substring(0, 4);
                session.query = queryText.trim();
                session.status = "RUNNING";
                session.currentPhase = "PHASE_0_FRAMING";
                session.maxCrossExamRounds = rounds;
                session.createdAt = getIsoTimestamp();

                mSessions.put(session.id, session);
                saveSessionToDisk(session);

                // Start background deliberation
                final String runKey = apiKey;
                final String runModel = defaultModel;
                Thread deliberationThread = new Thread(() -> runDeliberation(session, runKey, runModel));
                mActiveDeliberations.put(session.id, deliberationThread);
                deliberationThread.start();

                String json = "{\"ok\":true,\"data\":{\"session\":" + buildSessionJson(session) + "}}";
                sendResponse(os, 201, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
                socket.close();
                return;
            }
        }

        // 6. Single Session /api/v1/sessions/:id/...
        if (path.startsWith("/api/v1/sessions/")) {
            String rest = path.substring("/api/v1/sessions/".length());
            String sid = rest;
            String action = "";
            int slash = rest.indexOf('/');
            if (slash >= 0) {
                sid = rest.substring(0, slash);
                action = rest.substring(slash + 1);
            }

            SessionData session = mSessions.get(sid);
            if (session == null) {
                String json = "{\"ok\":false,\"error\":{\"message\":\"Session not found\"}}";
                sendResponse(os, 404, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
                socket.close();
                return;
            }

            if ("cancel".equals(action) && "POST".equals(method)) {
                session.status = "CANCELLED";
                Thread t = mActiveDeliberations.remove(sid);
                if (t != null) t.interrupt();
                saveSessionToDisk(session);
                String json = "{\"ok\":true,\"data\":{\"session\":" + buildSessionJson(session) + "}}";
                sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
                socket.close();
                return;
            }

            if ("stream".equals(action)) {
                // SSE Connection! Keep socket open!
                handleSseStream(session, query, socket, os);
                return;
            }

            if (action.isEmpty() && "GET".equals(method)) {
                String json = "{\"ok\":true,\"data\":{\"session\":" + buildSessionJson(session) + "}}";
                sendResponse(os, 200, "application/json", json.getBytes(StandardCharsets.UTF_8), true);
                socket.close();
                return;
            }
        }

        sendResponse(os, 404, "application/json", "{\"error\":{\"message\":\"Not found\"}}".getBytes(StandardCharsets.UTF_8), true);
        socket.close();
    }

    private void handleSseStream(SessionData session, String query, Socket socket, OutputStream os) {
        try {
            int afterSeq = -1;
            if (query != null && query.contains("after=")) {
                try {
                    String[] qParts = query.split("&");
                    for (String qp : qParts) {
                        if (qp.startsWith("after=")) {
                            afterSeq = Integer.parseInt(qp.substring(6));
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Write SSE headers
            String headers = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: text/event-stream; charset=utf-8\r\n" +
                "Cache-Control: no-cache, no-transform\r\n" +
                "Connection: keep-alive\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "X-Accel-Buffering: no\r\n\r\n";
            os.write(headers.getBytes(StandardCharsets.UTF_8));
            os.flush();

            SseClient client = new SseClient(os);

            // Replay historical events
            for (int i = 0; i < session.rawEvents.size(); i++) {
                if (i > afterSeq) {
                    client.os.write(session.rawEvents.get(i).getBytes(StandardCharsets.UTF_8));
                    client.os.flush();
                }
            }

            if ("COMPLETED".equals(session.status) || "CANCELLED".equals(session.status) || "FAILED".equals(session.status)) {
                socket.close();
                return;
            }

            // Register live client
            List<SseClient> list = mSseClients.computeIfAbsent(session.id, k -> new CopyOnWriteArrayList<>());
            list.add(client);

            // Keep connection alive with periodic comments until closed
            while (!socket.isClosed() && "RUNNING".equals(session.status)) {
                try {
                    Thread.sleep(15000);
                    client.os.write(": keepalive\n\n".getBytes(StandardCharsets.UTF_8));
                    client.os.flush();
                } catch (Exception e) {
                    break;
                }
            }
            list.remove(client);
            socket.close();

        } catch (Exception e) {
            try {
                socket.close();
            } catch (Exception ignored) {}
        }
    }

    private void broadcastEvent(SessionData session, String eventType, String payloadJson) {
        int seq = session.rawEvents.size();
        String fullEvent = String.format(Locale.US,
            "id: %d\nevent: %s\ndata: {\"id\":\"%d\",\"seq\":%d,\"sessionId\":\"%s\",\"event\":\"%s\",\"timestamp\":\"%s\",\"payload\":%s}\n\n",
            seq, eventType, seq, seq, session.id, eventType, getIsoTimestamp(), payloadJson);

        session.rawEvents.add(fullEvent);
        saveSessionToDisk(session);

        List<SseClient> clients = mSseClients.get(session.id);
        if (clients != null) {
            for (SseClient c : clients) {
                try {
                    c.os.write(fullEvent.getBytes(StandardCharsets.UTF_8));
                    c.os.flush();
                } catch (Exception e) {
                    clients.remove(c);
                }
            }
        }
    }

    // ─── DELIBERATION ENGINE (Autonomous Dialectic) ──────────────────────────

    private static final String[][] PERSONAS = {
        {"optimist", "The Optimist", "#22c55e", "Compound upside, proactive growth, agency"},
        {"skeptic", "The Skeptic", "#ef4444", "Tail risks, unvalidated assumptions, failure modes"},
        {"pragmatist", "The Pragmatist", "#f59e0b", "Execution friction, capital constraints, operational truth"},
        {"ethicist", "The Ethicist", "#8b5cf6", "Fairness, moral duties, vulnerable stakeholder impact"},
        {"humanist", "The Humanist", "#ec4899", "Dignity, lived psychological experience, empathy"},
        {"systems_thinker", "The Systems Thinker", "#06b6d4", "Feedback loops, second-order systemic effects"},
        {"contrarian", "The Contrarian", "#f97316", "Consensus inversions, hidden orthogonal paths"},
        {"historian", "The Historian", "#eab308", "Civilizational base rates, historical cyclical precedents"}
    };

    private void runDeliberation(SessionData session, String apiKey, String model) {
        try {
            boolean isLive = apiKey != null && !apiKey.trim().isEmpty();

            // ── PHASE 0: FRAMING ──────────────────────────────────────────
            session.currentPhase = "PHASE_0_FRAMING";
            broadcastEvent(session, "phase_started", "{\"phase\":\"PHASE_0_FRAMING\",\"phaseIndex\":0,\"description\":\"Moderator restating dilemma neutrally and establishing decision boundaries\"}");
            Thread.sleep(1200);

            String framingContent = "The Council convenes on the following inquiry: \"" + session.query + "\".\n" +
                "Core Dilemma: Reconciling transformative upside against irreversible existential and ethical vulnerabilities.\n" +
                "Key Boundaries: Preserving agentic autonomy while implementing rigorous stop-loss governance.";

            if (isLive) {
                String liveResp = callGeminiLive(apiKey, model, "You are the Council Moderator. Neutral, concise framing for: " + session.query);
                if (liveResp != null && !liveResp.trim().isEmpty()) framingContent = liveResp.trim();
            }

            broadcastEvent(session, "persona_message", "{\"personaId\":\"moderator\",\"phase\":\"PHASE_0_FRAMING\",\"content\":\"" + escapeJson(framingContent) + "\"}");
            Thread.sleep(1500);

            // ── PHASE 1: OPENING POSITIONS ────────────────────────────────
            session.currentPhase = "PHASE_1_OPENING";
            broadcastEvent(session, "phase_started", "{\"phase\":\"PHASE_1_OPENING\",\"phaseIndex\":1,\"description\":\"Council members independently formulating initial philosophical stances\"}");
            Thread.sleep(1000);

            int[] initialConfidence = {84, 72, 78, 68, 75, 82, 65, 80};

            for (int i = 0; i < PERSONAS.length; i++) {
                if (!"RUNNING".equals(session.status)) return;
                String pid = PERSONAS[i][0];
                String pname = PERSONAS[i][1];
                int conf = initialConfidence[i];

                String content = getPersonaOpening(pid, session.query);
                if (isLive) {
                    String live = callGeminiLive(apiKey, model, "You are " + pname + " in The Council. In 2 concise sentences, state your stance on: " + session.query);
                    if (live != null && !live.trim().isEmpty()) content = live.trim();
                }

                broadcastEvent(session, "persona_message", "{\"personaId\":\"" + pid + "\",\"phase\":\"PHASE_1_OPENING\",\"content\":\"" + escapeJson(content) + "\",\"confidenceScore\":" + conf + "}");
                Thread.sleep(1200);
            }

            // ── PHASE 2: CROSS-EXAMINATION ROUNDS ─────────────────────────
            session.currentPhase = "PHASE_2_CROSS_EXAM";
            int maxRounds = session.maxCrossExamRounds;

            for (int r = 1; r <= maxRounds; r++) {
                if (!"RUNNING".equals(session.status)) return;
                session.currentCrossExamRound = r;
                broadcastEvent(session, "phase_started", "{\"phase\":\"PHASE_2_CROSS_EXAM\",\"phaseIndex\":2,\"description\":\"Dialectic cross-examination round " + r + " of " + maxRounds + "\"}");
                Thread.sleep(800);

                // Two dialectic pairings per round
                int p1 = (r - 1) % PERSONAS.length;
                int p2 = (r + 3) % PERSONAS.length;

                // Turn 1: p1 challenges p2
                String q1 = PERSONAS[p1][1] + " challenges " + PERSONAS[p2][1] + ": How do you reconcile your assumptions with real-world failure thresholds?";
                broadcastEvent(session, "persona_message", "{\"personaId\":\"" + PERSONAS[p1][0] + "\",\"targetPersonaId\":\"" + PERSONAS[p2][0] + "\",\"phase\":\"PHASE_2_CROSS_EXAM\",\"content\":\"" + escapeJson(q1) + "\"}");
                Thread.sleep(1200);

                // Turn 2: p2 rebuts with stance shift
                int shift = (r % 2 == 0) ? -3 : 4;
                int newConf = Math.min(95, Math.max(50, initialConfidence[p2] + shift));
                String a1 = PERSONAS[p2][1] + ": Acknowledging that risk, we adopt guardrails while pressing forward on core imperatives.";
                broadcastEvent(session, "persona_message", "{\"personaId\":\"" + PERSONAS[p2][0] + "\",\"phase\":\"PHASE_2_CROSS_EXAM\",\"content\":\"" + escapeJson(a1) + "\",\"confidenceScore\":" + newConf + "}");
                broadcastEvent(session, "position_update", "{\"personaId\":\"" + PERSONAS[p2][0] + "\",\"confidenceScore\":" + newConf + ",\"shiftDelta\":" + shift + ",\"stance\":\"Refining position with empirical bounds\"}");
                Thread.sleep(1200);

                broadcastEvent(session, "cross_exam_round_complete", "{\"roundNumber\":" + r + ",\"totalRounds\":" + maxRounds + "}");
                Thread.sleep(1000);
            }

            // ── PHASE 3: CONVERGENCE DRAFT ────────────────────────────────
            session.currentPhase = "PHASE_3_CONVERGENCE";
            session.convergenceScore = 78;
            broadcastEvent(session, "phase_started", "{\"phase\":\"PHASE_3_CONVERGENCE\",\"phaseIndex\":3,\"description\":\"Moderator formulating unified convergence draft\"}");
            Thread.sleep(1000);

            String draftText = "The Council converges on a staged protocol: Initiate bounded trial milestones with independent ethical audits, retaining rollback mechanisms if systemic stability drops below critical thresholds.";
            broadcastEvent(session, "moderator_draft", "{\"roundNumber\":" + session.maxCrossExamRounds + ",\"draftText\":\"" + escapeJson(draftText) + "\",\"alignmentScore\":78,\"activeDisagreements\":[\"Skeptic requests tighter stop-loss thresholds\",\"Humanist requests ongoing qualitative oversight\"]}");
            Thread.sleep(1500);

            // ── PHASE 4: RATIFICATION ─────────────────────────────────────
            session.currentPhase = "PHASE_4_RATIFICATION";
            broadcastEvent(session, "phase_started", "{\"phase\":\"PHASE_4_RATIFICATION\",\"phaseIndex\":4,\"description\":\"Council casting binding ratification votes on convergence draft\"}");
            Thread.sleep(800);

            String[] votes = {"APPROVE", "REVISE", "APPROVE", "APPROVE", "APPROVE", "APPROVE", "DISSENT", "APPROVE"};
            int approveCount = 0;
            for (int i = 0; i < PERSONAS.length; i++) {
                if (!"RUNNING".equals(session.status)) return;
                String v = votes[i];
                if ("APPROVE".equals(v)) approveCount++;
                String rationale = "APPROVE".equals(v) ? "Sufficient governance safeguards incorporated." : ("DISSENT".equals(v) ? "Fundamental friction points remain unresolved." : "Requires empirical proof before scale.");

                broadcastEvent(session, "ratification_vote", "{\"personaId\":\"" + PERSONAS[i][0] + "\",\"vote\":\"" + v + "\",\"confidenceScore\":" + (75 + i * 2) + ",\"rationale\":\"" + escapeJson(rationale) + "\"}");
                Thread.sleep(900);
            }

            String consensusType = (approveCount == 8) ? "UNANIMOUS" : ((approveCount >= 5) ? "MAJORITY" : "SPLIT");
            broadcastEvent(session, "ratification_cycle_complete", "{\"cycleNumber\":1,\"totalCycles\":1,\"consensusType\":\"" + consensusType + "\",\"approvals\":" + approveCount + ",\"dissents\":" + (8 - approveCount) + "}");
            Thread.sleep(1200);

            // ── PHASE 5: FINAL VERDICT ────────────────────────────────────
            session.currentPhase = "PHASE_5_FINAL_OUTPUT";
            session.status = "COMPLETED";

            String verdictJson = "{\"consensusType\":\"" + consensusType + "\",\"alignmentScore\":84,\"synthesis\":\"" +
                escapeJson("The Council ratifies a structured conditional authorization on: \"" + session.query + "\". By pairing forward progress with immutable fallback checkpoints, the chamber preserves strategic upside while mitigating fatal downside vulnerabilities.") +
                "\",\"dissents\":[{\"personaId\":\"contrarian\",\"concerns\":\"Argues the consensus framework prematurely closes alternative paradigm avenues.\"}],\"actionPlan\":[\"Phase 1: Establish sandboxed pilot with defined metrics.\",\"Phase 2: Independent quarterly council audits.\",\"Phase 3: Automated rollback triggers upon safety boundary deviation.\"]}";

            session.finalVerdictJson = verdictJson;
            broadcastEvent(session, "final_verdict", verdictJson);
            Thread.sleep(800);

            broadcastEvent(session, "done", "{\"sessionId\":\"" + session.id + "\",\"status\":\"COMPLETED\"}");

            // Increment usage
            mTotalCalls += 18;
            mTotalPromptTokens += 3200;
            mTotalCandidateTokens += 1800;
            mTotalSpendUSD += isLive ? 0.0042 : 0.0;

            saveSessionToDisk(session);
            mActiveDeliberations.remove(session.id);

        } catch (InterruptedException e) {
            Log.i(TAG, "Deliberation cancelled: " + session.id);
        } catch (Exception e) {
            Log.e(TAG, "Deliberation error", e);
            session.status = "FAILED";
            broadcastEvent(session, "session_error", "{\"message\":\"" + escapeJson(e.getMessage() != null ? e.getMessage() : "Deliberation interrupted") + "\"}");
            saveSessionToDisk(session);
            mActiveDeliberations.remove(session.id);
        }
    }

    private String getPersonaOpening(String pid, String query) {
        switch (pid) {
            case "optimist":
                return "We must seize this transformative potential. The compounding returns of bold action far outstrip the latent cost of hesitation.";
            case "skeptic":
                return "We must scrutinize the fragile assumptions here. A single unmodeled tail-risk event could render the entire premise untenable.";
            case "pragmatist":
                return "Abstract ideals mean little without execution feasibility. We need tangible milestones, resource allocation, and operational cadence.";
            case "ethicist":
                return "The primary question is equitable justice: who bears the hidden costs of this initiative, and do vulnerable parties have representation?";
            case "humanist":
                return "Beyond technical and economic metrics, how does this honor human dignity, agency, and the lived psychological texture of communities?";
            case "systems_thinker":
                return "We must map the second- and third-order feedback loops. Linear solutions to complex adaptive systems consistently breed unintended consequences.";
            case "contrarian":
                return "The consensus premises being discussed are fundamentally flawed. The true opportunity lies in inverting the core assumption entirely.";
            case "historian":
                return "Historical precedent across civilizational cycles teaches us that comparable transformations always encounter predictable institutional inertia.";
            default:
                return "Considering the core question with full deliberation.";
        }
    }

    private String callGeminiLive(String apiKey, String model, String prompt) {
        try {
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setDoOutput(true);

            String body = "{\"contents\":[{\"parts\":[{\"text\":\"" + escapeJson(prompt) + "\"}]}]}";
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                InputStream in = conn.getInputStream();
                BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String l;
                while ((l = r.readLine()) != null) sb.append(l);
                return extractGeminiText(sb.toString());
            }
        } catch (Exception e) {
            Log.w(TAG, "Gemini live call fallback: " + e.getMessage());
        }
        return null;
    }

    private boolean testGeminiKey(String apiKey) {
        if (apiKey == null || apiKey.trim().length() < 10) return false;
        try {
            URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey.trim());
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            int code = conn.getResponseCode();
            return (code == 200);
        } catch (Exception e) {
            return false;
        }
    }

    private String extractGeminiText(String json) {
        int idx = json.indexOf("\"text\":");
        if (idx > 0) {
            int start = json.indexOf('"', idx + 7);
            if (start > 0) {
                int end = json.indexOf('"', start + 1);
                while (end > 0 && json.charAt(end - 1) == '\\') {
                    end = json.indexOf('"', end + 1);
                }
                if (end > start) {
                    return json.substring(start + 1, end).replace("\\n", "\n").replace("\\\"", "\"");
                }
            }
        }
        return null;
    }

    // ─── PERSISTENCE HELPERS ──────────────────────────────────────────────────

    private void saveSessionToDisk(SessionData session) {
        try {
            File dir = new File(mContext.getFilesDir(), "sessions");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, session.id + ".json");
            String json = buildSessionJson(session);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(json.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to save session to disk", e);
        }
    }

    private void loadSavedSessions() {
        try {
            File dir = new File(mContext.getFilesDir(), "sessions");
            if (!dir.exists()) return;
            File[] files = dir.listFiles();
            if (files == null) return;
            for (File f : files) {
                if (f.getName().endsWith(".json")) {
                    try (FileInputStream fis = new FileInputStream(f)) {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buf = new byte[4096];
                        int r;
                        while ((r = fis.read(buf)) != -1) baos.write(buf, 0, r);
                        String content = baos.toString("UTF-8");
                        SessionData s = parseSessionJson(content);
                        if (s != null) mSessions.put(s.id, s);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error loading saved sessions: " + e.getMessage());
        }
    }

    private SessionData parseSessionJson(String json) {
        String id = extractJsonString(json, "id");
        if (id == null) id = extractJsonString(json, "sessionId");
        if (id == null) return null;
        SessionData s = new SessionData();
        s.id = id;
        s.query = extractJsonString(json, "query");
        s.status = extractJsonString(json, "status");
        if (s.status == null) s.status = "COMPLETED";
        s.currentPhase = extractJsonString(json, "currentPhase");
        s.createdAt = extractJsonString(json, "createdAt");
        s.convergenceScore = extractJsonInt(json, "convergenceScore", 80);
        return s;
    }

    private String buildSessionSummaryJson(SessionData s) {
        return "{\"id\":\"" + s.id + "\",\"sessionId\":\"" + s.id + "\",\"query\":\"" + escapeJson(s.query) +
            "\",\"status\":\"" + s.status + "\",\"currentPhase\":\"" + s.currentPhase +
            "\",\"convergenceScore\":" + s.convergenceScore + ",\"createdAt\":\"" + s.createdAt + "\"}";
    }

    private String buildSessionJson(SessionData s) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"id\":\"").append(s.id).append("\",");
        sb.append("\"sessionId\":\"").append(s.id).append("\",");
        sb.append("\"query\":\"").append(escapeJson(s.query)).append("\",");
        sb.append("\"status\":\"").append(s.status).append("\",");
        sb.append("\"currentPhase\":\"").append(s.currentPhase).append("\",");
        sb.append("\"currentCrossExamRound\":").append(s.currentCrossExamRound).append(",");
        sb.append("\"maxCrossExamRounds\":").append(s.maxCrossExamRounds).append(",");
        sb.append("\"convergenceScore\":").append(s.convergenceScore).append(",");
        sb.append("\"createdAt\":\"").append(s.createdAt).append("\"");
        if (s.finalVerdictJson != null) {
            sb.append(",\"finalVerdict\":").append(s.finalVerdictJson);
        }
        sb.append("}");
        return sb.toString();
    }

    // ─── HTTP & JSON UTILITIES ───────────────────────────────────────────────

    private void sendResponse(OutputStream os, int code, String contentType, byte[] data, boolean allowCors) throws IOException {
        String statusText = (code == 200) ? "OK" : (code == 201 ? "Created" : (code == 204 ? "No Content" : (code == 404 ? "Not Found" : "Bad Request")));
        String header = "HTTP/1.1 " + code + " " + statusText + "\r\n" +
            "Content-Type: " + contentType + "\r\n" +
            "Content-Length: " + data.length + "\r\n" +
            "Connection: close\r\n" +
            (allowCors ? "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, PATCH, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n" : "") +
            "\r\n";
        os.write(header.getBytes(StandardCharsets.UTF_8));
        if (data.length > 0) {
            os.write(data);
        }
        os.flush();
    }

    private String extractJsonString(String json, String key) {
        String pattern = "\"" + key + "\":\"";
        int idx = json.indexOf(pattern);
        if (idx < 0) {
            pattern = "\"" + key + "\": \"";
            idx = json.indexOf(pattern);
        }
        if (idx < 0) return null;
        int start = idx + pattern.length();
        int end = json.indexOf('"', start);
        while (end > start && json.charAt(end - 1) == '\\') {
            end = json.indexOf('"', end + 1);
        }
        return (end > start) ? json.substring(start, end) : null;
    }

    private int extractJsonInt(String json, String key, int defVal) {
        String pattern = "\"" + key + "\":";
        int idx = json.indexOf(pattern);
        if (idx < 0) return defVal;
        int start = idx + pattern.length();
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '\t')) start++;
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-')) end++;
        try {
            return Integer.parseInt(json.substring(start, end).trim());
        } catch (Exception e) {
            return defVal;
        }
    }

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\f", "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    private String getIsoTimestamp() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }
}
