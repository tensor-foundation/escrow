#!/bin/bash
set -e

#moving everything into here so that tests dont run if build crashes
rm -rf .anchor
anchor build
bash scripts/cp_idl.sh
anchor test --skip-build