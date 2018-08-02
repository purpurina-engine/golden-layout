import ContentItem from "../items/ContentItem";
import Stack from "../items/Stack";

interface ContainerCreation {
    jqueryContainer: JQuery;
    isFullPage: boolean;
};

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

