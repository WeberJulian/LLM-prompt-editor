import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Plus,
  Trash2,
  Wrench,
  MessageSquare,
  Bot,
  User,
  FileJson,
  Wand2,
  FolderPlus,
  Upload,
  Trash,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";

// -------------------- Utilities --------------------
const LS_PREFIX = "cfb_v2";
const LS_KEY_LIST = `${LS_PREFIX}:conversations`;
const LS_KEY_ACTIVE = `${LS_PREFIX}:active`;

const nowIso = () => new Date().toISOString();

const isJSONString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

const prettify = (str: string) => {
  try {
    const obj = typeof str === "string" ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
};

const download = (filename: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const DEFAULT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather by city name",
      parameters: {
        type: "object",
        properties: { location: { type: "string" } },
        required: ["location"],
      },
    },
  },
];

const DEFAULT_SYSTEM = { role: "system", content: "You are a helpful assistant." };

const withIds = (msgs: any[]) => msgs.map((m) => (m._id ? m : { ...m, _id: uuidv4() }));

const makeExampleConversation = () => {
  const toolId = uuidv4();
  return {
    id: uuidv4(),
    name: "Weather example",
    updatedAt: nowIso(),
    tools: DEFAULT_TOOLS,
    messages: withIds([
      DEFAULT_SYSTEM,
      { role: "user", content: "What's the weather in Dublin?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: toolId,
            type: "function",
            function: { name: "get_weather", arguments: JSON.stringify({ location: "Dublin" }) },
          },
        ],
      },
      { role: "tool", tool_call_id: toolId, name: "get_weather", content: "{\"tempC\": 15, \"condition\": \"Cloudy\"}" },
      { role: "assistant", content: "It's 15°C and cloudy in Dublin." },
    ]),
  };
};

// Build export payload (also used by tests)
const buildExportPayload = (messages: any[], toolsStr: string) => {
  const cleaned = messages.map(({ _id, ...m }) => {
    const base: any = { role: m.role };
    if (m.content !== undefined) base.content = m.content;
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      base.tool_calls = m.tool_calls.map((tc: any) => ({
        id: tc.id || uuidv4(),
        type: tc.type || "function",
        function: {
          name: tc.function?.name || "",
          arguments:
            typeof tc.function?.arguments === "string"
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments ?? {}),
        },
      }));
    }
    if (m.role === "tool") {
      base.tool_call_id = m.tool_call_id || "";
      if (m.name) base.name = m.name;
    }
    return base;
  });
  return { messages: cleaned, tools: isJSONString(toolsStr) ? JSON.parse(toolsStr) : [] };
};

// Auto-resize textarea hook
function useAutosize(textareaRef: React.RefObject<HTMLTextAreaElement>, value: string | undefined) {
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflow = "hidden";
    el.style.height = el.scrollHeight + "px";
  }, [textareaRef, value]);
}

function Collapsible({ title, children, defaultOpen = true, previewText }: { title: string; children: React.ReactNode; defaultOpen?: boolean; previewText?: string; }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-medium text-slate-700">{title}</span>
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="border-t border-slate-100 p-3">{children}</div>
      ) : previewText ? (
        <div
          className="border-t border-slate-100 p-3 text-xs text-slate-500 truncate cursor-pointer hover:bg-slate-50"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
          title="Click to expand"
        >
          {previewText}
        </div>
      ) : null}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value?: string; onChange: (v: string) => void; placeholder?: string; rows?: number; }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useAutosize(ref as React.RefObject<HTMLTextAreaElement>, value);
  return (
    <textarea
      ref={ref}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
      style={{ overflow: "hidden" }}
    />
  );
}

