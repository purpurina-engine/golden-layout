import IContentItem from "./IContentItem";
import IHeader from "./IHeader";

 export default interface ITab {

    /**
     * True if this tab is the selected tab
     */
    readonly isActive: boolean;

    /**
     * A reference to the header this tab is a child of
     */
    readonly header: IHeader;

    /**
     * A reference to the content item this tab relates to
     */
    readonly contentItem: IContentItem;

    /**
     * The tabs outer (jQuery) DOM element
     */
    readonly element: JQuery;

    /**
     * The (jQuery) DOM element containing the title
     */
    readonly titleElement: JQuery;

    /**
     * The (jQuery) DOM element that closes the tab
     */
    readonly closeElement: JQuery;

    /**
     * Sets the tab's title. Does not affect the contentItem's title!
     * @param title The new title
     */
    setTitle(title: string): void;

    /**
     * Sets this tab's active state. To programmatically switch tabs, use header.setActiveContentItem( item ) instead.
     * @param isActive Whether the tab is active
     */
    setActive(isActive: boolean): void;
}