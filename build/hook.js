!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Hook=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
/** @license
 * eventsource.js
 * Available under MIT License (MIT)
 * https://github.com/Yaffle/EventSource/
 */

/*jslint indent: 2, vars: true, plusplus: true */
/*global setTimeout, clearTimeout */

(function (global) {
  "use strict";

  function Map() {
    this.data = {};
  }

  Map.prototype = {
    get: function (key) {
      return this.data[key + "~"];
    },
    set: function (key, value) {
      this.data[key + "~"] = value;
    },
    "delete": function (key) {
      delete this.data[key + "~"];
    }
  };

  function EventTarget() {
    this.listeners = new Map();
  }

  function throwError(e) {
    setTimeout(function () {
      throw e;
    }, 0);
  }

  EventTarget.prototype = {
    dispatchEvent: function (event) {
      event.target = this;
      var type = event.type.toString();
      var listeners = this.listeners;
      var typeListeners = listeners.get(type);
      if (typeListeners === undefined) {
        return;
      }
      var length = typeListeners.length;
      var i = -1;
      var listener = undefined;
      while (++i < length) {
        listener = typeListeners[i];
        try {
          listener.call(this, event);
        } catch (e) {
          throwError(e);
        }
      }
    },
    addEventListener: function (type, callback) {
      type = type.toString();
      var listeners = this.listeners;
      var typeListeners = listeners.get(type);
      if (typeListeners === undefined) {
        typeListeners = [];
        listeners.set(type, typeListeners);
      }
      var i = typeListeners.length;
      while (--i >= 0) {
        if (typeListeners[i] === callback) {
          return;
        }
      }
      typeListeners.push(callback);
    },
    removeEventListener: function (type, callback) {
      type = type.toString();
      var listeners = this.listeners;
      var typeListeners = listeners.get(type);
      if (typeListeners === undefined) {
        return;
      }
      var length = typeListeners.length;
      var filtered = [];
      var i = -1;
      while (++i < length) {
        if (typeListeners[i] !== callback) {
          filtered.push(typeListeners[i]);
        }
      }
      if (filtered.length === 0) {
        listeners["delete"](type);
      } else {
        listeners.set(type, filtered);
      }
    }
  };

  function Event(type) {
    this.type = type;
    this.target = undefined;
  }

  function MessageEvent(type, options) {
    Event.call(this, type);
    this.data = options.data;
    this.lastEventId = options.lastEventId;
  }

  MessageEvent.prototype = Event.prototype;

  var XHR = global.XMLHttpRequest;
  var XDR = global.XDomainRequest;
  var isCORSSupported = XHR !== undefined && (new XHR()).withCredentials !== undefined;
  var isXHR = isCORSSupported;
  var Transport = isCORSSupported ? XHR : (XDR !== undefined ? XDR : undefined);
  var WAITING = -1;
  var CONNECTING = 0;
  var OPEN = 1;
  var CLOSED = 2;
  var AFTER_CR = 3;
  var FIELD_START = 4;
  var FIELD = 5;
  var VALUE_START = 6;
  var VALUE = 7;
  var contentTypeRegExp = /^text\/event\-stream;?(\s*charset\=utf\-8)?$/i;

  var MINIMUM_DURATION = 1000;
  var MAXIMUM_DURATION = 18000000;

  function getDuration(value, def) {
    var n = value;
    if (n !== n) {
      n = def;
    }
    return (n < MINIMUM_DURATION ? MINIMUM_DURATION : (n > MAXIMUM_DURATION ? MAXIMUM_DURATION : n));
  }

  function fire(that, f, event) {
    try {
      if (typeof f === "function") {
        f.call(that, event);
      }
    } catch (e) {
      throwError(e);
    }
  }

  function EventSource(url, options) {
    url = url.toString();

    var withCredentials = isCORSSupported && options !== undefined && Boolean(options.withCredentials);
    var initialRetry = getDuration(1000, 0);
    var heartbeatTimeout = getDuration(45000, 0);

    var lastEventId = "";
    var that = this;
    var retry = initialRetry;
    var wasActivity = false;
    var xhr = new Transport();
    var timeout = 0;
    var timeout0 = 0;
    var charOffset = 0;
    var currentState = WAITING;
    var dataBuffer = [];
    var lastEventIdBuffer = "";
    var eventTypeBuffer = "";
    var onTimeout = undefined;

    var state = FIELD_START;
    var field = "";
    var value = "";

    function close() {
      currentState = CLOSED;
      if (xhr !== undefined) {
        xhr.abort();
        xhr = undefined;
      }
      if (timeout !== 0) {
        clearTimeout(timeout);
        timeout = 0;
      }
      if (timeout0 !== 0) {
        clearTimeout(timeout0);
        timeout0 = 0;
      }
      that.readyState = CLOSED;
    }

    function onEvent(type) {
      var responseText = currentState === OPEN || currentState === CONNECTING ? xhr.responseText : "";
      var event = undefined;
      var isWrongStatusCodeOrContentType = false;

      if (currentState === CONNECTING) {
        var status = 0;
        var statusText = "";
        var contentType = undefined;
        if (isXHR) {
          try {
            status = xhr.status;
            statusText = xhr.statusText;
            contentType = xhr.getResponseHeader("Content-Type");
          } catch (error) {
            // https://bugs.webkit.org/show_bug.cgi?id=29121
            status = 0;
            statusText = "";
            contentType = undefined;
            // FF < 14, WebKit
            // https://bugs.webkit.org/show_bug.cgi?id=29658
            // https://bugs.webkit.org/show_bug.cgi?id=77854
          }
        } else if (type !== "" && type !== "error") {
          status = 200;
          statusText = "OK";
          contentType = xhr.contentType;
        }
        if (contentType === undefined || contentType === null) {
          contentType = "";
        }
        if (status === 0 && statusText === "" && type === "load" && responseText !== "") {
          status = 200;
          statusText = "OK";
          if (contentType === "") { // Opera 12
            var tmp = (/^data\:([^,]*?)(?:;base64)?,[\S]*$/).exec(url);
            if (tmp !== undefined && tmp !== null) {
              contentType = tmp[1];
            }
          }
        }
        if (status === 200 && contentTypeRegExp.test(contentType)) {
          currentState = OPEN;
          wasActivity = true;
          retry = initialRetry;
          that.readyState = OPEN;
          event = new Event("open");
          that.dispatchEvent(event);
          fire(that, that.onopen, event);
          if (currentState === CLOSED) {
            return;
          }
        } else {
          if (status !== 0) {
            var message = "";
            if (status !== 200) {
              message = "EventSource's response has a status " + status + " " + statusText.replace(/\s+/g, " ") + " that is not 200. Aborting the connection.";
            } else {
              message = "EventSource's response has a Content-Type specifying an unsupported type: " + contentType.replace(/\s+/g, " ") + ". Aborting the connection.";
            }
            setTimeout(function () {
              throw new Error(message);
            }, 0);
            isWrongStatusCodeOrContentType = true;
          }
        }
      }

      if (currentState === OPEN) {
        if (responseText.length > charOffset) {
          wasActivity = true;
        }
        var i = charOffset - 1;
        var length = responseText.length;
        var c = "\n";
        while (++i < length) {
          c = responseText.charAt(i);
          if (state === AFTER_CR && c === "\n") {
            state = FIELD_START;
          } else {
            if (state === AFTER_CR) {
              state = FIELD_START;
            }
            if (c === "\r" || c === "\n") {
              if (field === "data") {
                dataBuffer.push(value);
              } else if (field === "id") {
                lastEventIdBuffer = value;
              } else if (field === "event") {
                eventTypeBuffer = value;
              } else if (field === "retry") {
                initialRetry = getDuration(Number(value), initialRetry);
                retry = initialRetry;
              } else if (field === "heartbeatTimeout") {
                heartbeatTimeout = getDuration(Number(value), heartbeatTimeout);
                if (timeout !== 0) {
                  clearTimeout(timeout);
                  timeout = setTimeout(onTimeout, heartbeatTimeout);
                }
              }
              value = "";
              field = "";
              if (state === FIELD_START) {
                if (dataBuffer.length !== 0) {
                  lastEventId = lastEventIdBuffer;
                  if (eventTypeBuffer === "") {
                    eventTypeBuffer = "message";
                  }
                  event = new MessageEvent(eventTypeBuffer, {
                    data: dataBuffer.join("\n"),
                    lastEventId: lastEventIdBuffer
                  });
                  that.dispatchEvent(event);
                  if (eventTypeBuffer === "message") {
                    fire(that, that.onmessage, event);
                  }
                  if (currentState === CLOSED) {
                    return;
                  }
                }
                dataBuffer.length = 0;
                eventTypeBuffer = "";
              }
              state = c === "\r" ? AFTER_CR : FIELD_START;
            } else {
              if (state === FIELD_START) {
                state = FIELD;
              }
              if (state === FIELD) {
                if (c === ":") {
                  state = VALUE_START;
                } else {
                  field += c;
                }
              } else if (state === VALUE_START) {
                if (c !== " ") {
                  value += c;
                }
                state = VALUE;
              } else if (state === VALUE) {
                value += c;
              }
            }
          }
        }
        charOffset = length;
      }

      if ((currentState === OPEN || currentState === CONNECTING) &&
          (type === "load" || type === "error" || isWrongStatusCodeOrContentType || (charOffset > 1024 * 1024) || (timeout === 0 && !wasActivity))) {
        if (isWrongStatusCodeOrContentType) {
          close();
        } else {
          currentState = WAITING;
          xhr.abort();
          if (timeout !== 0) {
            clearTimeout(timeout);
            timeout = 0;
          }
          if (retry > initialRetry * 16) {
            retry = initialRetry * 16;
          }
          if (retry > MAXIMUM_DURATION) {
            retry = MAXIMUM_DURATION;
          }
          timeout = setTimeout(onTimeout, retry);
          retry = retry * 2 + 1;

          that.readyState = CONNECTING;
        }
        event = new Event("error");
        that.dispatchEvent(event);
        fire(that, that.onerror, event);
      } else {
        if (timeout === 0) {
          wasActivity = false;
          timeout = setTimeout(onTimeout, heartbeatTimeout);
        }
      }
    }

    function onProgress() {
      onEvent("progress");
    }

    function onLoad() {
      onEvent("load");
    }

    function onError() {
      onEvent("error");
    }

    if (isXHR) {
      // workaround for Opera issue with "progress" events
      timeout0 = setTimeout(function f() {
        if (xhr.readyState === 3) {
          onEvent("progress");
        }
        timeout0 = setTimeout(f, 500);
      }, 0);
    }

    onTimeout = function () {
      timeout = 0;
      if (currentState !== WAITING) {
        onEvent("");
        return;
      }
      // loading indicator in Safari, Chrome < 14, Firefox
      // https://bugzilla.mozilla.org/show_bug.cgi?id=736723
      if (isXHR && (xhr.sendAsBinary !== undefined || xhr.onloadend === undefined) && global.document !== undefined && global.document.readyState !== undefined && global.document.readyState !== "complete") {
        timeout = setTimeout(onTimeout, 4);
        return;
      }
      // XDomainRequest#abort removes onprogress, onerror, onload

      xhr.onload = onLoad;
      xhr.onerror = onError;

      if (isXHR) {
        // improper fix to match Firefox behaviour, but it is better than just ignore abort
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=768596
        // https://bugzilla.mozilla.org/show_bug.cgi?id=880200
        // https://code.google.com/p/chromium/issues/detail?id=153570
        xhr.onabort = onError;

        // Firefox 3.5 - 3.6 - ? < 9.0
        // onprogress is not fired sometimes or delayed
        xhr.onreadystatechange = onProgress;
      }

      xhr.onprogress = onProgress;

      wasActivity = false;
      timeout = setTimeout(onTimeout, heartbeatTimeout);

      charOffset = 0;
      currentState = CONNECTING;
      dataBuffer.length = 0;
      eventTypeBuffer = "";
      lastEventIdBuffer = lastEventId;
      value = "";
      field = "";
      state = FIELD_START;

      var s = url.slice(0, 5);
      if (s !== "data:" && s !== "blob:") {
        s = url + ((url.indexOf("?", 0) === -1 ? "?" : "&") + "lastEventId=" + encodeURIComponent(lastEventId) + "&r=" + (Math.random() + 1).toString().slice(2));
      } else {
        s = url;
      }
      xhr.open("GET", s, true);

      if (isXHR) {
        // withCredentials should be set after "open" for Safari and Chrome (< 19 ?)
        xhr.withCredentials = withCredentials;

        xhr.responseType = "text";

        // Request header field Cache-Control is not allowed by Access-Control-Allow-Headers.
        // "Cache-control: no-cache" are not honored in Chrome and Firefox
        // https://bugzilla.mozilla.org/show_bug.cgi?id=428916
        //xhr.setRequestHeader("Cache-Control", "no-cache");
        xhr.setRequestHeader("Accept", "text/event-stream");
        // Request header field Last-Event-ID is not allowed by Access-Control-Allow-Headers.
        //xhr.setRequestHeader("Last-Event-ID", lastEventId);
      }

      xhr.send(undefined);
    };

    EventTarget.call(this);
    this.close = close;
    this.url = url;
    this.readyState = CONNECTING;
    this.withCredentials = withCredentials;

    this.onopen = undefined;
    this.onmessage = undefined;
    this.onerror = undefined;

    onTimeout();
  }

  function F() {
    this.CONNECTING = CONNECTING;
    this.OPEN = OPEN;
    this.CLOSED = CLOSED;
  }
  F.prototype = EventTarget.prototype;

  EventSource.prototype = new F();
  F.call(EventSource);

  var isEventSourceSupported = function () {
    if (global.EventSource !== undefined) {
      try {
        var es = new global.EventSource("data:text/event-stream;charset=utf-8,");
        es.close();
        return es.withCredentials === false &&
               es.url !== ""; // to filter out Opera 12 implementation
      } catch (error) {
        throwError(error);
      }
    }
    return false;
  };

  if (Transport !== undefined && !isEventSourceSupported()) {
    // Why replace a native EventSource ?
    // https://bugzilla.mozilla.org/show_bug.cgi?id=444328
    // https://bugzilla.mozilla.org/show_bug.cgi?id=831392
    // https://code.google.com/p/chromium/issues/detail?id=260144
    // https://code.google.com/p/chromium/issues/detail?id=225654
    // ...
    global.NativeEventSource = global.EventSource;
    global.EventSource = EventSource;
  }

}(this));

},{}],3:[function(require,module,exports){
(function (root, factory) {
	if (typeof exports === 'object') {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define('uxhr', factory);
	} else {
		root.uxhr = factory();
	}
}(this, function () {

	"use strict";

	return function (url, data, options) {
		data = data || '';
		options = options || {};

		var uri = document.createElement('a');
		uri.href = url;

		var complete = options.complete || function(){},
			success = options.success || function(){},
			error = options.error || function(){},
			timeout = options.timeout || 0,
			ontimeout = options.ontimeout || function(){},
			onprogress = options.onprogress || function(){},
			headers = options.headers || {},
			method = options.method || 'GET',
			sync = options.sync || false,
			isCors = (uri.hostname != location.hostname),
			req = (function() {

				if (typeof XMLHttpRequest !== 'undefined') {

					// CORS (IE8-9)
					if (isCors && typeof XDomainRequest !== 'undefined') {
						return new XDomainRequest();
					}

					// local, CORS (other browsers)
					return new XMLHttpRequest();

				} else if (typeof 'ActiveXObject' !== 'undefined') {
					return new ActiveXObject('Microsoft.XMLHTTP');
				}

			})();

		if (!req) {
			throw new Error ('Browser doesn\'t support XHR');
		}

		// serialize data?
		var hasFormData = (typeof(window.FormData) !== 'undefined');
		if (typeof data !== 'string' && (hasFormData && !(data instanceof window.FormData))) {
			var serialized = [];
			for (var datum in data) {
				serialized.push(datum + '=' + data[datum]);
			}
			data = serialized.join('&');
		}

		// use ? or &, accourding to given url
		if (method === 'GET' && data) {
			url += (url.indexOf('?') >= 0) ? '&' + data : '?' + data;
		}

		// open connection
		req.open(method, url, !sync);

		// set timeout
		// timeouts cannot be set for synchronous requests made from a document.
		if (!sync) {
			if ('ontimeout' in req) {
				req.timeout = timeout;
				req.ontimeout = ontimeout;
			}
		}

		// set onprogress
		if ('onprogress' in req) {
			req.onprogress = onprogress;
		}

		// listen for XHR events
		req.onload = function () {
			complete(req.responseText, req.status);
			success(req.responseText);
		};
		req.onerror = function () {
			complete(req.responseText);
			error(req.responseText, req.status);
		};

    if (typeof(req.setRequestHeader)!=="undefined") {
		  // set headers
		  for (var header in headers) {
		  	req.setRequestHeader(header, headers[header]);
		  }
    }

		// send it
    req.send(method !== 'GET' ? data : null);
		return req;
	};

}));

},{}],4:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 * @version 2.8.0
 */
