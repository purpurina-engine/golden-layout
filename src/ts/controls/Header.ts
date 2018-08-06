import ILayoutManagerInternal from '../interfaces/ILayoutManagerInternal';
import IHeader from '../interfaces/IHeader';
import ITab from '../interfaces/ITab';
import { HeaderPosition } from '../interfaces/Commons';

import EventEmitter from '../events/EventEmitter';
import Tab from './Tab'
import HeaderButton from './HeaderButton';
import ContentItem from '../items/ContentItem';
import Stack from '../items/Stack';

import {
    fnBind
} from '../utils/utils'

const _template = [
    '<div class="lm_header">',
    '<ul class="lm_tabs"></ul>',
    '<ul class="lm_controls"></ul>',
    '<ul class="lm_tabdropdown_list"></ul>',
    '</div>'
].join('')

/**
 * This class represents a header above a Stack ContentItem.
 */
export default class Header extends EventEmitter implements IHeader {

    private _lastVisibleTabIndex: number;
    private _tabControlOffset: number;
    private _canDestroy: boolean;
    private _layoutManager: ILayoutManagerInternal;
    private _hideAdditionalTabsDropdown: any;

    private _tabsContainer: JQuery;
    private _tabDropdownContainer: JQuery;
    private _controlsContainer: JQuery;
    private _tabs: Tab[];

    private _tabsMarkedForRemoval: Tab[];
    private _activeContentItem: ContentItem = null;

    private _closeButton: HeaderButton = null;
    private _dockButton: HeaderButton = null;
    private _tabDropdownButton: HeaderButton = null;

    private _parent: Stack;
    private _element: JQuery;

    public get tabs(): ITab[] {
        return this._tabs;
    }

