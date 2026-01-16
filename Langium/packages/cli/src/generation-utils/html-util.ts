import { Animation, CodeBlock, Content, isCodeBlock, isFreeText, isHAlignOption, isImage, isLayoutBlock, isLayoutTypeOption, isMathBlock, isMediaBlock, isModel3D, isOrderedList, isRangeLineHighlight, isSimpleHighlight, isSimpleLineHighlight, isTextBlock, isTextItem, isUnorderedList, isVAlignOption, isVideo, isVisualHighlight, LayoutStyle, LineHighlight, List, ListItem, MediaBlock, Presentation, Slide, TextBlock, isRectAnnotation, isArrowAnnotation } from "slide-deck-ml-language";

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
	if (isMediaBlock(content)) {
		return generateMedia(content, level);
	}
	if (isTextBlock(content)) {
		return generateText(content, level);
	}
	if (isCodeBlock(content)) {
		return generateCodeBlock(content, level);
	}
	if (isLayoutBlock(content)) {
		const children = content.elements.map(e => generateContentHtml(e, level + 1)).join('\n');
		const fragment = getFragmentConfig(content);

		return `${pad(level)}<div class="layout ${getClassesFromLayout(content.layout as LayoutStyle)} ${Prefixes.getPrefix(content)}${fragment.classSuffix}"${fragment.attrs}>\n${children}\n${pad(level)}</div>`;
	}
	if (isMathBlock(content)) {
		const formula = content.content;
		const lines = formula.split('\n').map(line => pad(level + 1) + line).join('\n');
		const fragment = getFragmentConfig(content);
		return `${pad(level)}<div class="math ${Prefixes.getPrefix(content)}${fragment.classSuffix}"${fragment.attrs}>\n${pad(level + 1)}$$\n${lines}\n${pad(level + 1)}$$\n${pad(level)}</div>`;
	}
	return '';

}

function generateMedia(content: MediaBlock, level: number): string {
	const src = mediaSrc(content.url);
	const fragment = getFragmentConfig(content);
	const className = `${Prefixes.getPrefix(content)}${fragment.classSuffix}`;
	const extraAttrs = fragment.attrs;
	if (isVideo(content)) {
		const html = renderVideo(src, className);
		if (!extraAttrs) {
			return `${pad(level)}${html}`;
		}
		return `${pad(level)}${injectAttrsIntoFirstTag(html, extraAttrs)}`;
	}
	if (isImage(content)) {
        const ann = (content as any).annotations?.annotations ?? [];

        if (ann.length === 0) {
            return `${pad(level)}<img class="${className}"${extraAttrs} src="${src}" alt="" />`;
        }

        return `${pad(level)}<div class="annotated-media ${className}"${extraAttrs}>\n` +
            `${pad(level + 1)}<img class="${Prefixes.getPrefix(content)}" src="${src}" alt="" />\n` +
            `${pad(level + 1)}${generateAnnotationsSvg(content)}\n` +
            `${pad(level)}</div>`;
    }
	if (isModel3D(content)) {
		return `${pad(level)}<model-viewer class="${className}"${extraAttrs} src="${src}" alt="" camera-controls></model-viewer>`;
	}

	return '';
}

function generateText(content: TextBlock, level: number): string {
	if (isFreeText(content)) {
		const text = content.inline ?? content.block ?? '';
		const lines = text.split('\n').map(line => pad(level + 1) + line).join('\n');
		const fragment = getFragmentConfig(content);
		return `${pad(level)}<p class="${Prefixes.getPrefix(content)}${fragment.classSuffix}"${fragment.attrs}>\n${lines}\n${pad(level)}</p>`;
	}
	if (isUnorderedList(content)) {
		return renderList(content, 'ul', level);
	}
	if (isOrderedList(content)) {
		return renderList(content, 'ol', level);
	}
	return '';
}

function renderList(list: List, tag: 'ul' | 'ol', level: number): string {
	const fragment = getFragmentConfig(list);
	const prefix = Prefixes.getPrefix(list as unknown as Content);
	const items = list.items.map(item => renderListItem(item, level + 1)).join('\n');
	return `${pad(level)}<${tag} class="${prefix}${fragment.classSuffix}"${fragment.attrs}>\n${items}\n${pad(level)}</${tag}>`;
}

function renderListItem(item: ListItem, level: number): string {
	if (isTextItem(item)) {
		const text = item.text ?? '';
		return `${pad(level)}<li>${text}</li>`;
	}

	if (isUnorderedList(item)) {
		const nestedHtml = renderList(item, 'ul', level + 1);
		return `${pad(level)}<li style="list-style-type: none;">\n${nestedHtml}\n${pad(level)}</li>`;
	}
	if (isOrderedList(item)) {
		const nestedHtml = renderList(item, 'ol', level + 1);
		return `${pad(level)}<li style="list-style-type: none;">\n${nestedHtml}\n${pad(level)}</li>`;
	}

	return `${pad(level)}<li></li>`;
}

