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
    prefix: string;
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

/**
 * Router intended to be used with swork. Allows definition of paths and middleware to handle matching requests.
 *
 * @export
 * @class Router
 */
export class Router {
    protected config: IRouterConfiguration;
    protected middlewares: Middleware[] = [];

    /**
     * Creates an instance of Router.
     * @param {IRouterConfiguration} [config]
     * @memberof Router
     */
    constructor(config?: IRouterConfiguration) {
        this.config = Object.assign({
            prefix: "",
        }, config!);
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
        this.addMiddleware(path, ["HEAD"], middleware);
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
        this.addMiddleware(path, ["OPTIONS"], middleware);
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
        this.addMiddleware(path, ["GET"], middleware);
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
        this.addMiddleware(path, ["POST"], middleware);
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
        this.addMiddleware(path, ["PATCH"], middleware);
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
        this.addMiddleware(path, ["PUT"], middleware);
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
        this.addMiddleware(path, ["DELETE"], middleware);
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
        this.addMiddleware(path, ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"], middleware);
        return this;
    }

    /**
     * Builds the middlewares from the router to be used by swork.
     *
     * @returns {Middleware[]}
     * @memberof Router
     */
    public routes(): Middleware[] {
        return this.middlewares;
    }

    private addMiddleware(path: string, method: HttpMethod[], middleware: RouterMiddleware): void {
        const paramNames: pathToRegExp.Key[] = [];

        let origin = "";

        if (!path.toLowerCase().startsWith("http://") && !path.toLowerCase().startsWith("https://")) {
            origin = configuration.origin;
        } else {
            const url = new URL(path);

            origin = url.origin;
            path = url.pathname;
        }

        origin = origin.toLowerCase();

        if (this.config.prefix) {
            path = this.config.prefix + path;
        }

        const regexp = pathToRegExp(path, paramNames);

        this.middlewares.push((context: FetchContext, next: () => Promise<void>): Promise<void> => {
            const routerContext = context as RouterContext;

            if (method.indexOf(routerContext.request.method as HttpMethod) === -1) {
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
        });
    }
}
