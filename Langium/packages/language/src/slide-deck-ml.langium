grammar SlideDeckMl

entry App:
    declaration=Declaration;

Declaration:
    Presentation;

Presentation:
    'presentation' name=ID (options=SlideOptions)?
    INDENT
        slides+=Slide+
    DEDENT;

Slide:
    'slide' name=STRING (layout=LayoutStyle)?
    INDENT
        (css=CssBlock)?
        contents+=Content*
    DEDENT;

Content:
    MediaBlock | TextBlock | CodeBlock | LayoutBlock | MathBlock;

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

//Code Block

CodeBlock:
    'code' language=ID
    INDENT
        (css=CssBlock)?
        (highlight=LinesHighlight)?
        codeContent=TEXT_BLOCK
    DEDENT;

LinesHighlight:
    'highlight'
    INDENT
        lines+= LineHighlight+
    DEDENT;

LineHighlight:
    '-' (SimpleLineHighlight
    | RangeLineHighlight);

SimpleLineHighlight:
    line=INT;

RangeLineHighlight:
    startLine=INT '..' endLine=INT;

//Math Block

MathBlock:
    'math'
    INDENT
        (css=CssBlock)?
        content=TEXT_BLOCK
    DEDENT;

//Layout Block

LayoutBlock:
    'layoutBlock' (layout=LayoutStyle)?
    INDENT
        (css=CssBlock)?
        elements+=Content*
    DEDENT;

//CSS Block

CssBlock:
    'css' 
    INDENT
        content=TEXT_BLOCK
    DEDENT;

//Slide Options

SlideOptions:
    'with' options+=SlideOption+;

SlideOption:
    value=SlideOptionValue;


SlideOptionValue returns string: 
    'slideNumbers' | 'progressBar';

//Layout Style

LayoutStyle:
    'layout' options+=LayoutOption+;

LayoutOption:
      LayoutTypeOption
    | VAlignOption
    | HAlignOption;

LayoutTypeOption:
    layoutType=Layout;

VAlignOption:
    'v-align' verticalAlignment=Alignment;

HAlignOption:
    'h-align' horizontalAlignment=Alignment;

Layout returns string: 'vertical' | 'horizontal';

Alignment returns string: 'start' | 'end' | 'center';

//Terminal

terminal TEXT_BLOCK: /```\s+[\s\S]*?\s+```/;

terminal INDENT: 'synthetic:indent';
terminal DEDENT: 'synthetic:dedent';

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
