import { Content, isCodeBlock, isLayoutBlock, isMathBlock, Presentation } from "slide-deck-ml-language";

interface PluginConfig {
  name: string;
  importPath: string;
  css?: string[];
  defaultExport?: boolean;
  pluginExpr?: string;
}

const AVAILABLE_PLUGINS: Record<'highlight' | 'math', PluginConfig> = {
  highlight: {
    name: "RevealHighlight",
    importPath: "reveal.js/plugin/highlight/highlight.js",
    css: ["reveal.js/plugin/highlight/monokai.css"],
    defaultExport: true
  },
  math: {
    name: "RevealMath",
    importPath: "reveal.js/plugin/math/math.js",
    defaultExport: true,
    pluginExpr: "RevealMath.KaTeX"
  }
};

interface AnalysisResult {
  hasCode: boolean;
  hasMath: boolean;
  slideNumber: boolean;
  progress: boolean;
  liveAnnotations: boolean;
}


export function generateTs(presentation: Presentation): string {
  const analysis = analyzePresentation(presentation);

  const activePlugins: PluginConfig[] = [];
  if (analysis.hasCode) activePlugins.push(AVAILABLE_PLUGINS.highlight);
  if (analysis.hasMath) activePlugins.push(AVAILABLE_PLUGINS.math);

  const imports = generatePluginImports(activePlugins);
  const pluginNames = activePlugins.map(p => p.pluginExpr ?? p.name).join(", ");

  const katexConfig = analysis.hasMath
    ? `katex: {
      version: "latest",
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\\\(", right: "\\\\)", display: false },
        { left: "\\\\[", right: "\\\\]", display: true },
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    },`
    : "";

  const customListener = analysis.hasCode ? addCodeBlockListener() : "";
  const liveAnnotations = analysis.liveAnnotations ? addSlideAnnotationRuntime() : "";


  return `
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
import '@google/model-viewer';
${imports}

Reveal.initialize({
    hash: true,
    slideNumber: ${analysis.slideNumber},
    progress: ${analysis.progress},
    width: "100%",
    height: "100%",
    disableLayout: true,
    display: "flex",
    ${katexConfig}
    ${pluginNames ? `plugins: [${pluginNames}],` : ""}
});

${customListener}
${liveAnnotations}
`;
}

function analyzePresentation(pres: Presentation): AnalysisResult {
  const result: AnalysisResult = {
    hasCode: false,
    hasMath: false,
    slideNumber: false,
    progress: false,
    liveAnnotations: false
  };

  if (pres.options?.options) {
    for (const opt of pres.options.options) {
      if (opt.value === 'slideNumbers') result.slideNumber = true;
      if (opt.value === 'progressBar') result.progress = true;
      if (opt.value === 'liveAnnotations') result.liveAnnotations = true;
    }
  }

  if (!result.slideNumber || !result.progress || !result.liveAnnotations){
    if (pres.templateRef?.ref?.options) {
      for (const opt of pres.templateRef?.ref.options.options) {
        if (opt.value === 'slideNumbers') result.slideNumber = true;
        if (opt.value === 'progressBar') result.progress = true;
        if (opt.value === 'liveAnnotations') result.liveAnnotations = true;
      }
    }
  }

  for (const slide of pres.slides) {
    checkContentRecursive(slide.contents, result);
    if (result.hasCode && result.hasMath) break;
  }

  return result;
}

function checkContentRecursive(contents: Content[], result: AnalysisResult) {
  if (!contents || !Array.isArray(contents)) return;

  for (const content of contents) {
    if (result.hasCode && result.hasMath) return;

    if (isCodeBlock(content)) {
      result.hasCode = true;
    }
    else if (isMathBlock(content)) {
      result.hasMath = true;
    }
    else if (isLayoutBlock(content)) {
      checkContentRecursive(content.elements, result);
    }
  }
}

function generatePluginImports(plugins: PluginConfig[]): string {
  return plugins
    .map(p => {
      const cssImports = (p.css ?? []).map(css => `import "${css}";`).join("\n");
      const jsImport = p.defaultExport
        ? `import ${p.name} from "${p.importPath}";`
        : `import "${p.importPath}";`;
      return `${cssImports}\n${jsImport}`;
    })
    .join("\n");
}

function addCodeBlockListener() {
  return `
// Custom Listener for syncing Images with Code Steps
Reveal.on('slidechanged', updateSpecificImage);
Reveal.on('fragmentshown', updateSpecificImage);
Reveal.on('fragmenthidden', updateSpecificImage);

function updateSpecificImage() {
    const slide = Reveal.getCurrentSlide();
    if (!slide) return;

    const wrappers: HTMLElement[] = Array.from(slide.querySelectorAll('pre'));

    for (const wrapper of wrappers) {
        const configBlock = wrapper.querySelector('code[data-image-steps]');

        if (!configBlock) continue;

        const imageStr = configBlock.getAttribute('data-image-steps');
        const targetSelector = configBlock.getAttribute('data-target');

        if (!imageStr || !targetSelector) continue;

        const images = imageStr.split('|');

        const visibleFragments = wrapper.querySelectorAll('.fragment.visible').length;

        const safeIndex = Math.min(visibleFragments, images.length - 1);

        const newSrc = images[safeIndex];

        const targetImg = slide.querySelector(targetSelector) || document.querySelector(targetSelector);

        if (targetImg && targetImg.src !== newSrc) {
            targetImg.src = newSrc;
        }
    }
};`;
}

