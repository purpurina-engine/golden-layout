
import {
    isFunction
} from './utils'
import { Callback } from '../Commons';

/**
 * A generic and very fast EventEmitter
 * implementation. On top of emitting the
 * actual event it emits an
 *
 * EventEmitter.ALL_EVENT
 *
 * event for every event triggered. This allows
 * to hook into it and proxy events forwards
 *
 * @constructor
 */

export const ALL_EVENT = '__all'

export default class EventEmitter {

    private _mSubscriptions: Object = {};

    /**
     * The name of the event that's triggered for every other event
     *
     * usage
     *
     * myEmitter.on( EventEmitter.ALL_EVENT, function( eventName, argsArray ){
     *  //do stuff
     * });
     *
     * @type {string}
     */
    constructor() {
        this._mSubscriptions = {};
        this._mSubscriptions[ALL_EVENT] = [];
    }

    /**
     * Emit an event and notify listeners
     * 
     * @param {string} sEvent 
     * @param {any[]} args 
     * 
     * @returns {void} 
     */
    emit(sEvent: string, ...args: any[]): void {
        let ctx;
        args = Array.prototype.slice.call(arguments, 1);
        let subs = this._mSubscriptions[sEvent];

        if (subs) {
            subs = subs.slice();
            for (let i = 0; i < subs.length; i++) {
                ctx = subs[i].ctx || {};
                subs[i].fn.apply(ctx, args);
            }
        }

        args.unshift(sEvent);

        let allEventSubs = this._mSubscriptions[ALL_EVENT].slice()

        for (let i = 0; i < allEventSubs.length; i++) {
            ctx = allEventSubs[i].ctx || {};
            allEventSubs[i].fn.apply(ctx, args);
        }
    };

    /**
    * Listen for events
    *
    * @param   {string} sEvent    The name of the event to listen to
    * @param   {Function} fCallback The callback to execute when the event occurs
    * @param   {[Object]} oContext The value of the this pointer within the callback function
    *
    * @returns {void}
    */
    on(event: string, callback: Callback, context?: Object): void {
        if (!isFunction(callback)) {
            throw new Error('Tried to listen to event ' + event + ' with non-function callback ' + callback);
        }

        if (!this._mSubscriptions[event]) {
            this._mSubscriptions[event] = [];
        }

        this._mSubscriptions[event].push({
            fn: callback,
            ctx: context
        });
    };

    /**
    * Removes a listener for an event, or all listeners if no callback and context is provided.
    *
    * @param   {string} sEvent    The name of the event
    * @param   {Function} fCallback The previously registered callback method (optional)
    * @param   {Object} oContext  The previously registered context (optional)
    *
    * @returns {void}
    */
    unbind(sEvent: string, fCallback: Function, oContext?: Object): void {
        if (!this._mSubscriptions[sEvent]) {
            throw new Error('No subscriptions to unsubscribe for event ' + sEvent);
        }

        let bUnbound = false;

        for (let i = 0; i < this._mSubscriptions[sEvent].length; i++) {
            if (
                (!fCallback || this._mSubscriptions[sEvent][i].fn === fCallback) &&
                (!oContext || oContext === this._mSubscriptions[sEvent][i].ctx)
            ) {
                this._mSubscriptions[sEvent].splice(i, 1);
                bUnbound = true;
            }
        }

        if (bUnbound === false) {
            throw new Error('Nothing to unbind for ' + sEvent);
        }
    };

    /**
    * Alias for unbind
    */
    off = this.unbind;

    /**
     * Alias for emit
     */
    trigger = this.emit;
}
