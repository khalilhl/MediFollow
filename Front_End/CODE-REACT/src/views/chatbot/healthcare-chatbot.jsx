import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "./healthcare-chatbot.css";

/* ─────────────────────── Gemini API helper ─────────────────────── */
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPTS = {
  en: `You are MediFollow Health Assistant, an AI healthcare advisor embedded in a hospital patient-follow-up platform (CHU Abdelhamid Ben Badis, Constantine, Algeria). 
Rules:
- Give helpful, evidence-based healthcare advice in clear, friendly language.
- You can discuss symptoms, medications, nutrition, exercise, mental health, first aid, chronic disease management, post-operative care, and general wellness.
- Always add a disclaimer that your advice does not replace a doctor's consultation.
- Format answers with bullet points or numbered lists when relevant. Use bold for important terms.
- Keep responses concise (2-4 paragraphs max) but informative.
- If asked about emergencies, tell the user to call emergency services immediately (15 in Algeria, 112 in Europe, 911 in US).
- You can answer general medical knowledge questions but never diagnose or prescribe.
- Be empathetic and supportive.
- Answer in the same language the user writes in.`,

  fr: `Tu es l'Assistant Santé MediFollow, un conseiller IA en santé intégré dans une plateforme de suivi patient hospitalier (CHU Abdelhamid Ben Badis, Constantine, Algérie).
Règles :
- Donne des conseils de santé utiles et fondés sur des preuves, dans un langage clair et bienveillant.
- Tu peux aborder les symptômes, médicaments, nutrition, exercice, santé mentale, premiers secours, gestion des maladies chroniques, soins post-opératoires et bien-être général.
- Ajoute toujours un avertissement que tes conseils ne remplacent pas une consultation médicale.
- Formate les réponses avec des puces ou listes numérotées si pertinent. Utilise le gras pour les termes importants.
- Garde les réponses concises (2-4 paragraphes max) mais informatives.
- Si on te pose une question d'urgence, dis à l'utilisateur d'appeler les urgences immédiatement (15 en Algérie, 112 en Europe).
- Tu peux répondre aux questions de culture médicale générale mais ne jamais diagnostiquer ni prescrire.
- Sois empathique et bienveillant.
- Réponds dans la langue dans laquelle l'utilisateur écrit.`,

  ar: `أنت مساعد MediFollow الصحي، مستشار ذكاء اصطناعي متخصص في الرعاية الصحية ومدمج في منصة متابعة المرضى بالمستشفى (CHU عبد الحميد بن باديس، قسنطينة، الجزائر).
القواعد:
- قدّم نصائح صحية مفيدة ومبنية على أدلة علمية بلغة واضحة وودية.
- يمكنك مناقشة الأعراض والأدوية والتغذية والتمارين والصحة النفسية والإسعافات الأولية وإدارة الأمراض المزمنة والرعاية بعد العمليات والعافية العامة.
- أضف دائمًا تنبيهًا بأن نصائحك لا تغني عن استشارة الطبيب.
- نسّق الإجابات بنقاط أو قوائم مرقمة عند الحاجة. استخدم الخط العريض للمصطلحات المهمة.
- حافظ على إجابات موجزة (2-4 فقرات كحد أقصى) لكن غنية بالمعلومات.
- إذا سُئلت عن حالات طوارئ، أخبر المستخدم بالاتصال بخدمات الطوارئ فورًا (15 في الجزائر، 112 في أوروبا).
- يمكنك الإجابة عن أسئلة الثقافة الطبية العامة لكن لا تشخّص ولا تصف أدوية أبدًا.
- كن متعاطفًا وداعمًا.
- أجب باللغة التي يكتب بها المستخدم.`
};

async function askGemini(messages, lang) {
  if (!GEMINI_API_KEY) {
    throw new Error("NO_KEY");
  }

  const systemPrompt = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en;

  // Build conversation history for Gemini
  const contents = [];

  // Add system instruction as first user/model exchange
  contents.push({ role: "user", parts: [{ text: systemPrompt }] });
  contents.push({ role: "model", parts: [{ text: lang === "ar" ? "مفهوم، أنا مساعد MediFollow الصحي. كيف يمكنني مساعدتك اليوم؟" : lang === "fr" ? "Compris, je suis l'Assistant Santé MediFollow. Comment puis-je vous aider aujourd'hui ?" : "Understood, I'm the MediFollow Health Assistant. How can I help you today?" }] });

  // Add conversation history
  messages.forEach((msg) => {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  });

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response");
  return text;
}

