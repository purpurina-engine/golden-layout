import ILayoutManagerInternal from "../interfaces/ILayoutManagerInternal";
import Component from "../items/Component";
import RowOrColumn from "../items/RowOrColumn";
import Root from "../items/Root";
import ConfigurationError from "../errors/ConfigurationError";
import Stack from "../items/Stack";
import { fnBind } from "./utils";
import { LayoutConfig } from "../config";




interface TypeToItem {
    [key: string]: any | typeof Component | typeof Stack;
    'column': typeof RowOrColumn;
    'row': typeof RowOrColumn;
    'stack': typeof Stack;
    'component': typeof Component;
};

export const typeToItem: TypeToItem = {
    'column': fnBind(RowOrColumn,undefined, true),
    'row': fnBind(RowOrColumn,undefined, false),
    'stack': Stack,
    'component': Component
}

/**
 * Kicks of the initial, recursive creation chain
 * @param   {LayoutConfig} config GoldenLayout Config
 * @returns {void}
 */
export function createRootItem(config: LayoutConfig, containerElement: JQuery, layoutManager: ILayoutManagerInternal): Root {

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

