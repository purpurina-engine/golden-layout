
export type ContentItemEvent =
/**
 * Fired whenever something happened to this item or its children that changes the state of the layout (as returned by layout.toConfig)
 */
'stateChanged' |
/**
 * Updated whenever the item's title changes as a result of calling setTitle() on either the item or from a container
 */
'titleChanged' |
/**
 * Fired whenever a different item is selected from a Stack
 */
'activeContentItemChanged' |
'beforeItemDestroyed' |
/**
 * Fired whenever this item or one of its children gets destroyed
 */
'itemDestroyed' |
/**
 * Fired whenever an item gets created as child of this item
 */
'itemCreated' |
/**
 * Fired whenever a component gets created as child of this item
 */
'componentCreated' |
/**
 * Fired whenever a row gets created as child of this item
 */
'rowCreated' |
/**
 * Fired whenever a column gets created as child of this item
 */
'columnCreated' |
/**
 * Fired whenever a stack gets created as child of this item
 */
'stackCreated';


export type LayoutEvent  =
ContentItemEvent |
/**
 * Fired after layout.init() has been called and the layout tree has been created.
 */
'initialised' |
/**
 * Fired when a new popout window was opened.
 */
'windowOpened' |
/**
 * Fired when a previously created popout window was closed.
 */
'windowClosed' |
/**
 * Fired when the user selects a new / different item. Only relevant if settings.selectionEnabled is true.
 */
'selectionChanged' |
/**
 * Fired whenever a tab is created.
 */
'tabCreated';

