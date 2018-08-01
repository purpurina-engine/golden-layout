import { ContentArea } from "../Commons";
import { mergeAreas } from "../utils/utils";
import ContentItem from "../items/ContentItem";

export default class DragSourceControl {

    private _area: ContentArea;

    public get area(): ContentArea {
        return this._area;
    }

    private _header: ContentArea;

    public get header(): ContentArea {
        return this._header;
    }

    fullArea: ContentArea = {};
    private _hasArea: boolean = false;

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