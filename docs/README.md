# Introduction

Fork of the `notepack.io` with improvements:

-   Code optimizations
-   <Date\> encoded with the standard msgpack protocol extension (breaking change).
-   <BigInt\> type support.

## Install

```shell
npm i @softvisio/msgpack
```

## Usage

```javascript
import { encode, decode } from "@softvisio/msgpack";

const buffer = encode([new Date()]);

const data = decode(buffer);

const stream = MSGPACK.decode.pipe(socket);

stream.on("data", msg => {});
```

### encode( data )

-   `data` <any\> Data structire to encode.
-   Returns: <Buffer\> Encoded data.

### decode( buffer, stream? )

-   `buffer` <Buffer\> | <ArrayBuffer\> | <Uint8Array\> Data to decode.
-   `stream?` <boolean\> Stream mode flag.
-   Returns: <any\> Decoded data. In `stream` mode returns <Array\>:
    -   <any\> Decoded data.
    -   <integer\> Decoded data offset.
