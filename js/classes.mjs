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

    if ( color && typeof color != `string` && `r` in color && `g` in color && `b` in color ) {
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

  static isEqual( entityA, entityB ) {
    if ( !entityA || !entityB )
      return false

    const getColorData = entity => {
      if ( typeof entity == `string` )
        return `${entity}`
      if ( `txtFormat` in entity )
        return entity.txtFormat
      if ( `color` in entity )
        return entity.color.txtFormat
    }

    return `${getColorData( entityA )}` == `${getColorData( entityB )}`
  }
}
class Chessman {
  constructor( x, y, color, movingTimestamp=1000, type ) {
    this.x = x
    this.y = y
    this.color = new Color( color || `#ffffff` )
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

  /** Check if chessman can jump to `{ x  y }` coorinates (without test field/entity existing)
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

  static movingLoopLogic( data, chessboard, chessman, x, y ) {
    if ( chessboard.isABeatableField( chessman.x + x, chessman.y + y, chessman ) )
      data.fields.push( { x:(chessman.x + x), y:(chessman.y + y) } )

    if ( chessboard.get( chessman.x + x, chessman.y + y ) )
      data.wall = true

  }

  static moveAlongTheAxis( chessboard, chessman ) {
    const data = { wall:false, fields:[] }
    const { width, height } = chessboard
    const { x, y } = chessman

    for ( let left = -1;  left + x >= 0 && !data.wall;  left-- )
      this.movingLoopLogic( data, chessboard, chessman, left, 0 )

    data.wall = false
    for ( let right = 1;  right + x < width && !data.wall;  right++ )
      this.movingLoopLogic( data, chessboard, chessman, right, 0 )

    data.wall = false
    for ( let top = -1;  top + y >= 0 && !data.wall;  top-- )
      this.movingLoopLogic( data, chessboard, chessman, 0, top )

    data.wall = false
    for ( let bottom = 1;  bottom + y < height && !data.wall;  bottom++ )
      this.movingLoopLogic( data, chessboard, chessman, 0, bottom )

    return data.fields
  }

  static moveDiagonally( chessboard, chessman ) {
    const data = { wall:false, fields:[] }
    const { width, height } = chessboard

    for ( let rb = 1;  chessman.x + rb < width && chessman.y + rb < height && !data.wall;  rb++ )
      this.movingLoopLogic( data, chessboard, chessman, rb, rb )

    data.wall = false
    for ( let rt = 1;  chessman.x + rt < width && chessman.y - rt >= 0 && !data.wall;  rt++ )
      this.movingLoopLogic( data, chessboard, chessman, rt, -rt )

    data.wall = false
    for ( let lt = 1;  chessman.x - lt >= 0 && chessman.y - lt >= 0 && !data.wall;  lt++ )
      this.movingLoopLogic( data, chessboard, chessman, -lt, -lt )

    data.wall = false
    for ( let lb = 1;  chessman.x - lb >= 0 && chessman.y + lb < height && !data.wall;  lb++ )
      this.movingLoopLogic( data, chessboard, chessman, -lb, lb )

    return data.fields
  }
}

class Pawn extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `pawn` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []
    const cb = chessboard

    for ( let y = -1;  y < 2;  y++ )
      for ( let x = -1;  x < 2;  x++ )
        if ( cb.isABeatableField( this.x + x, this.y + y, this ) ) {
          const field = cb.get( this.x + x, this.y + y )

          if ( x ** 2 == 1 && y ** 2 == 1  ) {
            if ( field )
              availableFields.push( { x:(this.x + x), y:(this.y + y) } )
          }
          else if ( !field )
            availableFields.push( { x:(this.x + x), y:(this.y + y) } )
        }

    return availableFields
  }

  checkJump( { x, y }, chessboard ) {
    if ( (this.x - x) ** 2 <= 1 && (this.y - y) ** 2 <= 2 ) {
      const entity = chessboard.get( x, y )

      if ( this.x != x ^ this.y != y )
        return !entity

      return !!entity
    }

    return false
  }
}
class Rook extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `rook` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    return Chessman.moveAlongTheAxis( chessboard, this )
  }

  checkJump( { x, y }, chessboard ) {
    if ( x == this.x ^ y == this.y ) {
      let addToX = 0
      let addToY = 0

      if ( this.x != x )
        addToX = this.x > x  ?  1  : -1
      if ( this.y != y )
        addToY = this.y > y  ?  1  : -1

      while ( x != this.x || y != this.y ) {
        x += addToX
        y += addToY

        if ( chessboard.get( x, y ) && (x != this.x || y != this.y) )
          return false
      }

      return true
    }

    return false
  }
}
class Knight extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `knight` )
  }

  /** @param {Chessboard} chessboard */
  availableFields( chessboard ) {
    const availableFields = []
    const cb = chessboard

    for ( let reverserY = -1;  reverserY < 2;  reverserY += 2 )
      for ( let reverserX = -1;  reverserX < 2;  reverserX += 2 ) {
        if ( cb.isABeatableField( this.x + 1 * reverserX, this.y + 2 * reverserY, this ) )
          availableFields.push( { x:(this.x + 1 * reverserX), y:(this.y + 2 * reverserY) } )

        if ( cb.isABeatableField( this.x + 2 * reverserX, this.y + 1 * reverserY, this ) )
          availableFields.push( { x:(this.x + 2 * reverserX), y:(this.y + 1 * reverserY) } )
      }

    return availableFields
  }

  checkJump( { x, y } ) {
    x = Math.abs( this.x - x )
    y = Math.abs( this.y - y )

    if ( x == 1 )
      return y == 2
    else if ( y == 1 )
      return x == 2

    return false
  }
}
class Bishop extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `bishop` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    return Chessman.moveDiagonally( chessboard, this )
  }

  checkJump( { x, y }, chessboard ) {
    if ( this.x != x && this.y != y && Math.abs(this.x - x) == Math.abs(this.y - y) ) {
      const addToX = this.x > x  ?  1  : -1
      const addToY = this.y > y  ?  1  : -1

      while ( x != this.x ) {
        x += addToX
        y += addToY

        if ( x != this.x && chessboard.get( x, y ) )
          return false
      }

      return true
    }

    return false
  }
}
class Queen extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `queen` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    return [
      ...Chessman.moveDiagonally(   chessboard, this ),
      ...Chessman.moveAlongTheAxis( chessboard, this )
    ]
  }

  checkJump( { x, y }, chessboard ) {
    let addToX = 0
    let addToY = 0

    if ( x == this.x ^ y == this.y ) {
      if ( this.x != x )
        addToX = this.x > x  ?  1  : -1
      else if ( this.y != y )
        addToY = this.y > y  ?  1  : -1
    }
    else if ( this.x != x && this.y != y && Math.abs(this.x - x) == Math.abs(this.y - y) ) {
      addToX = this.x > x  ?  1  : -1
      addToY = this.y > y  ?  1  : -1
    }
    else
      return false

    while ( x != this.x || y != this.y ) {
      x += addToX
      y += addToY

      if ( chessboard.get( x, y ) && (x != this.x || y != this.y) )
        return false
    }

    return true
  }
}
class King extends Chessman {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `king` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    let cb = chessboard
    let f = availableFields

