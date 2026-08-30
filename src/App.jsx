import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Lock, CheckCircle2, RotateCcw, Settings,
  ArrowRight, Phone, UtensilsCrossed, Sparkles, LogOut,
  ShieldCheck, Clock, Save, Eye, EyeOff
} from "lucide-react";
import {
  getConfig, setConfig as saveConfigRemote,
  getParticipation, setParticipation, deleteParticipation,
  getHistory, addHistoryEntry,
} from "./storage";

/* ---------- Palette ---------- */
const C = {
  espresso: "#3B2620",
  espressoDeep: "#241512",
  cream: "#F7EFE3",
  creamSoft: "#EFE3CF",
  amber: "#E8A33D",
  amberDeep: "#C97F1F",
  clay: "#C1542C",
  mint: "#7FAE8C",
  ink: "#231512",
  inkSoft: "#6B5A50",
};

const DEFAULT_CONFIG = {
  businessName: "El Paisa - Tony",
  tagline: "Sabor de casa, premio de la casa.",
  terms:
    "Al continuar aceptas que El Paisa - Tony guarde tu nombre y tu número de celular para gestionar tu participación en este sorteo, avisarte de promociones y mejorar nuestro menú según tus gustos. No compartimos tus datos con terceros. Puedes pedir que los eliminemos preguntando en caja.",
  surveyQuestion: "¿Qué te gustaría ver pronto en la carta?",
  surveyOptions: [
    { label: "Bandeja paisa especial", emoji: "🍽️" },
    { label: "Postre típico de la casa", emoji: "🍮" },
    { label: "Jugo natural nuevo sabor", emoji: "🥤" },
  ],
  prizes: [
    { isPrize: true, name: "Bandeja paisa a mitad de precio", emoji: "🍽️" },
    { isPrize: true, name: "Postre de la casa gratis", emoji: "🍮" },
    { isPrize: true, name: "Gaseosa o jugo gratis", emoji: "🥤" },
    { isPrize: true, name: "10% de descuento en tu próxima visita", emoji: "🏷️" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
    { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" },
  ],
  adminPassword: "1234",
};

function cleanPhone(v) {
  return v.replace(/\D/g, "");
}
function normalizePeruPhone(raw) {
  let digits = cleanPhone(raw);
  if (digits.length === 11 && digits.startsWith("51")) digits = digits.slice(2);
  return digits;
}
function isValidPeruPhone(raw) {
  return /^9\d{8}$/.test(normalizePeruPhone(raw));
}
function hoursSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}
function fmtRemaining(iso) {
  const remainMs = 24 * 36e5 - (Date.now() - new Date(iso).getTime());
  if (remainMs <= 0) return "0h 0m";
  const h = Math.floor(remainMs / 36e5);
  const m = Math.floor((remainMs % 36e5) / 60000);
  return `${h}h ${m}m`;
}
function weightedPrizeIndex(count) {
  const weights = Array.from({ length: count }, (_, i) => i + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

/* ---------- Primitives ---------- */
function Screen({ children }) {
  return (
    <div style={{ background: C.espresso, minHeight: "620px" }} className="w-full rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div style={{ background: `radial-gradient(circle at 30% 20%, ${C.amber}22, transparent 55%)` }} className="absolute inset-0 pointer-events-none" />
      <div className="relative w-full max-w-sm flex flex-col items-center">{children}</div>
    </div>
  );
}
function Eyebrow({ children }) {
  return <div style={{ color: C.amber, letterSpacing: "0.2em" }} className="text-xs font-semibold uppercase mb-3">{children}</div>;
}
function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#8a6a55" : C.amber, color: C.espressoDeep, opacity: disabled ? 0.6 : 1 }}
      className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
      {children}
    </button>
  );
}
function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ color: C.cream, borderColor: `${C.cream}44` }} className="w-full py-3 rounded-2xl font-semibold border flex items-center justify-center gap-2">
      {children}
    </button>
  );
}

