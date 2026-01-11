import type { ValidationAcceptor, ValidationChecks } from 'langium';
import { CssBlock, LayoutStyle, Size, type SlideDeckMlAstType, type SlideOptions } from './generated/ast.js';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';
import cssLanguageService from 'vscode-css-languageservice';
import { createVirtualCssDocument } from './css-util.js';

const { getCSSLanguageService, DiagnosticSeverity } = cssLanguageService;

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
        SlideOptions: validator.checkNoDuplicateSlideOptions,
        Size: validator.checkNoDuplicateSize,
        LayoutStyle: validator.checkNoDuplicateLayoutOptions,
        CssBlock: validator.checkCssBlock,
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
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
}