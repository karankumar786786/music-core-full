import { View, Text, ScrollView } from "react-native";

export default function Home() {
  return (
    <ScrollView className="flex-1 bg-black">
      <View className="px-4 pt-14">
        <Text className="text-white text-2xl font-bold mb-2">
          Hello 👋
        </Text>
        <Text className="text-zinc-400 mb-6">
          Welcome to your music app
        </Text>

        <View className="bg-zinc-800 rounded-2xl p-4 mb-4">
          <View className="w-full h-40 bg-green-500 rounded-xl mb-3" />
          <Text className="text-white font-bold text-lg">Featured Playlist</Text>
          <Text className="text-zinc-400 text-sm">Based on your listening</Text>
        </View>

        <Text className="text-white text-lg font-semibold mb-3">
          Recently Played
        </Text>
        {["Chill Mix", "Top Hits", "Workout", "Focus"].map((item) => (
          <View
            key={item}
            className="flex-row items-center gap-4 bg-zinc-800 rounded-xl p-3 mb-3">
            <View className="w-12 h-12 bg-green-500 rounded-lg" />
            <View>
              <Text className="text-white font-medium">{item}</Text>
              <Text className="text-zinc-400 text-sm">Playlist</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}