import { FC, useState, useMemo, memo, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  Dimensions,
  FlatList,
  Image,
  ImageStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native"
import { Screen, Text } from "../../components"
import { DashboardTabScreenProps } from "../../navigators/DashboardNavigator"
import { $styles } from "../../theme"
import type { ThemedStyle } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import { Searchbar, Card, Chip } from "react-native-paper"
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated"

const { width: screenWidth } = Dimensions.get("window")
const imageWidth = screenWidth - 32 // Account for padding

interface BirdSpecies {
  id: string
  name: string
  scientificName: string
  images: any[] // Change from string[] to any[] for require() statements
  description: string
  habitat: string
  status: string
}

// Sample bird data - replace with your actual data
const birdData: BirdSpecies[] = [
  {
    id: "1",
    name: "Javan Myna",
    scientificName: "Acridotheres javanicus",
    images: [
      require("../../../assets/images/bird/javanmyna1.jpg"),
      require("../../../assets/images/bird/javanmyna2.jpg"),
      require("../../../assets/images/bird/javanmyna3.jpg"),
      require("../../../assets/images/bird/javanmyna4.jpg"),
      require("../../../assets/images/bird/javanmyna5.jpeg"),
    ],
    description:
      "The Javan myna is a member of the starling family. It is native to Bali and Java and has been introduced widely elsewhere.",
    habitat: "Urban areas, parks, gardens",
    status: "Least Concern",
  },
  {
    id: "2",
    name: "Sumatran Broadbill",
    scientificName: "Calyptomena viridis",
    images: [
      require("../../../assets/images/bird/sumatranbroadbill1.jpg"),
      require("../../../assets/images/bird/sumatranbroadbill2.jpg"),
      require("../../../assets/images/bird/sumatranbroadbill3.jpg"),
      require("../../../assets/images/bird/sumatranbroadbill4.jpg"),
      require("../../../assets/images/bird/sumatranbroadbill6.jpg"),
    ],
    description: "The Green Broadbill is a small, approximately 17cm long, brilliant green bird with a black ear patch.",
    habitat: "Tropical rainforest",
    status: "Near Threatened",
  },
]

const AnimatedCard = Animated.createAnimatedComponent(Card)

interface BirdCardProps {
  bird: BirdSpecies
  index: number
}

const AnimatedDot = memo<{ dotIndex: number; scrollX: Animated.SharedValue<number>; themed: any }>(
  ({ dotIndex, scrollX, themed }) => {
    const animatedDotStyle = useAnimatedStyle(() => {
      const inputRange = [(dotIndex - 1) * imageWidth, dotIndex * imageWidth, (dotIndex + 1) * imageWidth]

      const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP)
      const scale = interpolate(scrollX.value, inputRange, [0.8, 1.2, 0.8], Extrapolation.CLAMP)

      return {
        opacity,
        transform: [{ scale }],
      }
    }, [dotIndex])

    return <Animated.View style={[themed($indicator), animatedDotStyle]} />
  },
)
AnimatedDot.displayName = "AnimatedDot"

// Fixed: Move hooks to component level and create proper Image Slider component
const ImageSlider = memo<{ images: any[]; birdId: string }>(({ images, birdId }) => {
  const { themed } = useAppTheme()
  const scrollX = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  const renderImageItem = useCallback(
    ({ item, index: imageIndex }: { item: any; index: number }) => (
      <Animated.View entering={SlideInRight.delay(imageIndex * 100)} style={themed($imageContainer)}>
        <Image source={item} style={themed($birdImage)} resizeMode="cover" />
      </Animated.View>
    ),
    [themed],
  )

  const keyExtractor = useCallback((item: any, idx: number) => `${birdId}-image-${idx}`, [birdId])

  if (!images || images.length === 0) {
    return (
      <View style={themed($placeholderImage)}>
        <Text style={themed($placeholderText)}>No images available</Text>
      </View>
    )
  }

  return (
    <View style={themed($imageSliderContainer)}>
      <Animated.FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={renderImageItem}
        keyExtractor={keyExtractor}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      />

      <View style={themed($indicatorContainer)}>
        {images.map((_, dotIndex) => (
          <AnimatedDot key={dotIndex} dotIndex={dotIndex} scrollX={scrollX} themed={themed} />
        ))}
      </View>
    </View>
  )
})
ImageSlider.displayName = "ImageSlider"

