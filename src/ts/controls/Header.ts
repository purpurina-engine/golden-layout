import GoldenLayout from '../GoldenLayout';
import EventEmitter from '../utils/EventEmitter';
import Tab from './Tab'
import HeaderButton from './HeaderButton';
import ContentItem from '../items/ContentItem';
import Stack from '../items/Stack';

import {
    fnBind
} from '../utils/utils'
import { HeaderPosition } from '../Commons';


const _template = [
    '<div class="lm_header">',
    '<ul class="lm_tabs"></ul>',
    '<ul class="lm_controls"></ul>',
    '<ul class="lm_tabdropdown_list"></ul>',
    '</div>'
].join('')

/**
 * This class represents a header above a Stack ContentItem.
 *
 * @param {GoldenLayouts} layoutManager
 * @param {ContentItem} parent
 */
export default class Header extends EventEmitter {

    private _lastVisibleTabIndex: number;
    private _tabControlOffset: number;
    private _canDestroy: boolean;
    private layoutManager: GoldenLayout;
    private hideAdditionalTabsDropdown: any;

    private tabsContainer: JQuery;
    private tabDropdownContainer: JQuery;
    private _controlsContainer: JQuery;
    private _tabs: Tab[];

    private tabsMarkedForRemoval: Tab[];
    private _activeContentItem: ContentItem = null;

    private closeButton: HeaderButton = null;
    private dockButton: HeaderButton = null;
    private tabDropdownButton: HeaderButton = null;

    parent: Stack;
    element: JQuery;

    public get tabs(): Tab[] {
        return this._tabs;
    }

    public get activeContentItem(): ContentItem {
        return this._activeContentItem;
    }

    public get canDestroy(): boolean {
        return this._canDestroy;
    }

    public get controlsContainer(): JQuery {
        return this._controlsContainer;
    }


    constructor(layoutManager: GoldenLayout, parent: Stack) {

        super();

        this.layoutManager = layoutManager;
        this.element = $(_template);

        if (this.layoutManager.config.settings.selectionEnabled === true) {
            this.element.addClass('lm_selectable');
            this.element.on('click touchstart', fnBind(this._onHeaderClick, this));
        }

        this.tabsContainer = this.element.find('.lm_tabs');
        this.tabDropdownContainer = this.element.find('.lm_tabdropdown_list');
        this.tabDropdownContainer.hide();
        this._controlsContainer = this.element.find('.lm_controls');
        this.parent = parent;
        this.parent.on('resize', this._updateTabSizes, this);
        this._tabs = [];
        this.tabsMarkedForRemoval = [];
        this._activeContentItem = null;
        this.closeButton = null;
        this.dockButton = null;
        this.tabDropdownButton = null;
        this.hideAdditionalTabsDropdown = fnBind(this._hideAdditionalTabsDropdown, this);

        $(document).mouseup(this.hideAdditionalTabsDropdown);

        this._lastVisibleTabIndex = -1;
        this._tabControlOffset = this.layoutManager.config.settings.tabControlOffset;
        this._createControls();
    }

