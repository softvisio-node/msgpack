const DEFAULT_MAX_SIZE = 1024,
    DEFAULT_MAX_LENGTH = 16;

export default class DecodeKeyCache {
    size = 0;

    constructor ( { maxSize = DEFAULT_MAX_SIZE, maxLength = DEFAULT_MAX_LENGTH } = {} ) {
        this.maxSize = maxSize;
        this.maxLength = maxLength;
        this.cache = new Map();
        for ( let i = 1; i <= this.maxLength; i++ ) {
            this.cache.set( i, new Map() );
        }
    }

    // public
    get ( buffer, offset, length ) {
        if ( length > this.maxLength ) {
            return false;
        }
        let node = this.cache.get( length );
        for ( let i = 0; i < length; i++ ) {
            const byte = buffer[ offset + i ];
            if ( node.has( byte ) ) {
                node = node.get( byte );
            }
            else {
                return false;
            }
        }
        return node;
    }

    set ( buffer, offset, length, value ) {
        if ( length > this.maxLength || this.size >= this.maxSize ) {
            return;
        }
        this.size++;
        let node = this.cache.get( length );
        for ( let i = 0; i < length; i++ ) {
            const byte = buffer[ offset + i ];
            if ( i === length - 1 ) {
                node.set( byte, value );
            }
            else if ( node.has( byte ) ) {
                node = node.get( byte );
            }
            else {
                const newNode = new Map();
                node.set( byte, newNode );
                node = newNode;
            }
        }
    }
}
