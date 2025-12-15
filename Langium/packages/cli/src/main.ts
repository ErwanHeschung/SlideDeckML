import type { App } from 'slide-deck-ml-language';
import { createSlideDeckMlServices, SlideDeckMlLanguageMetaData } from 'slide-deck-ml-language';
import chalk from 'chalk';
import { Command } from 'commander';
import { extractAstNode } from './util.js';
import { generateOutput } from './generator.js';
import { NodeFileSystem } from 'langium/node';
import chokidar from 'chokidar';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', 'package.json');
const packageContent = await fs.readFile(packagePath, 'utf-8');

const repoRoot = path.resolve(__dirname, '../../../..');
const srcFolder = path.join(repoRoot, 'Presentations');
const destination = path.join(repoRoot, 'Reveal');


export const generateAction = async (source: string): Promise<void> => {
    const absSource = path.join(srcFolder, path.basename(source));
    const services = createSlideDeckMlServices(NodeFileSystem).SlideDeckMl;
    const model = await extractAstNode<App>(absSource, services);

    const fileName = path.basename(absSource, path.extname(absSource)) + '.html';
    const outFile = path.join(destination, fileName);

    const generatedFilePath = generateOutput(model, absSource, outFile);
    console.log(chalk.green(`Code generated succesfully: ${generatedFilePath}`));
};

export default function(): void {
    const program = new Command();

    program.version(JSON.parse(packageContent).version);

    const fileExtensions = SlideDeckMlLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .description('Generates code for a provided source file.')
        .action(generateAction);
    
    program
        .command('watch')
        .description('Watch Presentations folder for changes')
        .action(() => {
            const watcher = chokidar.watch(srcFolder, {
                ignored: /(^|[\/\\])\../,
                ignoreInitial: false,
                persistent: true
            });

            watcher.on('add', async (p) => {
                if (p.endsWith('.slg')) await generateAction(p);
            });

            watcher.on('change', async (p) => {
                if (p.endsWith('.slg')) await generateAction(p);
            });
            console.log(chalk.blue('Watching for changes in Presentations/...'));
        });

    program.parse(process.argv);
}