function SmallButton({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-black"
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    system: "bg-gray-800 text-white",
    user: "bg-blue-600 text-white",
    assistant: "bg-emerald-600 text-white",
    tool: "bg-amber-600 text-white",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[role] || "bg-slate-600 text-white"}`}>{role}</span>
  );
}

function JSONField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-600">{label}</label>
        <SmallButton onClick={() => onChange(prettify(value))} title="Prettify JSON">
          <Wand2 size={14} /> Prettify
        </SmallButton>
      </div>
      <Textarea value={value} onChange={onChange} placeholder={placeholder} rows={4} />
      {!isJSONString(value || "") && <div className="text-xs text-red-600">Invalid JSON</div>}
    </div>
  );
}

function ToolCallsEditor({ toolCalls, setToolCalls }: { toolCalls: any[]; setToolCalls: (v: any[]) => void; }) {
  const addCall = () => {
    setToolCalls([...toolCalls, { id: uuidv4(), type: "function", function: { name: "", arguments: "{}" } }]);
  };
  const update = (idx: number, patch: any) => {
    const copy = [...toolCalls];
    copy[idx] = { ...copy[idx], ...patch };
    setToolCalls(copy);
  };
  const remove = (idx: number) => {
    const copy = [...toolCalls];
    copy.splice(idx, 1);
    setToolCalls(copy);
  };
  return (
    <div className="mt-2">{/* small margin above tool calls per request */}
      <Collapsible title="Tool calls" defaultOpen={true}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium"><Wrench size={16}/> Tool calls</div>
          <SmallButton onClick={addCall} title="Add tool call"><Plus size={14}/>Add</SmallButton>
        </div>
        {toolCalls.length === 0 && <p className="text-xs text-slate-500">No tool calls yet. Click Add to create one.</p>}
        <div className="space-y-4">
          {toolCalls.map((tc: any, idx: number) => (
            <div key={tc.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">tool_call_id: <code className="font-mono">{tc.id}</code></div>
                <SmallButton onClick={() => remove(idx)} title="Remove this tool call"><Trash2 size={14}/>Remove</SmallButton>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Function name</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={tc.function?.name || ""}
                    onChange={(e) => update(idx, { function: { ...tc.function, name: (e.target as HTMLInputElement).value } })}
                    placeholder="e.g., get_weather"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Type</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={tc.type}
                    onChange={(e) => update(idx, { type: (e.target as HTMLInputElement).value })}
                    placeholder="function"
                  />
                </div>
              </div>
              <div className="mt-2">
                <JSONField
                  label="Arguments (JSON string)"
                  value={tc.function?.arguments ?? "{}"}
                  onChange={(val) => update(idx, { function: { ...tc.function, arguments: val } })}
                  placeholder='{"location": "Dublin"}'
                />
              </div>
            </div>
          ))}
        </div>
      </Collapsible>
    </div>
  );
}

// Unified motion variants for consistent insert/move animations
const itemTransition = { type: "spring", stiffness: 500, damping: 40, mass: 0.5 };
const cardVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 }, // subtle pop-in
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

function MessageCard({ msg, index, onChange, onRemove, onMoveUp, onMoveDown, assistantToolIds }: { msg: any; index: number; onChange: (v: any) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void; assistantToolIds: string[]; }) {
  const isAssistant = msg.role === "assistant";
  const isTool = msg.role === "tool";

  return (
    <motion.div
      layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={cardVariants}
      transition={itemTransition}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RoleBadge role={msg.role} />
          <span className="text-sm font-medium text-slate-700">Message #{index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <SmallButton onClick={onMoveUp} title="Move up"><ArrowUp size={14}/></SmallButton>
          <SmallButton onClick={onMoveDown} title="Move down"><ArrowDown size={14}/></SmallButton>
          <SmallButton onClick={onRemove} title="Delete"><Trash2 size={14}/>Delete</SmallButton>
        </div>
      </div>

      {msg.role !== "tool" && (
        <Collapsible title="Content" defaultOpen={true} previewText={(msg.content ?? "").replace(/\n/g, " ")}> 
          <Textarea
            rows={msg.role === "system" ? 2 : 3}
            value={msg.content ?? ""}
            onChange={(v) => onChange({ ...msg, content: v })}
            placeholder={msg.role === "system" ? "System instruction" : msg.role === "user" ? "What the user says" : "Assistant reply (optional if using tool calls)"}
          />
        </Collapsible>
      )}

      {isAssistant && (
        <ToolCallsEditor
          toolCalls={msg.tool_calls || []}
          setToolCalls={(tc) => onChange({ ...msg, tool_calls: tc })}
        />
      )}

      {isTool && (
        <Collapsible title="Tool response" defaultOpen={true} previewText={(msg.content ?? "").replace(/\n/g, " ")}> 
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">tool_call_id (must match an assistant tool call id)</label>
              <input
                list={`toolids-${index}`}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                value={msg.tool_call_id || ""}
                onChange={(e) => onChange({ ...msg, tool_call_id: (e.target as HTMLInputElement).value })}
                placeholder="uuid of the tool call"
              />
              <datalist id={`toolids-${index}`}>
                {assistantToolIds.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-slate-600">Tool name (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                value={msg.name || ""}
                onChange={(e) => onChange({ ...msg, name: (e.target as HTMLInputElement).value })}
                placeholder="e.g., get_weather"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-600">Tool response (content)</label>
            <Textarea
              rows={3}
              value={msg.content ?? ""}
              onChange={(v) => onChange({ ...msg, content: v })}
              placeholder="Raw tool output as a string"
            />
          </div>
        </Collapsible>
      )}
    </motion.div>
  );
}

// Insert bar that only shows when hovering the interstice (not when hovering cards)
function InsertBar({ onInsert, compact = false }: { onInsert: (role: "system" | "user" | "assistant" | "tool") => void; compact?: boolean; }) {
  const [hover, setHover] = useState(false);
  const heightClass = compact ? "h-0" : "h-6"; // remove top spacing entirely when compact
  return (
    <div
      className={`relative my-0`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Centered dashed line (uses heightClass so it's truly compact when requested) */}
      <div className={`relative ${heightClass}`}>
        <div
          className={`pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed ${
            hover ? "border-slate-300 opacity-100" : "border-slate-200 opacity-0"
          } transition-opacity duration-150`}
        />
      </div>

      {/* Floating controls only when hovering the interstice */}
      {hover && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto -mt-1 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md ring-1 ring-slate-200 px-2 py-1 text-xs shadow-lg transition-opacity duration-150">
            <span className="text-slate-600">Insert</span>
            <button onClick={() => onInsert("system")} className="inline-flex items-center gap-1 rounded-2xl bg-slate-900 px-2 py-1 text-xs text-white shadow hover:bg-slate-800"><FileJson size={14}/>System</button>
            <button onClick={() => onInsert("user")} className="inline-flex items-center gap-1 rounded-2xl bg-blue-600 px-2 py-1 text-xs text-white shadow hover:bg-blue-500"><User size={14}/>User</button>
            <button onClick={() => onInsert("assistant")} className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-2 py-1 text-xs text-white shadow hover:bg-emerald-500"><Bot size={14}/>Assistant</button>
            <button onClick={() => onInsert("tool")} className="inline-flex items-center gap-1 rounded-2xl bg-amber-600 px-2 py-1 text-xs text-white shadow hover:bg-amber-500"><Wrench size={14}/>Tool</button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Main App --------------------
export default function App() {
  // Prevent layout shift when vertical scrollbar appears
  useEffect(() => {
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.overflowY = prev;
    };
  }, []);

  // conversations list
  const [conversations, setConversations] = useState(() => {
    const raw = localStorage.getItem(LS_KEY_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      // ensure IDs exist on messages
      parsed.forEach((c: any) => (c.messages = withIds(c.messages || [DEFAULT_SYSTEM])));
      return parsed;
    }
    const example = makeExampleConversation();
    localStorage.setItem(LS_KEY_LIST, JSON.stringify([example]));
    localStorage.setItem(LS_KEY_ACTIVE, example.id);
    return [example];
  });
  const [activeId, setActiveId] = useState(() => localStorage.getItem(LS_KEY_ACTIVE) || (conversations[0] && conversations[0].id));

  // current conversation derived
  const activeIndex = conversations.findIndex((c: any) => c.id === activeId);
  const active = conversations[activeIndex];

  const [name, setName] = useState(active?.name || "Untitled conversation");
  const [messages, setMessages] = useState<any[]>(active?.messages || withIds([DEFAULT_SYSTEM]));
  const [tools, setTools] = useState(JSON.stringify(active?.tools || DEFAULT_TOOLS, null, 2));

  // keep assistant tool ids
  const assistantToolIds = useMemo(() => {
    const ids: string[] = [];
    for (const m of messages as any[]) {
      if (m.role === "assistant" && Array.isArray(m.tool_calls)) ids.push(...m.tool_calls.map((t: any) => t.id));
    }
    return ids;
  }, [messages]);

  // autosave on change (debounced a bit)
  useEffect(() => {
    const t = setTimeout(() => {
      const cleanedMsgs = messages.map(({ _id, ...rest }) => rest); // strip internal ids for storage/export
      const updated = { id: activeId, name, updatedAt: nowIso(), tools: isJSONString(tools) ? JSON.parse(tools) : [], messages: cleanedMsgs };
      const next = [...conversations];
      const i = next.findIndex((c: any) => c.id === activeId);
      if (i >= 0) next[i] = updated; else next.push(updated);
      next.sort((a: any, b: any) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
      setConversations(next);
      localStorage.setItem(LS_KEY_LIST, JSON.stringify(next));
      localStorage.setItem(LS_KEY_ACTIVE, String(activeId));
    }, 300);
    return () => clearTimeout(t);
  }, [activeId, name, tools, messages]);

  // when switching active, load its state into editors
  useEffect(() => {
    if (!active) return;
    setName(active.name || "Untitled conversation");
    setMessages(withIds(active.messages || [DEFAULT_SYSTEM]));
    setTools(JSON.stringify(active.tools || DEFAULT_TOOLS, null, 2));
  }, [activeId]);

  // DEV TESTS -----------------------------------------------------------
  useEffect(() => {
    // Only run once, safe in production too (just console.assert)
    const tests = () => {
      console.groupCollapsed("Conversation Builder self-tests");
      // isJSONString
      console.assert(isJSONString("{}") === true, "isJSONString should be true for {}");
      console.assert(isJSONString("{") === false, "isJSONString should be false for malformed JSON");
      // uuid available
      console.assert(typeof uuidv4 === "function", "uuidv4 should be a function");
      const gen = uuidv4();
      console.assert(typeof gen === "string" && gen.length >= 30, "uuidv4() should return a string");
      // preview newline replacement
      const prev = ("hello\nworld").replace(/\n/g, " ");
      console.assert(prev === "hello world", "preview should replace newlines with spaces");
      // export payload shape
      const toolId = "t123";
      const testMsgs = [
        { role: "system", content: "sys" },
        { role: "user", content: "u" },
        { role: "assistant", content: null, tool_calls: [{ id: toolId, type: "function", function: { name: "f", arguments: { a: 1 } } }] },
        { role: "tool", tool_call_id: toolId, name: "f", content: "{\"ok\":true}" },
      ];
      const out = buildExportPayload(testMsgs, JSON.stringify(DEFAULT_TOOLS));
      console.assert(Array.isArray(out.messages), "export: messages array");
      const aMsg = out.messages.find((m: any) => m.role === "assistant");
      console.assert(aMsg.tool_calls[0].function.arguments === "{\"a\":1}", "export: function.arguments is stringified");
      const tMsg = out.messages.find((m: any) => m.role === "tool");
      console.assert(!!tMsg.tool_call_id, "export: tool_call_id present");
      // extra: tools fallback
      const out2 = buildExportPayload(testMsgs, "not-json");
      console.assert(Array.isArray(out2.tools), "export: tools fallback to [] on bad json");
      // messages length preserved
      console.assert(out.messages.length === testMsgs.length, "export: preserves message count");
      console.groupEnd();
    };
    tests();
  }, []);

  // message operations
  const addMessage = (role: "system" | "user" | "assistant" | "tool") => {
    const base: any = { role, _id: uuidv4() };
    if (role === "assistant") base.tool_calls = [];
    if (role !== "tool") base.content = "";
    if (role === "tool") base.tool_call_id = assistantToolIds[assistantToolIds.length - 1] || "";
    setMessages((prev: any[]) => [...prev, base]);
  };

  const insertMessageAt = (idx: number, role: "system" | "user" | "assistant" | "tool") => {
    const base: any = { role, _id: uuidv4() };
    if (role === "assistant") base.tool_calls = [];
    if (role !== "tool") base.content = "";
    if (role === "tool") base.tool_call_id = assistantToolIds[assistantToolIds.length - 1] || "";
    setMessages((prev: any[]) => {
      const copy = [...prev];
      copy.splice(idx, 0, base);
      return copy;
    });
  };

  const updateMessage = (idx: number, next: any) => {
    setMessages((prev: any[]) => prev.map((m, i) => (i === idx ? { ...next, _id: m._id } : m)) as any);
  };

  const removeMessage = (idx: number) => {
    setMessages((prev: any[]) => prev.filter((_, i) => i !== idx) as any);
  };

  const moveMessage = (idx: number, dir: number) => {
    setMessages((prev: any[]) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [m] = copy.splice(idx, 1);
      copy.splice(j, 0, m);
      return copy as any;
    });
  };

  const exportJSON = () => {
    const payload = buildExportPayload(messages as any[], tools);
    const fname = `${name || "conversation"}.json`;
    download(fname, JSON.stringify(payload, null, 2));
  };

  const importJSON = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      setMessages(withIds(Array.isArray(parsed.messages) ? parsed.messages : [DEFAULT_SYSTEM]));
      setTools(JSON.stringify(parsed.tools || [], null, 2));
    } catch {
      alert("Invalid JSON file");
    }
  };

  // conversations sidebar actions
  const newConversation = () => {
    const c = { id: uuidv4(), name: "Untitled conversation", updatedAt: nowIso(), tools: DEFAULT_TOOLS, messages: withIds([DEFAULT_SYSTEM]) };
    const next = [c, ...conversations];
    setConversations(next);
    localStorage.setItem(LS_KEY_LIST, JSON.stringify(next));
    setActiveId(c.id);
  };

  const duplicateConversation = (id: string) => {
    const src = (conversations as any[]).find((c) => c.id === id);
    if (!src) return;
    const copy = { ...src, id: uuidv4(), name: src.name + " (copy)", updatedAt: nowIso() };
    const next = [copy, ...conversations];
    setConversations(next);
    localStorage.setItem(LS_KEY_LIST, JSON.stringify(next));
    setActiveId(copy.id);
  };

  const deleteConversation = (id: string) => {
    const next = (conversations as any[]).filter((c) => c.id !== id);
    setConversations(next);
    localStorage.setItem(LS_KEY_LIST, JSON.stringify(next));
    if (activeId === id && next.length) setActiveId(next[0].id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex w-full items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <MessageSquare />
            <input
              className="w-full md:w-[28rem] rounded-2xl border border-slate-300 bg-white px-4 py-2 text-base font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <SmallButton onClick={exportJSON} title="Export JSON"><Download size={14}/>Export</SmallButton>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs shadow-sm hover:bg-slate-50">
              <Upload size={14}/> Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            </label>
          </div>
        </div>
      </header>

      <main className="grid w-full grid-cols-1 gap-3 px-3 py-3 md:grid-cols-12">
        {/* Left sidebar: conversations */}
        <aside className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Conversations</div>
            <div className="flex items-center gap-2">
              <SmallButton onClick={newConversation} title="New conversation"><FolderPlus size={14}/>New</SmallButton>
            </div>
          </div>
          <div className="space-y-1">
            {(conversations as any[])
              .slice()
              .sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf())
              .map((c) => (
                <div
                  key={c.id}
                  className={`group relative flex items-center justify-between rounded-xl border px-3 py-2 text-sm shadow-sm ${
                    c.id === activeId ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <button onClick={() => setActiveId(c.id)} className="truncate text-left">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{new Date(c.updatedAt).toLocaleString()}</div>
                  </button>
                  <div className="ml-2 hidden items-center gap-1 group-hover:flex">
                    <SmallButton onClick={() => duplicateConversation(c.id)} title="Duplicate"><Copy size={14}/></SmallButton>
                    <SmallButton onClick={() => deleteConversation(c.id)} title="Delete"><Trash size={14}/></SmallButton>
                  </div>
                </div>
              ))}
          </div>
        </aside>

        {/* Editor column */}
        <section className="md:col-span-9">
          {/* Top insert bar */}
          <div>
            <InsertBar compact onInsert={(role) => insertMessageAt(0, role)} />
          </div>

          <AnimatePresence initial={false} mode="sync">
            {(messages as any[]).map((msg, idx) => (
              <div key={msg._id}>
                <MessageCard
                  msg={msg}
                  index={idx}
                  assistantToolIds={assistantToolIds}
                  onChange={(next) => updateMessage(idx, next)}
                  onRemove={() => removeMessage(idx)}
                  onMoveUp={() => moveMessage(idx, -1)}
                  onMoveDown={() => moveMessage(idx, +1)}
                />
                {/* Insert bar only BETWEEN items, not after last */}
                {idx < messages.length - 1 && <InsertBar onInsert={(role) => insertMessageAt(idx + 1, role)} />}
              </div>
            ))}
          </AnimatePresence>

          {/* Centered add buttons below last message */}
          <div className="mt-4 flex w-full items-center justify-center">
            <div className="inline-flex items-center gap-2">
              <button onClick={() => addMessage("system")} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white shadow hover:bg-slate-800"><FileJson size={16}/>Add System</button>
              <button onClick={() => addMessage("user")} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white shadow hover:bg-blue-500"><User size={16}/>Add User</button>
              <button onClick={() => addMessage("assistant")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-sm text-white shadow hover:bg-emerald-500"><Bot size={16}/>Add Assistant</button>
              <button onClick={() => addMessage("tool")} className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-3 py-2 text-sm text-white shadow hover:bg-amber-500"><Wrench size={16}/>Add Tool Response</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
