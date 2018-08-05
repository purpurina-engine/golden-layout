import { ContentArea, Callback, BoundFunction, Vector } from '../interfaces/Commons';

export function getTouchEvent(event: JQuery.Event): Vector {
    // if($.zepto)
    //     return event.touches ? event.targetTouches[0] : event;

    if (event.touches && event.touches.length > 0) {
        const value = event.touches.item(0);
        return {
            x: value.pageX,
            y: value.pageY,
        }
    }

    return {
        x: event.pageX,
        y: event.pageY,
    }
    // if (event.originalEvent && event.originalEvent.type === 'touches') {
    //     return event.originalEvent.['touches'][0];
    // }



    // }
}

export function objectKeys(object: Object): string[] {
    let keys;

    if (typeof Object.keys === 'function') {
        return Object.keys(object);
    } else {
        keys = [];
        for (let key in object) {
            keys.push(key);
        }
        return keys;
    }
}

export function getHashValue(key: string): string {
    let matches = location.hash.match(new RegExp(key + '=([^&]*)'));
    return matches ? matches[1] : null;
}

export function getQueryStringParam(param: string): string {
    if (window.location.hash) {
        return getHashValue(param);
    } else if (!window.location.search) {
        return null;
    }

    let keyValuePairs = window.location.search.substr(1).split('&');
    let params: any = {};

    for (let i = 0; i < keyValuePairs.length; i++) {
        let pair = keyValuePairs[i].split('=');
        params[pair[0]] = pair[1];
    }

    return params[param] || null;
}

export function copy(target: any, source: any): any {

    if (target === undefined)
        target = {};

    for (let key in source) {
        target[key] = source[key];
    }
    return target;
}

/**
 * This is based on Paul Irish's shim, but looks quite odd in comparison. Why?
 * Because
 * a) it shouldn't affect the global requestAnimationFrame function
 * b) it shouldn't pass on the time that has passed
 *
 * @param   {Callback} fn
 *
 * @returns {void}
 */
export function animFrame(fn: Callback): void {
    return (window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        })(fn);
}

export function indexOf(needle: any, haystack: any[]): number {
    if (!(haystack instanceof Array)) {
        throw new Error('Haystack is not an Array');
    }

    if (haystack.indexOf) {
        return haystack.indexOf(needle);
    } else {
        for (let i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle) {
                return i;
            }
        }
        return -1;
    }
}


export function isFunction(obj: any | Callback): boolean {

    if (typeof /./ != 'function' && typeof Int8Array != 'object') {
        return typeof obj == 'function' || false;
    } else {
        return toString.call(obj) === '[object Function]';
    }

}
//type t = ReturnType<typeof isFunction>;
// export let isFunction = (typeof /./ != 'function' && typeof Int8Array != 'object') ?
//     function isFunction(obj) {
//         return typeof obj == 'function' || false;
//     } : function isFunction(obj) {
//         return toString.call(obj) === '[object Function]';
//     }

// type FunctionType<T extends Callback> = T;


//type FirstArgument<T extends Callback> = T extends (arg1: infer U, ...args: any[]) => any ? U : any;
//type SecondArgument<T> = T extends (arg1: any, arg2: infer U, ...args: any[]) => any ? U : any;

//type TypeName<T> = T extends any ? T : any;


//type FunctionArguments<T extends Callback> = T extends (arg1: infer U, ...args: any[]) => any ? TypeName<U> : TypeName<any[]>;
// type FunctionArguments<T> = 

// T extends (arg1?: infer U) => any ? U extends any ? U : any :
// T extends (arg1: infer U) => any ? U :
// T extends (arg1: infer U,arg2: infer V) => any ? [U,V] :
// T extends (arg1: infer U,arg2: infer V, arg3: infer Y) => any ? [U,V,Y] :
// T extends (arg1: infer U,arg2: infer V, arg3?: infer Y) => any ? [U,V,Y] :
// T extends (arg1: infer U,arg2?: infer V, arg3?: infer Y) => any ? [U]|[U,V]|[U,V,Y] :

// T extends (arg1: infer U,arg2: infer V, arg3: infer Y) => any ? [U,V,Y] :



// function bindFunction<
//     T extends Callback,
//     C extends object,
//     >
//     (fn: FunctionType<T>, context?: C): FunctionBindedType<T> {
//     return fn.bind.apply(context);
// }

