import ItemConfigType from "../config/ItemConfigType";
import { ContentItemType } from "./Commons";
import IEventEmitter from "./IEventEmitter";
import ILayoutManager from "./ILayoutManager";
import IBrowserPopout from "./IBrowserPopout";



export default interface IContentItem extends IEventEmitter {
    /**
     * This items configuration in its current state
     */
    readonly config: ItemConfigType;

    /**
     * The type of the item. Can be row, column, stack, component or root
     */
    readonly type: ContentItemType;

    /**
     * An array of items that are children of this item
     */
    readonly contentItems: IContentItem[];

    /**
     * The item that is this item's parent (or null if the item is root)
     */
    readonly parent: IContentItem;

    /**
     * A String or array of identifiers if provided in the configuration
     */
    readonly id: string;

    /**
     * True if the item had been initialised
     */
    readonly isInitialised: boolean;

    /**
     * True if the item is maximised
     */
    readonly isMaximised: boolean;

    /**
     * True if the item is the layout's root item
     */
    readonly isRoot: boolean;

    /**
     * True if the item is a row
     */
    readonly isRow: boolean;

    /**
     * True if the item is a column
     */
    readonly isColumn: boolean;

    /**
     * True if the item is a stack
     */
    readonly isStack: boolean;

    /**
     * True if the item is a component
     */
    readonly isComponent: boolean;

    /**
     * A reference to the layoutManager that controls this item
     */
    readonly layoutManager: ILayoutManager;

    /**
     * The item's outer element
     */
    readonly element: JQuery;

    /**
     * The item's inner element. Can be the same as the outer element.
     */
    readonly childElementContainer: JQuery;

    /**
     * Adds an item as a child to this item. If the item is already a part of a layout it will be removed
     * from its original position before adding it to this item.
     * @param itemOrItemConfig A content item (or tree of content items) or an ItemConfiguration to create the item from
     * @param index last index  An optional index that determines at which position the new item should be added. Default: last index.
     */
    addChild(itemOrItemConfig: IContentItem | ItemConfigType, index?: number): void;

    /**
     * Destroys the item and all it's children
     * @param contentItem The contentItem that should be removed
     * @param keepChild If true the item won't be destroyed. (Use cautiosly, if the item isn't destroyed it's up to you to destroy it later). Default: false.
     */
    removeChild(contentItem: IContentItem, keepChild?: boolean): void;

    /**
     * The contentItem that should be removed
     * @param oldChild    ContentItem The contentItem that should be removed
     * @param newChild A content item (or tree of content items) or an ItemConfiguration to create the item from
     */
    replaceChild(oldChild: IContentItem, newChild: IContentItem | ItemConfigType, destroyOldChild?: boolean): void;

    /**
     * Updates the items size. To actually assign a new size from within a component, use container.setSize( width, height )
     */
    setSize(width?: number, height?: number): void;

    /**
     * Sets the item's title to the provided value. Triggers titleChanged and stateChanged events
     * @param title the new title
     */
    setTitle(title: string): void;


    /**
     * Convenience method for item.parent.removeChild( item )
     */
    remove(): void;

    /**
     * Removes the item from its current position in the layout and opens it in a window
     */
    popout(): IBrowserPopout;

    /**
     * Maximises the item or minimises it if it's already maximised
     */
    toggleMaximise(event?: JQuery.Event): void;

    /**
     * Selects the item. Only relevant if settings.selectionEnabled is set to true
     */
    select(): void;

    /**
     * Unselects the item. Only relevant if settings.selectionEnabled is set to true
     */
    deselect(): void;

    /**
     * Returns true if the item has the specified id or false if not
     * @param id An id to check for
     */
    hasId(id: string): boolean;

    /**
     * Only Stacks have this method! 
     * It's the programmatical equivalent of clicking a tab.
     * @param contentItem The new active content item
     */
    setActiveContentItem(contentItem: IContentItem): void;

    /**
     * Only Stacks have this method! 
     * Returns the currently selected contentItem.
     */
    getActiveContentItem(): IContentItem;

    /**
     * Adds an id to an item or does nothing if the id is already present
     * @param id The id to be added
     */
    addId(id: string): void;

    /**
     * Removes an id from an item or throws an error if the id couldn't be found
     * @param id The id to be removed
     */
    removeId(id: string): void;

    /**
     * Calls filterFunction recursively for every item in the tree. If the function returns true the item is added to the resulting array
     * @param filterFunction A function that determines whether an item matches certain criteria
     */
    getItemsByFilter(filterFunction: (contentItem: IContentItem) => boolean): IContentItem[];

    /**
     * Returns all items with the specified id.
     * @param id An id specified in the itemConfig
     */
    getItemsById(id: string | string[]): IContentItem[];

    /**
     * Returns all items with the specified type
     * @param type 'row', 'column', 'stack', 'component' or 'root'
     */
    getItemsByType(type: ContentItemType): IContentItem[];

    /**
     * Returns all instances of the component with the specified componentName
     * @param componentName a componentName as specified in the itemConfig
     */
    getComponentsByName(componentName: string): IContentItem[];

    /**
     * A powerful, yet admittedly confusing method to recursively call methods on items in a tree. Usually you wouldn't need
     * to use it directly, but it's used internally to setSizes, destroy parts of the item tree etc.
     * @param functionName The name of the method to invoke
     * @param functionArguments An array of arguments to pass to every function
     * @param bottomUp If true, the method is invoked on the lowest parts of the tree first and then bubbles upwards. Default: false
     * @param skipSelf If true, the method will only be invoked on the item's children, but not on the item itself. Default: false
     */
    callDownwards(functionName: string, functionArguments?: any[], bottomUp?: boolean, skipSelf?: boolean): void;

    /**
     * Emits an event that bubbles up the item tree until it reaches the root element (and after a delay the layout manager). Useful e.g. for indicating state changes.
     */
    emitBubblingEvent(name: string): void;

}