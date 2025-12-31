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
    'slide' name=TEXT
    INDENT
        contents+=Content*
    DEDENT;

Content:
    MediaBlock | TextBlock | CodeBlock | LayoutBlock;

MediaBlock:
    Video | Image;

Video:
    'video' url=TEXT;

Image:
    'image' url=TEXT;

TextBlock:
    List | FreeText;

List:
    UnorderedList | OrderedList;

UnorderedList:
    'ul'
    items+=ListItem+;
    

OrderedList:
    'ol'
    items+=ListItem+;

ListItem:
    '-' text=TEXT;

//allow both inline and block text for flexibility
FreeText:
    'text' (inline=TEXT | block=TEXT_BLOCK);

CodeBlock:
    'code' language=ID
    codeContent+=TEXT_BLOCK;

LayoutBlock:
    'layout' layoutType=ID
    INDENT
        elements+=Content*
    DEDENT;

terminal INDENT: 'synthetic:indent';
terminal DEDENT: 'synthetic:dedent';

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal TEXT: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

terminal TEXT_BLOCK: /```[\s\S]*?```/;

hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
