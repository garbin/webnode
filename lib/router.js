var Router = {},
    routes = [];

Router.push = function(verb, pattern, action) {
    tmp = action.split('#');
    routes.push({
        verb: verb,
        pattern: pattern,
        controller: tmp[0],
        action: tmp[1],
    });
};

Router.table = function() {
    return routes;
};

verbs = ['get', 'post', 'put', 'patch', 'del'];
for (var i = 0; i < verbs.length; i++) {
    verb = verbs[i];
    Router[verb] = (function(verb) {
        return function(pattern, action) {
            Router.push(verb, pattern, action);
        };
    })(verb);
}

Router.resource = function (name) {
    name_plural = name.plural();

    // 列表
    Router.get('/' + name_plural, name + '#index');
    Router.post('/' + name_plural, name + '#create');
    Router.get('/' + name_plural + '/:id', name + '#get');
    Router.patch('/' + name_plural + '/:id', name + '#patch');
    Router.put('/' + name_plural + '/:id', name + '#put');
    Router.del('/' + name_plural + '/:id', name + '#delete');
};


module.exports = Router;
