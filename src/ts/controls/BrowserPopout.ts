import IBrowserPopout, { BrowserPopoutConfig } from '../interfaces/IBrowserPopout';
import { ElementDimensions } from '../interfaces/Commons';

import EventEmitter from '../events/EventEmitter';

import GoldenLayoutError from '../errors/GoldenLayoutError';
import LayoutManager from '../LayoutManager';
import { ItemConfig } from '../config/ItemConfigType';
import ContentItem from '../items/ContentItem';

import {
    fnBind,
} from '../utils/utils'

import { createUrl } from '../utils/itemFunctions';
import { closeWindow } from '../utils/layoutFunctions';


/**
 * Pops a content item out into a new browser window.
 * This is achieved by
 *
 *    - Creating a new configuration with the content item as root element
 *    - Serializing and minifying the configuration
 *    - Opening the current window's URL with the configuration as a GET parameter
 *    - GoldenLayout when opened in the new window will look for the GET parameter
 *      and use it instead of the provided configuration
 */
export default class BrowserPopout extends EventEmitter implements IBrowserPopout {

    private _isInitialised: boolean;

    private _config: ItemConfig;
    private _dimensions: ElementDimensions;
    private _parentId: string;
    private _indexInParent: number;
    private _layoutManager: LayoutManager;
    private _popoutWindow: Window;
    private _id: number;

    public get id(): number {
        return this._id;
    }

    public get isInitialised(): boolean {
        return this._isInitialised;
    }

    /**
     * Creates a content item out into a new browser window.
     * 
     * @param config GoldenLayout item config
     * @param dimensions  A map with width, height, top and left
     * @param parentId The id of the element the item will be appended to on popIn
     * @param indexInParent The position of this element within its parent
     * @param layoutManager Reference ti LayoutManager
     */
    constructor(config: ItemConfig, dimensions: ElementDimensions, parentId: string, indexInParent: number, layoutManager: LayoutManager) {

        super();

        this._isInitialised = false;

        this._config = config;
        this._dimensions = dimensions;
        this._parentId = parentId;
        this._indexInParent = indexInParent;
        this._layoutManager = layoutManager;
        this._popoutWindow = null;
        this._id = null;
        this._createWindow();
    }

    /**
     * Creates a window configuration object from the Popout.
     */
    toConfig(): BrowserPopoutConfig {
        if (this._isInitialised === false) {
            throw new Error('Can\'t create config, layout not yet initialized');
        }
        const config: BrowserPopoutConfig = {
            dimensions: {
                width: this.getGlInstance().width,
                height: this.getGlInstance().height,
                left: this._popoutWindow.screenX || this._popoutWindow.screenLeft,
                top: this._popoutWindow.screenY || this._popoutWindow.screenTop
            },
            content: this.getGlInstance().toConfig().content,
            parentId: this._parentId,
            indexInParent: this._indexInParent
        };
        return config;
    }

    /**
     * Returns the GoldenLayout instance from the child window
     */
    getGlInstance(): LayoutManager {
        return this._popoutWindow.__glInstance as LayoutManager;
    }

    /**
     * Returns the native Window object
     */
    getWindow(): Window {
        return this._popoutWindow;
    }

    /**
     * Closes the popout
     */
    close(): void {
        if (this.getGlInstance()) {
            closeWindow();
        } else {
            try {
                this.getWindow().close();
            } catch (e) {
                //
            }
        }
    }

