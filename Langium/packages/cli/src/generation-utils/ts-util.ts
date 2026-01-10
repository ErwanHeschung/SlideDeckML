import { isCodeBlock, isMathBlock, Presentation, SlideOptions } from "slide-deck-ml-language";

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
    check: pres => pres.slides.some(slide =>
      slide.contents.some(c => isCodeBlock(c))
    ),
    defaultExport: true
  },
  {
    name: "RevealMath",
    importPath: "reveal.js/plugin/math/math.js",
    check: pres => pres.slides.some(slide =>
      slide.contents.some(c => isMathBlock(c))
    ),
    defaultExport: true,
    pluginExpr: "RevealMath.KaTeX"
  },
];

export function generateTs(presentation: Presentation): string {
  const activePlugins = getActivePlugins(presentation);
  presentation.options?.options.forEach
  const imports = getPluginsImports(activePlugins);

  const pluginNames = getPluginsNames(activePlugins);

  const flags = getSlideFlags(presentation.options);

  const mathEnabled = activePlugins.some(p => p.name === 'RevealMath');

  const katexConfig = mathEnabled
    ? `katex: {\n      version: "latest",\n      delimiters: [\n        { left: "$$", right: "$$", display: true },\n        { left: "$", right: "$", display: false },\n        { left: "\\\\(", right: "\\\\)", display: false },\n        { left: "\\\\[", right: "\\\\]", display: true },\n      ],\n      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],\n    },`
    : "";
  

  return `
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
import '@google/model-viewer';
${imports}

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
