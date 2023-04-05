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

# fix the new package json
sed -i '' -e 's/tensorswap-ts/tensorswap-sdk/g' ../tensorswap-sdk/yarn.lock
sed -i '' -e 's/tensorswap-ts/tensorswap-sdk/g' ../tensorswap-sdk/package.json
sed -i '' -e 's/tensorswap.git/tensorswap-sdk.git/g' ../tensorswap-sdk/package.json
sed -i '' -e 's/https:\/\/npm.pkg.github.com/https:\/\/registry.npmjs.org/g' ../tensorswap-sdk/package.json
sed -i '' -e 's/pubpush/npmpublish/g' ../tensorswap-sdk/package.json
sed -i '' -e 's/yarn npm publish && yarn push/npm publish --access public/g' ../tensorswap-sdk/package.json
