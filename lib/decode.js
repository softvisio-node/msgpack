import DecodeKeyCache from "./DecodeKeyCache.js";

const cache = new DecodeKeyCache();

function Decoder ( buffer ) {
    this.offset = 0;
    this.buffer = buffer;
    this.useKeyCache = false;
}

Decoder.prototype.array = function ( length ) {
    const value = new Array( length );
    for ( let i = 0; i < length; i++ ) {
        value[i] = this.parse();
    }
    return value;
};

Decoder.prototype.map = function ( length ) {
    let key = "";
    const value = {};

    for ( let i = 0; i < length; i++ ) {
        this.useKeyCache = true;
        key = this.parse( true );
        this.useKeyCache = false;
        value[key] = this.parse();
    }

    return value;
};

Decoder.prototype.str = function ( length ) {
    if ( this.useKeyCache ) {
        const valueFromCache = cache.get( this.buffer, this.offset, length );
        if ( valueFromCache ) {
            this.offset += length;
            return valueFromCache;
        }
    }
    const value = this.buffer.toString( "utf8", this.offset, this.offset + length );
    if ( this.useKeyCache ) {
        cache.set( this.buffer, this.offset, length, value );
    }
    this.offset += length;
    return value;
};

Decoder.prototype.bin = function ( length ) {
    const value = this.buffer.subarray( this.offset, this.offset + length );
    this.offset += length;
    return value;
};

Decoder.prototype.arraybuffer = function ( length ) {
    const buffer = new ArrayBuffer( length );
    const view = new Uint8Array( buffer );
    for ( let j = 0; j < length; j++ ) {
        view[j] = this.buffer[this.offset + j];
    }
    this.offset += length;
    return buffer;
};

