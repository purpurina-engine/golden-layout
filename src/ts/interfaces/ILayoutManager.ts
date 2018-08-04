import IEventEmitter from "./IEventEmitter";
import IContentItem from "./IContentItem";
import LayoutConfig from "../config/LayoutConfig";
import ItemConfigType from "../config/ItemConfigType";
import IBrowserPopout from "./IBrowserPopout";
import { ElementDimensions } from "./Commons";
import DragSource from "../dragDrop/DragSource";

export default interface ILayoutManager extends IEventEmitter {
    /**
     * The topmost item in the layout item tree. In browser terms: Think of the GoldenLayout instance as window
     * object and of goldenLayout.root as the document.
     */
    readonly root: IContentItem;

    /**
     * A reference to the (jQuery) DOM element containing the layout
     */
    readonly container: JQuery;

    /**
     * True once the layout item tree has been created and the initialised event has been fired
     */
    readonly isInitialised: boolean;

    /**
     * A reference to the current, extended top level config.
     *
     * Don't rely on this object for state saving / serialisation. Use layout.toConfig() instead.
     */
    readonly config: LayoutConfig;

    /**
     * The currently selected item or null if no item is selected. Only relevant if settings.selectionEnabled is set
     * to true.
     */
    selectedItem: IContentItem;

    /**
     * The current outer width of the layout in pixels.
     */
    readonly width: number;

    /**
     * The current outer height of the layout in pixels.
     */
    readonly height: number;

    /**
     * An array of BrowserWindow instances
     */
    readonly openPopouts: IBrowserPopout[];

    /**
     * True if the layout has been opened as a popout by another layout.
     */
    readonly isSubWindow: boolean;

    /**
     * A singleton instance of EventEmitter that works across windows
     */
    readonly eventHub: IEventEmitter;


    /*
     * @param name 	The name of the component, as referred to by componentName in the component configuration.
     * @param component 	A constructor or factory function. Will be invoked with new and two arguments, a
     *                      containerobject and a component state
     */
    registerComponent(name: string, component: any): void;

    /**
     * Renders the layout into the container. If init() is called before the document is ready it attaches itself as
     * a listener to the document and executes once it becomes ready.
     */
    init(): void;

    /**
     * Returns the current state of the layout and its components as a serialisable object.
     * @param rootItem Optional start point to serialise configuration
     */
    toConfig(rootItem?: IContentItem): any;

    /**
     * Returns a component that was previously registered with layout.registerComponent().
     * @param name The name of a previously registered component
     */
    getComponent(name: string): any;

    /**
     * Resizes the layout. If no arguments are provided GoldenLayout measures its container and resizes accordingly.
     * @param width The outer width the layout should be resized to. Default: The container elements width
     * @param height The outer height the layout should be resized to. Default: The container elements height
     */
    updateSize(width?: number, height?: number): void;

    /**
     * Destroys the layout. Recursively calls destroy on all components and content items, removes all event
     * listeners and finally removes itself from the DOM.
     */
    destroy(): void;

    /**
     * Creates a new content item or tree of content items from configuration. Usually you wouldn't call this
     * directly, but instead use methods like layout.createDragSource(), item.addChild() or item.replaceChild() that
     * all call this method implicitly.
     * @param itemConfiguration An item configuration (can be an entire tree of items)
     * @param parent A parent item
     */
    createContentItem(itemConfiguration?: ItemConfigType, parent?: IContentItem): IContentItem;

    /**
     * Creates a new popout window with configOrContentItem as contents at the position specified in dimensions
     * @param configOrContentItem   The content item or config that will be created in the new window. If a item is
     *                              provided its config will be read, if config is provided, only the content key
     *                              will be used
     * @param dimensions    A map containing the keys left, top, width and height. Left and top can be negative to
     *                      place the window in another screen.
     * @param parentId  The id of the item within the current layout the child window's content will be appended to
     *                  when popIn is clicked
     * @param indexInParent The index at which the child window's contents will be appended to. Default: null
     */
    createPopout(configOrContentItem: ItemConfigType | IContentItem,
        dimensions: ElementDimensions, parentId?: string,
        indexInParent?: number): void;

    /**
     * Turns a DOM element into a dragSource, meaning that the user can drag the element directly onto the layout
     * where it turns into a contentItem.
     * @param element The DOM element that will be turned into a dragSource
     * @param itemConfiguration An item configuration (can be an entire tree of items)
     */
    createDragSource(element: HTMLElement | JQuery, itemConfiguration: ItemConfigType): DragSource;

    /**
     * If settings.selectionEnabled is set to true, this allows to select items programmatically.
     * @param contentItem A ContentItem instance
     * @param silent Wheather to notify the item of its selection
     * @event selectionChanged
     */
    selectItem(contentItem: IContentItem, silent?: boolean): void;

    /**
     * Static method on the GoldenLayout constructor! This method will iterate through a GoldenLayout config object
     * and replace frequent keys and values with single letter substitutes.
     * @param config A GoldenLayout configuration object
     */
    minifyConfig(config: LayoutConfig): any;

    /**
     * Static method on the GoldenLayout constructor! This method will reverse the minifications of GoldenLayout.minifyConfig.
     * @param minifiedConfig A minified GoldenLayout configuration object
     */
    unminifyConfig(minifiedConfig: any): LayoutConfig;

    // /**
    //  * Subscribe to an event
    //  * @param eventName The name of the event to describe to
    //  * @param callback The function that should be invoked when the event occurs
    //  * @param context The value of the this pointer in the callback function
    //  */
    // on(eventName: string, callback: Function, context?: any): void;

    // /**
    //  * Notify listeners of an event and pass arguments along
    //  * @param eventName The name of the event to emit
    //  */
    // emit(eventName: string, arg1?: any, arg2?: any, ...argN: any[]): void;

    // /**
    //  * Alias for emit
    //  */
    // trigger(eventName: string, arg1?: any, arg2?: any, ...argN: any[]): void;

    // /**
    //  * Unsubscribes either all listeners if just an eventName is provided, just a specific callback if invoked with
    //  * eventName and callback or just a specific callback with a specific context if invoked with all three
    //  * arguments.
    //  * @param eventName The name of the event to unsubscribe from
    //  * @param callback The function that should be invoked when the event occurs
    //  * @param context The value of the this pointer in the callback function
    //  */
    // unbind(eventName: string, callback?: Function, context?: any): void;

    // /**
    //  * Alias for unbind
    //  */
    // off(eventName: string, callback?: Function, context?: any): void;
}

