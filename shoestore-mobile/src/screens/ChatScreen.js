import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';

const { width } = Dimensions.get('window');

const QUICK_PROMPTS = [
  "Tư vấn cách chọn size giày",
  "Chính sách đổi trả hàng như thế nào?",
  "Mẫu giày chạy bộ nào tốt nhất?",
  "Có khuyến mãi gì hot hôm nay?"
];

export default function ChatScreen({ navigation }) {
  const [inputText, setInputText] = useState('');
  const [botLoading, setBotLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý ảo AI của ShoeStore. Tôi có thể giúp gì cho bạn?',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, botLoading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setBotLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message: text.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        const botReply = {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: data.reply || 'Tôi đã tiếp nhận ý kiến của bạn, nhưng chưa thể tìm ra phản hồi phù hợp.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botReply]);
      } else {
        throw new Error('API server returned error');
      }
    } catch (e) {
      console.log("Chatbot API Connection Failed:", e.message);

      const botReply = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botReply]);
    } finally {
      setBotLoading(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isBot = item.sender === 'bot';
    return (
      <View style={[styles.messageRow, isBot ? styles.botRow : styles.userRow]}>
        {isBot && (
          <View style={styles.botAvatarWrapper}>
            <MaterialCommunityIcons name="robot" size={16} color="#FFFFFF" />
          </View>
        )}
        <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isBot ? styles.botTime : styles.userTime]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.circleHeaderBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.navHeaderTitle}>Trợ Lý AI ShoeStore</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Đang hoạt động</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* MESSAGES FLATLIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            botLoading && (
              <View style={styles.botLoadingContainer}>
                <View style={styles.botAvatarWrapper}>
                  <MaterialCommunityIcons name="robot" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.botLoadingBubble}>
                  <ActivityIndicator size="small" color="#E51E25" style={{ marginRight: 6 }} />
                  <Text style={styles.botLoadingText}>ShoeStore Bot đang trả lời...</Text>
                </View>
              </View>
            )
          }
        />

        {/* QUICK SUGGESTIONS CHIPS */}
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(prompt)}
                disabled={botLoading}
              >
                <Text style={styles.suggestionChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CHAT INPUT AREA */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Viết tin nhắn cho trợ lý ảo..."
            placeholderTextColor="#B0B0B0"
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
            maxHeight={100}
            editable={!botLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || botLoading) && styles.sendBtnDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || botLoading}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  circleHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  navHeaderTitle: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  statusText: {
    color: '#808080',
    fontSize: 10,
    fontWeight: '700',
  },
  chatListContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  botRow: {
    alignSelf: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  botAvatarWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  botBubble: {
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#E51E25',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: '#000000',
    fontWeight: '500',
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 8,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  botTime: {
    color: '#808080',
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  botLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  botLoadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  botLoadingText: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 10,
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FAF9FB',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginRight: 8,
  },
  suggestionChipText: {
    color: '#E51E25',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#EAEAEA',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAF9FB',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E51E25',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E51E25',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#EAEAEA',
    shadowColor: 'transparent',
    elevation: 0,
  }
});
