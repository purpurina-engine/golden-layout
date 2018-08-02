import { Dimension } from '../interfaces/Commons';
import IContentItem from '../interfaces/IContentItem';
import { ItemConfig } from '../config/ItemConfigType';

import LayoutManager from '../LayoutManager';
import ContentItem from './ContentItem';
import Stack from './Stack'
import Splitter from '../controls/Splitter';

import {
    fnBind,
    animFrame,
    indexOf
} from '../utils/utils';

export default class RowOrColumn extends ContentItem {

    private _splitterSize: number;
    private _splitterGrabSize: number;
    private _dimension: Dimension;
    private _splitter: Array<any>
    private _splitterPosition: number;
    private _splitterMinPosition: number;
    private _splitterMaxPosition: number;
    private __isColumn: boolean;

    // isRow: boolean;
    // isColumn: boolean;
    // element: JQuery;

    constructor(isColumn: boolean, layoutManager: LayoutManager, config: ItemConfig, parent: ContentItem) {

        super(layoutManager, config, parent);

        this._isRow = !isColumn;
        this._isColumn = isColumn;

        this._element = $('<div class="lm_item lm_' + (isColumn ? 'column' : 'row') + '"></div>');
        this._childElementContainer = this.element;
        this._splitterSize = layoutManager.config.dimensions.borderWidth;
        this._splitterGrabSize = layoutManager.config.dimensions.borderGrabWidth;
        this.__isColumn = isColumn;
        this._dimension = isColumn ? 'height' : 'width';
        this._splitter = [];
        this._splitterPosition = null;
        this._splitterMinPosition = null;
        this._splitterMaxPosition = null;
    }


    /**
     * Add a new contentItem to the Row or Column
     *
     * @param {ContentItem} contentItem
     * @param {number} index The position of the new item within the Row or Column.
     *                      If no index is provided the item will be added to the end
     * @param {boolean} _$suspendResize If true the items won't be resized. This will leave the item in
     *                                 an inconsistent state and is only intended to be used if multiple
     *                                 children need to be added in one go and resize is called afterwards
     * @returns {void}
     */
    addChild(contentItem: ContentItem, index?: number, _$suspendResize?: boolean): void {

        let newItemSize, itemSize, splitterElement;

        contentItem = this._layoutManager._$normalizeContentItem(contentItem, this);

        if (index === undefined) {
            index = this.contentItems.length;
        }

        if (this.contentItems.length > 0) {
            splitterElement = this._createSplitter(Math.max(0, index - 1)).element;

            if (index > 0) {
                this.contentItems[index - 1].element.after(splitterElement);
                splitterElement.after(contentItem.element);
                if (this._isDocked(index - 1)) {
                    this._splitter[index - 1].element.hide();
                    this._splitter[index].element.show();
                }
            } else {
                this.contentItems[0].element.before(splitterElement);
                splitterElement.before(contentItem.element);
            }
        } else {
            this.childElementContainer.append(contentItem.element);
        }

        //ContentItem.prototype.addChild.call(this, contentItem, index);
        super.addChild(contentItem, index);

        newItemSize = (1 / this.contentItems.length) * 100;

        if (_$suspendResize === true) {
            this.emitBubblingEvent('stateChanged');
            return;
        }

        for (let i = 0; i < this.contentItems.length; i++) {
            if (this.contentItems[i] === contentItem) {
                contentItem.config[this._dimension] = newItemSize;
            } else {
                itemSize = this.contentItems[i].config[this._dimension] *= (100 - newItemSize) / 100;
                this.contentItems[i].config[this._dimension] = itemSize;
            }
        }

        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
        this._validateDocking();
    }


