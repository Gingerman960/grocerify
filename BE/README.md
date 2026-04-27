# grocerify-be

Mock REST API for the Grocerify POC, backed by [json-server](https://github.com/typicode/json-server).
Runs on **port 3001**. The Angular app in `../FE/` reads from `http://localhost:3001/items`.

## Run

```bash
cd BE
npm install   # one-time
npm start     # json-server --watch db/db.json --port 3001
```

The server will print all available routes when it starts. Edits to `db/db.json` are hot-reloaded; mutations through the API are persisted back to the file.

## Schema

`GroceryItem` (resource path: `/items`):

| Field    | Type     | Notes                                                        |
|----------|----------|--------------------------------------------------------------|
| `id`     | string   | Generated client-side via `crypto.randomUUID()`              |
| `name`   | string   | Item name, required                                          |
| `amount` | string   | Free-form ("2 pcs", "500 g", "1 L"); optional, may be empty  |
| `bought` | boolean  |                                                              |
| `order`  | number   | Fractional order key, midpoint between neighbours on reorder |

Seed data: a handful of `seed-*` items with `order` spaced by 1000. The current contents of `db/db.json` are whatever the last interaction (manual or e2e) left behind — see [Reset](#reset).

## Endpoints

| Method | Path           | Body              | Response          |
|--------|----------------|-------------------|-------------------|
| GET    | `/items`       | —                 | `GroceryItem[]`   |
| POST   | `/items`       | `GroceryItem`     | `GroceryItem`     |
| PATCH  | `/items/:id`   | `Partial<GroceryItem>` | `GroceryItem` |
| DELETE | `/items/:id`   | —                 | `{}`              |

## <a id="reset"></a>Reset

`db/db.json` is the live store — both the running app and the FE Playwright suite mutate it. To restore seed data, restore the file from git:

```bash
git checkout BE/db/db.json
```

The FE e2e fixture overwrites this file directly (not via the API) before each spec, so after a Playwright run it will contain the e2e seed (`e2e-01` … `e2e-05`) rather than the dev seed.
