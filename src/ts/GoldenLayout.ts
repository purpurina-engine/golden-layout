import EventEmitter from './utils/EventEmitter';
import ReactComponentHandler from './utils/ReactComponentHandler';
import ConfigMinifier from './utils/ConfigMinifier';
import EventHub from './utils/EventHub';

import Root from './items/Root';
import RowOrColumn from './items/RowOrColumn';
import Stack from './items/Stack';
import Component from './items/Component';
import ContentItem from './items/ContentItem';

import BrowserPopout from './controls/BrowserPopout';
import DragSource from './controls/DragSource';
import DropTargetIndicator from './controls/DropTargetIndicator';
import TransitionIndicator from './controls/TransitionIndicator';

import ConfigurationError from './errors/ConfigurationError';
import defaultConfig from './config/defaultConfig';

import DragSourceControl from './controls/DragSourceControl';
import Config from './config';

import {
    fnBind,
    objectKeys,
    copy,
    getUniqueId,
    indexOf,
    isFunction,
    stripTags,
    getQueryStringParam,
    isHTMLElement,
} from './utils/utils';
import { ElementDimensions, ContentItemConfigFunction, ContentArea, BoundFunction, } from './Commons';
import ItemConfigType, { ComponentConfig, ItemConfig } from './config/ItemConfigType';

type NewContentItem = Stack | Component | RowOrColumn;


interface ComponentMap {
    [key: string]: any;
}

/**
 * The main class that will be exposed as GoldenLayout.
 *
 * @public
 * @class
 */
export default class GoldenLayout extends EventEmitter {

    private _typeToItem: {
        [key: string]: BoundFunction | typeof Component | typeof Stack;
        'column': any;
        'row': any;
        'stack': typeof Stack;
        'component': typeof Component;
    };

    private _config: Config;
    private _width: number;
    private _height: number;
    private _container: JQuery
    private _selectedItem: ContentItem;
    private _root: ContentItem;

    private _components: ComponentMap = {
        'lm-react-component': ReactComponentHandler
    };

    private _isInitialized: boolean = false;
    private _isSubWindow: boolean;
    private _openPopouts: BrowserPopout[];
    private _eventHub: EventHub;

    private _isFullPage: boolean = false;
    private _resizeTimeoutId: any = null;

    private _resizeFunction: BoundFunction;
    private _unloadFunction: BoundFunction;
    private _maximisedItem: ContentItem;
    private _maximisePlaceholder: JQuery;
    private _creationTimeoutPassed: boolean;
    private _subWindowsCreated: boolean;
    private _dragSources: any[] = [];
    private _updatingColumnsResponsive: boolean;
    private _firstLoad: boolean;

    private _itemAreas: ContentArea[] = [];
    private _dragSourceArea: DragSourceControl = new DragSourceControl();

    private _tabDropPlaceholder: JQuery;

    dropTargetIndicator: DropTargetIndicator;
    transitionIndicator: TransitionIndicator;


    public get tabDropPlaceholder(): JQuery {
        return this._tabDropPlaceholder;
    }

    /**
     * True once the layout item tree has been created and the initialised event has been fired
     */
    get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * The topmost item in the layout item tree. In browser terms: Think of the GoldenLayout instance as window
     * object and of goldenLayout.root as the document.
     */
    public get root(): ContentItem {
        return this._root;
    }

    /**
    * A reference to the current, extended top level config.
    *
    * Don't rely on this object for state saving / serialisation. Use layout.toConfig() instead.
    */
    get config(): Config {
        return this._config;
    }

    /**
     * The current outer width of the layout in pixels.
     */
    get width(): number {
        return this._width;
    }

    /**
     * The current outer height of the layout in pixels.
     */
    get height(): number {
        return this._height;
    }

    /**
     * True if the layout has been opened as a popout by another layout.
     */
    get isSubWindow(): boolean {
        return this._isSubWindow;
    }

    /**
     * An array of BrowserWindow instances
     */
    get openPopouts(): BrowserPopout[] {
        return this._openPopouts;
    }

    /**
     * A reference to the (jQuery) DOM element containing the layout
     */
    get container(): JQuery {
        return this._container;
    }

    /**
     * The currently selected item or null if no item is selected. Only relevant if settings.selectionEnabled is set
     * to true.
     */
    get selectedItem(): ContentItem {
        return this._selectedItem;
    }

    set selectedItem(value: ContentItem) {
        this._selectedItem = value;
    }

