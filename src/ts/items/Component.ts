import Container from '../container/Container';
import ItemConfigType, { ComponentConfig } from '../config/ItemConfigType';
import { isContentItemConfig } from '../utils/utils';
import ContentItem from './ContentItem';
import GoldenLayout from '../GoldenLayout';


export default class Component extends ContentItem {

    private _container: Container;
    private _instance: any;
    private _componentName: string;

    public get instance(): any {
        return this._instance;
    }

    public get componentName(): string {
        return this._componentName;
    }

    public get container(): Container {
        return this._container;
    }
    public set container(value: Container) {
        this._container = value;
    }

    constructor(layoutManager: GoldenLayout, config: ComponentConfig, parent: ContentItem) {

        super(layoutManager, config, parent);

        let ComponentConstructor = layoutManager.getComponent(config.componentName),
            componentConfig = $.extend(true, {}, config.componentState || {});

        componentConfig.componentName = config.componentName;
        this._componentName = config.componentName;

        if (this.config.title === '') {
            this.config.title = config.componentName;
        }

        this._isComponent = true;
        this._container = new Container(config, this, layoutManager);
        this._instance = new ComponentConstructor(this.container, componentConfig);
        this._element = this.container.element;
    }

    close() {
        this.parent.removeChild(this);
    }

    setSize() {
        if (this.element.css('display') !== 'none') {
            // Do not update size of hidden components to prevent unwanted reflows
            this.container._$setSize(this.element.width(), this.element.height());
        }
    }

    _$init() {
        //AbstractContentItem.prototype._$init.call(this);
        super._$init();
        this.container.emit('open');
        
    }

    _$hide() {
        this.container.hide();
        super._$hide();
        //AbstractContentItem.prototype._$hide.call(this);
    }

    _$show() {
        this.container.show();
        
        //AbstractContentItem.prototype._$show.call(this);
        super._$show();
    }

    _$shown() {
        // TODO
        // this.container.shown();
        // AbstractContentItem.prototype._$shown.call(this);
    }

    _$destroy() {
        this.container.emit('destroy', this);
        //AbstractContentItem.prototype._$destroy.call(this);
        super._$destroy();
    }

    /**
     * Dragging onto a component directly is not an option
     *
     * @returns null
     */
    _$getArea() {
        return null;
    }
}