    /**
     * Creates a new tab and associates it with a contentItem
     *
     * @param    {ContentItem} contentItem
     * @param    {number} index The position of the tab
     *
     * @returns {void}
     */
    createTab(contentItem: ContentItem, index?: number): void {
        let tab;

        //If there's already a tab relating to the
        //content item, don't do anything
        for (let i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].contentItem === contentItem) {
                return;
            }
        }

        tab = new Tab(this, contentItem);

        if (this.tabs.length === 0) {
            this.tabs.push(tab);
            this.tabsContainer.append(tab.element);
            return;
        }

        if (index === undefined) {
            index = this.tabs.length;
        }

        if (index > 0) {
            this.tabs[index - 1].element.after(tab.element);
        } else {
            this.tabs[0].element.before(tab.element);
        }

        this.tabs.splice(index, 0, tab);
        this._updateTabSizes();
    }

    /**
     * Finds a tab based on the contentItem its associated with and removes it.
     *
     * @param    {ContentItem} contentItem
     *
     * @returns {void}
     */
    removeTab(contentItem: ContentItem): void {
        for (let i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].contentItem === contentItem) {
                this.tabs[i]._$destroy();
                this.tabs.splice(i, 1);
                return;
            }
        }

        for (let i = 0; i < this.tabsMarkedForRemoval.length; i++) {
            if (this.tabsMarkedForRemoval[i].contentItem === contentItem) {
                this.tabsMarkedForRemoval[i]._$destroy();
                this.tabsMarkedForRemoval.splice(i, 1);
                return;
            }
        }


        throw new Error('contentItem is not controlled by this header');
    }

    /**
     * Finds a tab based on the contentItem its associated with and marks it
     * for removal, hiding it too.
     *
     * @param    {ContentItem} contentItem
     *
     * @returns {void}
     */
    hideTab(contentItem: ContentItem): void {
        for (let i = 0; i < this.tabs.length; i++) {
            if (this.tabs[i].contentItem === contentItem) {
                this.tabs[i].element.hide()
                this.tabsMarkedForRemoval.push(this.tabs[i])
                this.tabs.splice(i, 1);
                return;
            }
        }

        throw new Error('contentItem is not controlled by this header');
    }

    /**
     * The programmatical equivalent of clicking a Tab.
     *
     * @param {ContentItem} contentItem
     */
    setActiveContentItem(contentItem: ContentItem) {
        let isActive: boolean, activeTab: Tab;

        if (this.activeContentItem === contentItem)
            return;

        for (let i = 0; i < this.tabs.length; i++) {
            isActive = this.tabs[i].contentItem === contentItem;
            this.tabs[i].setActive(isActive);
            if (isActive === true) {
                this._activeContentItem = contentItem;
                this.parent.config.activeItemIndex = i;
            }
        }

        if (this.layoutManager.config.settings.reorderOnTabMenuClick) {
            /**
             * If the tab selected was in the dropdown, move everything down one to make way for this one to be the first.
             * This will make sure the most used tabs stay visible.
             */
            if (this._lastVisibleTabIndex !== -1 && this.parent.config.activeItemIndex > this._lastVisibleTabIndex) {
                activeTab = this.tabs[this.parent.config.activeItemIndex];
                for (let i = this.parent.config.activeItemIndex; i > 0; i--) {
                    this.tabs[i] = this.tabs[i - 1];
                }
                this.tabs[0] = activeTab;
                this.parent.config.activeItemIndex = 0;
            }
        }

        this._updateTabSizes();
        this.parent.emitBubblingEvent('stateChanged');
    }

    /**
     * Programmatically operate with header position.
     *
     * @param {string} position one of ('top','left','right','bottom') to set or empty to get it.
     *
     * @returns {string} previous header position
     */
    position(position?: HeaderPosition): HeaderPosition {
        let previous: HeaderPosition;
        let showing = this.parent.headerConfig.show;
        if (this.parent.docker && this.parent.docker.docked) {
            throw new Error('Can\'t change header position in docked stack');
        }
        if (showing && !this.parent.side) {
            previous = 'top';
        }

        if (showing !== undefined && this.parent.headerConfig.oldPosition !== position) {
            this.parent.headerConfig.oldPosition = position;
            this.parent._setupHeaderPosition();
        }
        return previous;
    }

    /**
     * Programmatically set closability.
     *
     * @package private
     * @param {boolean} isClosable Whether to enable/disable closability.
     *
     * @returns {boolean} Whether the action was successful
     */
    setClosable(isClosable: boolean): boolean {
        this._canDestroy = isClosable || this.tabs.length > 1;
        if (this.closeButton && this.isClosable()) {
            this.closeButton.element[isClosable ? "show" : "hide"]();
            return true;
        }

        return false;
    }

    /**
     * Programmatically set ability to dock.
     *
     * @package private
     * @param {boolean} isDockable Whether to enable/disable ability to dock.
     *
     * @returns {boolean} Whether the action was successful
     */
    _setDockable(isDockable: boolean): boolean {
        if (this.dockButton && this.parent.header && this.parent.headerConfig.dock) {
            this.dockButton.element.toggle(!!isDockable);
            return true;
        }
        return false;
    }

    /**
     * Destroys the entire header
     *
     * @package private
     *
     * @returns {void}
     */
    _$destroy(): void {
        this.emit('destroy', this);

        for (let i = 0; i < this.tabs.length; i++) {
            this.tabs[i]._$destroy();
        }
        $(document).off('mouseup', this.hideAdditionalTabsDropdown);
        this.element.remove();
    }

    /**
     * get settings from header
     *
     * @returns {string} when exists
     */
    private _getHeaderSetting(name: string): string {
        if (name in this.parent.headerConfig) {
            let value = this.parent.headerConfig[name];
            if (typeof value === 'boolean') {
                return (value) ? 'true' : 'false';
            } else {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Creates the popout, maximise and close buttons in the header's top right corner
     *
     * @returns {void}
     */
    private _createControls(): void {

        let label: string;
        let maximiseLabel: string;
        let minimiseLabel: string;
        let maximiseButton: HeaderButton;

        /**
         * Dropdown to show additional tabs.
         */
        const showTabDropdown = fnBind(this._showAdditionalTabsDropdown, this);
        const tabDropdownLabel = this.layoutManager.config.labels.tabDropdown;
        this.tabDropdownButton = new HeaderButton(this, tabDropdownLabel, 'lm_tabdropdown', showTabDropdown);
        this.tabDropdownButton.element.hide();

        if (this.parent.headerConfig && this.parent.headerConfig.dock) {
            let button = fnBind(this.parent.dock, this.parent);
            label = this._getHeaderSetting('dock');
            this.dockButton = new HeaderButton(this, label, 'lm_dock', button);
        }

        /**
         * Popout control to launch component in new window.
         */
        if (this._getHeaderSetting('popout')) {
            const popout = fnBind(this._onPopoutClick, this);
            label = this._getHeaderSetting('popout');
            new HeaderButton(this, label, 'lm_popout', popout);
        }

        /**
         * Maximise control - set the component to the full size of the layout
         */
        if (this._getHeaderSetting('maximise')) {
            const maximise = fnBind(this.parent.toggleMaximize, this.parent);
            maximiseLabel = this._getHeaderSetting('maximise');
            minimiseLabel = this._getHeaderSetting('minimise');
            maximiseButton = new HeaderButton(this, maximiseLabel, 'lm_maximise', maximise);

            this.parent.on('maximised', function () {
                maximiseButton.element.attr('title', minimiseLabel);
            });

            this.parent.on('minimised', function () {
                maximiseButton.element.attr('title', maximiseLabel);
            });
        }

        /**
         * Close button
         */
        if (this.isClosable()) {
            const closeStack = fnBind(this.parent.remove, this.parent);
            label = this._getHeaderSetting('close');
            this.closeButton = new HeaderButton(this, label, 'lm_close', closeStack);
        }
    }

    /**
     * Shows drop down for additional tabs when there are too many to display.
     *
     * @returns {void}
     */
    private _showAdditionalTabsDropdown(): void {
        this.tabDropdownContainer.show();
    }

    /**
     * Hides drop down for additional tabs when there are too many to display.
     *
     * @returns {void}
     */
    private _hideAdditionalTabsDropdown(e?: any): void {
        this.tabDropdownContainer.hide();
    }

    /**
     * Checks whether the header is closable based on the parent config and
     * the global config.
     *
     * @returns {boolean} Whether the header is closable.
     */
    isClosable(): boolean {
        return this.parent.config.isClosable && this.layoutManager.config.settings.showCloseIcon;
    }

    private _onPopoutClick(): void {
        if (this.layoutManager.config.settings.popoutWholeStack === true) {
            this.parent.popout();
        } else {
            this.activeContentItem.popout();
        }
    }

    /**
     * Invoked when the header's background is clicked (not it's tabs or controls)
     *
     * @param    {jQuery DOM event} event
     *
     * @returns {void}
     */
    private _onHeaderClick(event?: JQuery.Event): void {
        if (event.target === this.element[0]) {
            this.parent.select();
        }
    }

    /**
     * Pushes the tabs to the tab dropdown if the available space is not sufficient
     *
     * @returns {void}
     */
    private _updateTabSizes(showTabMenu?: boolean): void {
        if (this.tabs.length === 0) {
            return;
        }

        //Show the menu based on function argument
        this.tabDropdownButton.element.toggle(showTabMenu === true);

        let size = function (val: boolean) {
            return val ? 'width' : 'height';
        };

        this.element.css(size(!this.parent.isSided), '');
        this.element[size(this.parent.isSided)](this.layoutManager.config.dimensions.headerHeight);
        let availableWidth = this.element.outerWidth() - this.controlsContainer.outerWidth() - this._tabControlOffset,
            cumulativeTabWidth = 0,
            visibleTabWidth = 0,
            tabElement,
            j,
            marginLeft,
            overlap = 0,
            tabWidth,
            tabOverlapAllowance = this.layoutManager.config.settings.tabOverlapAllowance,
            tabOverlapAllowanceExceeded = false,
            activeIndex = (this.activeContentItem ? this.tabs.indexOf(this.activeContentItem.tab) : 0),
            activeTab = this.tabs[activeIndex];

        if (this.parent.isSided)
            availableWidth = this.element.outerHeight() - this.controlsContainer.outerHeight() - this._tabControlOffset;

        this._lastVisibleTabIndex = -1;

        for (let i = 0; i < this.tabs.length; i++) {
            tabElement = this.tabs[i].element;

            //Put the tab in the tabContainer so its true width can be checked
            this.tabsContainer.append(tabElement);
            tabWidth = tabElement.outerWidth() + parseInt(tabElement.css('margin-right'), 10);

            cumulativeTabWidth += tabWidth;

            //Include the active tab's width if it isn't already
            //This is to ensure there is room to show the active tab
            if (activeIndex <= i) {
                visibleTabWidth = cumulativeTabWidth;
            } else {
                visibleTabWidth = cumulativeTabWidth + activeTab.element.outerWidth() + parseInt(activeTab.element.css('margin-right'), 10);
            }

            // If the tabs won't fit, check the overlap allowance.
            if (visibleTabWidth > availableWidth) {

                //Once allowance is exceeded, all remaining tabs go to menu.
                if (!tabOverlapAllowanceExceeded) {

                    //No overlap for first tab or active tab
                    //Overlap spreads among non-active, non-first tabs
                    if (activeIndex > 0 && activeIndex <= i) {
                        overlap = (visibleTabWidth - availableWidth) / (i - 1);
                    } else {
                        overlap = (visibleTabWidth - availableWidth) / i;
                    }

                    //Check overlap against allowance.
                    if (overlap < tabOverlapAllowance) {
                        for (j = 0; j <= i; j++) {
                            marginLeft = (j !== activeIndex && j !== 0) ? '-' + overlap + 'px' : '';
                            this.tabs[j].element.css({
                                'z-index': i - j,
                                'margin-left': marginLeft
                            });
                        }
                        this._lastVisibleTabIndex = i;
                        this.tabsContainer.append(tabElement);
                    } else {
                        tabOverlapAllowanceExceeded = true;
                    }

                } else if (i === activeIndex) {
                    //Active tab should show even if allowance exceeded. (We left room.)
                    tabElement.css({
                        'z-index': 'auto',
                        'margin-left': ''
                    });
                    this.tabsContainer.append(tabElement);
                }

                if (tabOverlapAllowanceExceeded && i !== activeIndex) {
                    if (showTabMenu) {
                        //Tab menu already shown, so we just add to it.
                        tabElement.css({
                            'z-index': 'auto',
                            'margin-left': ''
                        });
                        this.tabDropdownContainer.append(tabElement);
                    } else {
                        //We now know the tab menu must be shown, so we have to recalculate everything.
                        this._updateTabSizes(true);
                        return;
                    }
                }

            } else {
                this._lastVisibleTabIndex = i;
                tabElement.css({
                    'z-index': 'auto',
                    'margin-left': ''
                });
                this.tabsContainer.append(tabElement);
            }
        }

    }
}
