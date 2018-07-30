import AbstractContentItem from './AbstractContentItem';
import RowOrColumn from './RowOrColumn';
import LayoutManager from '../LayoutManager';
import { ComponentConfig } from '../config/ItemConfigType';



export default class Root extends AbstractContentItem {

    private _containerElement: JQuery;
    isRoot: boolean;
    type: string;
    element: JQuery;
    childElementContainer: JQuery;


    constructor(layoutManager: LayoutManager, config: ComponentConfig, containerElement: JQuery) {

        super(layoutManager, config, null);

        this.isRoot = true;
        this.type = 'root';
        this.element = $('<div class="lm_goldenlayout lm_item lm_root"></div>');
        this.childElementContainer = this.element;
        this._containerElement = containerElement;
        this._containerElement.append(this.element);
    }

    addChild(contentItem) {
        if (this.contentItems.length > 0) {
            throw new Error('Root node can only have a single child');
        }

        contentItem = this.layoutManager._$normalizeContentItem(contentItem, this);
        this.childElementContainer.append(contentItem.element);
        AbstractContentItem.prototype.addChild.call(this, contentItem);

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

    _$highlightDropZone(x: number, y: number, area) {
        this.layoutManager.tabDropPlaceholder.remove();
        //AbstractContentItem.prototype._$highlightDropZone.apply(this, arguments);
        super._$highlightDropZone(x, y, area);
    }

    _$onDrop(contentItem, area) {
        let stack;

        if (contentItem.isComponent) {
            stack = this.layoutManager.createContentItem({
                type: 'stack',
                header: contentItem.config.header || {}
            }, this);
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
                }, this)
                stack.addChild(contentItem)
                contentItem = stack
            }

            let type = area.side[0] == 'x' ? 'row' : 'column';
            let dimension = area.side[0] == 'x' ? 'width' : 'height';
            let insertBefore = area.side[1] == '2';
            let column = this.contentItems[0];
            if (!(column instanceof RowOrColumn) || column.type != type) {
                let rowOrColumn = this.layoutManager.createContentItem({
                    type: type
                }, this);
                this.replaceChild(column, rowOrColumn);
                rowOrColumn.addChild(contentItem, insertBefore ? 0 : undefined, true);
                rowOrColumn.addChild(column, insertBefore ? undefined : 0, true);
                column.config[dimension] = 50;
                contentItem.config[dimension] = 50;
                rowOrColumn.callDownwards('setSize');
            } else {
                let sibbling = column.contentItems[insertBefore ? 0 : column.contentItems.length - 1]
                column.addChild(contentItem, insertBefore ? 0 : undefined, true);
                sibbling.config[dimension] *= 0.5;
                contentItem.config[dimension] = sibbling.config[dimension];
                column.callDownwards('setSize');
            }
        }
    }
}
