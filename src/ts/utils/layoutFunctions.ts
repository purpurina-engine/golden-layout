import { LayoutConfig } from "../config";
import { ContentArea } from "../interfaces/Commons";
import ContentItem from "../items/ContentItem";
import Stack from "../items/Stack";

import LayoutManager from "../LayoutManager";

//type ItemCreationFunction = () => IContentItem;


interface ContainerCreation {
    jqueryContainer: JQuery;
    isFullPage: boolean;
};

import {
    fnBind,
    stripTags,
    copy,
} from "./utils";

/**
 * Returns a flattened array of all content items,
 * regardles of level or type
 * @private
 * @returns {ContentItem[]}
 */
export function getAllContentItems(rootItem: ContentItem): ContentItem[] {
    let allContentItems: ContentItem[] = [];

    let addChildren = function (contentItem: ContentItem) {
        allContentItems.push(contentItem);

        if (contentItem.contentItems instanceof Array) {
            for (let i = 0; i < contentItem.contentItems.length; i++) {
                addChildren(contentItem.contentItems[i]);
            }
        }
    };

    addChildren(rootItem);

    return allContentItems;
}

export function createRootItemAreas(rootArea: ContentArea, itemAreas: ContentArea[]): void {
    const areaSize = 50;
    let sides: any = {
        y2: 'y1',//0,
        x2: 'x1',
        y1: 'y2',
        x1: 'x2'
    };

    for (let side in sides) {
        let area = copy({},rootArea);
        area.side = side;
        if (sides[side][1] === '2') {
            area[side] = area[sides[side]] - areaSize;
        } else {
            //area[side] = areaSize;
            area[ side ] = area[ sides [ side ] ] + areaSize;
        }
        area.surface = (area.x2 - area.x1) * (area.y2 - area.y1);
        itemAreas.push(area);
    }
}

export function computeHeaderArea(area: ContentArea): ContentArea {
    let header: ContentArea = {};
    copy(header, area);
    copy(header, (area.contentItem as Stack).contentAreaDimensions.header.highlightArea);
    header.surface = (header.x2 - header.x1) * (header.y2 - header.y1);
    return header;
}

export function intersectsArea(x: number, y: number, smallestSurface: number, area: ContentArea): boolean {
    if (
        x > area.x1 &&
        x < area.x2 &&
        y > area.y1 &&
        y < area.y2 &&
        smallestSurface > area.surface) {
        return true;
    }

    return false;
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
     * This is executed when GoldenLayout detects that it is run
     * within a previously opened popout window.
     * @private
     * @returns {void}
     */
export function adjustToWindowMode(layoutManager: LayoutManager, config: LayoutConfig): JQuery {
    let popInButton = $('<div class="lm_popin" title="' + config.labels.popin + '">' +
        '<div class="lm_icon"></div>' +
        '<div class="lm_bg"></div>' +
        '</div>');

    popInButton.click(fnBind(function (this: LayoutManager) {
        this.emit('popIn');
    }, layoutManager));

    document.title = stripTags(config.content[0].title);

    $('head').append($('body link, body style, template, .gl_keep'));

    const container = $('body')
        .html('')
        .css('visibility', 'visible')
        .append(popInButton);

    /*
     * This seems a bit pointless, but actually causes a reflow/re-evaluation getting around
     * slickgrid's "Cannot find stylesheet." bug in chrome
     */
    // let x = document.body.offsetHeight; // jshint ignore:line

    // Expose this instance on the window object to allow the opening window to interact with it
    window.__glInstance = layoutManager;

    return container;
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
// export function normalizeContentItem(layoutManager: LayoutManager, contentItemOrConfig: ItemConfigType | ContentItem | ItemCreationFunction, parent?: ContentItem): ContentItem {
//     if (!contentItemOrConfig) {
//         throw new Error('No content item defined');
//     }

//     if (isFunction(contentItemOrConfig)) {
//         contentItemOrConfig = (<ItemCreationFunction>contentItemOrConfig)();
//     }

//     if (contentItemOrConfig instanceof ContentItem) {
//         return contentItemOrConfig;
//     }

//     // if ($.isPlainObject(contentItemOrConfig)) {
//     const asConfig = (contentItemOrConfig as ItemConfigType);
//     if ($.isPlainObject(asConfig) && asConfig.type) {
//         //  && contentItemOrConfig.type

//         let newContentItem = createContentItem(layoutManager, asConfig, parent);
//         newContentItem.callDownwards('_$init');
//         return newContentItem;
//     } else {
//         throw new Error('Invalid contentItem');
//     }
// }



/**
 * Determines what element the layout will be created in
 * @private
 * @returns {void}
 */
export function setLayoutContainer(container: any): ContainerCreation {
    let jqueryContainer: JQuery;
    let isFullPage: boolean = false;

    if (container !== undefined) {
        const can = typeof container === 'string' || (container instanceof HTMLElement);
        if (can) {
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

