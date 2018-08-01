import Settings from "./Settings";
import DimensionsSettings from "./DimensionsSettings";
import Labels from "./Labels";
import ItemConfigType, { ComponentConfig, ReactComponentConfig, ItemConfig } from "./ItemConfigType";
import DragDropSettings from "./DragDropSettings";

export default interface LayoutConfig {
    settings?: Settings;
    dimensions?: DimensionsSettings;
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
    DimensionsSettings 
};
