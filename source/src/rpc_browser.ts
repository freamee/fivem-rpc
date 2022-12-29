import axios from "axios";
import { CONFIG } from "./config";

export default new class BrowserRPC {

    constructor() {
    }

    triggerGlobalServer(eventName: string, args?: any) {
        axios.post(`https://${CONFIG.RESOURCE_NAME}/BROWSER_TO_SERVER`, {
            eventName,
            args
        });
    }

    async callGlobalServer<T>(eventName: string, args?: any): Promise<T> {
        const response = await axios.post(`https://${CONFIG.RESOURCE_NAME}/BROWSER_CALL_SERVER`, {
            eventName,
            args
        });

        return response.data;
    }

    async callGlobalClient<T>(eventName: string, args?: any): Promise<T> {
        const response = await axios.post(`https://${CONFIG.RESOURCE_NAME}/BROWSER_CALL_CLIENT`, {
            eventName,
            args
        });

        return response.data;
    }

    triggerGlobalClient(eventName: string, args?: any) {
        axios.post(`https://${CONFIG.RESOURCE_NAME}/BROWSER_TO_CLIENT`, {
            eventName,
            args
        });
    }
}