let loc = window.location

const ws = new WebSocket( `${loc.protocol === `https:`  ?  `wss`  :  `ws`}:/${loc.host}` )
const messagehandlers = new Map

ws.onopen = () => document.querySelector( `.server_connection` ).textContent = `🌵 Connected`
ws.onclose = () => document.querySelector( `.server_connection` ).textContent = `👺 Disconnected`
ws.onmessage = e => {
  const { type, data } = JSON.parse( e.data )

  if ( messagehandlers.has( type ) )
    messagehandlers.get( type )( data )
}

const queque = {
  _queque: [],
  get ready() {
    return ws.readyState === 1  &&  !this._queque.length
  },
  push( func, ...params ) {
    this._queque.push( { func, params } )
  },
  run() {
    if ( ws.readyState === 1 ) {
      let que = [ ...queque._queque ]
      this._queque = []

      for ( const quest of que )
        quest.func( ...quest.params )
    }
    else
      setTimeout( () => this.run(), 500 )
  }
}

const socket = {
  send( type, data ) {
    if ( queque.ready )
      ws.send( JSON.stringify( { type, data } ) )
    else
      queque.push( this.send, type, data )
  },

  on( type, func ) {
    messagehandlers.set( type, func )
  },

  changeRoom( roomName ) {
    if ( queque.ready )
      socket.send( `$app-change_room`, roomName )
    else
      queque.push( this.changeRoom, roomName )
  }
}

queque.run()

socket.changeRoom( `chess-standard` )

export default socket