# tensorswap

Remember to add Github PAT with read:packages permission to `GH_AUTH_TOKEN` envvar!

## tensorswap-sdk

Copy JUST the following over:
```
package.json
tsconfig.json
yarn.lock
src/
```

Also remove `@tensor-hq/tensor-common` from the package.json (and reinstall for yarn.lock).
