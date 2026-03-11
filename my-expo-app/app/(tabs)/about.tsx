import { View, Text, ScrollView } from "react-native";

export default function About() {
  return (
    <ScrollView className="flex-1 bg-black">
      <View className="px-4 pt-14">

        {/* Avatar */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-green-500 rounded-full mb-3" />
          <Text className="text-white text-xl font-bold">Music App</Text>
          <Text className="text-zinc-400 text-sm">Version 1.0.0</Text>
        </View>

        {/* Info Cards */}
        <View className="bg-zinc-800 rounded-2xl p-4 mb-4">
          <Text className="text-white font-bold text-lg mb-1">About</Text>
          <Text className="text-zinc-400">
            A beautiful music app built with React Native, Expo Router and NativeWind.
          </Text>
        </View>

        <View className="bg-zinc-800 rounded-2xl p-4 mb-4">
          <Text className="text-white font-bold text-lg mb-3">Built With</Text>
          {["React Native", "Expo Router", "NativeWind", "TypeScript"].map((tech) => (
            <View
              key={tech}
              className="flex-row items-center gap-3 py-2 border-b border-zinc-700">
              <View className="w-2 h-2 bg-green-500 rounded-full" />
              <Text className="text-white">{tech}</Text>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}