grammar SlideDeck


entry App:
    slides+=Slide+;

Slide:
    'slide' title=STRING;

terminal STRING:
    '"' ( '\\' . | !'"' . )* '"';