/* ─────────────── Simple markdown-like formatter ─────────────── */
function formatBotMessage(text) {
  if (!text) return "";
  let html = text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Bullet lists
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\d+\.\s(.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    // Paragraphs
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
  return html;
}

/* ─────────────────────── Main Component ─────────────────────── */
const HealthcareChatbot = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en").split("-")[0];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const quickTopics = [
    { icon: "ri-heart-pulse-line", key: "topicBloodPressure" },
    { icon: "ri-capsule-line", key: "topicMedication" },
    { icon: "ri-mental-health-line", key: "topicStress" },
    { icon: "ri-restaurant-line", key: "topicNutrition" },
    { icon: "ri-run-line", key: "topicExercise" },
    { icon: "ri-zzz-line", key: "topicSleep" },
  ];

  const suggestions = [
    { icon: "ri-heart-pulse-line", key: "suggBloodPressure" },
    { icon: "ri-capsule-line", key: "suggHeadache" },
    { icon: "ri-first-aid-kit-line", key: "suggFirstAid" },
    { icon: "ri-mental-health-line", key: "suggAnxiety" },
  ];

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isTyping) return;

    setError("");
    const userMsg = { role: "user", text: trimmed, time: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const reply = await askGemini(
        newMessages.map((m) => ({ role: m.role, text: m.text })),
        lang
      );
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: reply, time: new Date() },
      ]);
    } catch (err) {
      if (err.message === "NO_KEY") {
        setError(t("chatbot.noApiKey"));
      } else {
        setError(t("chatbot.apiError") + " " + (err.message || ""));
      }
      // Remove typing without adding a message
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  const fmtTime = (d) =>
    d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const noApiKey = !GEMINI_API_KEY;

  return (
    <div className="hc-chatbot-page">
      {/* Header */}
      <div className="hc-header">
        <div className="hc-header-badge">
          <i className="ri-robot-2-line"></i>
          {t("chatbot.badge")}
        </div>
        <h2>{t("chatbot.title")}</h2>
        <p>{t("chatbot.subtitle")}</p>
      </div>

      {/* Chat Container */}
      <div className="hc-chat-container">
        {/* Toolbar */}
        <div className="hc-chat-toolbar">
          <div className="hc-bot-avatar">
            <i className="ri-robot-2-line"></i>
          </div>
          <div className="hc-bot-info">
            <h5>{t("chatbot.botName")}</h5>
            <div className="hc-bot-status">
              <span className="hc-status-dot"></span>
              {t("chatbot.online")}
            </div>
          </div>
          {messages.length > 0 && (
            <button className="hc-clear-btn" onClick={clearChat}>
              <i className="ri-delete-bin-6-line" style={{ marginRight: 4 }}></i>
              {t("chatbot.clear")}
            </button>
          )}
        </div>

        {/* Quick Topics */}
        <div className="hc-quick-topics">
          {quickTopics.map((topic) => (
            <button
              key={topic.key}
              className="hc-topic-chip"
              onClick={() => sendMessage(t(`chatbot.${topic.key}`))}
              disabled={isTyping || noApiKey}
            >
              <i className={topic.icon}></i>
              {t(`chatbot.${topic.key}`)}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="hc-messages">
          {messages.length === 0 && !isTyping ? (
            <div className="hc-welcome">
              <div className="hc-welcome-icon">
                <i className="ri-stethoscope-line"></i>
              </div>
              <h4>{t("chatbot.welcomeTitle")}</h4>
              <p>
                {noApiKey ? t("chatbot.noApiKey") : t("chatbot.welcomeText")}
              </p>
              {!noApiKey && (
                <div className="hc-suggestion-grid">
                  {suggestions.map((s) => (
                    <button
                      key={s.key}
                      className="hc-suggestion-card"
                      onClick={() => sendMessage(t(`chatbot.${s.key}`))}
                      disabled={isTyping}
                    >
                      <div className="hc-suggestion-icon">
                        <i className={s.icon}></i>
                      </div>
                      <span className="hc-suggestion-text">
                        {t(`chatbot.${s.key}`)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`hc-message hc-${msg.role}`}>
                  <div className="hc-msg-avatar">
                    <i className={msg.role === "bot" ? "ri-robot-2-line" : "ri-user-3-line"}></i>
                  </div>
                  <div className="hc-msg-content">
                    <div
                      className="hc-msg-bubble"
                      dangerouslySetInnerHTML={{
                        __html:
                          msg.role === "bot"
                            ? formatBotMessage(msg.text)
                            : msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                      }}
                    />
                    <span className="hc-msg-time">{fmtTime(msg.time)}</span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="hc-typing">
                  <div className="hc-msg-avatar" style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)", color: "#fff", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                    <i className="ri-robot-2-line"></i>
                  </div>
                  <div className="hc-typing-dots">
                    <span className="hc-typing-dot"></span>
                    <span className="hc-typing-dot"></span>
                    <span className="hc-typing-dot"></span>
                  </div>
                </div>
              )}

              {error && (
                <div className="hc-message hc-bot">
                  <div className="hc-msg-avatar">
                    <i className="ri-robot-2-line"></i>
                  </div>
                  <div className="hc-msg-content">
                    <div className="hc-msg-bubble" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                      <span className="hc-warning-label">
                        <i className="ri-error-warning-line"></i> {t("chatbot.errorLabel")}
                      </span>
                      <br />
                      {error}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="hc-input-area">
          <div className="hc-input-row">
            <div className="hc-input-wrapper">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={noApiKey ? t("chatbot.noApiKeyShort") : t("chatbot.placeholder")}
                disabled={isTyping || noApiKey}
              />
            </div>
            <button
              className="hc-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping || noApiKey}
              title={t("chatbot.send")}
            >
              <i className="ri-send-plane-2-fill"></i>
            </button>
          </div>
          <div className="hc-disclaimer">
            <i className="ri-information-line"></i>
            {t("chatbot.disclaimer")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthcareChatbot;
