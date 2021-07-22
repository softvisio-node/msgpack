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
import * as msgpack from "@softvisio/msgpack";

const buffer = msgpack.encode([new Date()]);

const data = msgpack.decode(buffer);

const stream = new msgpack.decode.Stream();

stream.on("data", msg => {});

socket.pipe(stream);
```

### msgpack.encode( data )

-   `data` <any\> Data structire to encode.
-   Returns: <Buffer\> Encoded data.

### msgpack.decode( buffer, stream? )

-   `buffer` <Buffer\> | <ArrayBuffer\> | <Uint8Array\> Data to decode.
-   `stream?` <boolean\> Stream mode flag.
-   Returns: <any\> Decoded data. In `stream` mode returns <Array\>:
    -   <any\> Decoded data.
    -   <integer\> Decoded data offset.

### Class: msgpack.decode.Stream

#### new msgpack.decode.Stream()

-   Returns: <StreamMsgPackDecoder\> Messagepack stream decoder. Instance of the <stream.Transform\>. Stream works in the `object mode`.

## Custom extensions

Specification [https://github.com/msgpack/msgpack/blob/master/spec.md](https://github.com/msgpack/msgpack/blob/master/spec.md).

| Type           | Codes       |
| -------------- | ----------- |
| <undefined\>   | `0xd4 0x00` |
| <ArrayBuffer\> | `0xc7 0x00` |
|                | `0xc8 0x00` |
|                | `0xc9 0x09` |
| <Date\>        | `0xc7 0xff` |
| <BigInt\>      | `0xc7 0x01` |
|                | `0xc8 0x01` |
|                | `0xc9 0x01` |
