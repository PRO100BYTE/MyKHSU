import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { getCommunityDrafts, getTeacherFeedback, saveCommunityDraft, saveTeacherFeedback } from '../utils/communityStorage';

const CommunityScreen = ({ theme, accentColor }) => {
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const [drafts, setDrafts] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [teacher, setTeacher] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadData = async () => {
    const [savedDrafts, savedFeedback] = await Promise.all([getCommunityDrafts(), getTeacherFeedback()]);
    setDrafts(savedDrafts);
    setFeedback(savedFeedback);
  };

  useEffect(() => { loadData(); }, []);

  const saveDraft = async () => {
    try {
      await saveCommunityDraft({ title, text });
      setTitle('');
      setText('');
      await loadData();
    } catch {
      Alert.alert('Заполните поля', 'Укажите заголовок и текст материала.');
    }
  };

  const saveFeedback = async () => {
    try {
      await saveTeacherFeedback({ teacher, rating, comment });
      setTeacher('');
      setRating(5);
      setComment('');
      await loadData();
    } catch {
      Alert.alert('Заполните поля', 'Укажите преподавателя, оценку и текст отзыва.');
    }
  };

  const inputStyle = {
    color: glass.text,
    borderColor: glass.borderStrong,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 8,
  };

  const cardStyle = { backgroundColor: glass.surfaceCard, borderColor: glass.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: glass.background }} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="people-outline" size={22} color={colors.primary} />
          <Text style={{ color: glass.text, fontFamily: 'Montserrat_700Bold', fontSize: 18, marginLeft: 10 }}>Сообщество ИТИ</Text>
        </View>
        <Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', marginTop: 10, lineHeight: 20 }}>
          Локальная подготовка материалов и отзывов. Публикация для других пользователей появится после подключения сервера, авторизации и модерации.
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 16 }}>Материал или конспект</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Заголовок" placeholderTextColor={glass.textTertiary} style={inputStyle} />
        <TextInput value={text} onChangeText={setText} placeholder="Текст или ссылка на материал" placeholderTextColor={glass.textTertiary} multiline style={[inputStyle, { minHeight: 92, textAlignVertical: 'top' }]} />
        <TouchableOpacity onPress={saveDraft} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: '#fff', fontFamily: 'Montserrat_600SemiBold' }}>Сохранить локально</Text>
        </TouchableOpacity>
        {drafts.map((item) => <View key={item.id} style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: glass.border, paddingTop: 12 }}><Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold' }}>{item.title}</Text><Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>{item.text}</Text></View>)}
      </View>

      <View style={cardStyle}>
        <Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold', fontSize: 16 }}>Анонимный отзыв о преподавателе</Text>
        <TextInput value={teacher} onChangeText={setTeacher} placeholder="Преподаватель" placeholderTextColor={glass.textTertiary} style={inputStyle} />
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {[1, 2, 3, 4, 5].map((value) => <TouchableOpacity key={value} onPress={() => setRating(value)} style={{ marginRight: 8 }}><Icon name={value <= rating ? 'star' : 'star-outline'} size={26} color={value <= rating ? '#F59E0B' : glass.textTertiary} /></TouchableOpacity>)}
        </View>
        <TextInput value={comment} onChangeText={setComment} placeholder="Комментарий" placeholderTextColor={glass.textTertiary} multiline style={[inputStyle, { minHeight: 92, textAlignVertical: 'top' }]} />
        <TouchableOpacity onPress={saveFeedback} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: '#fff', fontFamily: 'Montserrat_600SemiBold' }}>Сохранить отзыв</Text>
        </TouchableOpacity>
        {feedback.map((item) => <View key={item.id} style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: glass.border, paddingTop: 12 }}><Text style={{ color: glass.text, fontFamily: 'Montserrat_600SemiBold' }}>{item.teacher} · {'★'.repeat(item.rating)}</Text><Text style={{ color: glass.textSecondary, fontFamily: 'Montserrat_400Regular', marginTop: 4 }}>{item.comment}</Text></View>)}
      </View>
    </ScrollView>
  );
};

export default CommunityScreen;
