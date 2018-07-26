
import {
    indexOf
} from './utils'
import Config from '../config';

/**
 * Minifies and unminifies configs by replacing frequent keys
 * and values with one letter substitutes. Config options must
 * retain array position/index, add new options at the end.
 *
 * @constructor
 */


export default class ConfigMinifier {

    private _keys: Array<string>;
    private _values: Array<any>;

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
     * @param   {Object} config A GoldenLayout config object
     *
     * @returns {Object} minified config
     */
    minifyConfig(config: Config): Object {
        var min = {};
        this._nextLevel(config, min, '_min');
        return min;
    }

    /**
     * Takes a configuration Object that was previously minified
     * using minifyConfig and returns its original version
     *
     * @param   {Object} minifiedConfig
     *
     * @returns {Object} the original configuration
     */
    unminifyConfig(minifiedConfig: Object): Config {
        var orig = {};
        this._nextLevel(minifiedConfig, orig, '_max');
        return orig;
    }

    /**
     * Recursive function, called for every level of the config structure
     *
     * @param   {Array|Object} orig
     * @param   {Array|Object} min
     * @param    {String} translationFn
     *
     * @returns {void}
     */
    private _nextLevel(from: Object | Array<any>, to: Object | Array<any>, translationFn: string): void {
        let minKey;
        let key;

        for (key in from) {

            /**
             * For in returns array indices as keys, so let's cast them to numbers
             */
            if (from instanceof Array) {
                key = parseInt(key, 10);
            }

            /**
             * In case something has extended Object prototypes
             */
            if (!from.hasOwnProperty(key))
                continue;

            /**
             * Translate the key to a one letter substitute
             */
            minKey = this[translationFn](key, this._keys);

            /**
             * For Arrays and Objects, create a new Array/Object
             * on the minified object and recurse into it
             */
            if (typeof from[key] === 'object') {
                to[minKey] = from[key] instanceof Array ? [] : {};
                this._nextLevel(from[key], to[minKey], translationFn);

                /**
                 * For primitive values (Strings, Numbers, Boolean etc.)
                 * minify the value
                 */
            } else {
                to[minKey] = this[translationFn](from[key], this._values);
            }
        }
    }

    /**
     * Minifies value based on a dictionary
     *
     * @param   {String|Boolean} value
     * @param   {Array<String|Boolean>} dictionary
     *
     * @returns {String} The minified version
     */
    static _min(value: string | boolean, dictionary: Array<string | boolean>): string | boolean {
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

    static _max(value: any, dictionary: Object) {
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

