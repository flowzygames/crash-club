const NativeWebSocket = window.WebSocket;

class PatchedWebSocket {
  static CONNECTING = NativeWebSocket.CONNECTING;
  static OPEN = NativeWebSocket.OPEN;
  static CLOSING = NativeWebSocket.CLOSING;
  static CLOSED = NativeWebSocket.CLOSED;

  constructor(url, protocols) {
    this._ws = protocols ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);
    this._listeners = {
      open: new Set(),
      close: new Set(),
      error: new Set(),
      message: new Set()
    };
    this._playerId = "";
    this._lastLocalState = null;

    this._onopen = null;
    this._onclose = null;
    this._onerror = null;
    this._onmessage = null;

    this._ws.addEventListener("open", (event) => this._emit("open", event));
    this._ws.addEventListener("close", (event) => this._emit("close", event));
    this._ws.addEventListener("error", (event) => this._emit("error", event));
    this._ws.addEventListener("message", (event) => this._handleMessage(event));
  }

  get readyState() {
    return this._ws.readyState;
  }

  get bufferedAmount() {
    return this._ws.bufferedAmount;
  }

  get extensions() {
    return this._ws.extensions;
  }

  get protocol() {
    return this._ws.protocol;
  }

  get url() {
    return this._ws.url;
  }

  get binaryType() {
    return this._ws.binaryType;
  }

  set binaryType(value) {
    this._ws.binaryType = value;
  }

  get CONNECTING() {
    return NativeWebSocket.CONNECTING;
  }

  get OPEN() {
    return NativeWebSocket.OPEN;
  }

  get CLOSING() {
    return NativeWebSocket.CLOSING;
  }

  get CLOSED() {
    return NativeWebSocket.CLOSED;
  }

  get onopen() {
    return this._onopen;
  }

  set onopen(handler) {
    this._onopen = handler;
  }

  get onclose() {
    return this._onclose;
  }

  set onclose(handler) {
    this._onclose = handler;
  }

  get onerror() {
    return this._onerror;
  }

  set onerror(handler) {
    this._onerror = handler;
  }

  get onmessage() {
    return this._onmessage;
  }

  set onmessage(handler) {
    this._onmessage = handler;
  }

  addEventListener(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type].add(listener);
      return;
    }
    this._ws.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type].delete(listener);
      return;
    }
    this._ws.removeEventListener(type, listener);
  }

  dispatchEvent(event) {
    return this._ws.dispatchEvent(event);
  }

  send(data) {
    if (typeof data === "string") {
      try {
        const payload = JSON.parse(data);
        if (payload?.type === "state") {
          this._lastLocalState = {
            x: Number(payload.x) || 0,
            y: Number(payload.y) || 0,
            z: Number(payload.z) || 0,
            angle: Number(payload.angle) || 0,
            speed: Number(payload.speed) || 0,
            inZone: Boolean(payload.inZone)
          };
        }
      } catch {}
    }
    return this._ws.send(data);
  }

  close(code, reason) {
    return this._ws.close(code, reason);
  }

  _emit(type, event) {
    const prop = this[`_on${type}`];
    if (typeof prop === "function") {
      try {
        prop.call(this, event);
      } catch (error) {
        console.error(error);
      }
    }
    for (const listener of this._listeners[type] || []) {
      try {
        listener.call(this, event);
      } catch (error) {
        console.error(error);
      }
    }
  }

  _patchPayload(message) {
    if (!message || typeof message !== "object") {
      return message;
    }

    if (message.type === "joined" && message.id) {
      this._playerId = String(message.id);
    }

    if (
      this._playerId &&
      this._lastLocalState &&
      Array.isArray(message.players) &&
      (message.type === "snapshot" || message.type === "round-started")
    ) {
      message.players = message.players.map((player) => {
        if (String(player?.id) !== this._playerId) {
          return player;
        }
        return {
          ...player,
          x: this._lastLocalState.x,
          y: this._lastLocalState.y,
          z: this._lastLocalState.z,
          angle: this._lastLocalState.angle,
          speed: this._lastLocalState.speed
        };
      });
    }

    return message;
  }

  _handleMessage(event) {
    let forwardedEvent = event;

    if (typeof event?.data === "string") {
      try {
        const parsed = JSON.parse(event.data);
        const patched = this._patchPayload(parsed);
        forwardedEvent = new MessageEvent("message", {
          data: JSON.stringify(patched),
          origin: event.origin,
          lastEventId: event.lastEventId,
          source: event.source,
          ports: event.ports
        });
      } catch {}
    }

    this._emit("message", forwardedEvent);
  }
}

window.WebSocket = PatchedWebSocket;

const chunks = [0, 1, 2, 3];
Promise.all(chunks.map((i) => fetch(`app.bundle.${i}.txt`).then((r) => r.text())))
  .then((parts) => import(URL.createObjectURL(new Blob([atob(parts.join(""))], { type: "text/javascript" }))))
  .catch((error) => {
    console.error(error);
    const status = document.getElementById("connection-card");
    if (status) status.textContent = "Could not load the Crash Club client bundle.";
  });