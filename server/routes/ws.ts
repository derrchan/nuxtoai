import { WebSocket } from 'ws';
// https://nitro.unjs.io/guide/websocket
// https://crossws.unjs.io/

// 接続ユーザー単位にセッションを管理する
const connections: { [id: string]: WebSocket } = {};

export default defineWebSocketHandler({
  open(peer) {
    if (!connections[peer.id]) {
      // OpenAIのRealtime APIとの接続
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      connections[peer.id] = new WebSocket(url, {
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          'OpenAI-Beta': 'realtime=v1',
        },
      });
    }
    const instructions = 'always answer in english no matter what language the user says';

    connections[peer.id].on('open', () => {
      // Realtime APIのセッション設定
      connections[peer.id].send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: 'shimmer',
          instructions: instructions,
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' },
        },
      }));
    });
    connections[peer.id].on('message', (message) => {
      // Realtime APIのサーバーイベントはそのままクライアントに返す
      peer.send(message.toString());
    });
  },
  message(peer, message) {
    // クライアントイベインとはそのままRealtime APIに中継する
    connections[peer.id].send(message.text());
  },
  close(peer) {
    connections[peer.id].close();
    connections[peer.id] = undefined;
    console.log('closed websocket');
  },
  error(peer, error) {
    console.log('error', { error, id: peer.id });
  },
});
