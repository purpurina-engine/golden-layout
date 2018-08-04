import ILayoutManagerInternal from '../interfaces/ILayoutManagerInternal';
import IRowOrColumn from '../interfaces/IRowOrColumn';
import ContentItem from './ContentItem';
import { ContentArea, ContentItemType } from '../interfaces/Commons';
import { ItemConfig } from '../config/ItemConfigType';
import { isRowOrColumn } from '../utils/itemFunctions';


export default class Root extends ContentItem {

    private _containerElement: JQuery;

    constructor(layoutManager: ILayoutManagerInternal, config: ItemConfig, containerElement: JQuery) {

        super(layoutManager, config, null);

        this._isRoot = true;
        this._type = 'root';
        this._element = $('<div class="lm_goldenlayout lm_item lm_root"></div>');
        this._childElementContainer = this._element;
        this._containerElement = containerElement;
        this._containerElement.append(this._element);
    }

    addChild(contentItem: ContentItem) {
        if (this._contentItems.length > 0) {
            throw new Error('Root node can only have a single child');
        }

        contentItem = this._layoutManager._$normalizeContentItem(contentItem, this) as ContentItem;
        this._childElementContainer.append(contentItem.element);
        //AbstractContentItem.prototype.addChild.call(this, contentItem);
        super.addChild(contentItem);

        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
    }

    setSize(width?: number, height?: number): void {
        width = (typeof width === 'undefined') ? this._containerElement.width() : width;
        height = (typeof height === 'undefined') ? this._containerElement.height() : height;

        this._element.width(width);
        this._element.height(height);

        /*
         * Root can be empty
         */
        if (this._contentItems[0]) {
            this._contentItems[0].element.width(width);
            this._contentItems[0].element.height(height);
        }
    }

    _$highlightDropZone(x: number, y: number, area: ContentArea) {
        this._layoutManager.tabDropPlaceholder.remove();
        //AbstractContentItem.prototype._$highlightDropZone.apply(this, arguments);
        super._$highlightDropZone(x, y, area);
    }

    _$onDrop(contentItem: ContentItem, area?: ContentArea) {
        if (contentItem.isComponent) {
            const stack = this._layoutManager.createContentItem({
                type: 'stack',
                header: contentItem.config.header || {}
            }, this) as ContentItem;
            stack._$init();
            stack.addChild(contentItem);
            contentItem = stack;
        }

        if (!this.contentItems.length) {
            this.addChild(contentItem);
        } else {
            /*
             * If the contentItem that's being dropped is not dropped on a Stack (cases which just passed above and 
             * which would wrap the contentItem in a Stack) we need to check whether contentItem is a RowOrColumn.
             * If it is, we need to re-wrap it in a Stack like it was when it was dragged by its Tab (it was dragged!).
             */
            if (contentItem.config.type === 'row' || contentItem.config.type === 'column') {
                const stack = this._layoutManager.createContentItem({
                    type: 'stack'
                }, this) as ContentItem;
                stack.addChild(contentItem)
                contentItem = stack;
            }

            const type: ContentItemType = area.side[0] == 'x' ? 'row' : 'column';
            const dimension = area.side[0] == 'x' ? 'width' : 'height';
            const insertBefore = area.side[1] == '2';
            const column = this._contentItems[0];

            if (column.type != type && !isRowOrColumn(column)) { // !(column instanceof RowOrColumn)
                let rowOrColumn = this._layoutManager.createContentItem({
                    type: type
                }, this);
                this.replaceChild(column, rowOrColumn);
                rowOrColumn.addChild(contentItem, insertBefore ? 0 : undefined);
                rowOrColumn.addChild(column, insertBefore ? undefined : 0);
                column.config[dimension] = 50;
                contentItem.config[dimension] = 50;
                rowOrColumn.callDownwards('setSize');
            } else {
                const sibling = column.contentItems[insertBefore ? 0 : column.contentItems.length - 1];
                (<IRowOrColumn>column).addChild(contentItem, insertBefore ? 0 : undefined, true);
                sibling.config[dimension] *= 0.5;
                contentItem.config[dimension] = sibling.config[dimension];
                column.callDownwards('setSize');
            }
        }
    }

    setActiveContentItem(_contentItem: ContentItem): void {}
    getActiveContentItem():ContentItem {return null;}

    
}
