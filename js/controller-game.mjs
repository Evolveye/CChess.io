import Chessboard, { random, Color } from "./classes.mjs"

export default class GameController {
  constructor( wssController ) {
    this.wssController = wssController
    this.players = new Map
    this.chessboard = new Chessboard( 70, 70, 60 )
    this.jumps = []
    this.newColors = []
    this.piecesPoints = {
      pawn: 5,
      rook: 50,
      knight: 25,
      bishop: 40,
      queen: 150,
      king: 300
    }
    this.chessPiecesOnMap = {
      pawn: 1000,
      rook: 0,
      knight: 0,
      bishop: 0,
      queen: 0
    }
    this.neededPointsToTransform = {
      // pawn: 0,
      rook: 1500,
      knight: 500,
      bishop: 1000,
      // queen: Infinity
    }

    this.chessboardFiller()
    setInterval( () => this.chessboardFiller(), 1000 * 30 )
    setInterval( () => this.broadcast( `game-update-scoreboard`, this.scoreboard() ), 1000 )
    setInterval( () => {
      if ( !this.jumps.length && !this.newColors.length )
        return

      wssController.broadcast( `game-update`, { jumps:this.jumps, colors:this.newColors } )
      this.jumps = []
      this.newColors = []
    }, 1000 / 60 )
  }

  scoreboard() {
    const scoreboard = []

    for ( const player of this.players.values() )
      scoreboard.push( {
        nickname: player.nickname,
        color: player.color,
        data: player.scores
      } )

    return scoreboard
  }

  testNickname( nickname ) {
    nickname = nickname.trim()

    if ( !nickname.length || nickname.length > 16 || /⎞/.test( nickname ) )
      return false

    for ( const player of this.players.values() )
      if ( player.nickname == nickname )
        return false

    return true
  }

  chessboardFiller() {
    const cb = this.chessboard
    const { width, height } = cb
    const chessPieces = Object.assign( {}, this.chessPiecesOnMap )

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = cb.get( x, y ).entity

        if ( entity && !(`id` in entity) )
          --chessPieces[ entity.type ]
      }


    for ( const chessPiece in this.chessPiecesOnMap )
      for ( let i = chessPieces[ chessPiece ];  i > 0;  i-- )
        this.wssController.broadcast( `game-update-spawn`, this.spawn( chessPiece ) )
  }

  spawn( type, color=null ) {
    const cb = this.chessboard
    let x, y

    do {
      x = random( 0, cb.width )
      y = random( 0, cb.height )
    } while ( cb.get( x, y ).entity )

    return cb.setEntity( { type, x, y, color, movingTimestamp:150 } )
  }

  spawnPlayer( playerController, nickname, playerInitializer ) {
    let color = new Color

    while ( !color.r || !color.g || !color.b )
      color = new Color

    const player = this.spawn( `player`, color )
    player.id = playerController.id
    player.nickname = nickname
    player.scores = 0
    player.fieldsToCapture = 0

    playerController.broadcast( `game-update-spawn`, player )
    playerController.send( `game-update-scoreboard`, this.scoreboard() )

    this.players.set( playerController.id, Object.assign( playerController, player ) )

    let chessmanSize = this.chessboard.tileSize * .9

    if ( !(chessmanSize % 2) )
      chessmanSize -= 1

    playerInitializer( {
      neededPointsToTransform: this.neededPointsToTransform,
      chessboard: this.chessboard,
      chessmanSize,
      player
    } )
  }

  transform( id, { x, y, type } ) {
    const player = this.players.get( id )
    const points = this.neededPointsToTransform

    if ( type in points && player.scores >= points[ type ] && this.chessboard.transform( type, x, y ) )
      this.broadcast( `game-transform`, { x, y, type } )
  }

  setColor( id, { coords, color } ) {
    if ( !coords || !(`x` in coords) || !(`y` in coords) || !color )
      return

    const { x, y } = coords
    const player = this.players.get( id )

    if ( player.fieldsToCapture <= 0 )
      return

    const prevColor = this.chessboard.setColor( x, y, color )

    if ( prevColor )
      player.scores += 15
    else if ( prevColor === null )
      player.scores += 10

    --player.fieldsToCapture
    this.newColors.push( { x, y, color } )
  }

  destroyPlayer( id ) {
    const player = this.players.get( id )

    if ( !player )
      return

    for ( const entity of this.chessboard.removePlayer( player.color ) )
      if ( !(`id` in entity) )
        player.broadcast( `game-update-spawn`, this.spawn( entity.type ) )

    player.broadcast( `game-update-despawn-player`, player.color )

    if ( this.players.has( id ) )
      this.players.delete( id )
  }

  playerUpdate( id, { from, to } ) {
    from.entity = this.chessboard.get( from.x, from.y ).entity

    if ( !Color.isEqual( this.players.get( id ).color, from.entity ) )
      return

    const takedField = this.chessboard.move( from, to )
    const player = this.players.get( id )

    if ( !takedField )
      return

    if ( from.entity.id ) {
      player.x = from.x
      player.y = from.y
    }

    player.scores += this.piecesPoints[ takedField.type ] || 0

    this.jumps.push( { from, to } )

    if ( takedField.type == `pawn` )
      ++player.fieldsToCapture

    if ( takedField.id && this.players.has( takedField.id ) ) {
      player.scores += this.players.get( takedField.id ).scores ** 1.8 ** .5
      this.players.delete( takedField.id )
    }
  }

  broadcast( type, data ) {
    this.wssController.broadcast( type, data )
  }
}