import { Client } from "@colyseus/sdk";
import { Room } from "colyseus";


export default class NetworkClient {
  private room?: Room;
  private client : Client;

  constructor(private url: string) {
    this.client = new Client(url);
  }

  async connect() {
    try {
      const room = await this.client.joinOrCreate("my_room");
      console.log("joined successfully", room);
    } catch (e) {
      console.error("join error", e);
    }
  }

}
