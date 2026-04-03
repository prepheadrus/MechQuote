import { generateCacheKey } from '../matching-cache';

describe('generateCacheKey', () => {
    it('should generate identical keys for primitive types', () => {
        expect(generateCacheKey('test', 123, true)).toBe('test|123|true');
        expect(generateCacheKey(42)).toBe('42');
        expect(generateCacheKey(false)).toBe('false');
    });

    it('should distinguish between null and undefined', () => {
        const key1 = generateCacheKey(null);
        const key2 = generateCacheKey(undefined);

        expect(key1).toBe('null');
        expect(key2).toBe('undefined');
        expect(key1).not.toBe(key2);

        expect(generateCacheKey(null, undefined)).toBe('null|undefined');
    });

    it('should handle symbols and functions without crashing', () => {
        const sym = Symbol('foo');
        const func = () => 'test';

        const keyWithSym = generateCacheKey(sym);
        expect(typeof keyWithSym).toBe('string');
        expect(keyWithSym).toBe('Symbol(foo)');

        const keyWithFunc = generateCacheKey(func);
        expect(typeof keyWithFunc).toBe('string');
        expect(keyWithFunc).toContain('() =>');
    });

    it('should generate same key for objects regardless of key insertion order', () => {
        const obj1 = { a: 1, b: 2, c: 3 };
        const obj2 = { c: 3, a: 1, b: 2 }; // Same content, different order

        expect(generateCacheKey(obj1)).toBe(generateCacheKey(obj2));
        expect(generateCacheKey(obj1)).toBe('{"a":1,"b":2,"c":3}');
    });

    it('should handle nested arrays and objects correctly', () => {
        const obj1 = { a: [1, 2, { z: 99, x: 88 }], b: { y: 2, w: 1 } };
        const obj2 = { b: { w: 1, y: 2 }, a: [1, 2, { x: 88, z: 99 }] };

        expect(generateCacheKey(obj1)).toBe(generateCacheKey(obj2));
        expect(generateCacheKey(obj1)).toBe('{"a":[1,2,{"x":88,"z":99}],"b":{"w":1,"y":2}}');
    });

    it('should handle empty objects and arrays', () => {
        expect(generateCacheKey({})).toBe('{}');
        expect(generateCacheKey([])).toBe('[]');
        expect(generateCacheKey({}, [])).toBe('{}|[]');
    });

    it('should handle circular references safely', () => {
        const circularObj: any = { a: 1 };
        circularObj.self = circularObj;

        expect(() => generateCacheKey(circularObj)).not.toThrow();
        expect(generateCacheKey(circularObj)).toBe('{"a":1,"self":[Circular]}');
    });
});