    /**
     * Returns the popped out item to its original position. If the original
     * parent isn't available anymore it falls back to the layout's topmost element
     */
    popIn(): void {
        let childConfig: ItemConfig,
            parentItem: ContentItem;
        //index = this._indexInParent;

        if (this._parentId) {

            /*
             * The $.extend call seems a bit pointless, but it's crucial to
             * copy the config returned by this.getGlInstance().toConfig()
             * onto a new object. Internet Explorer keeps the references
             * to objects on the child window, resulting in the following error
             * once the child window is closed:
             *
             * The callee (server [not server application]) is not available and disappeared
             */
            childConfig = $.extend(true, {}, this.getGlInstance().toConfig()).content[0];
            parentItem = this._layoutManager.root.getItemsById(this._parentId)[0];

            /*
             * Fallback if parentItem is not available. Either add it to the topmost
             * item or make it the topmost item if the layout is empty
             */
            if (!parentItem) {
                if (this._layoutManager.root.contentItems.length > 0) {
                    parentItem = this._layoutManager.root.contentItems[0] as ContentItem;
                } else {
                    parentItem = this._layoutManager.root as ContentItem;
                }
            }
        }

        parentItem.addChild(childConfig, this._indexInParent);
        this.close();
    }

    /**
     * Creates the URL and window parameter
     * and opens a new window
     * @private
     * @returns {void}
     */
    private _createWindow(): void {

        const url = createUrl(this._config);

        /**
         * Bogus title to prevent re-usage of existing window with the
         * same title. The actual title will be set by the new window's
         * GoldenLayout instance if it detects that it is in subWindowMode
         */
        const title = Math.floor(Math.random() * 1000000).toString(36);

        /**
         * The options as used in the window.open string
         */
        const options = this._serializeWindowOptions({
            width: this._dimensions.width,
            height: this._dimensions.height,
            innerWidth: this._dimensions.width,
            innerHeight: this._dimensions.height,
            menubar: 'no',
            toolbar: 'no',
            location: 'no',
            personalbar: 'no',
            resizable: 'yes',
            scrollbars: 'no',
            status: 'no', 
        });

        this._popoutWindow = window.open(url, title, options);

        if (!this._popoutWindow) {
            if (this._layoutManager.config.settings.blockedPopoutsThrowError === true) {
                let error = new GoldenLayoutError('Popout blocked', 'popoutBlocked');
                error.type = 'popoutBlocked';
                throw error;
            } else {
                return;
            }
        }

        $(this._popoutWindow)
            .on('load', fnBind(this._positionWindow, this))
            .on('unload beforeunload', fnBind(this._onClose, this));

        /**
         * Polling the childwindow to find out if GoldenLayout has been initialised
         * doesn't seem optimal, but the alternatives - adding a callback to the parent
         * window or raising an event on the window object - both would introduce knowledge
         * about the parent to the child window which we'd rather avoid
         */
        const checkReadyInterval = setInterval(
            fnBind(function (this: BrowserPopout) {
                if (this._popoutWindow.__glInstance && this._popoutWindow.__glInstance.isInitialised) {
                    this._onInitialised();
                    clearInterval(checkReadyInterval);
                }
            }, this), 10);
    }

    /**
     * Serialises a map of key:values to a window options string
     * @param   {any} windowOptions
     * @returns {string} Serialized window options
     */
    private _serializeWindowOptions(windowOptions: any): string {
        let windowOptionsString = [];

        for (const key in windowOptions) {
            windowOptionsString.push(key + '=' + windowOptions[key]);
        }

        return windowOptionsString.join(',');
    }

    /**
     * Move the newly created window roughly to
     * where the component used to be.
     * @private
     * @returns {void}
     */
    private _positionWindow(): void {
        this._popoutWindow.moveTo(this._dimensions.left, this._dimensions.top);
        this._popoutWindow.focus();
    }

    /**
     * Callback when the new window is opened and the GoldenLayout instance
     * within it is initialised
     * @returns {void}
     */
    _onInitialised(): void {
        this._isInitialised = true;
        this.getGlInstance().on('popIn', this.popIn, this);
        this.emit('initialised');
    }

    /**
     * Invoked 50ms after the window unload event
     * @private
     * @returns {void}
     */
    private _onClose(): void {
        setTimeout(fnBind(this.emit, this, 'closed'), 50);
    }
}
