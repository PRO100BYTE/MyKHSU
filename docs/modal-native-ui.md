# Native modal UI

The attendance, academic event, and lesson note editors use React Native `Modal` with iOS `presentationStyle="pageSheet"`. This keeps sheets inside the native presentation context instead of drawing an overlay over the tab bar. Each modal handles iOS/Android keyboard resizing with `KeyboardAvoidingView` and routes native back requests through its close handler; unsaved editor changes prompt before dismissal. Lesson notes retain homework deadline reminders and achievement updates.
