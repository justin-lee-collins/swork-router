# swork-router

Swork-Router is router middleware for Swork powered by path-to-regexp. It built with TypeScript and async methods.

**License**

MIT

**Installation**

`npm install swork-router`

`yarn add swork-router`

**Example**

```ts
import { Swork } from "swork";
import { Router, RouterContext } from "swork-router";

const app = new Swork();
const router = new Router();

router.get("/hello/:id", (context: RouterContext) => {
    context.response = new Response(`world id: ${context.params.id}`);
});

app.use(router.routes());

app.listen();
```

## Methods

**get | post | put | patch | delete | head | options | all**

Create a route using the HTTP verb as your method name such as `router.get(...)` or `router.post(...)`.  In addition, `all` is available to match on all HTTP verbs.

```ts
router
    .get("/foos", (context: RouterContext) => {
        // ...
    }).post("/foos", (context: RouterContext) => {
        // ...    
    }).put("/foos/:id", (context: RouterContext) => {
        // ...
    }).delete("/foos/:id", (context: RouterContext) => {
        // ...
    }).all("/foos", (context: RouterContext) => {
        // ...
    });
```

Route paths must start with a slash and end with none. Paths are translated to regular expressions using [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). As a result, query strings are not evaluated when matching requests.

**use**

`use` allows the nesting of routers. This is useful when building a router in a separate module.

```ts
const router = new Router({ prefix: "/api" });

router.use(getFooRouter());
router.use(getBarRouter());
```

## Configuration

**Prefix**

Routes can be prefixed at the router level.

```ts
const router = new Router({
    prefix: "/foos"
});

router.get("/", ...); // responds to "/foos"
router.put("/:id", ...); // responds to "/foos/:id"
```

**Origin**

Alternate origins can be used but default to `configuration.origin` from swork.

```ts
const router = new Router({
    origin: "https://www.hello.com"
});

router.get("/world", () => { ... });
```

## Url Parameters

Named route parameters are captured and added to `context.params` property.

```ts
router.put("/:id/:name", (context: RouterContext) => {
    console.log(context.params);
    // => { id: 99, name: "Jane" }
});
```
