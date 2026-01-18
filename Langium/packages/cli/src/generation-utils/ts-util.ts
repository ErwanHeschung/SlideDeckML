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
// D: open/close menu

(function () {
  type Pt = { x: number; y: number };
  type Stroke = { p: Pt[]; c: string; w: number; a: number; er: boolean };

  const KEY = "slidedeckml:live-anno-steps:v1";
  const COLORS = ["#ff2d2d", "#2d7dff", "#2dff7a", "#ffd52d", "#000000"];

  let on = false, draw = false, eraser = false, hi = false;
  let color = COLORS[0], penW = 4, hiW = 22, erW = 18;

  const mem = new Map<string, Stroke[]>();
  let cur: Stroke | null = null;

  const root = document.querySelector(".reveal");
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

  const keyForBucket = () => slideKey() + ":" + String(step());

  const ensureBucket = () => {
    const kk = keyForBucket();
    if (!mem.has(kk)) mem.set(kk, []);
  };

  const get = () => {
    const kk = keyForBucket();
    if (!mem.has(kk)) mem.set(kk, []);
    return mem.get(kk) as Stroke[];
  };

  const redraw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const strokes = get();
    for (const s of strokes) {
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

  const readStore = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  };
  const writeStore = (d: any) => localStorage.setItem(KEY, JSON.stringify(d));

  const save = () => {
    const d: any = readStore();
    d[keyForBucket()] = get();
    writeStore(d);
    flash("Saved");
  };

  const load = () => {
    const d: any = readStore();
    const kk = keyForBucket();
    mem.set(kk, d[kk] || []);
    redraw();
    flash(d[kk] ? "Loaded" : "No saved data");
  };

  const clearStep = () => {
    mem.set(keyForBucket(), []);
    redraw();
    flash("Cleared");
  };

  const setOn = (v: boolean) => {
    on = v;
    canvas.style.pointerEvents = v ? "auto" : "none";
  };

  const onStepChange = () => {
    ensureBucket();
    redraw();
    updateMenu();
  };

  Reveal.on("slidechanged", onStepChange);
  Reveal.on("fragmentshown", onStepChange);
  Reveal.on("fragmenthidden", onStepChange);

  // ----- Drawing -----
  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!on) return;
    draw = true;

    const isE = eraser;
    const isH = hi && !isE;

    cur = {
      p: [{ x: e.clientX, y: e.clientY }],
      c: isE ? "#000" : color,
      w: isE ? erW : (isH ? hiW : penW),
      a: isE ? 1 : (isH ? 0.25 : 1),
      er: isE
    };

    get().push(cur);
    (canvas as any).setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    if (!on || !draw || !cur) return;
    cur.p.push({ x: e.clientX, y: e.clientY });
    redraw();
  });

  addEventListener("pointerup", () => {
    if (!on) return;
    draw = false;
    cur = null;
  });

  // ----- Clickable menu (bottom-left). Toggle with D -----
  const menu = document.createElement("div");
  menu.style.cssText =
    "position:fixed;left:12px;bottom:12px;z-index:10003;" +
    "padding:10px 12px;border-radius:12px;" +
    "background:rgba(0,0,0,.60);color:#fff;" +
    "font:12px system-ui;user-select:none;" +
    "display:none;min-width:260px";

  const btnCss =
    "padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.18);" +
    "background:rgba(255,255,255,.10);color:#fff;cursor:pointer";

  menu.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">' +
      '<div style="font-weight:700;color:#fff">Slide annotations</div>' +
      '<div id="anno-state" style="opacity:.9;color:#fff">OFF</div>' +
    "</div>" +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<button id="anno-pen" style="' + btnCss + '">Pen</button>' +
      '<button id="anno-high" style="' + btnCss + '">Highlighter</button>' +
      '<button id="anno-eraser" style="' + btnCss + '">Eraser</button>' +
    "</div>" +

    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
      '<div style="opacity:.85;color:#fff">Color</div>' +
      '<div id="anno-colors" style="display:flex;gap:6px;flex-wrap:wrap;"></div>' +
    "</div>" +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button id="anno-clear" style="' + btnCss + '">Clear step</button>' +
      '<button id="anno-save" style="' + btnCss + '">Save</button>' +
      '<button id="anno-load" style="' + btnCss + '">Load</button>' +
    "</div>" ;

  document.body.appendChild(menu);

  const stateEl = menu.querySelector("#anno-state") as HTMLElement | null;
  const penBtn = menu.querySelector("#anno-pen") as HTMLButtonElement | null;
  const highBtn = menu.querySelector("#anno-high") as HTMLButtonElement | null;
  const erBtn = menu.querySelector("#anno-eraser") as HTMLButtonElement | null;
  const colorsWrap = menu.querySelector("#anno-colors") as HTMLElement | null;

  function setTool(tool: "pen" | "high" | "eraser") {
    if (tool === "pen") { eraser = false; hi = false; }
    if (tool === "high") { eraser = false; hi = true; }
    if (tool === "eraser") { eraser = true; hi = false; }
    updateMenu();
  }

  function updateMenu() {
    const mode = !on ? "OFF" : (eraser ? "ERASER" : (hi ? "HIGHLIGHT" : "PEN"));
    if (stateEl) stateEl.textContent = mode;

    const activeCss = "background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.35);";
    const idleCss = "background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.18);";

    if (penBtn) penBtn.style.cssText = btnCss + ";" + (mode === "PEN" ? activeCss : idleCss);
    if (highBtn) highBtn.style.cssText = btnCss + ";" + (mode === "HIGHLIGHT" ? activeCss : idleCss);
    if (erBtn) erBtn.style.cssText = btnCss + ";" + (mode === "ERASER" ? activeCss : idleCss);
  }

  // Color dots
  if (colorsWrap) {
    colorsWrap.innerHTML = "";
    COLORS.forEach((c: string) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.title = c;
      dot.style.cssText =
        "width:16px;height:16px;border-radius:999px;" +
        "border:1px solid rgba(255,255,255,.6);cursor:pointer;" +
        "background:" + c + ";padding:0;opacity:.95";
      dot.addEventListener("click", () => {
        color = c;
        updateMenu();
      });
      colorsWrap.appendChild(dot);
    });
  }

  penBtn?.addEventListener("click", () => setTool("pen"));
  highBtn?.addEventListener("click", () => setTool("high"));
  erBtn?.addEventListener("click", () => setTool("eraser"));

  menu.querySelector("#anno-clear")?.addEventListener("click", () => { clearStep(); updateMenu(); });
  menu.querySelector("#anno-save")?.addEventListener("click", () => { save(); updateMenu(); });
  menu.querySelector("#anno-load")?.addEventListener("click", () => { load(); updateMenu(); });

  // Toggle menu with D (also enables/disables drawing)
  addEventListener("keydown", (e: KeyboardEvent) => {
    const k = e.key;
    if (k !== "d" && k !== "D") return;

    e.preventDefault();
    e.stopPropagation();

    const show = menu.style.display === "none";
    menu.style.display = show ? "block" : "none";
    setOn(show);
    updateMenu();
  }, true);

  // Prevent clicks in menu from affecting Reveal
  menu.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
  menu.addEventListener("click", (e) => { e.stopPropagation(); });

  // Init
  ensureBucket();
  redraw();
  updateMenu();

  addEventListener("resize", resize);
  resize();
})();
`;
}