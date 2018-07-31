import GoldenLayout from "../GoldenLayout";

declare global {
    interface Window { 
        __glInstance: GoldenLayout; 
    }
    interface Event {
        __gl?: any;
        __glArgs?: any;
    }
}