    public get tabsContainer(): JQuery {
        return this._tabsContainer;
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

    public get layoutManager(): ILayoutManagerInternal {
        return this._layoutManager;
    }

    public get element(): JQuery {
        return this._element;
    }

    public get parent(): Stack {
        return this._parent;
    }

    /**
     * Constructor
     * @param layoutManager Reference to Layout manager
     * @param parent The Stack parent
     */
    constructor(layoutManager: ILayoutManagerInternal, parent: Stack) {

        super();

        this._layoutManager = layoutManager;
        this._element = $(_template);

        if (this.layoutManager.config.settings.selectionEnabled === true) {
            this._element.addClass('lm_selectable');
            this._element.on('click touchstart', fnBind(this._onHeaderClick, this));
        }

        this._tabsContainer = this._element.find('.lm_tabs');
        this._tabDropdownContainer = this._element.find('.lm_tabdropdown_list');
        this._tabDropdownContainer.hide();

        this._controlsContainer = this._element.find('.lm_controls');
        this._parent = parent;
        this._parent.on('resize', this._updateTabSizes, this);
        this._tabs = [];
        this._tabsMarkedForRemoval = [];
        this._activeContentItem = null;
        this._closeButton = null;
        this._dockButton = null;
        this._tabDropdownButton = null;
        this._hideAdditionalTabsDropdown = fnBind(this._hideTabsDropdown, this);

        $(document).mouseup(this._hideAdditionalTabsDropdown);

        this._lastVisibleTabIndex = -1;
        this._tabControlOffset = this.layoutManager.config.settings.tabControlOffset;
        this._createControls();
    }

    /**
     * Creates a new tab and associates it with a contentItem
     * @param    {ContentItem} contentItem
     * @param    {number} index The position of the tab
     * @returns {void}
     */
    createTab(contentItem: ContentItem, index?: number): void {


        //If there's already a tab relating to the
        //content item, don't do anything
        for (let i = 0; i < this._tabs.length; i++) {
            if (this._tabs[i].contentItem === contentItem) {
                return;
            }
        }

        let tab = new Tab(this, contentItem);

        if (this._tabs.length === 0) {
            this._tabs.push(tab);
            this.tabsContainer.append(tab.element);
            return;
        }

        if (index === undefined) {
            index = this._tabs.length;
        }

        if (index > 0) {
            this._tabs[index - 1].element.after(tab.element);
        } else {
            this._tabs[0].element.before(tab.element);
        }

        this._tabs.splice(index, 0, tab);
        this._updateTabSizes();
    }

    /**
     * Finds a tab based on the contentItem its associated with and removes it.
     * @param    {ContentItem} contentItem
     * @returns {void}
     */
    removeTab(contentItem: ContentItem): void {
        for (let i = 0; i < this._tabs.length; i++) {
            if (this._tabs[i].contentItem === contentItem) {
                this._tabs[i]._$destroy();
                this._tabs.splice(i, 1);
                return;
            }
        }

        for (let i = 0; i < this._tabsMarkedForRemoval.length; i++) {
            if (this._tabsMarkedForRemoval[i].contentItem === contentItem) {
                this._tabsMarkedForRemoval[i]._$destroy();
                this._tabsMarkedForRemoval.splice(i, 1);
                return;
            }
        }


        throw new Error('contentItem is not controlled by this header');
    }

    /**
     * Finds a tab based on the contentItem its associated with and marks it
     * for removal, hiding it too.
     * @param    {ContentItem} contentItem
     * @returns {void}
     */
    hideTab(contentItem: ContentItem): void {
        for (let i = 0; i < this._tabs.length; i++) {
            if (this._tabs[i].contentItem === contentItem) {
                this._tabs[i].element.hide()
                this._tabsMarkedForRemoval.push(this._tabs[i])
                this._tabs.splice(i, 1);
                return;
            }
        }

        throw new Error('contentItem is not controlled by this header');
    }

    /**
     * The programmatical equivalent of clicking a Tab.
     * @param {ContentItem} contentItem
     */
    setActiveContentItem(contentItem: ContentItem) {

        if (this.activeContentItem === contentItem)
            return;

        for (let i = 0; i < this._tabs.length; i++) {
            const isActive = this._tabs[i].contentItem === contentItem;
            this._tabs[i].setActive(isActive);
            if (isActive === true) {
                this._activeContentItem = contentItem;
                this._parent.config.activeItemIndex = i;
            }
        }

        if (this.layoutManager.config.settings.reorderOnTabMenuClick) {
            /**
             * If the tab selected was in the dropdown, move everything down one to make way for this one to be the first.
             * This will make sure the most used tabs stay visible.
             */
            if (this._lastVisibleTabIndex !== -1 && this._parent.config.activeItemIndex > this._lastVisibleTabIndex) {
                const activeTab = this._tabs[this._parent.config.activeItemIndex];
                for (let i = this._parent.config.activeItemIndex; i > 0; i--) {
                    this._tabs[i] = this._tabs[i - 1];
                }
                this._tabs[0] = activeTab;
                this._parent.config.activeItemIndex = 0;
            }
        }

        this._updateTabSizes();
        this._parent.emitBubblingEvent('stateChanged');
    }

    /**
     * Programmatically operate with header position.
     * @param {string} position one of ('top','left','right','bottom') to set or empty to get it.
     * @returns {string} previous header position
     */
    position(position?: HeaderPosition): HeaderPosition {
        let previous: HeaderPosition;
        let showing = this._parent.headerConfig.show;
        if (this._parent.docker && this._parent.docker.docked) {
            throw new Error('Can\'t change header position in docked stack');
        }
        if (showing && !this._parent.side) {
            previous = 'top';
        }

        if (showing !== undefined && this._parent.headerConfig.oldPosition !== position) {
            this._parent.headerConfig.oldPosition = position;
            this._parent._setupHeaderPosition();
        }
        return previous;
    }

    /**
     * Programmatically set closability.
     * @package private
     * @param {boolean} isClosable Whether to enable/disable closability.
     * @returns {boolean} Whether the action was successful
     */
    setClosable(isClosable: boolean): boolean {
        this._canDestroy = isClosable || this._tabs.length > 1;
        if (this._closeButton && this.isClosable()) {
            this._closeButton.element[isClosable ? "show" : "hide"]();
            return true;
        }

        return false;
    }

    /**
     * Programmatically set ability to dock.
     * @package private
     * @param {boolean} isDockable Whether to enable/disable ability to dock.
     * @returns {boolean} Whether the action was successful
     */
    _setDockable(isDockable: boolean): boolean {
        if (this._dockButton && this._parent.header && this._parent.headerConfig.dock) {
            this._dockButton.element.toggle(!!isDockable);
            return true;
        }
        return false;
    }

    /**
     * Destroys the entire header
     * @package private
     * @returns {void}
     */
    _$destroy(): void {
        this.emit('destroy', this);

        for (let i = 0; i < this._tabs.length; i++) {
            this._tabs[i]._$destroy();
        }
        $(document).off('mouseup', this._hideAdditionalTabsDropdown);
        this._element.remove();
    }

    /**
     * Get settings from header
     * @returns {string} when exists
     */
    private _getHeaderSetting(name: string): string {
        if (name in this._parent.headerConfig) {
            let value = this._parent.headerConfig[name];
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
        this._tabDropdownButton = new HeaderButton(this, tabDropdownLabel, 'lm_tabdropdown', showTabDropdown);
        this._tabDropdownButton.element.hide();

        if (this._parent.headerConfig && this._parent.headerConfig.dock) {
            let button = fnBind(this._parent.dock, this._parent);
            label = this._getHeaderSetting('dock');
            this._dockButton = new HeaderButton(this, label, 'lm_dock', button);
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
            const maximise = fnBind(this._parent.toggleMaximise, this._parent);
            maximiseLabel = this._getHeaderSetting('maximise');
            minimiseLabel = this._getHeaderSetting('minimise');
            maximiseButton = new HeaderButton(this, maximiseLabel, 'lm_maximise', maximise);

            this._parent.on('maximised', function () {
                maximiseButton.element.attr('title', minimiseLabel);
            });

            this._parent.on('minimised', function () {
                maximiseButton.element.attr('title', maximiseLabel);
            });
        }

        /**
         * Close button
         */
        if (this.isClosable()) {
            const closeStack = fnBind(this._parent.remove, this._parent);
            label = this._getHeaderSetting('close');
            this._closeButton = new HeaderButton(this, label, 'lm_close', closeStack);
        }
    }

    /**
     * Shows drop down for additional tabs when there are too many to display.
     * @returns {void}
     */
    private _showAdditionalTabsDropdown(): void {
        this._tabDropdownContainer.show();
    }

    /**
     * Hides drop down for additional tabs when there are too many to display.
     * @returns {void}
     */
    private _hideTabsDropdown(_e?: any): void {
        this._tabDropdownContainer.hide();
    }

    /**
     * Checks whether the header is closable based on the parent config and
     * the global config.
     * @returns {boolean} Whether the header is closable.
     */
    isClosable(): boolean {
        return this._parent.config.isClosable && this.layoutManager.config.settings.showCloseIcon;
    }

    private _onPopoutClick(): void {
        if (this.layoutManager.config.settings.popoutWholeStack === true) {
            this._parent.popout();
        } else {
            this.activeContentItem.popout();
        }
    }

    /**
     * Invoked when the header's background is clicked (not it's tabs or controls)
     * @param    {JQuery.Event} event
     * @returns {void}
     */
    private _onHeaderClick(event?: JQuery.Event): void {
        if (event.target === this._element[0]) {
            this._parent.select();
        }
    }

    /**
     * Pushes the tabs to the tab dropdown if the available space is not sufficient
     * @returns {void}
     */
    private _updateTabSizes(showTabMenu?: boolean): void {
        if (this._tabs.length === 0) {
            return;
        }

        //Show the menu based on function argument
        this._tabDropdownButton.element.toggle(showTabMenu === true);

        let size = function (val: boolean) {
            return val ? 'width' : 'height';
        };

        this._element.css(size(!this._parent.isSided), '');
        this._element[size(this._parent.isSided)](this.layoutManager.config.dimensions.headerHeight);
        let availableWidth = this._element.outerWidth() - this.controlsContainer.outerWidth() - this._tabControlOffset;
        let tabOverlapAllowance = this.layoutManager.config.settings.tabOverlapAllowance;
        let tabOverlapAllowanceExceeded = false;
        
        const activeIndex = (this.activeContentItem ? this._tabs.indexOf(this.activeContentItem.tab as Tab) : 0);
        let activeTab = this._tabs[activeIndex];

        if (this._parent.isSided) {
            availableWidth = this._element.outerHeight() - this.controlsContainer.outerHeight() - this._tabControlOffset;
        }

        this._lastVisibleTabIndex = -1;
        let cumulativeTabWidth = 0;
        let visibleTabWidth = 0;
        let overlap = 0;

        for (let i = 0; i < this._tabs.length; i++) {
            const tabElement = this._tabs[i].element;

            //Put the tab in the tabContainer so its true width can be checked
            this.tabsContainer.append(tabElement);
            const tabWidth = tabElement.outerWidth() + parseInt(tabElement.css('margin-right'), 10);

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
                        for (let j = 0; j <= i; j++) {
                            const marginLeft = (j !== activeIndex && j !== 0) ? '-' + overlap + 'px' : '';
                            this._tabs[j].element.css({
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
                        'margin-left': '0'
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
                        this._tabDropdownContainer.append(tabElement);
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
