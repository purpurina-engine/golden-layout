import { ComponentConfig } from "./config/ItemConfigType";
import ContentItem from "./items/ContentItem";

export type Dimension = 'height' | 'width';
export type HeaderPosition = 'top' | 'bottom' | 'left' | 'right';
export type ContentItemType = 'row' | 'column' | 'stack' | 'component' | 'root' | 'react-component';

export type Callback = (...args: any[]) => any;
export interface BoundFunction extends Function {
    (...args: any[]): any;
} 
export type ContentItemConfigFunction = () => ComponentConfig;

export interface Vector {
    x: number;
    y: number;
}

export interface Area {
    [indexer: number]: any;
    x1?: number;
    x2?: number;
    y1?: number;
    y2?: number;
}

export interface ContentArea extends Area {
    [key: string]: number | ContentItem | string;
    surface?: number;
    contentItem?: ContentItem;
    side?: string;
}

export interface ElementDimensions {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface TransitionIndicatorElement extends ElementDimensions {
    [key: string]: number;
    opacity?: number;
}

interface HightlightZone {
    hoverArea: Area;
    highlightArea: Area;
}

export interface HightlightAreas {
    [key: string]: HightlightZone;
    header?: HightlightZone;
    body?: HightlightZone;
    top?: HightlightZone;
    left?: HightlightZone;
    right?: HightlightZone;
    bottom?: HightlightZone;
}

export interface HeaderConfig {
    [key: string]: string | boolean | HeaderPosition;
    show?: boolean,
    popout?: string,
    maximise?: string,
    close?: string,
    minimise?: string,
    dock?: boolean,
    oldPosition?: HeaderPosition
}