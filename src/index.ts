import * as pathToRegExp from "path-to-regexp";
import { FetchContext, Middleware } from "swork";
import { configuration } from "swork/dist/configuration";

export interface IRouterConfiguration {
    prefix: string;
}

interface IRouterContext {
    params: { [key: string]: string };
} 

// declare module "swork" {
//     // tslint:disable-next-line:interface-name
//     export interface FetchContext {
//         params: { [key: string]: string };
//     }
// }

export type RouterContext = FetchContext & IRouterContext;
export type RouterMiddleware = (context: RouterContext, next: () => Promise<void>) => void | Promise<void>;

type HttpMethod = "HEAD" | "OPTIONS" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

export class Router {
    protected config: IRouterConfiguration;
    protected middlewares: Middleware[] = [];

    constructor(config?: IRouterConfiguration) {
        this.config = Object.assign({
            prefix: "",
        }, config!);
    }

    public head(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["HEAD"], middleware);
        return this;
    }

    public options(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["OPTIONS"], middleware);
        return this;
    }

    public get(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["GET"], middleware);
        return this;
    }

    public post(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["POST"], middleware);
        return this;
    }

    public patch(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["PATCH"], middleware);
        return this;
    }

    public put(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["PUT"], middleware);
        return this;
    }

    public delete(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["DELETE"], middleware);
        return this;
    }

    public all(path: string, middleware: RouterMiddleware): Router {
        this.addMiddleware(path, ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"], middleware);
        return this;
    }

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
