import ContentItem from "../items/ContentItem";
import Stack from "../items/Stack";
import Component from "../items/Component";
import RowOrColumn from "../items/RowOrColumn";
import { Callback } from "../interfaces/Commons";

import LayoutManager from "../LayoutManager";
import ConfigurationError from "../errors/ConfigurationError";

import { ItemConfigType, ComponentConfig, ItemConfig } from "../config";

import { 
    fnBind,
    objectKeys 
} from "./utils";
import Root from "../items/Root";

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

export function createContentItem(this: LayoutManager, itemConfiguration?: ItemConfigType, parent?: ContentItem): ContentItem {
    let typeErrorMsg;

    if (typeof itemConfiguration.type !== 'string') {
        throw new ConfigurationError('Missing parameter \'type\'', itemConfiguration);
    }

    if (itemConfiguration.type === 'react-component') {
        itemConfiguration.type = 'component';
        (itemConfiguration as ComponentConfig).componentName = 'lm-react-component';
    }

    if (!typeToItem[itemConfiguration.type]) {
        typeErrorMsg = 'Unknown type \'' + itemConfiguration.type + '\'. ' +
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
        !(this.isSubWindow === true && parent instanceof Root)
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
    return new itemConstructor(this, itemConfiguration, parent);
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

