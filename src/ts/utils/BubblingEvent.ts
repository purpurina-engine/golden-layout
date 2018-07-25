
export default class BubblingEvent {

    name: string;
    origin: any;
    isPropagationStopped: boolean;

    constructor(name, origin) {
        this.name = name;
        this.origin = origin;
        this.isPropagationStopped = false;
    }

    stopPropagation() {
        this.isPropagationStopped = true;
    }
}