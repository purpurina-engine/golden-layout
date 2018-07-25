import Settings from "./Settings";
import Dimensions from "./Dimensions";
import Labels from "./Labels";
import ItemConfigType from "./ItemConfigType";

export default interface Config {
    settings?: Settings;
    dimensions?: Dimensions;
    labels?: Labels;
    content?: ItemConfigType[];
}