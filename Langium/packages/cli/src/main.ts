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

// Helper function to extract imported template path from presentation file
async function getImportedTemplatePath(presentationPath: string): Promise<string | null> {
    try {
        const content = await fs.readFile(presentationPath, 'utf-8');
        const importMatch = content.match(/presentation\s+\w+\s+"([^"]+)"/);
        if (importMatch) {
            const templateFileName = importMatch[1];
            const templatePath = path.resolve(path.dirname(presentationPath), templateFileName);
            return templatePath;
        }
    } catch {
        // Ignore errors
    }
    return null;
}

export const generateAction = async (source: string): Promise<void> => {
    try {
        const absSource = path.join(srcFolder, path.basename(source));
        const services = createSlideDeckMlServices(NodeFileSystem).SlideDeckMl;

        const model = await extractAstNode<App>(absSource, services);

        generateOutput(model, destination);
        console.log(chalk.green(`Code generated successfully`));
    } catch (error: any) {
        console.error(error.message || error);
        console.log(chalk.yellow('Waiting for fixes...'));
    }
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
        .command('watch <filename>')
        .description('Watch a single .slg file in Presentations for changes (including imported templates)')
        .action(async (filename: string) => {
            const fileToWatch = path.join(srcFolder, filename);
            const filesToWatch = [fileToWatch];

            const templatePath = await getImportedTemplatePath(fileToWatch);
            if (templatePath) {
                filesToWatch.push(templatePath);
            }

            const watcher = chokidar.watch(filesToWatch, {
                persistent: true,
                ignoreInitial: false
            });

            watcher.on('add', async (p) => {
                await generateAction(fileToWatch);
            });

            watcher.on('change', async (p) => {
                await generateAction(fileToWatch);
            });

            console.log(chalk.blue(`Watching Presentations/${filename}${templatePath ? ' and ' + path.basename(templatePath) : ''} for changes...`));
        });


    program.parse(process.argv);
}
