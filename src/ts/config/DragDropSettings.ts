

export default interface DragDropSettings {

    /**
     * Should detach the actual dragging item from layout tree? 
     * Default: true
     */
    detachDragSource?: boolean;

    /**
     * If true, the user will see the on dragging the source content item preview. 
     * Default: true
     */
    showDragPreview?: boolean;

    /**
     * If 'detachDragSource' is disabled and this options is set to true, the user will not see the highlight zone
     * when he/she will pointing on the drag source.
     * Default: false
     */
    allowDropItself?: boolean;

}