import { ComponentConfig } from "./config/ItemConfigType";

export type Dimension = 'height' | 'width';
export type Position = 'top' | 'bottom' | 'left' | 'right';

export type Callback = (...args) => any;
export type BoundFunction = (...args) => any;
export type ContentItemConfigFunction = () => ComponentConfig;
export type FilterFunction = () => boolean;

export interface ContentArea {
    surface?: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    contentItem?: any;
}

export interface ElementDimensions {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface TransitionIndicatorElement extends ElementDimensions {
    opacity?: number;
}

