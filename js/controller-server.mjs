import http from "http"
import fs from "fs"
import WebSocket from "ws"

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



export default class Server {
  constructor( clientFolder, port, initialFunction ) {
    this.clientFolder = clientFolder
    this.route = {
      GET: new Map,
      POST: new Map
    }
    this.wsFunctions = {
      onconnection: null,
      onmessage: null,
      onclose: null
    }

    this.http = http
      .createServer( (req, res) => {
        const partedUrl = req.url.split( `?` )
        const getData = partedUrl[ 1 ]
        const address = partedUrl[ 0 ]
        const path = this.buildPath( req.method, address )

        // console.log( req.method, ` :: `, address, `->`, path )

        if ( !path )
          return this.page404( res )

        res.writeHead( 200, { "Content-Type":mimeTypes[ path.split( /.*\./ )[ 1 ] ] } )
        res.end( fs.readFileSync( path ) )
      } )
      .listen( port, initialFunction )

    this.ws = new WebSocket.Server( { server:this.http } )
      .on( `connection`, socket => {
        let { onconnection, onmessage, onclose } = this.wsFunctions

        if ( typeof onconnection === `function` )
          onconnection( socket )

        socket.onmessage = e => {
          if ( typeof onmessage !== `function` || socket.readyState !== 1 )
            return

          const { event, data } = JSON.parse( e.data )

          onmessage( socket, event, data )
        }

        socket.onclose = () => {
          if ( typeof onclose === `function` )
            onclose( socket )
        }
      } )
  }

  setRoute( method, url, path ) {
    this.route[ method.toUpperCase() ].set( url, path.replace( `$client`, this.clientFolder ) )

    return this
  }

  setWebSocketEvent( event, func ) {
    this.wsFunctions[ `on${event}` ] = func

    return this
  }

  buildPath( method, address ) {
    const staticRoute = this.route[ method ].get( address )

    if ( staticRoute )
      return staticRoute

    const path = `${this.clientFolder}${address}`

    if ( fs.existsSync( path ) )
      return path

    return null
  }

  page404( res ) {
    res.writeHead( 404 )
    res.end()
  }

  get( url, path ) {
    return this.setRoute( `GET`, url, path )
  }

  post( url, path ) {
    return this.setRoute( `POST`, url, path )
  }

  onconnection( func ) {
    return this.setWebSocketEvent( `connection`, func)
  }

  onmessage( func ) {
    return this.setWebSocketEvent( `message`, func)
  }

  onclose( func ) {
    return this.setWebSocketEvent( `close`, func)
  }

  broadcast( event, data ) {
    this.ws.clients.forEach( socket => {
      if ( socket.readyState !== 1 )
        return

      socket.send( JSON.stringify( { event, data } ) )
    } )
  }

  get clients() {
    return this.ws.clients
  }
}