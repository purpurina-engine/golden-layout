import { ContentArea} from "../Commons";
import { mergeAreas } from "../utils/utils";

export default class DragSourceControl {

    private area: ContentArea;
    private header: ContentArea;
    private fullArea: ContentArea;
    private _hasArea: boolean = false;

    get hasArea(): boolean {
        return this._hasArea;
    }

    clear() {
        this.area = null;
        this.header = null;
        this._hasArea = false;
        this.fullArea.contentItem = null;
    }

    set(area : ContentArea, header : ContentArea, item) {
        this.area = area;
        this.header = header;
        mergeAreas(area, header, this.fullArea);
        this.fullArea.contentItem = item.parent;
        this._hasArea = true;
    }
}