    /**
     * A singleton instance of EventEmitter that works across windows
     */
    get eventHub(): EventHub {
        return this._eventHub;
    }

    /**
     * @param config A GoldenLayout configuration object
     * @param container The DOM element the layout will be initialised in. Default: document.body
     */
    constructor(config: Config, container?: HTMLElement | JQuery<HTMLElement>) {

        super();

        if (!$) {
            let errorMsg = 'jQuery is missing as dependency for GoldenLayout. ';
            errorMsg += 'Please either expose $ on GoldenLayout\'s scope (e.g. window) or add "jquery" to ';
            errorMsg += 'your paths when using RequireJS/AMD';
            throw new Error(errorMsg);
        }

        this._resizeFunction = fnBind(this._onResize, this);
        this._unloadFunction = fnBind(this._onUnload, this);
        this._maximisedItem = null;
        this._maximisePlaceholder = $('<div class="lm_maximise_place"></div>');
        this._creationTimeoutPassed = false;
        this._subWindowsCreated = false;
        this._dragSources = [];
        this._updatingColumnsResponsive = false;
        this._firstLoad = true;

        this._width = null;
        this._height = null;
        this._root = null;
        this._openPopouts = [];
        this._selectedItem = null;
        this._isSubWindow = false;
        this._eventHub = new EventHub(this);
        this._config = this._createConfig(config);

        if (container !== undefined) {
            if (isHTMLElement(container)) {
                this._container = $(container);
            } else {
                this._container = container;
            }
        }

        this.dropTargetIndicator = null;
        this.transitionIndicator = null;
        this._tabDropPlaceholder = $('<div class="lm_drop_tab_placeholder"></div>');

        if (this._isSubWindow) {
            $('body').css('visibility', 'hidden');
        }

        this._typeToItem = {
            'column': fnBind(RowOrColumn, this, true),
            'row': fnBind(RowOrColumn, this, false),
            'stack': Stack,
            'component': Component
        };


    }

    /**
     * Takes a GoldenLayout configuration object and
     * replaces its keys and values recursively with
     * one letter codes
     *
     * @static
     * @public
     * @param   {Config} config A GoldenLayout config object
     *
     * @returns {Object} minified config
     */
    static minifyConfig(config: Config): any {
        return (new ConfigMinifier()).minifyConfig(config);
    }

    /**
     * Takes a configuration Object that was previously minified
     * using minifyConfig and returns its original version
     *
     * @static
     * @public
     * @param   {Config} minifiedConfig
     *
     * @returns {Config} the original configuration
     */
    static unminifyConfig(config: any): Config {
        return (new ConfigMinifier()).unminifyConfig(config);
    }



    /**
     * Register a component with the layout manager. If a configuration node
     * of type component is reached it will look up componentName and create the
     * associated component
     *
     *  {
     *    type: "component",
     *    componentName: "EquityNewsFeed",
     *    componentState: { "feedTopic": "us-bluechips" }
     *  }
     *
     * @public
     * @param   {string} name
     * @param   {any} constructor
     *
     * @returns {void}
     */
    registerComponent(name: string, constructor: any): void {
        if (typeof constructor !== 'function') {
            throw new Error('Please register a constructor function');
        }

        if (this._components[name] !== undefined) {
            throw new Error('Component ' + name + ' is already registered');
        }

        this._components[name] = constructor;
    }

    /**
     * Creates a layout configuration object based on the the current state
     *
     * @public
     * @returns {Config} GoldenLayout configuration
     */
    toConfig(root?: ContentItem): any {
        if (this.isInitialized === false) {
            throw new Error('Can\'t create config, layout not yet initialized');
        }

        if (root && !(root instanceof ContentItem)) {
            throw new Error('Root must be a ContentItem');
        }

        /*
         * settings & labels
         */
        let config: Config = {
            settings: copy({}, this.config.settings),
            dimensions: copy({}, this.config.dimensions),
            labels: copy({}, this.config.labels),
            content: [],
            openPopouts: [],
            maximisedItemId: null
        };

        /*
         * Content
         */
        let next: (configNode: any, item: { config?: ItemConfigType, contentItems: ContentItem[] }) => void;
        next = function (configNode, item) {
            for (let key in item.config) {
                if (key !== 'content') {
                    configNode[key] = item.config[key];
                }
            }

            if (item.contentItems.length) {
                configNode.content = [];

                for (let i = 0; i < item.contentItems.length; i++) {
                    configNode.content[i] = {};
                    next(configNode.content[i], item.contentItems[i]);
                }
            }
        };

        if (root) {
            next(config, {
                contentItems: [root]
            });
        } else {
            next(config, this.root);
        }

        /*
         * Retrieve config for subwindows
         */
        this._$reconcilePopoutWindows();
        for (let i = 0; i < this._openPopouts.length; i++) {
            config.openPopouts.push(this._openPopouts[i].toConfig());
        }

        /*
         * Add maximised item
         */
        config.maximisedItemId = this._maximisedItem ? '__glMaximised' : null;
        return config;
    }

