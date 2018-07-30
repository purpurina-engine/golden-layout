import AbstractContentItem from './AbstractContentItem';
import ItemContainer from '../container/ItemContainer';
import LayoutManager from '../LayoutManager';
import ItemConfigType, { ComponentConfig } from '../config/ItemConfigType';
import { isContentItemConfig } from '../utils/utils';


/**
 * @param {[type]} layoutManager [description]
 * @param {[type]} config      [description]
 * @param {[type]} parent        [description]
 */


export default class Component extends AbstractContentItem {

    private container: ItemContainer;
    componentName: string;
    instance: any;
    element: JQuery<HTMLElement>

    constructor(layoutManager: LayoutManager, config: ComponentConfig, parent) {

        super(layoutManager, config, parent);


        let ComponentConstructor = layoutManager.getComponent(config.componentName),
            componentConfig = $.extend(true, {}, config.componentState || {});

        componentConfig.componentName = config.componentName;
        this.componentName = config.componentName;

        if (this.config.title === '') {
            this.config.title = config.componentName;
        }

        this.isComponent = true;
        this.container = new ItemContainer(config, this, layoutManager);
        this.instance = new ComponentConstructor(this.container, componentConfig);
        this.element = this.container.element;
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
