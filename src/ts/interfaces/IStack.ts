import IContentItem from "./IContentItem";
import IHeader from "./IHeader";
import { Dimension } from "./Commons";


export interface Docker {
    dimension?:Dimension,
    size?: number;
    realSize?: number;
    docked?: boolean;
}

export default interface IStack extends IContentItem {
    readonly header: IHeader;
    docker: Docker;
}
