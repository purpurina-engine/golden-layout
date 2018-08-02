import EventEmitter from '../utils/EventEmitter';
import DragListener from '../utils/DragListener';

import GoldenLayout from '../GoldenLayout';
import ContentItem from '../items/ContentItem';
import Stack from '../items/Stack';
import { ContentArea } from '../interfaces/Commons';

import {
    stripTags,
    getTouchEvent
} from '../utils/utils';

// const _template = '<div class="lm_dragProxy">' +
//     '<div class="lm_header">' +
//     '<ul class="lm_tabs">' +
//     '<li class="lm_tab lm_active"><i class="lm_left"></i>' +
//     '<span class="lm_title"></span>' +
//     '<i class="lm_right"></i></li>' +
//     '</ul>' +
//     '</div>' +
//     '<div class="lm_content"></div>' +
//     '</div>'

function buildTemplate(_showPreview: boolean = true): string {
    let _template = '<div class="lm_dragProxy">' +
        '<div class="lm_header">' +
        '<ul class="lm_tabs">' +
        '<li class="lm_tab lm_active"><i class="lm_left"></i>' +
        '<span class="lm_title"></span>' +
        '<i class="lm_right"></i></li>' +
        '</ul>' +
        '</div>';

    if (_showPreview) {
        _template += '<div class="lm_content"></div>';
    }

    // const _template = '<div class="lm_dragProxy">' +
    // '<div class="lm_header">' +
    // '<ul class="lm_tabs">' +
    // '<li class="lm_tab lm_active"><i class="lm_left"></i>' +
    // '<span class="lm_title"></span>' +
    // '<i class="lm_right"></i></li>' +
    // '</ul>' +
    // '</div>' +
    // '<div class="lm_content"></div>' +
    // '</div>'

    _template += '</div>';

    return _template;
}

/**
 * This class creates a temporary container
 * for the component whilst it is being dragged
 * and handles drag events
 *
 * @class
 * @private
 *
 */
export default class DragProxy extends EventEmitter {

    private _dragListener: DragListener;
    private _layoutManager: GoldenLayout;
    private _contentItem: ContentItem;
    private _originalParent: ContentItem;

    private _area: ContentArea = null;
    private _lastValidArea: ContentArea = null;
    private _sided: boolean;

    private _minX: number;
    private _minY: number;
    private _maxX: number;
    private _maxY: number;
    private _width: number;

    private _height: number;


    private showPreview: boolean;

