import {
    now,
    animFrame,
    fnBind
} from '../utils/utils'
import { TransitionIndicatorElement } from '../Commons';



export default class TransitionIndicator {

    private _element: JQuery;
    private _toElement: JQuery;
    private _fromDimensions: TransitionIndicatorElement;
    private _totalAnimationDuration: number;
    private _animationStartTime: number;

    constructor() {
        this._element = $('<div class="lm_transition_indicator"></div>');
        $(document.body).append(this._element);

        this._toElement = null;
        this._fromDimensions = null;
        this._totalAnimationDuration = 200;
        this._animationStartTime = null;
    }

    destroy() {
        this._element.remove();
    }

    // transitionElements(fromElement, toElement) {
    //     /**
    //      * TODO - This is not quite as cool as expected. Review.
    //      */
    //     return;
    //     // this._toElement = toElement;
    //     // this._animationStartTime = now();
    //     // this._fromDimensions = this._measure(fromElement);
    //     // this._fromDimensions.opacity = 0.8;
    //     // this._element.show().css(this._fromDimensions);
    //     // animFrame(fnBind(this._nextAnimationFrame, this));
    // }

    _nextAnimationFrame(): void {
        let toDimensions = TransitionIndicator.measure(this._toElement),
            animationProgress = (now() - this._animationStartTime) / this._totalAnimationDuration,
            currentFrameStyles = {};

        if (animationProgress >= 1) {
            this._element.hide();
            return;
        }

        toDimensions.opacity = 0;

        for (let cssProperty in this._fromDimensions) {
            currentFrameStyles[cssProperty] = this._fromDimensions[cssProperty] +
                (toDimensions[cssProperty] - this._fromDimensions[cssProperty]) *
                animationProgress;
        }

        this._element.css(currentFrameStyles);
        animFrame(fnBind(this._nextAnimationFrame, this));
    }

    static measure(element: JQuery): TransitionIndicatorElement {
        let offset = element.offset();

        return {
            left: offset.left,
            top: offset.top,
            width: element.outerWidth(),
            height: element.outerHeight()
        };
    }
}
