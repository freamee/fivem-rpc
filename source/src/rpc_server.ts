import { AquiverPromise, EventInfo } from "./shared_promise";

type RemoteCallback = (args: any, info: ServerEventInfo) => any;
type EventCallback = (args: any, info: ServerEventInfo) => void;

interface ServerEventInfo extends EventInfo {
    source?: number;
}

const rp = new class ServerRPC {

    #rpcListeners: Record<string, RemoteCallback> = {};
    #pendings: Record<number, AquiverPromise<any>> = {}
    #events: Record<string, Set<EventCallback>> = {}

    #idCounter: number = 1;

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
    }

    #getGlobalNamePrefix() {
        return GetInvokingResource() || GetCurrentResourceName();
    }

    public onGlobal(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName + this.#getGlobalNamePrefix(), cb);
    }

    public on(eventName: string, cb: EventCallback) {
        return this.#__on__(eventName, cb);
    }

    public offGlobal(eventName: string, cb: EventCallback) {
        return this.#__off__(eventName + this.#getGlobalNamePrefix(), cb);
    }

    public off(eventName: string, cb: EventCallback) {
        return this.#__off__(eventName, cb);
    }

    #__on__(eventName: string, cb: EventCallback) {
        if (typeof cb !== "function") {
            throw new Error("on event cb is not a function.");
        }

        if (!this.#events[eventName]) {
            this.#events[eventName] = new Set();
        }

        this.#events[eventName].add(cb);

        return () => this.#__off__(eventName, cb);
    }

    #__off__(eventName: string, cb: EventCallback) {
        if (typeof cb !== "function") {
            throw new Error("off event cb is not a function.");
        }

        if (!this.#events[eventName]) return false;

        this.#events[eventName].delete(cb);

        return true;
    }

    public triggerGlobal(eventName: string, args?: any) {
        this.#__trigger__(eventName + this.#getGlobalNamePrefix(), args, { env: "server" });
    }

    /** Trigger a server event. */
    public trigger(eventName: string, args?: any) {
        this.#__trigger__(eventName, args, { env: "server" });
    }

    /** Backend function for triggering an event locally. Do not use if you dunno what you are doing. */
    #__trigger__(eventName: string, args: any, ev: ServerEventInfo) {
        const registeredEvents = this.#events[eventName];
        if (!registeredEvents) return;

        registeredEvents.forEach(a => {
            a(args, ev);
        });
    }

    #__register__(eventName: string, cb: RemoteCallback) {
        if (typeof eventName !== "string" || typeof cb !== "function") {
            throw new Error("registerGlobal eventName is not a string or cb is not a function.");
        }

        if (this.#rpcListeners[eventName]) {
            console.log(`register rpc ${eventName} already exist, it was overwritten.`);
        }

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

    #__unregister__(eventName: string) {
        if (!this.#rpcListeners[eventName]) return false;

        console.log(`unregister ${eventName}`);

        delete this.#rpcListeners[eventName];

        return true;
    }

    public unregisterGlobal(eventName: string) {
        return this.#__unregister__(eventName + this.#getGlobalNamePrefix());
    }

    /** Unregister an rpc. */
    public unregister(eventName: string) {
        return this.#__unregister__(eventName);
    }

    #__call__<T>(eventName: string, args: any, ev: ServerEventInfo): Promise<T> {
        if (typeof this.#rpcListeners[eventName] !== "function") return Promise.reject(`Call event function does not exist: ${eventName}`);

        return Promise.resolve(this.#rpcListeners[eventName](args, ev));
    }

    public callGlobal<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName + this.#getGlobalNamePrefix(), args, { env: "server" });
    }

    /** Call an event locally. (Server<->Server) */
    public call<T>(eventName: string, args?: any): Promise<T> {
        return this.#__call__(eventName, args, { env: "server" });
    }

    #__callClient__(source: number, eventName: string, args?: any) {
        const id = this.#generateId();

        this.#pendings[id] = new AquiverPromise();

        emitNet("rpc:CALL_CLIENT", source, { eventName, args, id });

        return this.#pendings[id].promise;
    }

    public callGlobalClient(source: number, eventName: string, args?: any) {
        return this.#__callClient__(source, eventName + this.#getGlobalNamePrefix(), args);
    }

    public callClient(source: number, eventName: string, args?: any) {
        return this.#__callClient__(source, eventName, args);
    }

    #__triggerClient__(source: number, eventName: string, args?: any) {
        emitNet("rpc:TRIGGER_CLIENT", source, { eventName, args });
    }

    public triggerGlobalClient(source: number, eventName: string, args?: any) {
        this.#__triggerClient__(source, eventName + this.#getGlobalNamePrefix(), args);
    }

    public triggerClient(source: number, eventName: string, args?: any) {
        this.#__triggerClient__(source, eventName, args);
    }

    #generateId() {
        this.#idCounter++;
        return this.#idCounter;
    }
}