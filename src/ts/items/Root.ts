import ContentItem from './ContentItem';
import RowOrColumn from './RowOrColumn';
import { ItemConfig } from '../config/ItemConfigType';
import GoldenLayout from '../GoldenLayout';
import { ContentArea, ContentItemType } from '../Commons';
import Stack from './Stack';



export default class Root extends ContentItem {

    private _containerElement: JQuery;
    
    constructor(layoutManager: GoldenLayout, config: ItemConfig, containerElement: JQuery) {

        super(layoutManager, config, null);

        this._isRoot = true;
        this._type = 'root';
        this._element = $('<div class="lm_goldenlayout lm_item lm_root"></div>');
        this._childElementContainer = this.element;
        this._containerElement = containerElement;
        this._containerElement.append(this.element);
    }

    addChild(contentItem: ContentItem) {
        if (this.contentItems.length > 0) {
            throw new Error('Root node can only have a single child');
        }

        contentItem = this.layoutManager._$normalizeContentItem(contentItem, this);
        this.childElementContainer.append(contentItem.element);
        //AbstractContentItem.prototype.addChild.call(this, contentItem);
        super.addChild(contentItem);

        this.callDownwards('setSize');
        this.emitBubblingEvent('stateChanged');
    }

    setSize(width?: number, height?: number): void {
        width = (typeof width === 'undefined') ? this._containerElement.width() : width;
        height = (typeof height === 'undefined') ? this._containerElement.height() : height;

        this.element.width(width);
        this.element.height(height);

        /*
         * Root can be empty
         */
        if (this.contentItems[0]) {
            this.contentItems[0].element.width(width);
            this.contentItems[0].element.height(height);
        }
    }

    _$highlightDropZone(x: number, y: number, area: ContentArea) {
        this.layoutManager.tabDropPlaceholder.remove();
        //AbstractContentItem.prototype._$highlightDropZone.apply(this, arguments);
        super._$highlightDropZone(x, y, area);
    }

    _$onDrop(contentItem: ContentItem, area?: ContentArea) {
        let stack: Stack;

        if (contentItem.isComponent) {
            stack = this.layoutManager.createContentItem({
                type: 'stack',
                header: contentItem.config.header || {}
            }, this) as Stack;
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
                stack = this.layoutManager.createContentItem({
                    type: 'stack'
                }, this) as Stack;
                stack.addChild(contentItem)
                contentItem = stack
            }

            let type: ContentItemType = area.side[0] == 'x' ? 'row' : 'column';
            let dimension = area.side[0] == 'x' ? 'width' : 'height';
            let insertBefore = area.side[1] == '2';
            let column = this.contentItems[0];

            if (!(column instanceof RowOrColumn) || column.type != type) {
                let rowOrColumn = this.layoutManager.createContentItem({
                    type: type
                }, this);
                this.replaceChild(column, rowOrColumn);
                rowOrColumn.addChild(contentItem, insertBefore ? 0 : undefined);
                rowOrColumn.addChild(column, insertBefore ? undefined : 0);
                column.config[dimension] = 50;
                contentItem.config[dimension] = 50;
                rowOrColumn.callDownwards('setSize');
            } else {
                let sibling = column.contentItems[insertBefore ? 0 : column.contentItems.length - 1]
                column.addChild(contentItem, insertBefore ? 0 : undefined, true);
                sibling.config[dimension] *= 0.5;
                contentItem.config[dimension] = sibling.config[dimension];
                column.callDownwards('setSize');
            }
        }
    }
}
