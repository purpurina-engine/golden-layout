import { Callback } from '../interfaces/Commons';
import DragListener from '../utils/DragListener'

function createElement(isVertical: boolean, grabSize: number, size: number): JQuery<HTMLElement> {
    const dragHandle = $('<div class="lm_drag_handle"></div>');
    const element = $('<div class="lm_splitter"></div>');

    element.append(dragHandle);

    const handleExcessSize = grabSize - size;
    const handleExcessPos = handleExcessSize / 2;

    if (isVertical) {
        dragHandle.css('top', -handleExcessPos);
        dragHandle.css('height', size + handleExcessSize);
        element.addClass('lm_vertical');
        element['height'](size);
    } else {
        dragHandle.css('left', -handleExcessPos);
        dragHandle.css('width', size + handleExcessSize);
        element.addClass('lm_horizontal');
        element['width'](size);
    }

    return element;
}

export default class Splitter {

    // private _isVertical: boolean;
    // private _size: number;
    // private _grabSize: number;
    private _dragListener: DragListener;
    element: JQuery<HTMLElement>;

    constructor(isVertical: boolean, size: number, grabSize: number) {
        // this._isVertical = isVertical;
        // this._size = size;
        const fixGrabSize = grabSize < size ? size : grabSize;

        this.element = createElement(isVertical, fixGrabSize, size);
        this._dragListener = new DragListener(this.element);
    }

    on(event: string, callback: Callback, context: any) {
        this._dragListener.on(event, callback, context);
    }

    _$destroy(): void {
        this.element.remove();
    }

}
