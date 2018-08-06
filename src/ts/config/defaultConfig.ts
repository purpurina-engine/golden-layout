import Settings from './Settings'
import DimensionsSettings from './DimensionsSettings';
import Labels from './Labels';
import DragDropSettings from './DragDropSettings';
import ItemConfigType from './ItemConfigType';

class DefaultLayoutConfig {
    openPopouts: ItemConfigType[];
    
    settings: Settings = {
        hasHeaders: true,
        constrainDragToContainer: true,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: true,
        showMaximiseIcon: true,
        showCloseIcon: true,
        responsiveMode: 'onload', 
        tabOverlapAllowance: 0,
        reorderOnTabMenuClick: true,
        tabControlOffset: 10
    };

    dimensions: DimensionsSettings = {
        borderWidth: 5,
        borderGrabWidth: 15,
        minItemHeight: 10,
        minItemWidth: 10,
        headerHeight: 20,
        dragProxyWidth: 300,
        dragProxyHeight: 200
    };

    labels: Labels = {
        close: 'close',
        maximise: 'maximise',
        minimise: 'minimise',
        popout: 'open in new window',
        popin: 'pop in',
        tabDropdown: 'additional tabs'
    };

    dragDrop: DragDropSettings = {
        detachDragSource: true,
        showDragPreview: false,
        allowDropItself: false,
    }
}

const defaultConfig = new DefaultLayoutConfig();

export default defaultConfig;