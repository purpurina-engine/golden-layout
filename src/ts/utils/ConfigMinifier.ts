import LayoutConfig from '../config/LayoutConfig';
import {
    indexOf
} from './utils'


/**
 * Minifies and unminifies configs by replacing frequent keys
 * and values with one letter substitutes. Config options must
 * retain array position/index, add new options at the end.
 *
 * @class
 */
export default class ConfigMinifier {

    private _keys: string[];
    private _values: any[];

    constructor() {
        this._keys = [
            'settings',
            'hasHeaders',
            'constrainDragToContainer',
            'selectionEnabled',
            'dimensions',
            'borderWidth',
            'minItemHeight',
            'minItemWidth',
            'headerHeight',
            'dragProxyWidth',
            'dragProxyHeight',
            'labels',
            'close',
            'maximise',
            'minimise',
            'popout',
            'content',
            'componentName',
            'componentState',
            'id',
            'width',
            'type',
            'height',
            'isClosable',
            'title',
            'popoutWholeStack',
            'openPopouts',
            'parentId',
            'activeItemIndex',
            'reorderEnabled',
            'borderGrabWidth',
            //Maximum 36 entries, do not cross this line!
        ];
        if (this._keys.length > 36) {
            throw new Error('Too many keys in config minifier map');
        }

        this._values = [
            true,
            false,
            'row',
            'column',
            'stack',
            'component',
            'close',
            'maximise',
            'minimise',
            'open in new window'
        ];
    }


    /**
     * Takes a GoldenLayout configuration object and
     * replaces its keys and values recursively with
     * one letter counterparts
     *
     * @param   {any} config A GoldenLayout config object
     * @returns {any} minified config
     */
    minifyConfig(config: any): any {
        var min = {};
        this._nextLevel(config, min, '_min');
        return min;
    }

    /**
     * Takes a configuration Object that was previously minified
     * using minifyConfig and returns its original version
     *
     * @param   {any} minifiedConfig
     * @returns {any} the original configuration
     */
    unminifyConfig(minifiedConfig: any): LayoutConfig {
        var orig = {};
        this._nextLevel(minifiedConfig, orig, '_max');
        return orig;
    }

    /**
     * Recursive function, called for every level of the config structure
     *
     * @param   {any} from
     * @param   {any} to
     * @param    {string} translationFn
     * @returns {void}
     */
    private _nextLevel(from: any, to: any, translationFn: '_min' | '_max'): void {

        for (let key in from) {

            let current: string | number = key;
            /**
             * For in returns array indices as keys, so let's cast them to numbers
             */
            if (from instanceof Array) {
                current = parseInt(key, 10);
            }

            /**
             * In case something has extended Object prototypes
             */
            if (!from.hasOwnProperty(current))
                continue;

            /**
             * Translate the key to a one letter substitute
             */
            let minKey = ConfigMinifier[translationFn](current, this._keys);

            /**
             * For Arrays and Objects, create a new Array/Object
             * on the minified object and recurse into it
             */
            if (typeof from[current] === 'object') {
                to[minKey] = from[current] instanceof Array ? [] : {};
                this._nextLevel(from[current], to[minKey], translationFn);

                /**
                 * For primitive values (Strings, Numbers, Boolean etc.)
                 * minify the value
                 */
            } else {
                to[minKey] = ConfigMinifier[translationFn](from[key], this._values);
            }
        }
    }

    /**
     * Minifies value based on a dictionary
     *
     * @param   {string|boolean} value
     * @param   {Array<string|boolean>} dictionary
     * @returns {string} The minified version
     */
    static _min(value: string | number, dictionary: any): string | number {
        /**
         * If a value actually is a single character, prefix it
         * with ___ to avoid mistaking it for a minification code
         */
        if (typeof value === 'string' && value.length === 1) {
            return '___' + value;
        }

        let index = indexOf(value, dictionary);

        /**
         * value not found in the dictionary, return it unmodified
         */
        if (index === -1) {
            return value;

            /**
             * value found in dictionary, return its base36 counterpart
             */
        } else {
            return index.toString(36);
        }
    }

    static _max(value: string | number, dictionary: any): string | number {
        /**
         * value is a single character. Assume that it's a translation
         * and return the original value from the dictionary
         */
        if (typeof value === 'string' && value.length === 1) {
            return dictionary[parseInt(value, 36)];
        }

        /**
         * value originally was a single character and was prefixed with ___
         * to avoid mistaking it for a translation. Remove the prefix
         * and return the original character
         */
        if (typeof value === 'string' && value.substr(0, 3) === '___') {
            return value[3];
        }
        /**
         * value was not minified
         */
        return value;
    }
}

