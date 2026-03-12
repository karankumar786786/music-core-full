import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MiniPlayer from '../../components/MiniPlayer';

export default function TabLayout() {
  return (
    <View className="flex-1 bg-black">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#050505',
            borderTopColor: '#121212',
            borderTopWidth: 1,
            height: 90,
            paddingBottom: 30,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: '#00FF85',
          tabBarInactiveTintColor: '#52525b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.2,
          },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="userPlaylists"
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="favourites"
          options={{
            title: 'Favourites',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>
      {/* Mini Player sits above tab bar */}
      <View className="absolute bottom-[88px] left-0 right-0">
        <MiniPlayer />
      </View>
    </View>
  );
}
