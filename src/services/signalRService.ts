import * as signalR from "@microsoft/signalr";
import { API_BASE_URL, getAccessToken } from "@/src/lib/api";

export type SignalRNotification = Record<string, any>;

let connection: signalR.HubConnection | null = null;

export async function startNotificationConnection(
  onPrivate: (notification: SignalRNotification) => void,
  onCommunity: (notification: SignalRNotification) => void,
): Promise<signalR.HubConnection> {
  const token = await getAccessToken();
  if (!token) throw new Error("Access token not found.");

  if (connection) {
    connection.off("ReceiveNotification");
    connection.off("CommunityNotification");
    if (connection.state !== signalR.HubConnectionState.Disconnected) {
      await connection.stop();
    }
    connection = null;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/notificationHub`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on("ReceiveNotification", (notification: SignalRNotification) => {
    onPrivate(notification);
  });
  connection.on("CommunityNotification", (notification: SignalRNotification) => {
    onCommunity(notification);
  });

  connection.onreconnected(() => console.log("SignalR notifications reconnected"));
  connection.onclose((error?: Error) => {
    if (error) console.warn("SignalR notifications closed", error);
  });

  await connection.start();
  console.log("SignalR notifications connected");
  return connection;
}

export async function stopNotificationConnection(): Promise<void> {
  if (!connection) return;
  connection.off("ReceiveNotification");
  connection.off("CommunityNotification");
  try {
    if (connection.state !== signalR.HubConnectionState.Disconnected) {
      await connection.stop();
    }
  } finally {
    connection = null;
  }
}
