# WaterCanManagenmentSystem

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Google OAuth setup

The Google client ID in `src/environments/environment.ts` must be a **Web application** OAuth client in the same Google Cloud project where the Google Sheets API is enabled. In Google Cloud Console, add every app origin under **APIs & Services → Credentials → Authorized JavaScript origins**:

- `http://localhost:4200` for local development
- The production app origin, for example `https://your-app.vercel.app`

Use origins only—do not include a page path or a trailing slash. While the OAuth consent screen is in testing, add each operator account as a test user. Each signed-in account also needs edit access to the shared spreadsheet.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
