"use strict";
// Stolen from https://github.com/thenativeweb/get-routes

// Disable naming convention because fast_slash comes from Express.
// eslint-disable-next-line @typescript-eslint/naming-convention
const regexPrefixToString = (path) => {
    if (path.fast_slash) {
        return '';
    }
    // eslint-disable-next-line prefer-named-capture-group
    const match = /^\/\^((?:\\[$()*+./?[\\\]^{|}]|[^$()*+./?[\\\]^{|}])*)\$\//u.exec(path.toString().replace('\\/?', '').replace('(?=\\/|$)', '$'));
    if (match) {
        // Unescape characters.
        // eslint-disable-next-line prefer-named-capture-group
        return match[1].replace(/\\(.)/gu, '$1');
    }
    return '[Unknown path]';
};

const getRoutes = function (app) {
    const routes = {
        all: [],
        get: [],
        post: [],
        put: [],
        patch: [],
        delete: []
    };
    const processMiddleware = (middleware, prefix = '') => {
        if (middleware.name === 'router' && middleware.handle.stack) {
            for (const subMiddleware of middleware.handle.stack) {
                processMiddleware(subMiddleware, `${prefix}${regexPrefixToString(middleware.regexp)}`);
            }
        }
        if (!middleware.route) {
            return;
        }
        const { method } = middleware.route.stack[0];
        const { path } = middleware.route;
        const regexp = middleware.regexp;
        const entry = {
            route: `${prefix}${path}`,
            prefix: prefix,
            regexp: regexp,
            method: method,
        };
        routes.all.push(entry);
        
        switch (method) {
            case 'get':
                routes.get.push(`${prefix}${path}`);
                break;
            case 'post':
                routes.post.push(`${prefix}${path}`);
                break;
            case 'put':
                routes.put.push(`${prefix}${path}`);
                break;
            case 'patch':
                routes.patch.push(`${prefix}${path}`);
                break;
            case 'delete':
                routes.delete.push(`${prefix}${path}`);
                break;
            default:
                throw new Error(`Invalid method ${method}.`);
        }
    };
    // eslint-disable-next-line no-underscore-dangle
    for (const middleware of app._router.stack) {
        processMiddleware(middleware);
    }
    return routes;
};

exports.getRoutes = getRoutes;
