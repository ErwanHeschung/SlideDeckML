import { CodeBlock, Content, isHAlignOption, isLayoutTypeOption, isVAlignOption, LayoutBlock, LayoutStyle, MathBlock, MediaBlock, Presentation, Slide, TextBlock } from "slide-deck-ml-language";
import { mediaSrc, renderVideo } from "./media-util.js";
import { Prefixes } from "./prefix-registry-util.js";

const DEFAULT_V_ALIGNMENT = 'center';
const DEFAULT_H_ALIGNMENT = 'center';
const DEFAULT_LAYOUT = 'vertical';

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
    return `${pad(level)}<section class="${getClassesFromLayout(slide.layout as LayoutStyle)} ${Prefixes.getPrefix(slide)}">\n${contentHtml}\n${pad(level)}</section>`;
}

function generateContentHtml(content: Content, level: number): string {
    switch (content.$type) {
        case 'Video':
        case 'Image':
            return generateMedia(content as MediaBlock, level);
        case 'UnorderedList':
        case 'OrderedList':
        case 'FreeText':
            return generateText(content as TextBlock, level);
        case 'CodeBlock': {
            const code = (content as CodeBlock).codeContent.join('\n');
            const lines = code.split('\n').map((line:string) => pad(level + 1) + line).join('\n');
            return `${pad(level)}<pre><code class="language-${(content as CodeBlock).language} ${Prefixes.getPrefix(content)}">\n${lines}\n${pad(level)}</code></pre>`;
        }
        case 'LayoutBlock': {
            const children = (content as LayoutBlock).elements.map(e => generateContentHtml(e, level + 1)).join('\n');
            
            return `${pad(level)}<div class="layout ${getClassesFromLayout(content.layout as LayoutStyle)} ${Prefixes.getPrefix(content)}">\n${children}\n${pad(level)}</div>`;
        }
        case 'MathBlock': {
            const formula = (content as MathBlock).content;
            const lines = formula.split('\n').map(line => pad(level + 1) + line).join('\n');
            return `${pad(level)}<div class="math ${Prefixes.getPrefix(content)}">\n${pad(level + 1)}$$\n${lines}\n${pad(level + 1)}$$\n${pad(level)}</div>`;
        }
        default:
            return '';
    }
}

function generateMedia(content: MediaBlock, level: number): string  {
    switch (content.$type) {
        case 'Video': {
            const src = mediaSrc(content);
            return `${pad(level)}${renderVideo(src,Prefixes.getPrefix(content))}`;
        }
        case 'Image': {
            const src = mediaSrc(content);
            return `${pad(level)}<img class="${Prefixes.getPrefix(content)}" src="${src}" alt="" />`;
        }
    }
}

function generateText(content: TextBlock, level: number): string  {
    switch (content.$type) {
        case 'FreeText': {
            const text = content.inline ?? content.block ?? '';
            const lines = text.split('\n').map(line => pad(level + 1) + line).join('\n');
            return `${pad(level)}<p class="${Prefixes.getPrefix(content)}">\n${lines}\n${pad(level)}</p>`;
        }
        case 'UnorderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ul class="${Prefixes.getPrefix(content)}">\n${items}\n${pad(level)}</ul>`;
        }
        case 'OrderedList': {
            const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
            return `${pad(level)}<ol class="${Prefixes.getPrefix(content)}">\n${items}\n${pad(level)}</ol>`;
        }
    }
}


function pad(level: number) {
    return '\t'.repeat(level);
}

function getClassesFromLayout(layout: LayoutStyle) {
    if (!layout || !layout.options || layout.options.length === 0) {
        return `${DEFAULT_LAYOUT} v-align-${DEFAULT_V_ALIGNMENT} h-align-${DEFAULT_H_ALIGNMENT}`;
    }

    let layoutType = DEFAULT_LAYOUT;
    let vertical = DEFAULT_V_ALIGNMENT;
    let horizontal = DEFAULT_H_ALIGNMENT;

    for (const option of layout.options) {
        if (isLayoutTypeOption(option)) {
            layoutType = option.layoutType;
        }
        if (isVAlignOption(option)) {
            vertical = option.verticalAlignment;
        }
        if (isHAlignOption(option)) {
            horizontal = option.horizontalAlignment;
        }
    }

    //need to be swapped due to flexbox properties
    if (layoutType === 'vertical') {
        [vertical, horizontal] = [horizontal, vertical];
    }

    return `${layoutType} v-align-${vertical} h-align-${horizontal}`;
}