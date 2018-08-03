import IContentItem from "../interfaces/IContentItem";
import ContentItem from "../items/ContentItem";
import Stack from "../items/Stack";
import Component from "../items/Component";
import RowOrColumn from "../items/RowOrColumn";

import LayoutManager from "../LayoutManager";
import Root from "../items/Root";
import ConfigurationError from "../errors/ConfigurationError";

import { ItemConfigType, ComponentConfig, ItemConfig, LayoutConfig } from "../config";

import {
    fnBind,
    objectKeys,
    isFunction
} from "./utils";


export type ItemCreationFunction = () => IContentItem;

interface ContainerCreation {
    jqueryContainer: JQuery;
    isFullPage: boolean;
};

interface TypeToItem {
    [key: string]: any | typeof Component | typeof Stack;
    'column': any;
    'row': any;
    'stack': typeof Stack;
    'component': typeof Component;
};

const typeToItem: TypeToItem = {
    'column': fnBind(RowOrColumn, undefined, true),
    'row': fnBind(RowOrColumn, undefined, false),
    'stack': Stack,
    'component': Component
}

/**
 * Kicks of the initial, recursive creation chain
 * @param   {LayoutConfig} config GoldenLayout Config
 * @returns {void}
 */
export function createRootItem(config: LayoutConfig, containerElement: JQuery, layoutManager: LayoutManager): Root {

    if (!(config.content instanceof Array)) {
        let errorMsg: string;
        if (config.content === undefined) {
            errorMsg = 'Missing setting \'content\' on top level of configuration';
        } else {
            errorMsg = 'Configuration parameter \'content\' must be an array';
        }

        throw new ConfigurationError(errorMsg, config);
    }

    if (config.content.length > 1) {
        throw new ConfigurationError('Top level content can\'t contain more then one element.', config);
    }

    const root = new Root(layoutManager,
        {
            type: 'root',
            content: config.content
        },
        containerElement);

    root.callDownwards('_$init');

    if (config.maximisedItemId === '__glMaximised') {
        root.getItemsById(config.maximisedItemId)[0].toggleMaximise();
    }

    return root;
}

/**
 * 
 * @param this Layout Manager
 * @param itemConfiguration item configuration
 * @param parent optional parent
 */
export function createContentItem(layoutManager: LayoutManager, itemConfiguration?: ItemConfigType, parent?: ContentItem): ContentItem {
    if (typeof itemConfiguration.type !== 'string') {
        throw new ConfigurationError('Missing parameter \'type\'', itemConfiguration);
    }

    if (itemConfiguration.type === 'react-component') {
        itemConfiguration.type = 'component';
        (itemConfiguration as ComponentConfig).componentName = 'lm-react-component';
    }

    if (!typeToItem[itemConfiguration.type]) {
        const typeErrorMsg = 'Unknown type \'' + itemConfiguration.type + '\'. ' +
            'Valid types are ' + objectKeys(typeToItem).join(',');

        throw new ConfigurationError(typeErrorMsg);
    }

    /**
     * We add an additional stack around every component that's not within a stack anyways.
     */
    if (
        // If this is a component
        itemConfiguration.type === 'component' &&
        // and it's not already within a stack
        !(parent instanceof Stack) &&
        // and we have a parent
        !!parent &&
        // and it's not the topmost item in a new window
        !(layoutManager.isSubWindow === true && parent instanceof Root)
    ) {
        const itemConfig: ItemConfig = {
            type: 'stack',
            width: itemConfiguration.width,
            height: itemConfiguration.height,
            content: [itemConfiguration]
        };

        itemConfiguration = itemConfig;
    }

    const itemConstructor = typeToItem[itemConfiguration.type];
    return new itemConstructor(layoutManager, itemConfiguration, parent);
}

/**
 * Takes a contentItem or a configuration and optionally a parent
 * item and returns an initialised instance of the contentItem.
 * If the contentItem is a function, it is first called
 * @package
 * @param layoutManager
 * @param contentItemOrConfig
 * @param parent Only necessary when passing in config
 * @returns New Content Item
 */
export function normalizeContentItem(layoutManager: LayoutManager, contentItemOrConfig: ItemConfigType | ContentItem | ItemCreationFunction, parent?: ContentItem): ContentItem {
    if (!contentItemOrConfig) {
        throw new Error('No content item defined');
    }

    if (isFunction(contentItemOrConfig)) {
        contentItemOrConfig = (<ItemCreationFunction>contentItemOrConfig)();
    }

    if (contentItemOrConfig instanceof ContentItem) {
        return contentItemOrConfig;
    }

    // if ($.isPlainObject(contentItemOrConfig)) {
    const asConfig = (contentItemOrConfig as ItemConfigType);
    if ($.isPlainObject(asConfig) && asConfig.type) {
        //  && contentItemOrConfig.type

        let newContentItem = createContentItem(layoutManager, asConfig, parent);
        newContentItem.callDownwards('_$init');
        return newContentItem;
    } else {
        throw new Error('Invalid contentItem');
    }
}

/**
 * Determines what element the layout will be created in
 * @private
 * @returns {void}
 */
export function setLayoutContainer(container: any): ContainerCreation {
    let jqueryContainer: JQuery;
    let isFullPage: boolean = false;

    if (container !== undefined) {
        if (container instanceof HTMLElement) {
            jqueryContainer = $(container);
        } else {
            jqueryContainer = container;
        }
    } else {
        jqueryContainer = $('body');
    }

    if (jqueryContainer.length === 0) {
        throw new Error('GoldenLayout container not found');
    }
    if (jqueryContainer.length > 1) {
        throw new Error('GoldenLayout more than one container element specified');
    }
    if (jqueryContainer[0] === document.body) {
        isFullPage = true;

        $('html, body').css({
            _height: '100%',
            margin: 0,
            padding: 0,
            overflow: 'hidden'
        });
    }
    return {
        jqueryContainer,
        isFullPage
    };
}

/**
 * Adds all children of a node to another container recursively.
 * @param {ContentItem} container - Container to add child content items to.
 * @param {ContentItem} node - Node to search for content items.
 * @returns {void}
*/
export function addChildContentItemsToContainer(container: ContentItem, node: ContentItem): void {
    if (node.type === 'stack') {
        for (const iterator of node.contentItems) {
            container.addChild(iterator);
            node.removeChild(iterator, true);
        }
    } else {
        for (const iterator of node.contentItems) {
            addChildContentItemsToContainer(container, iterator);
        }
    }
}

/**
 * Finds all the stack containers.
 * @param {ContentItem[]} stackContainers Set of containers to populate.
 * @param {ContentItem} node Current node to process.
 * @returns {void}
 */
function findAllStackContainersRecursive(stackContainers: ContentItem[], node: ContentItem): void {

    for (const item of node.contentItems) {
        if (item.type == 'stack') {
            stackContainers.push(item);
        } else if (!item.isComponent) {
            findAllStackContainersRecursive(stackContainers, item);
        }
    }
}

/**
 * Finds all the stack containers.
 * @param rootNode Start point to search 
 * @returns {Stack[]} - The found stack containers.
 */
export function findAllStackContainers(rootNode: ContentItem): Stack[] {
    let stackContainers: Stack[] = [];
    findAllStackContainersRecursive(stackContainers, rootNode);

    return stackContainers;
}

