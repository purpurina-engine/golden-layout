import GoldenLayout from '../GoldenLayout';
import EventEmitter from '../utils/EventEmitter';
import BubblingEvent from '../utils/BubblingEvent';
import Root from './Root';
import ConfigurationError from '../errors/ConfigurationError';
import itemDefaultConfig from '../config/itemDefaultConfig';
import { ContentArea, ContentItemType } from '../Commons';
import ItemConfigType from '../config/ItemConfigType';
import Docker from './Docker';
import Header from '../controls/Header';
import Stack from './Stack';
import Tab from '../controls/Tab';
import BrowserPopout from '../controls/BrowserPopout';
import Component from './Component';

import {
    ALL_EVENT
} from '../utils/EventEmitter';

import {
    fnBind,
    animFrame,
    indexOf
} from '../utils/utils'

/**
 * This is the base class that all content items inherit from.
 * Most methods provide a subset of what the sub-classes do.
 *
 * It also provides a number of functions for tree traversal
 *
 *
 * @event stateChanged
 * @event beforeItemDestroyed
 * @event itemDestroyed
 * @event itemCreated
 * @event componentCreated
 * @event rowCreated
 * @event columnCreated
 * @event stackCreated
 *
 * @class
 */
export default abstract class ContentItem extends EventEmitter {

    //[indexer: string]: any;

    protected _config: ItemConfigType;

    protected _id: string;
    protected _type: ContentItemType;
    protected _layoutManager: GoldenLayout;

    protected _parent: ContentItem;
    protected _contentItems: ContentItem[];

    protected _childElementContainer: JQuery;
    protected _element: JQuery;

    protected _isRoot: boolean;
    protected _isStack: boolean;
    protected _isComponent: boolean;
    protected _isColumn: boolean;
    protected _isRow: boolean;
    protected _isMaximized: boolean;
    protected _isInitialized: boolean;

    /**
     * This items configuration in its current state
     */
    get config(): ItemConfigType {
        return this._config;
    }

    /**
     * The type of the item. Can be row, column, stack, component or root
     */
    get type(): ContentItemType {
        return this._type;
    }

    /**
     * An array of items that are children of this item
     */
    get contentItems(): ContentItem[] {
        return this._contentItems;
    }

    /**
     * The item that is this item's parent (or null if the item is root)
     */
    get parent(): ContentItem {
        return this._parent;
    }

    /**
     * A String or array of identifiers if provided in the configuration
     */
    public get id(): string {
        return this._id;
    }

    /**
     * True if the item had been initialized
     */
    get isInitialized(): boolean {
        return this._isInitialized;
    }


    /**
     * True if the item is maximized
     */
    get isMaximized(): boolean {
        return this._isMaximized;
    }

    /**
     * True if the item is the layout's root item
     */
    get isRoot(): boolean {
        return this._isRoot;
    }

    /**
     * True if the item is a row
     */
    get isRow(): boolean {
        return this._isRow;
    }
    /**
     * True if the item is a column
     */
    get isColumn(): boolean {
        return this._isColumn;
    }

    /**
     * True if the item is a stack
     */
    get isStack(): boolean {
        return this._isStack;
    }

    /**
     * True if the item is a component
     */
    get isComponent(): boolean {
        return this._isComponent;
    }

    /**
     * A reference to the layoutManager that controls this item
     */
    get layoutManager(): GoldenLayout {
        return this._layoutManager;
    }

    /**
     * The item's inner element. Can be the same as the outer element.
     */
    get childElementContainer(): JQuery {
        return this._childElementContainer;
    }

    /**
     * The item's outer element
     */
    get element(): JQuery {
        return this._element;
    }
  
    private _pendingEventPropagations: { [indexer: string]: any };
    private _throttledEvents: string[];


    constructor(layoutManager: GoldenLayout, config: ItemConfigType, parent: ContentItem) {

        super();

        this._config = this._extendItemNode(config);
        this._type = config.type;
        this._contentItems = [];
        this._parent = parent;

        this._isInitialized = false;
        this._isMaximized = false;
        this._isRoot = false;
        this._isRow = false;
        this._isColumn = false;
        this._isStack = false;
        this._isComponent = false;

        this._layoutManager = layoutManager;
        this._pendingEventPropagations = {};
        this._throttledEvents = ['stateChanged'];

        this.on(ALL_EVENT, this._propagateEvent, this);

        if (config.content) {
            this._createContentItems(config);
        }
    }

