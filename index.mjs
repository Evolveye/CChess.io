import GameController from "./js/controller-game"
import PlayerController from "./js/controller-player"
import Server from "./js/controller-server"

const port = process.env.PORT || 80
const server = new Server( `./client`, port, () => console.log( `Server has been started at port ${port}` ), true )
  .get( `/`, `$client/main.html` )
  .get( `/server/gameCore`, `./js/gameCore.mjs` )

const cchess = new GameController( server )

server
  .onconnection( socket => socket.playerController = new PlayerController( cchess, socket, server ) )
  .onmessage( (socket, event, data) => socket.playerController.eventHandler( event, data ) )
  .onclose( (socket) => socket.playerController.eventHandler( `close` ) )