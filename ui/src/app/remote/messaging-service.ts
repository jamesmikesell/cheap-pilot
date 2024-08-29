import { Injectable } from "@angular/core";
import mqtt from "mqtt";
import { Subject, timer } from "rxjs";
import { ConfigService } from "../service/config.service";
import { Encryption } from "./encryption";

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  private client: mqtt.MqttClient;
  private readonly encryption = new Encryption();
  private lastCheckPassword: string;
  private hashedTopicsHandlers = new Map<string, Subject<any>>();
  private clearTopicsHandlers = new Map<string, Subject<any>>();
  private readonly MAX_MESSAGE_AGE_SECONDS = 30;
  private receivedMessageKeys = new Map<string, Date>();

  constructor(
    private configService: ConfigService,
  ) {
    timer(0, 1000)
      .subscribe(async () => {
        this.purgeOldMessageKeys();
        if (this.configService.config.remoteReceiverMode != undefined) {
          this.connectOrRepair();
        } else {
          this.ensureDisconnected();
        }
      });
  }


  private purgeOldMessageKeys() {
    this.receivedMessageKeys.forEach((date, key) => {
      if ((Date.now() - date.getTime()) > this.MAX_MESSAGE_AGE_SECONDS * 1000)
        this.receivedMessageKeys.delete(key);
    });
  }


  async sendMessage(topic: string, payload: any): Promise<void> {
    let currentPassword = this.configService.config.remotePassword;
    let wrappedMessage: MessageWrapper = {
      payload: payload,
      transmissionTime: Date.now(),
      messageKey: `${Date.now()}|${Math.random()}`
    }
    let encryptedDto = await this.encryption.encryptData(JSON.stringify(wrappedMessage), currentPassword);
    let hashedTopic = await this.hashTopic(currentPassword, topic)
    this.client.publish(hashedTopic, encryptedDto as any);
  }


  getMessagesForTopic(topic: string): Subject<any> {
    if (this.clearTopicsHandlers.has(topic))
      return this.clearTopicsHandlers.get(topic);

    let subject = new Subject<any>();
    this.clearTopicsHandlers.set(topic, subject)
    this.resetSubscriptions();

    return subject;
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


  private async handleMessage(hashedTopic: string, encryptedPayload: Uint8Array): Promise<void> {
    let payload: MessageWrapper = JSON.parse(await this.encryption.decryptData(encryptedPayload, this.configService.config.remotePassword));
    if ((Date.now() - payload.transmissionTime) > this.MAX_MESSAGE_AGE_SECONDS * 1000) {
      console.log("stale message received, ignoring")
      return;
    }
    if (this.receivedMessageKeys.has(payload.messageKey)) {
      console.log("duplicate message received, ignoring")
      return;
    }

    this.receivedMessageKeys.set(payload.messageKey, new Date(payload.transmissionTime))

    let topicHandler = this.hashedTopicsHandlers.get(hashedTopic);
    if (topicHandler)
      topicHandler.next(payload.payload);
    else
      console.error("Unknown topic", hashedTopic)
  }



  private hashTopic(password: string, topic: string): Promise<string> {
    let topicString = `cheap-pilot/${password}/${topic}`;
    return Encryption.hashString(topicString);
  }

}


interface MessageWrapper {
  payload: any;
  transmissionTime: number;
  messageKey: string;
}