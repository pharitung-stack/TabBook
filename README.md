# TabBook

A notebook-inspired study scrapbook. This first milestone provides responsive login and registration pages, an account API, and the data models for the next phase.

## Working together

Clone this repository to get your own working copy. Each developer then follows **Run locally** below, starting with `npm ci` to install the exact dependency versions in `package-lock.json`.

Each developer keeps a private local `.env` created from `.env.example`, supplies their own development MongoDB credentials, and runs `npm run auth:secret` to generate their own local signing key. `.env`, dependencies, and build output are excluded from Git. Repository access does not grant Atlas database access; use a separate development database/cluster or a dedicated database user with access only to the intended development database. Each developer's current IP must be allowed in Atlas.

Start a change from an up-to-date main branch:

```sh
git switch main
git pull --ff-only
git switch -c feature/short-description
```

After making changes, run `npm test` and `npm run build`, commit the relevant files, and push the feature branch. Open a pull request for your friend to review before merging into `main`. After a merge, both developers update with `git switch main` and `git pull --ff-only`.

`npm run test:integration` contacts the configured Atlas database and creates/removes only its temporary test accounts. Ordinary `npm test` and `npm run build` do not need Atlas credentials.

## Run locally

Requires Node.js 22.18+ (Node 24 recommended) and MongoDB locally or in Atlas.

```sh
npm install
cp .env.example .env
```

Keep your existing `.env` if you have already created it; do not copy the example over your credentials. Edit `.env` with your own `MONGODB_URI`. For Atlas, choose **Connect → Drivers → Node.js**, copy the connection string, replace its username/password placeholders, and use `TabBook_DB` as the database name. URL-encode special characters in credentials. Allow your current development IP in Atlas Network Access and create a database user restricted to this database. Do not reuse someone else’s class database or credentials.

Set `MONGODB_DB=TabBook_DB` in `.env`, or leave it absent to use the `TabBook_DB` default. This explicitly selects the database even when the Atlas URI ends in `/?...`. It overrides any database name in the URI.

Set up the private server signing key and the database:

```sh
npm run auth:secret
npm run db:setup
npm run dev
```

`auth:secret` generates a cryptographically random key only when `JWT_SECRET` is empty/missing. It writes directly to the root `.env` without printing the key and preserves an existing configured key. `db:setup` creates the four missing collections and their declared indexes; it can be rerun and does not insert sample data or remove existing data. App startup also waits for these collections/indexes before accepting account requests. Refresh Atlas Data Explorer and expand the cluster to see `TabBook_DB`.

If setup reports an unfinished credentials placeholder, edit `MONGODB_URI` locally to replace `<db_password>` (or other username/password placeholders) with the **database user's** credentials, not your Atlas website login. You can reset a database user's password under Atlas Database Access if needed. URL-encode reserved characters in the URI password; keep the resulting URI private. Then rerun `npm run db:setup`.

Open **http://127.0.0.1:5173/login**. The API uses port 3001. Keep `APP_ORIGIN=http://127.0.0.1:5173` for development. Use the exact address rather than `localhost` so cookies and origin checks agree.

Without `.env`, the design still runs; account requests display a setup message. There is no fake login, seeded account, or password saved in browser storage. Registration signs in immediately and opens an intentionally empty bookshelf screen.

## Database architecture

**MongoDB Atlas**, with Express and Mongoose, fits the existing coursework and keeps this first version in JavaScript. It is a recommendation for this project, not a requirement imposed by the hierarchy: PostgreSQL would also model these relationships well.

The Atlas cluster is the hosting container. Inside it use one application database, `TabBook_DB`, containing these four collections. Every document has its own `_id`, `createdAt`, and `updatedAt`.

```text
TabBook cluster
└── TabBook_DB database
    ├── Users
    ├── Books       → owner references Users._id
    ├── Categories  → owner references Users._id; book references Books._id
    └── Tabs        → owner references Users._id; category references Categories._id
```

The hierarchy is one-to-many at each step: a user can own many books; a book can contain many subcategories; a subcategory can contain many tabs.

| Collection | Main fields | Relationship |
| --- | --- | --- |
| `Users` | `name`, unique `email`, hashed `password` | A user owns many books |
| `Books` | `owner`, user-entered `name`, `color` | A book contains many categories |
| `Categories` | `owner`, `book`, user-entered `name` | A category contains many tabs |
| `Tabs` | `owner`, `category`, `title`, `url`, `type`, `notes`, `reviewed` | A tab belongs to one category |

The visible hierarchy is **User → Book → Subcategory → Saved tab**. `Category` is the code name for a book’s subcategory. Names are values in records, never dynamically created database collections. Users choose every book name, section name, and resource themselves; the notebook artwork is illustrative only.

