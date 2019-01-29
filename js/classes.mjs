export function random( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}
export class Color {
  constructor( color ) {

    this.txtFormat = ``

    if ( color instanceof Color ) {
      this.r = color.r
      this.g = color.g
      this.b = color.b
    }
    else if ( /#[0-9a-f]{6}/i.test( color ) ) {
      this.r = parseInt( color.slice( 1, 3 ), 16 )
      this.g = parseInt( color.slice( 3, 5 ), 16 )
      this.b = parseInt( color.slice( 5, 7 ), 16 )
    }
    else {
      this.r = random( 0, 255 )
      this.g = random( 0, 255 )
      this.b = random( 0, 255 )
    }

    this.txtFormat = `#${this.r.toString( 16 )}${this.g.toString( 16 )}${this.b.toString( 16 )}`
  }

  [Symbol.toPrimitive]( hint ) {
    if ( hint == 'string' )
      return this.txtFormat
  }
}
class Chessman {
  constructor( x, y, color=`#FFFFFF`, movingTimestamp=1000, type ) {
    this.id = Math.random()
    this.x = x
    this.y = y
    this.color = new Color( color )
    this.movingTimestamp = movingTimestamp
    this.lastJump = 0
    this.type = type
  }

  /** Checker of timestamp from last jum to now
   * @returns {void}
  */
  goodTimestamp() {
    return this.movingTimestamp <= Date.now() - this.lastJump
  }

  /** Check if chessman can jump to `{ x  y }` coorinates
   * @returns {Boolean}
  */
  checkJump( { x, y }, chessboard ) { // Override it for performance
    for ( const availableField of this.availableFields( chessboard ) )
      if ( availableField.x === x && availableField.y === y )
        return true

    return false
  }

  /** Get all chessboard fields wchich can be occupied by chessman
   * @param {Chessboard} chessboard (Chess instance).fields
   * @returns {{ x:Number y:Number }[]} Array of available fields on chessboard
   */
  availableFields( chessboard ) {
    throw `You have to override me!`
  }
}

class Pawn extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `pawn` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []
    const get = chessboard.get
    const push = availableFields.push

    if ( !g( this.x + 1, this.y ) )
      push( { x:(this.x + 1), y:this.y } )

    if ( !g( this.x - 1, y ) )
      push( { x:(this.x - 1), y:this.y } )

    if ( !g( this.x, this.y + 1 ) )
      push( { x:this.x, y:(this.y + 1) } )

    if ( !g( this.x, this.y - 1 ) )
      push( { x:this.x, y:(this.y - 1) } )

    return availableFields
  }

  checkJump( { x, y } ) {
    if ( x == this.x ^ y == this.y && (
      x == this.x + 1 || x == this.x - 1 ||
      y == this.y + 1 || y == this.y - 1 ) )
        return true

    return false
  }
}
class Rook extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `rook` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    return availableFields
  }

  checkJump( { x, y } ) {}
}
class Knight extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `knight` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    return availableFields
  }

  checkJump( { x, y } ) {}
}
class Bishop extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `bishop` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    return availableFields
  }

  checkJump( { x, y } ) {}
}
class King extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `king` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    return availableFields
  }


  checkJump( { x, y } ) {}
}
class Queen extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `queen` )
  }

  checkJump( { x, y } ) {}
}
class God extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `god` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    for ( let y = 0;  y < chessboard.height;  y++ )
      for ( let x = 0;  x < chessboard.width;  x++ )
        if ( !chessboard.fields[ y ][ x ] )
          availableFields.push( { x, y } )

    return availableFields
  }

  checkJump() {
    return this.goodTimestamp()
  }
}

class Player extends God {
  constructor( x, y, color=new Color, movingTimestamp ) {
    super( x, y, color, movingTimestamp )

    this.id = Math.random()
  }
}

export default class Chessboard {
  constructor( width, height, tileSize, fields=[] ) {
    this.width = width
    this.height = height
    this.tileSize = tileSize

    /** @type {Chessman[][]} */
    this.fields = [ ...Array( height ) ].map( () => Array( width ).fill( null ) )

    for ( const field of fields )
      if ( field ) {
        let { x, y, color, type, movingTimestamp } = field
        this.set( type, x, y, color, movingTimestamp )
      }
  }

  get( x, y ) {
    return (this.fields[ y ] || [])[ x ]
  }

  set( type, x, y, color, movingTimestamp ) {
    const field = this.get( x, y )
    const instance = ( () => { switch ( type ) { // `${type.charAt( 0 ).toUpperCase()}${type.slice( 1 ).toLoverCase()}`
      case `pawn`:   return new Pawn(   x, y, color, movingTimestamp )
      case `rook`:   return new Rook(   x, y, color, movingTimestamp )
      case `knight`: return new Knight( x, y, color, movingTimestamp )
      case `bishop`: return new Bishop( x, y, color, movingTimestamp )
      case `king`:   return new King(   x, y, color, movingTimestamp )
      case `queen`:  return new Queen(  x, y, color, movingTimestamp )
      case `god`:    return new God(    x, y, color, movingTimestamp )
      case `player`: return new Player( x, y, color, movingTimestamp )
    } } )()

    if ( field || !instance )
      return null

    this.fields[ y ][ x ] = instance

    return instance
  }

  remove( x, y ) {
    this.fields[ y ][ x ] = null
  }

  checkJump( from, to ) {
    const chessman = this.get( from.x, from.y )
    const nextField = this.get( to.x, to.y )

    if ( !chessman || !chessman.checkJump( to.x, to.y, this ) || nextField === undefined )
      return false

    if ( nextField && `${nextField.color}` == `${chessman.color}` )
      return false

    return true
  }

  move( from, to ) {
    const fields = this.fields

    const chessman = this.get( from.x, from.y )
    const nextField = this.get( to.x, to.y )

    if ( !this.checkJump( from, to ) )
      return false

    if ( nextField && `${nextField.color}` != `${chessman.color}` ) {
      fields[ from.y ][ from.x ] = nextField
      nextField.color = chessman.color
    }
    else
      fields[ from.y ][ from.x ] = null

    fields[ to.y ][ to.x ] = chessman

    return true
  }
}


Chessboard.Pawn   = Pawn
Chessboard.Rook   = Rook
Chessboard.Knight = Knight
Chessboard.Bishop = Bishop
Chessboard.King   = King
Chessboard.Queen  = Queen
Chessboard.God    = God
Chessboard.Player = Player