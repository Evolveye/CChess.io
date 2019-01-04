"use script"

// Azure isn't reading ES6 modules ¯\_(ツ)_/¯
const http = require( `http` )
const fs = require( `fs` )
const WebSocket = require( `ws` )
const wssRooms = require(`./js/wssRooms.js`)



/* *
 * Servers config */

const port = process.env.PORT  ||  80
const mimeTypes = {
  html: `text/html`,
  css: `text/css`,
  ico: `image/x-icon`,
  js: `text/javascript`
}

const server = http.createServer( (req, res) => {
  const address = req.url === `/`  ?  `/index.html`  :  req.url
  const mimeType = mimeTypes[ address.split( /.*\./ )[ 1 ] ]
  let file = null

  if ( fs.existsSync( `./client${address}` ) )
    file = fs.readFileSync( `./client${address}` )

  res.writeHead( 200, { "Content-Type":mimeType } )
  res.end( file )
} ).listen( port )

console.log( `\nServer is running on port ${port}\n` )

const wss = new WebSocket.Server( { server } )



/* *
 * WebSocket config */

class SocketData {
  constructor( socket, server ) {
    this.server = server
    this.socket = socket
    this.room = null
  }

  send( type, data ) {
    this.socket.send( JSON.stringify( { type, data } ) )
  }

  broadcast( type, data ) {
    this.server.clients.forEach( ws => ws.data.send( type, data ) )
  }
}


wss.on( `connection`, ws => {
  ws.data = new SocketData( ws, wss )

  ws.onmessage = e => {
    const { type, data } = JSON.parse( e.data )

    switch ( type ) {
      case `$changeRoom`:
        ws.data.room = data
        break
      default:
        if ( wssRooms.has( ws.data.room ) )
          wssRooms.get( ws.data.room )( type, data, ws.data )
    }
  }

  ws.onclose = e => console.log( e.target.data.player )
} )