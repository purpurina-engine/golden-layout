import Settings from "./Settings";
import Dimensions from "./Dimensions";
import Labels from "./Labels";
import ItemConfigType, { ComponentConfig, ReactComponentConfig, ItemConfig } from "./ItemConfigType";
import DragDropSettings from "./DragDropSettings";

export default interface Config {
    settings?: Settings;
    dimensions?: Dimensions;
    labels?: Labels;
    content?: ItemConfigType[];
    dragDrop?: DragDropSettings;
    openPopouts?: any[];
    maximisedItemId?: any;
    header?: any;
}

export { 
    ItemConfig, 
    ComponentConfig, 
    ReactComponentConfig, 
    ItemConfigType, 
    Labels, 
    Settings, 
    Dimensions 
};
