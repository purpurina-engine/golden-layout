
import IEventEmitter from '../interfaces/IEventEmitter';
import { Callback } from '../interfaces/Commons';
import {
    isFunction
} from '../utils/utils'



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

interface EventSubscribed {
    fn: Callback;
    ctx: any;
}

interface Subscriptions {
    [indexer: string]: EventSubscribed[];
}

export default class EventEmitter implements IEventEmitter {

    private _mSubscriptions: Subscriptions = {};

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
     * Notify listeners of an event and pass arguments along
     * @param eventName The name of the event to emit
     */
    emit(eventName: string, ...args: any[]): void {
        let ctx;
        args = Array.prototype.slice.call(arguments, 1);
        let subs = this._mSubscriptions[eventName];

        if (subs) {
            subs = subs.slice();
            for (let i = 0; i < subs.length; i++) {
                ctx = subs[i].ctx || {};
                subs[i].fn.apply(ctx, args);
            }
        }

        args.unshift(eventName);

        let allEventSubs = this._mSubscriptions[ALL_EVENT].slice()

        for (let i = 0; i < allEventSubs.length; i++) {
            ctx = allEventSubs[i].ctx || {};
            allEventSubs[i].fn.apply(ctx, args);
        }
    };

    /**
     * Subscribe to an event
     * @param eventName The name of the event to describe to
     * @param callback The function that should be invoked when the event occurs
     * @param context The value of the this pointer in the callback function
     */
    on(event: string, callback: Callback, context?: any): void {
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
    * Unsubscribes either all listeners if just an eventName is provided, just a specific callback if invoked with
    * eventName and callback or just a specific callback with a specific context if invoked with all three
    * arguments.
    * @param eventName The name of the event to unsubscribe from
    * @param callback The function that should be invoked when the event occurs
    * @param context The value of the this pointer in the callback function
    */
    unbind(eventName: string, callback?: Callback, context?: any): void {
        if (!this._mSubscriptions[eventName]) {
            throw new Error('No subscriptions to unsubscribe for event ' + eventName);
        }

        let bUnbound = false;

        for (let i = 0; i < this._mSubscriptions[eventName].length; i++) {
            if (
                (!callback || this._mSubscriptions[eventName][i].fn === callback) &&
                (!context || context === this._mSubscriptions[eventName][i].ctx)
            ) {
                this._mSubscriptions[eventName].splice(i, 1);
                bUnbound = true;
            }
        }

        if (bUnbound === false) {
            throw new Error('Nothing to unbind for ' + eventName);
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
