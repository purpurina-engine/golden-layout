import ITab from "./ITab";
import IContentItem from "./IContentItem";
import ILayoutManager from "./ILayoutManager";

 export default interface IHeader {
    /**
     * A reference to the LayoutManager instance
     */
    readonly layoutManager: ILayoutManager;

    /**
     * A reference to the Stack this Header belongs to
     */
    readonly parent: IContentItem;

    /**
     * An array of the Tabs within this header
     */
    readonly tabs: ITab[];

    /**
     * The currently selected activeContentItem
     */
    readonly activeContentItem: IContentItem;

    /**
     * The outer (jQuery) DOM element of this Header
     */
    readonly element: JQuery;

    /**
     * The (jQuery) DOM element containing the tabs
     */
    readonly tabsContainer: JQuery;

    /**
     * The (jQuery) DOM element containing the close, maximise and popout button
     */
    readonly controlsContainer: JQuery;

    /**
     * Hides the currently selected contentItem, shows the specified one and highlights its tab.
     * @param contentItem The content item that will be selected
     */
    setActiveContentItem(contentItem: IContentItem): void;

    /**
     * Creates a new tab and associates it with a content item
     * @param contentItem The content item the tab will be associated with
     * @param index A zero based index, specifying the position of the new tab
     */
    createTab(contentItem: IContentItem, index?: number): void;

    /**
     * Finds a tab by its contentItem and removes it
     * @param contentItem The content item the tab is associated with
     */
    removeTab(contentItem: IContentItem): void;
}