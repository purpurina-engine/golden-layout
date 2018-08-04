import { Dimension } from "./Commons";

export default interface Docker {
    dimension?:Dimension,
    size?: number;
    realSize?: number;
    docked?: boolean;
}