    /**
     * Undisplays a child of this element
     * @param   {ContentItem} contentItem
     * @returns {void}
     */
    undisplayChild(contentItem: ContentItem): void {
        let undisplayedItemSize = contentItem.config[this._dimension],
            index = indexOf(contentItem, this.contentItems),
            splitterIndex = Math.max(index - 1, 0);

        if (index === -1) {
            throw new Error('Can\'t undisplay child. ContentItem is not child of this Row or Column');
        }

        /**
         * Hide the splitter before the item or after if the item happens
         * to be the first in the row/column
         */
        if (this._splitter[splitterIndex]) {
            this._splitter[splitterIndex].element.hide();
        }

        if (splitterIndex < this._splitter.length) {
            if (this._isDocked(splitterIndex))
                this._splitter[splitterIndex].element.hide();
        }

        /**
         * Allocate the space that the hidden item occupied to the remaining items
         */
        let docked = this._isDocked();
        for (let i = 0; i < this.contentItems.length; i++) {
            if (this.contentItems[i] !== contentItem) {
                if (!this._isDocked(i))
                    this.contentItems[i].config[this._dimension] += undisplayedItemSize / (this.contentItems.length - 1 - docked);
            } else {
                this.contentItems[i].config[this._dimension] = 0
            }
        }

        if (this.contentItems.length === 1) {
            //ContentItem.prototype.undisplayChild.call(this, contentItem);
            super.undisplayChild(contentItem);
        }

        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
    }


    /**
     * Removes a child of this element
     *
     * @param   {ContentItem} contentItem
     * @param   {boolean} keepChild   If true the child will be removed, but not destroyed
     *
     * @returns {void}
     */
    removeChild(contentItem: ContentItem, keepChild: boolean): void {
        let removedItemSize = contentItem.config[this._dimension];
        const index = indexOf(contentItem, this.contentItems);

        if (index === -1) {
            throw new Error('Can\'t remove child. ContentItem is not child of this Row or Column');
        }

        const splitterIndex = Math.max(index - 1, 0);
        let childItem: ContentItem;

        /**
         * Remove the splitter before the item or after if the item happens
         * to be the first in the row/column
         */
        if (this._splitter[splitterIndex]) {
            this._splitter[splitterIndex]._$destroy();
            this._splitter.splice(splitterIndex, 1);
        }

        if (splitterIndex < this._splitter.length) {
            if (this._isDocked(splitterIndex))
                this._splitter[splitterIndex].element.hide();
        }
        /**
         * Allocate the space that the removed item occupied to the remaining items
         */
        let docked = this._isDocked();
        for (let i = 0; i < this.contentItems.length; i++) {
            if (this.contentItems[i] !== contentItem) {
                if (!this._isDocked(i))
                    this.contentItems[i].config[this._dimension] += removedItemSize / (this.contentItems.length - 1 - docked);

            }
        }

        //ContentItem.prototype.removeChild.call(this, contentItem, keepChild);
        super.removeChild(contentItem, keepChild);

        if (this.contentItems.length === 1 && this.config.isClosable === true) {
            childItem = this._contentItems[0];
            this._contentItems = [];
            this.parent.replaceChild(this, childItem, true);
            this._validateDocking(this.parent);
        } else {
            this.callDownwards('setSize');
            this.emitBubblingEvent('stateChanged');
            this._validateDocking();
        }
    }

    /**
     * Replaces a child of this Row or Column with another contentItem
     * @param   {ContentItem} oldChild
     * @param   {ContentItem} newChild
     * @returns {void}
     */
    replaceChild(oldChild: ContentItem, newChild: ContentItem): void {
        let size = oldChild.config[this._dimension];
        ContentItem.prototype.replaceChild.call(this, oldChild, newChild);
        newChild.config[this._dimension] = size;
        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
    }

    /**
     * Called whenever the dimensions of this item or one of its parents change
     * @returns {void}
     */
    setSize(): void {
        if (this.contentItems.length > 0) {
            this._calculateRelativeSizes();
            this._setAbsoluteSizes();
        }
        this.emitBubblingEvent('stateChanged');
        this.emit('resize');
    }

