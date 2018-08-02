import ItemConfigType from "../config/ItemConfigType";
import itemDefaultConfig from "../config/itemDefaultConfig";


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