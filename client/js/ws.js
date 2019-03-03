let loc = window.location

const ws = new WebSocket( `${loc.protocol === `https:`  ?  `wss`  :  `ws`}:/${loc.host}` )
const messagehandlers = new Map

ws.onmessage = e => {
  const { event, data } = JSON.parse( e.data )

  if ( messagehandlers.has( event ) )
    messagehandlers.get( event )( data )
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
  send( event, data ) {
    if ( queque.ready )
      ws.send( JSON.stringify( { event, data } ) )
    else
      queque.push( this.send, event, data )
  },

  on( event, func ) {
    messagehandlers.set( event, func )
  },

  changeRoom( roomName ) {
    if ( queque.ready )
      socket.send( `$app-change_room`, roomName )
    else
      queque.push( this.changeRoom, roomName )
  },

  onclose( func ) {
    ws.onclose = func
  },

  onopen( func ) {
    ws.onopen = func
  }
}

queque.run()

export default socket