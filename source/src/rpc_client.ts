import { AquiverPromise, EventInfo } from "./shared_promise";

type RemoteCallback = (args: any, info: ClientEventInfo) => any;
type EventCallback = (args: any, info: ClientEventInfo) => void;

interface ClientEventInfo extends EventInfo {

}

new class ClientRPC {

    #pendings: Record<number, AquiverPromise<any>> = {}
    #rpcListeners: Record<string, RemoteCallback> = {}
    #events: Record<string, Set<EventCallback>> = {}

    #idCounter: number = 1;

    #DEBUG_ENABLED = false;

    constructor() {
        RegisterNuiCallbackType("BROWSER_TO_SERVER");
        onNet("__cfx_nui:BROWSER_TO_SERVER", ({ eventName, args }, cb) => {
            this.#__triggerServer__(eventName, args, {
                env: "browser"
            });

            cb({});
        });

        RegisterNuiCallbackType("BROWSER_CALL_SERVER");
        onNet("__cfx_nui:BROWSER_CALL_SERVER", ({ eventName, args }, cb) => {
            this.#__callServer__(eventName, args, { env: "browser" }).then(res => {
                cb(res);
            });
        });

        RegisterNuiCallbackType("BROWSER_CALL_CLIENT");
        onNet("__cfx_nui:BROWSER_CALL_CLIENT", ({ eventName, args }, cb) => {
            this.#__call__(eventName, args, { env: "browser" }).then(res => {
                cb(res);
            });
        });

        RegisterNuiCallbackType("BROWSER_TO_CLIENT");
        onNet("__cfx_nui:BROWSER_TO_CLIENT", ({ eventName, args }, cb) => {
            this.#__trigger__(eventName, args, { env: "browser" });

            cb({});
        });

        onNet("rpc:CALL_SERVER_RESOLVE", ({ id, response }) => {
            const pendingPromise = this.#pendings[id];
            if (pendingPromise instanceof AquiverPromise) {
                pendingPromise.resolve(response);
            }

            if (this.#pendings[id]) {
                delete this.#pendings[id];
            }
        });

        onNet("rpc:CALL_CLIENT", ({ eventName, args, id }) => {
            this.#__call__(eventName, args, { env: "server" }).then(response => {
                emitNet("rpc:CALL_CLIENT_RESOLVE", { response, id });
            });
        });

        onNet("rpc:TRIGGER_CLIENT", ({ eventName, args }) => {
            this.#__trigger__(eventName, args, { env: "server" });
        });

        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods.forEach(methodName => {
            if (methodName.startsWith("constructor")) return;

            globalThis.exports(methodName, this[methodName].bind(this));
        });

        globalThis.exports("debug", (state: boolean) => this.#DEBUG_ENABLED = state);

        AddEventHandler("onResourceStop", (resourceName) => {
            for (const key in this.#events) {
                if (key.includes(resourceName)) {
                    delete this.#events[key];
                }
            }

            for (const key in this.#rpcListeners) {
                if (key.includes(resourceName)) {
                    delete this.#rpcListeners[key];
                }
            }
        });
    }

    #debug(message: string) {
        if (!this.#DEBUG_ENABLED) return;

        console.log(`^3[Client]: ${message}`);
    }

    #getNamePrefix() {
        return ":" + GetInvokingResource() || GetCurrentResourceName();
    }

    /** Backend function for triggerserver. Do not use if you dunno what you are doing. */
    #__triggerServer__(eventName: string, args: any, ev: ClientEventInfo, global: boolean = false) {
        if (!global) {
            eventName += this.#getNamePrefix();
        }

        emitNet("rpc:TRIGGER_SERVER", { eventName, args, ev });
    }

    public triggerGlobalServer(eventName: string, args?: any) {
        this.#__triggerServer__(eventName, args, { env: "client" }, true);
    }

    /** Trigger a server event from clientside. (Client->Server) */
    public triggerServer(eventName: string, args?: any) {
        this.#__triggerServer__(eventName, args, { env: "client" });
    }

    #__callServer__(eventName: string, args: any, ev: ClientEventInfo, global: boolean = false) {
        if (!global) {
            eventName += this.#getNamePrefix();
        }

        const id = this.#generateId();

        this.#pendings[id] = new AquiverPromise();

        emitNet("rpc:CALL_SERVER", { eventName, args, id, ev });

        return this.#pendings[id].promise;
    }

    public callGlobalServer(eventName: string, args?: any) {
        return this.#__callServer__(eventName + this.#getNamePrefix(), args, { env: "client" }, true);
    }

    public callServer(eventName: string, args?: any) {
        return this.#__callServer__(eventName, args, { env: "client" });
    }

    #__on__(eventName: string, cb: EventCallback, global: boolean = false) {
        if (typeof eventName !== "string") {
            this.#debug(`__on__ eventName is not a string.`);
            return;
        }

        if (typeof eventName !== "string") {
            this.#debug(`__on__ cb is not a function.`);
            return;
        }

        if (!global) {
            eventName += this.#getNamePrefix();
        }

        if (!this.#events[eventName]) {
            this.#events[eventName] = new Set();
        }

        this.#events[eventName].add(cb);

        return () => this.#__off__(eventName, cb);
    }

    #__off__(eventName: string, cb: EventCallback, global: boolean = false) {
        if (typeof eventName !== "string") {
            this.#debug(`__off__ eventName is not a string.`);
            return;
        }

        if (typeof cb !== "function") {
            this.#debug(`__off__ cb is not a function.`);
            return;
        }

        if (!global) {
            eventName += this.#getNamePrefix();
        }

        if (!this.#events[eventName]) return false;

        this.#events[eventName].delete(cb);

        return true;
    }

    public onGlobal(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb, true);
    }

    public on(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb);
    }

    public triggerGlobal(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "client" }, true);
    }

    public trigger(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "client" });
    }

    /** Backend function for triggering an event locally. Do not use if you dunno what you are doing. */
    #__trigger__(eventName: string, args: any, ev: ClientEventInfo, global: boolean = false) {
        if (!global) {
            eventName += this.#getNamePrefix();
        }

        const registeredEvents = this.#events[eventName];
        if (!registeredEvents) return;

        registeredEvents.forEach(a => {
            a(args, ev);
        });
    }

    #__register__(eventName: string, cb: RemoteCallback, global: boolean = false) {
        if (typeof eventName !== "string") {
            this.#debug(`__register__ eventName is not a string.`);
            return;
        }

        if (typeof cb !== "function") {
            this.#debug(`__register__ cb is not a function.`);
            return;
        }

        if (!global) {
            eventName += this.#getNamePrefix();
        }

        if (this.#rpcListeners[eventName]) {
            this.#debug(`__register__ ${eventName} already exist, it was overwritten with a new function.`);
        }

        this.#debug(`__register__: ${eventName}`);

        this.#rpcListeners[eventName] = cb;

        return () => this.unregister(eventName);
    }

    public registerGlobal(eventName: string, cb: RemoteCallback) {
        return this.#__register__(eventName, cb, true);
    }

    /**
     * Register an rpc.
     * @returns the unregister function.
     */
    public register(eventName: string, cb: RemoteCallback) {
        return this.#__register__(eventName, cb);
    }

    public unregister(eventName: string) {
        return this.#__unregister__(eventName);
    }

    public unregisterGlobal(eventName: string) {
        return this.#__unregister__(eventName, true);
    }

    #__unregister__(eventName: string, global: boolean = false) {
        if (!global) {
            eventName += this.#getNamePrefix();
        }

        if (!this.#rpcListeners[eventName]) return false;

        this.#debug(`__unregister__: ${eventName}`);

        delete this.#rpcListeners[eventName];

        return true;
    }

    #__call__<T>(eventName: string, args: any, ev: ClientEventInfo, global: boolean = false): Promise<T> {
        if (!global) {
            eventName += this.#getNamePrefix();
        }

        if (typeof this.#rpcListeners[eventName] !== "function") return Promise.reject(`Call event function does not exist: ${eventName}`);

        return Promise.resolve(this.#rpcListeners[eventName](args, ev));
    }

    public callGlobal<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "client" }, true);
    }

    public call<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "client" });
    }

    #generateId() {
        this.#idCounter++;

        return this.#idCounter;
    }
}