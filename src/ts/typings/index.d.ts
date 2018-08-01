import GoldenLayout from "../GoldenLayout";
import * as ReactDOM from "../../../node_modules/@types/react-dom";
import React = require("../../../node_modules/@types/react");


declare global {
    interface Window {
        __glInstance: GoldenLayout;
    }
    interface Event {
        __gl?: any;
        __glArgs?: any;
    }
}

declare const jQuery: JQueryStatic;
declare const $: JQueryStatic;
declare var JQuery: any;
