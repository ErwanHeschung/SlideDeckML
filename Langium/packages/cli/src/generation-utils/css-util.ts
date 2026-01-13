import { Content, isHeight, isLayoutBlock, isWidth, Presentation, Slide } from "slide-deck-ml-language";
import { Prefixes } from "./prefix-registry-util.js";

export function generateCss(presentation: Presentation): string {
	const slidesCSS = presentation.slides.map(slide => generateSlideCSS(slide)).join('');
	return `
html, body {
  margin: 0;
  height: 100vh;
  width: 100vw;
}

/*remove base margin/padding */
.reveal {
  --r-block-margin: 0;
}

.code-block {
  height: 400px;
  gap: 1rem;
}

.code-block img {
  height: 100%;
  object-fit: contain;
}

p{
  margin:0;
  padding: 0;
  line-height: 1;
}

img:not([src]),
img[src=""] {
  display: none;
}

section{
  width: 100%;
  height: 100%;
}

* {
  /* include padding in size (avoid calc) */
  box-sizing: border-box;
}

.layout {
  width: 100%;
  height: 100%;
  padding: 1rem;
  gap: 1rem;
}

.vertical {
  display: flex;
  flex-direction: column;
}

.horizontal {
  display: flex;
  flex-direction: row;
}

.v-align-start {
  align-items: flex-start;
}

.v-align-center {
  align-items: center;
}

.v-align-end {
  align-items: flex-end;
}

.h-align-start {
  justify-content: flex-start;
}

.h-align-center {
  justify-content: center;
}

.h-align-end {
  justify-content: flex-end;
}

${slidesCSS}
  `;
}

function generateSlideCSS(slide: Slide): string {
	const contentCSS = slide.contents.map(c => generateContentCSS(c)).join('');

	const templateCSS = slide.slideTemplateRef?.ref?.css?.content
		? '.' + Prefixes.getPrefix(slide) + `{
  ${slide.slideTemplateRef.ref.css.content}
}`
		: '';
	const slideCSS = getCSSFromBlock(slide);

	return `
${templateCSS}
${slideCSS}
${contentCSS}
`;
}

function generateContentCSS(content: Content): string {
	let size_css = getSizeFromContent(content);

	const templateCSS = getTemplateCSSFromContent(content);
	let custom_css = getCSSFromBlock(content);

	if (isLayoutBlock(content)) {
		const children = content.elements.map(elem => generateContentCSS(elem)).join('\n');
		return `${children}
    ${size_css}
    ${templateCSS}
    ${custom_css}`;
	}
	//first size css so it can be overridden, then template CSS, then custom CSS (for maximum override priority)
	return `${size_css}
  ${templateCSS}
  ${custom_css}`;
}

function getTemplateCSSFromContent(content: Content): string {
	const templateRef = (content as any).contentTemplateRef;
	if (templateRef?.ref?.css?.content) {
		return '.' + Prefixes.getPrefix(content) + `{
  ${templateRef.ref.css.content}
}`;
	}
	return '';
}

function getCSSFromBlock(content: Slide | Content): string {
	const css = content.css?.content;
	if (!css) return "";

	return '.' + Prefixes.getPrefix(content) + `{
  ${css}
}`;
}

function getSizeFromContent(content: Content): string {
	let cssProperties: string = '';
	for (const sizeOption of content.size?.properties ?? []) {
		if (isWidth(sizeOption)) {
			cssProperties += `width: ${sizeOption.width};`;
		}
		else if (isHeight(sizeOption)) {
			cssProperties += `height: ${sizeOption.height};`;
		}
	}
	return cssProperties ? '.' + Prefixes.getPrefix(content) + `{
  ${cssProperties}}` : '';
}
