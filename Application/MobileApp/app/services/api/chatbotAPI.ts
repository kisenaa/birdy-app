import { rootStoreSingleton } from "@/models"

export async function fetchChatbotResponse(prompt: string): Promise<string> {
  try {
    const apiKey = rootStoreSingleton.authenticationStore.apiKey

    const promptData =
      "You are a helpful, concise chatbot that answers user questions directly and efficiently without unnecessary filler. Do not repeat the question, and avoid small talk unless asked for. Reply in a professional, neutral tone." +
      prompt

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: promptData,
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || "Gemini API error")
    }

    const data = await response.json()
    console.log(data)

    // Optional: inspect structure if needed
    // console.log(JSON.stringify(data, null, 2))

    // Gemini returns something like:
    // { candidates: [ { content: { parts: [ { text: "response here" } ] } } ] }
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini"

    return result
  } catch (err: any) {
    console.error("Error fetching Gemini chatbot response:", err)
    throw err
  }
}
