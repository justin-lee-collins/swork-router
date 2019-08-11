import { Swork } from "swork";
import { FetchContext } from "swork/dist/fetch-context";
import { Router, RouterContext } from "../src/index";
import { getFetchEvent, mockInit } from "./mock-helper";

// tslint:disable-next-line:no-empty
const noopHandler = (): Promise<void> => Promise.resolve();

describe("router tests", () => {
    let middleware: jest.Mock<any, any>;
    let router: Router;

    beforeEach(() => {
        mockInit();
        router = new Router();
        middleware = jest.fn();
    });

    test("basic route hit", () => {
        const routes = router.get("/hello", middleware).routes();

        routes[0](getFetchEvent("http://localhost/hello"), noopHandler);

        expect(middleware).toBeCalledTimes(1);
    });

    test("base route miss - path", () => {
        const routes = router.get("/hello", middleware).routes();

        routes[0](getFetchEvent("http://localhost/hello2"), noopHandler);

        expect(middleware).toBeCalledTimes(0);
    });

    test("base route miss - origin", () => {
        const routes = router.get("/hello", middleware).routes();

        routes[0](getFetchEvent("http://localhost2/hello"), noopHandler);

        expect(middleware).toBeCalledTimes(0);
    });

    test("params end up on context", async (done) => {
        const routes = router.get("/hello/:id/:next", (context: RouterContext) => {
            expect(context.params).toBeTruthy();
            // tslint:disable-next-line:no-string-literal
            expect(context.params["id"]).toBe("12");
            // tslint:disable-next-line:no-string-literal
            expect(context.params["next"]).toBe("another");
        }).routes();

        await routes[0](getFetchEvent("http://localhost/hello/12/another"), noopHandler);

        expect(middleware).toBeCalledTimes(0);

        done();
    });

    test("POST test", () => {
        const routes = router.get("/hello", middleware).post("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "POST");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("HEAD test", () => {
        const routes = router.get("/hello", middleware).head("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "HEAD");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("OPTIONS test", () => {
        const routes = router.get("/hello", middleware).options("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "OPTIONS");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("DELETE test", () => {
        const routes = router.get("/hello", middleware).delete("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "DELETE");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("PUT test", () => {
        const routes = router.get("/hello", middleware).put("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "PUT");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("PATCH test", () => {
        const routes = router.get("/hello", middleware).patch("/hello", middleware).routes();

        const fetchEvent = getFetchEvent("http://localhost/hello", "PATCH");

        routes[0](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(0);

        routes[1](fetchEvent, noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("ALL test", () => {
        const route = router.all("/hello", middleware).routes()[0];

        ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"].forEach((x) => {
            route(getFetchEvent("http://localhost/hello", x), noopHandler);
        });

        expect(middleware).toBeCalledTimes(7);
    });

    test("custom origin", () => {
        router = new Router({ origin: "http://www.example.com" });

        const route = router.get("/hello", middleware).routes()[0];

        route(getFetchEvent("http://localhost/hello"), noopHandler);
        expect(middleware).toBeCalledTimes(0);

        route(getFetchEvent("http://www.example.com/hello"), noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("prefix", () => {

        router = new Router({
            prefix: "/api",
        });

        const route = router.get("/hello", middleware).routes()[0];

        route(getFetchEvent("http://localhost/hello"), noopHandler);
        expect(middleware).toBeCalledTimes(0);

        route(getFetchEvent("http://localhost/api/hello"), noopHandler);
        expect(middleware).toBeCalledTimes(1);
    });

    test("adds to swork", async (done) => {
        const swork = new Swork();

        const routes = router.get("/hello", middleware).routes();

        swork.use(routes);

        const context = new FetchContext(getFetchEvent("http://localhost/hello"));

        // tslint:disable-next-line:no-string-literal
        const delegate = swork["build"]();
        await delegate(context);

        expect(middleware).toBeCalledTimes(1);

        done();
    });

    test("nested router", () => {
        router = new Router({ prefix: "/api" });

        const nestedRouter = new Router();

        nestedRouter.get("/hello", middleware);

        router.use(nestedRouter);

        const route = router.routes()[0];

        route(getFetchEvent("http://localhost/hello"), noopHandler);
        route(getFetchEvent("http://localhost/api/hello"), noopHandler);

        expect(middleware).toBeCalledTimes(1);
    });

    test("routes called twice fails", () => {
        router.routes();

        expect(() => {
            router.routes();
        }).toThrowError("Routes can only be called once.");
    });

    test("validatePath with prefix", () => {
        expect(() => {
            router = new Router({ prefix: "invalidprefix" });
        }).toThrowError();

        expect(() => {
            router = new Router({ prefix: "/invalidprefix/" });
        }).toThrowError();
    });

    test("nested router and middleware combo", () => {
        const swork = new Swork();

        router = new Router({ origin: "http://hello" });

        router.get("/world", middleware);
        
        const nestedRouter = new Router();
        nestedRouter.get("/world2", middleware);

        router.use(nestedRouter);

        swork.use(router.routes());

        // tslint:disable-next-line:no-string-literal
        const delegate = swork["build"]();

        delegate(getFetchEvent("http://hello/world"));
        delegate(getFetchEvent("http://hello/world2"));
        delegate(getFetchEvent("http://hello/world3"));
        
        expect(middleware).toBeCalledTimes(2);
    });
});
