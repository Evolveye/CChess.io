"use script"

import http from "http"
import fs from "fs"
import WebSocket from "ws"

import GameController from "./js/controller-game.mjs"
import PlayerController from "./js/controller-player.mjs"

const port = process.env.PORT || 80
const mimeTypes = {
  html: `text/html`,
  css: `text/css`,
  js: `text/javascript`,
  mjs: `application/javascript`,
  json: `application/json`,
  woff: `application/font-woff`,
  ttf: `application/font-ttf`,
  eot: `application/vnd.ms-fontobject`,
  otf: `application/font-otf`,
  svg: `application/image/svg+xml`,
  ico: `image/x-icon`,
  png: `image/png`,
  jpg: `image/jpg`,
  gif: `image/gif`,
  wav: `audio/wav`,
  mp4: `video/mp4`
}

const staticRoute = {
  classes: `./js/classes.mjs`
}

const server = http
  .createServer( (req, res) => {
    let log = `${req.method} ${req.url}`

    while ( log.length < 20 )
      log += ` `

    // process.stdout.write( `${log}|   ` )

    if ( req.method == `GET` ) {
      let file = null
      let address

      if ( req.url.charAt( 1 ) == `$` )
        address = staticRoute[ req.url.slice( 3 ) ]
      else
        address = `./client${req.url == `/`  ?  `/index.html`  :  req.url}`

      // process.stdout.write( `address: ${address}   ` )
      let mimeType = mimeTypes[ address.split( /.*\./ )[ 1 ] ]
      // process.stdout.write( `mimeType: ${mimeType}   ` )

      if ( fs.existsSync( address ) ) {
        file = fs.readFileSync( address )
        res.writeHead( 200, { "Content-Type":mimeType } )
      }
      else
        res.writeHead( 404 )

      // process.stdout.write( `statusCode:${res.statusCode}\n` )

      res.end( file )
    }
  } )
  .listen( port )

class WssController {
  /**
   *
   * @param {WebSocket.Server} wss
   */
  constructor( wss ) {
    this.wss = wss

    this.gameController = new GameController( this )

    wss.on( `connection`, ws => {
      // console.log( Object.keys( ws._sender ) )
      ws.playerController = new PlayerController( this.gameController, ws, wss )

      ws.onmessage = e => {
        if ( ws.readyState !== 1 )
          return

        const { type, data } = JSON.parse( e.data )

        ws.playerController.eventHandler( type, data )
      }
      ws.onclose = () => {
        console.log( `close:`, ws.playerController.nickname )
        ws.playerController.eventHandler( `close` )
      }
    } )
  }

  broadcast( type, data ) {
    this.wss.clients.forEach( ws => {
      if ( ws.readyState !== 1 )
        return

      ws.send( JSON.stringify( { type, data } ) )
    } )
  }

  get sockets() {
    return [ ...this.wss.clients ].map( ws => ws.appWs )
  }
}

new WssController( new WebSocket.Server( { server } ) )

console.log( `\nServer started on port ${port}\n`)