const BirdCard = memo<BirdCardProps>(({ bird, index }) => {
  const { themed } = useAppTheme()

  return (
    <AnimatedCard entering={FadeInDown.delay(index * 150).springify()} style={themed($birdCard)}>
      <Card.Content style={themed($cardContent)}>
        {/* Bird Name and Scientific Name */}
        <Animated.View entering={FadeIn.delay(index * 200)}>
          <Text style={themed($birdName)}>{bird.name}</Text>
          <Text style={themed($scientificName)}>{bird.scientificName}</Text>
        </Animated.View>

        {/* Status Chip */}
        <Animated.View entering={FadeIn.delay(index * 250)} style={themed($statusContainer)}>
          <Chip icon="shield-check" textStyle={themed($chipText)} style={themed($statusChip)}>
            {bird.status}
          </Chip>
        </Animated.View>

        {/* Image Slider */}
        <ImageSlider images={bird.images} birdId={bird.id} />

        {/* Description */}
        <Animated.View entering={FadeIn.delay(index * 300)}>
          <Text style={themed($sectionTitle)}>Description</Text>
          <Text style={themed($description)}>{bird.description}</Text>
        </Animated.View>

        {/* Habitat */}
        <Animated.View entering={FadeIn.delay(index * 350)}>
          <Text style={themed($sectionTitle)}>Habitat</Text>
          <Text style={themed($habitat)}>{bird.habitat}</Text>
        </Animated.View>
      </Card.Content>
    </AnimatedCard>
  )
})
BirdCard.displayName = "BirdCard"

export const DemoCommunityScreen: FC<DashboardTabScreenProps<"DemoCommunity">> = function DemoCommunityScreen(_props) {
  const { themed } = useAppTheme()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBirds = useMemo(() => {
    if (!searchQuery.trim()) return birdData

    return birdData.filter(
      (bird) =>
        bird.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bird.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bird.habitat.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery])

  const renderBirdCard = useCallback(
    ({ item, index }: { item: BirdSpecies; index: number }) => <BirdCard bird={item} index={index} />,
    [],
  )

  const keyExtractor = useCallback((item: BirdSpecies) => item.id, [])

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.container} safeAreaEdges={["top"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={themed($header)}>
        <Text preset="heading" style={themed($title)}>
          Bird Encyclopedia
        </Text>
        <Text style={themed($subtitle)}>Discover the beauty of avian diversity</Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100)} style={themed($searchContainer)}>
        <Searchbar
          placeholder="Search birds, species, habitat..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={themed($searchBar)}
          inputStyle={themed($searchInput)}
          icon="magnify"
          clearIcon="close"
          elevation={2}
        />
      </Animated.View>

      {/* Results Count */}
      {searchQuery.trim() && (
        <Animated.View entering={FadeIn} style={themed($resultsContainer)}>
          <Text style={themed($resultsText)}>
            {filteredBirds.length} {filteredBirds.length === 1 ? "species" : "species"} found
          </Text>
        </Animated.View>
      )}

      {/* Bird List - Using FlatList for better performance */}
      <FlatList
        data={filteredBirds}
        renderItem={renderBirdCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={themed($birdList)}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        initialNumToRender={2}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={themed($emptyState)}>
            <Text style={themed($emptyStateText)}>No birds found matching your search</Text>
            <Text style={themed($emptyStateSubtext)}>Try adjusting your search terms</Text>
          </Animated.View>
        }
      />
    </Screen>
  )
}

// Styled Components (same as before)
const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  alignItems: "center",
})

const $title: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginBottom: spacing.xs,
  color: colors.text,
  textAlign: "center",
  fontSize: 28,
  fontWeight: "700",
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
  fontSize: 16,
  fontStyle: "italic",
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $searchBar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
})

const $searchInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $resultsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
  alignItems: "center",
})

const $resultsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
})

const $birdList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.lg,
})

const $birdCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  elevation: 4,
  shadowColor: colors.palette.neutral900,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  marginBottom: spacing.md,
})

const $cardContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
})

const $birdName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 24,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.xs,
})

const $scientificName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontStyle: "italic",
  color: colors.textDim,
  marginBottom: spacing.sm,
})

const $statusContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
  alignItems: "flex-start",
})

const $statusChip: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.accent300,
})

const $chipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
})

const $imageSliderContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $imageContainer: ThemedStyle<ViewStyle> = () => ({
  width: imageWidth,
  height: 250,
  borderRadius: 12,
  overflow: "hidden",
})

const $birdImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
  borderRadius: 12,
})

const $placeholderImage: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: imageWidth,
  height: 250,
  backgroundColor: colors.palette.neutral300,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
})

const $placeholderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 16,
})

const $indicatorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: spacing.sm,
  gap: spacing.xs,
})

const $indicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.tint,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
  marginTop: spacing.sm,
})

const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  lineHeight: 24,
  color: colors.text,
  marginBottom: spacing.sm,
})

const $habitat: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  padding: spacing.xl,
})

const $emptyStateText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
  textAlign: "center",
})

const $emptyStateSubtext: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
})
