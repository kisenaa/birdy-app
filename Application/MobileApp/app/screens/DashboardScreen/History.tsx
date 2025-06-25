import { FC, useEffect, useRef, useState } from "react"
import { FlatList, TextInput, TextInput as RNTextInput, View, ViewStyle, TextStyle, StyleSheet } from "react-native"
import Animated, { useAnimatedKeyboard, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated"
import { Screen, Text, Button } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { fetchChatbotResponse } from "@/services/api/chatbotAPI"
import { Avatar, Card, IconButton } from "react-native-paper"

interface Message {
  id: string
  text: string
  sender: "bot" | "user"
  isTyping?: boolean
}

export const History: FC<DashboardTabScreenProps<"History">> = function History(_props) {
  const { themed, theme } = useAppTheme()
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<RNTextInput>(null)
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Hello! I'm your AI assistant. How can I help you today? 😊", sender: "bot" },
  ])

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

    const userMessage: Message = { id: `${Date.now()}-user`, text: userInput, sender: "user" }
    setMessages((prev) => [...prev, userMessage])
    setUserInput("")

    // Show typing indicator
    const loadingMessage: Message = { id: `${Date.now()}-loading`, text: "Bot is typing...", sender: "bot", isTyping: true }
    setMessages((prev) => [...prev, loadingMessage])

    try {
      const botReply = await (await fetchChatbotResponse(userInput)).trim()
      setMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? { ...msg, text: botReply, isTyping: false } : msg)))
    } catch (error) {
      console.log("Error fetching chatbot response:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? { ...msg, text: "Sorry, I couldn't get a response. Please try again! 😔", isTyping: false }
            : msg,
        ),
      )
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={themed(item.sender === "bot" ? $botMessageContainer : $userMessageContainer)}>
      {item.sender === "bot" && <Avatar.Icon size={36} icon="robot" style={themed($botAvatar)} />}

      <Card style={themed(item.sender === "bot" ? $botCard : $userCard)}>
        <Card.Content style={themed($cardContent)}>
          {item.isTyping ? (
            <View style={themed($typingIndicator)}>
              <Text text="●" style={themed($typingDot)} />
              <Text text="●" style={themed($typingDot)} />
              <Text text="●" style={themed($typingDot)} />
            </View>
          ) : (
            <Text text={item.text} style={themed(item.sender === "bot" ? $botText : $userText)} />
          )}
        </Card.Content>
      </Card>

      {item.sender === "user" && <Avatar.Icon size={36} icon="account" style={themed($userAvatar)} />}
    </View>
  )

  useEffect(() => {
    scrollToEnd()
  }, [messages])

  return (
    <View style={$styles.flex1}>
      <Screen preset="fixed" contentContainerStyle={[$styles.container, $styles.flex1]} safeAreaEdges={["top"]}>
        <View style={themed($header)}>
          <Text preset="heading" text="AI Assistant" style={themed($title)} />
          <View style={themed($statusIndicator)}>
            <View style={themed($onlineDot)} />
            <Text text="Online" style={themed($statusText)} />
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[themed($chatContainer), { paddingBottom: 100 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          scrollEnabled
        />
      </Screen>

      <Animated.View style={[styles.inputBar, themed($inputContainer), inputBarStyle]}>
        <Card style={themed($inputCard)}>
          <View style={themed($inputRow)}>
            <TextInput
              ref={inputRef}
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={handleSendMessage}
              placeholder="Type your message..."
              style={themed($textInput)}
              placeholderTextColor={theme.isDark ? "white" : "gray"}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
            <IconButton
              icon="send"
              size={20} // Slightly smaller
              onPress={handleSendMessage}
              disabled={!userInput.trim()}
              iconColor={userInput.trim() ? theme.colors.tint : theme.colors.textDim}
              style={themed($sendButton)}
            />
          </View>
        </Card>
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
const $header: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.surface,
  borderBottomWidth: 1,
  borderBottomColor: colors.outline + "20",
  elevation: 2,
  marginBottom: spacing.md,
})

const $headerAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primary,
  marginRight: 8,
})

const $title: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  flex: 1,
  textAlign: "center",
  color: colors.onSurface,
  fontWeight: "600",
})

const $statusIndicator: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
})

const $onlineDot: ThemedStyle<ViewStyle> = () => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#4CAF50",
  marginRight: 4,
})

const $statusText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.onSurface + "80",
})

const $chatContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xm,
  paddingTop: spacing.sm,
})

const $botMessageContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  marginBottom: spacing.md,
  maxWidth: "85%",
})

const $userMessageContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  justifyContent: "flex-end",
  marginBottom: spacing.md,
  maxWidth: "80%",
  alignSelf: "flex-end",
})

const $botAvatar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.primary,
  marginRight: spacing.xs,
})

const $userAvatar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.secondary,
  marginLeft: spacing.xs,
})

const $botCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.surface,
  elevation: 1,
  flex: 1,
})

const $userCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.primary,
  elevation: 2,
  flex: 1,
})

const $cardContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
})

const $botText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.onSurface,
  fontSize: 16,
  lineHeight: 22,
})

const $userText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.onPrimary,
  fontSize: 16,
  lineHeight: 22,
})

const $typingIndicator: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
})

const $typingDot: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.onSurface + "60",
  fontSize: 20,
  marginHorizontal: 2,
})

const $inputContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  paddingHorizontal: spacing.sm, // Reduced from spacing.md
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
})

const $inputCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  elevation: 0, // Remove elevation for cleaner look
  borderRadius: 14, // More rounded like original
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
})

const $inputRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center", // Changed from flex-end to center
  paddingLeft: spacing.md, // More padding on left
  paddingRight: spacing.xs, // Less padding on right for send button
  paddingVertical: spacing.xs,
  minHeight: 50, // Ensure consistent height
})

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  color: colors.text,
  fontSize: 16,
  lineHeight: 20,
  maxHeight: 100,
  paddingVertical: spacing.sm,
  paddingHorizontal: 0, // Remove horizontal padding since container handles it
  textAlignVertical: "center",
})

const $sendButton: ThemedStyle<ViewStyle> = () => ({
  margin: 0,
  backgroundColor: "rgba(0,0,0,0.05)", // Subtle background
  borderRadius: 20,
})
