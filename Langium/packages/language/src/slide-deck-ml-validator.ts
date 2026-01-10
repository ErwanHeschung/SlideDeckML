import type { ValidationAcceptor, ValidationChecks } from 'langium';
import { CssBlock, isHAlignOption, isLayoutTypeOption, isVAlignOption, LayoutStyle, type SlideDeckMlAstType, type SlideOptions } from './generated/ast.js';
import type { SlideDeckMlServices } from './slide-deck-ml-module.js';
import { DiagnosticSeverity, getCSSLanguageService } from 'vscode-css-languageservice';
import { createVirtualCssDocument } from './css-util.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SlideDeckMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SlideDeckMlValidator;
    const checks: ValidationChecks<SlideDeckMlAstType> = {
        SlideOptions: validator.checkNoDuplicateSlideOptions,
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
            let key: string;

            if (isLayoutTypeOption(option)) {
                key = `${option.layoutType}`;
            } else if (isVAlignOption(option)) {
                key = `v-align`;
            } else if (isHAlignOption(option)) {
                key = `h-align`;
            } else {
                continue;
            }

            if (seen.has(key)) {
                accept('error', `Duplicate layout option '${key}'`, { node: option });
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