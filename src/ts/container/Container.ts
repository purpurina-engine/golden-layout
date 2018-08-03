import { Dimension } from '../interfaces/Commons';

import { ComponentConfig, ReactComponentConfig } from '../config/ItemConfigType';
import Tab from '../controls/Tab';

import ContentItem from '../items/ContentItem';
import EventEmitter from '../events/EventEmitter';
import GoldenLayout from '../LayoutManager';


export default class Container extends EventEmitter {

    private _config: ComponentConfig | ReactComponentConfig;
    private _element: JQuery;
    private _contentElement: JQuery<HTMLElement>;
    private _layoutManager: GoldenLayout;
    private _isHidden: boolean;
    private _height: number;
    private _width: number;
    private _parent: ContentItem;


    /**
     * A reference to the tab that controls this container. Will initially be null
     * (and populated once a tab event has been fired).
     */
    tab: Tab;

    /**
    * The current title of the container
    */
    title: string;

    /**
     * A reference to the component-item that controls this container
     */
    public get parent(): ContentItem {
        return this._parent;
    }

    get element(): JQuery {
        return this._element;
    }

    get layoutManager(): GoldenLayout {
        return this._layoutManager;
    }

    get config() {
        return this._config;
    }

    /**
     * The current width of the container in pixel
     */    
    public get width(): number {
        return this._width;
    }

    /**
     * The current height of the container in pixel
     */    
    public get height(): number {
        return this._height;
    }

    /**
     * True if the item is currently hidden
     */
    get isHidden(): boolean {
        return this._isHidden;
    }

    constructor(config: ComponentConfig, parent: ContentItem, layoutManager: GoldenLayout) {

        super();

        this._width = null;
        this._height = null;
        this.title = config.componentName;
        this._parent = parent;
        this._layoutManager = layoutManager;
        this._isHidden = false;

        this._config = config;
        this._element = $([
            '<div class="lm_item_container">',
            '<div class="lm_content"></div>',
            '</div>'
        ].join(''));

        this._contentElement = this._element.find('.lm_content');
    }

    /**
     * Get the inner DOM element the container's content
     * is intended to live in
     *
     * @returns {JQuery<HTMLElement>}
     */
    getElement(): JQuery<HTMLElement> {
        return this._contentElement;
    }

    /**
     * Closes the container if it is closable. Can be called by
     * both the component within at as well as the contentItem containing
     * it. Emits a close event before the container itself is closed.
     *
     * @returns {boolean}
     */
    close(): boolean {
        if (this._config.isClosable) {
            this.emit('close');
            //this.parent.close();
            return true;
        }
        return false;
    }

     /**
     * Overwrites the components state with the provided value. To only change parts of the componentState see
     * extendState below. This is the main mechanism for saving the state of a component. This state will be the
     * value of componentState when layout.toConfig() is called and will be passed back to the component's
     * constructor function. It will also be used when the component is opened in a new window.
     * @param state A serialisable object
     */
    setState(state: any): void {
        (<ComponentConfig>this._config).componentState = state;
        this.parent.emitBubblingEvent('stateChanged');
    }

    /**
     * This is similar to setState, but merges the provided state into the current one, rather than overwriting it.
     * @param state A serialisable object
     */
    extendState(state: any): void {
        this.setState($.extend(true, this.getState(), state));
    }

    /**
     * Returns the current state.
     */
    getState(): any {
        return (<ComponentConfig>this._config).componentState;
    }

    /**
     * Set's the components title
     *
     * @param {string} title
     */
    setTitle(title: string): void {
        this.parent.setTitle(title);
    }

    /**
     * Hide the container. Notifies the containers content first
     * and then hides the DOM node. If the container is already hidden
     * this should have no effect
     *
     * @returns {boolean}
     */
    hide(): boolean {
        this.emit('hide');
        this._isHidden = true;
        this._element.hide();
        return true;
    }

    /**
     * Shows a previously hidden container. Notifies the
     * containers content first and then shows the DOM element.
     * If the container is already visible this has no effect.
     *
     * @returns {boolean}
     */
    show(): boolean {
        this.emit('show');
        this._isHidden = false;
        this._element.show();
        // call shown only if the container has a valid size
        if (this.height != 0 || this.width != 0) {
            this.emit('shown');
            return true;
        }
        return false;
    }

    
    /**
     * Set the size from within the container. Traverses up
     * the item tree until it finds a row or column element
     * and resizes its items accordingly.
     *
     * If this container isn't a descendant of a row or column
     * it returns false
     * @todo  Rework!!!
     * @param {number} width  The new width in pixel
     * @param {number} height The new height in pixel
     *
     * @returns {boolean} resizeSuccesful
     */
    setSize(width: number, height: number): boolean {
        let rowOrColumn = this.parent,
            rowOrColumnChild: any = this;
        let totalPixel: number,
            percentage: number;
        let direction: Dimension;
        let newSize: number,
            delta: number;

        while (!rowOrColumn.isColumn && !rowOrColumn.isRow) {
            rowOrColumnChild = rowOrColumn;
            rowOrColumn = rowOrColumn.parent;
            /**
             * No row or column has been found
             */
            if (rowOrColumn.isRoot) {
                return false;
            }
        }

        direction = rowOrColumn.isColumn ? "height" : "width";
        newSize = direction === "height" ? height : width;

        totalPixel = this[direction] * (1 / (rowOrColumnChild._config[direction] / 100));
        percentage = (newSize / totalPixel) * 100;
        delta = (rowOrColumnChild._config[direction] - percentage) / (rowOrColumn.contentItems.length - 1);

        for (let i = 0; i < rowOrColumn.contentItems.length; i++) {
            if (rowOrColumn.contentItems[i] === rowOrColumnChild) {
                rowOrColumn.contentItems[i].config[direction] = percentage;
            } else {
                rowOrColumn.contentItems[i].config[direction] += delta;
            }
        }

        rowOrColumn.callDownwards('setSize');

        return true;
    }


    /**
     * Set's the containers size. Called by the container's component.
     * To set the size programmatically from within the container please
     * use the public setSize method
     *
     * @param {number} width  in px
     * @param {number} height in px
     *
     * @returns {void}
     */
    _$setSize(width: number, height: number): void {
        if (width !== this.width || height !== this.height) {
            this._width = width;
            this._height = height;
            // $.zepto ? this._contentElement.width(width) : this._contentElement.outerWidth(width);
            // $.zepto ? this._contentElement.height(height) : this._contentElement.outerHeight(height);
            this._contentElement.outerWidth(width);
            this._contentElement.outerHeight(height);
            this.emit('resize');
        }
    }
}
