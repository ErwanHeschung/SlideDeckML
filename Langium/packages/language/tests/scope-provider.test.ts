import { createSlideDeckMlServices } from "../src/slide-deck-ml-module.js";
import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { App, isPresentation, isTemplate } from "../src/generated/ast.js";

test("should correctly resolve cross references", async () => {
	const services = createSlideDeckMlServices(EmptyFileSystem);
	const parse = parseHelper<App>(services.SlideDeckMl);

	const templateDoc = await parse(`
template Arial #000000 false
    slide TitleSlide
        css
            \`\`\`
            background: lightblue;
            \`\`\`
        text title freetext
            css
                \`\`\`
                color: blue;
                \`\`\`
        media logo image
`, { documentUri: "file:///template.slg" });

	const presentationDoc = await parse(`
presentation MyPres "template.slg"
    slide "Intro" TitleSlide
        text title
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

