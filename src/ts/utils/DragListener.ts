import EventEmitter from './EventEmitter';
import {
    fnBind,
    getTouchEvent
} from './utils';
import { Vector } from '../Commons';

export default class DragListener extends EventEmitter {

    private _timeout: any;

    private _eElement: JQuery<HTMLElement>;
    private _oDocument: JQuery<Document>;
    private _eBody: JQuery<HTMLElement>;
    //private _nButtonCode: number;

    /**
     * The delay after which to start the drag in milliseconds
     */
    private _nDelay: number;

    /**
     * The distance the mouse needs to be moved to qualify as a drag
     */
    private _nDistance: number; //TODO - works better with delay only

    private _nX: number;
    private _nY: number;

    private _nOriginalX: number;
    private _nOriginalY: number;

    private _bDragging: boolean;

    private _fMove = fnBind(this.onMouseMove, this);
    private _fUp = fnBind(this.onMouseUp, this);
    private _fDown = fnBind(this.onMouseDown, this);


    constructor(eElement: JQuery, nButtonCode?: number) {

        super();

        this._timeout = null

        this._eElement = $(eElement);
        this._oDocument = $(document);
        this._eBody = $(document.body);
        //this._nButtonCode = nButtonCode || 0;

        this._nDelay = 200;
        this._nDistance = 10;

        this._nX = 0;
        this._nY = 0;

        this._nOriginalX = 0;
        this._nOriginalY = 0;

        this._bDragging = false;

        this._fMove = fnBind(this.onMouseMove, this);
        this._fUp = fnBind(this.onMouseUp, this);
        this._fDown = fnBind(this.onMouseDown, this);


        this._eElement.on('mousedown touchstart', this._fDown);
    }

    destroy(): void {
        this._eElement.unbind('mousedown touchstart', this._fDown);
        this._oDocument.unbind('mouseup touchend', this._fUp);
        this._eElement = null;
        this._oDocument = null;
        this._eBody = null;
    }

    private onMouseDown(oEvent: JQuery.Event): void {
        oEvent.preventDefault();

        if (oEvent.button == 0 || oEvent.type === "touchstart") {
            const coordinates = this._getCoordinates(oEvent);

            this._nOriginalX = coordinates.x;
            this._nOriginalY = coordinates.y;

            this._oDocument.on('mousemove touchmove', this._fMove);
            this._oDocument.one('mouseup touchend', this._fUp);

            this._timeout = setTimeout(fnBind(this._startDrag, this), this._nDelay);
        }
    }

    private onMouseMove(oEvent: JQuery.Event): void {
        if (this._timeout != null) {
            oEvent.preventDefault();

            const coordinates = this._getCoordinates(oEvent);

            this._nX = coordinates.x - this._nOriginalX;
            this._nY = coordinates.y - this._nOriginalY;

            if (this._bDragging === false) {
                if (
                    Math.abs(this._nX) > this._nDistance ||
                    Math.abs(this._nY) > this._nDistance
                ) {
                    clearTimeout(this._timeout);
                    this._startDrag();
                }
            }

            if (this._bDragging) {
                this.emit('drag', this._nX, this._nY, oEvent);
            }
        }
    }

    private onMouseUp(oEvent: JQuery.Event): void {
        if (this._timeout != null) {
            clearTimeout(this._timeout);
            this._eBody.removeClass('lm_dragging');
            this._eElement.removeClass('lm_dragging');
            this._oDocument.find('iframe').css('pointer-events', '');
            this._oDocument.unbind('mousemove touchmove', this._fMove);
            this._oDocument.unbind('mouseup touchend', this._fUp);

            if (this._bDragging === true) {
                this._bDragging = false;
                this.emit('dragStop', oEvent, this._nOriginalX + this._nX);
            }
        }
    }

    private _startDrag(): void {
        this._bDragging = true;
        this._eBody.addClass('lm_dragging');
        this._eElement.addClass('lm_dragging');
        this._oDocument.find('iframe').css('pointer-events', 'none');
        this.emit('dragStart', this._nOriginalX, this._nOriginalY);
    }

    private _getCoordinates(event?: JQuery.Event): Vector {
        return getTouchEvent(event);
        
        // return {
        //     x: event.pageX,
        //     y: event.pageY
        // };
    }
}