Keep each resource in its own record instead of embedding every tab inside the user. This supports resources growing over time, independent edits, and global searches. MongoDB documents this tradeoff in its [data modeling best practices](https://www.mongodb.com/docs/manual/data-modeling/best-practices/) and [reference modeling guide](https://www.mongodb.com/docs/manual/data-modeling/referencing/).

`Users.password` stores a bcrypt hash, never the original password. Tab `type` is one of `article`, `video`, `documentation`, or `other`; `reviewed` starts as `false`. Titles and notes are text-searchable; URLs must use HTTP or HTTPS. Books and categories have no seeded names. Two people may use the same book/section name, and renaming a record preserves its ID and relationships.

Indexes include unique user email, owner plus creation date on books, owner plus book on categories, owner plus category plus creation date on tabs, and a text index on tab titles/notes. Future global search must combine text matching with the signed-in owner ID. Never load every user's records and filter them only in the browser.

For example, a user could create a book named “Learning Japanese”, a category named “Listening”, and a tab containing a video URL. These are three documents connected by IDs, not three extra MongoDB collections. Only the URL/metadata is saved; videos and article bodies stay on their original websites.

Future collection APIs must always filter by the signed-in user’s `owner` ID. On category creation, check that its book belongs to the same user; on tab creation, check its category. References do not enforce these checks automatically. Plan deletion of related children together, using transactions if needed. The starter includes the schemas and indexes, but library CRUD/search/deletion is **not implemented yet**.

## JWT_SECRET and login tokens

`JWT_SECRET` belongs to the server environment. Generate it once before registration/login is used and keep it stable across restarts. It is not created for each user and is not stored in a user document or exposed to the frontend. Use a separate secret for each deployment environment. Intentionally replacing it invalidates previously issued login tokens.

On registration, the server validates input, hashes the password, saves the user, and signs a JWT. On login, it verifies the password hash and signs a JWT. Tokens contain the user's ID, issue/expiry times, issuer, and audience, and expire after seven days. The browser receives the token through an HttpOnly cookie. For authenticated requests, the server verifies the token's signature/expiry with the same configured secret, then loads the user. A JWT signature prevents undetected changes; it does not encrypt the token's contents. Passwords and the signing secret are never placed in tokens.

See the [JWT library's signing and verification documentation](https://github.com/auth0/node-jsonwebtoken).

## Included in this milestone

- `/login` and `/register`, labeled fields, input validation, password visibility, pending/error states, mobile layout, and a keyboard-accessible guide dialog.
- Registration/login/logout/session restoration, password hashing, rate limits, same-origin JSON mutations, private cookie sessions, and safe API error responses.
- `/books` as a protected welcome/empty state. `/category/:categoryId` is reserved and protected; its category dashboard comes in a later milestone.
- Mongoose models and ownership/search indexes for the planned library.

Email verification, password recovery, OAuth, and book/category/tab management are future work. Email addresses are not verified in this milestone. JWT logout clears the browser cookie; server-side session revocation is not included.

## Project layout

```text
src/pages/AuthPage.vue       Login and registration
src/pages/LibraryPage.vue    Signed-in welcome state
src/components/NotebookArt.vue  CSS notebook illustration
src/stores/auth.js           Pinia account state and API requests
src/style.css               Responsive notebook theme
server/app.js               Express authentication endpoints
server/index.js             App startup
server/database.js          Explicit database selection and model initialization
server/scripts/             Safe secret generation and database setup
server/models/              Users, books, categories, saved tabs
server/tests/auth.test.js    API/session and model validation checks
```

## Validation

```sh
npm test
npm run build
```

`npm test` uses an isolated in-memory repository for HTTP checks and validates model/configuration behavior. It does not contact Atlas.

To verify real registration/login against your configured Atlas database, run:

```sh
npm run test:integration
```

This explicit live test creates two temporary accounts with unique `@example.invalid` addresses, verifies saved password hashes, cookie sessions, session restoration on a fresh app instance, duplicate email protection (including simultaneous requests), login, and logout. Its cleanup removes only those exact test accounts. No real account, book, category, or tab is removed. It uses the configured database, so run it only against your own development deployment.

Collection names are case-sensitive. The models explicitly use `Users`, `Books`, `Categories`, and `Tabs` to match the Atlas setup. Set `MONGODB_DB=TabBook_DB`; app startup creates missing collections/indexes without renaming or deleting existing collections.

## Production build

```sh
npm run build
npm start
```

The Express server serves the built Vue app and API from the same origin. For a public deployment, set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS site origin, a private random `JWT_SECRET`, and `MONGODB_URI`. HTTPS is required for the production session cookie. The server listens on loopback for use behind a reverse proxy; configure host/proxy behavior deliberately for your hosting platform. The default attempt limiter is process-local, so a multiple-instance deployment needs a shared limiter. See [Express production security guidance](https://expressjs.com/en/advanced/best-practice-security/).

## Reused coursework

Adapted the Vue/Pinia login flow and Express/Mongoose user/authentication structure from:

`Desktop/Academic/Year4 T1/WebProgramming/fullstackauth/`

The new project has its own files and configuration. The original coursework is unchanged. Tokens were moved from local storage to HttpOnly cookies; account names are display names rather than unique usernames. No old `.env` files or credentials were copied.

## UI reference for the next milestone

The supplied notebook sketches (IMG_6068.JPG, IMG_6069.JPG, and IMG_6070.JPG) are the reference for later UI work: a bookshelf of named books, a book table of contents for subcategories, page navigation, and a category view that switches between a card grid and a list. Editing includes add/remove resources and a title/link/notes form; the sketches also show home, about, search, settings, and profile controls, plus theme color/font preferences. This authentication milestone does not implement or restyle those screens.
