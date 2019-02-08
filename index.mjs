import http from "http"
import fs from "fs"
import WebSocket from "ws"

import GameController from "./js/controller-game.mjs"
import PlayerController from "./js/controller-player.mjs"

class Server {
  constructor() {
    this.port = process.env.PORT || 80
    this.connections = new Map
    this.mimeTypes = {
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
    this.staticRoute = {
      gameCore: `./js/gameCore.mjs`
    }
    this.instance = http
      .createServer( (req, res) => {
        const path = this.buildPath( req.url )

        if ( !this.checkIp( path, req.connection.remoteAddress ) )
          this.send404( res )

        if ( fs.existsSync( path ) ) {
          res.writeHead( 200, { "Content-Type":this.mimeTypes[ path.split( /.*\./ )[ 1 ] ] } )
          res.end( fs.readFileSync( path ) )
        }
        else
          this.send404( res )

      } )
      .listen( this.port, () => console.log( `\nServer started on port ${this.port}\n`) )
  }

  checkIp( /* path, address* */ ) {

    /**
     * That methos is not good.
     * I know - address != PC
     *   but i don't know how can I make multiwebsocket connections from 1 PC
     */

    // Unfinished functionality:
    //
    // const cxn = this.connections
    // if ( path == `./client/index.html` ) {
    //   if ( !cxn.has( address ) )
    //     cxn.set( address, 0 )
    //
    //   const clientCxn = cxn.get( address )
    //
    //   if ( clientCxn > 10 )
    //     return false
    //
    //   cxn.set( address, cxn.get( address ) + 1 )
    // }

    return true
  }

  buildPath( url ) {
    const varRegexp = /\$([a-z0-9]+)/i
    const varInUrl = url.match( varRegexp )

    if ( varInUrl && varInUrl[ 1 ] in this.staticRoute )
      return this.staticRoute[ varInUrl[ 1 ] ]

    return `./client${url == `/`  ?  `/index.html`  :  url}`
  }

  send404( res, reason ) {
    res.writeHead( 404 )
    res.end()
  }
}

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
        console.log( `socket closed:`, ws.playerController.nickname )
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

new WssController( new WebSocket.Server( { server:(new Server).instance } ) )