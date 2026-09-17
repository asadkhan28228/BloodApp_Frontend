# Frontend backend migration

This frontend no longer depends on the Firebase npm package or Firebase configuration files.
Authentication, registration, profile reads/updates and data operations are routed to the ASP.NET Core API through `src/lib/api.ts` and `src/lib/backendCompat.ts`.
Real-time in-app notifications use SignalR through `src/services/signalRService.ts`.

Set `EXPO_PUBLIC_API_URL` when needed, for example:
`EXPO_PUBLIC_API_URL=http://192.168.1.10:5097`

After replacing the project files run:
`npm install`
`npx expo start -c`
