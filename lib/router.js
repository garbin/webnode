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
        var model_name = arguments[i],
            resource_index = '',
            resource_item = '';
        var name_plural = model_name.plural();
        if (i == arguments.length - 1) {
            var resource_index = prefix + name_plural,
                resource_item  = prefix + name_plural + '/:id';

            Router.get(resource_index, model_name + '#index');
            Router.post(resource_index, model_name + '#create');
            Router.get(resource_item, model_name + '#get');
            Router.patch(resource_item, model_name + '#patch');
            Router.put(resource_item, model_name + '#put');
            Router.del(resource_item, model_name + '#delete');
        } else {
            resource_index = prefix + name_plural;
            resource_item  = resource_index + '/:id';
            Router.get(resource_index, model_name + '#index');
            Router.post(resource_index, model_name + '#create');
            Router.get(resource_item, model_name + '#get');
            Router.patch(resource_item, model_name + '#patch');
            Router.put(resource_item, model_name + '#put');
            Router.del(resource_item, model_name + '#delete');

            prefix += name_plural + '/:' + model_name + '_id/';
        }
    }

};


module.exports = Router;
