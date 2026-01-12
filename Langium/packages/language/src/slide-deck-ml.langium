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
    Video | Image | Model3D;

Video:
    'video'
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
    DEDENT;

Model3D:
    'model3d'
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
    DEDENT;

Image:
    'image'
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
    DEDENT;

TextBlock:
    List | FreeText;

List:
    UnorderedList | OrderedList;

UnorderedList:
    'ul'
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        items+=ListItem+
    DEDENT;
    

OrderedList:
    'ol'
    (size=Size)?
    INDENT*
        (css=CssBlock)?
        (animation=Animation)?
        items+=ListItem+
    DEDENT;

ListItem:
    '-' text=STRING;

//allow both inline and block text for flexibility
FreeText:
    'text'
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        (inline=STRING | block=TEXT_BLOCK)
    DEDENT;

//Code Block

CodeBlock:
    'code' language=ID
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
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
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        content=TEXT_BLOCK
    DEDENT;

//Layout Block

LayoutBlock:
    'layoutBlock' (layout=LayoutStyle)?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        elements+=Content*
    DEDENT;

//CSS Block

CssBlock:
    'css' 
    INDENT
        content=TEXT_BLOCK
    DEDENT;

//Size

Size:
    'size' properties+=SizeProp+;

SizeProp:
    Width
  | Height;

Width :
    'w' width=PERCENT;

Height :
    'h' height=PERCENT;


FragmentEffect returns string:
      'fade-in'
    | 'fade-out'
    | 'fade-up'
    | 'fade-down'
    | 'fade-left'
    | 'fade-right'
    | 'fade-in-then-out'
    | 'semi-fade-out'
    | 'current-visible'
    | 'grow'
    | 'shrink'
    | 'zoom-in'
    | 'zoom-out';

Animation:
    'animation'
    ('effect' effect=FragmentEffect)
    ('index' index=INT)?
    ('durationMs' durationMs=INT)?;


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

terminal PERCENT: /[0-9]+%/;
terminal ID: /[_a-zA-Z][\w_-]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
