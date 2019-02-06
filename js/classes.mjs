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

  static getTxtFormat( object ) {
    if ( typeof object == `string` )
      return `${object}`
    if ( `txtFormat` in object )
      return object.txtFormat
    if ( `color` in object )
      return object.color.txtFormat
  }

  static isEqual( entityA, entityB ) {
    if ( !entityA || !entityB )
      return false

    return `${this.getTxtFormat( entityA )}` == `${this.getTxtFormat( entityB )}`
  }
}

class Chessman {
  constructor( x, y, color, movingTimestamp=1000, type ) {
    this.x = x
    this.y = y
    this.spawnTime = Date.now()
    this.spawnProtection = 0
    this.color = new Color( color || `#ffffff` )
    this.basicMovingTimestamp = movingTimestamp
    this.movingTimestamp = movingTimestamp
    this.lastJump = 0
    this.type = type
  }

  protected() {
    return this.spawnTime + this.spawnProtection * 1000 - Date.now() >= 0
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

  set movingTimestampMultiplier( multiplier ) {
    this.movingTimestamp = this.basicMovingTimestamp * multiplier
  }

  static movingLoopLogic( data, chessboard, chessman, x, y ) {
    if ( chessboard.isABeatableField( chessman.x + x, chessman.y + y, chessman ) )
      data.fields.push( { x:(chessman.x + x), y:(chessman.y + y) } )

    if ( chessboard.get( chessman.x + x, chessman.y + y ).entity )
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
  constructor( x, y, color, movingTimestamp=100 ) {
    super( x, y, color, movingTimestamp, `pawn` )
  }

  /** @param {Chessboard} chessboard (Chess instance).fields */
  availableFields( chessboard ) {
    const availableFields = []
    const cb = chessboard

    for ( let y = -1;  y < 2;  y++ )
      for ( let x = -1;  x < 2;  x++ )
        if ( cb.isABeatableField( this.x + x, this.y + y, this ) ) {
          const entity = cb.get( this.x + x, this.y + y ).entity

          if ( x ** 2 == 1 && y ** 2 == 1  ) {
            if ( entity )
              availableFields.push( { x:(this.x + x), y:(this.y + y) } )
          }
          else if ( !entity )
            availableFields.push( { x:(this.x + x), y:(this.y + y) } )
        }

    return availableFields
  }

  checkJump( { x, y }, chessboard ) {
    if ( (this.x - x) ** 2 <= 1 && (this.y - y) ** 2 <= 2 ) {
      const entity = chessboard.get( x, y ).entity

      if ( this.x != x ^ this.y != y )
        return !entity

      return !!entity
    }

    return false
  }
}
class Rook extends Chessman {
  constructor( x, y, color, movingTimestamp=1500 ) {
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

        if ( chessboard.get( x, y ).entity && (x != this.x || y != this.y) )
          return false
      }

      return true
    }

    return false
  }
}
class Knight extends Chessman {
  constructor( x, y, color, movingTimestamp=300 ) {
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
  constructor( x, y, color, movingTimestamp=1000 ) {
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

        if ( x != this.x && chessboard.get( x, y ).entity )
          return false
      }

      return true
    }

    return false
  }
}
class Queen extends Chessman {
  constructor( x, y, color, movingTimestamp=1500 ) {
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

      if ( chessboard.get( x, y ).entity && (x != this.x || y != this.y) )
        return false
    }

    return true
  }
}
class King extends Chessman {
  constructor( x, y, color, movingTimestamp=300 ) {
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
    this.spawnProtection = 5

    this.id = Math.random()
  }
}

