import { ActionSheetIOS, Alert, Linking, Platform, Share } from 'react-native';

export const getNewsUrl = (item) => {
  const candidate = [item?.url, item?.link, item?.source_url]
    .find(value => typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim()));
  return candidate ? candidate.trim() : null;
};

export const shareText = async (message) => {
  if (!message) return;
  await Share.share({ message });
};

// Actions are { label, onPress }; cancellation never invokes an action.
export const showContextActions = ({ title, actions = [] }) => {
  const available = actions.filter(action => action && typeof action.onPress === 'function');
  if (!available.length) return;
  const run = async (index) => {
    if (!available[index]) return;
    try {
      await available[index].onPress();
    } catch (error) {
      console.warn('Context action failed:', error);
      Alert.alert('Не удалось выполнить действие', 'Попробуйте ещё раз.');
    }
  };
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({
      title,
      options: [...available.map(action => action.label), 'Отмена'],
      cancelButtonIndex: available.length,
    }, index => { void run(index); });
  } else {
    Alert.alert(title, undefined, [
      ...available.map((action, index) => ({ text: action.label, onPress: () => { void run(index); } })),
      { text: 'Отмена', style: 'cancel' },
    ], { cancelable: true });
  }
};

export const showNewsActions = (item) => {
  const url = getNewsUrl(item);
  const content = typeof item?.content === 'string' ? item.content : '';
  showContextActions({
    title: 'Новость',
    actions: [
      ...(url ? [{ label: 'Открыть источник', onPress: () => Linking.openURL(url) }] : []),
      ...((content || url) ? [{ label: 'Поделиться', onPress: () => shareText([content, url].filter(Boolean).join('\n\n')) }] : []),
    ],
  });
};
