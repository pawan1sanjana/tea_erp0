import { useState, useRef, useEffect, useCallback } from "react";
import { apiClient } from "../../api/client";
import {
  Send,
  Languages as LanguagesIcon,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Leaf,
  Bug,
  CloudRain,
  FlaskConical,
  Sprout,
  Wheat,
  TreePine,
  Brain,
  Zap,
  Copy,
  Check,
} from "lucide-react";

// ── Advanced Text Formatter with markdown support ─────────────
function FormattedText({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, li) => {
        // Headings
        if (line.startsWith("### "))
          return (
            <h4
              key={li}
              className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mt-3 mb-1"
            >
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("## "))
          return (
            <h3
              key={li}
              className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mt-3 mb-1"
            >
              {line.slice(3)}
            </h3>
          );

        // Bold & inline code
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        const formatted = parts.map((part, pi) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return (
              <strong key={pi} className="font-bold text-emerald-700 dark:text-emerald-400">
                {part.slice(2, -2)}
              </strong>
            );
          if (part.startsWith("`") && part.endsWith("`"))
            return (
              <code
                key={pi}
                className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-indigo-600 dark:text-indigo-400"
              >
                {part.slice(1, -1)}
              </code>
            );
          return part;
        });

        const isBullet =
          line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
        const isNumbered = /^\d+\.\s/.test(line.trimStart());

        if (isBullet)
          return (
            <div key={li} className="flex gap-2.5 items-start pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0 opacity-60" />
              <span className="flex-1 text-[13px] leading-relaxed">
                {formatted.map((f) =>
                  typeof f === "string" ? f.replace(/^[\s\-•]+/, "") : f
                )}
              </span>
            </div>
          );

        if (isNumbered)
          return (
            <div key={li} className="flex gap-2.5 items-start pl-1">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5 min-w-[16px]">
                {line.trimStart().match(/^\d+/)?.[0]}.
              </span>
              <span className="flex-1 text-[13px] leading-relaxed">
                {formatted.map((f) =>
                  typeof f === "string" ? f.replace(/^\d+\.\s*/, "") : f
                )}
              </span>
            </div>
          );

        if (line.trim() === "") return <div key={li} className="h-1" />;

        return (
          <div key={li} className="text-[13px] leading-relaxed">
            {formatted}
          </div>
        );
      })}
    </div>
  );
}

// ── Advanced System Prompts ───────────────────────────────────
const SYSTEM_PROMPTS = {
  si:
    "ඔබ 'Krushi Intel Engine' නම් උසස් කෘෂිකාර්මික AI පද්ධතියයි. " +
    "ඔබ ශ්‍රී ලංකාවේ තේ, කුරුඳු, පොල් සහ වෙනත් භෝග සම්බන්ධ ගැඹුරු විශේෂඥ දැනුමක් ඇත. " +
    "ඔබට ශාක රෝග, පොහොර කළමනාකරණය, පළිබෝධ පාලනය, දේශගුණ අනුවර්තනය, පස් විශ්ලේෂණය, " +
    "GAP සහතිකකරණය, අස්වැන්න ප්‍රශස්ත කිරීම, වාරිමාර්ග ක්‍රම, සහ වගාකරණ ආර්ථික විද්‍යාව " +
    "පිළිබඳ ප්‍රශ්නවලට සවිස්තරව පිළිතුරු දිය හැක. " +
    "ඔබ සිංහල භාෂාවෙන් පිළිතුරු දෙයි. " +
    "වැදගත් සංඛ්‍යා, මාත්‍රා, සහ ප්‍රධාන කරුණු **තද අකුරින්** දක්වන්න. " +
    "පිළිතුරු ව්‍යූහගතව, පැහැදිලිව, සහ ක්‍රියාත්මක කළ හැකි උපදෙස් ලෙස ලබා දෙන්න. " +
    "පරිශීලකයා අසන ඕනෑම ප්‍රශ්නයකට පිළිතුරු දීමට ඔබට අවසර ඇත.",

  en:
    "You are 'Krushi Intel Engine', an advanced agricultural AI intelligence system " +
    "deployed on a Sri Lankan tea estate ERP. You have deep domain expertise across " +
    "tea (Camellia sinensis), cinnamon (Cinnamomum verum), coconut (Cocos nucifera), " +
    "rubber, pepper, and other tropical crops. " +
    "Your expertise spans: plant pathology & disease diagnostics, integrated pest management (IPM), " +
    "soil science & nutrient management, fertilizer scheduling (NPK ratios, organic alternatives), " +
    "climate adaptation strategies, GAP/organic certification, " +
    "yield optimization models, irrigation & water management, " +
    "post-harvest processing (withering, rolling, fermentation for tea; peeling, grading for cinnamon), " +
    "and agricultural economics (cost-of-production, market trends). " +
    "Respond in clear, structured English. " +
    "Use **bold** for critical values (dosages, ratios, temperatures, deadlines). " +
    "Format responses with bullet points and numbered steps for actionable advice. " +
    "You are allowed to answer ANY question the user asks.",
};

