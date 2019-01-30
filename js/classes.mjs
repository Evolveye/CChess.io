export function random( min, max ) {
  return Math.floor( Math.random() * (max - min) ) + min
}
export function setTexture( src, chessman ) {
  const c = chessman

  c.tex = new Image
  c.tex.src = `${src[ 0 ]}${c.type.toLowerCase()}${src[ 1 ]}`

  c.setTextureColor = color => {
    const t = c.tex

    let canvas = document.createElement( `canvas` )
    canvas.width = t.width
    canvas.height = t.height

    let ctx = canvas.getContext( `2d` )

    ctx.drawImage( t, 0, 0 )

    let imgData = ctx.getImageData( 0, 0, t.width, t.height )

    for ( let y = 0;  y < imgData.height;  y++ )
      for ( let x = 0;  x < imgData.width * 4;  x += 4  ) {
        const pixelStart = y * imgData.width * 4 + x + 0

        const r = imgData.data[ pixelStart + 0 ]
        const g = imgData.data[ pixelStart + 1 ]
        const b = imgData.data[ pixelStart + 2 ]
        const a = imgData.data[ pixelStart + 3 ] / 255

        if ( r != 0 && g != 0 && b != 0 && a == 1 ) {
          imgData.data[ pixelStart + 0 ] = color.r
          imgData.data[ pixelStart + 1 ] = color.g
          imgData.data[ pixelStart + 2 ] = color.b
        }
      }

    ctx.putImageData( imgData, 0, 0 )

    t.onload = null
    t.src = canvas.toDataURL()
  }

  c.tex.onload = () => c.setTextureColor( c.color )
}

export class Color {
  constructor( color ) {

    this.txtFormat = ``

    if ( color && color.r && color.g && color.b ) {
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

    let formater = colorComponent => {
      let color = this[ colorComponent ].toString( 16 )

      return color.length == 2  ?  color  :  `0${color}`
    }

    this.txtFormat = `#${formater( `r` )}${formater( `g` )}${formater( `b` )}`
  }

  [Symbol.toPrimitive]( hint ) {
    if ( hint == 'string' )
      return this.txtFormat
  }
}
class Chessman {
  constructor( x, y, color, movingTimestamp=1000, type ) {
    this.x = x
    this.y = y
    this.color = new Color( color || `#FFFFFF` )
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

    let cb = chessboard
    let f = availableFields

    if ( !cb.get( this.x + 1, this.y ) )
      f.push( { x:(this.x + 1), y:this.y } )

    if ( !cb.get( this.x - 1, this.y ) )
      f.push( { x:(this.x - 1), y:this.y } )

    if ( !cb.get( this.x, this.y + 1 ) )
      f.push( { x:this.x, y:(this.y + 1) } )

    if ( !cb.get( this.x, this.y - 1 ) )
      f.push( { x:this.x, y:(this.y - 1) } )

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
  constructor( width, height, tileSize, fields=[], isTextured ) {
    this.width = width
    this.height = height
    this.tileSize = tileSize

    /** @type {Chessman[][]} */
    this.fields = [ ...Array( height ) ].map( () => Array( width ).fill( null ) )

    for ( const row of fields )
      for ( const field of row )
        if ( field ) {
          let { x, y, color, type, movingTimestamp } = field
          const entity = this.set( type, x, y, color, movingTimestamp, isTextured )

          if ( `id` in field )
            entity.id = field.id
        }
  }

  get( x, y ) {
    return (this.fields[ y ] || [])[ x ]
  }

  set( type, x, y, color, movingTimestamp, isTextured ) {
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

    if ( isTextured )
      setTexture`../img/${instance}.png`

    this.fields[ y ][ x ] = instance

    return instance
  }

  remove( x, y ) {
    const field = this.fields[ y ][ x ]

    this.fields[ y ][ x ] = null

    return field
  }

  checkJump( from, to ) {
    const chessman = this.get( from.x, from.y )
    const nextField = this.get( to.x, to.y )

    if ( !chessman || !chessman.checkJump( to, this ) || nextField === undefined )
      return false

    if ( nextField && (`${nextField.color}` == `${chessman.color}`) )
      return false

    return true
  }

  move( from, to ) {
    const fields = this.fields

    const chessman = this.get( from.x, from.y )
    const nextField = this.get( to.x, to.y )

    if ( !this.checkJump( from, to ) )
      return false

    if ( nextField && !(`id` in nextField) && `${nextField.color}` != `${chessman.color}` ) {
      fields[ from.y ][ from.x ] = nextField
      nextField.x = from.x
      nextField.y = from.y
      nextField.lastJump = Date.now()
      nextField.color = chessman.color

      if ( `setTextureColor` in nextField )
        nextField.setTextureColor( chessman.color )
    }
    else
      fields[ from.y ][ from.x ] = null

    fields[ to.y ][ to.x ] = chessman
    chessman.x = to.x
    chessman.y = to.y
    chessman.lastJump = Date.now()

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