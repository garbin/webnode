var EventEmitter = require('events').EventEmitter,
    Util         = require('util'),
    Restify      = require('restify'),
    Controller   = function () {};

// 继承至EventEmitter
Util.inherits(Controller, EventEmitter);

// 定义类方法
Controller.prototype.index = function() {
    this.response.send('Hello!');
};
Controller.prototype.dispatch = function(action, req, res, next) {
    action = action || 'index';
    return this.callAction(action, req, res, next);
};
Controller.prototype.callAction = function(action, req, res, next) {
    return this[action](req, res, next);
};

Controller.prototype.err = function(status, msg) {
    var error;
    switch(status) {
        case 404:
            error = new Restify.ResourceNotFoundError(msg);
            break;
        case 'bad_method':
            error = new Restify.BadMethodError(msg);
            break;
        default:
            error = new Restify.InternalError(msg);
    }

    return error;
};


module.exports = Controller;
