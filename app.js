"use script"

// Azure isn't supporting ES6 modules ¯\_(ツ)_/¯
const http = require( `http` )
const fs = require( `fs` )
const WebSocket = require( `ws` )
const Game = require(`./js/Game.js`)

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

    this.games = ``
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

    if ( type === `$app-change_room`)
      appWs.room = data
    else switch ( appWs.room ) {
      case `chess-standard`:
        games.chessStandard.webSocketEvents( type, data, appWs )
        break
    }
  }
} )

const games = {
  chessStandard: new Game( wss.appWss, 32, 32, 50, 40, 200 )
}