    for ( let y = -1;  y < 2;  y++ )
      for ( let x = -1;  x < 2;  x++ )
        if ( cb.isABeatableField( this.x + x, this.y + y, this ) )
          f.push( { x:(this.x + x), y:(this.y + y) } )

    return availableFields
  }

  checkJump( { x, y } ) {
    return (this.x != x || this.y != y) && Math.abs(this.x - x) <= 1 && Math.abs(this.y - y) <= 1
  }
}
class God extends King {
  constructor( x, y, color, movingTimestamp ) {
    super( x, y, color, movingTimestamp, `god` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []

    for ( let y = 0;  y < chessboard.height;  y++ )
      for ( let x = 0;  x < chessboard.width;  x++ )
        if ( chessboard.isABeatableField( x, y, this ) )
          availableFields.push( { x, y } )

    return availableFields
  }

  checkJump() {
    return this.x != x || this.y != y
  }
}

class Player extends King {
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
        if ( field )
          this.set( field, isTextured )
  }

  get( x, y ) {
    return (this.fields[ y ] || [])[ x ]
  }

  set( entity, isTextured ) {
    const { type, x, y, color, movingTimestamp } = entity
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

    if ( `id` in entity )
      instance.id = entity.id
    if ( `nickname` in entity )
      instance.nickname = entity.nickname

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

    if ( !chessman || !chessman.goodTimestamp() || !chessman.checkJump( to, this ) || nextField === undefined )
      return false

    if ( nextField && Color.isEqual( chessman, nextField ) )
      return false

    return true
  }

  removePlayer( color ) {
    if ( !color )
      return

    const deletedEntities = []
    const { height, width } = this

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = this.get( x, y )

        if ( Color.isEqual( entity, color ) ) {
          if ( `id` in entity ) {
            this.remove( x, y )
            continue
          }

          entity.color = new Color( `#ffffff` )

          if ( `setTextureColor` in entity )
            entity.setTextureColor( new Color( entity.color ) )
          // deletedEntities.push( this.remove( x, y ) )
        }
      }

    return deletedEntities
  }

  move( from, to ) {
    const fields = this.fields

    const chessman = this.get( from.x, from.y )
    const nextField = this.get( to.x, to.y )

    if ( !this.checkJump( from, to ) )
      return false

    if ( nextField && Color.isEqual( nextField, `#ffffff` ) ) {
      fields[ from.y ][ from.x ] = nextField
      nextField.x = from.x
      nextField.y = from.y
      nextField.lastJump = Date.now()
      nextField.color = chessman.color

      if ( `setTextureColor` in nextField )
        nextField.setTextureColor( chessman.color )
    }
    else {
      if ( nextField && `id` in nextField )
        this.removePlayer( nextField.color )

      fields[ from.y ][ from.x ] = null
    }

    fields[ to.y ][ to.x ] = chessman
    chessman.x = to.x
    chessman.y = to.y
    chessman.lastJump = Date.now()

    return (nextField || {}).id || true
  }

  isABeatableField( x, y, entity ) {
    const field = this.get( x, y )

    return field !== undefined && !Color.isEqual( field, entity )
  }

  isAbove( x, y ) {
    return 0 <= x && x < this.width && 0 <= y && y < this.height
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