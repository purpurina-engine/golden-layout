import ILayoutManagerInternal from '../interfaces/ILayoutManagerInternal';
import { Callback } from '../interfaces/Commons';
import ContentItem from '../items/ContentItem';
import { ItemConfigType } from '../config';

import DragListener from './DragListener'
import DragProxy from './DragProxy'

import {
    isFunction
} from '../utils/utils'

/**
 * Allows for any DOM item to create a component on drag
 * start tobe dragged into the Layout
 *
 * @class
 */
export default class DragSource {

    private _element: JQuery;
    private _itemConfig: ItemConfigType | Callback;
    private _layoutManager: ILayoutManagerInternal;
    private _dragListener: DragListener;

    /**
     * Constructor
     * @param element The JQuery element
     * @param itemConfig The configuration for the contentItem that will be created
     * @param layoutManager The layout manager
     */
    constructor(element: JQuery, itemConfig: ItemConfigType | Callback, layoutManager: ILayoutManagerInternal) {
        this._element = element;
        this._itemConfig = itemConfig;
        this._layoutManager = layoutManager;
        this._dragListener = null;

        this.createDragListener();
    }

    /**
     * Called initially and after every drag
     * @returns {void}
     */
    private createDragListener(): void {
        if (this._dragListener !== null) {
            this._dragListener.destroy();
        }

        this._dragListener = new DragListener(this._element);
        this._dragListener.on('dragStart', this.onDragStart, this);
        this._dragListener.on('dragStop', this.createDragListener, this);
    }

    /**
     * Callback for the DragListener's dragStart event
     * @param   {number} x the x position of the mouse on dragStart
     * @param   {number} y the x position of the mouse on dragStart
     * @returns {void}
     */
    private onDragStart(x: number, y: number): void {
        let itemConfig: ContentItem;

        // if (isFunction(this._itemConfig)) {
        //     itemConfig = (this._itemConfig as Callback)();
        // }

        const contentItem = this._layoutManager._$normalizeContentItem($.extend(true, {}, itemConfig));
        const dragProxy = new DragProxy(x, y, this._dragListener, this._layoutManager, contentItem as ContentItem, null);

        this._layoutManager.transitionIndicator.transitionElements(this._element, dragProxy.element);
    }

    destroy() {
        this._dragListener.destroy();
        this._element = null;
        this._itemConfig = null;
        this._dragListener = null;
    }
}
