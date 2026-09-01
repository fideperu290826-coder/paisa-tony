import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import {
  Lock, CheckCircle2, RotateCcw, Settings,
  ArrowRight, Phone, UtensilsCrossed, Sparkles, LogOut,
  ShieldCheck, Clock, Save, Eye, EyeOff, MessageCircle,
  Plus, Trash2, BarChart3, Repeat, Trophy, Download,
  TrendingUp, TrendingDown, AlertTriangle
} from "lucide-react";
import {
  getConfig, setConfig as saveConfigRemote,
  getParticipation, setParticipation, deleteParticipation,
  getHistory, getFullHistory, addHistoryEntry, deleteRoundHistory,
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
  whatsappCommunityLink: "",
  whatsappCommunityPerks: [
    "Ve el menú del día antes que nadie",
    "Pide tu delivery directo por WhatsApp",
    "Encarga tu pedido y recógelo listo",
  ],
  whatsappMessageTemplate: "¡Hola {nombre}! Te escribimos de El Paisa - Tony 🍽️ Tenemos algo especial para ti, ¿tienes un momento?",
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

const WHEEL_SIZE = 270;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const LABEL_RADIUS = 100;

function segmentLabelPos(index, segmentDeg) {
  const angleDeg = index * segmentDeg + segmentDeg / 2;
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: WHEEL_CENTER + LABEL_RADIUS * Math.cos(angleRad),
    y: WHEEL_CENTER + LABEL_RADIUS * Math.sin(angleRad),
  };
}

