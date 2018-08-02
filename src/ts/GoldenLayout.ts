import LayoutManager from "./interfaces/LayoutManager";
import ContentItem from "./items/ContentItem";
import { ContentArea, BoundFunction, ElementDimensions } from "./interfaces/Commons";
import IContentItem from "./interfaces/IContentItem";

import LayoutConfig from "./config/LayoutConfig";
import defaultConfig from "./config/defaultConfig";
import ItemConfigType, { ItemConfig, ComponentConfig } from "./config/ItemConfigType";

import DropTargetIndicator from "./controls/DropTargetIndicator";
import TransitionIndicator from "./controls/TransitionIndicator";
import BrowserPopout from "./controls/BrowserPopout";
import DragSource from "./controls/DragSource";
import DragSourceControl from "./controls/DragSourceControl";

import EventHub from "./utils/EventHub";
import ConfigMinifier from "./utils/ConfigMinifier";
import EventEmitter from "./utils/EventEmitter";
import ReactComponentHandler from "./utils/ReactComponentHandler";

import GoldenLayoutError from "./errors/GoldenLayoutError";
import ConfigurationError from "./errors/ConfigurationError";

import {
    fnBind,
    getQueryStringParam,
    stripTags,
    objectKeys,
    copy,
    isFunction
} from "./utils/utils";

import {
    findAllStackContainers,
    addChildContentItemsToContainer,
    setLayoutContainer
} from "./utils/layoutFunctions";
import Root from "./items/Root";
import Stack from "./items/Stack";
import RowOrColumn from "./items/RowOrColumn";
import Component from "./items/Component";


export type ItemCreationFunction = () => IContentItem;
//type NewContentItem = Stack | Component | RowOrColumn;

interface ComponentMap {
    [key: string]: any;
}

/**
 * The main class that will be exposed as GoldenLayout.
 *
 * @public
 * @class
 */
export default class GoldenLayout extends EventEmitter implements LayoutManager {

    private _typeToItem: {
        [key: string]: any | typeof Component | typeof Stack;
        'column': any;
        'row': any;
        'stack': typeof Stack;
        'component': typeof Component;
    };

    private _config: LayoutConfig;
    private _width: number;
    private _height: number;
    private _container: JQuery | any;
    private _selectedItem: ContentItem;
    private _root: ContentItem;

    private _components: ComponentMap = {
        'lm-react-component': ReactComponentHandler
    };

    private _isInitialised: boolean = false;
    private _isSubWindow: boolean = false;
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
    private _dragSources: DragSource[] = [];
    private _updatingColumnsResponsive: boolean;
    private _firstLoad: boolean;

    private _itemAreas: ContentArea[];
    private _dragSourceArea: DragSourceControl;

    private _tabDropPlaceholder: JQuery;

    dropTargetIndicator: DropTargetIndicator;
    transitionIndicator: TransitionIndicator;

    get isInitialised(): boolean {
        return this._isInitialised;
    }

    public get root(): ContentItem {
        return this._root;
    }

