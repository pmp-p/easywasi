This is an example wasm, made in C, that uses [wasi-sdk](https://github.com/WebAssembly/wasi-sdk).

You should have it installed in `/opt/wasi-sdk`, or edit [Makefile](Makefile).

You don't need to do this (it's already build in `docs/`) but here is how you build it:

```
make
```

All the `fflush(stdout);` calls are to defeat printf-buffering, which can be out-of-order, otherwise.