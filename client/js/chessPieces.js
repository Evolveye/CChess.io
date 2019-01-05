class Chessman {
  constructor( x, y, color, src ) {
    this.id = Math.random()
    this.x = x
    this.y = y

    this.tex = new Image
    this.tex.src = src
    this.tex.onload = () => this.color = color
  }

  /**
   * @param {{ r:number, g:number, b:number }} color
   */
  set color( color ) {
    const t = this.tex

    let canvas = document.createElement( `canvas` )
    canvas.width = t.width
    canvas.height = t.height

    let ctx = canvas.getContext( `2d` )

    ctx.drawImage( t, 0, 0 )

    let imgData = ctx.getImageData( 0, 0, t.width, t.height )
    
    for ( let y = 0;  y < imgData.height;  y++ )
      for ( let x = 0;  x < imgData.width * 4;  x += 4  ) {
        const pixelStart = y * imgData.width * 4 + x + 0

        const r = imgData.data[ pixelStart + 0 ]
        const g = imgData.data[ pixelStart + 1 ]
        const b = imgData.data[ pixelStart + 2 ]
        const a = imgData.data[ pixelStart + 3 ] / 255

        if ( r == 255 && g == 255 && b == 255 && a == 1 ) {
          imgData.data[ pixelStart + 0 ] = color.r
          imgData.data[ pixelStart + 1 ] = color.g
          imgData.data[ pixelStart + 2 ] = color.b
        }
      }

    ctx.putImageData( imgData, 0, 0 )

    t.onload = null
    t.src = canvas.toDataURL()
  }

  move() {
    throw `You have to override me!`
  }
}

export class Pawn extends Chessman {
  constructor( x, y, color ) {
    super( x, y, color, `./../img/hetman.png` )
  }

  move( x, y ) {
    return true

    if ( !!x == !!y )
      return
    if ( x && (x == this.x + 1 || x == this.x - 1) )
      this.x = x
    else if ( y == this.y + 1 || y == this.y - 1 )
      this.y = y
  }
}