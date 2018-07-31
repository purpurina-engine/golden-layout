import Config from "../config";
import LayoutManager from "../LayoutManager";

export default interface BrowserWindow {

    /**
     * True if the window has been opened and its GoldenLayout instance initialised.
     */
    isInitialized: boolean;

    /**
     * Creates a window configuration object from the Popout.
     */
    toConfig(): {
        dimensions: {
            width: number,
            height: number,
            left: number,
            top: number
        },
        content: Config,
        parentId: string,
        indexInParent: number
    };

    /**
     * Returns the GoldenLayout instance from the child window
     */
    getGlInstance(): LayoutManager;

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