export default class Chessboard {
  constructor( width, height, tileSize, fields=[], isTextured ) {
    this.width = width
    this.height = height
    this.tileSize = tileSize

    /** @type {Chessman[][]} */
    this.fields = [ ...Array( height ) ].map( () => [ ...Array( width ) ].map( () => ({ color:null, entity:null }) ) )

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const field = (fields[ y ] || [])[ x ] || {}

        if ( field.color )
          this.setColor( x, y, field.color )
        if ( field.entity )
          this.setEntity( field.entity, isTextured )
      }
  }

  transform( type, x, y ) {
    const field = this.get( x, y )
    const king = field.entity

    if ( !king || king.type != `king` || !Color.isEqual( field.color, king.color ) )
      return false

    for ( let y = -1;  y < 2;  y++ )
      for ( let x = -1;  x < 2;  x++ ) {
        const field = this.get( king.x + x, king.y + y )
        const pawn = field.entity

        if ( pawn && (x || y) && pawn.type == `pawn` && Color.isEqual( field.color, king.color ) && Color.isEqual( pawn, king.color ) ) {
          x = king.x + x
          y = king.y + y

          this.remove( x, y )
          this.setEntity( { type, x, y, color:king.color, movingTimestamp:king.movingTimestamp }, `tex` in king )
          return true
        }
      }
  }

  get( x, y ) {
    return (this.fields[ y ] || [])[ x ] || {}
  }

  setColor( x, y, color ) {
    const field = this.get( x, y )

    if ( !field || Color.isEqual( field.color, color ) )
      return

    const prevColor = field.color

    field.color = Color.getTxtFormat( color )

    return prevColor
  }

  setEntity( entityData, isTextured ) {
    const { x, y } = entityData
    let entity = null

    if ( entityData instanceof Chessman )
      entity = entityData
    else {
      const entityOnField = this.get( x, y ).entity

      if ( `id` in entityData )
        entityData.type = `player`

      entity = Chessboard.getInstance( entityData )

      if ( entityOnField || !entity )
        return null
      if ( isTextured )
        setTexture`../img/${entity}.png`
      if ( `id` in entityData )
        entity.id = entityData.id

      for ( const property of Object.keys( entityData ) )
        if ( !(property in entity) )
          entity[ property ] = entityData[ property ]
    }

    this.fields[ y ][ x ].entity = entity

    return entity
  }

  remove( x, y, colorToo=false ) {
    const field = this.fields[ y ][ x ].entity

    this.fields[ y ][ x ].entity = null

    if ( colorToo )
      this.fields[ y ][ x ].color = null

    return field.entity
  }

  checkJump( from, to ) {
    const chessman = this.get( from.x, from.y ).entity
    const nextField = this.get( to.x, to.y ).entity

    if ( !chessman || !chessman.goodTimestamp() || !chessman.checkJump( to, this ) || nextField === undefined )
      return false

    if ( nextField && (nextField.protected() || Color.isEqual( chessman, nextField )) )
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
        const field = this.get( x, y )
        const entity = field.entity

        if ( Color.isEqual( field.color, color ) )
          this.setColor( x, y, `#ffffff` )
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
    from.field = this.get( from.x, from.y )
    to.field = this.get( to.x, to.y )

    const fields = this.fields
    const chessman = from.field.entity
    const takedEntity = to.field.entity

    if ( !this.checkJump( from, to ) )
      return false

    if ( takedEntity && Color.isEqual( takedEntity, `#ffffff` ) ) {
      fields[ from.y ][ from.x ].entity = takedEntity
      takedEntity.x = from.x
      takedEntity.y = from.y
      takedEntity.lastJump = Date.now()
      takedEntity.color = chessman.color

      if ( `setTextureColor` in takedEntity )
        takedEntity.setTextureColor( chessman.color )
    }
    else {
      if ( takedEntity && `id` in takedEntity )
        this.removePlayer( takedEntity.color )

      this.remove( from.x, from.y )
    }

    if ( Color.isEqual( to.field.color, `#ffffff` ) )
      chessman.movingTimestampMultiplier = 1
    else if ( Color.isEqual( to.field.color, chessman.color ) )
      chessman.movingTimestampMultiplier = .75
    else
      chessman.movingTimestampMultiplier = 1.25

    fields[ to.y ][ to.x ].entity = chessman
    chessman.x = to.x
    chessman.y = to.y
    chessman.lastJump = Date.now()

    return takedEntity || true
  }

  isABeatableField( x, y, entity ) {
    const field = this.get( x, y )

    return Object.entries( field ).length && (!field.entity || !Color.isEqual( field.entity, entity ))
  }

  isAbove( x, y ) {
    return 0 <= x && x < this.width && 0 <= y && y < this.height
  }

  static getInstance( { type, x, y, color, movingTimestamp } ) {
    switch ( type ) {
      case `pawn`:   return new Pawn(   x, y, color, movingTimestamp )
      case `rook`:   return new Rook(   x, y, color, movingTimestamp )
      case `knight`: return new Knight( x, y, color, movingTimestamp )
      case `bishop`: return new Bishop( x, y, color, movingTimestamp )
      case `king`:   return new King(   x, y, color, movingTimestamp )
      case `queen`:  return new Queen(  x, y, color, movingTimestamp )
      case `god`:    return new God(    x, y, color, movingTimestamp )
      case `player`: return new Player( x, y, color, movingTimestamp )
    }
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