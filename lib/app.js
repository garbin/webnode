var WebnodeApp,
    CWD     = process.cwd(),
    Restify = require('restify'),
    Bunyan  = require('bunyan'),
    Commander = require('commander'),
    FS      = require('fs'),
    OS      = require('os'),
    Path    = require('path'),
    Cluster = require('cluster'),
    Domain  = require('domain'),
    Sync    = require('sync'),
    Sequelize = require('sequelize');

require('./enhancement');

WebnodeApp = function (home_dir, serverConfig) {
    CWD = home_dir || CWD;
    this.commander = Commander;
    this.commander
        .version('0.0.1')
        .option('-e, --env [value]', '运行环境，可选值 development, production, test');
    this.config = serverConfig || {
        port: 3000,
        mysql: {}
    };

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
};

WebnodeApp.Controller = require('./controller');
WebnodeApp.Router     = require('./router');
WebnodeApp.Command    = require('./command');
WebnodeApp.Restify    = Restify;
WebnodeApp.Sync       = Sync;
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
    var self = this;
    var corsOptions = this.getConfig().CORS || {
        headers: ['link']
    };
    this.server.use(Restify.CORS(corsOptions));
    this.server.use(Restify.fullResponse());
    this.server.use(Restify.acceptParser(this.server.acceptable));
    this.server.use(Restify.authorizationParser());
    this.server.use(Restify.dateParser());
    this.server.use(Restify.queryParser());
    this.server.use(Restify.jsonp());
    this.server.use(Restify.bodyParser());
    this.server.use(function(req, res, next) {
        if (req.headers.origin) {
          res.header('Access-Control-Allow-Origin', req.headers.origin);
        }
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, Cookie, Set-Cookie, Accept, Access-Control-Allow-Credentials, Origin, Content-Type, Request-Id , X-Api-Version, X-Request-Id');
        res.header('Access-Control-Expose-Headers', 'Set-Cookie');
        return next();
    });

    this.server.opts('.*', function(req, res, next) {
      if (req.headers.origin && req.headers['access-control-request-method']) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, Cookie, Set-Cookie, Accept, Access-Control-Allow-Credentials, Origin, Content-Type, Request-Id , X-Api-Version, X-Request-Id');
        res.header('Access-Control-Expose-Headers', 'Set-Cookie');
        res.header('Allow', req.headers['access-control-request-method']);
        res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
        req.log.info({
          url: req.url,
          method: req.headers['access-control-request-method']
        }, "Preflight");
        res.send(204);
        next();
      } else {
        res.send(404);
        next();
      }
    });
    //this.server.on('uncaughtException', self.defaultErrorHandler());
    // 记录请求日志
    //this.server.on('after', function (req, res, route) {
        //req.log.info({req: req}, 'request finished');
        //req.log.info({res: res}, 'response sent');
    //});

    // 路由
    this.dispatch();
};

WebnodeApp.prototype.getConfig = function() {
    var config_path = CWD + "/config/" + this.env + '/config.coffee';
    if (FS.existsSync(config_path)) {
        return require(CWD + "/config/" + this.env + '/config')
    } else {
        return this.config;
    }
};

WebnodeApp.prototype.run = function(cb) {
    this.getEnv();

    // 初始化数据库及模型
    this.loadModels();

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

WebnodeApp.prototype.close = function(cb) {
    this.server.close(cb);
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
            res.linkHeader = function(link_info) {
                tmp = [];
                for (key in link_info) {
                    tmp.push('<' + link_info[key] + '>; rel="' + key + '"');
                }
                res.header('Link', tmp.join(","));
            };
            if (req.body) {
                try {
                    if (typeof(req.body) == 'string') {
                        req.JSON = JSON.parse(req.body);
                    } else {
                        if (typeof(req.body) == 'object') {
                            req.JSON = req.body;
                        }
                    }
                } catch(err) {
                }
            }
            self.controllers[controller].dispatch(action, req, res, next);
        };
    })(controller, action);
};

WebnodeApp.prototype.dispatch = function() {
    // 加载路由配置
    var router_config = CWD + '/config/router.coffee';
    if (FS.existsSync(router_config)) {
        require(router_config)(WebnodeApp.Router);
        table = WebnodeApp.Router.table();
        // 应用路由
        for (var i = 0; i < table.length; i++) {
            //this.server[table[i].verb](table[i].pattern, this.route(table[i].controller, table[i].action).restifyAsyncMiddleware());
            this.server[table[i].verb](table[i].pattern, this.route(table[i].controller, table[i].action));
        }
    } else {
        throw '未正确配置router, 请编辑/config/router.coffee以完成路由配置'
    }
};

WebnodeApp.prototype.getEnv = function() {
    this.commander.parse(process.argv);
    this.env = this.commander.env || 'development';
};

WebnodeApp.prototype.loadModels = function() {
    // 初始化Sequelize
    var mysql = this.getConfig().mysql;
    this.sequelize = new Sequelize(mysql.db_name, mysql.user || 'root', mysql.passwd || null, {
        host: mysql.host || 'localhost',
        port: mysql.port || '3306',
        pool: {
            maxConnections: mysql.max_connections || 10,
            maxIdleTime: mysql.max_idle_time|| 30,
            minConnections: mysql.min_connections || 2
        },
        define: {
            charset: mysql.charset || 'utf8',
            collate: mysql.collate || 'utf8_general_ci'
        }
    });

    // 加载models
    this.models = {};
    var model_dir = CWD + '/app/model';
    if (FS.existsSync(model_dir)) {
        var model_files = FS.readdirSync(model_dir);
        for (var i = 0; i < model_files.length; i++) {
            if (model_files[i][0] == '.' || Path.basename(model_files[i], '.coffee') == 'relations') {
                continue;
            }
            var model_name = Path.basename(model_files[i], '.coffee');
            this.models[model_name] = require(CWD + '/app/model/' + model_name)(this.sequelize, this);
        }
    }
    this.loadModelAssocications();
};

WebnodeApp.prototype.loadModelAssocications = function() {
    var relation_file = CWD + '/app/model/relations.coffee';
    if (FS.existsSync(relation_file)) {
        require(relation_file)(this);
    }
};

WebnodeApp.prototype.loadControllers = function() {
    this.controllers= {};
    var controller_dir = CWD + '/app/controller';
    if (FS.existsSync(controller_dir)) {
        var controller_files = FS.readdirSync(controller_dir);
        for (var i = 0; i < controller_files.length; i++) {
            var controller_name = Path.basename(controller_files[i], '.coffee');
            if (controller_name[0] == '.' || controller_name == 'exception') {
                continue;
            }
            this.controllers[controller_name] = new (require(CWD + '/app/controller/' + controller_name)(this));
        }
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
    var exception_controller = CWD + '/app/controller/exception.coffee';
    if (FS.existsSync(exception_controller)) {
        return require(exception_controller);
    } else {
        return function(req, res, route, error) {
            console.log(error);
        };
    }

};


module.exports = WebnodeApp;
