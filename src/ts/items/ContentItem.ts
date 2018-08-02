import IContentItem from "../interfaces/IContentItem";
import LayoutManager from "../interfaces/LayoutManager";
import ItemConfigType from "../config/ItemConfigType";
import { ContentItemType } from "../interfaces/Commons";
import IBrowserPopout from "../interfaces/IBrowserPopout";

import EventEmitter, { ALL_EVENT } from "../utils/EventEmitter";
import ConfigurationError from "../errors/ConfigurationError";
import BubblingEvent from "../utils/BubblingEvent";
import GoldenLayout from "../GoldenLayout";

import Root from "./Root";
import Component from "./Component";

import {
    animFrame,
    fnBind,
    indexOf
} from "../utils/utils";

import { extendItemNode } from "../utils/itemFunctions";


type ContentItemEvent = 'stateChanged' | 'beforeItemDestroyed' | 'itemDestroyed' | 'itemCreated' | 'componentCreated' | 'rowCreated' | 'columnCreated' | 'stackCreated';

export default abstract class ContentItem extends EventEmitter implements IContentItem {

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
    protected _isMaximised: boolean;
    protected _isInitialised: boolean;

    private _pendingEventPropagations: { [indexer: string]: any };
    private _throttledEvents: ContentItemEvent[];

    public get config(): ItemConfigType {
        return this._config;
    }

    public get type(): ContentItemType {
        return this._type;
    }

    public get contentItems(): ContentItem[] {
        return this._contentItems;
    }

    public get parent(): ContentItem {
        return this._parent;
    }

    public get id(): string {
        return this._id;
    }

    get isInitialised(): boolean {
        return this._isInitialised;
    }

    get isMaximised(): boolean {
        return this._isMaximised;
    }

    get isRoot(): boolean {
        return this._isRoot;
    }

    get isRow(): boolean {
        return this._isRow;
    }

    get isColumn(): boolean {
        return this._isColumn;
    }

    get isStack(): boolean {
        return this._isStack;
    }

    get isComponent(): boolean {
        return this._isComponent;
    }

    get layoutManager(): LayoutManager {
        return this._layoutManager;
    }

    get childElementContainer(): JQuery {
        return this._childElementContainer;
    }

    get element(): JQuery {
        return this._element;
    }

    constructor(layoutManager: GoldenLayout, config: ItemConfigType, parent: ContentItem) {

        super();

        this._config = extendItemNode(config);
        this._type = config.type;
        this._contentItems = [];
        this._parent = parent;

        this._isInitialised = false;
        this._isMaximised = false;
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

    abstract setSize(width?: number, height?: number): void;

    addChild(itemOrItemConfig: ContentItem | ItemConfigType, index?: number): void {
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

            if (itemOrItemConfig.parent._isInitialised === true && itemOrItemConfig._isInitialised === false) {
                itemOrItemConfig._$init();
            }
        }
    }

