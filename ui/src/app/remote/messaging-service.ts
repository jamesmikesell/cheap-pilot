import { Injectable } from "@angular/core";
import mqtt from "mqtt";
import { timer } from "rxjs";
import { ConfigService } from "../service/config.service";
import { Encryption } from "./encryption";

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  private client: mqtt.MqttClient;
  private readonly encryption = new Encryption();
  private lastCheckPassword: string;
  private hashedTopicsHandlers = new Map<string, (payload: any) => void>();
  private clearTopicsHandlers = new Map<string, (payload: any) => void>();

  constructor(
    private configService: ConfigService,
  ) {
    timer(0, 1000)
      .subscribe(async () => {
        if (this.configService.config.remoteReceiverMode != undefined) {
          this.connectOrRepair();
        } else {
          this.ensureDisconnected();
        }
      });
  }


  async sendMessage(topic: string, payload: any): Promise<void> {
    let currentPassword = this.configService.config.remotePassword;
    let encryptedDto = await this.encryption.encryptData(JSON.stringify(payload), currentPassword);
    let hashedTopic = await this.hashTopic(currentPassword, topic)
    this.client.publish(hashedTopic, encryptedDto);
  }


  addMessageHandler(topic: string, handler: (payload: any) => void): void {
    this.clearTopicsHandlers.set(topic, handler)
    this.resetSubscriptions();
  }


  removeMessageHandler(topic: string): void {
    this.clearTopicsHandlers.delete(topic)
    this.resetSubscriptions();
  }


  private ensureDisconnected(): void {
    if (this.client) {
      this.client.endAsync(true);
      this.client = undefined;
      this.lastCheckPassword = undefined;
    }
  }


  private async connectOrRepair(): Promise<void> {
    if (!this.client) {
      this.client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");

      this.client.on("message", async (hashedTopic, encryptedPayload) => {
        this.handleMessage(hashedTopic, encryptedPayload)
      });
    }

    let currentPassword = this.configService.config.remotePassword;
    if (currentPassword !== this.lastCheckPassword) {
      console.log("password changed, resubscribing to all topics")
      this.resetSubscriptions();
    }

    this.lastCheckPassword = this.configService.config.remotePassword;
  }


  private async resetSubscriptions(): Promise<void> {
    if (!this.client)
      return

    if (this.hashedTopicsHandlers.size)
      this.client.unsubscribe([...this.hashedTopicsHandlers.keys()])

    this.hashedTopicsHandlers.clear()
    let keyValuePairs = [...this.clearTopicsHandlers.entries()];
    for (let i = 0; i < keyValuePairs.length; i++) {
      const key = keyValuePairs[i][0];
      const value = keyValuePairs[i][1];

      this.hashedTopicsHandlers.set(await this.hashTopic(this.configService.config.remotePassword, key), value);
    }

    if (this.hashedTopicsHandlers.size)
      this.client.subscribe([...this.hashedTopicsHandlers.keys()], (err: any) => { if (err) console.error(err) })
  }


  private async handleMessage(hashedTopic: string, encryptedPayload: Buffer): Promise<void> {
    let payload = JSON.parse(await this.encryption.decryptData(encryptedPayload.toString(), this.configService.config.remotePassword));

    let topicHandler = this.hashedTopicsHandlers.get(hashedTopic);
    if (topicHandler)
      topicHandler(payload);
    else
      console.error("Unknown topic", hashedTopic)
  }



  private hashTopic(password: string, topic: string): Promise<string> {
    let topicString = `cheap-pilot/${password}/${topic}`;
    return Encryption.hashString(topicString);
  }

}

