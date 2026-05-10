// Dutch Cards — flashcard app
// Two screens: Home (deck list) and Study (flip cards).
// Persists learned-card progress per deck in localStorage.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const LS_KEY = "dutch-cards:v1";
const loadProgress = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
};
const saveProgress = (p) => localStorage.setItem(LS_KEY, JSON.stringify(p));

// ─── Theme tokens ────────────────────────────────────────────
const T = {
  bg: "oklch(0.98 0.005 70)",
  bgDeep: "oklch(0.96 0.006 70)",
  ink: "oklch(0.18 0.005 70)",
  inkSoft: "oklch(0.42 0.01 70)",
  inkMute: "oklch(0.62 0.01 70)",
  line: "oklch(0.91 0.005 70)",
  lineSoft: "oklch(0.94 0.005 70)",
  card: "#ffffff",
  cardBack: "oklch(0.22 0.012 65)",
  nl: "oklch(0.66 0.16 50)",        // Dutch orange
  nlSoft: "oklch(0.96 0.03 60)",
  ua: "oklch(0.48 0.08 250)",       // muted UA blue
  uaSoft: "oklch(0.96 0.02 250)",
  good: "oklch(0.62 0.13 155)",
  goodSoft: "oklch(0.96 0.04 155)",
};

// ─── Tiny iconography (line glyphs) ──────────────────────────
const Icon = ({ name, size = 20, stroke = "currentColor", weight = 1.6 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: weight, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "back":    return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case "next":    return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case "prev":    return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case "shuffle": return <svg {...p}><path d="M16 3h5v5"/><path d="M4 20l17-17"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>;
    case "reset":   return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>;
    case "check":   return <svg {...p}><path d="M5 12l5 5L20 7"/></svg>;
    case "x":       return <svg {...p}><path d="M6 6l12 12M6 18L18 6"/></svg>;
    case "speak":   return <svg {...p}><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/></svg>;
    case "tap":     return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6"/></svg>;
    default: return null;
  }
};

// ─── Speech (Dutch TTS via SpeechSynthesis) ──────────────────
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

