export async function fetchChatbotResponse(prompt: string): Promise<string> {
  try {
    console.log("Fetching chatbot response for prompt:", prompt)
    const response = await fetch("http://10.125.181.235:8085/core/chatbot", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Server error")
    }

    const data = await response.json()
    return data.result // Assuming the response is { "result": "..." }
  } catch (err: any) {
    console.error("Error fetching chatbot response:", err)
    throw err
  }
}
