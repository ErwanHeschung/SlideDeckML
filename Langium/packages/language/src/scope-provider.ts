import { AstUtils, EMPTY_SCOPE, LangiumCoreServices, MapScope, ReferenceInfo, Scope, ScopeProvider } from "langium";
import { App, ContentPlaceholder, isContent, isLayoutBlock, isLayoutPlaceholder, isPresentation, isSlide, isTemplate, SlideTemplate } from "./generated/ast.js";

export class TemplateScopeProvider implements ScopeProvider {
	services: LangiumCoreServices;

	constructor(services: LangiumCoreServices) {
		this.services = services;
	}

	getScope(context: ReferenceInfo): Scope {
		const presentation = AstUtils.getContainerOfType(context.container, isPresentation);
		if (!presentation) return EMPTY_SCOPE;
		if (!presentation.import) return EMPTY_SCOPE;

		const templateApp = this.loadTemplateFile(presentation.import);
		if (!templateApp) return EMPTY_SCOPE;

		if (isSlide(context.container) && context.property === "slideTemplateRef") {
			if (isTemplate(templateApp.declaration)) {
				const slideTemplates = templateApp.declaration.slideTemplates;
				const descriptions = slideTemplates.map((slideTemplate) =>
					this.services.workspace.AstNodeDescriptionProvider.createDescription(slideTemplate, slideTemplate.name));
				return new MapScope(descriptions);
			}
		}

		if (isContent(context.container) && context.property === "contentTemplateRef") {
			if (isTemplate(templateApp.declaration)) {
				const slide = AstUtils.getContainerOfType(context.container, isSlide);
				
				const referencedSlideTemplate = slide?.slideTemplateRef?.ref;
				
				let contentPlaceholders: ContentPlaceholder[];
				
				if (referencedSlideTemplate) {
					const parentLayoutBlock = AstUtils.getContainerOfType(context.container, isLayoutBlock);
					
					if (parentLayoutBlock && parentLayoutBlock !== context.container) {
						const layoutPlaceholderRef = parentLayoutBlock.contentTemplateRef?.ref;
						if (layoutPlaceholderRef && isLayoutPlaceholder(layoutPlaceholderRef)) {
							contentPlaceholders = this.collectContentPlaceholdersFromLayout(layoutPlaceholderRef);
						} else {
							contentPlaceholders = this.collectContentPlaceholders(referencedSlideTemplate);
						}
					} else {
						contentPlaceholders = this.collectContentPlaceholders(referencedSlideTemplate);
					}
				} else {
					contentPlaceholders = templateApp.declaration.slideTemplates.flatMap((slideTemplate: SlideTemplate) => {
						return this.collectContentPlaceholders(slideTemplate);
					});
				}
				
				const descriptions = contentPlaceholders.map((contentPlaceholder) =>
					this.services.workspace.AstNodeDescriptionProvider.createDescription(contentPlaceholder, contentPlaceholder.name)
				);
				return new MapScope(descriptions);
			}
		}

		return EMPTY_SCOPE;
	}

	private collectContentPlaceholders(slideTemplate: SlideTemplate): ContentPlaceholder[] {
		const result: ContentPlaceholder[] = [];
		
		const collectRecursive = (placeholders: ContentPlaceholder[]) => {
			for (const placeholder of placeholders) {
				result.push(placeholder);
				if (isLayoutPlaceholder(placeholder)) {
					collectRecursive(placeholder.content);
				}
			}
		};
		
		collectRecursive(slideTemplate.content);
		return result;
	}

	private collectContentPlaceholdersFromLayout(layoutPlaceholder: ContentPlaceholder): ContentPlaceholder[] {
		if (!isLayoutPlaceholder(layoutPlaceholder)) {
			return [];
		}
		
		const result: ContentPlaceholder[] = [];
		
		const collectRecursive = (placeholders: ContentPlaceholder[]) => {
			for (const placeholder of placeholders) {
				result.push(placeholder);
				if (isLayoutPlaceholder(placeholder)) {
					collectRecursive(placeholder.content);
				}
			}
		};
		
		collectRecursive(layoutPlaceholder.content);
		return result;
	}

	private loadTemplateFile(importPath: string): App | undefined {
		const documents = this.services.shared.workspace.LangiumDocuments.all.toArray();
		const doc = documents.find((doc) => {
			const docPath = doc.uri.fsPath;
			return docPath.endsWith(importPath) || docPath === importPath;
		});
		if (!doc) {
			return undefined;
		}
		return doc.parseResult.value as App;
	}
}