    /**
     * Returns a previously registered component
     *
     * @public
     * @param   {string} name The name used
     *
     * @returns {any}
     */
    getComponent(name: string): any {
        if (this._components[name] === undefined) {
            throw new ConfigurationError('Unknown component "' + name + '"');
        }

        return this._components[name];
    }

    /**
     * Creates the actual layout. Must be called after all initial components
     * are registered. Recurses through the configuration and sets up
     * the item tree.
     *
     * If called before the document is ready it adds itself as a listener
     * to the document.ready event
     *
     * @public
     *
     * @returns {void}
     */
    init(): void {

        /**
         * Create the popout windows straight away. If popouts are blocked
         * an error is thrown on the same 'thread' rather than a timeout and can
         * be caught. This also prevents any further initilisation from taking place.
         */
        if (this._subWindowsCreated === false) {
            this._createSubWindows();
            this._subWindowsCreated = true;
        }

        /**
         * If the document isn't ready yet, wait for it.
         */
        if (document.readyState === 'loading' || document.body === null) {
            $(document).ready(fnBind(this.init, this));
            return;
        }

        /**
         * If this is a subwindow, wait a few milliseconds for the original
         * page's js calls to be executed, then replace the bodies content
         * with GoldenLayout
         */
        if (this._isSubWindow === true && this._creationTimeoutPassed === false) {
            setTimeout(fnBind(this.init, this), 7);
            this._creationTimeoutPassed = true;
            return;
        }

        if (this._isSubWindow === true) {
            this._adjustToWindowMode();
        }

        this._setContainer();
        this.dropTargetIndicator = new DropTargetIndicator(this.container);
        this.transitionIndicator = new TransitionIndicator();
        this.updateSize();
        this._create(this.config);
        this._bindEvents();
        this._isInitialized = true;
        this._adjustColumnsResponsive();
        this.emit('initialised');
    }

    /**
     * Updates the layout managers size
     *
     * @public
     * @param   {number} width  _height in pixels
     * @param   {number} height _width in pixels
     *
     * @returns {void}
     */
    updateSize(width?: number, height?: number): void {
        if (arguments.length === 2) {
            this._width = width;
            this._height = height;
        } else {
            this._width = this.container.width();
            this._height = this.container.height();
        }

        if (this.isInitialized === true) {
            this.root.callDownwards('setSize', [this._width, this._height]);

            if (this._maximisedItem) {
                this._maximisedItem.element.width(this.container.width());
                this._maximisedItem.element.height(this.container.height());
                this._maximisedItem.callDownwards('setSize');
            }

            this._adjustColumnsResponsive();
        }
    }

    /**
     * Destroys the LayoutManager instance itself as well as every ContentItem
     * within it. After this is called nothing should be left of the LayoutManager.
     *
     * @public
     * @returns {void}
     */
    destroy(): void {
        if (this.isInitialized === false) {
            return;
        }
        this._onUnload();
        $(window).off('resize', this._resizeFunction);
        $(window).off('unload beforeunload', this._unloadFunction);
        this.root.callDownwards('_$destroy', [], true);
        this.root.destroy();//contentItems = [];
        this.tabDropPlaceholder.remove();
        this.dropTargetIndicator.destroy();
        this.transitionIndicator.destroy();
        this._eventHub.destroy();

        this._dragSources.forEach(function (dragSource) {
            dragSource._dragListener.destroy();
            dragSource._element = null;
            dragSource._itemConfig = null;
            dragSource._dragListener = null;
        });
        this._dragSources = [];
    }



