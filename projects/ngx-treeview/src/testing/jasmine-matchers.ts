/* tslint:disable */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* tslint:disable:no-any */

/**
 * Jasmine matchers that check Angular specific conditions.
 */
export interface NgMatchers extends jasmine.Matchers<any> {
    /**
     * Invert the matchers.
     */
    not: NgMatchers;

    /**
     * Expect the value to be a `Promise`.
     */
    toBePromise(): boolean;

    /**
     * Expect the value to be an instance of a class.
     */
    toBeAnInstanceOf(expected: any): boolean;

    /**
     * Expect the element to have exactly the given text.
     */
    toHaveText(expected: string): boolean;

    toHaveTrimmedText(expected: string): boolean;

    /**
     * Expect the element to have the given CSS class.
     */
    toHaveCssClass(expected: string): boolean;

    /**
     * Expect the element to have the given CSS styles.
     */
    toHaveCssStyle(expected: { [k: string]: string } | string): boolean;

    /**
     * Expect a class to implement the interface of the given class.
     */
    toImplement(expected: any): boolean;

    /**
     * Expect an exception to contain the given error text.
     */
    toContainError(expected: any): boolean;

    toHaveMap(expected: { [k: string]: any }): boolean;
}

const _global = <any>(typeof window === 'undefined' ? globalThis : window);

/**
 * Jasmine matching function with Angular matchers mixed in.
 */
export const expect: (actual: any) => NgMatchers = <any>_global.expect;

// Some Map polyfills don't polyfill Map.toString correctly, which
// gives us bad error messages in tests.
// The only way to do this in Jasmine is to monkey patch a method
// to the object :-(
(Map as any).prototype['jasmineToString'] = function () {
    const m = this;
    if (!m) {
        return '' + m;
    }
    const res: any[] = [];
    m.forEach((v: any, k: any) => { res.push(`${k}:${v}`); });
    return `{ ${res.join(',')} }`;
};

