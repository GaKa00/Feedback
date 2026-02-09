import [ WebSocketServer, WebSocket ] from 'ws';

function sendJson( socket: WebSocket, data: any ) {
  if ( socket.readyState === WebSocket.OPEN ) {
    socket.send( JSON.stringify( data ) );
  }
}

function broadcast( wss: WebSocket.Server, data: any ) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

function attachWebSocketServer( server: http.Server ) {
  const wss = new WebSocket.Server( { server, path: '/ws', maxPayload: 1024 * 1024 } );
wss.on( 'connection', ( socket ) => {
    sendJson( socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' } );
}
function broadcastMatchCreated( wss: WebSocket.Server, match: any ) {
    broadcast( wss, { type: 'matchCreated', match } );
}
return { broadcastMatchCreated };
});