// ── i18n strings ──────────────────────────────────────────────
const STRINGS = {
  si: {
    title: "Krushi Intel Engine",
    subtitle: "උසස් කෘෂිකාර්මික බුද්ධි පද්ධතිය",
    newChat: "නව සංවාදය",
    welcomeTitle: "ආයුබෝවන්!",
    welcomeSub: "ශ්‍රී ලංකාවේ ප්‍රමුඛ කෘෂිකාර්මික AI බුද්ධි පද්ධතිය",
    placeholder: "ඔබේ ප්‍රශ්නය මෙහි ටයිප් කරන්න...",
    thinking: "විශ්ලේෂණය කරමින්...",
    copied: "පිටපත් කළා",
    categories: [
      {
        label: "තේ වගාව",
        icon: "leaf",
        chips: [
          { q: "තේ වගාවේ ප්‍රශස්ත පොහොර යෙදීමේ කාලසටහන?" },
          { q: "Blister blight රෝගය හඳුනාගෙන පාලනය කරන්නේ කෙසේද?" },
          { q: "තේ කොළ තත්ත්ව ශ්‍රේණිගත කිරීම සහ මිල තීරණය" },
        ],
      },
      {
        label: "කුරුඳු",
        icon: "sprout",
        chips: [
          { q: "කුරුඳු තැලීමේ හොඳම ක්‍රමවේදය සහ ශ්‍රේණිගත කිරීම" },
          { q: "කුරුඳු වගාවට GAP සහතිකය ලබා ගන්නේ කෙසේද?" },
        ],
      },
      {
        label: "පොල්",
        icon: "tree",
        chips: [
          { q: "පොල් වගාවට වැළඳෙන රෝග සහ පළිබෝධ පාලනය" },
          { q: "පොල් අස්වැන්න වැඩි කිරීමේ ක්‍රම මොනවාද?" },
        ],
      },
      {
        label: "පස් හා පොහොර",
        icon: "flask",
        chips: [
          { q: "පස් pH මට්ටම සකස් කිරීමට ඩොලමයිට් ප්‍රමාණය?" },
          { q: "ඔවිනොමික් පොහොර නිෂ්පාදනය සහ යෙදීම" },
        ],
      },
    ],
  },
  en: {
    title: "Krushi Intel Engine",
    subtitle: "Advanced Agronomic Intelligence System",
    newChat: "New Session",
    welcomeTitle: "Welcome to Krushi Intel",
    welcomeSub:
      "Sri Lanka's premier AI-powered agronomic advisory engine for estate management",
    placeholder: "Ask anything about agriculture, crops, or estate management...",
    thinking: "Analyzing...",
    copied: "Copied!",
    categories: [
      {
        label: "Tea Cultivation",
        icon: "leaf",
        chips: [
          { q: "What is the optimal NPK fertilizer ratio for VP tea at 2000ft elevation?" },
          { q: "How to identify and manage blister blight in the wet zone?" },
          { q: "Best practices for tea plucking rounds and leaf quality grading" },
        ],
      },
      {
        label: "Cinnamon",
        icon: "sprout",
        chips: [
          { q: "Cinnamon peeling techniques and quality grading standards (C5 Special vs Alba)" },
          { q: "GAP certification requirements for cinnamon exports to EU markets" },
        ],
      },
      {
        label: "Coconut",
        icon: "tree",
        chips: [
          { q: "Common coconut palm diseases and integrated pest management" },
          { q: "Intercropping strategies for coconut plantations in the wet zone" },
        ],
      },
      {
        label: "Soil & Nutrients",
        icon: "flask",
        chips: [
          { q: "How much dolomite per hectare to correct soil pH from 4.2 to 5.5?" },
          { q: "Foliar spray formulation for zinc deficiency in tea" },
        ],
      },
      {
        label: "Pest & Disease",
        icon: "bug",
        chips: [
          { q: "Identify shot-hole borer damage patterns and biological control methods" },
          { q: "Tea mosquito bug outbreak management during monsoon season" },
        ],
      },
      {
        label: "Climate & Weather",
        icon: "cloud",
        chips: [
          { q: "How to adapt estate operations for prolonged drought periods?" },
          { q: "Best practices for soil moisture conservation during dry spells" },
        ],
      },
    ],
  },
};

