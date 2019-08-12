import * as pathToRegExp from "path-to-regexp";
import { FetchContext, Middleware } from "swork";
import { configuration } from "swork/dist/configuration";

/**
 * Defines the configuration used to by a Router instance.
 *
 * @export
 * @interface IRouterConfiguration
 */
export interface IRouterConfiguration {
    prefix?: string;
    origin?: string;
}

interface IRouterContext {
    /**
     * The params object populated by the matching routes.
     */
    params: { [key: string]: string };
}

/**
 * The router context; an extension of FetchContext.
 */
export type RouterContext = FetchContext & IRouterContext;

/**
 * The router middleware definition; an extension of Middleware.
 */
export type RouterMiddleware = (context: RouterContext, next: () => Promise<void>) => void | Promise<void>;

type HttpMethod = "HEAD" | "OPTIONS" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

interface IMiddlewareDetails {
    path: string;
    methods: HttpMethod[];
    middleware: RouterMiddleware;
}

/**
 * Router intended to be used with swork. Allows definition of paths and middleware to handle matching requests.
 *
 * @export
 * @class Router
 */
export class Router {
    protected config: IRouterConfiguration;
    protected middlewareDetails: Array<IMiddlewareDetails | Router> = [];
    
    private routesCalled: boolean = false;

    /**
     * Creates an instance of Router.
     * @param {IRouterConfiguration} [config]
     * @memberof Router
     */
    constructor(config?: IRouterConfiguration) {
        this.config = Object.assign({
            origin: configuration.origin,
            prefix: "",
        }, config!);

        if (this.config.prefix) {
            this.validatePath(this.config.prefix);
        }
    }

    /**
     * Defines a head request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public head(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["HEAD"], middleware);
        return this;
    }

    /**
     * Defines an options request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public options(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["OPTIONS"], middleware);
        return this;
    }

    /**
     * Defines a get request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public get(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["GET"], middleware);
        return this;
    }

    /**
     * Defines a post request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public post(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["POST"], middleware);
        return this;
    }

    /**
     * Defines a patch request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public patch(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["PATCH"], middleware);
        return this;
    }

    /**
     * Defines a put request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public put(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["PUT"], middleware);
        return this;
    }

    /**
     * Defines a delete request handler.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public delete(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["DELETE"], middleware);
        return this;
    }

    /**
     * Defines a request handler for all HTTP verbs.
     *
     * @param {string} path
     * @param {RouterMiddleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public all(path: string, middleware: RouterMiddleware): Router {
        this.addMiddlewareDetails(path, ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"], middleware);
        return this;
    }

    /**
     * Builds the middlewares from the router to be used by swork.
     *
     * @returns {Middleware[]}
     * @memberof Router
     */
    public routes(): Middleware[] {
        if (this.routesCalled) {
            throw new Error("Routes can only be called once.");
        }

        const middleware: Middleware[] = [];

        this.middlewareDetails.forEach((detail) => {
            if (detail instanceof Router) {                
                if (this.config.prefix) {
                    detail.config.prefix = this.config.prefix + detail.config.prefix;
                }

                detail.config.origin = this.config.origin;

                Array.prototype.push.apply(middleware, detail.routes());
            } else {
                middleware.push(this.build(detail.path, detail.methods, detail.middleware));
            }
        });
        
        this.routesCalled = true;

        return middleware;
    }

    /**
     * Adds to the internal middlewares allowing nested routers.
     *
     * @param {(Router)} param
     * @memberof Router
     */
    public use(param: Router): void {
        this.middlewareDetails.push(param);
    }

    private addMiddlewareDetails(path: string, methods: HttpMethod[], middleware: RouterMiddleware): void {
        this.validatePath(path);
        
        this.middlewareDetails.push({
            methods,
            middleware,
            path,
        } as IMiddlewareDetails);
    }

    private build(path: string, methods: HttpMethod[], middleware: RouterMiddleware): Middleware {
        if (this.config.prefix) {
            path = this.config.prefix + path;
        }

        const paramNames: pathToRegExp.Key[] = [];
        const regexp = pathToRegExp(path, paramNames);
        const origin = this.config.origin!;

        return (context: FetchContext, next: () => Promise<void>): Promise<void> => {
            const routerContext = context as RouterContext;

            if (methods.indexOf(routerContext.request.method as HttpMethod) === -1) {
                return next();
            }

            const url = new URL(routerContext.request.url);

            if (origin !== url.origin.toLowerCase()) {
                return next();
            }

            if (!regexp.test(url.pathname)) {
                return next();
            }

            if (paramNames.length) {
                const params = url.pathname.match(regexp)!.slice(1);

                routerContext.params = {};

                params.forEach((value: string, index: number) => {
                    routerContext.params[paramNames[index].name] = value;
                });
            }

            return Promise.resolve(middleware(routerContext, next));
        };
    }
    
    private validatePath(path: string) {
        if (path[0] !== "/") {
            throw new Error(`config.prefix "${path}" does not have a valid format.`);
        }

        if (path.length > 1 && path[path.length - 1] === "/") {
            throw new Error(`config.prefix "${path}" does not have a valid format.`);
        }
    }
}
