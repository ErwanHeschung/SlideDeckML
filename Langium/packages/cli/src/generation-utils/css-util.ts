import { Content, isLayoutBlock, Presentation, Slide } from "slide-deck-ml-language";
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
p{
  margin:0 !important;
  padding: 0 !important;
  line-height: 1 !important;
}

section{
  width: 100%;
  height: 100%;
}

section, .layout{
  gap:1rem;
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
  const css = getCSSFromBlock(slide);
  return `
${css}
${contentCSS}
`;
}

function generateContentCSS(content: Content): string {
  const css = getCSSFromBlock(content);
  if (isLayoutBlock(content)) {
    const children = content.elements.map(elem => generateContentCSS(elem)).join('\n');
    return `${children}
    ${css}`
  }
  return css;
}

function getCSSFromBlock(content: Slide | Content):string {
  const css = content.css?.content;
  if (!css) return "";

  return '.'+Prefixes.getPrefix(content) + `{
  ${css}
}`;
}