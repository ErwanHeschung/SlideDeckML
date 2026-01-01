import { Content, FreeText, Image, Presentation, Slide, Video } from "slide-deck-ml-language";
import { mediaSrc, renderVideo } from "./media-util.js";

export function generateHtml(presentation: Presentation): string {
    const slidesHtml = presentation.slides.map(slide => generateSlideHtml(slide, 3)).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${presentation.name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">
${slidesHtml}
    </div>
  </div>
  <script type="module" src="/main.ts"></script>
</body>
</html>`;
}

function generateSlideHtml(slide: Slide, level: number): string {
    const contentHtml = slide.contents.map(c => generateContentHtml(c, level + 1)).join('\n');
    return `${pad(level)}<section>\n${contentHtml}\n${pad(level)}</section>`;
}

function generateContentHtml(content: Content, level: number): string {
    switch (content.$type) {
        case 'Video': {
            const src = mediaSrc(content as Video);
            return `${pad(level)}${renderVideo(src)}`;
        }
        case 'Image': {
            const src = mediaSrc(content as Image);
            return `${pad(level)}<img src="${src}" alt="" />`;
        }
        case 'FreeText': {
            const text = (content as FreeText).inline ?? (content as FreeText).block ?? '';
            const lines = text.split('\n').map(line => pad(level + 1) + line).join('\n');
            return `${pad(level)}<p>\n${lines}\n${pad(level)}</p>`;
        }

        case 'CodeBlock': {
            const code = (content as any).codeContent.join('\n');
            const lines = code.split('\n').map((line:string) => pad(level + 1) + line).join('\n');
            return `${pad(level)}<pre><code class="language-${content.language}">\n${lines}\n${pad(level)}</code></pre>`;
        }

        case 'LayoutBlock': {
            const children = content.elements.map(e => generateContentHtml(e, level + 1)).join('\n');
            return `${pad(level)}<div class="${content.layoutType.toLowerCase()}">\n${children}\n${pad(level)}</div>`;
        }

        case 'UnorderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ul>\n${items}\n${pad(level)}</ul>`;
        }

        case 'OrderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ol>\n${items}\n${pad(level)}</ol>`;
        }

        default:
            return '';
    }
}


function pad(level: number) {
    return '\t'.repeat(level);
}
