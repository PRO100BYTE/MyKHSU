export const animateOnboardingPage = ({
  scrollRef,
  target,
  reduceMotion = false,
  onComplete,
}) => {
  const scrollView = scrollRef?.current || scrollRef;
  if (typeof scrollView?.scrollTo === 'function') {
    scrollView.scrollTo({ x: target, y: 0, animated: !reduceMotion });
  }
  if (typeof onComplete === 'function') onComplete();

  // Native ScrollView owns the transition. There is deliberately no Animated.Value
  // listener here: feeding animated JS values back into scrollTo fights native paging.
  return () => {};
};
