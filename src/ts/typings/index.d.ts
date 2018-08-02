import * as ReactDOM from "react-dom";
import React = require("react");
import LayoutManager from "../interfaces/LayoutManager";


declare global {
    interface Window {
        __glInstance: LayoutManager;
    }
    interface Event {
        __gl?: any;
        __glArgs?: any;
    }
}

declare const jQuery: JQueryStatic;
declare const $: JQueryStatic;
declare var JQuery: any;