    /**
    * Creates a new content item or tree of content items from configuration. Usually you wouldn't call this
    * directly, but instead use methods like layout.createDragSource(), item.addChild() or item.replaceChild() that
    * all call this method implicitly.
    * @param itemConfiguration An item configuration (can be an entire tree of items)
    * @param parent A parent item
    * @returns {ContentItem}
    */
    createContentItem(itemConfiguration?: ItemConfigType, parent?: ContentItem): NewContentItem {
        let typeErrorMsg, contentItem;

        if (typeof itemConfiguration.type !== 'string') {
            throw new ConfigurationError('Missing parameter \'type\'', itemConfiguration);
        }

        if (itemConfiguration.type === 'react-component') {
            itemConfiguration.type = 'component';
            (itemConfiguration as ComponentConfig).componentName = 'lm-react-component';
        }

        if (!this._typeToItem[itemConfiguration.type]) {
            typeErrorMsg = 'Unknown type \'' + itemConfiguration.type + '\'. ' +
                'Valid types are ' + objectKeys(this._typeToItem).join(',');

            throw new ConfigurationError(typeErrorMsg);
        }


        /**
         * We add an additional stack around every component that's not within a stack anyways.
         */
        if (
            // If this is a component
            itemConfiguration.type === 'component' &&

            // and it's not already within a stack
            !(parent instanceof Stack) &&

            // and we have a parent
            !!parent &&

            // and it's not the topmost item in a new window
            !(this._isSubWindow === true && parent instanceof Root)
        ) {
            const itemConfig: ItemConfig = {
                type: 'stack',
                width: itemConfiguration.width,
                height: itemConfiguration.height,
                content: [itemConfiguration]
            };

            itemConfiguration = itemConfig;
        }

        const itemConstructor = this._typeToItem[itemConfiguration.type];
        contentItem = new itemConstructor(this, itemConfiguration, parent);

        return contentItem;
    }

    /**
     * Creates a popout window with the specified content and dimensions
     *
     * @param   {any|ContentItem} configOrContentItem
     * @param   {ElementDimensions} dimensions A map with width, height, left and top
     * @param   {string} parentId the id of the element this item will be appended to
     *                             when popIn is called
     * @param   {number} indexInParent The position of this item within its parent element
     
     * @returns {BrowserPopout}
     */
    createPopout(configOrContentItem: ContentItem | ItemConfigType | any[], dimensions?: ElementDimensions, parentId?: string, indexInParent?: number): BrowserPopout {
        let config: ItemConfigType;
        let self = this;
        let windowLeft: number,
            windowTop: number;
        let offset: any;
        let parent: ContentItem,
            child: ContentItem;
        let browserPopout: BrowserPopout;

        parentId = parentId || null;
        const isItem = configOrContentItem instanceof ContentItem;

        if (isItem) {
            config = this.toConfig(<ContentItem>configOrContentItem).content;
            parentId = getUniqueId();

            /**
             * If the item is the only component within a stack or for some
             * other reason the only child of its parent the parent will be destroyed
             * when the child is removed.
             *
             * In order to support this we move up the tree until we find something
             * that will remain after the item is being popped out
             */
            parent = (<ContentItem>configOrContentItem).parent;
            child = <ContentItem>configOrContentItem;
            while (parent.contentItems.length === 1 && !parent.isRoot) {
                parent = parent.parent;
                child = child.parent;
            }

            parent.addId(parentId);
            if (isNaN(indexInParent)) {
                indexInParent = indexOf(child, parent.contentItems);
            }


        } else {
            // if (!(config instanceof Array)) {
            //     config = [config];
            // }
        }


        if (!dimensions && isItem) {
            windowLeft = window.screenX || window.screenLeft;
            windowTop = window.screenY || window.screenTop;
            offset = (<ContentItem>configOrContentItem).element.offset();

            dimensions = {
                left: windowLeft + offset.left,
                top: windowTop + offset.top,
                width: (<ContentItem>configOrContentItem).element.width(),
                height: (<ContentItem>configOrContentItem).element.height()
            };
        }

        if (!dimensions && !isItem) {
            dimensions = {
                left: window.screenX || window.screenLeft + 20,
                top: window.screenY || window.screenTop + 20,
                width: 500,
                height: 309
            };
        }

        if (isItem) {
            (<ContentItem>configOrContentItem).remove();
        }

        browserPopout = new BrowserPopout(config, dimensions, parentId, indexInParent, this);

        browserPopout.on('initialised', function () {
            self.emit('windowOpened', browserPopout);
        });

        browserPopout.on('closed', function () {
            self._$reconcilePopoutWindows();
        });

        this._openPopouts.push(browserPopout);

        return browserPopout;
    }

