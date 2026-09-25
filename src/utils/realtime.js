// A small in-process Server-Sent Events hub.  Events intentionally contain no
// record data; clients re-fetch through their normal authenticated APIs.
const clients = new Set();

export const addRealtimeClient = (res) => {
  clients.add(res);
  return () => clients.delete(res);
};

export const publishDataChange = (change) => {
  const message = `event: data-change\ndata: ${JSON.stringify({ ...change, at: Date.now() })}\n\n`;
  for (const client of clients) {
    if (!client.writableEnded) client.write(message);
  }
};
