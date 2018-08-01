import { Callback } from "./Commons";

export default interface IEventEmitter {
    /**
     * Subscribe to an event
     * @param eventName The name of the event to describe to
     * @param callback The function that should be invoked when the event occurs
     * @param context The value of the this pointer in the callback function
     */
    on(eventName: string, callback: Callback, context?: any): void;

    /**
     * Notify listeners of an event and pass arguments along
     * @param eventName The name of the event to emit
     */
    emit(eventName: string, arg1?: any, arg2?: any, ...argN: any[]): void;

    /**
     * Alias for emit
     */
    trigger(eventName: string, arg1?: any, arg2?: any, ...argN: any[]): void;

    /**
     * Unsubscribes either all listeners if just an eventName is provided, just a specific callback if invoked with
     * eventName and callback or just a specific callback with a specific context if invoked with all three
     * arguments.
     * @param eventName The name of the event to unsubscribe from
     * @param callback The function that should be invoked when the event occurs
     * @param context The value of the this pointer in the callback function
     */
    unbind(eventName: string, callback?: Callback, context?: any): void;

    /**
     * Alias for unbind
     */
    off(eventName: string, callback?: Callback, context?: any): void;
}