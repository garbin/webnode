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

Router.resource = function () {
    var prefix = '/';

    for (i in arguments) {
        var model = arguments[i],
            resource_index = '',
            resource_item = '',
            namespace     = model;
        if (typeof(model) != 'string') {
            namespace = model.alias;
        }

        var name_plural = namespace.plural();
        if (i == arguments.length - 1) {
            var resource_index = prefix + name_plural,
                resource_item  = prefix + name_plural + '/:id';

            Router.get(resource_index, namespace + '#index');
            Router.post(resource_index, namespace + '#create');
            Router.get(resource_item, namespace + '#get');
            Router.patch(resource_item, namespace + '#patch');
            Router.put(resource_item, namespace + '#put');
            Router.del(resource_item, namespace + '#delete');
        } else {
            resource_index = prefix + name_plural;
            resource_item  = resource_index + '/:id';
            Router.get(resource_index, namespace + '#index');
            Router.post(resource_index, namespace + '#create');
            Router.get(resource_item, namespace + '#get');
            Router.patch(resource_item, namespace + '#patch');
            Router.put(resource_item, namespace + '#put');
            Router.del(resource_item, namespace + '#delete');

            prefix += name_plural + '/:' + namespace + 'Id/';
        }
    }

};


module.exports = Router;