    /**
     * Set the size of the component and its children, called recursively
     *
     * @abstract
     * @returns void
     */
    abstract setSize(width?: number, height?: number): void;


    // abstract setActiveContentItem(contentItem: ContentItem): void;
    // abstract getActiveContentItem(): ContentItem;

    /**
     * Calls a method recursively downwards on the tree
     *
     * @param   {string} functionName      the name of the function to be called
     * @param   {any[]}functionArguments optional arguments that are passed to every function
     * @param   {boolean} bottomUp          Call methods from bottom to top, defaults to false
     * @param   {boolean} skipSelf          Don't invoke the method on the class that calls it, defaults to false
     *
     * @returns {void}
     */
    callDownwards(functionName: string, functionArguments?: any[], bottomUp?: boolean, skipSelf?: boolean): void {

         if (bottomUp !== true && skipSelf !== true) {
            (this as any)[functionName].apply(this, Array.isArray(functionArguments) ? functionArguments : [functionArguments]);
        }
        for (let i = 0; i < this.contentItems.length; i++) {
            this.contentItems[i].callDownwards(functionName, functionArguments, bottomUp);
        }
        if (bottomUp === true && skipSelf !== true) {
            (this as any).apply(this, functionArguments || []);
        }
    }

    /**
     * Removes a child node (and its children) from the tree
     *
     * @param   {ContentItem} contentItem
     *
     * @returns {void}
     */
    removeChild(contentItem: ContentItem, keepChild?: boolean): void {
        /*
         * Get the position of the item that's to be removed within all content items this node contains
         */
        let index = indexOf(contentItem, this.contentItems);

        /*
         * Make sure the content item to be removed is actually a child of this item
         */
        if (index === -1) {
            throw new Error('Can\'t remove child item. Unknown content item');
        }

        /**
         * Call ._$destroy on the content item. This also calls ._$destroy on all its children
         */
        if (keepChild !== true) {
            (this.contentItems[index] as ContentItem)._$destroy();
        }

        /**
         * Remove the content item from this nodes array of children
         */
        this.contentItems.splice(index, 1);

        /**
         * Remove the item from the configuration
         */
        this.config.content.splice(index, 1);

        /**
         * If this node still contains other content items, adjust their size
         */
        if (this.contentItems.length > 0) {
            this.callDownwards('setSize');

            /**
             * If this was the last content item, remove this node as well
             */
        } else if (!(this instanceof Root) && this.config.isClosable === true) {
            this.parent.removeChild(this);
        }
    }

    /**
     * Hides a child node (and its children) from the tree reclaiming its space in the layout
     *
     * @param   {ContentItem} contentItem
     *
     * @returns {void}
     */
    undisplayChild(contentItem: ContentItem): void {
        /*
         * Get the position of the item that's to be removed within all content items this node contains
         */
        let index = indexOf(contentItem, this.contentItems);

        /*
         * Make sure the content item to be removed is actually a child of this item
         */
        if (index === -1) {
            throw new Error('Can\'t remove child item. Unknown content item');
        }

        if (!(this instanceof Root) && this.config.isClosable === true) {
            this.parent.undisplayChild(this);
        }
    }

    /**
     * Sets up the tree structure for the newly added child
     * The responsibility for the actual DOM manipulations lies
     * with the concrete item
     * *********************
     * Adds an item as a child to this item. If the item is already a part of a layout it will be removed
     * from its original position before adding it to this item.
     * @param itemOrItemConfig A content item (or tree of content items) or an ItemConfiguration to create the item from
     * @param index last index  An optional index that determines at which position the new item should be added. Default: last index.
     */
    addChild(itemOrItemConfig: ContentItem, index?: number): void {
        if (index === undefined) {
            index = this.contentItems.length;
        }

        if (itemOrItemConfig instanceof ContentItem) {
            this.contentItems.splice(index, 0, itemOrItemConfig);
        }


        if (this.config.content === undefined) {
            this.config.content = [];
        }

        if (itemOrItemConfig instanceof ContentItem) {
            this.config.content.splice(index, 0, itemOrItemConfig.config);

            itemOrItemConfig._parent = this;

            if (itemOrItemConfig.parent._isInitialized === true && itemOrItemConfig._isInitialized === false) {
                itemOrItemConfig._$init();
            }
        }
    }

