#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
clang-15 --target=wasm32 -O3 -ffp-contract=off -nostdlib -Wl,--no-entry -Wl,--export=matrix_multiply -Wl,--export=__heap_base -Wl,--initial-memory=131072 -Wl,--max-memory=16777216 matrix.c -o matrix.wasm