    /**
     * Attaches DragListener to any given DOM element
     * and turns it into a way of creating new ContentItems
     * by 'dragging' the DOM element into the layout
     *
     * @param   {JQuery|HTMLElement} element
     * @param   {Object|Function} itemConfig for the new item to be created, or a function which will provide it
     *
     * @returns {DragSource}
     */
    createDragSource(element: HTMLElement | JQuery, itemConfiguration: ItemConfigType): DragSource {
        this.config.settings.constrainDragToContainer = false;
        let dragSource = new DragSource($(element), itemConfiguration, this);
        this._dragSources.push(dragSource);

        return dragSource;
    }

    /**
     * Programmatically selects an item. This deselects
     * the currently selected item, selects the specified item
     * and emits a selectionChanged event
     *
     * @param   {AbstractContentItem} contentItem#
     * @param   {boolean} silent Wheather to notify the item of its selection
     * @event    selectionChanged
     *
     * @returns {VOID}
     */
    selectItem(contentItem: ContentItem, silent?: boolean): void {

        if (this.config.settings.selectionEnabled !== true) {
            throw new Error('Please set selectionEnabled to true to use this feature');
        }

        if (contentItem === this.selectedItem) {
            return;
        }

        if (this.selectedItem !== null) {
            this.selectedItem.deselect();
        }

        if (contentItem && silent !== true) {
            contentItem.select();
        }

        this._selectedItem = contentItem;

        this.emit('selectionChanged', contentItem);
    }

    /*************************
     * PACKAGE PRIVATE
     *************************/

    _$maximiseItem(contentItem: ContentItem): void {
        if (this._maximisedItem !== null) {
            this._$minimiseItem(this._maximisedItem);
        }
        this._maximisedItem = contentItem;

        this._maximisedItem.addId('__glMaximised');
        contentItem.element.addClass('lm_maximised');
        contentItem.element.after(this._maximisePlaceholder);
        this.root.element.prepend(contentItem.element);

        contentItem.element.width(this.container.width());
        contentItem.element.height(this.container.height());

        contentItem.callDownwards('setSize');
        this._maximisedItem.emit('maximised');

        this.emit('stateChanged');
    }

    _$minimiseItem(contentItem: ContentItem): void {
        contentItem.element.removeClass('lm_maximised');
        contentItem.removeId('__glMaximised');

        this._maximisePlaceholder.after(contentItem.element);
        this._maximisePlaceholder.remove();

        contentItem.parent.callDownwards('setSize');

        this._maximisedItem = null;
        contentItem.emit('minimised');
        this.emit('stateChanged');
    }

    /**
     * This method is used to get around sandboxed iframe restrictions.
     * If 'allow-top-navigation' is not specified in the iframe's 'sandbox' attribute
     * (as is the case with codepens) the parent window is forbidden from calling certain
     * methods on the child, such as window.close() or setting document.location.href.
     *
     * This prevented GoldenLayout popouts from popping in in codepens. The fix is to call
     * _$closeWindow on the child window's gl instance which (after a timeout to disconnect
     * the invoking method from the close call) closes itself.
     *
     * @packagePrivate
     *
     * @returns {void}
     */
    _$closeWindow(): void {
        window.setTimeout(function () {
            window.close();
        }, 1);
    }

    private _$intersectsArea(x: number, y: number, smallestSurface: number, area: ContentArea): boolean {
        if (
            x > area.x1 &&
            x < area.x2 &&
            y > area.y1 &&
            y < area.y2 &&
            smallestSurface > area.surface) {
            return true;
        }

        return false;
    }

    _$getArea(x: number, y: number): ContentArea {
        let smallestSurface = Infinity,
            matchingArea = null;

        if (this._dragSourceArea.hasArea) {
            if (this._$intersectsArea(x, y, smallestSurface, this._dragSourceArea.fullArea)) {
                smallestSurface = this._dragSourceArea.fullArea.surface;
                return this._dragSourceArea.fullArea;
            }
        }

        for (const area of this._itemAreas) {
            if (this._$intersectsArea(x, y, smallestSurface, area)) {
                smallestSurface = area.surface;
                matchingArea = area;
            }
        }
        return matchingArea;
    }

    _$createRootItemAreas(rootArea: ContentArea): void {
        const areaSize = 50;
        let sides: any = {
            y2: 0,
            x2: 0,
            y1: 'y2',
            x1: 'x2'
        };
        for (let side in sides) {
            let area = rootArea
            area.side = side;
            if (sides[side]) {
                area[side] = area[sides[side]] - areaSize;
            } else {
                area[side] = areaSize;
            }
            area.surface = (area.x2 - area.x1) * (area.y2 - area.y1);
            this._itemAreas.push(area);
        }
    }

