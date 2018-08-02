import ItemConfigType, { ItemConfig } from "../config/ItemConfigType";
import itemDefaultConfig from "../config/itemDefaultConfig";
import ConfigurationError from "../errors/ConfigurationError";
import IContentItem from "../interfaces/IContentItem";
import LayoutManager from "../LayoutManager";
import Component from "../items/Component";
import Stack from "../items/Stack";
import { getUniqueId } from "./utils";
import ConfigMinifier from "./ConfigMinifier";


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
export function createContentItems(config: ItemConfigType, layoutManager: LayoutManager): IContentItem[] {
    if (!(config.content instanceof Array)) {
        throw new ConfigurationError('content must be an Array', config);
    }

    let items: IContentItem[] = [];

    for (let i = 0; i < config.content.length; i++) {
        const contentItem = layoutManager.createContentItem(config.content[i], layoutManager);
        items.push(contentItem);
    }

    return items;
}

export function callOnActiveComponents(methodName: 'show' | 'hide', stacks: Stack[]): void {
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

/**
 * This method is used to get around sandboxed iframe restrictions.
 * If 'allow-top-navigation' is not specified in the iframe's 'sandbox' attribute
 * (as is the case with codepens) the parent window is forbidden from calling certain
 * methods on the child, such as window.close() or setting document.location.href.
 *
 * This prevented GoldenLayout popouts from popping in in codepens. The fix is to call
 * _$closeWindow on the child window's gl instance which (after a timeout to disconnect
 * the invoking method from the close call) closes itself.
 * @package
 * @returns {void}
 */
export function closeWindow(): void {
    window.setTimeout(function () {
        window.close();
    }, 1);
}