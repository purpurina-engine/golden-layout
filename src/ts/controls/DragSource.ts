import DragListener from '../utils/DragListener'
import DragProxy from './DragProxy'
import {
    isFunction
} from '../utils/utils'
import GoldenLayout from '../GoldenLayout';
import { Callback } from '../Commons';
import ContentItem from '../items/ContentItem';
import { ItemConfigType } from '../config';

/**
 * Allows for any DOM item to create a component on drag
 * start tobe dragged into the Layout
 *
 * @param {JQuery} element
 * @param {Object | Callback} itemConfig the configuration for the contentItem that will be created
 * @param {GoldenLayout} layoutManager
 *
 * @class
 */
export default class DragSource {

    private _element: JQuery;
    private _itemConfig: ItemConfigType | Callback;
    private _layoutManager: GoldenLayout;
    private _dragListener: DragListener;

    constructor(element: JQuery, itemConfig: ItemConfigType | Callback, layoutManager: GoldenLayout) {
        this._element = element;
        this._itemConfig = itemConfig;
        this._layoutManager = layoutManager;
        this._dragListener = null;

        this._createDragListener();
    }


    /**
     * Called initially and after every drag
     *
     * @returns {void}
     */
    private _createDragListener(): void {
        if (this._dragListener !== null) {
            this._dragListener.destroy();
        }

        this._dragListener = new DragListener(this._element);
        this._dragListener.on('dragStart', this._onDragStart, this);
        this._dragListener.on('dragStop', this._createDragListener, this);
    }

    /**
     * Callback for the DragListener's dragStart event
     *
     * @param   {number} x the x position of the mouse on dragStart
     * @param   {number} y the x position of the mouse on dragStart
     *
     * @returns {void}
     */
    private _onDragStart(x: number, y: number): void {
        let itemConfig: ContentItem;

        if (isFunction(this._itemConfig)) {
            itemConfig = (<Callback>this._itemConfig)();
        }

        const contentItem = this._layoutManager._$normalizeContentItem($.extend(true, {}, itemConfig));
        const dragProxy = new DragProxy(x, y, this._dragListener, this._layoutManager, contentItem, null);

        this._layoutManager.transitionIndicator.transitionElements(this._element, dragProxy.element);
    }
}
