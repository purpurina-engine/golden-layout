import IContentItem from "./IContentItem";


export default interface IRowOrColumn extends IContentItem {

    /**
    * Add a new contentItem to the Row or Column
    *
    * @param contentItem
    * @param index The position of the new item within the Row or Column.
    *                      If no index is provided the item will be added to the end
    * @param suspendResize If true the items won't be resized. This will leave the item in
    *                                 an inconsistent state and is only intended to be used if multiple
    *                                 children need to be added in one go and resize is called afterwards
    * @returns {void}
    */
    addChild(contentItem: IContentItem, index?: number, suspendResize?: boolean): void;

}