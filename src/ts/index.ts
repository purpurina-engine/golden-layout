// helper file for webpack build system
// whatever is imported/exported here will be included in the build
//
// Layout
export { default } from './GoldenLayout';
//
export {
    LayoutConfig,
    Labels,
    ItemConfig, 
    ComponentConfig, 
    ReactComponentConfig, 
    ItemConfigType, 
    DimensionsSettings, 
    Settings
} from './config';


// container
export { default as Container } from './container/Container';
//
// controls
export { default as BrowserPopout } from './controls/BrowserPopout';
export { default as Header } from './controls/Header';
export { default as HeaderButton } from './controls/HeaderButton';
export { default as Tab } from './controls/Tab';
//
// items
export { default as Component } from './items/Component';
export { default as Root } from './items/Root';
export { default as RowOrColumn } from './items/RowOrColumn';
export { default as Stack } from './items/Stack';
//
// utils
export { default as BubblingEvent } from './events/BubblingEvent';
export { default as ConfigMinifier } from './utils/ConfigMinifier';
export { default as DragListener } from './dragDrop/DragListener';
export { default as EventEmitter } from './events/EventEmitter';
export { default as EventHub } from './events/EventHub';
export { default as ReactComponentHandler } from './utils/ReactComponentHandler';

// if(env.ZEPTO && env.ES6){
//   require('script-loader!../node_modules/zepto/dist/zepto.js');
//   require('../lib/zepto-extras.js');
// }