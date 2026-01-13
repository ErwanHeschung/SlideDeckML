import { CodeBlock, Content, isCodeBlock, isFreeText, isHAlignOption, isImage, isLayoutBlock, isLayoutTypeOption, isMathBlock, isMediaBlock, isModel3D, isMultiLineHighlight, isOrderedList, isRangeLineHighlight, isSimpleHighlight, isSimpleLineHighlight, isTextBlock, isUnorderedList, isVAlignOption, isVideo, isVisualHighlight, LayoutStyle, LineHighlight, MediaBlock, Presentation, Slide, TextBlock } from "slide-deck-ml-language";
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

		return `${pad(level)}<div class="layout ${getClassesFromLayout(content.layout as LayoutStyle)} ${Prefixes.getPrefix(content)}">\n${children}\n${pad(level)}</div>`;
	}
	if (isMathBlock(content)) {
		const formula = content.content;
		const lines = formula.split('\n').map(line => pad(level + 1) + line).join('\n');
		return `${pad(level)}<div class="math ${Prefixes.getPrefix(content)}">\n${pad(level + 1)}$$\n${lines}\n${pad(level + 1)}$$\n${pad(level)}</div>`;
	}
	return '';

}

function generateMedia(content: MediaBlock, level: number): string {
	const src = mediaSrc(content.url);
	if (isVideo(content)) {
		return `${pad(level)}${renderVideo(src, Prefixes.getPrefix(content))}`;
	}
	if (isImage(content)) {
		return `${pad(level)}<img class="${Prefixes.getPrefix(content)}" src="${src}" alt="" />`;
	}
	if (isModel3D(content)) {
		return `${pad(level)}<model-viewer class="${Prefixes.getPrefix(content)}" src="${src}" alt="" camera-controls></model-viewer>`;
	}

	return '';
}

function generateText(content: TextBlock, level: number): string {
	if (isFreeText(content)) {
		const text = content.inline ?? content.block ?? '';
		const lines = text.split('\n').map(line => pad(level + 1) + line).join('\n');
		return `${pad(level)}<p class="${Prefixes.getPrefix(content)}">\n${lines}\n${pad(level)}</p>`;
	}
	if (isUnorderedList(content)) {
		const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
		return `${pad(level)}<ul class="${Prefixes.getPrefix(content)}">\n${items}\n${pad(level)}</ul>`;
	}
	if (isOrderedList(content)) {
		const items = content.items.map(i => pad(level + 1) + `<li>${i.text}</li>`).join('\n');
		return `${pad(level)}<ol class="${Prefixes.getPrefix(content)}">\n${items}\n${pad(level)}</ol>`;
	}
	return '';
}

function generateCodeBlock(content: CodeBlock, level: number): string {
	const code = content.codeContent;
	const lines = code.split('\n').map((line: string) => pad(level + 2) + line).join('\n');
	const codeHighlight = content?.highlight ? generateCodeHighlight(content) : undefined;
	return `
${pad(level)}<div class="code-block ${Prefixes.getPrefix(content)} horizontal">
${pad(level + 1)}<pre><code data-trim ${codeHighlight ?? ""} class="language-${content.language}">\n${lines}\n${pad(level)}
${pad(level+1)}</code></pre>
${pad(level+1)}${isVisualHighlight(content?.highlight) ? `<img alt="Legend for code highlighting" class="highlight-${Prefixes.getPrefix(content)}" />` : ''}
${pad(level)}</div>`;
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
	let linesHighlight = '';
	for (const line of lines) {
		if (isSimpleLineHighlight(line)) {
			linesHighlight += `${line.line}`;
		} else if (isRangeLineHighlight(line)) {
			linesHighlight += `${line.startLine}-${line.endLine}`;
		} else if (isMultiLineHighlight(line)) {
			linesHighlight += getLineHighlight(line.lines, ',');
		}
		linesHighlight += separator;
	}
	linesHighlight = linesHighlight.slice(0, -1); // Remove last separator
	return linesHighlight;
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
