grammar SlideDeckMl

entry App:
    declaration=Declaration;

Declaration:
    Presentation | Template;

Presentation:
    'presentation' name=ID ('import' templateRef=[Template] 'from' import=STRING)? (options=SlideOptions)?
    INDENT
        slides+=Slide+
    DEDENT;

Slide:
    'slide' name=STRING ('as' slideTemplateRef=[SlideTemplate])? (layout=LayoutStyle)?
    INDENT
        (css=CssBlock)?
        contents+=Content*
    DEDENT;

Content:
    MediaBlock | TextBlock | CodeBlock | LayoutBlock | MathBlock;

MediaBlock:
    Video | Image | Model3D;

Video:
    'video' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
    DEDENT;

Model3D:
    'model3d' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
    DEDENT;

Image:
    'image' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        url=STRING
        (annotation=AnnotationsBlock)?
    DEDENT;

AnnotationsBlock:
    'annotate'
    INDENT
        annotations+=Annotation+
    DEDENT;

Annotation:
    RectAnnotation | ArrowAnnotation;

RectAnnotation:
    'rect'
        'x' x=PERCENT
        'y' y=PERCENT
        'w' w=PERCENT
        'h' h=PERCENT
        ('label' label=STRING)?
        ('step' step=INT)?;

ArrowAnnotation:
    'arrow'
        'x1' x1=PERCENT
        'y1' y1=PERCENT
        'x2' x2=PERCENT
        'y2' y2=PERCENT
        ('label' label=STRING)?
        ('step' step=INT)?;

TextBlock:
    List | FreeText;

List:
    UnorderedList | OrderedList;

UnorderedList:
    'ul' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        items+=ListItem+
    DEDENT;


OrderedList:
    'ol' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        items+=ListItem+
    DEDENT;

ListItem:
    List | TextItem;

TextItem: 
    '-' text=STRING;

//allow both inline and block text for flexibility
FreeText:
    'text' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        (inline=STRING | block=TEXT_BLOCK)
    DEDENT;

//Code Block

CodeBlock:
    'code' ('as' contentTemplateRef=[ContentPlaceholder])? language=ID
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        (highlight=Highlight)?
        codeContent=TEXT_BLOCK
    DEDENT;

//Code Highlighting

Highlight:
    SimpleHighlight 
    | VisualHighlight;

SimpleHighlight:
    'highlight' 
    INDENT
        steps+=LineHighlight+
    DEDENT;

VisualHighlight:
    'visualHighlight'
    INDENT
        steps+=VisualLineHighlight+
    DEDENT;

VisualLineHighlight:
    linehighlight=LineHighlight
    (url=STRING)?;

LineHighlight:
    '-' lines+=AtomicLineHighlight (',' lines+=AtomicLineHighlight)*;

AtomicLineHighlight:
    SimpleLineHighlight 
    | RangeLineHighlight;

SimpleLineHighlight:
    line=INT;

RangeLineHighlight:
    startLine=INT '..' endLine=INT;

//Math Block

MathBlock:
    'math' ('as' contentTemplateRef=[ContentPlaceholder])?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        content=TEXT_BLOCK
    DEDENT;

//Layout Block

LayoutBlock:
    'layoutBlock' ('as' contentTemplateRef=[ContentPlaceholder])? (layout=LayoutStyle)?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        (animation=Animation)?
        elements+=Content+
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


AnimationEffect returns string:
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
    ('effect' effect=AnimationEffect)
    ('index' index=INT)?
    ('durationMs' durationMs=INT)?;


//Slide Options

SlideOptions:
    'with' options+=SlideOption+;

SlideOption:
    value=SlideOptionValue;


SlideOptionValue returns string: 
    'slideNumbers' | 'progressBar' | 'liveAnnotations';

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

// templates 
Template:
    'template' name=ID 'font' font=ID 'color' fontColor=HEX (options=SlideOptions)?
    INDENT
        slideTemplates+=SlideTemplate+
    DEDENT;

SlideTemplate:
    'slide' name=ID (layout=LayoutStyle)?
    (size=Size)?
    INDENT
        (css=CssBlock)?
        content+=ContentPlaceholder*
    DEDENT;

ContentPlaceholder: LayoutPlaceholder | MediaPlaceholder | TextPlaceholder | CodePlaceholder | MathPlaceholder;

LayoutPlaceholder:
    'layoutBlock' name=ID (layout=LayoutStyle)?
    (size=Size)?
    (INDENT
        (css=CssBlock)?
        content+=ContentPlaceholder*
    DEDENT)?;

MediaPlaceholder:
    'media' name=ID 'type' type=('image' | 'video' | 'model3d')
    (size=Size)?
    (INDENT
        css=CssBlock
    DEDENT)?;

TextPlaceholder:
    'text' name=ID 'type' type=('ul' | 'ol' | 'freetext')
    (size=Size)?
    (INDENT
        css=CssBlock
    DEDENT)?;

CodePlaceholder:
    'code' name=ID
    (size=Size)?
    (INDENT
        css=CssBlock
    DEDENT)?;

MathPlaceholder:
    'math' name=ID
    (size=Size)?
    (INDENT
        css=CssBlock
    DEDENT)?;

Boolean returns string: 'true' | 'false';

// terminal rules 
terminal TEXT_BLOCK: /```\s+[\s\S]*?\s+```/;

terminal INDENT: 'synthetic:indent';
terminal DEDENT: 'synthetic:dedent';

terminal PERCENT: /[0-9]+%/;
terminal ID: /[_a-zA-Z][\w_-]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal HEX: /#[0-9a-fA-F]{6}/;

hidden terminal WS: /[\t ]+/;
hidden terminal NL: /[\r\n]+/;