    /**
     * Dock or undock a child if it posiible
     * @param   {Stack} contentItem
     * @param   {boolean} mode or toggle if undefined
     * @param   {boolean} collapsed after docking
     * @returns {void}
     */
    dock(contentItem: Stack, mode: boolean, collapsed?: boolean): void {
        if (this.contentItems.length === 1)
            throw new Error('Can\'t dock child when it single');

        let removedItemSize = contentItem.config[this._dimension],
            headerSize = this.layoutManager.config.dimensions.headerHeight,
            index = indexOf(contentItem, this.contentItems),
            splitterIndex = Math.max(index - 1, 0);

        if (index === -1) {
            throw new Error('Can\'t dock child. ContentItem is not child of this Row or Column');
        }
        let isDocked = contentItem.docker && contentItem.docker.docked;
        if (typeof mode !== 'undefined')
            if (mode == isDocked)
                return;

        if (isDocked) { // undock it
            this._splitter[splitterIndex].element.show();
            let itemSize: number;

            for (let i = 0; i < this.contentItems.length; i++) {
                let newItemSize = contentItem.docker.size;
                if (this.contentItems[i] === contentItem) {
                    contentItem.config[this._dimension] = newItemSize;
                } else {
                    itemSize = this.contentItems[i].config[this._dimension] *= (100 - newItemSize) / 100;
                    this.contentItems[i].config[this._dimension] = itemSize;
                }
            }

            contentItem.docker = {
                docked: false
            };
        } else { // dock
            if (this.contentItems.length - this._isDocked() < 2)
                throw new Error('Can\'t dock child when it is last in ' + this.config.type);
            let autoside: any = {
                column: {
                    first: 'top',
                    last: 'bottom'
                },
                row: {
                    first: 'left',
                    last: 'right'
                }
            };
            let required = autoside[this.config.type][index ? 'last' : 'first'];
            if (contentItem.header.position() != required)
                contentItem.header.position(required);

            if (this._splitter[splitterIndex]) {
                this._splitter[splitterIndex].element.hide();
            }
            let docked = this._isDocked();

            for (let i = 0; i < this.contentItems.length; i++) {
                if (this.contentItems[i] !== contentItem) {
                    if (!this._isDocked(i))
                        this.contentItems[i].config[this._dimension] += removedItemSize / (this.contentItems.length - 1 - docked);
                } else
                    this.contentItems[i].config[this._dimension] = 0;
            }

            contentItem.docker = {
                dimension: this._dimension,
                size: removedItemSize,
                realSize: contentItem.element[this._dimension]() - headerSize,
                docked: true,
            };
            if (collapsed) {
                contentItem.childElementContainer[this._dimension](0);
            }
        }
        contentItem.element.toggleClass('lm_docked', contentItem.docker.docked);
        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
        this._validateDocking();
    }

    /**
     * Invoked recursively by the layout manager. ContentItem.init appends
     * the contentItem's DOM elements to the container, RowOrColumn init adds splitters
     * in between them
     *
     * @package private
     * @override ContentItem._$init
     * @returns {void}
     */
    _$init() {
        if (this._isInitialised === true)
            return;

        //ContentItem.prototype._$init.call(this);
        super._$init();

        for (let i = 0; i < this._contentItems.length - 1; i++) {
            this._contentItems[i].element.after(this._createSplitter(i).element);
        }

        for (const iterator of this._contentItems) {

            const headerConfig = iterator as any['headerConfig'];

            if (headerConfig && headerConfig.docked) {
                this.dock(iterator, true, true);
            }
        }

    }

    /**
     * Turns the relative sizes calculated by _calculateRelativeSizes into
     * absolute pixel values and applies them to the children's DOM elements
     *
     * Assigns additional pixels to counteract Math.floor
     *
     * @private
     * @returns {void}
     */
    private _setAbsoluteSizes(): void {
        let sizeData = this._calculateAbsoluteSizes();

        for (let i = 0; i < this.contentItems.length; i++) {
            if (sizeData.additionalPixel - i > 0) {
                sizeData.itemSizes[i]++;
            }

            if (this.__isColumn) {
                this.contentItems[i].element.width(sizeData.totalWidth);
                this.contentItems[i].element.height(sizeData.itemSizes[i]);
            } else {
                this.contentItems[i].element.width(sizeData.itemSizes[i]);
                this.contentItems[i].element.height(sizeData.totalHeight);
            }
        }
    }