    _$computeHeaderArea(area: ContentArea): ContentArea {
        let header: ContentArea = {};
        copy(header, area);
        copy(header, area.contentItem._contentAreaDimensions.header.highlightArea);
        header.surface = (header.x2 - header.x1) * (header.y2 - header.y1);
        return header;
    }

    _$calculateItemAreas(ignoreContentItem?: ContentItem): void {

        const allContentItems = this._getAllContentItems();
        let areas: ContentArea[] = [];
        //this._itemAreas = [];

        /**
         * If the last item is dragged out, highlight the entire container size to
         * allow to re-drop it. allContentItems[ 0 ] === this.root at this point
         *
         * Don't include root into the possible drop areas though otherwise since it
         * will used for every gap in the layout, e.g. splitters
         */
        const rootArea = this.root._$getArea();
        if (allContentItems.length === 1) {
            areas.push(rootArea);
            this._itemAreas = areas;
            return;
        }

        this._$createRootItemAreas(rootArea);

        let countAreas = 0;
        let myArea = null,
            myHeader = null;

        for (const current of allContentItems) {
            if (!(current.isStack)) {
                continue;
            }

            const area = current._$getArea();

            if (area === null) {
                continue;
            }

            countAreas++;

            if (ignoreContentItem && ignoreContentItem === current) {
                myArea = area;
                myHeader = this._$computeHeaderArea(area);
            } else {
                if (area instanceof Array) {
                    areas = areas.concat(area);
                } else {
                    areas.push(area);
                    areas.push(this._$computeHeaderArea(area));
                }
            }
        }


        this._dragSourceArea.clear();

        if (countAreas === 1 && ignoreContentItem === undefined) {
            areas.push(myArea);
            areas.push(this._$computeHeaderArea(myHeader));
        } else {
            this._dragSourceArea.set(myArea, myHeader, ignoreContentItem);
        }

        this._itemAreas = areas;

    }

    /**
     * Takes a contentItem or a configuration and optionally a parent
     * item and returns an initialised instance of the contentItem.
     * If the contentItem is a function, it is first called
     *
     * @packagePrivate
     *
     * @param   {ContentItem|Object|Function} contentItemOrConfig
     * @param   {ContentItem} parent Only necessary when passing in config
     *
     * @returns {ContentItem}
     */
    _$normalizeContentItem(contentItemOrConfig: ItemConfigType | ContentItemConfigFunction | ContentItem, parent?: ContentItem): ContentItem {
        if (!contentItemOrConfig) {
            throw new Error('No content item defined');
        }

        if (isFunction(contentItemOrConfig)) {
            contentItemOrConfig = (<ContentItemConfigFunction>contentItemOrConfig)();
        }

        if (contentItemOrConfig instanceof ContentItem) {
            return contentItemOrConfig;
        }

        // if ($.isPlainObject(contentItemOrConfig)) {
        const isConfig = (contentItemOrConfig as ItemConfigType);
        if (isConfig) {
            //  && contentItemOrConfig.type
            let newContentItem = this.createContentItem(isConfig, parent);
            newContentItem.callDownwards('_$init');
            return newContentItem;
        } else {
            throw new Error('Invalid contentItem');
        }
    }

    /**
     * Iterates through the array of open popout windows and removes the ones
     * that are effectively closed. This is necessary due to the lack of reliably
     * listening for window.close / unload events in a cross browser compatible fashion.
     *
     * @packagePrivate
     *
     * @returns {void}
     */
    _$reconcilePopoutWindows() {
        let _openPopouts = [],
            i;

        for (i = 0; i < this._openPopouts.length; i++) {
            if (this._openPopouts[i].getWindow().closed === false) {
                _openPopouts.push(this._openPopouts[i]);
            } else {
                this.emit('windowClosed', this._openPopouts[i]);
            }
        }

        if (this._openPopouts.length !== _openPopouts.length) {
            this.emit('stateChanged');
            this._openPopouts = _openPopouts;
        }

    }

