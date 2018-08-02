import LayoutConfig from "./config/LayoutConfig";
import ILayoutManager from "./interfaces/ILayoutManager";


interface LayoutManagerConstructor {
    /**
     * @param config A GoldenLayout configuration object
     * @param container The DOM element the layout will be initialised in. Default: document.body
     */
    new(configuration?: LayoutConfig, container?: HTMLElement | JQuery): ILayoutManager;

}

declare var LayoutManager: LayoutManagerConstructor;
