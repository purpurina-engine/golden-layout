import { ComponentConfig } from "./config/ItemConfigType";

export type Dimension = 'height' | 'width';
export type HeaderPosition = 'top' | 'bottom' | 'left' | 'right';
export type ContentItemType = 'row' | 'column' | 'stack' | 'component' | 'root' | 'react-component';

export type Callback = (...args) => any;
export type BoundFunction = (...args) => any;
export type ContentItemConfigFunction = () => ComponentConfig;

export interface Area {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export interface ContentArea extends Area {
    surface?: number;
    contentItem?: any;
    side?: string;
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

interface HightlightZone {
    hoverArea: Area;
    highlightArea: Area;
}

export interface HightlightAreas {
  header?: HightlightZone;
  body?: HightlightZone;
  top?: HightlightZone;
  left?: HightlightZone;
  right?: HightlightZone;
  bottom?: HightlightZone;
}

export interface HeaderConfig {
    show?: boolean,
    popout?: string,
    maximise?: string,
    close?: string,
    minimise?: string,
    dock?: boolean,
    oldPosition?: HeaderPosition
}