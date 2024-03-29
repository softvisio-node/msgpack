function utf8Read ( view, offset, length ) {
    var string = "",
        chr = 0;
    for ( var i = offset, end = offset + length; i < end; i++ ) {
        var byte = view.getUint8( i );
        if ( ( byte & 0x80 ) === 0x00 ) {
            string += String.fromCharCode( byte );
            continue;
        }
        if ( ( byte & 0xe0 ) === 0xc0 ) {
            string += String.fromCharCode( ( ( byte & 0x1f ) << 6 ) | ( view.getUint8( ++i ) & 0x3f ) );
            continue;
        }
        if ( ( byte & 0xf0 ) === 0xe0 ) {
            string += String.fromCharCode( ( ( byte & 0x0f ) << 12 ) | ( ( view.getUint8( ++i ) & 0x3f ) << 6 ) | ( ( view.getUint8( ++i ) & 0x3f ) << 0 ) );
            continue;
        }
        if ( ( byte & 0xf8 ) === 0xf0 ) {
            chr = ( ( byte & 0x07 ) << 18 ) | ( ( view.getUint8( ++i ) & 0x3f ) << 12 ) | ( ( view.getUint8( ++i ) & 0x3f ) << 6 ) | ( ( view.getUint8( ++i ) & 0x3f ) << 0 );
            if ( chr >= 0x010000 ) {

                // surrogate pair
                chr -= 0x010000;
                string += String.fromCharCode( ( chr >>> 10 ) + 0xd800, ( chr & 0x3ff ) + 0xdc00 );
            }
            else {
                string += String.fromCharCode( chr );
            }
            continue;
        }
        throw Error( "Invalid byte " + byte.toString( 16 ) );
    }
    return string;
}

class Decoder {
    constructor ( buffer ) {
        this._offset = 0;
        if ( buffer instanceof ArrayBuffer ) {
            this._buffer = buffer;
            this._view = new DataView( this._buffer );
        }
        else if ( ArrayBuffer.isView( buffer ) ) {
            this._buffer = buffer.buffer;
            this._view = new DataView( this._buffer, buffer.byteOffset, buffer.byteLength );
        }
        else {
            throw Error( "Invalid argument" );
        }
    }

    // protected
    _array ( length ) {
        var value = new Array( length );
        for ( var i = 0; i < length; i++ ) {
            value[ i ] = this._parse();
        }
        return value;
    }

    _map ( length ) {
        var key = "",
            value = {};
        for ( var i = 0; i < length; i++ ) {
            key = this._parse();
            value[ key ] = this._parse();
        }
        return value;
    }

    _str ( length ) {
        var value = utf8Read( this._view, this._offset, length );
        this._offset += length;
        return value;
    }

    _bin ( length ) {
        var value = this._buffer.subarray( this._offset, this._offset + length );
        this._offset += length;
        return value;
    }

    _parse () {
        var prefix = this._view.getUint8( this._offset++ );
        var value,
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
                return this._map( prefix & 0x0f );
            }

            // fixarray
            if ( prefix < 0xa0 ) {
                return this._array( prefix & 0x0f );
            }

            // fixstr
            return this._str( prefix & 0x1f );
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
            length = this._view.getUint8( this._offset );
            this._offset += 1;