    element: JQuery;
    childElementContainer: JQuery;

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }


    /**
     * 
     * 
     * @param x The initial x position
     * @param y The initial y position
     * @param dragListener 
     * @param layoutManager 
     * @param contentItem 
     * @param originalParent 
     */
    constructor(x: number, y: number, dragListener: DragListener, layoutManager: GoldenLayout, contentItem: ContentItem, originalParent: ContentItem) {

        super();

        this._dragListener = dragListener;
        this._layoutManager = layoutManager;
        this._contentItem = contentItem;
        this._originalParent = originalParent;

        // Setup settings
        const showPreview = layoutManager.config.dragDrop.showDragPreview || true;
        const detach = layoutManager.config.dragDrop.detachDragSource || true;

        this._area = null;
        this._lastValidArea = null;

        this._dragListener.on('drag', this._onDrag, this);
        this._dragListener.on('dragStop', this._onDrop, this);

        this.element = $(buildTemplate(this.showPreview));

        if (originalParent) {
            const stack = originalParent as Stack;
            if (stack.side) {
                this._sided = stack.isSided;
                this.element.addClass('lm_' + stack.side);
                if (['right', 'bottom'].indexOf(stack.side) >= 0)
                    this.element.find('.lm_content').after(this.element.find('.lm_header'));
            }
        }
        this.element.css({
            left: x,
            top: y
        });
        this.element.find('.lm_tab').attr('title', stripTags(this._contentItem.config.title));
        this.element.find('.lm_title').html(this._contentItem.config.title);

        this.childElementContainer = this.element.find('.lm_content');

        /**
         * Should show preview? Attach to drag proxy preview.
         */
        if (showPreview) {
            this.childElementContainer.append(contentItem.element);
        }

        /**
        * Should detach child element from tree?
         */
        this._undisplayTree(detach);

        this._layoutManager._$calculateItemAreas();

        this._setDimensions();

        $(document.body).append(this.element);

        const offset = this._layoutManager.container.offset();

        this._minX = offset.left;
        this._minY = offset.top;
        this._maxX = this._layoutManager.container.width() + this._minX;
        this._maxY = this._layoutManager.container.height() + this._minY;
        this._width = this.element.width();
        this._height = this.element.height();

        this._setDropPosition(x, y);
    }

    /**
     * Callback on every mouseMove event during a drag. Determines if the drag is
     * still within the valid drag area and calls the layoutManager to highlight the
     * current drop area
     *
     * @param   {number} offsetX The difference from the original x position in px
     * @param   {number} offsetY The difference from the original y position in px
     * @param   {JQuery.Event} event
     *
     * @private
     *
     * @returns {void}
     */
    private _onDrag(_offsetX: number, _offsetY: number, event: JQuery.Event): void {
        const vec = getTouchEvent(event)

        const x = vec.x,
            y = vec.y,
            isWithinContainer = x > this._minX && x < this._maxX && y > this._minY && y < this._maxY;

        if (!isWithinContainer && this._layoutManager.config.settings.constrainDragToContainer === true) {
            return;
        }

        this._setDropPosition(x, y);
    }

    /**
     * Sets the target position, highlighting the appropriate area
     *
     * @param   {number} x The x position in px
     * @param   {number} y The y position in px
     *
     * @private
     *
     * @returns {void}
     */
    private _setDropPosition(x: number, y: number): void {
        this.element.css({
            left: x,
            top: y
        });
        this._area = this._layoutManager._$getArea(x, y);

        if (this._area !== null) {
            this._lastValidArea = this._area;
            this._area.contentItem._$highlightDropZone(x, y, this._area);
        }
    }

    /**
     * Callback when the drag has finished. Determines the drop area
     * and adds the child to it
     *
     * @private
     *
     * @returns {void}
     */
    private _onDrop(): void {
        this._updateTree();
        this._layoutManager.dropTargetIndicator.hide();

        /*
         * Valid drop area found
         */
        if (this._area !== null) {
            this._area.contentItem._$onDrop(this._contentItem, this._area);
            /**
             * No valid drop area available at present, but one has been found before.
             * Use it
             */
        } else if (this._lastValidArea !== null) {
            this._lastValidArea.contentItem._$onDrop(this._contentItem, this._lastValidArea);

            /**
             * No valid drop area found during the duration of the drag. Return
             * content item to its original position if a original parent is provided.
             * (Which is not the case if the drag had been initiated by createDragSource)
             */
        } else if (this._originalParent) {
            this._originalParent.addChild(this._contentItem);

            /**
             * The drag didn't ultimately end up with adding the content item to
             * any container. In order to ensure clean up happens, destroy the
             * content item.
             */
        } else {
            this._contentItem._$destroy();
        }

        this.element.remove();

        this._layoutManager.emit('itemDropped', this._contentItem);
    }

    /**
     * Undisplays the item from its original position within the tree
     *
     * @private
     *
     * @returns {void}
     */
    private _undisplayTree(detach: boolean): void {

        if (detach === false)
            return;
        /**
         * parent is null if the drag had been initiated by a external drag source
         */
        if (this._contentItem.parent) {
            this._contentItem.parent.undisplayChild(this._contentItem);
        }
    }

    /**
     * Removes the item from its original position within the tree
     *
     * @private
     *
     * @returns {void}
     */
    private _updateTree(): void {

        /**
         * parent is null if the drag had been initiated by a external drag source
         */
        if (this._contentItem.parent) {
            this._contentItem.parent.removeChild(this._contentItem, true);
        }

        // REVIEW
        this._contentItem._$setParent(this);
    }

    /**
     * Updates the Drag Proxie's dimensions
     *
     * @private
     *
     * @returns {void}
     */
    private _setDimensions(): void {
        const dimensions = this._layoutManager.config.dimensions;
        let width = dimensions.dragProxyWidth;
        let height = dimensions.dragProxyHeight;

        

        this.element.width(width);
        this.element.height(height);
        //width -= (this._sided ? dimensions.headerHeight : 0);
        //height -= (!this._sided ? dimensions.headerHeight : 0);
        this.childElementContainer.width(width);
        this.childElementContainer.height(height);
        this._contentItem.element.width(width);
        this._contentItem.element.height(height);
        this._contentItem.callDownwards('_$show');
        this._contentItem.callDownwards('setSize');
    }
}
