
export default class GoldenLayoutError extends Error {

    name: string;
    type: string;

    constructor(message: string, type?: string) {
        super();

        this.name = 'GoldenLayout Error';
        this.message = message;
        this.type = type || '';
    }
}
