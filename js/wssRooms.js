class Player {
  constructor( { x, y, id } ) {
    this.id = id
    this.x = x
    this.y = y
  }
}

module.exports = new Map( [
  [ `chess`, (type, data, appWs) => {
    switch ( type ) {
      case `chat-new_message`:
        appWs.broadcast( `chat-new_message`, data )
        break

      case `game-init`:
        appWs.player = new Player( data )
        break

      case `game-player_update`:
        appWs.player.x = data.x
        appWs.player.y = data.y
        break
    }
  } ]
] )