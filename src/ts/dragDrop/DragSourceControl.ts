import { ContentArea } from "../interfaces/Commons";
import ContentItem from "../items/ContentItem";
import { mergeAreas } from "../utils/utils";

export default class DragSourceControl {

    private _area: ContentArea;
    private _header: ContentArea;
    fullArea: ContentArea = {};
    private _hasArea: boolean = false;

    public get area(): ContentArea {
        return this._area;
    }
    
    public get header(): ContentArea {
        return this._header;
    }

    get hasArea(): boolean {
        return this._hasArea;
    }

    clear() {
        this._area = null;
        this._header = null;
        this._hasArea = false;
        this.fullArea.contentItem = null;
    }

    set(area: ContentArea, header: ContentArea, item: ContentItem) {
        if (area === null || header === null) {
            return;
        }
        this._area = area;
        this._header = header;
        mergeAreas(area, header, this.fullArea);
        this.fullArea.contentItem = item.parent;
        this._hasArea = true;
    }
}