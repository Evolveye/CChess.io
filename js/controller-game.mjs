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
      rook: 20,
      knight: 10,
      bishop: 15,
      queen: 25,
      king: 50
    }

    this.chessboardFiller()
    setInterval( () => this.chessboardFiller(), 1000 * 30 )
    setInterval( () => this.broadcast( `game-update-scoreboard`, this.scoreboard() ), 1000 * 2 )
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
    const chessPieces = {
      pawn: 300,
      rook: 50,
      knight: 100,
      bishop: 50,
      queen: 20
    }

    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const entity = cb.get( x, y ).entity

        if ( entity && !(`id` in entity) )
          --chessPieces[ entity.type ]
      }


    for ( const chessPiece in chessPieces )
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

    playerController.broadcast( `game-update-spawn`, player )
    playerController.send( `game-update-scoreboard`, this.scoreboard() )

    this.players.set( playerController.id, Object.assign( playerController, player ) )

    let chessmanSize = this.chessboard.tileSize * .9

    if ( !(chessmanSize % 2) )
      chessmanSize -= 1

    playerInitializer( { chessboard:this.chessboard, chessmanSize, player } )
  }

  setColor( id, { coords, color } ) {
    if ( !coords || !(`x` in coords) || !(`y` in coords) || !color )
      return

    const { x, y } = coords

    if ( !Color.isEqual( this.players.get( id ).color, this.chessboard.get( x, y ).entity ) )
      return

    this.chessboard.setColor( x, y, color )
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
    if ( !Color.isEqual( this.players.get( id ).color, this.chessboard.get( from.x, from.y ).entity ) )
      return

    const takedField = this.chessboard.move( from, to )

    if ( !takedField )
      return

    this.players.get( id ).scores += this.piecesPoints[ takedField.type ] || 0
    this.jumps.push( { from, to } )

    if ( takedField.id && this.players.has( takedField.id ) )
      this.players.delete( takedField.id )
  }

  broadcast( type, data ) {
    this.wssController.broadcast( type, data )
  }
}