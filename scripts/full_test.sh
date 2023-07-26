#!/bin/bash
set -e

bash scripts/build_all.sh
bash scripts/fast_test.sh

