"use script"

// Azure isn't supporting ES6 modules ¯\_(ツ)_/¯
const http = require( `http` )
const fs = require( `fs` )
const WebSocket = require( `ws` )
const wssRooms = require(`./js/wssRooms.js`)

const port = process.env.PORT  ||  80
const mimeTypes = {
  html: `text/html`,
  css: `text/css`,
  ico: `image/x-icon`,
  png: `image/png`,
  js: `text/javascript`
}

const server = http
  .createServer( (req, res) => {
    let address = req.url === `/`  ?  `/index.html`  :  req.url
    let mimeType = mimeTypes[ address.split( /.*\./ )[ 1 ] ]
    let file = null

    if ( fs.existsSync( `./client${address}` ) )
      file = fs.readFileSync( `./client${address}` )

    res.writeHead( 200, { "Content-Type":mimeType } )
    res.end( file )
  } )
  .listen( port )

const wss = new WebSocket.Server( { server } )

console.log( `\nServer started on port ${port}\n`)


class AppWss {
  constructor( wss ) {
    this.wss = wss
  }

  broadcast( type, data ) {
    this.wss.clients.forEach( ws => ws.appWs.send( type, data ) )
  }

  get sockets() {
    return [ ...this.wss.clients ].map( ws => ws.appWs )
  }
}

class AppWs {
  constructor( ws, wss ) {
    this.wss = wss
    this.ws = ws
  }

  send( type, data ) {
    if ( this.ws.readyState !== 1 )
      return

    this.ws.send( JSON.stringify( { type, data } ) )
  }

  broadcast( type, data ) {
    this.wss.clients.forEach( ws => ws.appWs.send( type, data ) )
  }
}



wss.appWss = new AppWss( wss )
wss.on( `connection`, ws => {
  const appWs = ws.appWs = new AppWs( ws, wss )

  ws.onmessage = e => {
    if ( ws.readyState !== 1 )
      return

    const { type, data } = JSON.parse( e.data )

    switch ( type ) {
      case `$app-change_room`:
        appWs.room = data
        break

      default:
        if ( wssRooms.has( appWs.room ) )
          wssRooms.get( appWs.room )( type, data, appWs )
    }
  }
} )

setInterval( () => {
  wss.appWss.broadcast( `game-update`, wss.appWss.sockets
    .filter( appWs => !!appWs.player )
    .map( appWs => appWs.player )
  )
}, 1000 / 60 )