            return this._bin( length );
        }
        else if ( prefix === 0xc5 ) {
            length = this._view.getUint16( this._offset );
            this._offset += 2;

            return this._bin( length );
        }
        else if ( prefix === 0xc6 ) {
            length = this._view.getUint32( this._offset );
            this._offset += 4;

            return this._bin( length );
        }

        // ext
        else if ( prefix === 0xc7 ) {
            length = this._view.getUint8( this._offset );
            type = this._view.getInt8( this._offset + 1 );
            this._offset += 2;

            if ( type === -1 ) {
                const date = new Date( this._view.getUint32( this._offset ) / 1000000 + Number( this._view.getBigInt64( this._offset + 4 ) ) * 1000 );

                this._offset += 12;

                return date;
            }

            // BigInt
            else if ( type === 0x01 ) {
                return BigInt( this._str( length ) );
            }

            return [ type, this._bin( length ) ];
        }
        else if ( prefix === 0xc8 ) {
            length = this._view.getUint16( this._offset );
            type = this._view.getInt8( this._offset + 2 );
            this._offset += 3;

            // BigInt
            if ( type === 0x01 ) {
                return BigInt( this._str( length ) );
            }

            return [ type, this._bin( length ) ];
        }
        else if ( prefix === 0xc9 ) {
            length = this._view.getUint32( this._offset );
            type = this._view.getInt8( this._offset + 4 );
            this._offset += 5;

            // BigInt
            if ( type === 0x01 ) {
                return BigInt( this._str( length ) );
            }

            return [ type, this._bin( length ) ];
        }

        // float
        else if ( prefix === 0xca ) {
            value = this._view.getFloat32( this._offset );
            this._offset += 4;

            return value;
        }
        else if ( prefix === 0xcb ) {
            value = this._view.getFloat64( this._offset );
            this._offset += 8;

            return value;
        }

        // uint
        else if ( prefix === 0xcc ) {
            value = this._view.getUint8( this._offset );
            this._offset += 1;

            return value;
        }
        else if ( prefix === 0xcd ) {
            value = this._view.getUint16( this._offset );
            this._offset += 2;

            return value;
        }
        else if ( prefix === 0xce ) {
            value = this._view.getUint32( this._offset );
            this._offset += 4;

            return value;
        }
        else if ( prefix === 0xcf ) {
            hi = this._view.getUint32( this._offset ) * 2 ** 32;
            lo = this._view.getUint32( this._offset + 4 );
            this._offset += 8;

            return hi + lo;
        }

        // int
        else if ( prefix === 0xd0 ) {
            value = this._view.getInt8( this._offset );
            this._offset += 1;

            return value;
        }
        else if ( prefix === 0xd1 ) {
            value = this._view.getInt16( this._offset );
            this._offset += 2;

            return value;
        }
        else if ( prefix === 0xd2 ) {
            value = this._view.getInt32( this._offset );
            this._offset += 4;

            return value;
        }
        else if ( prefix === 0xd3 ) {
            hi = this._view.getInt32( this._offset ) * 2 ** 32;
            lo = this._view.getUint32( this._offset + 4 );
            this._offset += 8;

            return hi + lo;
        }

        // fixext
        else if ( prefix === 0xd4 ) {
            type = this._view.getInt8( this._offset );
            this._offset += 1;
            if ( type === 0x00 ) {
                this._offset += 1;
                return void 0;
            }

            return [ type, this._bin( 1 ) ];
        }
        else if ( prefix === 0xd5 ) {
            type = this._view.getInt8( this._offset );
            this._offset += 1;

            return [ type, this._bin( 2 ) ];
        }
        else if ( prefix === 0xd6 ) {
            type = this._view.getInt8( this._offset );
            this._offset += 1;

            return [ type, this._bin( 4 ) ];
        }
        else if ( prefix === 0xd7 ) {
            type = this._view.getInt8( this._offset );
            this._offset += 1;

            return [ type, this._bin( 8 ) ];
        }
        else if ( prefix === 0xd8 ) {
            type = this._view.getInt8( this._offset );
            this._offset += 1;

            return [ type, this._bin( 16 ) ];
        }

        // str
        else if ( prefix === 0xd9 ) {
            length = this._view.getUint8( this._offset );
            this._offset += 1;

            return this._str( length );
        }
        else if ( prefix === 0xda ) {
            length = this._view.getUint16( this._offset );
            this._offset += 2;

            return this._str( length );
        }
        else if ( prefix === 0xdb ) {
            length = this._view.getUint32( this._offset );
            this._offset += 4;

            return this._str( length );
        }

        // array
        else if ( prefix === 0xdc ) {
            length = this._view.getUint16( this._offset );
            this._offset += 2;

            return this._array( length );
        }
        else if ( prefix === 0xdd ) {
            length = this._view.getUint32( this._offset );
            this._offset += 4;

            return this._array( length );
        }

        // map
        else if ( prefix === 0xde ) {
            length = this._view.getUint16( this._offset );
            this._offset += 2;

            return this._map( length );
        }
        else if ( prefix === 0xdf ) {
            length = this._view.getUint32( this._offset );
            this._offset += 4;

            return this._map( length );
        }

        throw Error( "Could not parse" );
    }
}

export default function decode ( buffer ) {
    const decoder = new Decoder( buffer );

    const value = decoder._parse();

    if ( decoder._offset !== buffer.byteLength ) {
        throw Error( buffer.byteLength - decoder._offset + " trailing bytes" );
    }

    return value;
}

export function decodeStream ( buffer ) {
    return decode( buffer );
}
