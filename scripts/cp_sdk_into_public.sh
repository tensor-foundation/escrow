# delete old
rm -rf ../tensorswap-sdk/src
rm ../tensorswap-sdk/package.json
rm ../tensorswap-sdk/yarn.lock
rm ../tensorswap-sdk/tsconfig.json

# add new
cp -r ./src ../tensorswap-sdk/src
cp package.json ../tensorswap-sdk/package.json
cp yarn.lock ../tensorswap-sdk/yarn.lock
cp tsconfig.json ../tensorswap-sdk/tsconfig.json
