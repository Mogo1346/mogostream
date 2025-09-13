// פשוט מאוד — שרת סיגנלינג עבור החלפת הודעות בין משתתפים
// דרישות: node >= 16, חבילת ws
// התקנה: npm install ws
// הרצה: node server.js

const WebSocket = require('ws');
const port = 3000;
const wss = new WebSocket.Server({ port });
console.log('Signaling server listening on ws://localhost:' + port);

const rooms = {}; // roomName -> Set of clients

wss.on('connection', (ws) => {
  ws._id = null;
  ws._room = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch(e){ return; }
    const type = msg.type;

    if(type === 'join'){
      const room = msg.room || 'default-room';
      const id = msg.id || Math.random().toString(36).slice(2,9);
      ws._id = id;
      ws._room = room;
      rooms[room] = rooms[room] || new Set();
      // send back current participants (excluding self)
      const participants = Array.from(rooms[room]).filter(i => i !== id);
      ws.send(JSON.stringify({ type: 'joined', participants }));
      // add to room
      rooms[room].add(id);
      // store mapping id->ws
      wsServerAdd(id, ws);
      // notify others about new peer
      broadcastToRoom(room, { type:'new-peer', id }, excludeId=id);
      return;
    }

    if(type === 'leave'){
      const id = msg.id || ws._id;
      leaveRoomForWs(ws);
      return;
    }

    // routing messages offer/answer/ice between peers
    if(type === 'offer' || type === 'answer' || type === 'ice'){
      const target = msg.target;
      const from = msg.from;
      const payload = msg;
      // send to target ws if exists
      const targetWs = wsServerGet(target);
      if(targetWs && targetWs.readyState === WebSocket.OPEN){
        targetWs.send(JSON.stringify(payload));
      }
      return;
    }
  });

  ws.on('close', () => {
    leaveRoomForWs(ws);
  });
});

// helper mapping id->ws
const idToWs = new Map();
function wsServerAdd(id, ws){ idToWs.set(id, ws); }
function wsServerGet(id){ return idToWs.get(id); }
function wsServerRemove(id){ idToWs.delete(id); }

function broadcastToRoom(room, msgObj, excludeId){
  const s = rooms[room];
  if(!s) return;
  for(const id of Array.from(s)){
    if(id === excludeId) continue;
    const cl = idToWs.get(id);
    if(cl && cl.readyState === WebSocket.OPEN){
      cl.send(JSON.stringify(msgObj));
    }
  }
}

function leaveRoomForWs(ws){
  const room = ws._room;
  const id = ws._id;
  if(room && rooms[room]){
    rooms[room].delete(id);
    if(rooms[room].size === 0) delete rooms[room];
    // notify remaining peers
    broadcastToRoom(room, { type:'leave', id }, excludeId=null);
  }
  if(id) wsServerRemove(id);
}