Decoder.prototype.parse = function () {
    const prefix = this.buffer[this.offset++];
    let value,
        length = 0,
        type = 0,
        hi = 0,
        lo = 0;

    if ( prefix < 0xc0 ) {

        // positive fixint
        if ( prefix < 0x80 ) {
            return prefix;
        }

        // fixmap
        if ( prefix < 0x90 ) {
            return this.map( prefix & 0x0f );
        }

        // fixarray
        if ( prefix < 0xa0 ) {
            return this.array( prefix & 0x0f );
        }

        // fixstr
        return this.str( prefix & 0x1f );
    }

    // negative fixint
    if ( prefix > 0xdf ) {
        return ( 0xff - prefix + 1 ) * -1;
    }

    // nil
    if ( prefix === 0xc0 ) {
        return null;
    }

    // false
    else if ( prefix === 0xc2 ) {
        return false;
    }

    // true
    else if ( prefix === 0xc3 ) {
        return true;
    }

    // bin
    else if ( prefix === 0xc4 ) {
        length = this.buffer.readUInt8( this.offset );
        this.offset += 1;

        return this.bin( length );
    }
    else if ( prefix === 0xc5 ) {
        length = this.buffer.readUInt16BE( this.offset );
        this.offset += 2;

        return this.bin( length );
    }
    else if ( prefix === 0xc6 ) {
        length = this.buffer.readUInt32BE( this.offset );
        this.offset += 4;

        return this.bin( length );
    }

    // ext
    else if ( prefix === 0xc7 ) {
        length = this.buffer.readUInt8( this.offset );
        type = this.buffer.readInt8( this.offset + 1 );
        this.offset += 2;

        // Date
        if ( type === -1 ) {
            const date = new Date( this.buffer.readUInt32BE( this.offset ) / 1000000 + Number( this.buffer.readBigInt64BE( this.offset + 4 ) ) * 1000 );

            this.offset += 12;

            return date;
        }

        // ArrayBuffer
        else if ( type === 0 ) {
            return this.arraybuffer( length );
        }

        // BigInt
        else if ( type === 1 ) {
            return BigInt( this.str( length ) );
        }

        return [type, this.bin( length )];
    }
    else if ( prefix === 0xc8 ) {
        length = this.buffer.readUInt16BE( this.offset );
        type = this.buffer.readInt8( this.offset + 2 );
        this.offset += 3;

        // ArrayBuffer
        if ( type === 0 ) {
            return this.arraybuffer( length );
        }

        // bigint
        else if ( type === 1 ) {
            return BigInt( this.str( length ) );
        }

        return [type, this.bin( length )];
    }
    else if ( prefix === 0xc9 ) {
        length = this.buffer.readUInt32BE( this.offset );
        type = this.buffer.readInt8( this.offset + 4 );
        this.offset += 5;

        // ArrayBuffer
        if ( type === 0 ) {
            return this.arraybuffer( length );
        }

        // BigInt
        else if ( type === 1 ) {
            return BigInt( this.str( length ) );
        }

        return [type, this.bin( length )];
    }

    // float
    else if ( prefix === 0xca ) {
        value = this.buffer.readFloatBE( this.offset );
        this.offset += 4;

        return value;
    }
    else if ( prefix === 0xcb ) {
        value = this.buffer.readDoubleBE( this.offset );
        this.offset += 8;

        return value;
    }

    // uint
    else if ( prefix === 0xcc ) {
        value = this.buffer.readUInt8( this.offset );
        this.offset += 1;

        return value;
    }
    else if ( prefix === 0xcd ) {
        value = this.buffer.readUInt16BE( this.offset );
        this.offset += 2;

        return value;
    }
    else if ( prefix === 0xce ) {
        value = this.buffer.readUInt32BE( this.offset );
        this.offset += 4;

        return value;
    }
    else if ( prefix === 0xcf ) {
        hi = this.buffer.readUInt32BE( this.offset ) * 2 ** 32;
        lo = this.buffer.readUInt32BE( this.offset + 4 );
        this.offset += 8;

        return hi + lo;
    }

    // int
    else if ( prefix === 0xd0 ) {
        value = this.buffer.readInt8( this.offset );
        this.offset += 1;

        return value;
    }
    else if ( prefix === 0xd1 ) {
        value = this.buffer.readInt16BE( this.offset );
        this.offset += 2;

        return value;
    }
    else if ( prefix === 0xd2 ) {
        value = this.buffer.readInt32BE( this.offset );
        this.offset += 4;

        return value;
    }
    else if ( prefix === 0xd3 ) {
        hi = this.buffer.readInt32BE( this.offset ) * 2 ** 32;
        lo = this.buffer.readUInt32BE( this.offset + 4 );
        this.offset += 8;

        return hi + lo;
    }

    // fixext
    else if ( prefix === 0xd4 ) {
        type = this.buffer.readInt8( this.offset );
        this.offset += 1;
        if ( type === 0x00 ) {
            this.offset += 1;
            return void 0;
        }

        return [type, this.bin( 1 )];
    }
    else if ( prefix === 0xd5 ) {
        type = this.buffer.readInt8( this.offset );
        this.offset += 1;

        return [type, this.bin( 2 )];
    }
    else if ( prefix === 0xd6 ) {
        type = this.buffer.readInt8( this.offset );
        this.offset += 1;

        return [type, this.bin( 4 )];
    }
    else if ( prefix === 0xd7 ) {
        type = this.buffer.readInt8( this.offset );
        this.offset += 1;

        return [type, this.bin( 8 )];
    }
    else if ( prefix === 0xd8 ) {
        type = this.buffer.readInt8( this.offset );
        this.offset += 1;

        return [type, this.bin( 16 )];
    }

    // str
    else if ( prefix === 0xd9 ) {
        length = this.buffer.readUInt8( this.offset );
        this.offset += 1;

        return this.str( length );
    }
    else if ( prefix === 0xda ) {
        length = this.buffer.readUInt16BE( this.offset );
        this.offset += 2;

        return this.str( length );
    }
    else if ( prefix === 0xdb ) {
        length = this.buffer.readUInt32BE( this.offset );
        this.offset += 4;

        return this.str( length );
    }

    // array
    else if ( prefix === 0xdc ) {
        length = this.buffer.readUInt16BE( this.offset );
        this.offset += 2;

        return this.array( length );
    }
    else if ( prefix === 0xdd ) {
        length = this.buffer.readUInt32BE( this.offset );
        this.offset += 4;

        return this.array( length );
    }

    // map
    else if ( prefix === 0xde ) {
        length = this.buffer.readUInt16BE( this.offset );
        this.offset += 2;

        return this.map( length );
    }
    else if ( prefix === 0xdf ) {
        length = this.buffer.readUInt32BE( this.offset );
        this.offset += 4;

        return this.map( length );
    }

    throw new Error( "Could not parse" );
};

export default function decode ( buffer, { stream } = {} ) {
    if ( buffer instanceof ArrayBuffer || buffer instanceof Uint8Array ) buffer = Buffer.from( buffer );

    const decoder = new Decoder( buffer );

    var value = decoder.parse();

    if ( decoder.offset > buffer.length ) {
        throw Error( `MessagePack data is incomplete` );
    }
    else if ( stream ) {
        return [value, decoder.offset];
    }
    else if ( decoder.offset < buffer.length ) {
        throw Error( `MessagePack data contains extra bytes` );
    }
    else {
        return value;
    }
}
