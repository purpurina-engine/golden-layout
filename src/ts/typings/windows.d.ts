import LayoutManager from "../GoldenLayout";

declare global {
    interface Window { 
        __glInstance: LayoutManager; 
    }
    interface Event {
        __gl?: any;
        __glArgs?: any;
    }
}