import { AquiverPromise, EventInfo } from "./shared_promise";

type RemoteCallback = (args: any, info: ServerEventInfo) => any;
type EventCallback = (args: any, info: ServerEventInfo) => void;

interface ServerEventInfo extends EventInfo {
    source?: number;
}

new class ServerRPC {

    #rpcListeners: Record<string, RemoteCallback> = {};
    #pendings: Record<number, AquiverPromise<any>> = {}
    #events: Record<string, Set<EventCallback>> = {}

    #idCounter: number = 1;

    #DEBUG_ENABLED = false;

    constructor() {
        onNet("rpc:TRIGGER_SERVER", ({ eventName, args, ev }: { eventName: string; args?: any; ev: ServerEventInfo }) => {
            const source = globalThis.source;
            ev.source = Number(source);

            this.#__trigger__(eventName, args, ev);
        });

        onNet("rpc:CALL_SERVER", ({ eventName, args, id, ev }: { eventName: string; args?: any; id: number; ev: ServerEventInfo }) => {
            const source = globalThis.source;

            this.#__call__(eventName, args, { env: ev.env, source: source }).then(response => {
                emitNet("rpc:CALL_SERVER_RESOLVE", source, { response, id });
            });
        });

        onNet("rpc:CALL_CLIENT_RESOLVE", ({ response, id }) => {
            const pendingPromise = this.#pendings[id];
            if (pendingPromise instanceof AquiverPromise) {
                pendingPromise.resolve(response);
            }

            if (this.#pendings[id]) {
                delete this.#pendings[id];
            }
        });

        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods.forEach(methodName => {
            if (methodName.startsWith("constructor")) return;

            globalThis.exports(methodName, this[methodName].bind(this));
        });

        globalThis.exports("debug", (state: boolean) => this.#DEBUG_ENABLED = state);
    }

    #debug(message: string) {
        if (!this.#DEBUG_ENABLED) return;

        console.log(`^3[Server]: ${message}`);
    }

    #getGlobalNamePrefix() {
        return ":" + GetInvokingResource() || GetCurrentResourceName();
    }

    public onGlobalMany(e: Record<string, EventCallback>) {
        this.#__onMany__(e, true);
    }

    public onMany(e: Record<string, EventCallback>) {
        this.#__onMany__(e);
    }

    #__onMany__(e: Record<string, EventCallback>, global: boolean = false) {
        if (!e || typeof e !== "object") {
            this.#debug(`__onMany__: e is not an object.`);
            return;
        }

        for (const key in e) {
            this.#__on__(key, e[key], global);
        }
    }

    public onGlobal(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb, true);
    }

    public on(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb);
    }

    public offGlobal(eventName: string, cb: EventCallback) {
        return this.#__off__(eventName, cb, true);
    }

    public off(eventName: string, cb: EventCallback) {
        return this.#__off__(eventName, cb);
    }

    #__on__(eventName: string, cb: EventCallback, global: boolean = false) {
        if (typeof eventName !== "string") {
            this.#debug(`__on__ eventName is not a string.`);
            return;
        }

        if (typeof cb !== "function") {
            this.#debug(`__on__ cb is not a function.`);
            return;
        }

        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        if (!this.#events[eventName]) {
            this.#events[eventName] = new Set();
        }

        this.#debug(`__on__: ${eventName}`);

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

        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        if (!this.#events[eventName]) return false;

        this.#debug(`__off__: ${eventName}`);

        this.#events[eventName].delete(cb);

        return true;
    }

    public triggerGlobal(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "server" }, true);
    }

    /** Trigger a server event. */
    public trigger(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "server" });
    }

    /** Backend function for triggering an event locally. Do not use if you dunno what you are doing. */
    #__trigger__(eventName: string, args: any, ev: ServerEventInfo, global: boolean = false) {
        if (global) {
            eventName += this.#getGlobalNamePrefix();
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

        if (global) {
            eventName += this.#getGlobalNamePrefix();
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

    #__unregister__(eventName: string, global: boolean = false) {
        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        if (!this.#rpcListeners[eventName]) return false;

        this.#debug(`__unregister__: ${eventName}`);

        delete this.#rpcListeners[eventName];

        return true;
    }

    public unregisterGlobal(eventName: string) {
        return this.#__unregister__(eventName, true);
    }

    /** Unregister an rpc. */
    public unregister(eventName: string) {
        return this.#__unregister__(eventName);
    }

    #__call__<T>(eventName: string, args: any, ev: ServerEventInfo, global: boolean = false): Promise<T> {
        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        if (typeof this.#rpcListeners[eventName] !== "function") return Promise.reject(`Call event function does not exist: ${eventName}`);

        return Promise.resolve(this.#rpcListeners[eventName](args, ev));
    }

    public callGlobal<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "server" }, true);
    }

    /** Call an event locally. (Server<->Server) */
    public call<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "server" });
    }

    #__callClient__(source: number, eventName: string, args: any, global: boolean = false) {
        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        const id = this.#generateId();

        this.#pendings[id] = new AquiverPromise();

        emitNet("rpc:CALL_CLIENT", source, { eventName, args, id });

        return this.#pendings[id].promise;
    }

    public callGlobalClient(source: number, eventName: string, args?: any) {
        return this.#__callClient__(source, eventName, args, true);
    }

    public callClient(source: number, eventName: string, args?: any) {
        return this.#__callClient__(source, eventName, args);
    }

    #__triggerClient__(source: number, eventName: string, args: any, global: boolean = false) {
        if (global) {
            eventName += this.#getGlobalNamePrefix();
        }

        emitNet("rpc:TRIGGER_CLIENT", source, { eventName, args });
    }

    public triggerGlobalClient(source: number, eventName: string, args?: any) {
        this.#__triggerClient__(source, eventName, args, true);
    }

    public triggerClient(source: number, eventName: string, args?: any) {
        this.#__triggerClient__(source, eventName, args);
    }

    #generateId() {
        this.#idCounter++;
        return this.#idCounter;
    }
}