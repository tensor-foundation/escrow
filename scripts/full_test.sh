#!/bin/bash
set -e

#moving everything into here so that tests dont run if build crashes
rm -rf .anchor
anchor build
./scripts/cp_idl.sh
anchor test --skip-build