_global.beforeEach(function () {
    jasmine.addMatchers({
        // Custom handler for Map as Jasmine does not support it yet
        toEqual: function (util) {
            return {
                compare: function (actual: any, expected: any) {
                    if (actual instanceof Map) {
                        return { pass: compareMap(actual, expected) };
                    }
                    return { pass: util.equals(actual, expected) };
                }
            };

            function compareMap(actual: any, expected: any): boolean {
                if (actual instanceof Map) {
                    let pass = actual.size === expected.size;
                    if (pass) {
                        actual.forEach((v: any, k: any) => { pass = pass && util.equals(v, expected.get(k)); });
                    }
                    return pass;
                } else {
                    // tslint:disable-next-line:no-non-null-assertion
                    return undefined!;
                }
            }
        },

        toBePromise: function () {
            return {
                compare: function (actual: any) {
                    const pass = typeof actual === 'object' && typeof actual.then === 'function';
                    return { pass: pass, get message() { return 'Expected ' + actual + ' to be a promise'; } };
                }
            };
        },

        toBeAnInstanceOf: function () {
            return {
                compare: function (actual: any, expectedClass: any) {
                    const pass = typeof actual === 'object' && actual instanceof expectedClass;
                    return {
                        pass: pass,
                        get message() {
                            return 'Expected ' + actual + ' to be an instance of ' + expectedClass;
                        }
                    };
                }
            };
        },

        toHaveText: function () {
            return {
                compare: function (actual: any, expectedText: string) {
                    const actualText = elementText(actual);
                    return {
                        pass: actualText === expectedText,
                        get message() { return 'Expected ' + actualText + ' to be equal to ' + expectedText; }
                    };
                }
            };
        },

        toHaveTrimmedText: function () {
            return {
                compare: function (actual: any, expectedText: string) {
                    const actualText = elementText(actual).trim();
                    return {
                        pass: actualText === expectedText,
                        get message() { return 'Expected ' + actualText + ' to be equal to ' + expectedText; }
                    };
                }
            };
        },

        toHaveCssClass: function () {
            return { compare: buildError(false), negativeCompare: buildError(true) };

            function buildError(isNot: boolean) {
                return function (actual: any, className: string) {
                    const hasClass = !!actual?.classList?.contains(className);
                    return {
                        pass: hasClass === !isNot,
                        get message() {
                            return `Expected ${actual.outerHTML} ${isNot ? 'not ' : ''}to contain the CSS class "${className}"`;
                        }
                    };
                };
            }
        },

        toHaveCssStyle: function () {
            return {
                compare: function (actual: any, styles: { [k: string]: string } | string) {
                    const computed = actual ? getComputedStyle(actual) : null;
                    let allPassed: boolean;
                    if (typeof styles === 'string') {
                        allPassed = !!computed?.getPropertyValue(styles);
                    } else {
                        allPassed = Object.keys(styles).length !== 0;
                        Object.keys(styles).forEach(prop => {
                            const expectedValue = styles[prop];
                            const actualValue = computed?.getPropertyValue(prop)?.trim();
                            allPassed = allPassed && actualValue === expectedValue;
                        });
                    }

                    return {
                        pass: allPassed,
                        get message() {
                            const expectedValueStr = typeof styles === 'string' ? styles : JSON.stringify(styles);
                            return `Expected ${actual.outerHTML} ${!allPassed ? ' ' : 'not '}to contain the
                      CSS ${typeof styles === 'string' ? 'property' : 'styles'} "${expectedValueStr}"`;
                        }
                    };
                }
            };
        },

        toContainError: function () {
            return {
                compare: function (actual: any, expectedText: any) {
                    const errorMessage = actual.toString();
                    return {
                        pass: errorMessage.indexOf(expectedText) > -1,
                        get message() { return 'Expected ' + errorMessage + ' to contain ' + expectedText; }
                    };
                }
            };
        },

        toImplement: function () {
            return {
                compare: function (actualObject: any, expectedInterface: any) {
                    const intProps = Object.keys(expectedInterface.prototype);

                    const missedMethods: any[] = [];
                    intProps.forEach((k) => {
                        if (!actualObject.constructor.prototype[k]) {
                            missedMethods.push(k);
                        }
                    });

                    return {
                        pass: missedMethods.length === 0,
                        get message() {
                            return 'Expected ' + actualObject + ' to have the following methods: ' +
                                missedMethods.join(', ');
                        }
                    };
                }
            };
        },

        toHaveMap: function () {
            return {
                compare: function (actualObject: any, expected: { [k: string]: any }) {
                    let pass = true;
                    let failureName = '';
                    for (const propertyName in expected) {
                        if (!isMatchProperties(expected[propertyName], actualObject[propertyName])) {
                            pass = false;
                            failureName = propertyName;
                            break;
                        }
                    }
                    return {
                        pass: pass,
                        get message() {
                            return 'Expected ' + failureName + ' to match value';
                        }
                    };
                }
            };

            function isMatchProperties(src: any, dest: any): boolean {
                if (dest instanceof Object) {
                    for (const propertyName in dest) {
                        if (!isMatchProperties(src[propertyName], dest[propertyName])) {
                            return false;
                        }
                    }

                } else {
                    if (src !== dest) {
                        return false;
                    }
                }

                return true;
            }
        }
    });
});

function elementText(n: any): string {
    const hasNodes = (node: any) => {
        const children = node?.childNodes;
        return children && children.length > 0;
    };

    if (n instanceof Array) {
        return n.map(elementText).join('');
    }

    if (n?.nodeType === Node.COMMENT_NODE) {
        return '';
    }

    if (n?.nodeType === Node.ELEMENT_NODE && n.tagName === 'CONTENT') {
        const distributedNodes = n.getDistributedNodes ? n.getDistributedNodes() : [];
        return elementText(Array.prototype.slice.apply(distributedNodes));
    }

    if (n?.shadowRoot) {
        return elementText(Array.from(n.shadowRoot.childNodes));
    }

    if (hasNodes(n)) {
        return elementText(Array.from(n.childNodes));
    }

    return n?.textContent ?? '';
}
