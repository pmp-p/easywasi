# easywasi

A working, zero-dependency browser-shim (and general js engine) for WASI preview1, with lots of filesystem options. It will work in places other than a browser, but that is the primary target. It's easy, light, simple, easy to modify, and should work with any WASI-enabled wasm.

## usage

You can use it without a filesystem, like this:

```js
import WasiPreview1 from 'easywasi'

const wasi_snapshot_preview1 = new WasiPreview1()

const {instance: { exports }} = await WebAssembly.instantiateStreaming(fetch('example.wasm'), {
  wasi_snapshot_preview1,
  // your imports here
})

wasi_snapshot_preview1.setInstance(exports)

if (exports._start) {
  exports._start()
}
```

To really unlock it's power, though, give it an `fs` instance, like from [zen-fs](https://github.com/zen-fs/core). Here is an example that will mount a zip file to /zip, in-memory storage to /tmp, and IndexedDB to /home. Note that / has the default in-memory backend.

```js
import WasiPreview1 from 'easywasi'
import { configure, InMemory } from '@zenfs/core'
import { IndexedDB } from '@zenfs/dom'
import { Zip } from '@zenfs/zip'

const res = await fetch('mydata.zip')
await configure({
  mounts: {
    '/mnt/zip': { backend: Zip, data: await res.arrayBuffer() },
    '/tmp': InMemory,
    '/home': IndexedDB
  }
})

// here, you could use fs.writeFileSync any files you want, as well

const wasi_snapshot_preview1 = new WasiPreview1({fs})

const {instance: { exports }} = await WebAssembly.instantiateStreaming(fetch('example.wasm'), {
  wasi_snapshot_preview1,
  // your imports here
})

wasi_snapshot_preview1.setInstance(exports)

if (exports._start) {
  exports._start()
}
```

Have a look in [example](docs) to see how I fit it all together.


## inspiration

- [this article](https://dev.to/ndesmic/building-a-minimal-wasi-polyfill-for-browsers-4nel) has some nice initial ideas
- [this article](https://twdev.blog/2023/11/wasm_cpp_04/) has some good WASI imeplentations
- [browser-wasi-shim](https://github.com/bjorn3/browser_wasi_shim) is a classic set of examples
