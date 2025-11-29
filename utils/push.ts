export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, any>) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: 'default',
      }),
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}
