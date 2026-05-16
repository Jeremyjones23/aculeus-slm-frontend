# Aculeus Local Dev Server Runbook

Use the isolated verification paths for product checks. Do not rely on a long-running `localhost:4280` Next dev server for acceptance.

## Preferred Checks

- `npm run build`
- `npm run verify`
- `npm run qa:next-operator`
- `npm run qa`

`verify-next-operator-routes.mjs`, `verify-canonical-run-apis.mjs`, and `verify-next-operator-regression.mjs` prefer isolated `next start` when a production build exists. They use temporary stores for product data, receipts, and training traces.

## Manual Preview

For active development:

```powershell
npm run dev -- -p 4280
```

If `next dev` reports another server for this directory, stop that process before trusting browser output:

```powershell
taskkill /PID <pid> /F
```

For acceptance checks, rebuild and use an isolated production server instead of trusting HMR state.
