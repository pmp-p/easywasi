import * as defs from './defs.js'

class WASIProcExit extends Error {}

function getFunctionsNameThatCalledThisFunction () {
  const e = new Error('dummy')
  const stack = e.stack
    .split('\n')[2]
  // " at functionName ( ..." => "functionName"
    .replace(/^\s+at\s+(.+?)\s.+/g, '$1')
  return stack
}

export class WasiPreview1 {
  constructor (options = {}) {
    this.args = options.args || []
    this.env = options.env || {}
    this.fs = options.fs

    this.fds = [undefined, undefined]

    this.textDecoder = new TextDecoder()
    this.textEncoder = new TextEncoder()

    // force wasi function to use this
    this.args_get = this.args_get.bind(this)
    this.args_sizes_get = this.args_sizes_get.bind(this)
    this.environ_get = this.environ_get.bind(this)
    this.environ_sizes_get = this.environ_sizes_get.bind(this)
    this.clock_res_get = this.clock_res_get.bind(this)
    this.clock_time_get = this.clock_time_get.bind(this)
    this.fd_advise = this.fd_advise.bind(this)
    this.fd_allocate = this.fd_allocate.bind(this)
    this.fd_datasync = this.fd_datasync.bind(this)
    this.fd_fdstat_set_flags = this.fd_fdstat_set_flags.bind(this)
    this.fd_fdstat_set_rights = this.fd_fdstat_set_rights.bind(this)
    this.fd_filestat_get = this.fd_filestat_get.bind(this)
    this.fd_filestat_set_size = this.fd_filestat_set_size.bind(this)
    this.fd_filestat_set_times = this.fd_filestat_set_times.bind(this)
    this.fd_pread = this.fd_pread.bind(this)
    this.fd_prestat_get = this.fd_prestat_get.bind(this)
    this.fd_prestat_dir_name = this.fd_prestat_dir_name.bind(this)
    this.fd_pwrite = this.fd_pwrite.bind(this)
    this.fd_read = this.fd_read.bind(this)
    this.fd_readdir = this.fd_readdir.bind(this)
    this.fd_renumber = this.fd_renumber.bind(this)
    this.fd_sync = this.fd_sync.bind(this)
    this.fd_tell = this.fd_tell.bind(this)
    this.fd_close = this.fd_close.bind(this)
    this.fd_fdstat_get = this.fd_fdstat_get.bind(this)
    this.fd_seek = this.fd_seek.bind(this)
    this.path_create_directory = this.path_create_directory.bind(this)
    this.path_filestat_get = this.path_filestat_get.bind(this)
    this.path_filestat_set_times = this.path_filestat_set_times.bind(this)
    this.path_link = this.path_link.bind(this)
    this.path_open = this.path_open.bind(this)
    this.path_readlink = this.path_readlink.bind(this)
    this.path_remove_directory = this.path_remove_directory.bind(this)
    this.path_rename = this.path_rename.bind(this)
    this.path_symlink = this.path_symlink.bind(this)
    this.path_unlink_file = this.path_unlink_file.bind(this)
    this.poll_oneoff = this.poll_oneoff.bind(this)
    this.proc_exit = this.proc_exit.bind(this)
    this.sched_yield = this.sched_yield.bind(this)
    this.random_get = this.random_get.bind(this)
    this.sock_accept = this.sock_accept.bind(this)
    this.sock_recv = this.sock_recv.bind(this)
    this.sock_send = this.sock_send.bind(this)
    this.sock_shutdown = this.sock_shutdown.bind(this)
    this.fd_write = this.fd_write.bind(this)
  }

  // start a WASI wams
  start (wasm) {
    this.setup(wasm)
    try {
      if (wasm._start) {
        wasm._start()
      }
      return 0
    } catch (e) {
      if (e instanceof WASIProcExit) {
        return e.code
      } else {
        throw e
      }
    }
  }

  // just set it up, but don't run it
  setup (wasm) {
    this.wasm = wasm
    this.view = new DataView(wasm.memory.buffer)
    this.mem = new Uint8Array(wasm.memory.buffer)
  }

  // handle stdout messages, override if you wanna do it some other way
  stdout (buffer) {
    const t = this.textDecoder.decode(buffer).replace(/\n$/g, '')
    if (t) {
      console.info(t)
    }
  }

  // handle stderr messages, override if you wanna do it some other way
  stderr (buffer) {
    const t = this.textDecoder.decode(buffer).replace(/\n$/g, '')
    if (t) {
      console.warn(t)
    }
  }

  args_get (argvP, argvBufP) {
    for (const arg of this.args) {
      this.view.setUint32(argvP, argvBufP, true)
      argvP += 4
      const argEncd = new TextEncoder().encode(arg)
      this.mem.set(argEncd, argvBufP)
      this.view.setUint8(argvBufP + arg.length, 0)
      argvBufP += arg.length + 1
    }
    return defs.ERRNO_SUCCESS
  }

  args_sizes_get (argsP, argsLenP) {
    this.view.setUint32(argsP, this.args.length, true)
    let argsTotalLen = 0
    for (const arg of this.args) {
      argsTotalLen += arg.length + 1
    }
    this.view.setUint32(argsLenP, argsTotalLen, true)
    return defs.ERRNO_SUCCESS
  }

  environ_get (environ, environBuf) {
    for (const k of Object.keys(this.env)) {
      this.view.setUint32(environ, environBuf, true)
      environ += 4
      const e = this.textEncoder.encode(`${k}=${this.env[k]}\0`)
      this.mem.set(e, environBuf)
      environBuf += e.length
    }
    return defs.ERRNO_SUCCESS
  }

