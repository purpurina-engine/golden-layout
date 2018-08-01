import GoldenLayout from "../GoldenLayout";
import * as ReactDOM from "react-dom";
import React = require("react");


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
