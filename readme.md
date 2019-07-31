# swork-router

Swork-Router is router middleware for Swork powered by path-to-regexp. It built with TypeScript and async methods.

### Hello World

```ts
import { Swork } from "swork";
import { Router, RouterContext } from "swork-router";

const app = new Swork();
const router = new Router();

router.get("/hello", (context: RouterContext) => {
    context.response = new Response("world!");
});

app.use(router.routes());

app.listen();
```

## Installation

Install via npm:

```ts
npm install swork-router
```

Install via yarn:

```ts
yarn add swork-router
```

## Verb

Create a route using `router.verb()` method where verb is one of the HTTP verbs such as `get` or `post`. Alternatively, `all` is available to match on all HTTP verbs.

```ts
router
    .get("/foos", (context: RouterContext, next: () => Promise<void>) => {
        // ...
    }).post("/foos", (context: RouterContext, next: () => Promise<void>) => {
        // ...    
    }).put("/foos/:id", (context: RouterContext, next: () => Promise<void>) => {
        // ...
    }).delete("/foos/:id", (context: RouterContext, next: () => Promise<void>) => {
        // ...
    });
```

Route paths are translated to regular expressions using `path-to-regexp`.

Query strings are not evaluated when matching requests.

## Origins

Alternate origins can be used but default to the location of the service worker.

```ts
// Same location origin
router.get("/foos", ...);

// External origin
router.get("http://www.example.com/foos", ...);
```

## Prefix

Routes can be prefixed at the router level.

```ts
const router = new Router({
    prefix: "/foos"
});

router.get("/", ...); // responds to "/foos"
router.put("/:id", ...); // responds to "/foos/:id"

```

## Url Parameters

Named route parameters are captured and added to `context.params` property.

```ts
router.put("/:id/:name", (context: RouterContext) => {
    console.log(context.params);
    // => { id: 99, name: "Jane" }
});
```