  environ_sizes_get (environCount, environSize) {
    this.view.setUint32(environCount, Object.keys(this.env).length, true)
    let bufSize = 0
    for (const k of Object.keys(this.env)) {
      bufSize += `${k}=${this.env[k]}\0`.length
    }
    this.view.setUint32(environSize, bufSize, true)
    return defs.ERRNO_SUCCESS
  }

  clock_res_get (id, resP) {
    let resolutionValue
    switch (id) {
      case defs.CLOCKID_MONOTONIC: {
        // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
        // > Resolution in isolated contexts: 5 microseconds
        resolutionValue = 5_000n // 5 microseconds
        break
      }
      case defs.CLOCKID_REALTIME: {
        resolutionValue = 1_000_000n // 1 millisecond?
        break
      }
      default:
        return defs.ERRNO_NOSYS
    }
    this.view.setBigUint64(resP, resolutionValue, true)
    return defs.ERRNO_SUCCESS
  }

  clock_time_get (id, precision, time) {
    if (id === defs.CLOCKID_REALTIME) {
      this.view.setBigUint64(
        time,
        BigInt(new Date().getTime()) * 1_000_000n,
        true
      )
    } else if (id === defs.CLOCKID_MONOTONIC) {
      let monotonicTime
      try {
        monotonicTime = BigInt(Math.round(performance.now())) * 1_000_000n
      } catch (e) {
        monotonicTime = 0n
      }
      this.view.setBigUint64(time, monotonicTime, true)
    } else {
      // TODO
      this.view.setBigUint64(time, 0n, true)
    }
    return 0
  }

  fd_advise (fd, offset, len, advice) {
    return this.fds[fd] !== undefined ? defs.ERRNO_SUCCESS : defs.ERRNO_BADF
  }

  fd_allocate (fd, offset, len) {
    if (this.fds[fd] !== undefined) {
      // TODO: allocate file
      return defs.ERRNO_SUCCESS
    } else {
      return defs.ERRNO_BADF
    }
  }

  fd_datasync () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_fdstat_set_flags () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_fdstat_set_rights () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_filestat_get () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_filestat_set_size () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_filestat_set_times () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_pread () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_prestat_get () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_prestat_dir_name () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_pwrite () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_read (fd, iovs) {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_readdir () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_renumber () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_sync () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_tell () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  fd_close () {
    return defs.ERRNO_SUCCESS
  }

  fd_fdstat_get (fd, fdstatP) {
    if (fd < 1 || fd > 2) {
      throw new Error('Unsupported file descriptor')
    }
    return defs.ERRNO_SUCCESS
  }

  fd_seek (fd, offset, whence, offsetOutPtr) {
    return defs.ERRNO_SUCCESS
  }

  path_create_directory (fd, pathP, pathLen) {
    if (this.fds[fd] !== undefined) {
      const path = this.textDecoder.decode(
        this.mem.slice(pathP, pathP + pathLen)
      )
      // TODO: create directory
      console.log(`path_create_directory: ${path}`)
      return defs.ERRNO_SUCCESS
    } else {
      return defs.ERRNO_BADF
    }
  }

  path_filestat_get (fd, flags, pathP, pathLen, filestatP) {
    if (this.fds[fd] !== undefined) {
      const path = this.textDecoder.decode(
        this.mem.slice(pathP, pathP + pathLen)
      )
      // TODO: get filestate
      console.log(`path_filestat_get: ${path}`)
      return defs.ERRNO_SUCCESS
    } else {
      return defs.ERRNO_BADF
    }
  }

  path_filestat_set_times () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_link () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_open () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_readlink () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_remove_directory () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_rename () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_symlink () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  path_unlink_file () {
    console.log(getFunctionsNameThatCalledThisFunction(), arguments)
  }

  poll_oneoff (in_, out, nsubscriptions) {
    throw new Error('async io not supported')
  }

  proc_exit (exitCode) {
    const e = new WASIProcExit(`Exit status: ${exitCode}`)
    e.code = exitCode
    throw e
  }

  sched_yield () {}

  random_get (buf, bufLen) {
    const buffer8 = this.mem.subarray(buf, buf + bufLen)
    for (let i = 0; i < bufLen; i++) {
      buffer8[i] = (Math.random() * 256) | 0
    }
  }

  sock_accept (fd, flags) {
    throw new Error('Network sockets not supported')
  }

  sock_recv (fd, riData, riFlags) {
    throw new Error('Network sockets not supported')
  }

  sock_send (fd, siData, riFlags) {
    throw new Error('Network sockets not supported')
  }

  sock_shutdown (fd, how) {
    throw new Error('Network sockets not supported')
  }

  fd_write (fd, iovsPtr, iovsLength, bytesWrittenPtr) {
    const iovs = new Uint32Array(
      this.wasm.memory.buffer,
      iovsPtr,
      iovsLength * 2
    )
    // TODO: which is faster? make a Uint8Array out of an array (like I do here) or merge multiple ArrayBuffers, or soemthing else?
    const out = []
    for (let i = 0; i < iovsLength * 2; i += 2) {
      const offsetWasm = iovs[i]
      const length = iovs[i + 1]
      out.push(...this.mem.slice(offsetWasm, offsetWasm + length))
    }
    const bytes = new Uint8Array(out)
    this.view.setInt32(bytesWrittenPtr, bytes.byteLength, true)

    if (fd === 1) {
      this.stdout(bytes)
    } else if (fd === 2) {
      this.stderr(bytes)
    } else {
      console.log('fd_write:', fd)
    }
    return defs.ERRNO_SUCCESS
  }
}
export default WasiPreview1