// ─── Home screen — list of decks ─────────────────────────────
function Home({ progress, onPick, onResetAll }) {
  const totalCards = window.DECKS.reduce((s, d) => s + d.cards.length, 0);
  const totalLearned = window.DECKS.reduce(
    (s, d) => s + (progress[d.id]?.learned?.length || 0), 0
  );
  return (
    <div style={{ padding: "0 20px 40px", color: T.ink }}>
      <div style={{ paddingTop: 8, marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.nl, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Nederlands · A1—A2
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 700, margin: "6px 0 2px", letterSpacing: "-0.02em" }}>
          Картки
        </h1>
        <div style={{ fontSize: 15, color: T.inkSoft }}>
          {totalLearned} з {totalCards} вивчено
        </div>
      </div>

      {/* overall progress strip */}
      <div style={{ height: 6, borderRadius: 99, background: T.line, overflow: "hidden", marginBottom: 22 }}>
        <div style={{
          width: `${(totalLearned / totalCards) * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${T.ua}, ${T.nl})`,
          transition: "width 400ms ease",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {window.DECKS.map((d, i) => {
          const learned = progress[d.id]?.learned?.length || 0;
          const total = d.cards.length;
          const pct = (learned / total) * 100;
          const done = learned === total;
          return (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              style={{
                appearance: "none", border: "none", cursor: "pointer",
                background: T.card, borderRadius: 18,
                padding: "14px 16px", textAlign: "left",
                boxShadow: "0 1px 0 rgba(20,15,5,0.04), 0 8px 18px -12px rgba(20,15,5,0.18)",
                color: T.ink, fontFamily: "inherit",
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, monospace", color: T.inkMute, width: 22 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: 13, color: T.nl, marginTop: 2, fontStyle: "italic" }}>
                    {d.nlTitle}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, color: done ? T.good : T.inkSoft,
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  {learned}/{total}
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: T.lineSoft, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: done ? T.good : T.nl,
                  transition: "width 400ms ease",
                }} />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onResetAll}
        style={{
          marginTop: 22, width: "100%",
          appearance: "none", border: `1px solid ${T.line}`,
          background: "transparent", color: T.inkSoft,
          padding: "11px", borderRadius: 14, fontSize: 13, cursor: "pointer",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        <Icon name="reset" size={14} /> Скинути весь прогрес
      </button>

      <div style={{
        marginTop: 28, fontSize: 11, color: T.inkMute, textAlign: "center",
        fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.08em",
      }}>
        TAP CARD TO FLIP · NL ↔ UA
      </div>
    </div>
  );
}

// ─── Study screen — flip cards ───────────────────────────────
function Study({ deck, progress, setProgress, onBack, allCards }) {
  const [mode, setMode] = useState("cards"); // 'cards' | 'quiz'
  const learned = progress[deck.id]?.learned || [];
  const learnedSet = useMemo(() => new Set(learned), [learned]);

  // Build the order: shuffle toggle, plus optional "only-unknown" filter
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const order = useMemo(() => {
    let idx = deck.cards.map((_, i) => i);
    if (onlyUnknown) idx = idx.filter(i => !learnedSet.has(i));
    if (shuffleSeed > 0) {
      const rng = mulberry32(shuffleSeed);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    return idx;
  }, [deck, shuffleSeed, onlyUnknown, learnedSet]);

  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState(1); // 1 next, -1 prev — for slide animation

  // If filter empties or shrinks, clamp pos
  useEffect(() => { if (pos >= order.length && order.length > 0) setPos(0); }, [order, pos]);

  const cardIdx = order[pos];
  const card = cardIdx !== undefined ? deck.cards[cardIdx] : null;
  const total = order.length;
  const isLearned = card ? learnedSet.has(cardIdx) : false;

  const advance = useCallback((delta) => {
    setDir(delta);
    setFlipped(false);
    setTimeout(() => {
      setPos(p => Math.max(0, Math.min(order.length - 1, p + delta)));
    }, 120);
  }, [order]);

  const mark = useCallback((known) => {
    setProgress(prev => {
      const cur = prev[deck.id]?.learned || [];
      let next;
      if (known) {
        next = cur.includes(cardIdx) ? cur : [...cur, cardIdx];
      } else {
        next = cur.filter(i => i !== cardIdx);
      }
      return { ...prev, [deck.id]: { learned: next } };
    });
    if (known && pos < order.length - 1) advance(1);
  }, [cardIdx, deck.id, pos, order, advance, setProgress]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") advance(1);
      else if (e.key === "ArrowLeft") advance(-1);
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
      else if (e.key.toLowerCase() === "k") mark(true);
      else if (e.key.toLowerCase() === "j") mark(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, mark]);

  const learnedCount = learned.length;
  const pct = total > 0 ? ((pos + 1) / total) * 100 : 0;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      color: T.ink, padding: "0 16px 16px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "4px 4px 8px", minHeight: 44,
      }}>
        <button onClick={onBack} style={iconBtn}>
          <Icon name="back" size={22} stroke={T.nl} />
          <span style={{ fontSize: 17, color: T.nl, fontWeight: 400, marginLeft: -2 }}>Теми</span>
        </button>
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {deck.title}
          </div>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: "ui-monospace, SFMono-Regular, monospace", marginTop: 1 }}>
            {learnedCount}/{deck.cards.length} вивчено
          </div>
        </div>
        {mode === "cards" ? (
          <button
            onClick={() => { setShuffleSeed(s => s ? 0 : Date.now() & 0x7fffffff); setPos(0); setFlipped(false); }}
            style={{ ...iconBtn, color: shuffleSeed ? T.nl : T.inkSoft }}
          >
            <Icon name="shuffle" size={18} stroke="currentColor" />
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
      </div>

      {/* Mode segmented control */}
      <div style={{
        display: "flex", padding: 3, gap: 3,
        background: T.lineSoft, borderRadius: 12,
        marginBottom: 14,
      }}>
        {[{k:"cards",l:"Картки"},{k:"quiz",l:"Тест"}].map(t => (
          <button
            key={t.k}
            onClick={() => setMode(t.k)}
            style={{
              flex: 1, appearance: "none", border: "none",
              background: mode === t.k ? T.card : "transparent",
              color: mode === t.k ? T.ink : T.inkSoft,
              padding: "8px 0", borderRadius: 9,
              fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              boxShadow: mode === t.k ? "0 1px 2px rgba(20,15,5,0.08), 0 0 0 0.5px rgba(20,15,5,0.04)" : "none",
              transition: "background 140ms ease, color 140ms ease",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {mode === "quiz" && (
        <window.Quiz deck={deck} allCards={allCards} onExit={onBack} speak={speak} />
      )}
      {mode === "cards" && <>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 99, background: T.line, overflow: "hidden", marginBottom: 16 }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: T.nl, transition: "width 220ms ease",
        }} />
      </div>

      {/* Card area */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {card ? (
          <FlipCard
            key={`${deck.id}-${cardIdx}-${shuffleSeed}-${pos}`}
            card={card}
            flipped={flipped}
            onFlip={() => setFlipped(f => !f)}
            isLearned={isLearned}
            pos={pos + 1}
            total={total}
            dir={dir}
          />
        ) : (
          <EmptyState onlyUnknown={onlyUnknown} setOnlyUnknown={setOnlyUnknown} />
        )}
      </div>

      {/* Bottom controls */}
      {card && (
        <div style={{ paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button onClick={() => advance(-1)} disabled={pos === 0} style={navBtn(pos === 0)}>
              <Icon name="prev" size={20} stroke={pos === 0 ? T.inkMute : T.ink} />
            </button>
            <div style={{
              flex: 1, textAlign: "center", fontSize: 13, color: T.inkSoft,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}>
              {pos + 1} <span style={{ color: T.inkMute }}>/ {total}</span>
            </div>
            <button onClick={() => advance(1)} disabled={pos === total - 1} style={navBtn(pos === total - 1)}>
              <Icon name="next" size={20} stroke={pos === total - 1 ? T.inkMute : T.ink} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => mark(false)} style={actionBtn(false, isLearned === false)}>
              <Icon name="x" size={16} /> Не знаю
            </button>
            <button onClick={() => mark(true)} style={actionBtn(true, isLearned)}>
              <Icon name="check" size={16} /> Знаю
            </button>
          </div>
          <button
            onClick={() => setOnlyUnknown(v => !v)}
            style={{
              marginTop: 10, width: "100%",
              appearance: "none", border: "none", background: "transparent",
              fontSize: 12, color: onlyUnknown ? T.nl : T.inkMute, cursor: "pointer",
              padding: 4, fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {onlyUnknown ? "✓ показую тільки невивчені" : "Показати тільки невивчені"}
          </button>
        </div>
      )}
      </>}
    </div>
  );
}

// ─── FlipCard ────────────────────────────────────────────────
function FlipCard({ card, flipped, onFlip, isLearned, pos, total, dir }) {
  const [enter, setEnter] = useState(true);
  useEffect(() => {
    setEnter(true);
    const id = setTimeout(() => setEnter(false), 20);
    return () => clearTimeout(id);
  }, [card]);

  return (
    <div
      onClick={onFlip}
      style={{
        width: "100%", maxWidth: 380, aspectRatio: "3 / 4",
        perspective: 1400, cursor: "pointer",
        transform: enter ? `translateX(${dir * 24}px)` : "translateX(0)",
        opacity: enter ? 0 : 1,
        transition: "transform 280ms cubic-bezier(.2,.7,.2,1), opacity 220ms ease",
      }}
    >
      <div style={{
        width: "100%", height: "100%", position: "relative",
        transformStyle: "preserve-3d",
        transition: "transform 520ms cubic-bezier(.2,.7,.2,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        {/* FRONT — Ukrainian */}
        <CardFace side="front">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={faceLabel(T.ua)}>Українською</span>
            {isLearned && <span style={learnedBadge}>вивчено</span>}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "8px 4px" }}>
            <div style={{
              fontSize: card.uk.length > 22 ? 28 : card.uk.length > 14 ? 34 : 40,
              fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.12,
              color: T.ink, textWrap: "pretty",
            }}>
              {card.uk}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.inkMute, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.08em" }}>
            <Icon name="tap" size={13} /> ТОРКНІТЬСЯ
          </div>
        </CardFace>

        {/* BACK — Dutch + example */}
        <CardFace side="back">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={faceLabel("oklch(0.85 0.12 60)", true)}>Nederlands</span>
            <button
              onClick={(e) => { e.stopPropagation(); speak(card.nl); }}
              style={speakBtn}
              aria-label="Прослухати"
            >
              <Icon name="speak" size={16} stroke="oklch(0.85 0.12 60)" />
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: "0 4px", gap: 18 }}>
            <div style={{
              fontSize: card.nl.length > 26 ? 26 : card.nl.length > 16 ? 32 : 40,
              fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.12,
              color: "#fff", textWrap: "pretty",
            }}>
              {card.nl}
            </div>
            <div style={{
              borderTop: `1px solid oklch(0.4 0.012 65)`,
              paddingTop: 16,
              fontSize: 18, lineHeight: 1.4, fontStyle: "italic",
              color: "oklch(0.86 0.01 70)", textWrap: "pretty",
            }}>
              <Highlighted text={card.ex} hl={card.nl} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "oklch(0.6 0.01 70)", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.08em" }}>
            <span>{String(pos).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
            <span>VOORBEELD</span>
          </div>
        </CardFace>
      </div>
    </div>
  );
}

function CardFace({ side, children }) {
  const isFront = side === "front";
  return (
    <div style={{
      position: "absolute", inset: 0,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
      transform: isFront ? "rotateY(0)" : "rotateY(180deg)",
      borderRadius: 28,
      background: isFront ? T.card : T.cardBack,
      boxShadow: isFront
        ? "0 1px 0 rgba(20,15,5,0.05), 0 24px 50px -20px rgba(20,15,5,0.22), 0 60px 80px -40px rgba(20,15,5,0.18)"
        : "0 1px 0 rgba(0,0,0,0.2), 0 24px 50px -20px rgba(20,15,5,0.42), 0 60px 80px -40px rgba(20,15,5,0.32)",
      padding: "22px 22px 18px",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// Highlight the headword inside the example sentence
function Highlighted({ text, hl }) {
  if (!hl) return <span>{text}</span>;
  const lc = text.toLowerCase();
  const hlc = hl.toLowerCase();
  const idx = lc.indexOf(hlc);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ color: "#fff", fontStyle: "normal", fontWeight: 600, borderBottom: `2px solid ${T.nl}`, paddingBottom: 1 }}>
        {text.slice(idx, idx + hl.length)}
      </span>
      {text.slice(idx + hl.length)}
    </span>
  );
}

function EmptyState({ onlyUnknown, setOnlyUnknown }) {
  return (
    <div style={{ textAlign: "center", color: T.inkSoft, padding: "20px 30px" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 32, margin: "0 auto 16px",
        background: T.goodSoft, color: T.good,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="check" size={32} stroke="currentColor" weight={2} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Усе вивчено!</div>
      <div style={{ fontSize: 14, marginBottom: 14 }}>
        Немає невивчених карток у цій темі.
      </div>
      <button
        onClick={() => setOnlyUnknown(false)}
        style={{
          appearance: "none", border: `1px solid ${T.line}`, background: T.card,
          padding: "9px 16px", borderRadius: 12, fontSize: 14, cursor: "pointer",
          fontFamily: "inherit", color: T.ink,
        }}
      >
        Показати всі картки
      </button>
    </div>
  );
}

// ─── Reusable styles ─────────────────────────────────────────
const iconBtn = {
  appearance: "none", background: "transparent", border: "none",
  display: "flex", alignItems: "center", padding: "8px 6px",
  cursor: "pointer", color: T.inkSoft, fontFamily: "inherit",
};
const navBtn = (disabled) => ({
  appearance: "none", border: `1px solid ${T.line}`,
  background: disabled ? "transparent" : T.card,
  width: 48, height: 48, borderRadius: 24,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
});
const actionBtn = (positive, active) => {
  const accent = positive ? T.good : T.ua;
  const accentSoft = positive ? T.goodSoft : T.uaSoft;
  return {
    flex: 1,
    appearance: "none", border: `1px solid ${active ? accent : T.line}`,
    background: active ? accent : accentSoft,
    color: active ? "#fff" : accent,
    height: 50, borderRadius: 16,
    fontSize: 16, fontWeight: 600, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    cursor: "pointer",
    transition: "background 160ms ease, color 160ms ease",
  };
};
const faceLabel = (color, dim = false) => ({
  fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
  textTransform: "uppercase", color, fontFamily: "ui-monospace, SFMono-Regular, monospace",
});
const learnedBadge = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
  textTransform: "uppercase", color: T.good, background: T.goodSoft,
  padding: "3px 8px", borderRadius: 99, fontFamily: "ui-monospace, SFMono-Regular, monospace",
};
const speakBtn = {
  appearance: "none", border: "1px solid oklch(0.34 0.012 65)",
  background: "oklch(0.28 0.012 65)", color: "#fff",
  width: 30, height: 30, borderRadius: 15,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

// Tiny seeded RNG so shuffle is stable until reshuffled
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── App root ────────────────────────────────────────────────
function App() {
  const [progress, setProgress] = useState(loadProgress);
  useEffect(() => { saveProgress(progress); }, [progress]);

  const [mobile, setMobile] = useState(() => window.innerWidth <= 600);
  useEffect(() => {
    const update = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Hash routing: "" | "deckId" | "deckId/test"
  const parseHash = () => {
    const h = window.location.hash.replace("#", "");
    const [id, sub] = h.split("/");
    if (!window.DECKS.find(d => d.id === id)) return { deckId: null, mode: "study" };
    return { deckId: id, mode: sub === "test" ? "test" : "study" };
  };
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const h = route.deckId
      ? (route.mode === "test" ? `${route.deckId}/test` : route.deckId)
      : "";
    if (window.location.hash.replace("#", "") !== h) {
      window.location.hash = h;
    }
  }, [route]);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const { deckId, mode } = route;
  const deck = window.DECKS.find(d => d.id === deckId);

  const resetAll = () => {
    if (window.confirm("Видалити прогрес зі всіх тем?")) setProgress({});
  };

  // Phone screen content
  const screen = (
    <div style={{
      width: "100%", height: "100%",
      background: T.bg, color: T.ink,
      fontFamily: '-apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif',
      WebkitFontSmoothing: "antialiased",
      overflowY: deck ? "hidden" : "auto",
      overflowX: "hidden",
      display: "flex", flexDirection: "column",
      paddingTop: mobile ? 8 : 54,    // status bar (only inside fake frame)
      paddingBottom: mobile ? 4 : 26, // home indicator (only inside fake frame)
    }}>
      {deck
        ? <Study
            deck={deck}
            progress={progress}
            setProgress={setProgress}
            onBack={() => setRoute({ deckId: null, mode: "study" })}
          />
        : <Home
            progress={progress}
            onPick={(id) => setRoute({ deckId: id, mode: "study" })}
            onResetAll={resetAll}
          />
      }
    </div>
  );

  // Stage with phone frame, fits viewport
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "oklch(0.94 0.005 70)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, boxSizing: "border-box",
      backgroundImage: `radial-gradient(ellipse at 50% 0%, oklch(0.97 0.008 70) 0%, oklch(0.92 0.006 70) 70%)`,
    }}>
      <PhoneStage>{screen}</PhoneStage>
    </div>
  );
}

// On real phones, render full-bleed (no fake frame). On desktop, scale an
// iPhone-14-Pro-Max frame to fit. Threshold is viewport width.
function PhoneStage({ children }) {
  const W = 430, H = 932;
  const [mobile, setMobile] = useState(() => window.innerWidth <= 600);
  const [scale, setScale] = useState(1);
  const ref = useRef(null);
  useEffect(() => {
    const update = () => {
      const m = window.innerWidth <= 600;
      setMobile(m);
      if (!m && ref.current) {
        const parent = ref.current.parentElement;
        const aw = parent.clientWidth - 32;
        const ah = parent.clientHeight - 32;
        setScale(Math.min(aw / W, ah / H, 1));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (mobile) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: T.bg,
        display: "flex", flexDirection: "column",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}>
        {children}
      </div>
    );
  }
  return (
    <div ref={ref} style={{ width: W * scale, height: H * scale, position: "relative" }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <window.IOSDevice width={W} height={H}>{children}</window.IOSDevice>
      </div>
    </div>
  );
}

// Expose helpers for test.jsx (Babel scripts have separate scopes)
Object.assign(window, { T, Icon, iconBtn, mulberry32, speak });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
