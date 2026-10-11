
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL, getAccessToken } from "@/src/lib/api";

export type SignalRNotification = Record<string, any>;

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;

let privateHandler:
  | ((notification: SignalRNotification) => void)
  | null = null;

let communityHandler:
  | ((notification: SignalRNotification) => void)
  | null = null;

export async function startNotificationConnection(
  onPrivate: (notification: SignalRNotification) => void,
  onCommunity: (notification: SignalRNotification) => void
): Promise<signalR.HubConnection> {
  privateHandler = onPrivate;
  communityHandler = onCommunity;

  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/notificationHub`, {
        accessTokenFactory: async () => {
          const token = await getAccessToken();

          if (!token) {
            throw new Error("Access token not found.");
          }

          return token;
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on(
      "ReceiveNotification",
      (notification: SignalRNotification) => {
        privateHandler?.(notification);
      }
    );

    connection.on(
      "CommunityNotification",
      (notification: SignalRNotification) => {
        communityHandler?.(notification);
      }
    );

    connection.onreconnecting((error) => {
      console.warn(
        "SignalR reconnecting:",
        error?.message ?? "Connection interrupted"
      );
    });

    connection.onreconnected(() => {
      console.log("SignalR notifications reconnected");
    });

    connection.onclose((error) => {
      console.warn(
        "SignalR connection closed:",
        error?.message ?? "Disconnected"
      );
    });
  }

  const hub = connection;

  if (hub.state === signalR.HubConnectionState.Connected) {
    return hub;
  }

  if (!startPromise) {
    startPromise = (async () => {
      if (hub.state === signalR.HubConnectionState.Disconnected) {
        await hub.start();
        console.log("SignalR notifications connected");
      }
    })().finally(() => {
      startPromise = null;
    });
  }

  await startPromise;

  return hub;
}

export async function stopNotificationConnection(): Promise<void> {
  privateHandler = null;
  communityHandler = null;

  const hub = connection;

  if (!hub) return;

  try {
    if (startPromise) {
      await startPromise.catch(() => undefined);
    }

    if (
      hub.state !== signalR.HubConnectionState.Disconnected &&
      hub.state !== signalR.HubConnectionState.Disconnecting
    ) {
      await hub.stop();
    }
  } catch (error) {
    console.warn("SignalR stop error:", error);
  } finally {
    if (connection === hub) {
      connection = null;
    }
  }
}