function buildWheelGradient(count, segmentDeg) {
  const colors = [C.creamSoft, C.cream];
  const stops = [];
  for (let i = 0; i < count; i++) {
    const color = colors[i % 2];
    stops.push(`${color} ${i * segmentDeg}deg ${(i + 1) * segmentDeg}deg`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

function Game({ onFinish, prizes }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prizeIdx] = useState(() => weightedPrizeIndex(prizes.length));
  const segmentDeg = 360 / prizes.length;

  const play = () => {
    if (spinning) return;
    setSpinning(true);
    const targetCenterDeg = prizeIdx * segmentDeg + segmentDeg / 2;
    const fullSpins = 6;
    const finalRotation = fullSpins * 360 + (360 - targetCenterDeg);
    setRotation(finalRotation);
    setTimeout(() => onFinish(prizeIdx), 4200);
  };

  return (
    <Screen>
      <Eyebrow>¡Última parada!</Eyebrow>
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mt-2 mb-6">
        Gira la ruleta de la suerte
      </h2>

      <div style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }} className="relative mb-6">
        {/* pointer, fixed, does not rotate */}
        <div
          style={{
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: `18px solid ${C.clay}`,
            top: "-6px",
          }}
          className="absolute left-1/2 -translate-x-1/2 z-10"
        />
        {/* wheel */}
        <div
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            background: buildWheelGradient(prizes.length, segmentDeg),
            border: `5px solid ${C.espressoDeep}`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.2s cubic-bezier(0.15, 0.65, 0.15, 1)" : "none",
          }}
          className="rounded-full relative"
        >
          {prizes.map((p, i) => {
            const { x, y } = segmentLabelPos(i, segmentDeg);
            return (
              <div
                key={i}
                style={{ left: x, top: y, fontSize: "22px" }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                {p.emoji}
              </div>
            );
          })}
          <div
            style={{ background: C.espressoDeep, width: 22, height: 22 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          />
        </div>
      </div>

      <PrimaryButton disabled={spinning} onClick={play}>
        {spinning ? "Girando..." : "Girar la ruleta"} <Sparkles size={18} />
      </PrimaryButton>
    </Screen>
  );
}

function Result({ prize, onDone, communityLink, perks = [] }) {
  const won = prize?.isPrize;
  return (
    <Screen>
      <div style={{ background: won ? C.mint : C.creamSoft, width: 90, height: 90 }} className="rounded-full flex items-center justify-center text-5xl mb-6">
        {prize?.emoji || "🍀"}
      </div>
      <h2 style={{ color: C.cream }} className="text-2xl font-bold text-center mb-2">{won ? "¡Ganaste!" : "¡Casi!"}</h2>
      <p style={{ color: won ? C.mint : `${C.cream}bb` }} className="text-lg font-semibold text-center mb-6">{prize?.name}</p>
      {won && <p style={{ color: `${C.cream}99` }} className="text-xs text-center mb-6">Muestra esta pantalla en el mostrador para reclamarlo</p>}

      {communityLink && (
        <div style={{ background: C.cream }} className="w-full rounded-2xl p-4 mb-3">
          <p style={{ color: C.espressoDeep }} className="text-sm font-bold text-center mb-3">
            🔥 Únete a nuestra comunidad y desbloquea:
          </p>
          <div className="flex flex-col gap-2 mb-1">
            {perks.filter(Boolean).map((perk, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={16} color={C.mint} className="shrink-0" />
                <span style={{ color: C.inkSoft }} className="text-xs">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {communityLink && (
        <a
          href={communityLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#25D366", color: "#0b1a10" }}
          className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 mb-3"
        >
          <MessageCircle size={18} /> Únete a la comunidad de WhatsApp
        </a>
      )}

      <GhostButton onClick={onDone}><RotateCcw size={16} /> Volver al inicio</GhostButton>
    </Screen>
  );
}

function computeDashboard(fullHistory, hiddenRounds = []) {
  const hiddenSet = new Set(hiddenRounds);
  const sorted = [...fullHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  const roundsMap = new Map();
  for (const h of sorted) {
    const q = h.surveyQuestion || h.survey;
    if (!q) continue;
    if (!roundsMap.has(q)) roundsMap.set(q, { question: q, entries: [], firstDate: h.date, lastDate: h.date });
    const r = roundsMap.get(q);
    r.entries.push(h);
    r.lastDate = h.date;
  }

  const allRounds = Array.from(roundsMap.values()).map((r, idx) => {
    const tally = {};
    for (const e of r.entries) {
      const ans = e.surveyAnswer || e.survey || "Sin respuesta";
      tally[ans] = (tally[ans] || 0) + 1;
    }
    const results = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    return {
      roundNumber: idx + 1,
      question: r.question,
      total: r.entries.length,
      firstDate: r.firstDate,
      lastDate: r.lastDate,
      results,
      winner: results[0] ? results[0][0] : null,
      hidden: hiddenSet.has(r.question),
    };
  });

  const visibleRounds = allRounds.filter((r) => !r.hidden).slice().reverse();
  const hiddenRoundsList = allRounds.filter((r) => r.hidden).slice().reverse();

  // Tendencias: para cada opción que aparece en 2+ rondas visibles, comparamos su % a lo largo del tiempo
  const trendMap = new Map();
  for (const r of allRounds.filter((r) => !r.hidden)) {
    for (const [label, count] of r.results) {
      const pct = r.total ? Math.round((count / r.total) * 100) : 0;
      if (!trendMap.has(label)) trendMap.set(label, []);
      trendMap.get(label).push({ roundNumber: r.roundNumber, pct });
    }
  }
  const trends = Array.from(trendMap.entries())
    .filter(([, points]) => points.length >= 2)
    .map(([label, points]) => {
      points.sort((a, b) => a.roundNumber - b.roundNumber);
      const first = points[0].pct;
      const last = points[points.length - 1].pct;
      return { label, points, change: last - first };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Clientes recurrentes solo contando jugadas dentro de rondas visibles + jugadas sin ronda (sin encuesta)
  const excludedQuestions = new Set(hiddenRounds);
  const relevantHistory = fullHistory.filter((h) => {
    const q = h.surveyQuestion || h.survey;
    return !q || !excludedQuestions.has(q);
  });

  const byPhone = new Map();
  for (const h of relevantHistory) {
    if (!h.phone) continue;
    if (!byPhone.has(h.phone)) {
      byPhone.set(h.phone, { phone: h.phone, name: h.name, count: 0, wins: 0, lastDate: h.date, firstDate: h.date });
    }
    const p = byPhone.get(h.phone);
    p.count += 1;
    if (h.won) p.wins += 1;
    if (new Date(h.date) > new Date(p.lastDate)) p.lastDate = h.date;
    if (new Date(h.date) < new Date(p.firstDate)) p.firstDate = h.date;
    if (h.name) p.name = h.name;
  }
  const recurring = Array.from(byPhone.values())
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count);

  const noPrizeStreaks = recurring.filter((p) => p.count >= 5 && p.wins === 0);

  return {
    totalPlays: relevantHistory.length,
    uniqueCustomers: byPhone.size,
    totalWins: relevantHistory.filter((h) => h.won).length,
    rounds: visibleRounds,
    hiddenRoundsList,
    recurring,
    noPrizeStreaks,
    trends,
  };
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
  const [fullHistoryData, setFullHistoryData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [showHiddenRounds, setShowHiddenRounds] = useState(false);

  useEffect(() => {
    if (tab === "dashboard" && fullHistoryData === null && !dashboardLoading) {
      setDashboardLoading(true);
      getFullHistory().then((full) => {
        setFullHistoryData(full);
        setDashboardLoading(false);
      });
    }
  }, [tab, fullHistoryData, dashboardLoading]);

  const dashboard = fullHistoryData ? computeDashboard(fullHistoryData, config.hiddenRounds || []) : null;

  const toggleRoundVisibility = async (question) => {
    const hidden = config.hiddenRounds || [];
    const updated = hidden.includes(question) ? hidden.filter((q) => q !== question) : [...hidden, question];
    const newConfig = { ...config, hiddenRounds: updated };
    setConfig(newConfig);
    await saveConfigRemote(newConfig);
  };

  const handleDeleteRound = async (round) => {
    const ok = window.confirm(
      `¿Eliminar PERMANENTEMENTE los datos de la ronda "${round.question}" (${round.total} jugadas)? Esto no se puede deshacer.`
    );
    if (!ok) return;
    const success = await deleteRoundHistory(round.question);
    if (!success) {
      window.alert("No se pudo eliminar la ronda. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    const hidden = (config.hiddenRounds || []).filter((q) => q !== round.question);
    if (hidden.length !== (config.hiddenRounds || []).length) {
      const newConfig = { ...config, hiddenRounds: hidden };
      setConfig(newConfig);
      await saveConfigRemote(newConfig);
    }
    setFullHistoryData(null);
  };

  const exportDashboardExcel = () => {
    if (!dashboard) return;
    const wb = XLSX.utils.book_new();

    const roundsRows = [["Ronda", "Pregunta", "Desde", "Hasta", "Total votos", "Opción", "Votos", "Porcentaje", "Ganadora"]];
    for (const r of dashboard.rounds) {
      for (const [label, count] of r.results) {
        const pct = r.total ? Math.round((count / r.total) * 100) : 0;
        roundsRows.push([
          r.roundNumber, r.question,
          new Date(r.firstDate).toLocaleDateString(), new Date(r.lastDate).toLocaleDateString(),
          r.total, label, count, `${pct}%`, label === r.winner ? "Sí" : "",
        ]);
      }
    }
    const wsRounds = XLSX.utils.aoa_to_sheet(roundsRows);
    XLSX.utils.book_append_sheet(wb, wsRounds, "Rondas de encuesta");

    const custRows = [["Nombre", "Teléfono", "Veces jugado", "Premios ganados", "Primera vez", "Última vez"]];
    for (const p of dashboard.recurring) {
      custRows.push([
        p.name || "Sin nombre", p.phone, p.count, p.wins,
        new Date(p.firstDate).toLocaleDateString(), new Date(p.lastDate).toLocaleDateString(),
      ]);
    }
    const wsCust = XLSX.utils.aoa_to_sheet(custRows);
    XLSX.utils.book_append_sheet(wb, wsCust, "Clientes recurrentes");

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${config.businessName || "dashboard"}-${dateTag}.xlsx`);
  };

  const updatePrize = (i, patch) => setConfig({ ...config, prizes: config.prizes.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const addPrize = () => setConfig({ ...config, prizes: [...config.prizes, { isPrize: false, name: "La próxima, con suerte", emoji: "🍀" }] });
  const removePrize = (i) => {
    if (config.prizes.length <= 2) return;
    setConfig({ ...config, prizes: config.prizes.filter((_, idx) => idx !== i) });
  };

  const updateOption = (i, patch) => setConfig({ ...config, surveyOptions: config.surveyOptions.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  const addOption = () => setConfig({ ...config, surveyOptions: [...config.surveyOptions, { label: "", emoji: "🙂" }] });
  const removeOption = (i) => {
    if (config.surveyOptions.length <= 2) return;
    setConfig({ ...config, surveyOptions: config.surveyOptions.filter((_, idx) => idx !== i) });
  };

  const waLinkFor = (h) => {
    const msg = (config.whatsappMessageTemplate || "").replace("{nombre}", h.name || "");
    return `https://wa.me/51${h.phone}?text=${encodeURIComponent(msg)}`;
  };

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
        {[["general", "General"], ["encuesta", "Encuesta"], ["premios", "Premios"], ["dashboard", "Dashboard"], ["historial", "Historial"]].map(([id, label]) => (
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
          <Field label="Link de tu comunidad de WhatsApp (opcional)">
            <input value={config.whatsappCommunityLink} onChange={(e) => setConfig({ ...config, whatsappCommunityLink: e.target.value })} placeholder="https://chat.whatsapp.com/xxxxxxxx" style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none" />
            <p style={{ color: C.inkSoft }} className="text-xs mt-1">
              Si lo dejas vacío, no se muestra el botón de "Únete a la comunidad" al final del juego.
            </p>
          </Field>
          <Field label="Beneficios de unirse (aparecen como lista antes del botón)">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={config.whatsappCommunityPerks?.[i] || ""}
                onChange={(e) => {
                  const perks = [...(config.whatsappCommunityPerks || ["", "", ""])];
                  perks[i] = e.target.value;
                  setConfig({ ...config, whatsappCommunityPerks: perks });
                }}
                placeholder={`Beneficio ${i + 1}`}
                style={inputStyle}
                className="w-full py-2.5 px-3 rounded-xl outline-none mb-2"
              />
            ))}
          </Field>
          <Field label="Mensaje rápido para WhatsApp individual">
            <textarea value={config.whatsappMessageTemplate} onChange={(e) => setConfig({ ...config, whatsappMessageTemplate: e.target.value })} rows={3} style={inputStyle} className="w-full py-2.5 px-3 rounded-xl outline-none resize-none" />
            <p style={{ color: C.inkSoft }} className="text-xs mt-1">
              Usa <b>{"{nombre}"}</b> y se reemplaza automático por el nombre de cada persona.
            </p>
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
              <button
                onClick={() => removeOption(i)}
                disabled={config.surveyOptions.length <= 2}
                style={{ opacity: config.surveyOptions.length <= 2 ? 0.3 : 1 }}
                className="w-10 shrink-0 flex items-center justify-center rounded-xl"
              >
                <Trash2 size={16} color={C.clay} />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            style={{ borderColor: C.amber, color: C.amberDeep }}
            className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-1"
          >
            <Plus size={16} /> Agregar opción
          </button>
        </div>
      )}

      {tab === "premios" && (
        <div>
          <p style={{ color: C.inkSoft }} className="text-xs mb-3">
            La ficha <b>1</b> es la <b>menos probable</b> y la última ficha (<b>{config.prizes.length}</b>) es la <b>más probable</b>.
            Pon tus premios más valiosos arriba y los mensajes de "sigue participando" abajo. La ruleta se ajusta sola a la cantidad que dejes aquí.
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
              <button
                onClick={() => removePrize(i)}
                disabled={config.prizes.length <= 2}
                style={{ opacity: config.prizes.length <= 2 ? 0.3 : 1 }}
                className="w-8 shrink-0 flex items-center justify-center"
              >
                <Trash2 size={16} color={C.clay} />
              </button>
            </div>
          ))}
          <button
            onClick={addPrize}
            style={{ borderColor: C.amber, color: C.amberDeep }}
            className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-1"
          >
            <Plus size={16} /> Agregar ficha
          </button>
        </div>
      )}

      {tab === "dashboard" && (
        <div>
          {dashboardLoading && <p style={{ color: C.inkSoft }} className="text-sm">Calculando estadísticas...</p>}

          {dashboard && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-1">
                  <div style={{ background: "#fff" }} className="flex-1 rounded-xl p-2.5 text-center">
                    <p style={{ color: C.espressoDeep }} className="text-lg font-bold">{dashboard.totalPlays}</p>
                    <p style={{ color: C.inkSoft }} className="text-[9px] uppercase font-bold">Jugadas</p>
                  </div>
                  <div style={{ background: "#fff" }} className="flex-1 rounded-xl p-2.5 text-center">
                    <p style={{ color: C.espressoDeep }} className="text-lg font-bold">{dashboard.uniqueCustomers}</p>
                    <p style={{ color: C.inkSoft }} className="text-[9px] uppercase font-bold">Clientes</p>
                  </div>
                  <div style={{ background: "#fff" }} className="flex-1 rounded-xl p-2.5 text-center">
                    <p style={{ color: C.mint }} className="text-lg font-bold">{dashboard.totalWins}</p>
                    <p style={{ color: C.inkSoft }} className="text-[9px] uppercase font-bold">Premios</p>
                  </div>
                </div>
              </div>

              <button
                onClick={exportDashboardExcel}
                style={{ background: C.espresso, color: C.cream }}
                className="w-full mb-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Download size={15} /> Descargar Excel del dashboard
              </button>

              {dashboard.noPrizeStreaks.length > 0 && (
                <div style={{ background: "#FFF4E5", borderColor: C.amberDeep }} className="rounded-xl p-3 mb-6 border">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} color={C.clay} />
                    <p style={{ color: C.espressoDeep }} className="text-sm font-bold">Candidatos a premio especial</p>
                  </div>
                  <p style={{ color: C.inkSoft }} className="text-xs mb-2">
                    Jugaron 5 veces o más y nunca les ha tocado un premio real. Tú decides si vale la pena sorprenderlos.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {dashboard.noPrizeStreaks.map((p) => (
                      <div key={p.phone} className="flex items-center justify-between text-xs">
                        <span style={{ color: C.ink }} className="font-semibold">{p.name || "Sin nombre"} · {p.phone}</span>
                        <a
                          href={waLinkFor(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: "#25D366" }}
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        >
                          <MessageCircle size={12} color="#0b1a10" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} color={C.espressoDeep} />
                <p style={{ color: C.espressoDeep }} className="text-sm font-bold">Resultados de encuesta por ronda</p>
              </div>
              <p style={{ color: C.inkSoft }} className="text-xs mb-3">
                Cada vez que cambias la pregunta o las opciones en la pestaña "Encuesta", se abre una ronda nueva automáticamente.
              </p>

              {dashboard.rounds.length === 0 && (
                <p style={{ color: C.inkSoft }} className="text-sm mb-4">Todavía no hay suficientes datos de encuestas.</p>
              )}

              <div className="flex flex-col gap-3 mb-6">
                {dashboard.rounds.map((r) => (
                  <div key={r.roundNumber} style={{ background: "#fff" }} className="rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p style={{ color: C.espressoDeep }} className="text-xs font-bold">Ronda {r.roundNumber}</p>
                      <div className="flex items-center gap-2">
                        <p style={{ color: C.inkSoft }} className="text-[10px]">
                          {new Date(r.firstDate).toLocaleDateString()} – {new Date(r.lastDate).toLocaleDateString()} · {r.total} votos
                        </p>
                        <button onClick={() => toggleRoundVisibility(r.question)} title="Ocultar del dashboard">
                          <EyeOff size={14} color={C.inkSoft} />
                        </button>
                        <button onClick={() => handleDeleteRound(r)} title="Eliminar permanentemente">
                          <Trash2 size={14} color={C.clay} />
                        </button>
                      </div>
                    </div>
                    <p style={{ color: C.ink }} className="text-sm font-semibold mb-2">{r.question}</p>
                    <div className="flex flex-col gap-1.5">
                      {r.results.map(([label, count]) => {
                        const pct = r.total ? Math.round((count / r.total) * 100) : 0;
                        const isWinner = label === r.winner;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span style={{ color: isWinner ? C.espressoDeep : C.inkSoft, fontWeight: isWinner ? 700 : 400 }} className="flex items-center gap-1">
                                {isWinner && <Trophy size={12} color={C.amberDeep} />} {label}
                              </span>
                              <span style={{ color: C.inkSoft }}>{count} ({pct}%)</span>
                            </div>
                            <div style={{ background: C.creamSoft }} className="w-full h-2 rounded-full overflow-hidden">
                              <div style={{ background: isWinner ? C.amber : C.inkSoft, width: `${pct}%` }} className="h-full rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {dashboard.hiddenRoundsList.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowHiddenRounds((s) => !s)}
                    style={{ color: C.inkSoft }}
                    className="text-xs font-bold mb-2 flex items-center gap-1"
                  >
                    {showHiddenRounds ? "Ocultar" : "Ver"} rondas ocultas ({dashboard.hiddenRoundsList.length})
                  </button>
                  {showHiddenRounds && (
                    <div className="flex flex-col gap-2">
                      {dashboard.hiddenRoundsList.map((r) => (
                        <div key={r.roundNumber} style={{ background: "#fff", opacity: 0.7 }} className="flex items-center justify-between p-2.5 rounded-xl text-xs">
                          <span style={{ color: C.ink }} className="truncate max-w-[180px]">{r.question}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => toggleRoundVisibility(r.question)} title="Mostrar de nuevo">
                              <Eye size={14} color={C.mint} />
                            </button>
                            <button onClick={() => handleDeleteRound(r)} title="Eliminar permanentemente">
                              <Trash2 size={14} color={C.clay} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {dashboard.trends.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} color={C.espressoDeep} />
                    <p style={{ color: C.espressoDeep }} className="text-sm font-bold">Tendencias entre rondas</p>
                  </div>
                  <p style={{ color: C.inkSoft }} className="text-xs mb-3">
                    Cómo cambió el interés en cada opción que se repitió en más de una ronda.
                  </p>
                  <div className="flex flex-col gap-2 mb-6">
                    {dashboard.trends.map((t) => (
                      <div key={t.label} style={{ background: "#fff" }} className="flex items-center justify-between p-2.5 rounded-xl text-xs">
                        <span style={{ color: C.ink }} className="font-semibold truncate max-w-[140px]">{t.label}</span>
                        <div className="flex items-center gap-1">
                          {t.change > 0 && <TrendingUp size={14} color={C.mint} />}
                          {t.change < 0 && <TrendingDown size={14} color={C.clay} />}
                          <span style={{ color: t.change > 0 ? C.mint : t.change < 0 ? C.clay : C.inkSoft }} className="font-bold">
                            {t.change > 0 ? "+" : ""}{t.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Repeat size={16} color={C.espressoDeep} />
                <p style={{ color: C.espressoDeep }} className="text-sm font-bold">Clientes recurrentes</p>
              </div>
              <p style={{ color: C.inkSoft }} className="text-xs mb-3">
                Personas que ya jugaron más de una vez. Tú decides si vale la pena premiarlas aparte.
              </p>
              {dashboard.recurring.length === 0 && (
                <p style={{ color: C.inkSoft }} className="text-sm">Todavía nadie ha repetido.</p>
              )}
              <div className="flex flex-col gap-2">
                {dashboard.recurring.map((p) => (
                  <div key={p.phone} style={{ background: "#fff" }} className="flex items-center justify-between p-2.5 rounded-xl text-xs">
                    <div className="flex flex-col">
                      <span style={{ color: C.ink }} className="font-semibold">{p.name || "Sin nombre"}</span>
                      <span style={{ color: C.inkSoft }} className="text-[10px]">{p.phone}</span>
                    </div>
                    <div className="text-right">
                      <span style={{ color: C.amberDeep }} className="font-bold">{p.count}x jugó</span>
                      <p style={{ color: C.inkSoft }} className="text-[10px]">{p.wins} premio{p.wins !== 1 ? "s" : ""} ganado{p.wins !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
                <div className="flex flex-col shrink-0 max-w-[90px]">
                  <span style={{ color: C.ink }} className="font-semibold truncate">{h.name || "Sin nombre"}</span>
                  <span style={{ color: C.inkSoft }} className="text-[10px]">{h.phone}</span>
                </div>
                <span style={{ color: C.inkSoft }} className="shrink-0">{new Date(h.date).toLocaleDateString()}</span>
                <span style={{ color: h.won ? C.mint : C.inkSoft }} className="font-bold text-right shrink-0 flex-1 truncate px-1">
                  {h.won ? "🎁 " : ""}{h.result}
                </span>
                <a
                  href={waLinkFor(h)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: "#25D366" }}
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  title="Enviarle un WhatsApp"
                >
                  <MessageCircle size={14} color="#0b1a10" />
                </a>
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
      result: prize.name, won: prize.isPrize,
      surveyQuestion: config.surveyQuestion,
      surveyAnswer: surveyAnswer,
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
      {route === "game" && <Game onFinish={finishGame} prizes={config.prizes} />}
      {route === "result" && <Result prize={prizeResult} onDone={resetAll} communityLink={config.whatsappCommunityLink} perks={config.whatsappCommunityPerks} />}
      {route === "adminLogin" && <AdminLogin config={config} onOk={() => { loadHistory(); setRoute("admin"); }} onBack={() => setRoute("landing")} />}
      {route === "admin" && (
        <AdminPanel config={config} setConfig={setConfig} history={history} saving={saving}
          onSave={saveConfig} onLogout={() => setRoute("landing")} onResetPhone={resetPhoneLock} />
      )}
    </div>
  );
}
