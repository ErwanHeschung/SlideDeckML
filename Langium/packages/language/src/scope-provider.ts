import { AstUtils, EMPTY_SCOPE, LangiumCoreServices, MapScope, ReferenceInfo, Scope, ScopeProvider } from "langium";
import { App, isContent, isPresentation, isSlide, isTemplate, SlideTemplate } from "./generated/ast.js";

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

		// resolve slide templates
		if (isSlide(context.container) && context.property === "slideTemplateRef") {
			if (isTemplate(templateApp.declaration)) {
				const slideTemplates = templateApp.declaration.slideTemplates;
				const descriptions = slideTemplates.map((slideTemplate) =>
					this.services.workspace.AstNodeDescriptionProvider.createDescription(slideTemplate, slideTemplate.name));
				return new MapScope(descriptions);
			}
		}

		// resolve content templates
		if (isContent(context.container) && context.property === "contentTemplateRef") {
			if (isTemplate(templateApp.declaration)) {
				const contentPlaceholders = templateApp.declaration.slideTemplates.flatMap((slideTemplate: SlideTemplate) => {
					return slideTemplate.content;
				});
				const descriptions = contentPlaceholders.map((contentPlaceholder) =>
					this.services.workspace.AstNodeDescriptionProvider.createDescription(contentPlaceholder, contentPlaceholder.name)
				);
				return new MapScope(descriptions);
			}
		}

		return EMPTY_SCOPE;
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
