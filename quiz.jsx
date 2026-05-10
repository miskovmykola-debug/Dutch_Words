// Quiz mode — multiple choice. Mixed direction (NL→UA and UA→NL).
// Mounts globally as window.Quiz so app.jsx can render it.
const { useState: useStateQ, useMemo: useMemoQ, useEffect: useEffectQ, useCallback: useCallbackQ } = React;

const QT = {
  bg: "oklch(0.98 0.005 70)",
  ink: "oklch(0.18 0.005 70)",
  inkSoft: "oklch(0.42 0.01 70)",
  inkMute: "oklch(0.62 0.01 70)",
  line: "oklch(0.91 0.005 70)",
  lineSoft: "oklch(0.94 0.005 70)",
  card: "#ffffff",
  nl: "oklch(0.66 0.16 50)",
  nlSoft: "oklch(0.96 0.03 60)",
  ua: "oklch(0.48 0.08 250)",
  uaSoft: "oklch(0.96 0.02 250)",
  good: "oklch(0.62 0.13 155)",
  goodSoft: "oklch(0.96 0.04 155)",
  bad: "oklch(0.58 0.18 25)",
  badSoft: "oklch(0.96 0.04 25)",
};

// Build quiz: pick N cards, 4 options each, alternate direction.
function buildQuiz(deck, n = 10, allCards) {
  const seed = Date.now() & 0x7fffffff;
  const rng = window.__mulberry32 ? window.__mulberry32(seed) : Math.random;
  const idxs = deck.cards.map((_, i) => i);
  // shuffle
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const picked = idxs.slice(0, Math.min(n, idxs.length));

  // pool for distractors — all cards across decks for variety
  const pool = allCards;

  return picked.map((cardIdx, qIdx) => {
    const card = deck.cards[cardIdx];
    const direction = qIdx % 2 === 0 ? "nl-to-uk" : "uk-to-nl"; // alternate
    const correctKey = direction === "nl-to-uk" ? "uk" : "nl";
    const promptKey  = direction === "nl-to-uk" ? "nl" : "uk";

    // Build 3 distractors with different correct answers
    const used = new Set([card[correctKey].toLowerCase()]);
    const distractors = [];
    let safety = 0;
    while (distractors.length < 3 && safety++ < 200) {
      const r = pool[Math.floor(rng() * pool.length)];
      const v = r[correctKey];
      if (used.has(v.toLowerCase())) continue;
      used.add(v.toLowerCase());
      distractors.push(v);
    }
    const options = [...distractors, card[correctKey]];
    // shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      direction,
      prompt: card[promptKey],
      example: direction === "nl-to-uk" ? card.ex : null, // example only when prompt is NL
      answer: card[correctKey],
      options,
    };
  });
}

