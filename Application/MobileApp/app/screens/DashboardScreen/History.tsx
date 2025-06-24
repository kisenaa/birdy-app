import { FC, useEffect, useRef, useState } from "react"
import { FlatList, TextInput, TextInput as RNTextInput, View, ViewStyle, TextStyle, StyleSheet } from "react-native"
import Animated, { useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated"
import { Screen, Text, Button } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { fetchChatbotResponse } from "@/services/api/chatbotAPI"

export const History: FC<DashboardTabScreenProps<"History">> = function History(_props) {
  const { themed, theme } = useAppTheme()
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<RNTextInput>(null)
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState([{ id: "1", text: "Hello, how can I help you?", sender: "bot" }])

  const keyboard = useAnimatedKeyboard()

  const translateY = useDerivedValue(() =>
    withTiming(-Math.max(0, keyboard.height.value), {
      duration: 0,
    }),
  )

  const inputBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    })
  }

  const handleSendMessage = async () => {
    if (!userInput.trim()) return

    const userMessage = { id: `${messages.length + 1}`, text: userInput, sender: "user" }
    setMessages((prev) => [...prev, userMessage])
    setUserInput("")

    // Optionally show a loading message
    const loadingMessage = { id: `${messages.length + 2}`, text: "Bot is typing...", sender: "bot" }
    setMessages((prev) => [...prev, loadingMessage])

    try {
      const botReply = await (await fetchChatbotResponse(userInput)).trim()
      setMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? { ...msg, text: botReply } : msg)))
    } catch (error) {
      console.log("Error fetching chatbot response:", error)
      setMessages((prev) =>
        prev.map((msg) => (msg.id === loadingMessage.id ? { ...msg, text: "Sorry, I couldn't get a response." } : msg)),
      )
    }
  }

  useEffect(() => {
    scrollToEnd()
  }, [messages])

  return (
    <View style={$styles.flex1}>
      <Screen preset="fixed" contentContainerStyle={[$styles.container, $styles.flex1]} safeAreaEdges={["top"]}>
        <Text preset="heading" text="Chatbot" style={themed($title)} />

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={themed(item.sender === "bot" ? $botBubble : $userBubble)}>
              <Text text={item.text} style={themed($messageText)} />
            </View>
          )}
          contentContainerStyle={[themed($chatContainer), { paddingBottom: 80 }]} // reserve space for input
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator
          scrollEnabled
        />
      </Screen>

      <Animated.View style={[styles.inputBar, themed($inputContainer), inputBarStyle]}>
        <TextInput
          ref={inputRef}
          value={userInput}
          onChangeText={setUserInput}
          onSubmitEditing={handleSendMessage}
          placeholder="Type your message..."
          style={themed($textInput)}
          placeholderTextColor={theme.isDark ? "white" : "gray"}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <Button text="Send" onPress={handleSendMessage} preset="reversed" style={themed($button)} textStyle={themed($boldText)} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  inputBar: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
})

// Themed styles
const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $chatContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
})

const $botBubble: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.palette.neutral300,
  padding: spacing.md,
  borderRadius: spacing.sm,
  marginBottom: spacing.sm,
  alignSelf: "flex-start",
})

const $userBubble: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.palette.primary200,
  padding: spacing.md,
  borderRadius: spacing.sm,
  marginBottom: spacing.sm,
  alignSelf: "flex-end",
})

const $messageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $inputContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderColor: colors.palette.neutral300,
})

const $textInput: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: spacing.sm,
  padding: spacing.sm,
  marginRight: spacing.sm,
  color: colors.text,
})

const $button: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: spacing.sm,
  padding: spacing.sm,
})

const $boldText: ThemedStyle<TextStyle> = () => ({
  fontWeight: "bold",
})
