# swork-router

[![npm](https://img.shields.io/npm/v/swork-router)](https://www.npmjs.com/package/swork-router) [![travis ci](https://travis-ci.org/justin-lee-collins/swork-router.svg?branch=master)](https://travis-ci.org/justin-lee-collins/swork-router.svg?branch=master) [![coverage](https://img.shields.io/coveralls/github/justin-lee-collins/swork-router)](https://img.shields.io/coveralls/github/justin-lee-collins/swork-router) [![download](https://img.shields.io/npm/dw/swork-router)](https://img.shields.io/npm/dw/swork-router) [![Greenkeeper badge](https://badges.greenkeeper.io/justin-lee-collins/swork-router.svg)](https://greenkeeper.io/)

swork-router is router middleware for [swork](https://www.npmjs.com/package/swork) powered by [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). It is built with TypeScript and async methods.

**License** 

MIT

**Installation**

`npm install swork-router`

`yarn add swork-router`

**Example**

```ts
import { Swork, FetchContext } from "swork";
import { Router } from "swork-router";

const app = new Swork();
const router = new Router();

router.get("/hello/:id", (context: FetchContext) => {
    context.response = new Response(`world id: ${context.params.id}`);
});

app.use(router.routes());

app.listen();
```

## Methods

**get | post | put | patch | delete | head | options | all**

Create a route using the HTTP verb as your method name such as `router.get(...)` or `router.post(...)`. In addition, `all` is available to match on all HTTP verbs.

```ts
router.get("/foos", async (context: FetchContext, next: () => Promise<void>) => {
    // manipulate request
    const response = await next();
    // manipulate or cache response
    context.response = response;
});
```

You are able to pass in a single path or an array of paths with the middleware to be invoked when a path is matched.

```ts
router.get(["/foos", "/foos/:id"], (context) => {...});
```

Every verb method returns the router instance allowing chaining of path handlers.

```ts
router
    .get("/foos", (context) => {...})
    .post("/foos", (context) => {...})
    .all("/foos/:id", (context) => {...});
```

Route paths must start with a slash and end without one. Paths are translated to regular expressions using [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). As a result, query strings are *not* evaluated when matching requests.

**use**

`use` allows the nesting of routers. This is useful when building a routes in a separate module.

```ts
const router = new Router({ prefix: "/api" });

router.use(getFooApiRouter());
router.use(getBarApiRouter());

app.use(router.routes());
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
router.put("/:id/:name", (context: FetchContext) => {
    console.log(context.params);
    // => { id: 99, name: "Jane" }
});
```

## Contact

If you are using [swork](https://www.npmjs.com/package/swork) or any of its related middlewares, please let me know on [gitter](https://gitter.im/swork-chat/community). I am always looking for feedback or additional middleware ideas.