    get config(): LayoutConfig {
        return this._config;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get isSubWindow(): boolean {
        return this._isSubWindow;
    }

    get openPopouts(): BrowserPopout[] {
        return this._openPopouts;
    }

    get container(): JQuery {
        return this._container;
    }

    get selectedItem(): ContentItem {
        return this._selectedItem;
    }

    set selectedItem(value: ContentItem) {
        this._selectedItem = value;
    }

    get eventHub(): EventHub {
        return this._eventHub;
    }

    get tabDropPlaceholder(): JQuery {
        return this._tabDropPlaceholder;
    }

    /**
     * @param config A GoldenLayout configuration object
     * @param container The DOM element the layout will be initialised in. Default: document.body
     */
    constructor(config: LayoutConfig, container?: HTMLElement | JQuery<HTMLElement>) {

        super();

        if ($ === undefined || $ == null) {
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

        this._itemAreas = [];
        this._dragSourceArea = new DragSourceControl();

        this._width = null;
        this._height = null;
        this._root = null;
        this._openPopouts = [];
        this._selectedItem = null;
        this._isSubWindow = false;
        this._eventHub = new EventHub(this);
        this._config = this._createConfig(config);
        this._container = container;

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

        /**
         * Create or binds jquery container to layout.
         */
        const creation = setLayoutContainer(this.container);
        this._container = creation.jqueryContainer;
        this._isFullPage = creation.isFullPage;

        this.dropTargetIndicator = new DropTargetIndicator(this.container);
        this.transitionIndicator = new TransitionIndicator();
        this.updateSize();
        this._create(this.config);
        this._bindEvents(this._isFullPage);
        this._isInitialised = true;

        this._adjustColumnsResponsive();
        this.emit('initialised');
    }

    registerComponent(name: string, component: any): void {
        if (typeof component !== 'function') {
            throw new GoldenLayoutError('Please register a constructor function');
        }
        if (this._components[name] !== undefined) {
            throw new GoldenLayoutError('Component ' + name + ' is already registered');
        }
        this._components[name] = component;
    }

    getComponent(name: string) {
        if (this._components[name] === undefined) {
            throw new GoldenLayoutError('Unknown component "' + name + '"');
        }
        return this._components[name];
    }

    updateSize(width?: number, height?: number): void {
        if (arguments.length === 2) {
            this._width = width;
            this._height = height;
        } else {
            this._width = this.container.width();
            this._height = this.container.height();
        }

        if (this.isInitialised === true) {
            this.root.callDownwards('setSize', [this._width, this._height]);

            if (this._maximisedItem) {
                this._maximisedItem.element.width(this.container.width());
                this._maximisedItem.element.height(this.container.height());
                this._maximisedItem.callDownwards('setSize');
            }

            this._adjustColumnsResponsive();
        }
    }

    selectItem(contentItem: ContentItem, silent?: boolean): void {
        if (this.config.settings.selectionEnabled !== true) {
            throw new Error('Please set selectionEnabled to true to use this feature');
        }
        if (contentItem === this._selectedItem) {
            return;
        }
        if (this._selectedItem !== null) {
            this._selectedItem.deselect();
        }
        if (contentItem && silent !== true) {
            contentItem.select();
        }
        this._selectedItem = contentItem;
        this.emit('selectionChanged', contentItem);
    }

    createContentItem(itemConfiguration?: ItemConfigType, parent?: ContentItem): ContentItem {
        let typeErrorMsg;

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
        return new itemConstructor(this, itemConfiguration, parent);
    }

    createPopout(configOrContentItem: ItemConfigType | IContentItem,
        dimensions: ElementDimensions, parentId?: string,
        indexInParent?: number): void {
        throw new Error("Method not implemented.");
    }

    createDragSource(element: HTMLElement | JQuery, itemConfiguration: ItemConfigType): DragSource {
        this.config.settings.constrainDragToContainer = false;
        let dragSource = new DragSource($(element), itemConfiguration, this);
        this._dragSources.push(dragSource);
        return dragSource;
    }

    toConfig(rootItem?: ContentItem) {
        if (this.isInitialised === false) {
            throw new Error('Can\'t create config, layout not yet initialized');
        }
        if (rootItem && !(rootItem instanceof ContentItem)) {
            throw new Error('Root must be a ContentItem');
        }
        /*
         * settings & labels
         */
        let config: LayoutConfig = {
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

        if (rootItem) {
            next(config, {
                contentItems: [rootItem]
            });
        } else {
            next(config, this._root);
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

    minifyConfig(config: LayoutConfig): any {
        return (new ConfigMinifier()).minifyConfig(config);
    }

    unminifyConfig(minifiedConfig: any): LayoutConfig {
        return (new ConfigMinifier()).unminifyConfig(minifiedConfig);
    }

    destroy(): void {
        if (this.isInitialised === false) {
            return;
        }
        this._onUnload();
        $(window).off('resize', this._resizeFunction);
        $(window).off('unload beforeunload', this._unloadFunction);
        this._root.callDownwards('_$destroy', [], true);
        this._root.destroy();
        this.tabDropPlaceholder.remove();
        this.dropTargetIndicator.destroy();
        this.transitionIndicator.destroy();
        this._eventHub.destroy();

        for (const iterator of this._dragSources) {
            iterator.destroy();
        }

        this._dragSources = [];
    }

    /* **************************
     * PRIVATE and PROTECTED
     ************************** */

    /**
    * Iterates through the array of open popout windows and removes the ones
    * that are effectively closed. This is necessary due to the lack of reliably
    * listening for window.close / unload events in a cross browser compatible fashion.
    * @package 
    * @returns {void}
    */
    _$reconcilePopoutWindows(): void {
        let _openPopouts: BrowserPopout[] = [];

        for (const iterator of this._openPopouts) {
            if (iterator.getWindow().closed === false) {
                _openPopouts.push(iterator);
            } else {
                this.emit('windowClosed', iterator);
            }
        }
        if (this._openPopouts.length !== _openPopouts.length) {
            this.emit('stateChanged');
            this._openPopouts = _openPopouts;
        }
    }

    /**
     * Takes a contentItem or a configuration and optionally a parent
     * item and returns an initialised instance of the contentItem.
     * If the contentItem is a function, it is first called
     * @package
     * @param   {ContentItem|ItemConfigType|ItemCreationFunction} contentItemOrConfig
     * @param   {ContentItem} parent Only necessary when passing in config
     * @returns {ContentItem} New Content Item
     */
    _$normalizeContentItem(contentItemOrConfig: ItemConfigType | ContentItem | ItemCreationFunction, parent?: ContentItem): ContentItem {
        if (!contentItemOrConfig) {
            throw new Error('No content item defined');
        }

        if (isFunction(contentItemOrConfig)) {
            contentItemOrConfig = (<ItemCreationFunction>contentItemOrConfig)();
        }

        if (contentItemOrConfig instanceof ContentItem) {
            return contentItemOrConfig;
        }

        // if ($.isPlainObject(contentItemOrConfig)) {
        const asConfig = (contentItemOrConfig as ItemConfigType);
        if ($.isPlainObject(asConfig) && asConfig.type) {
            //  && contentItemOrConfig.type

            let newContentItem = this.createContentItem(asConfig, parent);
            newContentItem.callDownwards('_$init');
            return newContentItem;
        } else {
            throw new Error('Invalid contentItem');
        }
    }

    /**
     * Extends the default config with the user specific settings and applies
     * derivations. Please note that there's a separate method (AbstractContentItem._extendItemNode)
     * that deals with the extension of item configs
     * @param   {LayoutConfig} config
     * @returns {LayoutConfig} config
     */
    private _createConfig(config: LayoutConfig): any {
        const windowConfigKey = getQueryStringParam('gl-window');

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
     * Called when the window is closed or the user navigates away
     * from the page
     * @returns {void}
     */
    private _onUnload(): void {
        if (this._config.settings.closePopoutsOnUnload === true) {
            for (const iterator of this._openPopouts) {
                iterator.close();
            }
        }
    }

    /**
     * Debounces resize events
     * @private
     * @returns {void}
     */
    private _onResize(): void {
        clearTimeout(this._resizeTimeoutId);
        this._resizeTimeoutId = setTimeout(fnBind(this.updateSize, this), 100);
    }

    /**
     * Binds to DOM/BOM events on init
     * @private
     * @returns {void}
     */
    private _bindEvents(isFullPage: boolean): void {
        if (isFullPage) {
            $(window).resize(this._resizeFunction);
        }
        $(window).on('unload beforeunload', this._unloadFunction);
    }


    /**
     * Creates Subwindows (if there are any). Throws an error
     * if popouts are blocked.
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
     * This is executed when GoldenLayout detects that it is run
     * within a previously opened popout window.
     * @private
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
     * Kicks of the initial, recursive creation chain
     * @param   {LayoutConfig} config GoldenLayout Config
     * @returns {void}
     */
    private _create(config: LayoutConfig): void {
        let errorMsg: string;

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
        }, this._container);

        this._root.callDownwards('_$init');

        if (config.maximisedItemId === '__glMaximised') {
            this._root.getItemsById(config.maximisedItemId)[0].toggleMaximise();
        }
    }

    /**
     * Adjusts the number of columns to be lower to fit the screen and still maintain minItemWidth.
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
        const columnCount = this.root.contentItems[0].contentItems.length;
        if (columnCount <= 1) {
            return;
        }

        // If they all still fit, do nothing.
        const minItemWidth = this.config.dimensions.minItemWidth;
        const totalMinWidth = columnCount * minItemWidth;
        if (totalMinWidth <= this._width) {
            return;
        }
        // Prevent updates while it is already happening.
        this._updatingColumnsResponsive = true;

        // Figure out how many columns to stack, and put them all in the first stack container.
        const finalColumnCount = Math.max(Math.floor(this._width / minItemWidth), 1);
        const stackColumnCount = columnCount - finalColumnCount;

        const rootContentItem = this.root.contentItems[0];
        const firstStackContainer = findAllStackContainers(this._root)[0];
        for (let i = 0; i < stackColumnCount; i++) {
            // Stack from right.
            let column = rootContentItem.contentItems[rootContentItem.contentItems.length - 1];
            addChildContentItemsToContainer(firstStackContainer, column);
        }

        this._updatingColumnsResponsive = false;
    }

    /**
     * Determines if responsive layout should be used.
     * @returns {boolean} True if responsive layout should be used; otherwise false.
     */
    private _useResponsiveLayout(): boolean {
        return this._config.settings && (this._config.settings.responsiveMode == 'always' || (this._config.settings.responsiveMode == 'onload' && this._firstLoad));
    }

}

export interface GoldenLayoutConstructor {
    /**
     * @param config A GoldenLayout configuration object
     * @param container The DOM element the layout will be initialised in. Default: document.body
     */
    new(configuration: LayoutConfig, container?: HTMLElement | JQuery): GoldenLayout;

}