    removeChild(contentItem: ContentItem, keepChild?: boolean): void {
        /*
         * Get the position of the item that's to be removed within all content items this node contains
         */
        const index = this.contentItems.indexOf(contentItem);

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

    replaceChild(oldChild: ContentItem, newChild: ContentItem | ItemConfigType, destroyOldChild?: boolean): void {
        const newChildToPush = this._layoutManager._$normalizeContentItem(newChild);
        const index = this.contentItems.indexOf(oldChild);
        const parentNode = oldChild.element[0].parentNode;

        if (index === -1) {
            throw new Error('Can\'t replace child. oldChild is not child of this');
        }

        parentNode.replaceChild(newChildToPush.element[0], oldChild.element[0]);

        /*
         * Optionally destroy the old content item
         */
        if (destroyOldChild === true) {
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
        if (newChildToPush.parent._isInitialised === true && newChildToPush._isInitialised === false) {
            newChildToPush._$init();
        }

        this.callDownwards('setSize');
    }

    remove(): void {
        this.parent.removeChild(this);
    }

    hasId(id: string): boolean {
        if (!this._config.id) {
            return false;
        } else if (typeof this._config.id === 'string') {
            return this._config.id === id;
        } else if (this._config.id instanceof Array) {
            return this._config.id.indexOf(id) !== -1;
        }

        return true;
    }

    addId(id: string): void {
        if (this.hasId(id)) {
            return;
        }

        if (!this._config.id) {
            this._config.id = id;
        } else if (typeof this._config.id === 'string') {
            this._config.id = [this._config.id, id];
        } else if (this._config.id instanceof Array) {
            this._config.id.push(id);
        }
    }
    
    removeId(id: string): void {
        if (!this.hasId(id)) {
            throw new Error('Id not found');
        }
        if (typeof this._config.id === 'string') {
            delete this._config.id;
        } else if (this._config.id instanceof Array) {
            const index = this._config.id.indexOf(id);
            this._config.id.splice(index, 1);
        }
    }
    
    setTitle(title: string): void {
        this._config.title = title;
        this.emit('titleChanged', title);
        this.emit('stateChanged');
    }
   
    popout(): IBrowserPopout {
        throw new Error("Method not implemented.");
    }
    
    toggleMaximise(event?: JQuery.Event): void {
        event && event.preventDefault();

        if (this._isMaximised === true) {
            this._layoutManager._$minimiseItem(this);
        } else {
            this._layoutManager._$maximiseItem(this);
        }

        this._isMaximised = !this._isMaximised;
        this.emitBubblingEvent('stateChanged');
    }

    select(): void {
        if (this._layoutManager.selectedItem !== this) {
            this._layoutManager.selectItem(this, true);
            this.element.addClass('lm_selected');
        }
    }

    deselect(): void {
        if (this._layoutManager.selectedItem === this) {
            this._layoutManager.selectedItem = null;
            this.element.removeClass('lm_selected');
        }
    }
   
    setActiveContentItem(contentItem: IContentItem): void {
        throw new Error("Method not implemented.");
    }
    getActiveContentItem(): IContentItem {
        throw new Error("Method not implemented.");
    }

    /* ***************************************
     * SELECTOR
     *************************************** */
    
    getItemsByFilter(filterFunction: (contentItem: IContentItem) => boolean): ContentItem[] {
        const result: ContentItem[] = [];
        const next = function (contentItem: ContentItem) {
                for (const iterator of contentItem.contentItems) {
                    if (filterFunction(iterator) === true) {
                        result.push(iterator);
                    }
                    next(iterator);
                }
            };
        next(this);
        return result;
    }

    getItemsById(id: string | string[]): ContentItem[] {
        return this.getItemsByFilter(function (item) {
            if (item.config.id instanceof Array) {
                return indexOf(id, item.config.id) !== -1;
            } else {
                return item.config.id === id;
            }
        });
    }

    getComponentsByName(componentName: string): IContentItem[] {
        let components: Component[] = this._$getItemsByProperty('componentName', componentName) as Component[];
        const instances = [];

        for (let i = 0; i < components.length; i++) {
            instances.push(components[i].instance);
        }

        return instances;
    }

    getItemsByType(type: ContentItemType): IContentItem[] {
        return this._$getItemsByProperty('type', type);
    }

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

    emitBubblingEvent(name: string): void {
        throw new Error("Method not implemented.");
    }

    destroy(): void {
        this._contentItems = [];
    }

    /* ***************************************
     * PACKAGE PRIVATE or PROTECTED
     *************************************** */
    private _$getItemsByProperty(key: string, value: string) {
        return this.getItemsByFilter(function (item: ContentItem | any) {
            return item[key] === value;
        });
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

        this._isInitialised = true;
        this.emitBubblingEvent('itemCreated');
        this.emitBubblingEvent(this.type + 'Created');
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
     * Private method, creates all content items for this node at initialisation time
     * PLEASE NOTE, please see addChild for adding contentItems add runtime
     * @private
     * @param   {ItemConfigType} config
     *
     * @returns {void}
     */
    private _createContentItems(config: ItemConfigType): void {
        if (!(config.content instanceof Array)) {
            throw new ConfigurationError('content must be an Array', config);
        }

        for (let i = 0; i < config.content.length; i++) {
            const contentItem = this._layoutManager.createContentItem(config.content[i], this);
            this.contentItems.push(contentItem);
        }
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
    private _propagateEvent(name: ContentItemEvent, event: BubblingEvent): void {
        if (event instanceof BubblingEvent &&
            event.isPropagationStopped === false &&
            this._isInitialised === true) {

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
    * @param {ContentItemEvent} name the name of the event
    *
    * @private
    * @returns {void}
    */
    private _scheduleEventPropagationToLayoutManager(name: ContentItemEvent, event: BubblingEvent): void {
        if (this._throttledEvents.indexOf(name) === -1) {
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
     * @param {ContentItemEvent} name the name of the event
     *
     * @private
     * @returns {void}
     */
    private _propagateEventToLayoutManager(name: ContentItemEvent, event: BubblingEvent): void {
        this._pendingEventPropagations[name] = false;
        this.layoutManager.emit(name, event);
    }


}