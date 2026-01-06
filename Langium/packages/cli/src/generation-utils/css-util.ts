import { Content, Presentation, Slide } from "slide-deck-ml-language";
import { Prefixes } from "./prefix-registry-util.js";

export function generateCss(presentation: Presentation): string {
  const slidesCSS = presentation.slides.map(slide => generateSlideCSS(slide)).join('');
    return `
html, body {
  margin: 0;
  height: 100vh;
  width: 100vw;
}

section{
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}

.vertical {
  display: flex;
  flex-direction: column;
}

.horizontal {
  display: flex;
  flex-direction: row;
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
  return css;
}

function getCSSFromBlock(content: Slide | Content):string {
  const css = content.css?.content;
  if (!css) return "";

  return '.'+Prefixes.getPrefix(content) + `{
  ${css}
}`;
}