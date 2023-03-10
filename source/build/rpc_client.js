var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/shared_promise.ts
var AquiverPromise = class {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
};

// src/rpc_client.ts
var _pendings, _rpcListeners, _events, _idCounter, _DEBUG_ENABLED, _debug, debug_fn, _getGlobalNamePrefix, getGlobalNamePrefix_fn, ___triggerServer__, __triggerServer___fn, ___callServer__, __callServer___fn, ___on__, __on___fn, ___off__, __off___fn, ___trigger__, __trigger___fn, ___register__, __register___fn, ___unregister__, __unregister___fn, ___call__, __call___fn, _generateId, generateId_fn, _a;
new (_a = class {
  constructor() {
    __privateAdd(this, _debug);
    __privateAdd(this, _getGlobalNamePrefix);
    __privateAdd(this, ___triggerServer__);
    __privateAdd(this, ___callServer__);
    __privateAdd(this, ___on__);
    __privateAdd(this, ___off__);
    __privateAdd(this, ___trigger__);
    __privateAdd(this, ___register__);
    __privateAdd(this, ___unregister__);
    __privateAdd(this, ___call__);
    __privateAdd(this, _generateId);
    __privateAdd(this, _pendings, {});
    __privateAdd(this, _rpcListeners, {});
    __privateAdd(this, _events, {});
    __privateAdd(this, _idCounter, 1);
    __privateAdd(this, _DEBUG_ENABLED, false);
    RegisterNuiCallbackType("BROWSER_TO_SERVER");
    onNet("__cfx_nui:BROWSER_TO_SERVER", ({ eventName, args }, cb) => {
      __privateMethod(this, ___triggerServer__, __triggerServer___fn).call(this, eventName, args, {
        env: "browser"
      });
      cb({});
    });
    RegisterNuiCallbackType("BROWSER_CALL_SERVER");
    onNet("__cfx_nui:BROWSER_CALL_SERVER", ({ eventName, args }, cb) => {
      __privateMethod(this, ___callServer__, __callServer___fn).call(this, eventName, args, { env: "browser" }).then((res) => {
        cb(res);
      });
    });
    RegisterNuiCallbackType("BROWSER_CALL_CLIENT");
    onNet("__cfx_nui:BROWSER_CALL_CLIENT", ({ eventName, args }, cb) => {
      __privateMethod(this, ___call__, __call___fn).call(this, eventName, args, { env: "browser" }).then((res) => {
        cb(res);
      });
    });
    RegisterNuiCallbackType("BROWSER_TO_CLIENT");
    onNet("__cfx_nui:BROWSER_TO_CLIENT", ({ eventName, args }, cb) => {
      __privateMethod(this, ___trigger__, __trigger___fn).call(this, eventName, args, { env: "browser" });
      cb({});
    });
    onNet("rpc:CALL_SERVER_RESOLVE", ({ id, response }) => {
      const pendingPromise = __privateGet(this, _pendings)[id];
      if (pendingPromise instanceof AquiverPromise) {
        pendingPromise.resolve(response);
      }
      if (__privateGet(this, _pendings)[id]) {
        delete __privateGet(this, _pendings)[id];
      }
    });
    onNet("rpc:CALL_CLIENT", ({ eventName, args, id }) => {
      __privateMethod(this, ___call__, __call___fn).call(this, eventName, args, { env: "server" }).then((response) => {
        emitNet("rpc:CALL_CLIENT_RESOLVE", { response, id });
      });
    });
    onNet("rpc:TRIGGER_CLIENT", ({ eventName, args }) => {
      __privateMethod(this, ___trigger__, __trigger___fn).call(this, eventName, args, { env: "server" });
    });
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.forEach((methodName) => {
      if (methodName.startsWith("constructor"))
        return;
      globalThis.exports(methodName, this[methodName].bind(this));
    });
    globalThis.exports("debug", (state) => __privateSet(this, _DEBUG_ENABLED, state));
    AddEventHandler("onResourceStop", (resourceName) => {
      for (const key in __privateGet(this, _events)) {
        if (key.includes(resourceName)) {
          delete __privateGet(this, _events)[key];
        }
      }
      for (const key in __privateGet(this, _rpcListeners)) {
        if (key.includes(resourceName)) {
          delete __privateGet(this, _rpcListeners)[key];
        }
      }
    });
  }
  triggerGlobalServer(eventName, args) {
    __privateMethod(this, ___triggerServer__, __triggerServer___fn).call(this, eventName, args, { env: "client" }, true);
  }
  triggerServer(eventName, args) {
    __privateMethod(this, ___triggerServer__, __triggerServer___fn).call(this, eventName, args, { env: "client" });
  }
  callGlobalServer(eventName, args) {
    return __privateMethod(this, ___callServer__, __callServer___fn).call(this, eventName + __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this), args, { env: "client" }, true);
  }
  callServer(eventName, args) {
    return __privateMethod(this, ___callServer__, __callServer___fn).call(this, eventName, args, { env: "client" });
  }
  onGlobal(eventName, cb) {
    return __privateMethod(this, ___on__, __on___fn).call(this, eventName, cb, true);
  }
  on(eventName, cb) {
    return __privateMethod(this, ___on__, __on___fn).call(this, eventName, cb);
  }
  triggerGlobal(eventName, args) {
    __privateMethod(this, ___trigger__, __trigger___fn).call(this, eventName, args, { env: "client" }, true);
  }
  trigger(eventName, args) {
    __privateMethod(this, ___trigger__, __trigger___fn).call(this, eventName, args, { env: "client" });
  }
  registerGlobal(eventName, cb) {
    return __privateMethod(this, ___register__, __register___fn).call(this, eventName, cb, true);
  }
  register(eventName, cb) {
    return __privateMethod(this, ___register__, __register___fn).call(this, eventName, cb);
  }
  unregister(eventName) {
    return __privateMethod(this, ___unregister__, __unregister___fn).call(this, eventName);
  }
  unregisterGlobal(eventName) {
    return __privateMethod(this, ___unregister__, __unregister___fn).call(this, eventName, true);
  }
  callGlobal(eventName, args) {
    return __privateMethod(this, ___call__, __call___fn).call(this, eventName, args, { env: "client" }, true);
  }
  call(eventName, args) {
    return __privateMethod(this, ___call__, __call___fn).call(this, eventName, args, { env: "client" });
  }
}, _pendings = new WeakMap(), _rpcListeners = new WeakMap(), _events = new WeakMap(), _idCounter = new WeakMap(), _DEBUG_ENABLED = new WeakMap(), _debug = new WeakSet(), debug_fn = function(message) {
  if (!__privateGet(this, _DEBUG_ENABLED))
    return;
  console.log(`^3[Client]: ${message}`);
}, _getGlobalNamePrefix = new WeakSet(), getGlobalNamePrefix_fn = function() {
  return ":" + GetInvokingResource() || GetCurrentResourceName();
}, ___triggerServer__ = new WeakSet(), __triggerServer___fn = function(eventName, args, ev, global = false) {
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  emitNet("rpc:TRIGGER_SERVER", { eventName, args, ev });
}, ___callServer__ = new WeakSet(), __callServer___fn = function(eventName, args, ev, global = false) {
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  const id = __privateMethod(this, _generateId, generateId_fn).call(this);
  __privateGet(this, _pendings)[id] = new AquiverPromise();
  emitNet("rpc:CALL_SERVER", { eventName, args, id, ev });
  return __privateGet(this, _pendings)[id].promise;
}, ___on__ = new WeakSet(), __on___fn = function(eventName, cb, global = false) {
  if (typeof eventName !== "string") {
    __privateMethod(this, _debug, debug_fn).call(this, `__on__ eventName is not a string.`);
    return;
  }
  if (typeof eventName !== "string") {
    __privateMethod(this, _debug, debug_fn).call(this, `__on__ cb is not a function.`);
    return;
  }
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  if (!__privateGet(this, _events)[eventName]) {
    __privateGet(this, _events)[eventName] = /* @__PURE__ */ new Set();
  }
  __privateGet(this, _events)[eventName].add(cb);
  return () => __privateMethod(this, ___off__, __off___fn).call(this, eventName, cb);
}, ___off__ = new WeakSet(), __off___fn = function(eventName, cb, global = false) {
  if (typeof eventName !== "string") {
    __privateMethod(this, _debug, debug_fn).call(this, `__off__ eventName is not a string.`);
    return;
  }
  if (typeof cb !== "function") {
    __privateMethod(this, _debug, debug_fn).call(this, `__off__ cb is not a function.`);
    return;
  }
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  if (!__privateGet(this, _events)[eventName])
    return false;
  __privateGet(this, _events)[eventName].delete(cb);
  return true;
}, ___trigger__ = new WeakSet(), __trigger___fn = function(eventName, args, ev, global = false) {
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  const registeredEvents = __privateGet(this, _events)[eventName];
  if (!registeredEvents)
    return;
  registeredEvents.forEach((a) => {
    a(args, ev);
  });
}, ___register__ = new WeakSet(), __register___fn = function(eventName, cb, global = false) {
  if (typeof eventName !== "string") {
    __privateMethod(this, _debug, debug_fn).call(this, `__register__ eventName is not a string.`);
    return;
  }
  if (typeof cb !== "function") {
    __privateMethod(this, _debug, debug_fn).call(this, `__register__ cb is not a function.`);
    return;
  }
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  if (__privateGet(this, _rpcListeners)[eventName]) {
    __privateMethod(this, _debug, debug_fn).call(this, `__register__ ${eventName} already exist, it was overwritten with a new function.`);
  }
  __privateMethod(this, _debug, debug_fn).call(this, `__register__: ${eventName}`);
  __privateGet(this, _rpcListeners)[eventName] = cb;
  return () => this.unregister(eventName);
}, ___unregister__ = new WeakSet(), __unregister___fn = function(eventName, global = false) {
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  if (!__privateGet(this, _rpcListeners)[eventName])
    return false;
  __privateMethod(this, _debug, debug_fn).call(this, `__unregister__: ${eventName}`);
  delete __privateGet(this, _rpcListeners)[eventName];
  return true;
}, ___call__ = new WeakSet(), __call___fn = function(eventName, args, ev, global = false) {
  if (!global) {
    eventName += __privateMethod(this, _getGlobalNamePrefix, getGlobalNamePrefix_fn).call(this);
  }
  if (typeof __privateGet(this, _rpcListeners)[eventName] !== "function")
    return Promise.reject(`Call event function does not exist: ${eventName}`);
  return Promise.resolve(__privateGet(this, _rpcListeners)[eventName](args, ev));
}, _generateId = new WeakSet(), generateId_fn = function() {
  __privateWrapper(this, _idCounter)._++;
  return __privateGet(this, _idCounter);
}, _a)();
//# sourceMappingURL=rpc_client.js.map