function Quiz({ deck, allCards, onExit, speak }) {
  const [questions, setQuestions] = useStateQ(() => buildQuiz(deck, 10, allCards));
  const [pos, setPos] = useStateQ(0);
  const [picked, setPicked] = useStateQ(null);
  const [score, setScore] = useStateQ(0);
  const [done, setDone] = useStateQ(false);
  const [wrongList, setWrongList] = useStateQ([]);

  const q = questions[pos];

  const choose = (opt) => {
    if (picked !== null) return;
    setPicked(opt);
    const correct = opt === q.answer;
    if (correct) setScore(s => s + 1);
    else setWrongList(w => [...w, q]);
    setTimeout(() => {
      if (pos >= questions.length - 1) {
        setDone(true);
      } else {
        setPos(p => p + 1);
        setPicked(null);
      }
    }, correct ? 650 : 1100);
  };

  const restart = () => {
    setQuestions(buildQuiz(deck, 10, allCards));
    setPos(0); setPicked(null); setScore(0); setDone(false); setWrongList([]);
  };

  // Keyboard 1–4 to pick
  useEffectQ(() => {
    const onKey = (e) => {
      if (done || picked !== null) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4 && q && q.options[n - 1] !== undefined) choose(q.options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, picked, done]);

  if (done) {
    const perfect = score === questions.length;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
        <div style={{
          width: 96, height: 96, borderRadius: 48,
          background: perfect ? QT.goodSoft : QT.nlSoft,
          color: perfect ? QT.good : QT.nl,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 38, fontWeight: 700, marginBottom: 18,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
        }}>
          {score}/{questions.length}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: QT.ink, marginBottom: 4 }}>
          {perfect ? "Чудово!" : score >= questions.length * 0.7 ? "Гарний результат" : "Спробуй ще раз"}
        </div>
        <div style={{ fontSize: 14, color: QT.inkSoft, marginBottom: 20 }}>
          {perfect ? "Усі відповіді правильні." : `Правильно: ${score}, помилок: ${questions.length - score}.`}
        </div>

        {wrongList.length > 0 && (
          <div style={{
            width: "100%", textAlign: "left",
            background: QT.card, borderRadius: 16, padding: "12px 14px",
            border: `1px solid ${QT.line}`, marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: QT.bad, marginBottom: 8, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
              Помилки
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wrongList.map((w, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, lineHeight: 1.3 }}>
                  <span style={{ color: QT.inkSoft, flex: 1, minWidth: 0 }}>{w.prompt}</span>
                  <span style={{ color: QT.ink, fontWeight: 600, flexShrink: 0, maxWidth: "55%", textAlign: "right" }}>{w.answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ width: "100%", display: "flex", gap: 10 }}>
          <button onClick={onExit} style={qBtnGhost}>До тем</button>
          <button onClick={restart} style={qBtnPrimary}>Ще раз</button>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const pct = (pos / questions.length) * 100;
  const showFeedback = picked !== null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* progress */}
      <div style={{ height: 4, borderRadius: 99, background: QT.line, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: QT.nl, transition: "width 240ms ease" }} />
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, monospace",
        letterSpacing: "0.12em", color: QT.inkMute, marginBottom: 16,
      }}>
        <span>ПИТАННЯ {String(pos + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}</span>
        <span style={{ color: QT.good }}>✓ {score}</span>
      </div>

      {/* Prompt card */}
      <div style={{
        background: q.direction === "nl-to-uk" ? "oklch(0.22 0.012 65)" : QT.card,
        color: q.direction === "nl-to-uk" ? "#fff" : QT.ink,
        border: q.direction === "nl-to-uk" ? "none" : `1px solid ${QT.line}`,
        borderRadius: 22,
        padding: "20px 18px",
        boxShadow: q.direction === "nl-to-uk"
          ? "0 16px 36px -18px rgba(20,15,5,0.36)"
          : "0 1px 0 rgba(20,15,5,0.04), 0 12px 24px -16px rgba(20,15,5,0.16)",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: q.direction === "nl-to-uk" ? "oklch(0.85 0.12 60)" : QT.ua,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}>
            {q.direction === "nl-to-uk" ? "Nederlands" : "Українською"}
          </span>
          {q.direction === "nl-to-uk" && (
            <button
              onClick={() => speak(q.prompt)}
              style={{
                appearance: "none", border: "1px solid oklch(0.34 0.012 65)",
                background: "oklch(0.28 0.012 65)", color: "oklch(0.85 0.12 60)",
                width: 28, height: 28, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Прослухати"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M16 9a4 4 0 0 1 0 6"/>
              </svg>
            </button>
          )}
        </div>
        <div style={{
          fontSize: q.prompt.length > 22 ? 24 : q.prompt.length > 14 ? 28 : 32,
          fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15,
          textWrap: "pretty",
        }}>
          {q.prompt}
        </div>
        {q.example && (
          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: "1px solid oklch(0.4 0.012 65)",
            fontSize: 14, fontStyle: "italic", lineHeight: 1.4,
            color: "oklch(0.78 0.01 70)", textWrap: "pretty",
          }}>
            {q.example}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 12, color: QT.inkMute, textAlign: "center",
        fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.08em",
        marginBottom: 10,
      }}>
        {q.direction === "nl-to-uk" ? "ОБЕРИ ПЕРЕКЛАД УКРАЇНСЬКОЮ" : "ОБЕРИ ПЕРЕКЛАД НІДЕРЛАНДСЬКОЮ"}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map((opt, i) => {
          const isPicked = picked === opt;
          const isCorrect = opt === q.answer;
          let bg = QT.card, color = QT.ink, border = `1px solid ${QT.line}`;
          if (showFeedback) {
            if (isCorrect) { bg = QT.goodSoft; color = QT.good; border = `1px solid ${QT.good}`; }
            else if (isPicked) { bg = QT.badSoft; color = QT.bad; border = `1px solid ${QT.bad}`; }
            else { bg = "transparent"; color = QT.inkMute; }
          }
          return (
            <button
              key={i}
              disabled={showFeedback}
              onClick={() => choose(opt)}
              style={{
                appearance: "none", border, background: bg, color,
                padding: "14px 14px", borderRadius: 14,
                fontFamily: "inherit", fontSize: 16, fontWeight: 500,
                textAlign: "left", cursor: showFeedback ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 12,
                transition: "background 140ms ease, color 140ms ease, border 140ms ease",
                lineHeight: 1.25,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 11,
                border: `1px solid ${showFeedback && (isCorrect || isPicked) ? "currentColor" : QT.line}`,
                fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, monospace",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: showFeedback && (isCorrect || isPicked) ? "currentColor" : QT.inkMute,
                flexShrink: 0,
              }}>
                {showFeedback && isCorrect ? "✓" : showFeedback && isPicked ? "✕" : i + 1}
              </span>
              <span style={{ flex: 1, textWrap: "pretty" }}>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const qBtnPrimary = {
  flex: 1, appearance: "none", border: "none",
  background: QT.ink, color: "#fff",
  height: 50, borderRadius: 16,
  fontSize: 16, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
};
const qBtnGhost = {
  flex: 1, appearance: "none", border: `1px solid ${QT.line}`,
  background: "transparent", color: QT.ink,
  height: 50, borderRadius: 16,
  fontSize: 16, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
};

window.Quiz = Quiz;
