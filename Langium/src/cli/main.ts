// src/cli/main.ts
import { createSlideDeckServices } from '../module.js';
import fs from 'fs';
import path from 'path';

const [, , inputFile, outputFile] = process.argv;

if (!inputFile) {
    console.error("Usage: ts-node src/cli/main.ts <input> [output]");
    process.exit(1);
}

const { SlideDeck } = createSlideDeckServices({});
const content = fs.readFileSync(inputFile, 'utf-8');
const document = SlideDeck.LangiumParser.parse(content);

const generated = SlideDeck.generator.slideDeck.generate(document.parseResult.value);

const outputPath = outputFile ?? path.basename(inputFile, path.extname(inputFile)) + '.json';
fs.writeFileSync(outputPath, generated);

console.log(`Generated file: ${outputPath}`);
