import IContentItem from "../interfaces/IContentItem";
import ILayoutManagerInternal from "../interfaces/ILayoutManagerInternal";
import IStack from "../interfaces/IStack";
import ItemConfigType from "../config/ItemConfigType";
import itemDefaultConfig from "../config/itemDefaultConfig";
import ConfigurationError from "../errors/ConfigurationError";

import Component from "../items/Component";

import ConfigMinifier from "./ConfigMinifier";
import { getUniqueId } from "./utils";
import ContentItem from "../items/ContentItem";
import IRowOrColumn from "../interfaces/IRowOrColumn";



/**
 * Extends an item configuration node with default settings
 * @private
 * @param   {ItemConfigType} config
 * @returns {any} extended config
 */
export function extendItemNode(config: ItemConfigType | any): ItemConfigType {
    for (let key in itemDefaultConfig) {
        if (config[key] === undefined) {
            config[key] = itemDefaultConfig[key];
        }
    }
    return config;
}

/**
 * Private method, creates all content items for this node at initialisation time
 * PLEASE NOTE, please see addChild for adding contentItems add runtime
 * @private
 * @param   {ItemConfigType} config
 * @returns {void}
 */
export function createContentItems(config: ItemConfigType, parent: ContentItem, layoutManager: ILayoutManagerInternal): ContentItem[] {
    if (!(config.content instanceof Array)) {
        throw new ConfigurationError('content must be an Array', config);
    }

    let items: ContentItem[] = [];

    for (const iterator of config.content) {
        const contentItem = layoutManager.createContentItem(iterator, parent) as ContentItem;
        items.push(contentItem);
    }



    return items;
}

export function callOnActiveComponents(methodName: 'show' | 'hide', stacks: ContentItem[]): void {
    //let stacks = this.getItemsByType('stack') as Stack[];
    for (let i = 0; i < stacks.length; i++) {
        const activeContentItem = stacks[i].getActiveContentItem();

        if (activeContentItem && activeContentItem.isComponent) {
            const component = (activeContentItem as Component);
            component.container[methodName]();
        }
    }
}

/**
 * Creates the URL for the new window, including the
 * config GET parameter
 * @returns {string} URL
 */
export function createUrl(itemConfig: ItemConfigType): string {
    let input = {
        content: itemConfig
    }
    const storageKey = 'gl-window-config-' + getUniqueId();
    let urlParts;

    let config = (new ConfigMinifier()).minifyConfig(input);

    try {
        localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (e) {
        throw new Error('Error while writing to localStorage ' + e.toString());
    }

    urlParts = document.location.href.split('?');

    // URL doesn't contain GET-parameters
    if (urlParts.length === 1) {
        return urlParts[0] + '?gl-window=' + storageKey;

        // URL contains GET-parameters
    } else {
        return document.location.href + '&gl-window=' + storageKey;
    }
}

export function isStack(item: IContentItem | IStack): item is IStack {
    return (item.type === 'stack' || item.isStack);
}

export function isRowOrColumn(item: IContentItem | IRowOrColumn): item is IRowOrColumn {
    return (item.type === 'row' || item.type === 'column' || item.isColumn || item.isRow);
}