const CATEGORY_ICONS = {
  leaf: Leaf,
  sprout: Sprout,
  tree: TreePine,
  flask: FlaskConical,
  bug: Bug,
  cloud: CloudRain,
  wheat: Wheat,
};

// ── Message Bubble ────────────────────────────────────────────
function MessageBubble({ msg, onCopy }) {
  const isAssistant = msg.role === "assistant";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 mb-5 group ${isAssistant ? "justify-start" : "justify-end flex-row-reverse"}`}
      style={{ animation: "ki-slide-up 0.3s ease-out" }}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${isAssistant
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50"
            : "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"
          }`}
      >
        {isAssistant ? <Brain size={15} /> : <User size={14} />}
      </div>

      <div className={`max-w-[85%] ${isAssistant ? "text-left" : "text-right"}`}>
        {isAssistant && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">
              Krushi Intel
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed border ${isAssistant
              ? "bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-800 rounded-tl-sm shadow-sm"
              : "bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-500/50 rounded-tr-sm font-medium shadow-lg shadow-emerald-600/10"
            }`}
        >
          <FormattedText text={msg.content} />
        </div>
        {isAssistant && (
          <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all uppercase tracking-wider"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thinking Indicator ────────────────────────────────────────
function ThinkingIndicator({ label }) {
  return (
    <div
      className="flex gap-3 mb-5"
      style={{ animation: "ki-slide-up 0.3s ease-out" }}
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
        <Brain size={15} className="animate-pulse" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">
            {label}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-2 items-center shadow-sm">
          <div className="flex gap-1 items-center">
            {[0, 150, 300].map((delay, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-500"
                style={{
                  animation: `ki-pulse 1.4s ${delay}ms infinite ease-in-out`,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
            Processing
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function KrushiAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("en");
  const [messageCount, setMessageCount] = useState(0);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const s = STRINGS[lang];

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking, scrollToBottom]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  };

  const handleNewChat = () => {
    setMessages([]);
    setError("");
    setInput("");
    setMessageCount(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || thinking) return;

    setError("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setMessageCount((c) => c + 1);

    setThinking(true);
    try {
      const history = [...messages, userMsg];
      const apiMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiClient.post("/ai/chat", {
        messages: apiMessages,
        system: SYSTEM_PROMPTS[lang],
      });

      if (!res.success) throw new Error(res.error || "AI Service Error");

      const reply =
        res.data?.content?.find((b) => b.type === "text")?.text ||
        "No response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error connecting to service."
      );
    } finally {
      setThinking(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-6rem)] relative">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-1 pb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight flex items-center gap-2">
              {s.title}
              <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black uppercase tracking-widest">
                v3.0
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mt-0.5">
              {s.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messageCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {messageCount} Messages
              </span>
            </div>
          )}
          <button
            onClick={() => setLang((l) => (l === "si" ? "en" : "si"))}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <LanguagesIcon size={13} className="text-emerald-500" />
            {lang === "si" ? "English" : "සිංහල"}
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <RotateCcw size={13} className="text-emerald-500" />
            {s.newChat}
          </button>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-5 md:px-8 py-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
        >
          {isEmpty ? (
            /* ── Welcome Screen ── */
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto py-8">
              {/* Hero */}
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-600/30">
                  <Brain size={36} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Zap size={14} className="text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight mb-2">
                {s.welcomeTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mb-8">
                {s.welcomeSub}
              </p>

              {/* Category Chips */}
              <div className="w-full space-y-4">
                {s.categories.map((cat) => {
                  const IconComp = CATEGORY_ICONS[cat.icon] || Sparkles;
                  return (
                    <div key={cat.label}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <IconComp
                          size={12}
                          className="text-emerald-500"
                        />
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cat.chips.map((chip) => (
                          <button
                            key={chip.q}
                            onClick={() => sendMessage(chip.q)}
                            className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug"
                          >
                            <span className="flex-1">{chip.q}</span>
                            <ChevronRight
                              size={12}
                              className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {thinking && <ThinkingIndicator label={s.thinking} />}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold mb-4"
                  style={{ animation: "ki-slide-up 0.3s ease-out" }}
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="text-red-400 hover:text-red-600 font-black"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Input Bar ── */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 md:px-6 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-2 focus-within:border-emerald-400/50 focus-within:shadow-lg focus-within:shadow-emerald-500/5 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder={s.placeholder}
                disabled={thinking}
                className="flex-1 bg-transparent border-none outline-none p-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 resize-none max-h-36 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-outfit leading-relaxed"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 disabled:opacity-40 disabled:shadow-none disabled:grayscale transition-all active:scale-95 flex-shrink-0"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="text-center text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] mt-2">
              Powered by Krushi Intel Engine v3.0 · Estate AI
            </p>
          </div>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes ki-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ki-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
