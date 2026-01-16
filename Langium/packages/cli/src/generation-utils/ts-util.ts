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
`;
}

function analyzePresentation(pres: Presentation): AnalysisResult {
  const result: AnalysisResult = {
    hasCode: false,
    hasMath: false,
    slideNumber: false,
    progress: false
  };

  if (pres.options?.options) {
    for (const opt of pres.options.options) {
      if (opt.value === 'slideNumbers') result.slideNumber = true;
      if (opt.value === 'progressBar') result.progress = true;
    }
  }

  if (!result.slideNumber || !result.progress){
    if (pres.templateRef?.ref?.options) {
      for (const opt of pres.templateRef?.ref.options.options) {
        if (opt.value === 'slideNumbers') result.slideNumber = true;
        if (opt.value === 'progressBar') result.progress = true;
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