/* ================= CUSTOMER FLOW ================= */
function Landing({ config, onStart, onAdmin }) {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Screen>
      <div style={{ background: C.creamSoft, color: C.espressoDeep }} className="rounded-2xl px-4 py-1 text-xs font-bold mb-6 tracking-wide">
        PROGRAMA DE FIDELIZACIÓN
      </div>
      <UtensilsCrossed size={40} color={C.amber} />
      <h1 style={{ color: C.cream }} className="text-3xl font-bold text-center mt-4 mb-1">{config.businessName}</h1>
      <p style={{ color: `${C.cream}aa` }} className="text-center mb-8">{config.tagline}</p>

      <div style={{ background: C.cream }} className="rounded-3xl p-6 flex flex-col items-center mb-6 w-full">
        <div style={{ borderColor: C.espresso }} className="border-4 rounded-2xl p-3 mb-3 bg-white">
          <QRCodeSVG value={siteUrl} size={140} bgColor="#ffffff" fgColor={C.espresso} level="M" />
        </div>
        <p style={{ color: C.inkSoft }} className="text-xs text-center">
          Escanea este código en el mostrador después de tu compra
        </p>
      </div>

      <PrimaryButton onClick={onStart}>Ya escaneé, continuar <ArrowRight size={18} /></PrimaryButton>

      <button onClick={onAdmin} style={{ color: `${C.cream}77` }} className="mt-6 text-xs flex items-center gap-1">
        <Settings size={13} /> Panel del negocio
      </button>
    </Screen>
  );
}

function PhoneStep({ onSubmit, loading }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const validName = name.trim().length >= 2;
  const validPhone = isValidPeruPhone(phone);
  const showPhoneError = touched && phone.length > 0 && !validPhone;
  return (
    <Screen>
      <Eyebrow>Paso 1 de 4</Eyebrow>
      <Phone size={32} color={C.amber} />
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-4 mb-2">Cuéntanos quién eres</h2>
      <p style={{ color: `${C.cream}99` }} className="text-sm text-center mb-6">
        Tu celular nos sirve para que solo puedas jugar una vez cada 24 horas
      </p>
      <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Tu nombre"
        style={{ background: C.cream, color: C.ink }} className="w-full text-center text-lg py-3.5 rounded-2xl mb-3 font-semibold outline-none" />
      <input value={phone} onChange={(e) => setPhone(cleanPhone(e.target.value).slice(0, 9))} onBlur={() => setTouched(true)}
        inputMode="numeric" placeholder="987654321"
        style={{ background: C.cream, color: C.ink, borderColor: showPhoneError ? C.clay : "transparent" }}
        className="w-full text-center text-xl tracking-widest py-3.5 rounded-2xl mb-1 font-semibold outline-none border-2" />
      <div style={{ minHeight: "20px" }} className="w-full mb-3">
        {showPhoneError && (
          <p style={{ color: C.clay }} className="text-xs text-center">
            Ese no es un celular peruano válido. Deben ser 9 dígitos y empezar con 9.
          </p>
        )}
      </div>
      <PrimaryButton disabled={!validPhone || !validName || loading} onClick={() => onSubmit(name.trim(), normalizePeruPhone(phone))}>
        {loading ? "Verificando..." : "Continuar"} <ArrowRight size={18} />
      </PrimaryButton>
    </Screen>
  );
}

function Blocked({ lastPlayISO, onBack }) {
  return (
    <Screen>
      <Clock size={36} color={C.amber} />
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-4 mb-2">Ya jugaste hoy</h2>
      <p style={{ color: `${C.cream}99` }} className="text-sm text-center mb-6">Vuelve a intentarlo en aproximadamente</p>
      <div style={{ background: C.creamSoft, color: C.espressoDeep }} className="rounded-2xl px-6 py-3 font-bold text-xl mb-8">
        {fmtRemaining(lastPlayISO)}
      </div>
      <GhostButton onClick={onBack}>Volver al inicio</GhostButton>
    </Screen>
  );
}

function Terms({ config, onAccept }) {
  const [checked, setChecked] = useState(false);
  return (
    <Screen>
      <Eyebrow>Paso 2 de 4</Eyebrow>
      <ShieldCheck size={32} color={C.amber} />
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-4 mb-4">Uso de tus datos</h2>
      <div style={{ background: C.cream, color: C.inkSoft, maxHeight: "180px" }} className="w-full rounded-2xl p-4 text-sm overflow-y-auto mb-4 leading-relaxed">
        {config.terms}
      </div>
      <label className="flex items-start gap-3 mb-6 cursor-pointer w-full">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 w-5 h-5 shrink-0" />
        <span style={{ color: C.cream }} className="text-sm">Acepto los términos y el uso de mis datos como se describe arriba.</span>
      </label>
      <PrimaryButton disabled={!checked} onClick={onAccept}>Aceptar y continuar <ArrowRight size={18} /></PrimaryButton>
    </Screen>
  );
}

