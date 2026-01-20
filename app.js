(function () {
  const el = (id) => document.getElementById(id);

  const orderEl = el("order");
  const fcEl = el("fc");
  const tsEl = el("ts");
  const calcBtn = el("calcBtn");
  const copyBtn = el("copyBtn");
  const warningEl = el("warning");

  const outTitleEl = el("outTitle");
  const n0El = el("n0");
  const n1El = el("n1");
  const n2El = el("n2");
  const d1El = el("d1");
  const d2El = el("d2");
  const outTextEl = el("outText");

  function fmt(x) {
    if (!isFinite(x)) return "NaN";
    // Keep stable, copy-friendly precision:
    return Number(x).toPrecision(17).replace(/\.?0+e/, "e").replace(/\.?0+$/, "");
  }

  function showWarning(msg) {
    if (!msg) {
      warningEl.hidden = true;
      warningEl.textContent = "";
      return;
    }
    warningEl.hidden = false;
    warningEl.textContent = msg;
  }

  // 1st order LPF via bilinear transform with prewarping:
  // K = tan(pi*fc/Fs).  H(z) = (b0 + b1 z^-1) / (1 + a1 z^-1)
  function lpf1(fc, Ts) {
    const Fs = 1 / Ts;
    const nyq = Fs / 2;

    const K = Math.tan(Math.PI * (fc / Fs));
    const norm = 1 / (1 + K);

    const b0 = K * norm;
    const b1 = b0;
    const a1 = (K - 1) * norm;

    // y = b0 x + b1 x1 - a1 y1
    return { N0: b0, N1: b1, N2: 0, D1: a1, D2: 0, Fs, nyq };
  }

  // 2nd order Butterworth LPF (Q=1/sqrt(2)) via bilinear w/ prewarping:
  // K = tan(pi*fc/Fs)
  // b0 = K^2 / (1 + sqrt2*K + K^2), b1 = 2*b0, b2 = b0
  // a1 = 2*(K^2 - 1)/den, a2 = (1 - sqrt2*K + K^2)/den
  function lpf2(fc, Ts) {
    const Fs = 1 / Ts;
    const nyq = Fs / 2;

    const K = Math.tan(Math.PI * (fc / Fs));
    const K2 = K * K;
    const rt2 = Math.SQRT2;
    const den = (1 + rt2 * K + K2);

    const b0 = K2 / den;
    const b1 = 2 * b0;
    const b2 = b0;

    const a1 = (2 * (K2 - 1)) / den;
    const a2 = (1 - rt2 * K + K2) / den;

    // y = b0 x + b1 x1 + b2 x2 - a1 y1 - a2 y2
    return { N0: b0, N1: b1, N2: b2, D1: a1, D2: a2, Fs, nyq };
  }

  function compute() {
    const order = Number(orderEl.value);
    const fc = Number(fcEl.value);
    const Ts = Number(tsEl.value);

    showWarning("");

    if (!(Ts > 0) || !(fc > 0)) {
      showWarning("Please enter Ts > 0 and cutoff frequency > 0.");
      return null;
    }

    const Fs = 1 / Ts;
    const nyq = Fs / 2;
    if (fc >= nyq) {
      showWarning(
        `Cutoff must be below Nyquist (Fs/2). Your Fs = ${fmt(Fs)} Hz so Nyquist = ${fmt(nyq)} Hz.`
      );
      return null;
    }

    let r;
    if (order === 1) r = lpf1(fc, Ts);
    else r = lpf2(fc, Ts);

    return { order, fc, Ts, ...r };
  }

  function render(res) {
    if (!res) {
      outTitleEl.textContent = "—";
      n0El.textContent = "—";
      n1El.textContent = "—";
      n2El.textContent = "—";
      d1El.textContent = "—";
      d2El.textContent = "—";
      outTextEl.textContent = "—";
      copyBtn.disabled = true;
      return;
    }

    const title = `${fmt(res.fc)} Hz LPF (order ${res.order}) with Ts = ${fmt(res.Ts)} s (Fs = ${fmt(res.Fs)} Hz)`;
    outTitleEl.textContent = title;

    n0El.textContent = fmt(res.N0);
    n1El.textContent = fmt(res.N1);
    n2El.textContent = fmt(res.N2);
    d1El.textContent = fmt(res.D1);
    d2El.textContent = fmt(res.D2);

    const block =
`N0 = ${fmt(res.N0)},
N1 = ${fmt(res.N1)},
N2 = ${fmt(res.N2)},
D1 = ${fmt(res.D1)},
D2 = ${fmt(res.D2)}`;
    outTextEl.textContent = block;
    copyBtn.disabled = false;
  }

  function copyOutput() {
    const txt = outTextEl.textContent || "";
    if (!txt || txt.trim() === "—") return;
    navigator.clipboard?.writeText(txt).catch(() => {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  function recalc() {
    const res = compute();
    render(res);
  }

  calcBtn.addEventListener("click", recalc);
  copyBtn.addEventListener("click", copyOutput);

  // auto-recalc on edits (nice on phone)
  [orderEl, fcEl, tsEl].forEach((x) => x.addEventListener("input", () => {
    // Don’t spam warnings while typing incomplete numbers:
    showWarning("");
  }));
  [orderEl, fcEl, tsEl].forEach((x) => x.addEventListener("change", recalc));

  // initial
  recalc();
})();
