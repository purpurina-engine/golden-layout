import IContentItem from "./IContentItem";
import Header from "../controls/Header";

export default interface IStack extends IContentItem {
    readonly header: Header;
}