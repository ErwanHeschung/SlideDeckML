import { Content, isCodeBlock, isLayoutBlock, isMathBlock, isModel3D, Presentation, SlideOptions } from "slide-deck-ml-language";

interface PluginConfig {
  name: string;
  importPath: string;
  css?: string[];
  check: (pres: Presentation) => boolean;
  defaultExport?: boolean;
  pluginExpr?: string;
}

interface SlideFlags {
  slideNumber: boolean;
  progress: boolean;
}

const plugins: PluginConfig[] = [
  {
    name: "RevealHighlight",
    importPath: "reveal.js/plugin/highlight/highlight.js",
    css: ["reveal.js/plugin/highlight/monokai.css"],
    check: pres => collectAllContents(pres).some(c => isCodeBlock(c)),
    defaultExport: true
  },
  {
    name: "RevealMath",
    importPath: "reveal.js/plugin/math/math.js",
    check: pres => collectAllContents(pres).some(c => isMathBlock(c)),
    defaultExport: true,
    pluginExpr: "RevealMath.KaTeX"
  },
];

export function generateTs(presentation: Presentation): string {
  const activePlugins = getActivePlugins(presentation);
  const imports = getPluginsImports(activePlugins);

  const pluginNames = getPluginsNames(activePlugins);

  const flags = getSlideFlags(presentation.options);

  const mathEnabled = activePlugins.some(p => p.name === 'RevealMath');

  const katexConfig = mathEnabled
    ? `katex: {\n      version: "latest",\n      delimiters: [\n        { left: "$$", right: "$$", display: true },\n        { left: "$", right: "$", display: false },\n        { left: "\\\\(", right: "\\\\)", display: false },\n        { left: "\\\\[", right: "\\\\]", display: true },\n      ],\n      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],\n    },`
    : "";

  const model3dEnabled = collectAllContents(presentation).some(c => isModel3D(c));
  const modelViewerImport = model3dEnabled ? 'import "@google/model-viewer";\n' : '';
  

  return `
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
${modelViewerImport}${imports}

Reveal.initialize({
    hash: true,
    slideNumber: ${flags.slideNumber},
    progress:${flags.progress},
    width: "100%",
    height: "100%",
    //layout disabled to make our own
    disableLayout: true,
    display: "flex",
    ${katexConfig}
    ${pluginNames ? `plugins: [${pluginNames}],` : ""}
});
`;
}

function collectAllContents(presentation: Presentation): Content[] {
  const result: Content[] = [];

  const visit = (content: Content) => {
    result.push(content);
    if (isLayoutBlock(content)) {
      for (const child of content.elements) {
        visit(child);
      }
    }
  };

  for (const slide of presentation.slides) {
    for (const content of slide.contents) {
      visit(content);
    }
  }

  return result;
}

function getActivePlugins(presentation: Presentation): PluginConfig[] {
  return plugins.filter(p => p.check(presentation));
}

function getPluginsImports(plugins: PluginConfig[]): string {
  return plugins
    .map(p => [
      ...(p.css ?? []).map(css => `import "${css}";`),
      p.defaultExport
        ? `import ${p.name} from "${p.importPath}";`
        : `import "${p.importPath}";`
    ].join("\n"))
    .join("\n");
}

function getPluginsNames(plugins: PluginConfig[]): string {
  return plugins
    .map(p => p.pluginExpr ?? p.name)
    .filter(Boolean)
    .join(", ");
}

function getSlideFlags(slideOptions: SlideOptions | undefined): SlideFlags {
  const flags: SlideFlags = {
    slideNumber: false,
    progress: false
  };

  if (!slideOptions) return flags;

  for (const opt of slideOptions.options) {
    switch (opt.value) {
      case 'slideNumbers':
        flags.slideNumber = true;
        break;
      case 'progressBar':
        flags.progress = true;
        break;
    }
  }

  return flags;
}
