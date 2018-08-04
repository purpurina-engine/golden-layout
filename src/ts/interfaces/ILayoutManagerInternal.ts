import ILayoutManager from "./ILayoutManager";
import IContentItem from "./IContentItem";
import { ContentArea } from "./Commons";
import { ItemConfigType } from "../config";
import DropTargetIndicator from "../dragDrop/DropTargetIndicator";
import TransitionIndicator from "../controls/TransitionIndicator";

/**
 * Internal implementation to avoid circular references.
 */
export default interface ILayoutManagerInternal extends ILayoutManager {
    readonly dropTargetIndicator: DropTargetIndicator;
    readonly tabDropPlaceholder: JQuery;
    readonly transitionIndicator: TransitionIndicator;
    getAreaAt(x: number, y: number): ContentArea;
    _$maximiseItem(contentItem: IContentItem): void;
    _$minimiseItem(contentItem: IContentItem): void;
    _$calculateItemAreas(ignoreContentItem?: IContentItem): void;
    _$normalizeContentItem(contentItemOrConfig: ItemConfigType | IContentItem, parent?: IContentItem): IContentItem;
}