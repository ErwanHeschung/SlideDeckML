import { createSlideDeckMlServices } from "../src/slide-deck-ml-module.js";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { App, isLayoutPlaceholder, isPresentation, isTemplate } from "../src/generated/ast.js";

test("should correctly resolve cross references", async () => {
	const services = createSlideDeckMlServices(EmptyFileSystem);
	const parse = parseHelper<App>(services.SlideDeckMl);

	const templateDoc = await parse(`
template TestTemplate font Arial color #000000
    slide TitleSlide
        css
            \`\`\`
            background: lightblue;
            \`\`\`
        text title type freetext
            css
                \`\`\`
                color: blue;
                \`\`\`
        media logo type image
`, { documentUri: "file:///template.slg" });

	const presentationDoc = await parse(`
presentation MyPres import TestTemplate from "template.slg"
    slide "Intro" as TitleSlide
        text as title
            css
                \`\`\`
                font-size: 24px
                \`\`\`
            "Hello World"
`, { documentUri: "file:///presentation.slg" });

	expect(templateDoc.parseResult.parserErrors).toHaveLength(0);
	expect(presentationDoc.parseResult.parserErrors).toHaveLength(0);

	const presentation = presentationDoc.parseResult.value.declaration;
	const template = templateDoc.parseResult.value.declaration;

	expect(isPresentation(presentation)).toBe(true);
	expect(isTemplate(template)).toBe(true);

	if (isPresentation(presentation) && isTemplate(template)) {
		expect(presentation.slides[0].slideTemplateRef?.ref).toBe(template.slideTemplates[0]);
		expect(presentation.slides[0].contents[0].contentTemplateRef?.ref).toBe(template.slideTemplates[0].content[0]);
	}
});

test("should resolve nested content placeholders in LayoutPlaceholder", async () => {
	const services = createSlideDeckMlServices(EmptyFileSystem);
	const parse = parseHelper<App>(services.SlideDeckMl);

	const templateDoc = await parse(`
template NestedTemplate font Arial color #000000
    slide ContentSlide
        layout mainLayout layout horizontal
            text leftText type freetext
            media rightImage type image
`, { documentUri: "file:///template-nested.slg" });

	const presentationDoc = await parse(`
presentation MyPres import NestedTemplate from "template-nested.slg"
    slide "Content" as ContentSlide
        layoutBlock as mainLayout layout horizontal
            text as leftText
                "Left content"
            image as rightImage
                "https://example.com/image.png"
`, { documentUri: "file:///presentation-nested.slg" });

	expect(templateDoc.parseResult.parserErrors).toHaveLength(0);
	expect(presentationDoc.parseResult.parserErrors).toHaveLength(0);

	const presentation = presentationDoc.parseResult.value.declaration;
	const template = templateDoc.parseResult.value.declaration;

	expect(isPresentation(presentation)).toBe(true);
	expect(isTemplate(template)).toBe(true);

	if (isPresentation(presentation) && isTemplate(template)) {
		const slideTemplate = template.slideTemplates[0];
		const layoutPlaceholder = slideTemplate.content[0];
		
		expect(isLayoutPlaceholder(layoutPlaceholder)).toBe(true);
		
		if (isLayoutPlaceholder(layoutPlaceholder)) {
			// Check that nested placeholders can be resolved
			expect(layoutPlaceholder.content).toHaveLength(2);
			expect(layoutPlaceholder.content[0].name).toBe("leftText");
			expect(layoutPlaceholder.content[1].name).toBe("rightImage");
		}
	}
});

test("should scope content placeholders to the referenced slide template", async () => {
	const services = createSlideDeckMlServices(EmptyFileSystem);
	const parse = parseHelper<App>(services.SlideDeckMl);

	const templateDoc = await parse(`
template ScopedTemplate font Arial color #000000
    slide TitleSlide
        text title type freetext
    slide ContentSlide
        text body type freetext
`, { documentUri: "file:///template-scoped.slg" });

	const presentationDoc = await parse(`
presentation MyPres import ScopedTemplate from "template-scoped.slg"
    slide "Title" as TitleSlide
        text as title
            "Hello"
    slide "Content" as ContentSlide
        text as body
            "World"
`, { documentUri: "file:///presentation-scoped.slg" });

	expect(templateDoc.parseResult.parserErrors).toHaveLength(0);
	expect(presentationDoc.parseResult.parserErrors).toHaveLength(0);

	const presentation = presentationDoc.parseResult.value.declaration;
	const template = templateDoc.parseResult.value.declaration;

	expect(isPresentation(presentation)).toBe(true);
	expect(isTemplate(template)).toBe(true);

	if (isPresentation(presentation) && isTemplate(template)) {
		// First slide references TitleSlide template
		expect(presentation.slides[0].slideTemplateRef?.ref).toBe(template.slideTemplates[0]);
		expect(presentation.slides[0].contents[0].contentTemplateRef?.ref).toBe(template.slideTemplates[0].content[0]);
		
		// Second slide references ContentSlide template
		expect(presentation.slides[1].slideTemplateRef?.ref).toBe(template.slideTemplates[1]);
		expect(presentation.slides[1].contents[0].contentTemplateRef?.ref).toBe(template.slideTemplates[1].content[0]);
	}
});