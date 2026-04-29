// ============ P1ERA AGENCY — APP ============

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "burgundy",
  "cursor_blob": true
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  burgundy: { accent: "#7A1E35", strong: "#4F0C28" },
  plum:     { accent: "#6B1E3E", strong: "#4F0C28" },
  garnet:   { accent: "#9C2A48", strong: "#7A1E35" },
};

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const blobRef = React.useRef(null);

  // Theme + accent
  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    const root = document.documentElement;
    const a = ACCENT_MAP[tweaks.accent] || ACCENT_MAP.burgundy;
    root.style.setProperty("--accent", a.accent);
    root.style.setProperty("--accent-strong", a.strong);
  }, [tweaks]);

  // Reveal observer
  React.useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });

  // Cursor blob — hide on interactive hover
  React.useEffect(() => {
    if (!tweaks.cursor_blob) return;
    let raf;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let x = tx, y = ty;
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target;
      const interactive = t && t.closest && t.closest('a, button, input, textarea, .benefit-card, .ba-card, .testimonial, .process-step, .nav, .tweaks-panel');
      if (blobRef.current) {
        blobRef.current.classList.toggle("is-hidden", !!interactive);
      }
    };
    const onLeave = () => { if (blobRef.current) blobRef.current.classList.add("is-hidden"); };
    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [tweaks.cursor_blob]);

  return (
    <>
      {tweaks.cursor_blob && <div className="cursor-blob" ref={blobRef}></div>}
      <Nav theme={tweaks.theme} onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")} />
      <Hero />
      <About />
      <Benefits />
      <Results />
      <BeforeAfter />
      <Process />
      <Testimonials />
      <Statement />
      <Contact />
      <Footer />

      <window.TweaksPanel title="Tweaks" subtitle="P1ERA Agency">
        <window.TweakSection title="Theme">
          <window.TweakRadio
            value={tweaks.theme}
            onChange={v => setTweak("theme", v)}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection title="Accent">
          <window.TweakRadio
            value={tweaks.accent}
            onChange={v => setTweak("accent", v)}
            options={[
              { value: "burgundy", label: "Burgundy" },
              { value: "plum", label: "Plum" },
              { value: "garnet", label: "Garnet" },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection title="Cursor blob">
          <window.TweakToggle
            value={tweaks.cursor_blob}
            onChange={v => setTweak("cursor_blob", v)}
            label="Show ambient cursor glow"
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
