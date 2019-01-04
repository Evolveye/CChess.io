class Player {
  constructor( { x, y, id } ) {
    this.id = id
    this.x = x
    this.y = y
  }
}

module.exports = new Map( [
  [ `chess`, (type, data, socket) => {
    switch ( type ) {
      case `chat_newMsg`:
        socket.broadcast( `chat_newMsg`, data )
        break

      case `game_init`:
        socket.player = new Player( data )
        socket.broadcast( `game_update`, [ ...socket.server.clients ].map( socket => socket.data.player ) )
        break

      // case `game_update`:
      //   if ( !socket.player )
      //     break
          
      //   socket.player.x = data.x
      //   socket.player.y = data.y
      //   socket.broadcast( `game_update`, [ ...socket.server.clients ]
      //     .filter( socket => `player` in socket.data )
      //     .map( socket => socket.data.player )
      //   )
      //   break
    }
  } ]
] )