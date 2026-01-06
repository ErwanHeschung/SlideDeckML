import type { App, Presentation } from 'slide-deck-ml-language';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateHtml } from './generation-utils/html-util.js';
import { generateCss } from './generation-utils/css-util.js';
import { generateTs } from './generation-utils/ts-util.js';


export function generateOutput(model: App, destinationFolder: string): void {

  const presentation = model.declaration as Presentation;

  const html = generateHtml(presentation);
  writeFileSync(join(destinationFolder, `index.html`), html);

  const css = generateCss(presentation);
  writeFileSync(join(destinationFolder, `style.css`), css);

  const ts = generateTs(presentation);
  writeFileSync(join(destinationFolder, `main.ts`), ts);
}