import fs from 'fs';
import path from 'path';
import type { App } from '../generated/ast.js';

export function generateReveal(app: App, filePath: string, destination?: string): string {
    const dest = destination ?? 'dist';
    const name = path.basename(filePath, path.extname(filePath));
    const outFile = path.join(dest, name + '.html');
    let html = '';
    html += '<!doctype html>\n<html><head>\n';
    html += '  <meta charset="utf-8">\n';
    html += '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.css">\n';
    html += '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/theme/white.css">\n';
    html += '</head><body>\n';
    html += '  <div class="reveal"><div class="slides">\n';

    for (const slide of app.slides) {
        html += `    <section>${slide.title}</section>\n`;
    }

    html += '  </div></div>\n';
    html += '  <script src="https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.js"></script>\n';
    html += '  <script>Reveal.initialize({ hash: true, slideNumber: true });</script>\n';
    html += '</body></html>\n';

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    fs.writeFileSync(outFile, html, 'utf8');
    return outFile;
}
