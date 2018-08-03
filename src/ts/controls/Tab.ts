import IHeader from '../interfaces/IHeader';
import ITab from '../interfaces/ITab';

import LayoutManager from '../LayoutManager';
import DragListener from '../dragDrop/DragListener';
import DragProxy from '../dragDrop/DragProxy';
import Header from './Header';


import ContentItem from '../items/ContentItem';
import Component from '../items/Component';

import {
    fnBind,
    stripTags
} from '../utils/utils'

const _template = '<li class="lm_tab"><i class="lm_left"></i>' +
    '<span class="lm_title"></span><div class="lm_close_tab"></div>' +
    '<i class="lm_right"></i></li>'

/**
 * Represents an individual tab within a Stack's header
 */
export default class Tab implements ITab {

    private _layoutManager: LayoutManager;
    private _dragListener: DragListener;
    private _onTabClickFn: any;
    private _onCloseClickFn: any;
    private _header: Header;
    private _contentItem: ContentItem;
    private _titleElement: JQuery;
    private _closeElement: JQuery;
    private _isActive: boolean;
    private _element: JQuery;


    public get header(): IHeader {
        return this._header;
    }

    public get contentItem(): ContentItem {
        return this._contentItem;
    }

    public set contentItem(value: ContentItem) {
        this._contentItem = value;
    }

    public get titleElement(): JQuery {
        return this._titleElement;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    public get closeElement(): JQuery {
        return this._closeElement;
    }

    public get element(): JQuery {
        return this._element;
    }

    /**
     * Constructor
     * @param header Header reference
     * @param contentItem Content item
     */
    constructor(header: Header, contentItem: ContentItem) {
        this._header = header;
        this._contentItem = contentItem;
        this._element = $(_template);
        this._titleElement = this._element.find('.lm_title');
        this._closeElement = this._element.find('.lm_close_tab');
        this._closeElement[contentItem.config.isClosable ? 'show' : 'hide']();
        this._isActive = false;

        this.setTitle(contentItem.config.title);
        this._contentItem.on('titleChanged', this.setTitle, this);

        this._layoutManager = this._contentItem.layoutManager as LayoutManager;

        if (this._layoutManager.config.settings.reorderEnabled === true &&
            contentItem.config.reorderEnabled === true) {
            this._dragListener = new DragListener(this._element);
            this._dragListener.on('dragStart', this._onDragStart, this);
            this._contentItem.on('destroy', this._dragListener.destroy, this._dragListener);
        }

        this._onTabClickFn = fnBind(this._onTabClick, this);
        this._onCloseClickFn = fnBind(this._onCloseClick, this);

        this._element.on('mousedown touchstart', this._onTabClickFn);

        if (this._contentItem.config.isClosable) {
            this._closeElement.on('click touchstart', this._onCloseClickFn);
            this._closeElement.on('mousedown', this._onCloseMousedown);
        } else {
            this._closeElement.remove();
        }

        this._contentItem.tab = this;
        this._contentItem.emit('tab', this);
        this._contentItem.layoutManager.emit('tabCreated', this);

        if (this._contentItem.isComponent) {
            (<Component>this._contentItem).container.tab = this;
            (<Component>this._contentItem).container.emit('tab', this);
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
        this._element.attr('title', stripTags(title));
        this._titleElement.html(title);
    }

    /**
     * Sets this tab's active state. To programmatically
     * switch tabs, use header.setActiveContentItem( item ) instead.
     *
     * @public
     * @param {boolean} isActive
     */
    setActive(isActive: boolean): void {
        if (isActive === this._isActive) {
            return;
        }
        this._isActive = isActive;

        if (isActive) {
            this._element.addClass('lm_active');
        } else {
            this._element.removeClass('lm_active');
        }
    }

    /**
     * Destroys the tab
     *
     * @private
     * @returns {void}
     */
    _$destroy(): void {
        this._element.off('mousedown touchstart', this._onTabClickFn);
        this._closeElement.off('click touchstart', this._onCloseClickFn);
        if (this._dragListener) {
            this._contentItem.off('destroy', this._dragListener.destroy, this._dragListener);
            this._dragListener.off('dragStart', this._onDragStart);
            this._dragListener = null;
        }
        this._element.remove();
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
        if (!this._header.canDestroy)
            return null;

        if (this._contentItem.parent.isMaximised === true) {
            this._contentItem.parent.toggleMaximise();
        }
        new DragProxy(
            x,
            y,
            this._dragListener,
            this._layoutManager,
            this._contentItem,
            this._header.parent
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
            this._header.parent.setActiveContentItem(this._contentItem);

            // middle mouse button
        } else if (event.button === 1 && this._contentItem.config.isClosable) {
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
        if (!this._header.canDestroy)
            return;
        this._header.parent.removeChild(this._contentItem);
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
