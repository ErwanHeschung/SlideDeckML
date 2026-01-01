import { Presentation } from "slide-deck-ml-language";

interface PluginConfig {
  name: string;
  importPath: string;
  css?: string[];
  check: (pres: Presentation) => boolean;
  defaultExport?: boolean;
}

export function generateTs(presentation: Presentation): string {
  const plugins: PluginConfig[] = [
    {
      name: "RevealHighlight",
      importPath: "reveal.js/plugin/highlight/highlight.js",
      css: ["reveal.js/plugin/highlight/monokai.css"],
      check: pres => pres.slides.some(slide =>
        slide.contents.some(c => c.$type === "CodeBlock")
      ),
      defaultExport:true
    },
  ];


  const imports = plugins
    .filter(p => p.check(presentation))
    .map(p => [
      ...(p.css ?? []).map(css => `import "${css}";`),
      p.defaultExport
        ? `import ${p.name} from "${p.importPath}";`
        : `import "${p.importPath}";`
    ].join("\n"))
    .join("\n");

  const activePlugins = plugins
    .filter(p => p.check(presentation))
    .map(p => p.name)
    .filter(Boolean)
    .join(", ");

  return `
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
${imports}

Reveal.initialize({
    hash: true,
    slideNumber: true,
    width: "100%",
    height: "100%",
    //layout disabled to make our own
    disableLayout: true,
    display: "flex",
    ${activePlugins ? `plugins: [${activePlugins}],` : ""}
});
`;
}