(function(define) { 'use strict';
define(function (require) {

	// Public API

	when.promise   = promise;    // Create a pending promise
	when.resolve   = resolve;    // Create a resolved promise
	when.reject    = reject;     // Create a rejected promise
	when.defer     = defer;      // Create a {promise, resolver} pair

	when.join      = join;       // Join 2 or more promises

	when.all       = all;        // Resolve a list of promises
	when.map       = map;        // Array.map() for promises
	when.reduce    = reduce;     // Array.reduce() for promises
	when.settle    = settle;     // Settle a list of promises

	when.any       = any;        // One-winner race
	when.some      = some;       // Multi-winner race

	when.isPromise = isPromiseLike;  // DEPRECATED: use isPromiseLike
	when.isPromiseLike = isPromiseLike; // Is something promise-like, aka thenable

	/**
	 * Register an observer for a promise or immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @param {function?} [onFulfilled] callback to be called when promiseOrValue is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} [onRejected] callback to be called when promiseOrValue is
	 *   rejected.
	 * @param {function?} [onProgress] callback to be called when progress updates
	 *   are issued for promiseOrValue.
	 * @returns {Promise} a new {@link Promise} that will complete with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
		// Get a trusted promise for the input promiseOrValue, and then
		// register promise handlers
		return cast(promiseOrValue).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver,
			monitorApi.PromiseStatus && monitorApi.PromiseStatus());
	}

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @returns {Promise} promise whose fate is determine by resolver
	 * @name Promise
	 */
	function Promise(resolver, status) {
		var self, value, consumers = [];

		self = this;
		this._status = status;
		this.inspect = inspect;
		this._when = _when;

		// Call the provider resolver to seal the promise's fate
		try {
			resolver(promiseResolve, promiseReject, promiseNotify);
		} catch(e) {
			promiseReject(e);
		}

		/**
		 * Returns a snapshot of this promise's current status at the instant of call
		 * @returns {{state:String}}
		 */
		function inspect() {
			return value ? value.inspect() : toPendingState();
		}

		/**
		 * Private message delivery. Queues and delivers messages to
		 * the promise's ultimate fulfillment value or rejection reason.
		 * @private
		 */
		function _when(resolve, notify, onFulfilled, onRejected, onProgress) {
			consumers ? consumers.push(deliver) : enqueue(function() { deliver(value); });

			function deliver(p) {
				p._when(resolve, notify, onFulfilled, onRejected, onProgress);
			}
		}

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the ultimate fulfillment or rejection
		 * @param {*} val resolution value
		 */
		function promiseResolve(val) {
			if(!consumers) {
				return;
			}

			var queue = consumers;
			consumers = undef;

			value = coerce(self, val);
			enqueue(function () {
				if(status) {
					updateStatus(value, status);
				}
				runHandlers(queue, value);
			});
		}

		/**
		 * Reject this promise with the supplied reason, which will be used verbatim.
		 * @param {*} reason reason for the rejection
		 */
		function promiseReject(reason) {
			promiseResolve(new RejectedPromise(reason));
		}

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @param {*} update progress event payload to pass to all listeners
		 */
		function promiseNotify(update) {
			if(consumers) {
				var queue = consumers;
				enqueue(function () {
					runHandlers(queue, new ProgressingPromise(update));
				});
			}
		}
	}

	promisePrototype = Promise.prototype;

	/**
	 * Register handlers for this promise.
	 * @param [onFulfilled] {Function} fulfillment handler
	 * @param [onRejected] {Function} rejection handler
	 * @param [onProgress] {Function} progress handler
	 * @return {Promise} new Promise
	 */
	promisePrototype.then = function(onFulfilled, onRejected, onProgress) {
		var self = this;

		return new Promise(function(resolve, reject, notify) {
			self._when(resolve, notify, onFulfilled, onRejected, onProgress);
		}, this._status && this._status.observed());
	};

	/**
	 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
	 * @param {function?} onRejected
	 * @return {Promise}
	 */
	promisePrototype['catch'] = promisePrototype.otherwise = function(onRejected) {
		return this.then(undef, onRejected);
	};

	/**
	 * Ensures that onFulfilledOrRejected will be called regardless of whether
	 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
	 * receive the promises' value or reason.  Any returned value will be disregarded.
	 * onFulfilledOrRejected may throw or return a rejected promise to signal
	 * an additional error.
	 * @param {function} onFulfilledOrRejected handler to be called regardless of
	 *  fulfillment or rejection
	 * @returns {Promise}
	 */
	promisePrototype['finally'] = promisePrototype.ensure = function(onFulfilledOrRejected) {
		return typeof onFulfilledOrRejected === 'function'
			? this.then(injectHandler, injectHandler)['yield'](this)
			: this;

		function injectHandler() {
			return resolve(onFulfilledOrRejected());
		}
	};

	/**
	 * Terminate a promise chain by handling the ultimate fulfillment value or
	 * rejection reason, and assuming responsibility for all errors.  if an
	 * error propagates out of handleResult or handleFatalError, it will be
	 * rethrown to the host, resulting in a loud stack track on most platforms
	 * and a crash on some.
	 * @param {function?} handleResult
	 * @param {function?} handleError
	 * @returns {undefined}
	 */
	promisePrototype.done = function(handleResult, handleError) {
		this.then(handleResult, handleError)['catch'](crash);
	};

	/**
	 * Shortcut for .then(function() { return value; })
	 * @param  {*} value
	 * @return {Promise} a promise that:
	 *  - is fulfilled if value is not a promise, or
	 *  - if value is a promise, will fulfill with its value, or reject
	 *    with its reason.
	 */
	promisePrototype['yield'] = function(value) {
		return this.then(function() {
			return value;
		});
	};

	/**
	 * Runs a side effect when this promise fulfills, without changing the
	 * fulfillment value.
	 * @param {function} onFulfilledSideEffect
	 * @returns {Promise}
	 */
	promisePrototype.tap = function(onFulfilledSideEffect) {
		return this.then(onFulfilledSideEffect)['yield'](this);
	};

	/**
	 * Assumes that this promise will fulfill with an array, and arranges
	 * for the onFulfilled to be called with the array as its argument list
	 * i.e. onFulfilled.apply(undefined, array).
	 * @param {function} onFulfilled function to receive spread arguments
	 * @return {Promise}
	 */
	promisePrototype.spread = function(onFulfilled) {
		return this.then(function(array) {
			// array may contain promises, so resolve its contents.
			return all(array, function(array) {
				return onFulfilled.apply(undef, array);
			});
		});
	};

	/**
	 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected)
	 * @deprecated
	 */
	promisePrototype.always = function(onFulfilledOrRejected, onProgress) {
		return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
	};

	/**
	 * Casts x to a trusted promise. If x is already a trusted promise, it is
	 * returned, otherwise a new trusted Promise which follows x is returned.
	 * @param {*} x
	 * @returns {Promise}
	 */
	function cast(x) {
		return x instanceof Promise ? x : resolve(x);
	}

	/**
	 * Returns a resolved promise. The returned promise will be
	 *  - fulfilled with promiseOrValue if it is a value, or
	 *  - if promiseOrValue is a promise
	 *    - fulfilled with promiseOrValue's value after it is fulfilled
	 *    - rejected with promiseOrValue's reason after it is rejected
	 * In contract to cast(x), this always creates a new Promise
	 * @param  {*} x
	 * @return {Promise}
	 */
	function resolve(x) {
		return promise(function(resolve) {
			resolve(x);
		});
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @deprecated The behavior of when.reject in 3.0 will be to reject
	 * with x VERBATIM
	 * @param {*} x the rejected value of the returned promise
	 * @return {Promise} rejected promise
	 */
	function reject(x) {
		return when(x, function(e) {
			return new RejectedPromise(e);
		});
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * The resolver has resolve, reject, and progress.  The promise
	 * has then plus extended promise API.
	 *
	 * @return {{
	 * promise: Promise,
	 * resolve: function:Promise,
	 * reject: function:Promise,
	 * notify: function:Promise
	 * resolver: {
	 *	resolve: function:Promise,
	 *	reject: function:Promise,
	 *	notify: function:Promise
	 * }}}
	 */
	function defer() {
		var deferred, pending, resolved;

		// Optimize object shape
		deferred = {
			promise: undef, resolve: undef, reject: undef, notify: undef,
			resolver: { resolve: undef, reject: undef, notify: undef }
		};

		deferred.promise = pending = promise(makeDeferred);

		return deferred;

		function makeDeferred(resolvePending, rejectPending, notifyPending) {
			deferred.resolve = deferred.resolver.resolve = function(value) {
				if(resolved) {
					return resolve(value);
				}
				resolved = true;
				resolvePending(value);
				return pending;
			};

			deferred.reject  = deferred.resolver.reject  = function(reason) {
				if(resolved) {
					return resolve(new RejectedPromise(reason));
				}
				resolved = true;
				rejectPending(reason);
				return pending;
			};

			deferred.notify  = deferred.resolver.notify  = function(update) {
				notifyPending(update);
				return update;
			};
		}
	}

	/**
	 * Run a queue of functions as quickly as possible, passing
	 * value to each.
	 */
	function runHandlers(queue, value) {
		for (var i = 0; i < queue.length; i++) {
			queue[i](value);
		}
	}

	/**
	 * Coerces x to a trusted Promise
	 * @param {*} x thing to coerce
	 * @returns {*} Guaranteed to return a trusted Promise.  If x
	 *   is trusted, returns x, otherwise, returns a new, trusted, already-resolved
	 *   Promise whose resolution value is:
	 *   * the resolution value of x if it's a foreign promise, or
	 *   * x if it's a value
	 */
	function coerce(self, x) {
		if (x === self) {
			return new RejectedPromise(new TypeError());
		}

		if (x instanceof Promise) {
			return x;
		}

		try {
			var untrustedThen = x === Object(x) && x.then;

			return typeof untrustedThen === 'function'
				? assimilate(untrustedThen, x)
				: new FulfilledPromise(x);
		} catch(e) {
			return new RejectedPromise(e);
		}
	}

	/**
	 * Safely assimilates a foreign thenable by wrapping it in a trusted promise
	 * @param {function} untrustedThen x's then() method
	 * @param {object|function} x thenable
	 * @returns {Promise}
	 */
	function assimilate(untrustedThen, x) {
		return promise(function (resolve, reject) {
			enqueue(function() {
				try {
					fcall(untrustedThen, x, resolve, reject);
				} catch(e) {
					reject(e);
				}
			});
		});
	}

	makePromisePrototype = Object.create ||
		function(o) {
			function PromisePrototype() {}
			PromisePrototype.prototype = o;
			return new PromisePrototype();
		};

	/**
	 * Creates a fulfilled, local promise as a proxy for a value
	 * NOTE: must never be exposed
	 * @private
	 * @param {*} value fulfillment value
	 * @returns {Promise}
	 */
	function FulfilledPromise(value) {
		this.value = value;
	}

	FulfilledPromise.prototype = makePromisePrototype(promisePrototype);

	FulfilledPromise.prototype.inspect = function() {
		return toFulfilledState(this.value);
	};

	FulfilledPromise.prototype._when = function(resolve, _, onFulfilled) {
		try {
			resolve(typeof onFulfilled === 'function' ? onFulfilled(this.value) : this.value);
		} catch(e) {
			resolve(new RejectedPromise(e));
		}
	};

	/**
	 * Creates a rejected, local promise as a proxy for a value
	 * NOTE: must never be exposed
	 * @private
	 * @param {*} reason rejection reason
	 * @returns {Promise}
	 */
	function RejectedPromise(reason) {
		this.value = reason;
	}

	RejectedPromise.prototype = makePromisePrototype(promisePrototype);

	RejectedPromise.prototype.inspect = function() {
		return toRejectedState(this.value);
	};

	RejectedPromise.prototype._when = function(resolve, _, __, onRejected) {
		try {
			resolve(typeof onRejected === 'function' ? onRejected(this.value) : this);
		} catch(e) {
			resolve(new RejectedPromise(e));
		}
	};

	/**
	 * Create a progress promise with the supplied update.
	 * @private
	 * @param {*} value progress update value
	 * @return {Promise} progress promise
	 */
	function ProgressingPromise(value) {
		this.value = value;
	}

	ProgressingPromise.prototype = makePromisePrototype(promisePrototype);

	ProgressingPromise.prototype._when = function(_, notify, f, r, u) {
		try {
			notify(typeof u === 'function' ? u(this.value) : this.value);
		} catch(e) {
			notify(e);
		}
	};

	/**
	 * Update a PromiseStatus monitor object with the outcome
	 * of the supplied value promise.
	 * @param {Promise} value
	 * @param {PromiseStatus} status
	 */
	function updateStatus(value, status) {
		value.then(statusFulfilled, statusRejected);

		function statusFulfilled() { status.fulfilled(); }
		function statusRejected(r) { status.rejected(r); }
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * howMany of the supplied promisesOrValues have resolved, or will reject when
	 * it becomes impossible for howMany to resolve, for example, when
	 * (promisesOrValues.length - howMany) + 1 input promises reject.
	 *
	 * @param {Array} promisesOrValues array of anything, may contain a mix
	 *      of promises and values
	 * @param howMany {number} number of promisesOrValues to resolve
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to an array of howMany values that
	 *  resolved first, or will reject with an array of
	 *  (promisesOrValues.length - howMany) + 1 rejection reasons.
	 */
	function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

		return when(promisesOrValues, function(promisesOrValues) {

			return promise(resolveSome).then(onFulfilled, onRejected, onProgress);

			function resolveSome(resolve, reject, notify) {
				var toResolve, toReject, values, reasons, fulfillOne, rejectOne, len, i;

				len = promisesOrValues.length >>> 0;

				toResolve = Math.max(0, Math.min(howMany, len));
				values = [];

				toReject = (len - toResolve) + 1;
				reasons = [];

				// No items in the input, resolve immediately
				if (!toResolve) {
					resolve(values);

				} else {
					rejectOne = function(reason) {
						reasons.push(reason);
						if(!--toReject) {
							fulfillOne = rejectOne = identity;
							reject(reasons);
						}
					};

					fulfillOne = function(val) {
						// This orders the values based on promise resolution order
						values.push(val);
						if (!--toResolve) {
							fulfillOne = rejectOne = identity;
							resolve(values);
						}
					};

					for(i = 0; i < len; ++i) {
						if(i in promisesOrValues) {
							when(promisesOrValues[i], fulfiller, rejecter, notify);
						}
					}
				}

				function rejecter(reason) {
					rejectOne(reason);
				}

				function fulfiller(val) {
					fulfillOne(val);
				}
			}
		});
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * any one of the supplied promisesOrValues has resolved or will reject when
	 * *all* promisesOrValues have rejected.
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to the value that resolved first, or
	 * will reject with an array of all rejected inputs.
	 */
	function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

		function unwrapSingleResult(val) {
			return onFulfilled ? onFulfilled(val[0]) : val[0];
		}

		return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
	}

	/**
	 * Return a promise that will resolve only once all the supplied promisesOrValues
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the promisesOrValues.
	 * @memberOf when
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise}
	 */
	function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
		return _map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Joins multiple promises into a single returned promise.
	 * @return {Promise} a promise that will fulfill when *all* the input promises
	 * have fulfilled, or will reject when *any one* of the input promises rejects.
	 */
	function join(/* ...promises */) {
		return _map(arguments, identity);
	}

	/**
	 * Settles all input promises such that they are guaranteed not to
	 * be pending once the returned promise fulfills. The returned promise
	 * will always fulfill, except in the case where `array` is a promise
	 * that rejects.
	 * @param {Array|Promise} array or promise for array of promises to settle
	 * @returns {Promise} promise that always fulfills with an array of
	 *  outcome snapshots for each input promise.
	 */
	function settle(array) {
		return _map(array, toFulfilledState, toRejectedState);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(array, mapFunc) {
		return _map(array, mapFunc);
	}

	/**
	 * Internal map that allows a fallback to handle rejections
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @param {function?} fallback function to handle rejected promises
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function _map(array, mapFunc, fallback) {
		return when(array, function(array) {

			return new Promise(resolveMap);

			function resolveMap(resolve, reject, notify) {
				var results, len, toResolve, i;

				// Since we know the resulting length, we can preallocate the results
				// array to avoid array expansions.
				toResolve = len = array.length >>> 0;
				results = [];

				if(!toResolve) {
					resolve(results);
					return;
				}

				// Since mapFunc may be async, get all invocations of it into flight
				for(i = 0; i < len; i++) {
					if(i in array) {
						resolveOne(array[i], i);
					} else {
						--toResolve;
					}
				}

				function resolveOne(item, i) {
					when(item, mapFunc, fallback).then(function(mapped) {
						results[i] = mapped;

						if(!--toResolve) {
							resolve(results);
						}
					}, reject, notify);
				}
			}
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promise array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),
	 *      where total is the total number of items being reduced, and will be the same
	 *      in each call to reduceFunc.
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promise, reduceFunc /*, initialValue */) {
		var args = fcall(slice, arguments, 1);

		return when(promise, function(array) {
			var total;

			total = array.length;

			// Wrap the supplied reduceFunc with one that handles promises and then
			// delegates to the supplied.
			args[0] = function (current, val, i) {
				return when(current, function (c) {
					return when(val, function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};

			return reduceArray.apply(array, args);
		});
	}

	// Snapshot states

	/**
	 * Creates a fulfilled state snapshot
	 * @private
	 * @param {*} x any value
	 * @returns {{state:'fulfilled',value:*}}
	 */
	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	/**
	 * Creates a rejected state snapshot
	 * @private
	 * @param {*} x any reason
	 * @returns {{state:'rejected',reason:*}}
	 */
	function toRejectedState(x) {
		return { state: 'rejected', reason: x };
	}

	/**
	 * Creates a pending state snapshot
	 * @private
	 * @returns {{state:'pending'}}
	 */
	function toPendingState() {
		return { state: 'pending' };
	}

	//
	// Internals, utilities, etc.
	//

	var promisePrototype, makePromisePrototype, reduceArray, slice, fcall, nextTick, handlerQueue,
		funcProto, call, arrayProto, monitorApi,
		capturedSetTimeout, cjsRequire, MutationObs, undef;

	cjsRequire = require;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	handlerQueue = [];

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	function enqueue(task) {
		if(handlerQueue.push(task) === 1) {
			nextTick(drainQueue);
		}
	}

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	function drainQueue() {
		runHandlers(handlerQueue);
		handlerQueue = [];
	}

	// Allow attaching the monitor to when() if env has no console
	monitorApi = typeof console !== 'undefined' ? console : when;

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout
	/*global process,document,setTimeout,MutationObserver,WebKitMutationObserver*/
	if (typeof process === 'object' && process.nextTick) {
		nextTick = process.nextTick;
	} else if(MutationObs =
		(typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver)) {
		nextTick = (function(document, MutationObserver, drainQueue) {
			var el = document.createElement('div');
			new MutationObserver(drainQueue).observe(el, { attributes: true });

			return function() {
				el.setAttribute('x', 'x');
			};
		}(document, MutationObs, drainQueue));
	} else {
		try {
			// vert.x 1.x || 2.x
			nextTick = cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
		} catch(ignore) {
			// capture setTimeout to avoid being caught by fake timers
			// used in time based tests
			capturedSetTimeout = setTimeout;
			nextTick = function(t) { capturedSetTimeout(t, 0); };
		}
	}

	//
	// Capture/polyfill function and array utils
	//

	// Safe function calls
	funcProto = Function.prototype;
	call = funcProto.call;
	fcall = funcProto.bind
		? call.bind(call)
		: function(f, context) {
			return f.apply(context, slice.call(arguments, 2));
		};

	// Safe array ops
	arrayProto = [];
	slice = arrayProto.slice;

	// ES5 reduce implementation if native not available
	// See: http://es5.github.com/#x15.4.4.21 as there are many
	// specifics and edge cases.  ES5 dictates that reduce.length === 1
	// This implementation deviates from ES5 spec in the following ways:
	// 1. It does not check if reduceFunc is a Callable
	reduceArray = arrayProto.reduce ||
		function(reduceFunc /*, initialValue */) {
			/*jshint maxcomplexity: 7*/
			var arr, args, reduced, len, i;

			i = 0;
			arr = Object(this);
			len = arr.length >>> 0;
			args = arguments;

			// If no initialValue, use first item of array (we know length !== 0 here)
			// and adjust i to start at second item
			if(args.length <= 1) {
				// Skip to the first real element in the array
				for(;;) {
					if(i in arr) {
						reduced = arr[i++];
						break;
					}

					// If we reached the end of the array without finding any real
					// elements, it's a TypeError
					if(++i >= len) {
						throw new TypeError();
					}
				}
			} else {
				// If initialValue provided, use it
				reduced = args[1];
			}

			// Do the actual reduce
			for(;i < len; ++i) {
				if(i in arr) {
					reduced = reduceFunc(reduced, arr[i], i, arr);
				}
			}

			return reduced;
		};

	function identity(x) {
		return x;
	}

	function crash(fatalError) {
		if(typeof monitorApi.reportUnhandled === 'function') {
			monitorApi.reportUnhandled();
		} else {
			enqueue(function() {
				throw fatalError;
			});
		}

		throw fatalError;
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

}).call(this,require('_process'))
},{"_process":1}],5:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var Events = require("./utils/events");

var Auth = (function (Events) {
  var Auth =
  /**
   * Deals with user registration/authentication
   * @module Hook
   * @class Hook.Auth
   * @extends Hook.Events
   * @param {Hook.Client} client
   * @constructor
   */
  function Auth(client) {
    this.client = client;

    /**
     * @property currentUser
     * @type {Object}
     */
    this.currentUser = null;

    var now = new Date(), tokenExpiration = new Date(window.localStorage.getItem(this.client.app_id + "-" + Auth.AUTH_TOKEN_EXPIRATION)), currentUser = window.localStorage.getItem(this.client.app_id + "-" + Auth.AUTH_DATA_KEY);

    // Fill current user only when it isn't expired yet.
    if (currentUser && now.getTime() < tokenExpiration.getTime()) {
      this.currentUser = JSON.parse(currentUser); // localStorage only supports recording strings, so we need to parse it
    }
  };

  _extends(Auth, Events);

  Auth.prototype.setCurrentUser = function (data) {
    if (!data) {
      // trigger logout event
      this.trigger("logout", this.currentUser);
      this.currentUser = data;

      window.localStorage.removeItem(this.client.app_id + "-" + Auth.AUTH_TOKEN_KEY);
      window.localStorage.removeItem(this.client.app_id + "-" + Auth.AUTH_DATA_KEY);
    } else {
      window.localStorage.setItem(this.client.app_id + "-" + Auth.AUTH_DATA_KEY, JSON.stringify(data));

      // trigger login event
      this.currentUser = data;
      this.trigger("login", data);
    }

    return this;
  };

  Auth.prototype.register = function (data) {
    var promise, that = this;
    if (typeof (data) === "undefined") {
      data = {};
    }
    promise = this.client.post("auth/email", data);
    promise.then(function (data) {
      that._registerToken(data);
    });
    return promise;
  };

  Auth.prototype.login = function (data) {
    var promise, that = this;
    if (typeof (data) === "undefined") {
      data = {};
    }
    promise = this.client.post("auth/email/login", data);
    promise.then(function (data) {
      that._registerToken(data);
    });
    return promise;
  };

  Auth.prototype.update = function (data) {
    if (!this.currentUser) {
      throw new Error("not logged in.");
    }

    var that = this;
    var promise = this.client.collection("auth").update(this.currentUser._id, data);

    // update localStorage info
    promise.then(function (data) {
      that.setCurrentUser(data);
    });

    return promise;
  };

  Auth.prototype.forgotPassword = function (data) {
    if (typeof (data) === "undefined") {
      data = {};
    }
    return this.client.post("auth/email/forgotPassword", data);
  };

  Auth.prototype.resetPassword = function (data) {
    if (typeof (data) === "string") {
      data = { password: data };
    }
    if (typeof (data.token) === "undefined") {
      data.token = window.location.href.match(/[\?|&]token=([a-z0-9]+)/);
      data.token = (data.token && data.token[1]);
    }
    if (typeof (data.token) !== "string") {
      throw new Error("forgot password token required. Remember to use 'auth.forgotPassword' before 'auth.resetPassword'.");
    }
    if (typeof (data.password) !== "string") {
      throw new Error("new password required.");
    }
    return this.client.post("auth/email/resetPassword", data);
  };

  Auth.prototype.logout = function () {
    return this.setCurrentUser(null);
  };

  Auth.prototype.getToken = function () {
    return window.localStorage.getItem(this.client.app_id + "-" + Auth.AUTH_TOKEN_KEY);
  };

  Auth.prototype._registerToken = function (data) {
    if (data.token) {
      // register authentication token on localStorage
      window.localStorage.setItem(this.client.app_id + "-" + Auth.AUTH_TOKEN_KEY, data.token.token);
      window.localStorage.setItem(this.client.app_id + "-" + Auth.AUTH_TOKEN_EXPIRATION, data.token.expire_at);
      delete data.token;

      // Store curent user
      this.setCurrentUser(data);
    }
  };

  return Auth;
})(Events);

// Constrants
Auth.AUTH_DATA_KEY = "hook-auth-data";
Auth.AUTH_TOKEN_KEY = "hook-auth-token";
Auth.AUTH_TOKEN_EXPIRATION = "hook-auth-token-expiration";

// Export
module.exports = Auth;

},{"./utils/events":13}],6:[function(require,module,exports){
"use strict";

var EventSource = require("event-source-polyfill");

module.exports = (function () {
  var Channel =

  /**
   * @module Hook
   * @class Hook.Channel.SSE
   *
   * @param {Client} client
   * @param {String} namespace
   * @param {Object} options optional
   * @constructor
   */
  function Channel(client, collection, options) {
    this.client = client;
    this.collection = collection;
    this.client_id = null;
    this.callbacks = {};
    this.options = options || {};
    this.readyState = null;
  };

  Channel.prototype.subscribe = function (event, callback) {
    if (typeof (callback) === "undefined") {
      callback = event;
      event = "_default";
    }
    this.callbacks[event] = callback;

    var promise = this.connect();

    if (this.readyState === EventSource.CONNECTING) {
      var that = this;
      promise.then(function () {
        that.event_source.onopen = function (e) {
          that.readyState = e.readyState;
          that._trigger.apply(that, ["state:" + e.type, e]);
        };
        that.event_source.onerror = function (e) {
          that.readyState = e.readyState;
          that._trigger.apply(that, ["state:" + e.type, e]);
        };
        that.event_source.onmessage = function (e) {
          var data = JSON.parse(e.data), event = data.event;
          delete data.event;
          that._trigger.apply(that, [event, data]);
        };
      });
    }

    return promise;
  };

  Channel.prototype._trigger = function (event, data) {
    console.log("Trigger: ", event, data);
    // always try to dispatch default message handler
    if (event.indexOf("state:") === -1 && this.callbacks._default) {
      this.callbacks._default.apply(this, [event, data]);
    }
    // try to dispatch message handler for this event
    if (this.callbacks[event]) {
      this.callbacks[event].apply(this, [data]);
    }
  };

  Channel.prototype.isConnected = function () {
    return (this.readyState !== null && this.readyState !== EventSource.CLOSED);
  };

  Channel.prototype.unsubscribe = function (event) {
    if (this.callbacks[event]) {
      this.callbacks[event] = null;
    }
  };

  Channel.prototype.publish = function (event, message) {
    if (typeof (message) === "undefined") {
      message = {};
    }
    message.client_id = this.client_id;
    message.event = event;
    return this.collection.create(message);
  };

  Channel.prototype.connect = function () {
    // Return success if already connected.
    if (this.readyState !== null) {
      var deferred = when.defer();
      deferred.resolver.resolve();
      return deferred.promise;
    }

    this.readyState = EventSource.CONNECTING;
    this._trigger.apply(this, ["state:connecting"]);

    var that = this;

    return this.publish("connected").then(function (data) {
      that.collection.where("updated_at", ">", data.updated_at);

      var queryString = that.client.getCredentialsParams();

      // time to wait for retry, after connection closes
      var query = that.collection.buildQuery();
      query.stream = {
        refresh: that.options.refresh_timeout || 1,
        retry: that.options.retry_timeout || 1
      };

      that.client_id = data.client_id;
      that.event_source = new EventSource(that.collection.client.url + that.collection.segments + queryString + "&" + JSON.stringify(query), {
        withCredentials: true
      });

      // bind unload function to force user disconnection
      window.addEventListener("unload", function (e) {
        // send synchronous disconnected event
        that.disconnect(true);
      });
    }, function (data) {
      that.readyState = EventSource.CLOSED;
      that._trigger.apply(that, ["state:error", data]);
    });
  };

  Channel.prototype.disconnect = function (sync) {
    if (this.isConnected()) {
      this.close();
      this.publish("disconnected", {
        _sync: ((typeof (sync) !== "undefined") && sync)
      });
    }
    return this;
  };

  Channel.prototype.close = function () {
    if (this.event_source) {
      this.event_source.close();
    }
    this.readyState = EventSource.CLOSED;
    return this;
  };

  return Channel;
})();

},{"event-source-polyfill":2}],7:[function(require,module,exports){
"use strict";

var Auth = require("./auth");
var Collection = require("./collection");
var Channel = require("./channel");
var KeyValues = require("./key_values");
var System = require("./system");
var PluginManager = require("./plugin_manager");
var uxhr = require("uxhr");
var when = require("when");
require("./vendor/json.date-extensions");

module.exports = (function () {
  var Client =

  /**
   * Hook.Client is the entry-point for using hook.
   *
   * You should instantiate a global javascript client for consuming hook.
   *
   * ```javascript
   * var client = new Hook.Client({
   *   url: "http://local-or-remote-hook-address.com/public/index.php/",
   *   app_id: 1,   // your app's id
   *   key: 'test'  // your app's public key
   * });
   * ```
   *
   * @module Hook
   * @class Hook.Client
   *
   * @param {Object} options
   *   @param {String} options.app_id
   *   @param {String} options.key
   *   @param {String} options.endpoint default: http://hook.dev
   *
   * @constructor
   */

  function Client(options) {
    if (!options) {
      options = {};
    }
    this.endpoint = options.endpoint || options.url || window.location.origin;
    this.app_id = options.app_id || options.appId || "";
    this.key = options.key || "";

    this.options = (typeof (options.options) !== "undefined") ? options.options : {};

    // append last slash if doesn't have it
    if (this.endpoint.lastIndexOf("/") != this.endpoint.length - 1) {
      this.endpoint += "/";
    }

    /**
     * @property {Hook.KeyValues} keys
     */
    this.keys = new KeyValues(this);

    /**
     * @property {Hook.Auth} auth
     */
    this.auth = new Auth(this);

    /**
     * @property {Hook.System} system
     */
    this.system = new System(this);

    // Setup plugins
    PluginManager.setup(this);
  };

  Client.prototype.collection = function (collectionName) {
    return new Collection(this, collectionName);
  };

  Client.prototype.channel = function (name, options) {
    if (typeof (options) === "undefined") {
      options = {};
    }

    var collection = this.collection(name);
    collection.segments = collection.segments.replace("collection/", "channels/");

    // Use 'SSE' as default transport layer
    if (!options.transport) {
      options.transport = "sse";
    }
    options.transport = options.transport.toUpperCase();

    return new Channel(this, collection, options);
  };

  Client.prototype.url = function (route, params) {
    var serializedParams = "";
    if (params) {
      serializedParams = "&" + this.serialize(params);
    }
    return this.endpoint + route + this.getCredentialsParams() + serializedParams;
  };

  Client.prototype.post = function (segments, data) {
    if (typeof (data) === "undefined") {
      data = {};
    }
    return this.request(segments, "POST", data);
  };

  Client.prototype.get = function (segments, data) {
    return this.request(segments, "GET", data);
  };

  Client.prototype.put = function (segments, data) {
    return this.request(segments, "PUT", data);
  };

  Client.prototype.remove = function (segments, data) {
    return this.request(segments, "DELETE", data);
  };

  Client.prototype.request = function (segments, method, data) {
    var payload, request_headers, deferred = when.defer(), synchronous = false;

    // FIXME: find a better way to write this
    if (data && data._sync) {
      delete data._sync;
      synchronous = true;
    }

    // Compute payload
    payload = this.getPayload(method, data);

    // Compute request headers
    request_headers = this.getHeaders();
    if (!(payload instanceof FormData)) {
      request_headers["Content-Type"] = "application/json"; // exchange data via JSON to keep basic data types
    }

    // Use method override? (some web servers doesn't respond to DELETE/PUT requests)
    if (method !== "GET" && method !== "POST" && this.options.method_override) {
      request_headers["X-HTTP-Method-Override"] = method;
      method = "POST";
    }

    if (typeof (XDomainRequest) !== "undefined") {
      // XMLHttpRequest#setRequestHeader isn't implemented on Internet Explorer's XDomainRequest
      segments += this.getCredentialsParams();
    }

    deferred.promise.xhr = uxhr(this.endpoint + segments, payload, {
      method: method,
      headers: request_headers,
      sync: synchronous,
      success: function (response) {
        var data = null;
        try {
          data = JSON.parseWithDate(response);
        } catch (e) {}

        if (data === false || data === null || data.error) {
          // log error on console
          if (data && data.error) {
            console.error(data.error);
          }
          deferred.resolver.reject(data);
        } else {
          deferred.resolver.resolve(data);
        }
      },
      error: function (response) {
        var data = null;
        try {
          data = JSON.parseWithDate(response);
        } catch (e) {}
        console.log("Error: ", data || "Invalid JSON response.");
        deferred.resolver.reject(data);
      }
    });

    return deferred.promise;
  };

  Client.prototype.getHeaders = function () {
    // App authentication request headers
    var request_headers = {
      "X-App-Id": this.app_id,
      "X-App-Key": this.key
    }, auth_token;

    // Forward user authentication token, if it is set
    var auth_token = this.auth.getToken();
    if (auth_token) {
      request_headers["X-Auth-Token"] = auth_token;
    }
    return request_headers;
  };

  Client.prototype.getPayload = function (method, data) {
    var payload = null;
    if (data) {
      if (data instanceof FormData) {
        payload = data;
      } else if (method !== "GET") {
        var field, value, filename, formdata = new FormData(), worth = false;

        for (field in data) {
          value = data[field];
          filename = null;

          if (typeof (value) === "undefined" || value === null) {
            continue;
          } else if (typeof (value) === "boolean" || typeof (value) === "number" || typeof (value) === "string") {
            value = value.toString();

            // IE8 can't compare instanceof String with HTMLInputElement.
          } else if (value instanceof HTMLInputElement && value.files && value.files.length > 0) {
            filename = value.files[0].name;
            value = value.files[0];
            worth = true;
          } else if (value instanceof HTMLInputElement) {
            value = value.value;
          } else if (value instanceof HTMLCanvasElement) {
            if (typeof (dataURLtoBlob) === "undefined") {
              throw new Error("Please add this dependency in your project: https://github.com/blueimp/JavaScript-Canvas-to-Blob");
            }
            value = dataURLtoBlob(value.toDataURL());
            worth = true;
            filename = "canvas.png";
          } else if (typeof (Blob) !== "undefined" && value instanceof Blob) {
            worth = true;
            filename = "blob." + value.type.match(/\/(.*)/)[1]; // get extension from blob mime/type
          }

          //
          // Consider serialization to keep data types here: http://phpjs.org/functions/serialize/
          //
          if (!(value instanceof Array)) {
            // fixme
            if (typeof (value) === "string") {
              formdata.append(field, value);
            } else {
              try {
                formdata.append(field, value, filename || "file");
              } catch (e) {}
            }
          }
        }

        if (worth) {
          payload = formdata;
        }
      }

      payload = payload || JSON.stringify(data, function (key, value) {
        if (this[key] instanceof Date) {
          return Math.round(this[key].getTime() / 1000);
        } else {
          return value;
        }
      });

      // empty payload, return null.
      if (payload == "{}") {
        return null;
      }

      if (method === "GET" && typeof (payload) === "string") {
        payload = encodeURIComponent(payload);
      }
    }
    return payload;
  };

  Client.prototype.getCredentialsParams = function () {
    var params = "?X-App-Id=" + this.app_id + "&X-App-Key=" + this.key;
    var auth_token = this.auth.getToken();
    if (auth_token) {
      params += "&X-Auth-Token=" + auth_token;
    }
    return params;
  };

  Client.prototype.serialize = function (obj, prefix) {
    var str = [];
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) {
        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
        str.push(typeof v == "object" ? this.serialize(v, k) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  };

  return Client;
})();

},{"./auth":5,"./channel":6,"./collection":8,"./key_values":10,"./plugin_manager":11,"./system":12,"./vendor/json.date-extensions":14,"uxhr":3,"when":4}],8:[function(require,module,exports){
"use strict";

module.exports = (function () {
  var Collection =

  /**
   * @module Hook
   * @class Hook.Collection
   *
   * @param {Hook.Client} client
   * @param {String} name
   * @constructor
   */
  function Collection(client, name) {
    this.client = client;

    this.name = this._validateName(name);
    this.reset();

    this.segments = "collection/" + this.name;
  };

  Collection.prototype.create = function (data) {
    return this.client.post(this.segments, data);
  };

  Collection.prototype.select = function () {
    this.options.select = arguments;
    return this;
  };

  Collection.prototype.get = function () {
    return this.client.get(this.segments, this.buildQuery());
  };

  Collection.prototype.where = function (objects, _operation, _value, _boolean) {
    var field, operation = (typeof (_value) === "undefined") ? "=" : _operation, value = (typeof (_value) === "undefined") ? _operation : _value, boolean = (typeof (_boolean) === "undefined") ? "and" : _boolean;

    if (typeof (objects) === "object") {
      for (field in objects) {
        if (objects.hasOwnProperty(field)) {
          operation = "=";
          if (objects[field] instanceof Array) {
            operation = objects[field][0];
            value = objects[field][1];
          } else {
            value = objects[field];
          }
          this.addWhere(field, operation, value, boolean);
        }
      }
    } else {
      this.addWhere(objects, operation, value, boolean);
    }

    return this;
  };

  Collection.prototype.orWhere = function (objects, _operation, _value) {
    return this.where(objects, _operation, _value, "or");
  };

  Collection.prototype.find = function (_id) {
    var promise = this.client.get(this.segments + "/" + _id, this.buildQuery());
    if (arguments.length > 1) {
      return promise.then.apply(promise, Array.prototype.slice.call(arguments, 1));
    }
    return promise;
  };

  Collection.prototype.join = function () {
    this.options["with"] = arguments;
    return this;
  };

  Collection.prototype.distinct = function () {
    this.options.distinct = true;
    return this;
  };

  Collection.prototype.group = function () {
    this._group = arguments;
    return this;
  };

  Collection.prototype.count = function (field) {
    field = (typeof (field) === "undefined") ? "*" : field;
    this.options.aggregation = { method: "count", field: field };
    var promise = this.get();
    if (arguments.length > 0) {
      promise.then.apply(promise, arguments);
    }
    return promise;
  };

  Collection.prototype.max = function (field) {
    this.options.aggregation = { method: "max", field: field };
    var promise = this.get();
    if (arguments.length > 1) {
      promise.then.apply(promise, Array.prototype.slice.call(arguments, 1));
    }
    return promise;
  };

  Collection.prototype.min = function (field) {
    this.options.aggregation = { method: "min", field: field };
    var promise = this.get();
    if (arguments.length > 1) {
      promise.then.apply(promise, Array.prototype.slice.call(arguments, 1));
    }
    return promise;
  };

  Collection.prototype.avg = function (field) {
    this.options.aggregation = { method: "avg", field: field };
    var promise = this.get();
    if (arguments.length > 1) {
      promise.then.apply(promise, Array.prototype.slice.call(arguments, 1));
    }
    return promise;
  };

  Collection.prototype.sum = function (field) {
    this.options.aggregation = { method: "sum", field: field };
    var promise = this.get();
    if (arguments.length > 1) {
      promise.then.apply(promise, Array.prototype.slice.call(arguments, 1));
    }
    return promise;
  };

  Collection.prototype.first = function () {
    this.options.first = 1;
    var promise = this.get();
    promise.then.apply(promise, arguments);
    return promise;
  };

  Collection.prototype.firstOrCreate = function (data) {
    this.options.first = 1;
    this.options.data = data;
    return this.client.post(this.segments, this.buildQuery());
  };

  Collection.prototype.each = function (cb) {
    var promise = this.then(function (data) {
      for (var i = 0; i < data.length; i++) {
        cb(data[i]);
      }
    });
    return promise;
  };

  Collection.prototype.then = function () {
    var promise = this.get();
    promise.then.apply(promise, arguments);
    return promise;
  };

  Collection.prototype.debug = function (func) {
    func = (typeof (func) == "undefined") ? "log" : func;
    return this.then(console[func].bind(console));
  };

  Collection.prototype.reset = function () {
    this.options = {};
    this.wheres = [];
    this.ordering = [];
    this._group = [];
    this._limit = null;
    this._offset = null;
    this._remember = null;
    return this;
  };

  Collection.prototype.sort = function (field, direction) {
    if (!direction) {
      direction = "asc";
    } else if (typeof (direction) === "number") {
      direction = (parseInt(direction, 10) === -1) ? "desc" : "asc";
    }
    this.ordering.push([field, direction]);
    return this;
  };

  Collection.prototype.limit = function (int) {
    this._limit = int;
    return this;
  };

  Collection.prototype.offset = function (int) {
    this._offset = int;
    return this;
  };

  Collection.prototype.remember = function (minutes) {
    this._remember = minutes;
    return this;
  };

  Collection.prototype.channel = function (options) {
    throw new Error("Not implemented.");
    // return new Hook.Channel(this.client, this, options);
  };

  Collection.prototype.paginate = function (perPage, onComplete, onError) {
    var pagination = new Hook.Pagination(this);

    if (!onComplete) {
      onComplete = perPage;
      perPage = Hook.defaults.perPage;
    }

    this.options.paginate = perPage;
    this.then(function (data) {
      pagination._fetchComplete(data);
      if (onComplete) {
        onComplete(pagination);
      }
    }, onError);

    return pagination;
  };

  Collection.prototype.drop = function () {
    return this.client.remove(this.segments);
  };

  Collection.prototype.remove = function (_id) {
    var path = this.segments;
    if (typeof (_id) !== "undefined") {
      path += "/" + _id;
    }
    return this.client.remove(path, this.buildQuery());
  };

  Collection.prototype.update = function (_id, data) {
    return this.client.post(this.segments + "/" + _id, data);
  };

  Collection.prototype.increment = function (field, value) {
    this.options.operation = { method: "increment", field: field, value: value };
    var promise = this.client.put(this.segments, this.buildQuery());
    if (arguments.length > 0) {
      promise.then.apply(promise, arguments);
    }
    return promise;
  };

  Collection.prototype.decrement = function (field, value) {
    this.options.operation = { method: "decrement", field: field, value: value };
    var promise = this.client.put(this.segments, this.buildQuery());
    if (arguments.length > 0) {
      promise.then.apply(promise, arguments);
    }
    return promise;
  };

  Collection.prototype.updateAll = function (data) {
    this.options.data = data;
    return this.client.put(this.segments, this.buildQuery());
  };

  Collection.prototype.addWhere = function (field, operation, value, boolean) {
    this.wheres.push([field, operation.toLowerCase(), value, boolean]);
    return this;
  };

  Collection.prototype._validateName = function (name) {
    var regexp = /^[a-z_\/0-9]+$/;

    if (!regexp.test(name)) {
      throw new Error("Invalid name: " + name);
    }

    return name;
  };

  Collection.prototype.buildQuery = function () {
    var query = {};

    // apply limit / offset and remember
    if (this._limit !== null) {
      query.limit = this._limit;
    }
    if (this._offset !== null) {
      query.offset = this._offset;
    }
    if (this._remember !== null) {
      query.remember = this._remember;
    }

    // apply wheres
    if (this.wheres.length > 0) {
      query.q = this.wheres;
    }

    // apply ordering
    if (this.ordering.length > 0) {
      query.s = this.ordering;
    }

    // apply group
    if (this._group.length > 0) {
      query.g = this._group;
    }

    var f, shortnames = {
      paginate: "p", // pagination (perPage)
      first: "f", // first / firstOrCreate
      aggregation: "aggr", // min / max / count / avg / sum
      operation: "op", // increment / decrement
      data: "data", // updateAll / firstOrCreate
      "with": "with", // join / relationships
      select: "select", // fields to return
      distinct: "distinct" // use distinct operation
    };

    for (f in shortnames) {
      if (this.options[f]) {
        query[shortnames[f]] = this.options[f];
      }
    }

    // clear wheres/ordering for future calls
    this.reset();

    return query;
  };

  return Collection;
})();

},{}],9:[function(require,module,exports){
"use strict";

/**
 * @module Hook
 */

var Hook = {
  VERSION: "0.3.0",

  Events: require("./utils/events"),
  Client: require("./client"),
  Plugins: require("./plugin_manager"),

  defaults: {
    perPage: 50
  }
};

//
// Legacy browser support
//
if (typeof (window.FormData) === "undefined") {
  // IE9<: prevent crash when FormData isn't defined.
  window.FormData = function () {
    this.append = function () {};
  };
}

if (!window.location.origin) {
  // Support location.origin
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : "");
}

module.exports = Hook;

},{"./client":7,"./plugin_manager":11,"./utils/events":13}],10:[function(require,module,exports){
"use strict";

module.exports = (function () {
  var KeyValues =

  /**
   * @module Hook
   * @class Hook.KeyValues
   *
   * @param {Hook.Client} client
   * @constructor
   */
  function KeyValues(client) {
    this.client = client;
  };

  KeyValues.prototype.get = function (key, callback) {
    var promise = this.client.get("key/" + key);
    if (callback) {
      promise.then.apply(promise, [callback]);
    }
    return promise;
  };

  KeyValues.prototype.set = function (key, value) {
    return this.client.post("key/" + key, { value: value });
  };

  return KeyValues;
})();

},{}],11:[function(require,module,exports){
"use strict";

var plugins = [];

/**
 * @module Hook
 * @class Hook.PluginManager
 */

var PluginManager = (function () {
  var PluginManager = function PluginManager() {};

  PluginManager.setup = function (client) {
    for (var i = 0, l = plugins.length; i < l; i++) {
      client[this.plugins[i].path] = new plugins[i].klass(client);
    }
  };

  PluginManager.register = function (path, klass) {
    plugins.push({ path: path, klass: klass });
  };

  return PluginManager;
})();

module.exports = PluginManager;

},{}],12:[function(require,module,exports){
"use strict";

module.exports = (function () {
  var System =

  /**
   * @module Hook
   * @class Hook.System
   *
   * @param {Client} client
   * @constructor
   */
  function System(client) {
    this.client = client;
  };

  System.prototype.time = function () {
    var promise = this.client.get("system/time");
    if (arguments.length > 0) {
      promise.then.apply(promise, arguments);
    }
    return promise;
  };

  return System;
})();

},{}],13:[function(require,module,exports){
"use strict";

/**
 * @class Hook.Events
 */
var Events = (function () {
  var Events = function Events() {
    this._events = {};
  };

  Events.prototype.on = function (event, callback, context) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push({ callback: callback, context: context || this });
  };

  Events.prototype.trigger = function (event, data) {
    var c, args = Array.prototype.slice.call(arguments, 1);
    if (this._events[event]) {
      for (var i = 0, length = this._events[event].length; i < length; i++) {
        c = this._events[event][i];
        c.callback.apply(c.context || this.client, args);
      }
    }
  };

  return Events;
})();

module.exports = Events;

},{}],14:[function(require,module,exports){
"use strict";

/**
 * JSON Date Extensions - JSON date parsing extensions
 *
 * (c) 2014 Rick Strahl, West Wind Technologies
 *
 * Released under MIT License
 * http://en.wikipedia.org/wiki/MIT_License
 *
 * https://github.com/RickStrahl/json.date-extensions
 */
(function (undefined) {
  if (this.JSON && !this.JSON.dateParser) {
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.{0,1}\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;

    /// <summary>
    /// set this if you want MS Ajax Dates parsed
    /// before calling any of the other functions
    /// </summary>
    JSON.parseMsAjaxDate = false;

    JSON.useDateParser = function (reset) {
      /// <summary>
      /// Globally enables JSON date parsing for JSON.parse().
      /// Replaces the default JSON.parse() method and adds
      /// the datePaser() extension to the processing chain.
      /// </summary>
      /// <param name="reset" type="bool">when set restores the original JSON.parse() function</param>

      // if any parameter is passed reset
      if (reset != undefined) {
        if (JSON._parseSaved) {
          JSON.parse = JSON._parseSaved;
          JSON._parseSaved = null;
        }
      } else {
        if (!JSON._parseSaved) {
          JSON._parseSaved = JSON.parse;
          JSON.parse = JSON.parseWithDate;
        }
      }
    };

    /// <summary>
    /// Creates a new filter that processes dates and also delegates to a chain filter optionaly.
    /// </summary>
    /// <param name="chainFilter" type="Function">property name that is parsed</param>
    /// <returns type="Function">returns a new chainning filter for dates</returns>
    function createDateParser(chainFilter) {
      return function (key, value) {
        var parsedValue = value;
        if (typeof value === "string") {
          var a = reISO.exec(value);
          if (a) {
            parsedValue = new Date(value);
          } else if (JSON.parseMsAjaxDate) {
            a = reMsAjax.exec(value);
            if (a) {
              var b = a[1].split(/[-+,.]/);
              parsedValue = new Date(b[0] ? +b[0] : 0 - +b[1]);
            }
          }
        }
        if (chainFilter !== undefined) return chainFilter(key, parsedValue);else return parsedValue;
      };
    }

    /// <summary>
    /// A filter that can be used with JSON.parse to convert dates.
    /// </summary>
    /// <param name="key" type="string">property name that is parsed</param>
    /// <param name="value" type="any">property value</param>
    /// <returns type="date">returns date or the original value if not a date string</returns>
    JSON.dateParser = createDateParser();

    JSON.parseWithDate = function (json, chainFilter) {
      /// <summary>
      /// Wrapper around the JSON.parse() function that adds a date
      /// filtering extension. Returns all dates as real JavaScript dates.
      /// </summary>
      /// <param name="json" type="string">JSON to be parsed</param>
      /// <returns type="any">parsed value or object</returns>
      var parse = JSON._parseSaved ? JSON._parseSaved : JSON.parse;
      try {
        var res = parse(json, createDateParser(chainFilter));
        return res;
      } catch (e) {
        // orignal error thrown has no error message so rethrow with message
        throw new Error("JSON content could not be parsed");
      }
    };

    JSON.dateStringToDate = function (dtString, nullDateVal) {
      /// <summary>
      /// Converts a JSON ISO or MSAJAX date or real date a date value.
      /// Supports both JSON encoded dates or plain date formatted strings
      /// (without the JSON string quotes).
      /// If you pass a date the date is returned as is. If you pass null
      /// null or the nullDateVal is returned.
      /// </summary>
      /// <param name="dtString" type="var">Date String in ISO or MSAJAX format</param>
      /// <param name="nullDateVal" type="var">value to return if date can't be parsed</param>
      /// <returns type="date">date or the nullDateVal (null by default)</returns>
      if (!nullDateVal) nullDateVal = null;

      if (!dtString) return nullDateVal; // empty

      if (dtString.getTime) return dtString; // already a date

      if (dtString[0] === "\"" || dtString[0] === "'")
        // strip off JSON quotes
        dtString = dtString.substr(1, dtString.length - 2);

      var a = reISO.exec(dtString);
      if (a) return new Date(dtString);

      if (!JSON.parseMsAjaxDate) return nullDateVal;

      a = reMsAjax.exec(dtString);
      if (a) {
        var b = a[1].split(/[-,.]/);
        return new Date(+b[0]);
      }
      return nullDateVal;
    };
  }
})();

},{}]},{},[9])(9)
});