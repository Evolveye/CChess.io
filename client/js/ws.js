let loc = window.location

const ws = new WebSocket( `${loc.protocol === `https:`  ?  `wss`  :  `ws`}:/${loc.host}` )
const messagehandlers = new Map

function setupWs() {
  
}
ws.onopen = () => document.querySelector( `.server_connection` ).textContent = `🌵 Connected`
ws.onclose = e => {
  document.querySelector( `.server_connection` ).textContent = `👺 Disconnected`
  console.log( e )
}

ws.onmessage = e => {
  const { type, data } = JSON.parse( e.data )

  if ( messagehandlers.has( type ) )
    messagehandlers.get( type )( data )
}

const socket = {
  send( type, data ) {
    if ( ws.readyState === 1 )
      ws.send( JSON.stringify( { type, data } ) )
    else
      setTimeout( () => this.send( type, data ), 500 )
  },
  on( type, func ) {
    messagehandlers.set( type, func )
  },
  changeRoom( roomName ) {
    if ( ws.readyState === 1 )
      this.send( `$changeRoom`, roomName )
    else
      setTimeout( () => this.changeRoom( roomName ), 500 )
  }
}



socket.changeRoom( `chess` )

window.ws = ws
window.socket = socket

export default socket