    /**
     * Calculates the absolute sizes of all of the children of this Item.
     * @returns {object} - Set with absolute sizes and additional pixels.
     */
    private _calculateAbsoluteSizes() {
        let totalSplitterSize = (this.contentItems.length - 1) * this._splitterSize,
            headerSize = this.layoutManager.config.dimensions.headerHeight,
            totalWidth = this.element.width(),
            totalHeight = this.element.height(),
            totalAssigned = 0;
        let additionalPixel: number,
            itemSize: number;
        let itemSizes: number[] = [];

        if (this.__isColumn) {
            totalHeight -= totalSplitterSize;
        } else {
            totalWidth -= totalSplitterSize;
        }
        for (let i = 0; i < this.contentItems.length; i++) {
            if (this._isDocked(i))
                if (this.__isColumn) {
                    totalHeight -= headerSize - this._splitterSize;
                } else {
                    totalWidth -= headerSize - this._splitterSize;
                }
        }

        for (let i = 0; i < this.contentItems.length; i++) {
            if (this.__isColumn) {
                itemSize = Math.floor(totalHeight * (this.contentItems[i].config.height / 100));
            } else {
                itemSize = Math.floor(totalWidth * (this.contentItems[i].config.width / 100));
            }
            if (this._isDocked(i))
                itemSize = headerSize;

            totalAssigned += itemSize;
            itemSizes.push(itemSize);
        }

        additionalPixel = Math.floor((this.__isColumn ? totalHeight : totalWidth) - totalAssigned);

        return {
            itemSizes: itemSizes,
            additionalPixel: additionalPixel,
            totalWidth: totalWidth,
            totalHeight: totalHeight
        };
    }

    /**
     * Calculates the relative sizes of all children of this Item. The logic
     * is as follows:
     *
     * - Add up the total size of all items that have a configured size
     *
     * - If the total == 100 (check for floating point errors)
     *        Excellent, job done
     *
     * - If the total is > 100,
     *        set the size of items without set dimensions to 1/3 and add this to the total
     *        set the size off all items so that the total is hundred relative to their original size
     *
     * - If the total is < 100
     *        If there are items without set dimensions, distribute the remainder to 100 evenly between them
     *        If there are no items without set dimensions, increase all items sizes relative to
     *        their original size so that they add up to 100
     *
     * @private
     * @returns {void}
     */
    private _calculateRelativeSizes(): void {

        let total = 0,
            itemsWithoutSetDimension: ContentItem[] = [],
            dimension = this.__isColumn ? 'height' : 'width';

        for (let i = 0; i < this.contentItems.length; i++) {
            if (this.contentItems[i].config[dimension] !== undefined) {
                total += this.contentItems[i].config[dimension];
            } else {
                itemsWithoutSetDimension.push(this.contentItems[i]);
            }
        }

        /**
         * Everything adds up to hundred, all good :-)
         */
        if (Math.round(total) === 100) {
            this._respectMinItemWidth();
            return;
        }

        /**
         * Allocate the remaining size to the items without a set dimension
         */
        if (Math.round(total) < 100 && itemsWithoutSetDimension.length > 0) {
            for (let i = 0; i < itemsWithoutSetDimension.length; i++) {
                itemsWithoutSetDimension[i].config[dimension] = (100 - total) / itemsWithoutSetDimension.length;
            }
            this._respectMinItemWidth();
            return;
        }

        /**
         * If the total is > 100, but there are also items without a set dimension left, assing 50
         * as their dimension and add it to the total
         *
         * This will be reset in the next step
         */
        if (Math.round(total) > 100) {
            for (let i = 0; i < itemsWithoutSetDimension.length; i++) {
                itemsWithoutSetDimension[i].config[dimension] = 50;
                total += 50;
            }
        }

        /**
         * Set every items size relative to 100 relative to its size to total
         */
        for (let i = 0; i < this.contentItems.length; i++) {
            this.contentItems[i].config[dimension] = (this.contentItems[i].config[dimension] / total) * 100;
        }

        this._respectMinItemWidth();
    }

