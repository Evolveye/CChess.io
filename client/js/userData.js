/** @return {HTMLElement} */
export default function userData( element=document.createElement( `div` ), { content, sender, color } ) {
  element.classList.add( `user_data` )

  if ( sender ) {
    const nickname = document.createElement( `span` )
    nickname.className = `user_data-nickname`
    nickname.textContent = sender

    if ( color ) {
      const playerColor = document.createElement( `span` )
      playerColor.className = `user_data-color`
      playerColor.style.backgroundColor = color

      element.appendChild( playerColor )
    }
    element.appendChild( nickname )
  }

  const msg = document.createElement( `span` )
  msg.className = `user_data-data`
  msg.textContent = content

  element.appendChild( msg )

  return element
}