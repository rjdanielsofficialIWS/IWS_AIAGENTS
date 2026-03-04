export const handler = async () => {

  const response = await fetch(
    "https://api.postiz.com/public/v1/integrations",
    {
      headers: {
        Authorization: `Bearer ${process.env.POSTIZ_ACCESS_TOKEN}`
      }
    }
  )

  const data = await response.json()

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  }
}