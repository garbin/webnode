
var Fiber = require('sync').Fibers;
var EventEmitter = require("events").EventEmitter

EventEmitter.prototype.sync = function (evt) {
    var fiber = Fiber.current,
        result,
        evt   = evt || 'success',
        yielded = false;

    // Create virtual callback
    var syncCallback = function (callbackResult, otherArgs) {
        // forbid to call twice
        if (syncCallback.called) return;
        syncCallback.called = true;

        if (otherArgs) {
            // Support multiple callback result values
            result = [];
            for (var i = 1, l = arguments.length; i < l; i++) {
                result.push(arguments[i]);
            }
        }
        else {
            result = callbackResult;
        }

        // Resume fiber if yielding
        if (yielded) fiber.run();
    }

    this.on.apply(this, [evt, syncCallback])

    // wait for result
    if (!syncCallback.called) {
        yielded = true;
        Fiber.yield();
    }

    return result;
};

Function.prototype.syncBind = function (obj) {
    this.syncBindObj = obj;
    return this;
};

var sync = Function.prototype.sync;

Function.prototype.sync     = function () {
    var args = [this.syncBindObj || null];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return sync.apply(this, args)
}

Function.prototype.restifyAsyncMiddleware = function  (obj) {
    var fn = this.async(obj);
    return function(req, res, next) {
        return fn.call(this, req, res, next, function(err, result){
            if (err) return next(err);
            if (result !== true) next();
        });
    };
}
