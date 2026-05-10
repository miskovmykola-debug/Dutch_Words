// Test mode — multiple choice quiz over a deck.
// Direction: UA → NL (default) or NL → UA, randomized.

const { useState: useStateT, useEffect: useEffectT, useMemo: useMemoT, useRef: useRefT } = React;
const T = window.T;
const Icon = window.Icon;
const iconBtn = window.iconBtn;
const speak = window.speak;

function Test({ deck, onExit, onFinish }) {
  // Build N questions from the deck
  const QUESTIONS = useMemoT(() => buildQuestions(deck), [deck.id]);

  const [pos, setPos] = useStateT(0);
  const [picked, setPicked] = useStateT(null);   // index of picked option
  const [answers, setAnswers] = useStateT([]);   // [{qIdx, correct, picked}]
  const [done, setDone] = useStateT(false);

  const q = QUESTIONS[pos];
  const isLast = pos === QUESTIONS.length - 1;

  const pick = (i) => {
    if (picked !== null) return;
    setPicked(i);
    setAnswers(a => [...a, { qIdx: pos, picked: i, correct: i === q.answer }]);
  };
  const nextQ = () => {
    if (isLast) { setDone(true); return; }
    setPos(p => p + 1);
    setPicked(null);
  };
  const restart = () => {
    setPos(0); setPicked(null); setAnswers([]); setDone(false);
  };

  // Keyboard: 1-4 pick, Enter next
  useEffectT(() => {
    const onKey = (e) => {
      if (done) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4 && picked === null) pick(n - 1);
      else if ((e.key === "Enter" || e.key === " ") && picked !== null) { e.preventDefault(); nextQ(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, done, pos]);

  if (done) {
    const correct = answers.filter(a => a.correct).length;
    const wrong = answers.filter(a => !a.correct);
    return <TestResults
      deck={deck}
      total={QUESTIONS.length}
      correct={correct}
      wrong={wrong.map(w => ({ ...QUESTIONS[w.qIdx], pickedIdx: w.picked }))}
      onRestart={restart}
      onExit={onExit}
      onFinish={() => onFinish && onFinish(answers, QUESTIONS)}
    />;
  }

  const pct = ((pos + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "0 16px 16px", color: T.ink }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "4px 4px 12px", minHeight: 44 }}>
        <button onClick={onExit} style={iconBtn}>
          <Icon name="back" size={22} stroke={T.nl} />
          <span style={{ fontSize: 17, color: T.nl, marginLeft: -2 }}>Назад</span>
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: T.inkMute, fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.1em" }}>ТЕСТ</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{deck.title}</div>
        </div>
        <div style={{ width: 76, textAlign: "right", fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, monospace", color: T.inkSoft }}>
          {pos + 1}/{QUESTIONS.length}
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, borderRadius: 99, background: T.line, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: T.nl, transition: "width 260ms ease" }} />
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          color: q.dir === "uk2nl" ? T.ua : T.nl,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          marginBottom: 6,
        }}>
          {q.dir === "uk2nl" ? "Як буде нідерландською?" : "Як буде українською?"}
        </div>
        <div style={{
          fontSize: q.prompt.length > 22 ? 26 : q.prompt.length > 14 ? 30 : 36,
          fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1,
          color: T.ink, textWrap: "pretty",
        }}>
          {q.prompt}
        </div>
      </div>

      {/* Options */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflow: "auto" }}>
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isAnswer = q.answer === i;
          const showState = picked !== null;
          let bg = T.card, border = T.line, color = T.ink;
          if (showState && isAnswer) { bg = T.goodSoft; border = T.good; color = T.good; }
          else if (showState && isPicked && !isAnswer) { bg = T.uaSoft; border = T.ua; color = T.ua; }
          else if (showState) { color = T.inkMute; }

          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={picked !== null}
              style={{
                appearance: "none", cursor: picked === null ? "pointer" : "default",
                background: bg, border: `1.5px solid ${border}`,
                borderRadius: 16, padding: "14px 14px",
                textAlign: "left", fontFamily: "inherit", color,
                display: "flex", alignItems: "center", gap: 12,
                transition: "background 160ms ease, border 160ms ease, color 160ms ease",
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                background: showState && isAnswer ? T.good : showState && isPicked ? T.ua : T.lineSoft,
                color: showState && (isAnswer || isPicked) ? "#fff" : T.inkSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}>
                {showState && isAnswer ? "✓" : showState && isPicked ? "✕" : i + 1}
              </span>
              <span style={{
                fontSize: opt.length > 24 ? 15 : 17, fontWeight: 500,
                lineHeight: 1.25, textWrap: "pretty",
              }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback + next */}
      {picked !== null && (
        <div style={{ paddingTop: 12 }}>
          <div style={{
            background: picked === q.answer ? T.goodSoft : T.uaSoft,
            border: `1px solid ${picked === q.answer ? T.good : T.ua}`,
            borderRadius: 14, padding: "10px 12px", marginBottom: 10,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
              color: picked === q.answer ? T.good : T.ua,
              fontFamily: "ui-monospace, SFMono-Regular, monospace", marginBottom: 4,
            }}>
              {picked === q.answer ? "Правильно" : "Неправильно"}
            </div>
            <div style={{ fontSize: 14, fontStyle: "italic", color: T.ink, lineHeight: 1.35 }}>
              {q.example}
            </div>
          </div>
          <button onClick={nextQ} style={primaryBtn}>
            {isLast ? "Завершити" : "Далі"} <Icon name="next" size={16} stroke="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}

function TestResults({ deck, total, correct, wrong, onRestart, onExit }) {
  const pct = Math.round((correct / total) * 100);
  const grade = pct >= 90 ? "Чудово" : pct >= 70 ? "Добре" : pct >= 50 ? "Непогано" : "Тренуйся ще";
  const gradeColor = pct >= 70 ? T.good : pct >= 50 ? T.nl : T.ua;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "0 16px 16px", color: T.ink }}>
      <div style={{ display: "flex", alignItems: "center", padding: "4px 4px 12px", minHeight: 44 }}>
        <button onClick={onExit} style={iconBtn}>
          <Icon name="back" size={22} stroke={T.nl} />
          <span style={{ fontSize: 17, color: T.nl, marginLeft: -2 }}>Теми</span>
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600 }}>Результат</div>
        <div style={{ width: 76 }} />
      </div>

      {/* Score */}
      <div style={{
        background: T.card, borderRadius: 24, padding: "26px 20px",
        textAlign: "center", marginBottom: 14,
        boxShadow: "0 1px 0 rgba(20,15,5,0.04), 0 12px 30px -18px rgba(20,15,5,0.22)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: gradeColor,
          fontFamily: "ui-monospace, SFMono-Regular, monospace", marginBottom: 8,
        }}>{grade}</div>
        <div style={{
          fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1,
          color: gradeColor,
        }}>
          {pct}<span style={{ fontSize: 32, color: T.inkMute }}>%</span>
        </div>
        <div style={{ fontSize: 15, color: T.inkSoft, marginTop: 6 }}>
          {correct} з {total} правильно
        </div>
      </div>

      {/* Wrong list */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {wrong.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
              color: T.inkMute, fontFamily: "ui-monospace, SFMono-Regular, monospace",
              padding: "4px 4px 8px",
            }}>
              Повторити ({wrong.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wrong.map((w, i) => (
                <div key={i} style={{
                  background: T.card, borderRadius: 14, padding: "10px 12px",
                  border: `1px solid ${T.line}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                      {w.dir === "uk2nl" ? w.prompt : w.options[w.answer]}
                    </div>
                    <div style={{ fontSize: 13, color: T.nl, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {w.dir === "uk2nl" ? w.options[w.answer] : w.prompt}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft, fontStyle: "italic", lineHeight: 1.3 }}>
                    {w.example}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {wrong.length === 0 && (
          <div style={{
            textAlign: "center", padding: "24px 12px",
            color: T.good, fontSize: 15,
          }}>
            🎉 Усі відповіді правильні!
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: 10, paddingTop: 12 }}>
        <button onClick={onExit} style={{ ...primaryBtn, background: "transparent", color: T.ink, border: `1px solid ${T.line}` }}>
          До тем
        </button>
        <button onClick={onRestart} style={primaryBtn}>
          <Icon name="reset" size={15} stroke="#fff" /> Ще раз
        </button>
      </div>
    </div>
  );
}

// ─── Question builder ────────────────────────────────────────
function buildQuestions(deck) {
  const N = Math.min(10, deck.cards.length);
  const seed = (Date.now() & 0x7fffffff) ^ (deck.id.length * 9301);
  const rng = mulberryT(seed);
  const idx = deck.cards.map((_, i) => i);
  shuffleT(idx, rng);
  const picked = idx.slice(0, N);

  return picked.map((cardIdx) => {
    const card = deck.cards[cardIdx];
    const dir = rng() < 0.5 ? "uk2nl" : "nl2uk";
    // 3 distractors from same deck (different headwords)
    const pool = deck.cards.map((_, i) => i).filter(i => i !== cardIdx);
    shuffleT(pool, rng);
    const distractIdx = pool.slice(0, 3);
    const correctText = dir === "uk2nl" ? card.nl : card.uk;
    const distractText = distractIdx.map(i => dir === "uk2nl" ? deck.cards[i].nl : deck.cards[i].uk);
    // dedupe (in case of identical translations)
    const uniqDistract = [];
    for (const t of distractText) {
      if (!uniqDistract.includes(t) && t !== correctText) uniqDistract.push(t);
      if (uniqDistract.length === 3) break;
    }
    // top up if not enough
    while (uniqDistract.length < 3) {
      const i = pool[Math.floor(rng() * pool.length)];
      const t = dir === "uk2nl" ? deck.cards[i].nl : deck.cards[i].uk;
      if (!uniqDistract.includes(t) && t !== correctText) uniqDistract.push(t);
    }
    const all = [correctText, ...uniqDistract];
    shuffleT(all, rng);
    const answer = all.indexOf(correctText);
    return {
      dir,
      prompt: dir === "uk2nl" ? card.uk : card.nl,
      options: all,
      answer,
      example: card.ex,
    };
  });
}
function shuffleT(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mulberryT(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const primaryBtn = {
  width: "100%",
  appearance: "none", border: "none", cursor: "pointer",
  background: T.ink, color: "#fff",
  height: 50, borderRadius: 16,
  fontSize: 16, fontWeight: 600, fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

window.Quiz = Test;
window.Test = Test;
