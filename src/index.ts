import { Key, pathToRegexp } from "path-to-regexp";
import { FetchContext, Middleware } from "swork";
import { configuration } from "swork/dist/configuration";

declare module "swork" {
    // tslint:disable-next-line:interface-name
    interface FetchContext {
        /**
         * The params object populated by the matching routes.
         */
        params: { [key: string]: string };
    }
}

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

type HttpMethod = "HEAD" | "OPTIONS" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

interface IMiddlewareDetails {
    path: string[];
    methods: HttpMethod[];
    middleware: Middleware;
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
            this.validatePaths([this.config.prefix]);
        }
    }

    /**
     * Defines a head request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public head(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["HEAD"], middleware);
        return this;
    }

    /**
     * Defines an options request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public options(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["OPTIONS"], middleware);
        return this;
    }

    /**
     * Defines a get request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public get(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["GET"], middleware);
        return this;
    }

    /**
     * Defines a post request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public post(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["POST"], middleware);
        return this;
    }

    /**
     * Defines a patch request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public patch(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["PATCH"], middleware);
        return this;
    }

    /**
     * Defines a put request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public put(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["PUT"], middleware);
        return this;
    }

    /**
     * Defines a delete request handler.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public delete(path: string | string[], middleware: Middleware): Router {
        this.addMiddlewareDetails(path, ["DELETE"], middleware);
        return this;
    }

    /**
     * Defines a request handler for all HTTP verbs.
     *
     * @param {string} path
     * @param {Middleware} middleware
     * @returns {Router}
     * @memberof Router
     */
    public all(path: string | string[], middleware: Middleware): Router {
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

        if (!this.config.origin) {
            throw new Error("Origin must be non-empty.");
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
                Array.prototype.push.apply(middleware, this.build(detail.path, detail.methods, detail.middleware));
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

    private addMiddlewareDetails(path: string | string[], methods: HttpMethod[], middleware: Middleware): void {
        if (!Array.isArray(path)) {
            path = [path];
        }

        this.validatePaths(path);

        this.middlewareDetails.push({
            methods,
            middleware,
            path,
        } as IMiddlewareDetails);
    }

    private build(paths: string[], methods: HttpMethod[], middleware: Middleware): Middleware[] {
        const results: Middleware[] = [];

        paths.forEach((path) => {
            if (this.config.prefix) {
                path = this.config.prefix + path;
            }

            const paramNames: Key[] = [];
            const regexp = pathToRegexp(path, paramNames);
            const origin = this.config.origin!;

            results.push((context: FetchContext, next: () => Promise<void>): Promise<void> => {
                if (methods.indexOf(context.request.method as HttpMethod) === -1) {
                    return next();
                }

                const url = new URL(context.request.url);

                if (origin !== url.origin.toLowerCase()) {
                    return next();
                }

                if (!regexp.test(url.pathname)) {
                    return next();
                }

                context.params = {};

                if (paramNames.length) {
                    const params = url.pathname.match(regexp)!.slice(1);                    

                    params.forEach((value: string, index: number) => {
                        context.params[paramNames[index].name] = value;
                    });
                }

                return Promise.resolve(middleware(context, next));
            });
        });

        return results;
    }

    private validatePaths(paths: string[]) {
        const invalidPaths: string[] = [];

        paths.forEach((path) => {
            if (path[0] !== "/") {
                invalidPaths.push(path);
            } else if (path.length > 1 && path[path.length - 1] === "/") {
                invalidPaths.push(path);
            }
        });

        if (invalidPaths.length) {
            throw new Error(`Path(s) ["${invalidPaths.join("\", \"")}"] do not have a valid format.`);
        }
    }
}
