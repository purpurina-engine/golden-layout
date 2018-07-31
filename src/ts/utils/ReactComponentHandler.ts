import Container from "../container/Container";
import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { ReactComponentConfig } from "../config/ItemConfigType";

/**
 * A specialized GoldenLayout component that binds GoldenLayout container
 * lifecycle events to react components
 *
 * @constructor
 *
 * @param {Container} container
 * @param {any} state state is not required for react components
 */


export default class ReactComponentHandler {

    private _reactComponent: React.Component;
    private _originalComponentWillUpdate: any;
    private _container: Container;
    private _initialState: any;
    private _reactClass: any;



    constructor(container: Container, state?: any) {
        this._reactComponent = null;
        this._originalComponentWillUpdate = null;
        this._container = container;
        this._initialState = state;
        this._reactClass = this._getReactClass();
        this._container.on('open', this._render, this);
        this._container.on('destroy', this._destroy, this);
    }



    /**
     * Creates the react class and component and hydrates it with
     * the initial state - if one is present
     *
     * By default, react's getInitialState will be used
     *
     * @private
     * @returns {void}
     */
    private _render() {
        this._reactComponent = ReactDOM.render(this._getReactComponent(), this._container.getElement()[0]);
        this._originalComponentWillUpdate = this._reactComponent.componentWillUpdate || function () { };
        this._reactComponent.componentWillUpdate = this._onUpdate.bind(this);
        if (this._container.getState()) {
            this._reactComponent.setState(this._container.getState());
        }
    }

    /**
     * Removes the component from the DOM and thus invokes React's unmount lifecycle
     *
     * @private
     * @returns {void}
     */
    private _destroy() {
        ReactDOM.unmountComponentAtNode(this._container.getElement()[0]);
        this._container.off('open', this._render, this);
        this._container.off('destroy', this._destroy, this);
    }

    /**
     * Hooks into React's state management and applies the componentstate
     * to GoldenLayout
     *
     * @private
     * @returns {void}
     */
    private _onUpdate(nextProps, nextState) {
        this._container.setState(nextState);
        this._originalComponentWillUpdate.call(this._reactComponent, nextProps, nextState);
    }

    /**
     * Retrieves the react class from GoldenLayout's registry
     *
     * @private
     * @returns {React.Class}
     */
    private _getReactClass() {
        const componentName = (<ReactComponentConfig>this._container.config).component;
        let reactClass;

        if (!componentName) {
            throw new Error('No react component name. type: react-component needs a field `component`');
        }

        reactClass = this._container.layoutManager.getComponent(componentName);

        if (!reactClass) {
            throw new Error('React component "' + componentName + '" not found. ' +
                'Please register all components with GoldenLayout using `registerComponent(name, component)`');
        }

        return reactClass;
    }

    /**
     * Copies and extends the properties array and returns the React element
     *
     * @private
     * @returns {React.Element}
     */
    private _getReactComponent() {
        let defaultProps = {
            glEventHub: this._container.layoutManager.eventHub,
            glContainer: this._container,
        };
        let props = $.extend(defaultProps, (<ReactComponentConfig>this._container.config).props);
        return React.createElement(this._reactClass, props);
    }
}