    /***************************
     * PRIVATE
     ***************************/
    /**
     * Returns a flattened array of all content items,
     * regardles of level or type
     *
     * @private
     *
     * @returns {void}
     */
    private _getAllContentItems(): ContentItem[] {
        let allContentItems: ContentItem[] = [];

        let addChildren = function (contentItem: ContentItem) {
            allContentItems.push(contentItem);

            if (contentItem.contentItems instanceof Array) {
                for (let i = 0; i < contentItem.contentItems.length; i++) {
                    addChildren(contentItem.contentItems[i]);
                }
            }
        };

        addChildren(this.root);

        return allContentItems;
    }

    /**
     * Binds to DOM/BOM events on init
     *
     * @private
     *
     * @returns {void}
     */
    private _bindEvents(): void {
        if (this._isFullPage) {
            $(window).resize(this._resizeFunction);
        }
        $(window).on('unload beforeunload', this._unloadFunction);
    }

    /**
     * Debounces resize events
     *
     * @private
     *
     * @returns {void}
     */
    private _onResize(): void {
        clearTimeout(this._resizeTimeoutId);
        this._resizeTimeoutId = setTimeout(fnBind(this.updateSize, this), 100);
    }

    /**
     * Extends the default config with the user specific settings and applies
     * derivations. Please note that there's a separate method (AbstractContentItem._extendItemNode)
     * that deals with the extension of item configs
     *
     * @param   {Config} config
     * @static
     * @returns {Config} config
     */
    private _createConfig(config: Config): any {
        let windowConfigKey = getQueryStringParam('gl-window');

        if (windowConfigKey) {
            this._isSubWindow = true;
            const json = localStorage.getItem(windowConfigKey);
            config = JSON.parse(json);
            config = (new ConfigMinifier()).unminifyConfig(config);
            localStorage.removeItem(windowConfigKey);
        }

        config = $.extend(true, {}, defaultConfig, config);

        let nextNode = function (node: any) {
            for (let key in node) {
                if (key !== 'props' && typeof node[key] === 'object') {
                    nextNode(node[key]);
                } else if (key === 'type' && node[key] === 'react-component') {
                    node.type = 'component';
                    node.componentName = 'lm-react-component';
                }
            }
        }

        nextNode(config);

        if (config.settings.hasHeaders === false) {
            config.dimensions.headerHeight = 0;
        }

        return config;
    }

    /**
     * This is executed when GoldenLayout detects that it is run
     * within a previously opened popout window.
     *
     * @private
     *
     * @returns {void}
     */
    private _adjustToWindowMode(): void {
        let popInButton = $('<div class="lm_popin" title="' + this.config.labels.popin + '">' +
            '<div class="lm_icon"></div>' +
            '<div class="lm_bg"></div>' +
            '</div>');

        popInButton.click(fnBind(function (this: GoldenLayout) {
            this.emit('popIn');
        }, this));

        document.title = stripTags(this.config.content[0].title);

        $('head').append($('body link, body style, template, .gl_keep'));

        this._container = $('body')
            .html('')
            .css('visibility', 'visible')
            .append(popInButton);

        /*
         * This seems a bit pointless, but actually causes a reflow/re-evaluation getting around
         * slickgrid's "Cannot find stylesheet." bug in chrome
         */
        // let x = document.body.offsetHeight; // jshint ignore:line

        /*
         * Expose this instance on the window object
         * to allow the opening window to interact with
         * it
         */
        window.__glInstance = this;
    }

    /**
     * Creates Subwindows (if there are any). Throws an error
     * if popouts are blocked.
     *
     * @returns {void}
     */
    private _createSubWindows(): void {

        if (this._config.openPopouts === undefined)
            return;

        for (const popout of this._config.openPopouts) {
            this.createPopout(
                popout.content,
                popout.dimensions,
                popout.parentId,
                popout.indexInParent
            );
        }

    }

    /**
     * Determines what element the layout will be created in
     *
     * @private
     *
     * @returns {void}
     */
    private _setContainer() {
        let container: JQuery;

        if (this.container) {
            container = $(this.container);
        } else {
            container = $('body');
        }

        if (container.length === 0) {
            throw new Error('GoldenLayout container not found');
        }

        if (container.length > 1) {
            throw new Error('GoldenLayout more than one container element specified');
        }

        if (container[0] === document.body) {
            this._isFullPage = true;

            $('html, body').css({
                _height: '100%',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            });
        }

        this._container = container;
    }

