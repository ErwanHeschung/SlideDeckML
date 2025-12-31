import type { App, Presentation, Slide } from 'slide-deck-ml-language';
import { writeFileSync } from 'fs';
import { join } from 'path';


export function generateOutput(model: App, destinationFolder: string): void {

  const presentation = model.declaration as Presentation;

  const html = generateHtml(presentation);
  writeFileSync(join(destinationFolder, `index.html`), html);

  const css = generateCss();
  writeFileSync(join(destinationFolder, `style.css`), css);

  const ts = generateTs(presentation);
  writeFileSync(join(destinationFolder, `main.ts`), ts);
}

function generateHtml(presentation: Presentation): string {
  const slidesHtml = presentation.slides.map(slide => generateSlideHtml(slide)).join('\n');
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${presentation.name}</title>
  <link rel="stylesheet" href="${presentation.name}.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>
  <script type="module" src="/main.ts"></script>
</body>
</html>

`;
}

function generateSlideHtml(slide: Slide): string {
  const contentHtml = slide.contents.map(c => c).join('\n');
  return `<section>${contentHtml}</section>`;
}


function generateCss(): string {
  return `
html, body {
  margin: 0;
  height: 100%;
}
  `;
}


function generateTs(presentation: Presentation): string {
  return `
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";

Reveal.initialize({
    hash: true,
    slideNumber: true,
    width: "100%",
    height: "100%"
});
  `;
}