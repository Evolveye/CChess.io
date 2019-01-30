import Chessboard, { random, Color } from "./classes.mjs"

export default class GameController {
  constructor( wssController ) {
    this.players = new Map
    this.chessboard = new Chessboard( 10, 10, 50 )
    this.jumps = []

    for ( let i = 0;  i < 1;  i++ )
      this.spawn( `pawn` )

    setInterval( () => {
      wssController.broadcast( `game-update-jumps`, this.jumps )
      this.jumps = []
    }, 1000 / 60 )
  }

  spawn( type, color=null ) {
    const cb = this.chessboard
    let x, y

    do {
      x = random( 0, cb.width )
      y = random( 0, cb.height )
    } while ( cb.get( x, y ) )

    return cb.set( type, x, y, color, 100 )
  }

  spawnPlayer( playerController, playerInitializer ) {
    const player = this.spawn( `player`, new Color )
    player.id = playerController.id

    playerController.broadcast( `game-update-spawn`, player )

    this.players.set( playerController.id, Object.assign( playerController, player ) )

    playerInitializer( {
      chessboard: this.chessboard,
      chessmanSize: this.chessboard.tileSize * .9,
      player
    } )
  }
  destroyPlayer( id ) {
    const player = this.players.get( id )
    const cb = this.chessboard
    const { height, width } = cb


    for ( let y = 0;  y < height;  y++ )
      for ( let x = 0;  x < width;  x++ ) {
        const field = cb.get( x, y )

        if ( field && field.color == player.color ) {
          player.broadcast( `game-update-despawn`, { x, y } )

          if ( !(`id` in field) )
            player.broadcast( `game-update-spawn`, this.spawn( field.type ) )

          cb.remove( x, y )
        }
      }

    this.players.delete( id )
  }
  playerUpdate( id, { from, to } ) {
    const player = this.players.get( id )
    const tile = this.chessboard.get( from.x, from.y )

    if ( !tile || `${tile.color}` != `${player.color}` )
      return

    if ( this.chessboard.move( from, to ) )
      this.jumps.push( { from, to } )
  }
}