    /**
     * Adjusts the column widths to respect the dimensions minItemWidth if set.
     * @returns {}
     */
    private _respectMinItemWidth() {
        let minItemWidth = this.layoutManager.config.dimensions ? (this.layoutManager.config.dimensions.minItemWidth || 0) : 0,
            sizeData = null,
            entriesOverMin = [],
            totalOverMin = 0,
            totalUnderMin = 0,
            remainingWidth = 0,
            itemSize = 0,
            //contentItem = null,
            reducePercent,
            reducedWidth,
            allEntries = [],
            entry;

        if (this.__isColumn || !minItemWidth || this.contentItems.length <= 1) {
            return;
        }

        sizeData = this._calculateAbsoluteSizes();

        /**
         * Figure out how much we are under the min item size total and how much room we have to use.
         */
        for (let i = 0; i < this.contentItems.length; i++) {

            //contentItem = this.contentItems[i];
            itemSize = sizeData.itemSizes[i];

            if (itemSize < minItemWidth) {
                totalUnderMin += minItemWidth - itemSize;
                entry = {
                    width: minItemWidth
                };

            } else {
                totalOverMin += itemSize - minItemWidth;
                entry = {
                    width: itemSize
                };
                entriesOverMin.push(entry);
            }

            allEntries.push(entry);
        }

        /**
         * If there is nothing under min, or there is not enough over to make up the difference, do nothing.
         */
        if (totalUnderMin === 0 || totalUnderMin > totalOverMin) {
            return;
        }

        /**
         * Evenly reduce all columns that are over the min item width to make up the difference.
         */
        reducePercent = totalUnderMin / totalOverMin;
        remainingWidth = totalUnderMin;
        for (let i = 0; i < entriesOverMin.length; i++) {
            entry = entriesOverMin[i];
            reducedWidth = Math.round((entry.width - minItemWidth) * reducePercent);
            remainingWidth -= reducedWidth;
            entry.width -= reducedWidth;
        }

        /**
         * Take anything remaining from the last item.
         */
        if (remainingWidth !== 0) {
            allEntries[allEntries.length - 1].width -= remainingWidth;
        }

        /**
         * Set every items size relative to 100 relative to its size to total
         */
        for (let i = 0; i < this.contentItems.length; i++) {
            this.contentItems[i].config.width = (allEntries[i].width / sizeData.totalWidth) * 100;
        }
    }

    /**
     * Instantiates a new Splitter, binds events to it and adds
     * it to the array of splitters at the position specified as the index argument
     *
     * What it doesn't do though is append the splitter to the DOM
     *
     * @param   {number} index The position of the splitter
     *
     * @returns {Splitter}
     */
    private _createSplitter(index: number): Splitter {
        let splitter;
        splitter = new Splitter(this.__isColumn, this._splitterSize, this._splitterGrabSize);
        splitter.on('drag', fnBind(this._onSplitterDrag, this, splitter), this);
        splitter.on('dragStop', fnBind(this._onSplitterDragStop, this, splitter), this);
        splitter.on('dragStart', fnBind(this._onSplitterDragStart, this, splitter), this);
        this._splitter.splice(index, 0, splitter);
        return splitter;
    }

    /**
     * Locates the instance of Splitter in the array of
     * registered splitters and returns a map containing the contentItem
     * before and after the splitters, both of which are affected if the
     * splitter is moved
     *
     * @param   {Splitter} splitter
     *
     * @returns {any} A map of contentItems that the splitter affects
     */
    private _getItemsForSplitter(splitter: Splitter) {
        let index = indexOf(splitter, this._splitter);

        return {
            before: this.contentItems[index],
            after: this.contentItems[index + 1]
        };
    }

    /**
     * Gets docking information
     * @private
     */
    private _isDocked(index?: number): number {
        if (typeof index == 'undefined') {
            let count = 0;
            for (let i = 0; i < this.contentItems.length; ++i)
                if (this._isDocked(i))
                    count++;
            return count;
        }
        if (index < this.contentItems.length) {
            if (this.contentItems[index].docker && this.contentItems[index].docker.docked) {
                return 1;
            } else {
                return 0;
            }
        }
        return 0;
    }

