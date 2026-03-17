import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCoverImageUrl } from '../lib/s3';
import { capitalize } from '../lib/utils';
import { usePlayer } from '../lib/player-context';

interface SongRowProps {
  song: any;
  index: number;
  onPress?: () => void;
  renderRightAction?: () => React.ReactNode;
}

export default function SongRow({ song, index, onPress, renderRightAction }: SongRowProps) {
  const { play } = usePlayer();
  const coverUrl = song.coverUrl || getCoverImageUrl(song.storageKey, 'small', true) || null;

  const openPlayer = () => {
    const largeCoverUrl = song.coverUrl || getCoverImageUrl(song.storageKey, 'large', true) || null;
    play({
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      storageKey: song.storageKey,
      coverUrl: largeCoverUrl,
    });
    if (onPress) {
      onPress();
    }
  };

  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={openPlayer}
        className="flex-1 flex-row items-center gap-4 rounded-[20px] px-4 py-3.5 active:bg-white/[0.04]">
        <Text className="w-6 text-center text-xs font-black text-zinc-700">
          {String(index + 1).padStart(2, '0')}
        </Text>

        <View className="h-14 w-14 overflow-hidden rounded-2xl bg-white/[0.03] shadow-lg">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary/10">
              <Ionicons name="musical-notes" size={24} color="#00FF85" />
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-black tracking-tight text-white" numberOfLines={1}>
            {capitalize(song.title)}
          </Text>
          <Text className="mt-0.5 text-xs font-bold text-zinc-400" numberOfLines={1}>
            {capitalize(song.artistName)}
          </Text>
        </View>
      </Pressable>

      {renderRightAction && (
        <View className="pr-4">
          {renderRightAction()}
        </View>
      )}
    </View>
  );
}
