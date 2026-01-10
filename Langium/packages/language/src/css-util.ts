import { TextDocument } from 'vscode-languageserver-textdocument';

export function createVirtualCssDocument(cssText: string) {
    return TextDocument.create(
        'file:///virtual.css',
        'css',
        0,
        `div { \n${cssText}\n }`
    );
}