    /**
     * Replaces oldChild with newChild. This used to use jQuery.replaceWith... which for
     * some reason removes all event listeners, so isn't really an option.
     *
     * @param   {ContentItem} oldChild
     * @param   {ContentItem|ItemConfigType} newChild
     *
     * @returns {void}
     */
    replaceChild(oldChild: ContentItem, newChild: ContentItem | ItemConfigType, _destroyOldChild?: boolean): void {

        let newChildToPush = this.layoutManager._$normalizeContentItem(newChild);

        let index = indexOf(oldChild, this.contentItems),
            parentNode = oldChild.element[0].parentNode;

        if (index === -1) {
            throw new Error('Can\'t replace child. oldChild is not child of this');
        }

        parentNode.replaceChild(newChildToPush.element[0], oldChild.element[0]);

        /*
         * Optionally destroy the old content item
         */
        if (_destroyOldChild === true) {
            oldChild._parent = null;
            oldChild._$destroy();
        }

        /*
         * Wire the new contentItem into the tree
         */
        this.contentItems[index] = newChildToPush;
        newChildToPush._parent = this;

        /*
         * Update tab reference
         */
        if (this._isStack) {
            const stack = this as any;
            stack.header.tabs[index].contentItem = newChildToPush;
        }

        //TODO This doesn't update the config... refactor to leave item nodes untouched after creation
        if (newChildToPush.parent._isInitialized === true && newChildToPush._isInitialized === false) {
            newChildToPush._$init();
        }

        this.callDownwards('setSize');
    }

    /**
     * Convenience method.
     * Shorthand for this.parent.removeChild( this )
     *
     * @returns {void}
     */
    remove(): void {
        this.parent.removeChild(this);
    }

    /**
     * Removes the component from the layout and creates a new
     * browser window with the component and its children inside
     *
     * @returns {BrowserPopout}
     */
    popout(): BrowserPopout {
        let browserPopout = this.layoutManager.createPopout(this);
        this.emitBubblingEvent('stateChanged');
        return browserPopout;
    }

    /**
     * Maximises the Item or minimises it if it is already maximised
     *
     * @returns {void}
     */
    toggleMaximize(e?: JQuery.Event): void {
        e && e.preventDefault();
        if (this._isMaximized === true) {
            this.layoutManager._$minimiseItem(this);
        } else {
            this.layoutManager._$maximiseItem(this);
        }

        this._isMaximized = !this._isMaximized;
        this.emitBubblingEvent('stateChanged');
    }

    /**
     * Selects the item. Only relevant if settings.selectionEnabled is set to true
     */
    select(): void {
        if (this.layoutManager.selectedItem !== this) {
            this.layoutManager.selectItem(this, true);
            this.element.addClass('lm_selected');
        }
    }

    /**
    * Unselects the item. Only relevant if settings.selectionEnabled is set to true
    */
    deselect(): void {
        if (this.layoutManager.selectedItem === this) {
            this.layoutManager.selectedItem = null;
            this.element.removeClass('lm_selected');
        }
    }

    /**
     * Set this component's title
     *
     * @public
     * @param {string} title
     *
     * @returns {void}
     */
    setTitle(title: string): void {
        this.config.title = title;
        this.emit('titleChanged', title);
        this.emit('stateChanged');
    }

    /**
      * Returns true if the item has the specified id or false if not
      * @param id An id to check for
      * @return {boolean}
      */
    hasId(id: string): boolean {
        if (!this.config.id) {
            return false;
        } else if (typeof this.config.id === 'string') {
            return this.config.id === id;
        } else if (this.config.id instanceof Array) {
            return indexOf(id, this.config.id) !== -1;
        }
        return true;
    }

    /**
     * Adds an id. Adds it as a string if the component doesn't
     * have an id yet or creates/uses an array
     *
     * @public
     * @param {string} id
     *
     * @returns {void}
     */
    addId(id: string): void {
        if (this.hasId(id)) {
            return;
        }

        if (!this.config.id) {
            this.config.id = id;
        } else if (typeof this.config.id === 'string') {
            this.config.id = [this.config.id, id];
        } else if (this.config.id instanceof Array) {
            this.config.id.push(id);
        }
    }

