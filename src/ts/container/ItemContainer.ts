
import EventEmitter from '../utils/EventEmitter';
import LayoutManager from '../LayoutManager';
import ItemConfigType, { ComponentConfig } from '../config/ItemConfigType';
import Container from './Container';
import Tab from '../controls/Tab';
import ContentItem from '../items/ContentItem';
import { Dimension } from '../Commons';

export default class ItemContainer extends EventEmitter implements Container {

    private _config: ComponentConfig;
    private _element: JQuery;
    private _contentElement: JQuery<HTMLElement>;
    private _layoutManager: LayoutManager;

    tab: Tab;

    width: number;
    height: number;
    title: string;
    parent: ContentItem;

    isHidden: boolean;

    get element(): JQuery {
        return this._element;
    }

    get layoutManager(): LayoutManager {
        return this._layoutManager;
    }

    get config() {
        return this._config;
    }

    // get isHidden() {
    //     return this._isHidden;
    // }

    constructor(config: ComponentConfig, parent: ContentItem, layoutManager: LayoutManager) {

        super();

        this.width = null;
        this.height = null;
        this.title = config.componentName;
        this.parent = parent;
        this._layoutManager = layoutManager;
        this.isHidden = false;

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
     * @returns {DOM element}
     */
    getElement(): JQuery<HTMLElement> {
        return this._contentElement;
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
        this.isHidden = true;
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
        this.isHidden = false;
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
     * @param {Number} width  The new width in pixel
     * @param {Number} height The new height in pixel
     *
     * @returns {Boolean} resizeSuccesful
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
     * Closes the container if it is closable. Can be called by
     * both the component within at as well as the contentItem containing
     * it. Emits a close event before the container itself is closed.
     *
     * @returns {void}
     */
    close(): boolean {
        if (this._config.isClosable) {
            this.emit('close');
            this.parent.close();
            return true;
        }
        return false;
    }


    /**
     * Returns the current state object
     *
     * @returns {Object} state
     */
    getState(): Object {
        return this._config.componentState;
    }


    /**
     * Merges the provided state into the current one
     *
     * @param   {Object} state
     *
     * @returns {void}
     */
    extendState(state: Object): void {
        this.setState($.extend(true, this.getState(), state));
    }


    /**
     * Notifies the layout manager of a stateupdate
     *
     * @param {serialisable} state
     */
    setState(state: Object) {
        this._config.componentState = state;
        this.parent.emitBubblingEvent('stateChanged');
    }


    /**
     * Set's the components title
     *
     * @param {String} title
     */
    setTitle(title: string): void {
        this.parent.setTitle(title);
    }


    /**
     * Set's the containers size. Called by the container's component.
     * To set the size programmatically from within the container please
     * use the public setSize method
     *
     * @param {[Int]} width  in px
     * @param {[Int]} height in px
     *
     * @returns {void}
     */
    _$setSize(width: number, height: number): void {
        if (width !== this.width || height !== this.height) {
            this.width = width;
            this.height = height;
            // $.zepto ? this._contentElement.width(width) : this._contentElement.outerWidth(width);
            // $.zepto ? this._contentElement.height(height) : this._contentElement.outerHeight(height);
            this._contentElement.outerWidth(width);
            this._contentElement.outerHeight(height);
            this.emit('resize');
        }
    }
}
