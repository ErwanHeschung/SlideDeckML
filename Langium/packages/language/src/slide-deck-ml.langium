grammar SlideDeckMl

entry App:
    declaration=Declaration;

Declaration:
    Presentation;

Presentation:
    'presentation' name=ID
    INDENT
        slides+=Slide+
    DEDENT;

Slide:
    'slide' name=STRING
    INDENT
        (css=CssBlock)?
        contents+=Content*
    DEDENT;

Content:
    MediaBlock | TextBlock | CodeBlock | LayoutBlock;

MediaBlock:
    Video | Image;

Video:
    'video'
    INDENT
        (css=CssBlock)?
        url=STRING
    DEDENT;

Image:
    'image'
    INDENT
        (css=CssBlock)?
        url=STRING
    DEDENT;

TextBlock:
    List | FreeText;

List:
    UnorderedList | OrderedList;

UnorderedList:
    'ul'
    INDENT
        (css=CssBlock)?
        items+=ListItem+
    DEDENT;
    

OrderedList:
    'ol'
    INDENT
        (css=CssBlock)?
        items+=ListItem+
    DEDENT;

ListItem:
    '-' text=STRING;

//allow both inline and block text for flexibility
FreeText:
    'text'
    INDENT
        (css=CssBlock)?
        (inline=STRING | block=TEXT_BLOCK)
    DEDENT;

CodeBlock:
    'code' language=ID
    INDENT
        (css=CssBlock)?
        codeContent+=TEXT_BLOCK
    DEDENT;

LayoutBlock:
    'layout' layoutType=Layout
    INDENT
        (css=CssBlock)?
        elements+=Content*
    DEDENT;

CssBlock:
    'css' 
    INDENT
        css=TEXT_BLOCK
    DEDENT;

Layout returns string: 'Vertical' | 'Horizontal';

Alignment returns string: 'Start' | 'End' | 'Center';

terminal TEXT_BLOCK: /```\s+[\s\S]*?\s+```/;

terminal INDENT: 'synthetic:indent';
terminal DEDENT: 'synthetic:dedent';

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
