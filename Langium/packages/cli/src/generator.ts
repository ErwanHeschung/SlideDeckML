import type { App } from 'slide-deck-ml-language';
import { expandToNode, toString } from 'langium/generate';
import * as fs from 'node:fs';
import { extractDestinationAndName } from './util.js';

export function generateOutput(model: App, source: string, destination: string): string {
    const data = extractDestinationAndName(destination);

    const slidesHtml = model.slides
        .map(s => `<section>${stripQuotes(s.title)}</section>`)
        .join('\n      ');

    const fileNode = expandToNode`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Generated Slide Deck</title>
  <style>
    html, body {
      margin: 0;
      height: 100%;
    }
  </style>
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
    `.appendNewLineIfNotEmpty();

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }

    fs.writeFileSync(destination, toString(fileNode));
    return destination;
}

function stripQuotes(str: string): string {
    // Langium garde les guillemets, donc on les enlève
    return str.replace(/^["']|["']$/g, '');
}
