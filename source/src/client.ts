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
    }

    #getGlobalNamePrefix() {
        return GetInvokingResource() || GetCurrentResourceName();
    }

    /** Backend function for triggerserver. Do not use if you dunno what you are doing. */
    #__triggerServer__(eventName: string, args: any, ev: ClientEventInfo) {
        emitNet("rpc:TRIGGER_SERVER", { eventName, args, ev });
    }

    public triggerGlobalServer(eventName: string, args?: any) {
        this.#__triggerServer__(eventName + this.#getGlobalNamePrefix(), args, { env: "client" });
    }

    /** Trigger a server event from clientside. (Client->Server) */
    public triggerServer(eventName: string, args?: any) {
        this.#__triggerServer__(eventName, args, { env: "client" });
    }

    #__callServer__(eventName: string, args: any, ev: ClientEventInfo) {
        const id = this.#generateId();

        this.#pendings[id] = new AquiverPromise();

        emitNet("rpc:CALL_SERVER", { eventName, args, id, ev });

        return this.#pendings[id].promise;
    }

    public callGlobalServer(eventName: string, args?: any) {
        return this.#__callServer__(eventName + this.#getGlobalNamePrefix(), args, { env: "client" });
    }

    public callServer(eventName: string, args?: any) {
        return this.#__callServer__(eventName, args, { env: "client" });
    }

    #__on__(eventName: string, cb: EventCallback) {
        if (!this.#events[eventName]) {
            this.#events[eventName] = new Set();
        }

        this.#events[eventName].add(cb);

        return () => this.#__off__(eventName, cb);
    }

    #__off__(eventName: string, cb: EventCallback) {
        if (!this.#events[eventName]) return false;

        this.#events[eventName].delete(cb);

        return true;
    }

    public onGlobal(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName + this.#getGlobalNamePrefix(), cb);
    }

    public on(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb);
    }

    public triggerGlobal(eventName: string, args?: any) {
        this.#__trigger__(eventName + this.#getGlobalNamePrefix(), args, { env: "client" });
    }

    public trigger(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "client" });
    }

    /** Backend function for triggering an event locally. Do not use if you dunno what you are doing. */
    #__trigger__(eventName: string, args: any, ev: ClientEventInfo) {
        const registeredEvents = this.#events[eventName];
        if (!registeredEvents) return;

        registeredEvents.forEach(a => {
            a(args, ev);
        });
    }

    #__register__(eventName: string, cb: RemoteCallback) {
        if (typeof eventName !== "string" || typeof cb !== "function") return;

        console.log(`client register ${eventName}`);

        this.#rpcListeners[eventName] = cb;

        return () => this.unregister(eventName);
    }

    public registerGlobal(eventName: string, cb: RemoteCallback) {
        return this.#__register__(eventName + this.#getGlobalNamePrefix(), cb);
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
        return this.#__unregister__(eventName);
    }

    #__unregister__(eventName: string) {
        if (!this.#rpcListeners[eventName]) return false;

        console.log(`unregister ${eventName}`);

        delete this.#rpcListeners[eventName];

        return true;
    }

    #__call__<T>(eventName: string, args: any, ev: ClientEventInfo): Promise<T> {
        if (typeof this.#rpcListeners[eventName] !== "function") return Promise.reject(`Call event function does not exist: ${eventName}`);

        return Promise.resolve(this.#rpcListeners[eventName](args, ev));
    }

    public callGlobal<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName + this.#getGlobalNamePrefix(), args, { env: "client" });
    }

    public call<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "client" });
    }

    #generateId() {
        this.#idCounter++;

        return this.#idCounter;
    }
}