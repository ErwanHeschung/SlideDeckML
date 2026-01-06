import { Content, isSlide, Slide } from "slide-deck-ml-language";

type RegistryItem = Slide | Content;

class PrefixRegistry {
    private static instance: PrefixRegistry;
    private prefixMap = new WeakMap<RegistryItem, string>();
    private counter = 0;

    private constructor() { }

    public static getInstance(): PrefixRegistry {
        if (!PrefixRegistry.instance) {
            PrefixRegistry.instance = new PrefixRegistry();
        }
        return PrefixRegistry.instance;
    }

    public getPrefix(item: RegistryItem): string {
        if (this.prefixMap.has(item)) {
            return this.prefixMap.get(item)!;
        }
        const type = isSlide(item)?'slide':'content';
        const prefix = `${type}-${++this.counter}`;
        this.prefixMap.set(item, prefix);
        return prefix;
    }

    public reset() {
        this.prefixMap = new WeakMap();
        this.counter = 0;
    }
}

//singleton
export const Prefixes = PrefixRegistry.getInstance();