    /**
     * Kicks of the initial, recursive creation chain
     *
     * @param   {Object} config GoldenLayout Config
     *
     * @returns {void}
     */
    private _create(config: Config): void {
        let errorMsg;

        if (!(config.content instanceof Array)) {
            if (config.content === undefined) {
                errorMsg = 'Missing setting \'content\' on top level of configuration';
            } else {
                errorMsg = 'Configuration parameter \'content\' must be an array';
            }

            throw new ConfigurationError(errorMsg, config);
        }

        if (config.content.length > 1) {
            errorMsg = 'Top level content can\'t contain more then one element.';
            throw new ConfigurationError(errorMsg, config);
        }

        this._root = new Root(this, {
            type: 'root',
            content: config.content
        }, this.container);
        this.root.callDownwards('_$init');

        if (config.maximisedItemId === '__glMaximised') {
            this.root.getItemsById(config.maximisedItemId)[0].toggleMaximize();
        }
    }

    /**
     * Called when the window is closed or the user navigates away
     * from the page
     *
     * @returns {void}
     */
    private _onUnload(): void {
        if (this.config.settings.closePopoutsOnUnload === true) {
            for (let i = 0; i < this._openPopouts.length; i++) {
                this._openPopouts[i].close();
            }
        }
    }

    /**
     * Adjusts the number of columns to be lower to fit the screen and still maintain minItemWidth.
     *
     * @returns {void}
     */
    private _adjustColumnsResponsive(): void {
        // If there is no min _width set, or not content items, do nothing.
        if (!this._useResponsiveLayout() || this._updatingColumnsResponsive || !this.config.dimensions || !this.config.dimensions.minItemWidth || this.root.contentItems.length === 0 || !this.root.contentItems[0].isRow) {
            this._firstLoad = false;
            return;
        }

        this._firstLoad = false;

        // If there is only one column, do nothing.
        let columnCount = this.root.contentItems[0].contentItems.length;
        if (columnCount <= 1) {
            return;
        }

        // If they all still fit, do nothing.
        let minItemWidth = this.config.dimensions.minItemWidth;
        let totalMinWidth = columnCount * minItemWidth;
        if (totalMinWidth <= this._width) {
            return;
        }

        // Prevent updates while it is already happening.
        this._updatingColumnsResponsive = true;

        // Figure out how many columns to stack, and put them all in the first stack container.
        let finalColumnCount = Math.max(Math.floor(this._width / minItemWidth), 1);
        let stackColumnCount = columnCount - finalColumnCount;

        let rootContentItem = this.root.contentItems[0];
        let firstStackContainer = this._findAllStackContainers()[0];
        for (let i = 0; i < stackColumnCount; i++) {
            // Stack from right.
            let column = rootContentItem.contentItems[rootContentItem.contentItems.length - 1];
            this._addChildContentItemsToContainer(firstStackContainer, column);
        }

        this._updatingColumnsResponsive = false;
    }

    /**
     * Determines if responsive layout should be used.
     *
     * @returns {boolean} - True if responsive layout should be used; otherwise false.
     */
    private _useResponsiveLayout(): boolean {
        return this.config.settings && (this.config.settings.responsiveMode == 'always' || (this.config.settings.responsiveMode == 'onload' && this._firstLoad));
    }

    /**
     * Adds all children of a node to another container recursively.
     * @param {ContentItem} container - Container to add child content items to.
     * @param {ContentItem} node - Node to search for content items.
     * @returns {void}
     */
    private _addChildContentItemsToContainer(container: ContentItem, node: ContentItem): void {
        if (node.type === 'stack') {
            for (const iterator of node.contentItems) {
                container.addChild(iterator);
                node.removeChild(iterator, true);
            }
        } else {
            for (const iterator of node.contentItems) {
                this._addChildContentItemsToContainer(container, iterator);
            }
        }
    }

    /**
     * Finds all the stack containers.
     * @returns {Stack[]} - The found stack containers.
     */
    private _findAllStackContainers(): Stack[] {
        let stackContainers: Stack[] = [];
        this._findAllStackContainersRecursive(stackContainers, this.root);

        return stackContainers;
    }

    /**
     * Finds all the stack containers.
     *
     * @param {ContentItem[]} - Set of containers to populate.
     * @param {ContentItem} - Current node to process.
     *
     * @returns {void}
     */
    private _findAllStackContainersRecursive(stackContainers: ContentItem[], node: ContentItem): void {

        for (const item of node.contentItems) {
            if (item.type == 'stack') {
                stackContainers.push(item);
            } else if (!item.isComponent) {
                this._findAllStackContainersRecursive(stackContainers, item);
            }
        }
    }
}

/**
 * Hook that allows to access private classes
 */
// LayoutManager.__lm = lm;