// function twoParams(a: number, b: number) {
//     return a + b;
// }

// class Test {
//     test() {
//         const t = bindFunction(this.test2, this);
       
        
//     }

//     test2(): boolean {
//         return true;
//     }
// }


//type FirstArgument<T> = T extends (arg1: infer U, ...args: any[]) => any ? U : any;
//type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
// type ClassConstructor<T> = {
//     //new(): T;
//     new(...args:any[]):T;
// }

// interface BindedConstructor<T> extends Function {
//     //(...args: any[]): ReturnType<T>;
//     new(...args:any[]):T;
//     //bind: (this: T, thisArg: any, ...argArray: any[]) => FunctionBindedType<T>;
// }

// export function bindConstructor<T>(classConstructor:ClassConstructor<T>, ...boundArgs: any[]):BindedConstructor<T> {
//     return classConstructor.bind.apply(classConstructor, boundArgs);
// }



export function fnBind(fn: Callback|any, context?: object, ...boundArgs: any[]): BoundFunction | any {

    if (Function.prototype.bind !== undefined) {
        //return fn.bind.apply(context, boundArgs);
        return Function.prototype.bind.apply(fn, [context].concat(boundArgs));
    }

    let bound = function (this: any) {

        // Join the already applied arguments to the now called ones (after converting to an array again).
        let args = (boundArgs || []).concat(Array.prototype.slice.call(arguments, 0));

        // If not being called as a constructor
        if (!(this instanceof bound)) {
            // return the result of the function called bound to target and partially applied.
            return fn.apply(context, args);
        }
        // If being called as a constructor, apply the function bound to self.
        fn.apply(this, args);
    };

    // Attach the prototype of the function to our newly created function.
    bound.prototype = fn.prototype;
    return bound;
}

export function removeFromArray(item: any, array: any[]) {
    let index = indexOf(item, array);

    if (index === -1) {
        throw new Error('Can\'t remove item from array. Item is not in the array');
    }

    array.splice(index, 1);
}

export function now(): number {
    if (typeof Date.now === 'function') {
        return Date.now();
    } else {
        return (new Date()).getTime();
    }
}

export function getUniqueId(): string {
    return (Math.random() * 1000000000000000)
        .toString(36)
        .replace('.', '');
}

/**
 * A basic XSS filter. It is ultimately up to the
 * implementing developer to make sure their particular
 * applications and usecases are save from cross site scripting attacks
 *
 * @param   {string} input
 * @param    {boolean} keepTags
 *
 * @returns {string} filtered input
 */
export function filterXss(input: string, keepTags?: boolean): string {

    let output = input
        .replace(/javascript/gi, 'j&#97;vascript')
        .replace(/expression/gi, 'expr&#101;ssion')
        .replace(/onload/gi, 'onlo&#97;d')
        .replace(/script/gi, '&#115;cript')
        .replace(/onerror/gi, 'on&#101;rror');

    if (keepTags === true) {
        return output;
    } else {
        return output
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;');
    }
}

/**
 * Removes html tags from a string
 *
 * @param   {string} input
 *
 * @returns {string} input without tags
 */
export function stripTags(input: string): string {
    return $.trim(input.replace(/(<([^>]+)>)/ig, ''));
}

export function mergeAreas(sourceA: ContentArea, sourceB: ContentArea, target?: ContentArea) {

    if (target === undefined) {
        target = {
            surface: -1,
            x1: -1,
            x2: -1,
            y1: -1,
            y2: -1,
        };
    }

    target.x1 = Math.min(sourceA.x1, sourceB.x1);
    target.x2 = Math.max(sourceA.x2, sourceB.x2);
    target.y1 = Math.min(sourceA.y1, sourceB.y1);
    target.y2 = Math.max(sourceA.y2, sourceB.y2);
    target.surface = (target.x2 - target.x1) * (target.y2 - target.y1);

    return target;

}

export function isHTMLElement(element: Element | HTMLElement | JQuery): element is HTMLElement {
    return (element.scroll !== undefined);
}

// export function isContentItemConfig(component: ContentItem | ItemConfigType): component is ItemConfigType {
//     return ((<ItemConfigType>component).type !== undefined)
// }