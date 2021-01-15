# Description

Fork of the `notepack.io` with improvements:

-   `BigInt` type support.
-   `Date` encoded with the standard msgpack protocol extension.
-   Code optimizations.

**NOTE**: This package is not fully compatible with the `notepack.io`.

## Custom extensions

[https://github.com/msgpack/msgpack/blob/master/spec.md](https://github.com/msgpack/msgpack/blob/master/spec.md)

### undefined

0xd4 0x00 undefined

### ArrayBuffer

0xc7 0x00 ArrayBuffer
0xc8 0x00 ArrayBuffer
0xc9 0x09 ArrayBuffer

### Date

0xc7 0xff Date

### BigInt

0xc7 0x01 BigInt
0xc8 0x01 BigInt
0xc9 0x01 BigInt