    /**
     * Removes an existing id. Throws an error
     * if the id is not present
     *
     * @public
     * @param   {string} id
     *
     * @returns {void}
     */
    removeId(id: string): void {
        if (!this.hasId(id)) {
            throw new Error('Id not found');
        }

        if (typeof this.config.id === 'string') {
            delete this.config.id;
        } else if (this.config.id instanceof Array) {
            let index = indexOf(id, this.config.id);
            this.config.id.splice(index, 1);
        }
    }

    /****************************************
     * SELECTOR
     ****************************************/

    /**
     * Calls filterFunction recursively for every item in the tree. If the function returns true the item is added to the resulting array
     * @param filterFunction A function that determines whether an item matches certain criteria
     */
    getItemsByFilter(filterFunction: (contentItem: ContentItem) => boolean): ContentItem[] {
        let result: ContentItem[] = [],
            next = function (contentItem: ContentItem) {
                for (const iterator of contentItem.contentItems) {
                    if (filterFunction(iterator) === true) {
                        result.push(iterator);
                    }
                    next(iterator);
                }
                // for (let i = 0; i < contentItem.contentItems.length; i++) {  
                // }
            };
        next(this);
        return result;
    }

    /**
     * Returns all items with the specified id.
     * @param id An id specified in the itemConfig
     */
    getItemsById(id: string | string[]): ContentItem[] {
        return this.getItemsByFilter(function (item) {
            if (item.config.id instanceof Array) {
                return indexOf(id, item.config.id) !== -1;
            } else {
                return item.config.id === id;
            }
        });
    }

    /**
     * Returns all items with the specified type
     * @param type 'row', 'column', 'stack', 'component' or 'root'
     */
    getItemsByType(type: ContentItemType): ContentItem[] {
        return this._$getItemsByProperty('type', type);
    }


    /**
    * Returns all instances of the component with the specified componentName
    * @param componentName a componentName as specified in the itemConfig
    */
    getComponentsByName(componentName: string): Component[] {
        let components: Component[] = this._$getItemsByProperty('componentName', componentName) as Component[],
            instances = [];

        for (let i = 0; i < components.length; i++) {
            instances.push(components[i].instance);
        }

        return instances;
    }

    /****************************************
     * PACKAGE PRIVATE
     ****************************************/
    private _$getItemsByProperty(key: string, value: string) {
        return this.getItemsByFilter(function (item: ContentItem | any) {
            return item[key] === value;
        });
    }

    _$setParent(parent: ContentItem | any): void {
        this._parent = parent;
    }

    _$highlightDropZone(_x: number, _y: number, area?: ContentArea): void {
        this.layoutManager.dropTargetIndicator.highlightArea(area);
    }

    _$onDrop(contentItem: ContentItem, _area?: ContentArea): void {
        console.log('content-item')
        this.addChild(contentItem);
    }

    _$hide(): void {
        this._callOnActiveComponents('hide');
        this.element.hide();
        this.layoutManager.updateSize();
    }

    _$show(): void {
        this._callOnActiveComponents('show');
        this.element.show();
        this.layoutManager.updateSize();
    }

    private _callOnActiveComponents(methodName: string): void {
        let stacks = this.getItemsByType('stack') as Stack[];
        let activeContentItem: ContentItem;

        for (let i = 0; i < stacks.length; i++) {
            activeContentItem = stacks[i].getActiveContentItem();

            if (activeContentItem && activeContentItem.isComponent) {
                const component = (activeContentItem as Component);
                (component.container as any)[methodName]();
            }
        }
    }

    /**
     * Destroys this item ands its children
     *
     * @returns {void}
     */
    _$destroy(): void {
        this.emitBubblingEvent('beforeItemDestroyed');
        this.callDownwards('_$destroy', [], true, true);
        this.element.remove();
        this.emitBubblingEvent('itemDestroyed');
    }

