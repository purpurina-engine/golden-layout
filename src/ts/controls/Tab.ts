import ContentItem from '../items/ContentItem';
import GoldenLayout from '../GoldenLayout';
import DragListener from '../utils/DragListener';
import DragProxy from './DragProxy';
import Header from './Header';
import {
    fnBind,
    stripTags
} from '../utils/utils'
import Component from '../items/Component';


/**
 * Represents an individual tab within a Stack's header
 *
 * @param {Header} header
 * @param {AbstractContentItem} contentItem
 *
 * @constructor
 */

const _template = '<li class="lm_tab"><i class="lm_left"></i>' +
    '<span class="lm_title"></span><div class="lm_close_tab"></div>' +
    '<i class="lm_right"></i></li>'

export default class Tab {

    private _layoutManager: GoldenLayout;
    private _dragListener: DragListener;
    private _onTabClickFn: any;
    private _onCloseClickFn: any;

    private header: Header;
    private _contentItem: ContentItem;

    private titleElement: JQuery;
    private closeElement: JQuery;
    private isActive: boolean;

    element: JQuery;

    public get contentItem(): ContentItem {
        return this._contentItem;
    }

    public set contentItem(value: ContentItem) {
        this._contentItem = value;
    }

    constructor(header: Header, contentItem: ContentItem) {
        this.header = header;
        this._contentItem = contentItem;
        this.element = $(_template);
        this.titleElement = this.element.find('.lm_title');
        this.closeElement = this.element.find('.lm_close_tab');
        this.closeElement[contentItem.config.isClosable ? 'show' : 'hide']();
        this.isActive = false;

        this.setTitle(contentItem.config.title);
        this._contentItem.on('titleChanged', this.setTitle, this);

        this._layoutManager = this.contentItem.layoutManager;

        if (
            this._layoutManager.config.settings.reorderEnabled === true &&
            contentItem.config.reorderEnabled === true
        ) {
            this._dragListener = new DragListener(this.element);
            this._dragListener.on('dragStart', this._onDragStart, this);
            this.contentItem.on('destroy', this._dragListener.destroy, this._dragListener);
        }

        this._onTabClickFn = fnBind(this._onTabClick, this);
        this._onCloseClickFn = fnBind(this._onCloseClick, this);

        this.element.on('mousedown touchstart', this._onTabClickFn);

        if (this.contentItem.config.isClosable) {
            this.closeElement.on('click touchstart', this._onCloseClickFn);
            this.closeElement.on('mousedown', this._onCloseMousedown);
        } else {
            this.closeElement.remove();
        }

        this.contentItem.tab = this;
        this.contentItem.emit('tab', this);
        this.contentItem.layoutManager.emit('tabCreated', this);

        if (this.contentItem.isComponent) {
            (<Component>this.contentItem).container.tab = this;
            (<Component>this.contentItem).container.emit('tab', this);
        }
    }


    /**
     * Sets the tab's title to the provided string and sets
     * its title attribute to a pure text representation (without
     * html tags) of the same string.
     *
     * @public
     * @param {string} title can contain html
     */
    setTitle(title: string): void {
        this.element.attr('title', stripTags(title));
        this.titleElement.html(title);
    }

    /**
     * Sets this tab's active state. To programmatically
     * switch tabs, use header.setActiveContentItem( item ) instead.
     *
     * @public
     * @param {boolean} isActive
     */
    setActive(isActive: boolean): void {
        if (isActive === this.isActive) {
            return;
        }
        this.isActive = isActive;

        if (isActive) {
            this.element.addClass('lm_active');
        } else {
            this.element.removeClass('lm_active');
        }
    }

    /**
     * Destroys the tab
     *
     * @private
     * @returns {void}
     */
    _$destroy(): void {
        this.element.off('mousedown touchstart', this._onTabClickFn);
        this.closeElement.off('click touchstart', this._onCloseClickFn);
        if (this._dragListener) {
            this.contentItem.off('destroy', this._dragListener.destroy, this._dragListener);
            this._dragListener.off('dragStart', this._onDragStart);
            this._dragListener = null;
        }
        this.element.remove();
    }

    /**
     * Callback for the DragListener
     *
     * @param   {number} x The tabs absolute x position
     * @param   {number} y The tabs absolute y position
     *
     * @private
     * @returns {void}
     */
    private _onDragStart(x: number, y: number): void {
        if (!this.header.canDestroy)
            return null;

        if (this.contentItem.parent.isMaximized === true) {
            this.contentItem.parent.toggleMaximize();
        }
        new DragProxy(
            x,
            y,
            this._dragListener,
            this._layoutManager,
            this.contentItem,
            this.header.parent
        );
    }

    /**
     * Callback when the tab is clicked
     *
     * @param {JQuery.Event} event
     *
     * @private
     * @returns {void}
     */
    private _onTabClick(event: JQuery.Event): void {
        // left mouse button or tap
        if (event.button === 0 || event.type === 'touchstart') {
            this.header.parent.setActiveContentItem(this.contentItem);

            // middle mouse button
        } else if (event.button === 1 && this.contentItem.config.isClosable) {
            this._onCloseClick(event);
        }
    }

    /**
     * Callback when the tab's close button is
     * clicked
     *
     * @param   {JQuery.Event} event
     *
     * @private
     * @returns {void}
     */
    private _onCloseClick(event: JQuery.Event): void {
        event.stopPropagation();
        if (!this.header.canDestroy)
            return;
        this.header.parent.removeChild(this.contentItem);
    }

    /**
     * Callback to capture tab close button mousedown
     * to prevent tab from activating.
     *
     * @param {JQuery.Event} event
     *
     * @private
     * @returns {void}
     */
    private _onCloseMousedown(event: JQuery.Event): void {
        event.stopPropagation();
    }
}
