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

p{
  margin:0;
  padding: 0;
  line-height: 1;
}

section{
  width: 100%;
  height: 100%;
}

.layout{
  width: calc(100% - 2rem);
  height: calc(100% - 2rem);
  padding:1rem;
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
  let size_css = getSizeFromContent(content);
  let custom_css = getCSSFromBlock(content);
  if (isLayoutBlock(content)) {
    const children = content.elements.map(elem => generateContentCSS(elem)).join('\n');
    return `${children}
    ${size_css}
    ${custom_css}`;
  }
  //first size css so it can be overridden
  return `${size_css}
  ${custom_css}`;
}

function getCSSFromBlock(content: Slide | Content):string {
  const css = content.css?.content;
  if (!css) return "";

  return '.'+Prefixes.getPrefix(content) + `{
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
  return cssProperties ? '.'+Prefixes.getPrefix(content) + `{
  ${cssProperties}}` : '';
}