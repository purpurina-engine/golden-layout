import GoldenLayout from "../GoldenLayout";
import { ElementDimensions } from "./Commons";
import { Config } from "html-webpack-plugin";

/**
* Window configuration object from the Popout.
*/
export interface BrowserPopoutConfig {
    dimensions: ElementDimensions;
    content: Config;
    parentId: string;
    indexInParent: number;
}

export default interface IBrowserPopout {

    /**
     * True if the window has been opened and its GoldenLayout instance initialised.
     */
    readonly isInitialised: boolean;

    /**
     * Creates a window configuration object from the Popout.
     */
    toConfig(): BrowserPopoutConfig;

    /**
     * Returns the GoldenLayout instance from the child window
     */
    getGlInstance(): GoldenLayout;

    /**
     * Returns the native Window object
     */
    getWindow(): Window;

    /**
     * Closes the popout
     */
    close(): void;

    /**
     * Returns the popout to its original position as specified in parentId and indexInParent
     */
    popIn(): void;
}