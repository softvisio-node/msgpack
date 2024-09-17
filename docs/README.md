# Introduction

Fork of the `notepack.io` with improvements:

-   Code optimizations.
-   Streaming decoder.
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
```

### msgpack.encode( data, encoding? )

-   `data` <any\> Data structire to encode.
-   `encoding?` <string\> Return string in the specified encoding.
-   Returns: <Buffer\> | <string\> Encoded data. Returns <string\> if `encoding` parameter is provided.

### msgpack.decode( data, encoding? )

-   `data` <Buffer\> | <ArrayBuffer\> | <Uint8Array\> | <string\> Data to decode.
-   `encoding?` <string\> String encoding if `data` parameter is <string\>.
-   Returns: <any\> Decoded data.

### Class: msgpack.decode.Stream

```javascript
const stream = new msgpack.decode.Stream();

stream.on("data", msg => {});

socket.on("error", e => stream.destroy());

socket.pipe(stream);
```

#### new msgpack.decode.Stream()

-   Returns: <msgpack.decode.Stream\> MessagePack stream decoder. Instance of the <stream.Transform\>. Stream works in the `object mode`.

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
