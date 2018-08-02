import Header from "./Header";
import { Callback } from "../interfaces/Commons";

export default class HeaderButton {

    private _header: Header;
    private _action: any;
    element: JQuery;

    constructor(header: Header, label: string, cssClass: string, action: Callback) {
        this._header = header;
        this._action = action;

        this.element = $('<li class="' + cssClass + '" title="' + label + '"></li>');
        this._header.on('destroy', this._$destroy, this);        
        this.element.on('click touchstart', this._action);
        this._header.controlsContainer.append(this.element);
    }

    _$destroy() {
        this.element.off();
        this.element.remove();
    }
}