    /**
     * Returns the area the component currently occupies in the format
     *
     * {
     *		x1: int
     *		xy: int
     *		y1: int
     *		y2: int
     *		contentItem: contentItem
     * }
     */
    _$getArea(element?: JQuery): ContentArea {
        element = element || this.element;

        let offset = element.offset(),
            width = element.width(),
            height = element.height();

        return {
            x1: offset.left,
            y1: offset.top,
            x2: offset.left + width,
            y2: offset.top + height,
            surface: width * height,
            contentItem: this
        };
    }

    /**
     * The tree of content items is created in two steps: First all content items are instantiated,
     * then init is called recursively from top to bottem. This is the basic init function,
     * it can be used, extended or overwritten by the content items
     *
     * Its behaviour depends on the content item
     *
     * @package private
     *
     * @returns {void}
     */
    protected _$init(): void {
        this.setSize();

        for (let i = 0; i < this.contentItems.length; i++) {
            this.childElementContainer.append(this.contentItems[i].element);
        }

        this._isInitialized = true;
        this.emitBubblingEvent('itemCreated');
        this.emitBubblingEvent(this.type + 'Created');
    }

    /**
     * Emit an event that bubbles up the item tree.
     *
     * @param   {string} name The name of the event
     *
     * @returns {void}
     */
    emitBubblingEvent(name: string): void {
        let event = new BubblingEvent(name, this);
        this.emit(name, event);
    }

    destroy(): void {
        this._contentItems = [];
    }

    /**
     * Private method, creates all content items for this node at initialisation time
     * PLEASE NOTE, please see addChild for adding contentItems add runtime
     * @private
     * @param   {ItemConfigType} config
     *
     * @returns {void}
     */
    private _createContentItems(config: ItemConfigType): void {
        let oContentItem;

        if (!(config.content instanceof Array)) {
            throw new ConfigurationError('content must be an Array', config);
        }

        for (let i = 0; i < config.content.length; i++) {
            oContentItem = this.layoutManager.createContentItem(config.content[i], this);
            this.contentItems.push(oContentItem);
        }
    }

    /**
     * Extends an item configuration node with default settings
     * @private
     * @param   {ItemConfigType} config
     *
     * @returns {any} extended config
     */
    private _extendItemNode(config: ItemConfigType | any): ItemConfigType {
        for (let key in itemDefaultConfig) {
            if (config[key] === undefined) {
                config[key] = itemDefaultConfig[key];
            }
        }
        return config;
    }

    /**
     * Called for every event on the item tree. Decides whether the event is a bubbling
     * event and propagates it to its parent
     *
     * @param   {string} name the name of the event
     * @param   {BubblingEvent} event
     *
     * @returns {void}
     */
    private _propagateEvent(name: string, event: BubblingEvent): void {
        if (event instanceof BubblingEvent &&
            event.isPropagationStopped === false &&
            this._isInitialized === true) {

            /**
             * In some cases (e.g. if an element is created from a DragSource) it
             * doesn't have a parent and is not below root. If that's the case
             * propagate the bubbling event from the top level of the substree directly
             * to the layoutManager
             */
            if (this._isRoot === false && this.parent) {
                this.parent.emit.apply(this.parent, Array.prototype.slice.call(arguments, 0));
            } else {
                this._scheduleEventPropagationToLayoutManager(name, event);
            }
        }
    }

    /**
     * All raw events bubble up to the root element. Some events that
     * are propagated to - and emitted by - the layoutManager however are
     * only string-based, batched and sanitized to make them more usable
     *
     * @param {string} name the name of the event
     *
     * @private
     * @returns {void}
     */
    private _scheduleEventPropagationToLayoutManager(name: string, event: BubblingEvent): void {

        if (indexOf(name, this._throttledEvents) === -1) {
            this.layoutManager.emit(name, event.origin);
        } else {
            if (this._pendingEventPropagations[name] !== true) {
                this._pendingEventPropagations[name] = true;
                animFrame(fnBind(this._propagateEventToLayoutManager, this, name, event));
            }
        }

    }

    /**
     * Callback for events scheduled by _scheduleEventPropagationToLayoutManager
     *
     * @param {string} name the name of the event
     *
     * @private
     * @returns {void}
     */
    private _propagateEventToLayoutManager(name: string, event: BubblingEvent): void {
        this._pendingEventPropagations[name] = false;
        this.layoutManager.emit(name, event);
    }
}
