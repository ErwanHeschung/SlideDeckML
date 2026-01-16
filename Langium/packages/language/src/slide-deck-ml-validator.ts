import type { ValidationAcceptor, ValidationChecks } from 'langium';
import { 
    Content, 
    CssBlock, 
    isCodePlaceholder, 
    isLayoutPlaceholder, 
    isMediaPlaceholder, 
    isTextPlaceholder, 
    LayoutStyle, 
    Size, 
    type SlideDeckMlAstType, 
    type SlideOptions 
} from './generated/ast.js';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';
import cssLanguageService from 'vscode-css-languageservice';
import { createVirtualCssDocument } from './css-util.js';

const { getCSSLanguageService, DiagnosticSeverity } = cssLanguageService;

export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
        SlideOptions: validator.checkNoDuplicateSlideOptions,
        Size: validator.checkNoDuplicateSize,
        LayoutStyle: validator.checkNoDuplicateLayoutOptions,
        CssBlock: validator.checkCssBlock,
        Content: validator.checkContentPlaceholderTypeMatch,
    };
    registry.register(checks, validator);
}

export class SlideDeckMlValidator {
    checkNoDuplicateSlideOptions(slideOptions: SlideOptions, accept: ValidationAcceptor): void {
        const seen = new Set<string>();
        for (const option of slideOptions.options) {
            const value = option.value;
            if (seen.has(value)) {
                accept('error', `Duplicate slide option '${value}'`, { node: option });
            } else {
                seen.add(value);
            }
        }
    }

    checkNoDuplicateLayoutOptions(layoutStyle: LayoutStyle, accept: ValidationAcceptor): void {
        const seen = new Set<string>();

        for (const option of layoutStyle.options) {
            const key = option.$type;
            if (seen.has(key)) {
                accept('error', `Duplicate layout option '${key}'`, { node: option });
            } else {
                seen.add(key);
            }
        }
    }
    
    checkNoDuplicateSize(size: Size, accept: ValidationAcceptor): void {
        const seen = new Set<string>();
        for (const prop of size.properties) {
            const key = prop.$type;
            if (seen.has(key)) {
                accept('error', `Duplicate size property '${key}'`, { node: prop });
            } else {
                seen.add(key);
            }
        }
    }

    private cssService = getCSSLanguageService();

    checkCssBlock(cssBlock: CssBlock, accept: ValidationAcceptor): void {
        if (!cssBlock.content) return;

        const cssDoc = createVirtualCssDocument(cssBlock.content);
        const diagnostics = this.cssService.doValidation(cssDoc, this.cssService.parseStylesheet(cssDoc), {
            validate: true,
            lint: {
                unknownProperties: 'error',
                duplicateProperties: 'warning',
                emptyRules: 'warning',
                hexColorLength: 'error',
                argumentsInColorFunction: 'error', 
            }
        });

        for (const diag of diagnostics) {
            const severity = diag.severity === DiagnosticSeverity.Error ? 'error' :
                diag.severity === DiagnosticSeverity.Warning ? 'warning' :
                    'info';
            accept(severity, diag.message, {
                node: cssBlock
            });
        }
    }

    checkContentPlaceholderTypeMatch(content: Content, accept: ValidationAcceptor): void {
        const ref = content.contentTemplateRef?.ref;
        if (!ref) return;

        const contentType = content.$type;

        if (contentType === 'FreeText' || contentType === 'UnorderedList' || contentType === 'OrderedList') {
            if (!isTextPlaceholder(ref)) {
                accept('error', `'${contentType}' must reference a TextPlaceholder, but '${ref.name}' is a ${ref.$type}`, { 
                    node: content, 
                    property: 'contentTemplateRef' 
                });
            } else {
                const expectedType = contentType === 'FreeText' ? 'freetext' : 
                                     contentType === 'UnorderedList' ? 'ul' : 'ol';
                if (ref.type !== expectedType) {
                    accept('warning', `Text type mismatch: '${contentType}' references placeholder '${ref.name}' with type '${ref.type}', expected '${expectedType}'`, { 
                        node: content, 
                        property: 'contentTemplateRef' 
                    });
                }
            }
        }

        if (contentType === 'Image' || contentType === 'Video' || contentType === 'Model3D') {
            if (!isMediaPlaceholder(ref)) {
                accept('error', `'${contentType}' must reference a MediaPlaceholder, but '${ref.name}' is a ${ref.$type}`, { 
                    node: content, 
                    property: 'contentTemplateRef' 
                });
            } else {
                const expectedType = contentType.toLowerCase() as 'image' | 'video' | 'model3d';
                if (ref.type !== expectedType) {
                    accept('warning', `Media type mismatch: '${contentType}' references placeholder '${ref.name}' with type '${ref.type}', expected '${expectedType}'`, { 
                        node: content, 
                        property: 'contentTemplateRef' 
                    });
                }
            }
        }

        if (contentType === 'CodeBlock') {
            if (!isCodePlaceholder(ref)) {
                accept('error', `'CodeBlock' must reference a CodePlaceholder, but '${ref.name}' is a ${ref.$type}`, { 
                    node: content, 
                    property: 'contentTemplateRef' 
                });
            }
        }

        if (contentType === 'LayoutBlock') {
            if (!isLayoutPlaceholder(ref)) {
                accept('error', `'LayoutBlock' must reference a LayoutPlaceholder, but '${ref.name}' is a ${ref.$type}`, { 
                    node: content, 
                    property: 'contentTemplateRef' 
                });
            }
        }

        if (contentType === 'MathBlock') {
            if (!isCodePlaceholder(ref)) {
                accept('error', `'MathBlock' must reference a MathPlaceholder, but '${ref.name}' is a ${ref.$type}`, {
                    node: content,
                    property: 'contentTemplateRef'
                });
            }
        }
    }
}