    /**
     * Validate if row or column has ability to dock
     * @private
     */
    _validateDocking(that?: ContentItem): void {
        that = that || this;
        const isDocked = ((<RowOrColumn>that)._isDocked() > 1) ? 1 : 0;
        let can = (that.contentItems.length - isDocked > 0);
        // REVIEW
        for (let i = 0; i < that.contentItems.length; ++i)
            if (that.contentItems[i] instanceof Stack) {
                const itemIsDocked = ((<RowOrColumn>that)._isDocked(i) >= 1) ? true : false;
                that.contentItems[i].header._setDockable(itemIsDocked || can);
                that.contentItems[i].header.setClosable(can);
            }
    }

    /**
     * Gets the minimum dimensions for the given item configuration array
     * @param item
     * @private
     */
    private _getMinimumDimensions(arr: any[]) {
        let minWidth = 0;
        let minHeight = 0;

        for (let i = 0; i < arr.length; ++i) {
            minWidth = Math.max(arr[i].minWidth || 0, minWidth);
            minHeight = Math.max(arr[i].minHeight || 0, minHeight);
        }

        return {
            horizontal: minWidth,
            vertical: minHeight
        };
    }

    /**
     * Invoked when a splitter's dragListener fires dragStart. Calculates the splitters
     * movement area once (so that it doesn't need calculating on every mousemove event)
     *
     * @param   {Splitter} splitter
     *
     * @returns {void}
     */
    private _onSplitterDragStart(splitter: Splitter): void {
        let items = this._getItemsForSplitter(splitter),
            minSize = this.layoutManager.config.dimensions[this.__isColumn ? 'minItemHeight' : 'minItemWidth'];

        let beforeMinDim = this._getMinimumDimensions(items.before.config.content);
        let beforeMinSize = this.__isColumn ? beforeMinDim.vertical : beforeMinDim.horizontal;

        let afterMinDim = this._getMinimumDimensions(items.after.config.content);
        let afterMinSize = this.__isColumn ? afterMinDim.vertical : afterMinDim.horizontal;

        this._splitterPosition = 0;
        this._splitterMinPosition = -1 * (items.before.element[this._dimension]() - (beforeMinSize || minSize));
        this._splitterMaxPosition = items.after.element[this._dimension]() - (afterMinSize || minSize);
    }

    /**
     * Invoked when a splitter's DragListener fires drag. Updates the splitters DOM position,
     * but not the sizes of the elements the splitter controls in order to minimize resize events
     *
     * @param   {Splitter} splitter
     * @param   {number} offsetX  Relative pixel values to the splitters original position. Can be negative
     * @param   {number} offsetY  Relative pixel values to the splitters original position. Can be negative
     *
     * @returns {void}
     */
    private _onSplitterDrag(splitter: Splitter, offsetX: number, offsetY: number): void {
        let offset = this.__isColumn ? offsetY : offsetX;

        if (offset > this._splitterMinPosition && offset < this._splitterMaxPosition) {
            this._splitterPosition = offset;
            splitter.element.css(this.__isColumn ? 'top' : 'left', offset);
        }
    }

    /**
     * Invoked when a splitter's DragListener fires dragStop. Resets the splitters DOM position,
     * and applies the new sizes to the elements before and after the splitter and their children
     * on the next animation frame
     *
     * @param   {Splitter} splitter
     *
     * @returns {void}
     */
    private _onSplitterDragStop(splitter: Splitter): void {

        let items = this._getItemsForSplitter(splitter),
            sizeBefore = items.before.element[this._dimension](),
            sizeAfter = items.after.element[this._dimension](),
            splitterPositionInRange = (this._splitterPosition + sizeBefore) / (sizeBefore + sizeAfter),
            totalRelativeSize = items.before.config[this._dimension] + items.after.config[this._dimension];

        items.before.config[this._dimension] = splitterPositionInRange * totalRelativeSize;
        items.after.config[this._dimension] = (1 - splitterPositionInRange) * totalRelativeSize;

        splitter.element.css({
            'top': 0,
            'left': 0
        });

        animFrame(fnBind(this.callDownwards, this, 'setSize'));
    }

    setActiveContentItem(_contentItem: IContentItem): void {}
    getActiveContentItem():IContentItem {return undefined;}
}
