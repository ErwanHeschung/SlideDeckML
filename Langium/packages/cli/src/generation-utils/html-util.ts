import { CodeBlock, Content, LayoutBlock, MediaBlock, Presentation, Slide, TextBlock } from "slide-deck-ml-language";
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
        case 'MediaBlock':
            return generateMedia(content as MediaBlock, level);
        
        case 'TextBlock':
            return generateText(content as TextBlock, level);
        case 'CodeBlock': {
            const code = (content as CodeBlock).codeContent.join('\n');
            const lines = code.split('\n').map((line:string) => pad(level + 1) + line).join('\n');
            return `${pad(level)}<pre><code class="language-${(content as CodeBlock).language}">\n${lines}\n${pad(level)}</code></pre>`;
        }
        case 'LayoutBlock': {
            const children = (content as LayoutBlock).elements.map(e => generateContentHtml(e, level + 1)).join('\n');
            return `${pad(level)}<div class="${(content as LayoutBlock).layoutType.toLowerCase()}">\n${children}\n${pad(level)}</div>`;
        }
        default:
            return '';
    }
}

function generateMedia(content: MediaBlock, level: number): string  {
    switch (content.$type) {
        case 'Video': {
            const src = mediaSrc(content);
            return `${pad(level)}${renderVideo(src)}`;
        }
        case 'Image': {
            const src = mediaSrc(content);
            return `${pad(level)}<img src="${src}" alt="" />`;
        }
    }
}

function generateText(content: TextBlock, level: number): string  {
    switch (content.$type) {
        case 'FreeText': {
            const text = content.inline ?? content.block ?? '';
            const lines = text.split('\n').map(line => pad(level + 1) + line).join('\n');
            return `${pad(level)}<p>\n${lines}\n${pad(level)}</p>`;
        }
        case 'UnorderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ul>\n${items}\n${pad(level)}</ul>`;
        }
        case 'OrderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ol>\n${items}\n${pad(level)}</ol>`;
        }
    }
}


function pad(level: number) {
    return '\t'.repeat(level);
}
