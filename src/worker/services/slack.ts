interface SlackMessage {
  text: string
  blocks?: Array<{
    type: string
    text?: {
      type: string
      text: string
    }
  }>
}

export async function sendSlackAlert(webhookUrl: string, message: SlackMessage): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`)
  }
}
