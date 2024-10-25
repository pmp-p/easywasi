# set this to wherever you have it installed
WASI_SDK_ROOT:=/opt/wasi-sdk

../docs/example.wasm: example.c
	${WASI_SDK_ROOT}/bin/clang -O3 --sysroot=${WASI_SDK_ROOT}/share/wasi-sysroot -o $@ $<
