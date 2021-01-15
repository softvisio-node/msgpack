# Description

Fork of `notepack.io` with improvements:

-   `BigInt` type support.
-   `Date` encoded with standard msgpack protocol extension.
-   Code optimizations.

## Custom uxtensions used

0xc7 0xff Date

0xc7 0x00 ArrayBuffer
0xc8 0x00 ArrayBuffer
0xc9 0x09 ArrayBuffer

0xc7 0x01 BigInt
0xc8 0x01 BigInt
0xc9 0x01 BigInt

0xd4 0x00 undefined