function generateCodeBlock(content: CodeBlock, level: number): string {
	const code = content.codeContent;
	const lines = code.split('\n').map((line: string) => pad(level + 2) + line).join('\n');
	const codeHighlight = content?.highlight ? generateCodeHighlight(content) : undefined;
	const fragment = getFragmentConfig(content);
	return `
${pad(level)}<div class="code-block ${Prefixes.getPrefix(content)} horizontal">
${pad(level + 1)}<pre class="${fragment.classSuffix.trim()}"${fragment.attrs}><code data-trim ${codeHighlight ?? ""} class="language-${content.language}">\n${lines}\n${pad(level)}
${pad(level+1)}</code></pre>
${pad(level+1)}${isVisualHighlight(content?.highlight) ? `<img alt="Legend for code highlighting" class="highlight-${Prefixes.getPrefix(content)}" />` : ''}
${pad(level)}</div>`;
}

function getFragmentConfig(node: { animation?: Animation }): { classSuffix: string; attrs: string } {
	const animation = node.animation;
	if (!animation) {
		return { classSuffix: '', attrs: '' };
	}

	const classSuffix = ` fragment ${animation.effect}`;
	let attrs = '';

	if (animation.index !== undefined) {
		attrs += ` data-fragment-index="${animation.index}"`;
	}
	if (animation.durationMs !== undefined) {
		attrs += ` style="transition-duration: ${animation.durationMs}ms"`;
	}

	return { classSuffix, attrs };
}

function injectAttrsIntoFirstTag(html: string, attrs: string): string {
	const firstTagEnd = html.indexOf('>');
	if (firstTagEnd === -1) {
		return html;
	}
	return `${html.slice(0, firstTagEnd)}${attrs}${html.slice(firstTagEnd)}`;
}

function generateCodeHighlight(Codeblock: CodeBlock): string | undefined {
	let linesHighlight = 'data-line-numbers="';

	if (isSimpleHighlight(Codeblock.highlight)) {
		return linesHighlight + getLineHighlight(Codeblock.highlight.steps) + '"';
	}
	else if (isVisualHighlight(Codeblock.highlight)) {
		const imageTarget = ` data-target=".highlight-${Prefixes.getPrefix(Codeblock)}"`;
		let lastUrl: string | undefined;

		let imageSteps =
			`data-image-steps="${Codeblock.highlight.steps
				.map(step => {
					if (step.url) {
						lastUrl = step.url;
						return mediaSrc(step.url);
					}
					return lastUrl;
				})
				.filter((url): url is string => !!url)
				.join('|')}`;
		imageSteps += '"';
		
		return linesHighlight + getLineHighlight(Codeblock.highlight.steps.flatMap(step => { return step.linehighlight; }))+'"'+ ' ' + imageTarget + ' ' + imageSteps;
	}
	return undefined;
}

function getLineHighlight(lines: LineHighlight[], separator: string = '|'): string {
    const processedSteps = lines.map(lineWrapper => {

        const atomicParts = lineWrapper.lines.map(atomic => {
            if (isSimpleLineHighlight(atomic)) {
                return `${atomic.line}`;
            } else if (isRangeLineHighlight(atomic)) {
                return `${atomic.startLine}-${atomic.endLine}`;
            }
            return '';
        });
        return atomicParts.join(',');
    });
    return processedSteps.join(separator);
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

	if (layoutType === 'vertical') {
		[vertical, horizontal] = [horizontal, vertical];
	}

	return `${layoutType} v-align-${vertical} h-align-${horizontal}`;
}

function generateAnnotationsSvg(image: any): string {
    const annotations = image.annotations?.annotations ?? [];
    if (!annotations.length) return '';

    const shapes: string[] = [];

    for (const a of annotations) {
        const frag = fragmentAttrsForStep(a.step);

        if (isRectAnnotation(a)) {
            const x = pct(a.x), y = pct(a.y), w = pct(a.w), h = pct(a.h);
            shapes.push(`<rect class="anno-rect${frag.cls}"${frag.attrs} x="${x}" y="${y}" width="${w}" height="${h}" rx="1" ry="1" />`);
            if (a.label) {
                shapes.push(`<text class="anno-label${frag.cls}"${frag.attrs} x="${x}" y="${y}">${escapeXml(stripQuotes(a.label))}</text>`);
            }
        } else if (isArrowAnnotation(a)) {
            const x1 = pct(a.x1), y1 = pct(a.y1), x2 = pct(a.x2), y2 = pct(a.y2);
            shapes.push(`<line class="anno-arrow${frag.cls}"${frag.attrs} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrowhead)" />`);
            if (a.label) {
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                shapes.push(`<text class="anno-label${frag.cls}"${frag.attrs} x="${mx}" y="${my}">${escapeXml(stripQuotes(a.label))}</text>`);
            }
        }
    }

    return `<svg class="annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" class="anno-arrowhead" />
    </marker>
  </defs>
  ${shapes.join("\n  ")}
</svg>`;
}

function fragmentAttrsForStep(step?: number): { cls: string; attrs: string } {
    if (typeof step !== 'number') return { cls: '', attrs: '' };
    return { cls: ' fragment', attrs: ` data-fragment-index="${step}"` };
}

function pct(p: string): number {
    return Number.parseFloat(p.replace('%', ''));
}

function escapeXml(s: string): string {
    return s.replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return ch;
        }
    });
}

function stripQuotes(s: string): string {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    return s;
}
