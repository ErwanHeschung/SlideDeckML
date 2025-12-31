import type { AstNode, LangiumCoreServices, LangiumDocument } from 'langium';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { URI } from 'langium';

export async function extractDocument(fileName: string, services: LangiumCoreServices): Promise<LangiumDocument> {
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} does not exist.`));
        process.exit(1);
    }

    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });

    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
    if (validationErrors.length > 0) {
        let errorMessage = chalk.red('There are validation errors:\n');
        for (const validationError of validationErrors) {
            errorMessage += chalk.red(
                `line ${validationError.range.start.line + 1}: ${validationError.message} [${document.textDocument.getText(validationError.range)}]\n`
            );
        }
        throw new Error(errorMessage);
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumCoreServices): Promise<T> {
    return (await extractDocument(fileName, services)).parseResult?.value as T;
}