function Survey({ config, onAnswer }) {
  const [picked, setPicked] = useState(null);
  return (
    <Screen>
      <Eyebrow>Paso 3 de 4</Eyebrow>
      <Sparkles size={32} color={C.amber} />
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-4 mb-6">{config.surveyQuestion}</h2>
      <div className="w-full flex flex-col gap-3 mb-6">
        {config.surveyOptions.map((opt, i) => (
          <button key={i} onClick={() => setPicked(i)}
            style={{ background: picked === i ? C.amber : C.cream, color: C.espressoDeep, borderColor: picked === i ? C.amberDeep : "transparent" }}
            className="w-full py-4 rounded-2xl font-semibold flex items-center gap-3 px-4 border-2 transition-colors">
            <span className="text-2xl">{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
      <PrimaryButton disabled={picked === null} onClick={() => onAnswer(config.surveyOptions[picked]?.label)}>
        Jugar ahora <ArrowRight size={18} />
      </PrimaryButton>
    </Screen>
  );
}

function Game({ onFinish, prizeCount }) {
  const [phase, setPhase] = useState("idle");
  const [prizeIdx] = useState(() => weightedPrizeIndex(prizeCount));
  const play = () => {
    setPhase("dropping");
    setTimeout(() => setPhase("cracking"), 1100);
    setTimeout(() => { setPhase("done"); onFinish(prizeIdx); }, 1900);
  };
  return (
    <Screen>
      <Eyebrow>¡Última parada!</Eyebrow>
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-2 mb-6">Gira la máquina de la suerte</h2>
      <div style={{ background: C.cream, height: "230px" }} className="w-full rounded-3xl relative overflow-hidden flex items-end justify-center mb-6">
        <div style={{ background: C.espresso, width: "56px", height: "150px", top: "10px" }} className="absolute left-1/2 -translate-x-1/2 rounded-b-full" />
        <div style={{ fontSize: "40px", transition: "top 1.1s cubic-bezier(.4,0,.2,1), transform 0.4s", top: phase === "idle" ? "20px" : "170px", transform: phase === "cracking" || phase === "done" ? "scale(1.5)" : "scale(1)" }} className="absolute left-1/2 -translate-x-1/2">
          {phase === "cracking" || phase === "done" ? "✨" : "🔮"}
        </div>
        {phase === "idle" && <p style={{ color: C.inkSoft }} className="text-xs mb-4 relative">Presiona el botón para soltar tu ficha</p>}
      </div>
      <PrimaryButton disabled={phase !== "idle"} onClick={play}>
        {phase === "idle" ? "Soltar ficha" : "Girando..."} <Sparkles size={18} />
      </PrimaryButton>
    </Screen>
  );
}

function Result({ prize, onDone }) {
  const won = prize?.isPrize;
  return (
    <Screen>
      <div style={{ background: won ? C.mint : C.creamSoft, width: 90, height: 90 }} className="rounded-full flex items-center justify-center text-5xl mb-6">
        {prize?.emoji || "🍀"}
      </div>
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mb-2">{won ? "¡Ganaste!" : "¡Casi!"}</h2>
      <p style={{ color: won ? C.mint : `${C.cream}bb` }} className="text-lg font-semibold text-center mb-8">{prize?.name}</p>
      {won && <p style={{ color: `${C.cream}99` }} className="text-xs text-center mb-6">Muestra esta pantalla en el mostrador para reclamarlo</p>}
      <GhostButton onClick={onDone}><RotateCcw size={16} /> Volver al inicio</GhostButton>
    </Screen>
  );
}

/* ================= ADMIN ================= */
function AdminLogin({ config, onOk, onBack }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <Screen>
      <Lock size={30} color={C.amber} />
      <h2 style={{ color: C.cream }} className="text-xl font-bold text-center mt-4 mb-6">Acceso del negocio</h2>
      <div className="w-full relative mb-2">
        <input type={show ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }}
          placeholder="Contraseña" style={{ background: C.cream, color: C.ink }} className="w-full py-3.5 rounded-2xl px-4 pr-12 outline-none" />
        <button onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2">
          {show ? <EyeOff size={18} color={C.inkSoft} /> : <Eye size={18} color={C.inkSoft} />}
        </button>
      </div>
      {err && <p style={{ color: C.clay }} className="text-xs mb-3 self-start">Contraseña incorrecta</p>}
      <div className="w-full mt-3 flex flex-col gap-3">
        <PrimaryButton onClick={() => (pw === config.adminPassword ? onOk() : setErr(true))}>Entrar</PrimaryButton>
        <GhostButton onClick={onBack}>Cancelar</GhostButton>
      </div>
    </Screen>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4 w-full">
      <label style={{ color: C.inkSoft }} className="text-xs font-bold uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { background: "#fff", color: C.ink, border: `1px solid ${C.creamSoft}` };

function AdminPanel({ config, setConfig, history, onSave, onLogout, onResetPhone, saving }) {
  const [tab, setTab] = useState("general");
  const [resetPhone, setResetPhone] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const updatePrize = (i, patch) => setConfig({ ...config, prizes: config.prizes.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const updateOption = (i, patch) => setConfig({ ...config, surveyOptions: config.surveyOptions.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });

  return (
    <div style={{ background: C.cream, minHeight: "620px" }} className="w-full rounded-3xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ color: C.espressoDeep }} className="text-xl font-bold">Panel del negocio</h2>
          <p style={{ color: C.inkSoft }} className="text-xs">{config.businessName}</p>
        </div>
        <button onClick={onLogout} style={{ color: C.clay }} className="flex items-center gap-1 text-xs font-semibold">
          <LogOut size={14} /> Salir
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[["general", "General"], ["encuesta", "Encuesta"], ["premios", "Premios"], ["historial", "Historial"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: tab === id ? C.espresso : "#fff", color: tab === id ? C.cream : C.inkSoft }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold">
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div>
          <Field label="Nombre del negocio">
            <input value={config.businessName} onChange={(e) => setConfig({ ...config, businessName: e.target.value })} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none" />
          </Field>
          <Field label="Frase corta (tagline)">
            <input value={config.tagline} onChange={(e) => setConfig({ ...config, tagline: e.target.value })} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none" />
          </Field>
          <Field label="Términos y uso de datos">
            <textarea value={config.terms} onChange={(e) => setConfig({ ...config, terms: e.target.value })} rows={5} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none resize-none" />
          </Field>
          <Field label="Contraseña de administrador">
            <input value={config.adminPassword} onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none" />
          </Field>
        </div>
      )}

      {tab === "encuesta" && (
        <div>
          <Field label="Pregunta de la encuesta">
            <input value={config.surveyQuestion} onChange={(e) => setConfig({ ...config, surveyQuestion: e.target.value })} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none" />
          </Field>
          {config.surveyOptions.map((opt, i) => (
            <div key={i} className="flex gap-2 mb-3">
              <input value={opt.emoji} onChange={(e) => updateOption(i, { emoji: e.target.value })} style={inputStyle} className="w-14 py-2.5 text-center rounded-xl outline-none" />
              <input value={opt.label} onChange={(e) => updateOption(i, { label: e.target.value })} placeholder={`Opción ${i + 1}`} style={inputStyle} className="flex-1 py-2.5 px-3 rounded-xl outline-none" />
            </div>
          ))}
        </div>
      )}

      {tab === "premios" && (
        <div>
          <p style={{ color: C.inkSoft }} className="text-xs mb-3">
            La ficha <b>1</b> es la <b>menos probable</b> y la ficha <b>10</b> es la <b>más probable</b>.
            Pon tus premios más valiosos arriba (1-3) y los mensajes de "sigue participando" abajo (8-10).
          </p>
          {config.prizes.map((p, i) => (
            <div key={i} style={{ background: "#fff" }} className="flex items-center gap-2 mb-2 p-2 rounded-xl">
              <span style={{ color: C.inkSoft }} className="text-xs w-4">{i + 1}</span>
              <input value={p.emoji} onChange={(e) => updatePrize(i, { emoji: e.target.value })} style={inputStyle} className="w-12 py-2 text-center rounded-lg outline-none" />
              <input value={p.name} onChange={(e) => updatePrize(i, { name: e.target.value })} style={inputStyle} className="flex-1 py-2 px-2 rounded-lg outline-none text-sm" />
              <label className="flex items-center gap-1 text-xs shrink-0" style={{ color: C.inkSoft }}>
                <input type="checkbox" checked={p.isPrize} onChange={(e) => updatePrize(i, { isPrize: e.target.checked })} />
                Premio
              </label>
            </div>
          ))}
        </div>
      )}

      {tab === "historial" && (
        <div>
          <div style={{ background: "#fff" }} className="rounded-xl p-3 mb-4">
            <p style={{ color: C.inkSoft }} className="text-xs font-bold uppercase mb-2">Desbloquear un teléfono</p>
            <div className="flex gap-2">
              <input value={resetPhone} onChange={(e) => setResetPhone(cleanPhone(e.target.value).slice(0, 9))} placeholder="987654321" style={inputStyle} className="flex-1 py-2 px-3 rounded-lg outline-none text-sm" />
              <button onClick={async () => {
                if (!resetPhone) return;
                await onResetPhone(resetPhone);
                setResetMsg(`Listo, ${resetPhone} puede jugar de nuevo`);
                setResetPhone("");
                setTimeout(() => setResetMsg(""), 3000);
              }} style={{ background: C.amber, color: C.espressoDeep }} className="px-4 rounded-lg text-sm font-bold">
                Reset
              </button>
            </div>
            {resetMsg && <p style={{ color: C.mint }} className="text-xs mt-2">{resetMsg}</p>}
          </div>

          <p style={{ color: C.inkSoft }} className="text-xs font-bold uppercase mb-2">Últimas jugadas</p>
          {history.length === 0 && <p style={{ color: C.inkSoft }} className="text-sm">Todavía no hay participaciones.</p>}
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <div key={i} style={{ background: "#fff" }} className="flex items-center justify-between p-2.5 rounded-xl text-xs gap-2">
                <div className="flex flex-col shrink-0 max-w-[110px]">
                  <span style={{ color: C.ink }} className="font-semibold truncate">{h.name || "Sin nombre"}</span>
                  <span style={{ color: C.inkSoft }} className="text-[10px]">{h.phone}</span>
                </div>
                <span style={{ color: C.inkSoft }} className="shrink-0">{new Date(h.date).toLocaleDateString()}</span>
                <span style={{ color: h.won ? C.mint : C.inkSoft }} className="font-bold text-right shrink-0">
                  {h.won ? "🎁 " : ""}{h.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onSave} disabled={saving} style={{ background: C.espresso, color: C.cream }} className="w-full mt-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2">
        <Save size={16} /> {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ================= APP ================= */
export default function App() {
  const [route, setRoute] = useState("landing");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [lastPlayISO, setLastPlayISO] = useState(null);
  const [surveyAnswer, setSurveyAnswer] = useState("");
  const [prizeResult, setPrizeResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    const remote = await getConfig();
    if (remote) {
      setConfig(remote);
    } else {
      setConfig(DEFAULT_CONFIG);
      await saveConfigRemote(DEFAULT_CONFIG);
    }
    setLoaded(true);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistory(await getHistory());
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handlePhoneSubmit = async (name, num) => {
    setChecking(true);
    setCustomerName(name);
    setPhone(num);
    const existing = await getParticipation(num);
    if (existing && hoursSince(existing.lastPlayISO) < 24) {
      setLastPlayISO(existing.lastPlayISO);
      setChecking(false);
      setRoute("blocked");
      return;
    }
    setChecking(false);
    setRoute("terms");
  };

  const finishGame = async (prizeIdx) => {
    const prize = config.prizes[prizeIdx];
    setPrizeResult(prize);
    const nowISO = new Date().toISOString();
    await setParticipation(phone, { lastPlayISO: nowISO, result: prize.name, name: customerName });
    await addHistoryEntry({
      phone, name: customerName, date: nowISO,
      result: prize.name, won: prize.isPrize, survey: surveyAnswer,
    });
    setRoute("result");
  };

  const resetAll = () => {
    setPhone(""); setCustomerName(""); setSurveyAnswer(""); setPrizeResult(null);
    setRoute("landing");
  };

  const saveConfig = async () => {
    setSaving(true);
    await saveConfigRemote(config);
    setSaving(false);
  };

  const resetPhoneLock = async (num) => { await deleteParticipation(num); };

  if (!loaded) {
    return (
      <div style={{ background: C.espresso, minHeight: "620px" }} className="w-full max-w-md mx-auto rounded-3xl flex items-center justify-center">
        <UtensilsCrossed size={30} color={C.amber} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {route === "landing" && <Landing config={config} onStart={() => setRoute("phone")} onAdmin={() => setRoute("adminLogin")} />}
      {route === "phone" && <PhoneStep onSubmit={handlePhoneSubmit} loading={checking} />}
      {route === "blocked" && <Blocked lastPlayISO={lastPlayISO} onBack={resetAll} />}
      {route === "terms" && <Terms config={config} onAccept={() => setRoute("survey")} />}
      {route === "survey" && <Survey config={config} onAnswer={(ans) => { setSurveyAnswer(ans); setRoute("game"); }} />}
      {route === "game" && <Game onFinish={finishGame} prizeCount={config.prizes.length} />}
      {route === "result" && <Result prize={prizeResult} onDone={resetAll} />}
      {route === "adminLogin" && <AdminLogin config={config} onOk={() => { loadHistory(); setRoute("admin"); }} onBack={() => setRoute("landing")} />}
      {route === "admin" && (
        <AdminPanel config={config} setConfig={setConfig} history={history} saving={saving}
          onSave={saveConfig} onLogout={() => setRoute("landing")} onResetPhone={resetPhoneLock} />
      )}
    </div>
  );
}
