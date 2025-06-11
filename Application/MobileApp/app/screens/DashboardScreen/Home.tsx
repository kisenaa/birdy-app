/* eslint-disable react-native/no-inline-styles */
import { FC, useEffect, useState } from "react"
import { TextStyle, View, Image, Alert, ViewStyle } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Screen, Text, Button } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useActionSheet } from "@expo/react-native-action-sheet"

export const Home: FC<DashboardTabScreenProps<"Home">> = function Home(_props) {
  const { themed } = useAppTheme()
  const { navigation } = _props
  const { bottom } = useSafeAreaInsets()
  const [image, setImage] = useState<string | null>(null)
  const [tabBarVisible, setTabBarVisible] = useState(true)

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: tabBarVisible ? themed([$tabBar, { height: bottom + 70 }]) : { display: "none" },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabBarVisible])

  const mediaTypes: ImagePicker.MediaType[] = ["images", "videos", "livePhotos"]
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypes,
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri)
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required to take a photo.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri)
    }
  }

  const { showActionSheetWithOptions } = useActionSheet()

  const onPress = () => {
    const options = ["Delete", "Save", "Cancel"]
    const destructiveButtonIndex = 0
    const cancelButtonIndex = 2

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (selectedIndex: number) => {
        switch (selectedIndex) {
          case 1:
            // Save
            break

          case destructiveButtonIndex:
            // Delete
            break

          case cancelButtonIndex:
          // Canceled
        }
      },
    )
  }

  return (
    <Screen preset="scroll" contentContainerStyle={$styles.container} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Bird Detection" style={themed($title)} />
      <Text
        preset="subheading"
        text="Detect birds using your camera or gallery"
        style={themed($title)}
      />
      <Button
        text={tabBarVisible ? "Hide Tab Bar" : "Show Tab Bar"}
        onPress={() => setTabBarVisible((v) => !v)}
        style={{ marginTop: 16 }}
      />
      <Button text="Menu" onPress={onPress} style={{ marginBottom: 16 }} />
      <Button text="Open Camera" onPress={takePhoto} style={{ marginBottom: 16 }} />
      <Button text="Pick from Gallery" onPress={pickImage} />
      {image && (
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Image source={{ uri: image }} style={{ width: 250, height: 250, borderRadius: 8 }} />
        </View>
      )}
    </Screen>
  )
}

const $title: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $tabBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopColor: colors.transparent,
})