function addSlideAnnotationRuntime() {
  return `
// --- Live slide annotations ---
// D: toggle pen ON/OFF
// E: eraser toggle
// H: highlighter toggle
// 1..5: colors
// S: save  |  L: load
// X: clear current step

(function () {
  type Pt = { x: number; y: number };
  type Stroke = { p: Pt[]; c: string; w: number; a: number; er: boolean };

  const KEY = "slidedeckml:live-anno-steps:v1";
  const COLORS = ["#ff2d2d", "#2d7dff", "#2dff7a", "#ffd52d", "#000000"];

  let on = false, draw = false, eraser = false, hi = false;
  let color = COLORS[0], penW = 4, hiW = 22, erW = 18;

  const mem = new Map<string, Stroke[]>();
  let cur: Stroke | null = null;

  const root = document.querySelector(".reveal") as HTMLElement | null;
  if (!root) return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.zIndex = "9999";
  canvas.style.pointerEvents = "none";
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const flash = (m: string) => {
    const el = document.createElement("div");
    el.textContent = m;
    el.style.cssText =
      "position:fixed;top:12px;left:12px;z-index:10001;padding:6px 10px;" +
      "background:rgba(0,0,0,.6);color:#fff;border-radius:8px;font:12px system-ui";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  };

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; redraw(); };

  const slideKey = () => {
    const i = Reveal.getIndices();
    return String(i.h ?? 0) + "." + String(i.v ?? 0);
  };

  const step = () => {
    const s = Reveal.getCurrentSlide();
    if (!s) return 0;
    return s.querySelectorAll(".fragment.visible").length;
  };

  const k = () => slideKey() + ":" + String(step());

  const get = () => {
    const kk = k();
    if (!mem.has(kk)) mem.set(kk, []);
    return mem.get(kk)!;
  };

  const redraw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    for (const s of get()) {
      if (s.p.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = s.er ? "destination-out" : "source-over";
      ctx.globalAlpha = s.a;
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.p[0].x, s.p[0].y);
      for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i].x, s.p[i].y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const setOn = (v: boolean) => {
    on = v;
    canvas.style.pointerEvents = v ? "auto" : "none";
    flash(v ? "Pen ON (D)" : "Pen OFF (D)");
  };

  const clearStep = () => { mem.set(k(), []); redraw(); flash("Cleared (X)"); };

  const readStore = (): Record<string, Stroke[]> => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  };
  const writeStore = (d: Record<string, Stroke[]>) => localStorage.setItem(KEY, JSON.stringify(d));
  const save = () => { const d = readStore(); d[k()] = get(); writeStore(d); flash("Saved (S)"); };
  const load = () => {
    const d = readStore(); const kk = k();
    mem.set(kk, d[kk] ?? []);
    redraw(); flash(d[kk] ? "Loaded (L)" : "No saved data");
  };

  // Initial load if exists
  ensureMemoryBucket();
  redraw();

  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!on) return;
    draw = true;
    const isE = eraser;
    const isH = hi && !isE;
    cur = { p: [{ x: e.clientX, y: e.clientY }],
            c: isE ? "#000" : color,
            w: isE ? erW : (isH ? hiW : penW),
            a: isE ? 1 : (isH ? 0.25 : 1),
            er: isE };
    get().push(cur);
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    if (!on || !draw || !cur) return;
    cur.p.push({ x: e.clientX, y: e.clientY });
    redraw();
  });

  addEventListener("pointerup", () => { if (!on) return; draw = false; cur = null; });

  const onStepChange = () => { ensureMemoryBucket(); redraw(); };

  function ensureMemoryBucket() {
    const kk = k();
    if (!mem.has(kk)) mem.set(kk, []);
  }


  Reveal.on("slidechanged", onStepChange);
  Reveal.on("fragmentshown", onStepChange);
  Reveal.on("fragmenthidden", onStepChange);

  addEventListener("keydown", (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    const key = e.key;

    if (key === "d" || key === "D") { e.preventDefault(); e.stopPropagation(); setOn(!on); return; }
    if (!on) return;

    if (key === "e" || key === "E") { e.preventDefault(); e.stopPropagation(); eraser = !eraser; if (eraser) hi = false; flash(eraser ? "Eraser ON (E)" : "Eraser OFF (E)"); return; }
    if (key === "h" || key === "H") { e.preventDefault(); e.stopPropagation(); hi = !hi; if (hi) eraser = false; flash(hi ? "Highlighter ON (H)" : "Highlighter OFF (H)"); return; }

    if (key === "x" || key === "X") { e.preventDefault(); e.stopPropagation(); clearStep(); return; }
    if (key === "s" || key === "S") { e.preventDefault(); e.stopPropagation(); save(); return; }
    if (key === "l" || key === "L") { e.preventDefault(); e.stopPropagation(); load(); return; }

    if (key >= "1" && key <= "5") {
      e.preventDefault(); e.stopPropagation();
      const idx = Number(key) - 1;
      if (COLORS[idx]) { color = COLORS[idx]; eraser = false; flash("Color " + key); }
      return;
    }
  }, true);

  addEventListener("resize", resize);
  resize();
})();
`;
}