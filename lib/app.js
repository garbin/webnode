var WebnodeApp,
    CWD     = process.cwd(),
    Restify = require('restify'),
    Bunyan  = require('bunyan'),
    Commander = require('commander'),
    FS      = require('fs'),
    OS      = require('os'),
    Path    = require('path'),
    Cluster = require('cluster'),
    Sequelize = require('sequelize');

WebnodeApp = function (home_dir) {
    CWD = home_dir || CWD;
    this.commander = Commander;
    this.commander
        .version('0.0.1')
        .option('-e, --env [value]', '运行环境，可选值 development, production, test');
};

WebnodeApp.Controller = require('./controller');
WebnodeApp.Router     = require('./router');
WebnodeApp.Command    = require('./command');
WebnodeApp.Restify    = Restify;
WebnodeApp.Cluster    = {
    run: function(f) {
        if (Cluster.isMaster) {
            OS.cpus().forEach(function(cpu) {
                Cluster.fork();
            });
            Cluster.on('death', function(worker) {
                console.log('Worker ' + worker.pid + ' died');
                Cluster.fork();
            });
        } else {
            f();
        }
    }
};

WebnodeApp.prototype.requestListener = function() {
    // 启用中间件
    this.server.use(Restify.acceptParser(this.server.acceptable));
    this.server.use(Restify.authorizationParser());
    this.server.use(Restify.dateParser());
    this.server.use(Restify.queryParser());
    this.server.use(Restify.jsonp());
    this.server.use(Restify.gzipResponse());
    this.server.use(Restify.bodyParser());

    // 记录请求日志
    //this.server.on('after', function (req, res, route) {
        //req.log.info({req: req}, 'request finished');
        //req.log.info({res: res}, 'response sent');
    //});

    // 路由
    this.dispatch();
};

WebnodeApp.prototype.getConfig = function() {
    return require(CWD + "/config/" + this.env)
};

WebnodeApp.prototype.run = function(cb) {
    this.getEnv();

    // 初始化数据库及模型
    this.loadModels();

    // 初始化服务器
    this.server = Restify.createServer({
        log: Bunyan.createLogger({
            name: "webnode",
            streams: [
                {
                    path: CWD + '/data/log/debug.log',
                    level: 'debug'
                },
                {
                    path: CWD + '/data/log/error.log',
                    level: 'error'
                },
                {
                    path: CWD + '/data/log/info.log',
                    level: 'info'
                },
                {
                    path: CWD + '/data/log/warn.log',
                    level: 'warn'
                },
                //{
                    //path: CWD + '/data/log/trace.log',
                    //level: 'trace'
                //},
                {
                    path: CWD + '/data/log/fatal.log',
                    level: 'fatal'
                }
            ],
            serializers: Bunyan.stdSerializers
        })
    });

    // 加载控制器
    this.loadControllers();

    // 运行请求监听器
    this.requestListener();

    // 加载默认异常处理器
    this.errorHandler();

    // 监听端口
    var port = this.getConfig().port || 3000;
    this.server.listen(port, cb || function() {
        console.log('Webnode started on port ' + port);
    });
};

WebnodeApp.prototype.exec = function(command) {
    var cmd = new command(this.commander);
    this.getEnv();
    this.loadModels();
    cmd.exec();
};

WebnodeApp.prototype.route = function(controller, action) {
    var self = this;
    return (function(controller, action) {
        return function(req, res, next) {
            self.controllers[controller].dispatch(action, req, res, next);
        };
    })(controller, action);
};

WebnodeApp.prototype.dispatch = function() {
    // 加载路由配置
    require(CWD + '/config/router')(WebnodeApp.Router);
    table = WebnodeApp.Router.table();

    // 应用路由
    for (var i = 0; i < table.length; i++) {
        this.server[table[i].verb](table[i].pattern, this.route(table[i].controller, table[i].action));
    }
};

WebnodeApp.prototype.getEnv = function() {
    this.commander.parse(process.argv);
    this.env = this.commander.env || 'development';
};

WebnodeApp.prototype.loadModels = function() {
    // 初始化Sequelize
    mysql = this.getConfig().mysql;
    this.sequelize = new Sequelize(mysql.db_name, mysql.user || 'root', mysql.passwd || null, {
        host: mysql.host || 'localhost',
        port: mysql.port || '3306',
        //pool: {
            //maxConnections: mysql.pool_size || 0,
            //maxIdleTime: mysql.idle || 0
        //},
        define: {
            charset: mysql.charset || 'utf8',
            collate: mysql.collate || 'utf8_general_ci'
        }
    });

    // 加载models
    this.models = {};
    var model_files = FS.readdirSync(CWD + '/app/model');
    for (var i = 0; i < model_files.length; i++) {
        if (model_files[i][0] == '.') {
            continue;
        }
        var model_name = Path.basename(model_files[i], '.coffee');
        this.models[model_name] = require(CWD + '/app/model/' + model_name)(this.sequelize);
    }
};

WebnodeApp.prototype.loadControllers = function() {
    this.controllers= {};
    var controller_files = FS.readdirSync(CWD + '/app/controller');
    for (var i = 0; i < controller_files.length; i++) {
        var controller_name = Path.basename(controller_files[i], '.coffee');
        if (controller_name[0] == '.' || controller_name == 'exception') {
            continue;
        }
        this.controllers[controller_name] = new (require(CWD + '/app/controller/' + controller_name)(this));
    }
};

WebnodeApp.prototype.model = function(model_name) {
    return this.models[model_name];
};

WebnodeApp.prototype.errorHandler = function(handler) {
    this.server.on('uncaughtException', handler || this.defaultErrorHandler());
    return this;
};
WebnodeApp.prototype.defaultErrorHandler = function() {
    return require(CWD + '/app/controller/exception');
};


module.exports = WebnodeApp;
