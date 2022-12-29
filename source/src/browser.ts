import axios from "axios";

export class BrowserRPC {

    // @ts-ignore
    private resourceName = GetParentResourceName()

    constructor() {

    }

    triggerServer(eventName: string, args?: any) {
        axios.post(`https://${this.resourceName}/BROWSER_TO_SERVER`, {
            eventName,
            args
        });
    }

    async callServer<T>(eventName: string, args?: any): Promise<T> {
        const response = await axios.post(`https://${this.resourceName}/BROWSER_CALL_SERVER`, {
            eventName,
            args
        });

        return response.data;
    }

    async callClient<T>(eventName: string, args?: any): Promise<T> {
        const response = await axios.post(`https://${this.resourceName}/BROWSER_CALL_CLIENT`, {
            eventName,
            args
        });

        return response.data;
    }

    triggerClient(eventName: string, args?: any) {
        axios.post(`https://${this.resourceName}/BROWSER_TO_CLIENT`, {
            eventName,
            args
        });
    }
}

export const rpc = new BrowserRPC();