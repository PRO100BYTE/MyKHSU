export const animateOnboardingPage = ({
  Animated,
  value,
  scrollRef,
  target,
  reduceMotion = false,
  onComplete,
}) => {
  let cancelled = false;
  let listenerId;
  let animation;
  let cleaned = false;

  const scrollTo = offset => {
    const scrollView = scrollRef?.current || scrollRef;
    if (typeof scrollView?.scrollTo !== 'function') return;
    scrollView.scrollTo({ x: offset, y: 0, animated: false });
  };

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (listenerId !== undefined && typeof value?.removeListener === 'function') {
      value.removeListener(listenerId);
    }
  };

  const complete = () => {
    if (cancelled) return;
    cleanup();
    if (typeof onComplete === 'function') onComplete();
  };

  if (reduceMotion) {
    if (typeof value?.setValue === 'function') value.setValue(target);
    scrollTo(target);
    complete();
    return () => {
      cancelled = true;
      cleanup();
    };
  }

  if (typeof value?.addListener === 'function') {
    listenerId = value.addListener(({ value: offset }) => scrollTo(offset));
  }

  animation = Animated.timing(value, {
    toValue: target,
    duration: 360,
    useNativeDriver: false,
  });
  animation.start(({ finished = true } = {}) => {
    if (finished) complete();
    else cleanup();
  });

  return () => {
    if (cancelled) return;
    cancelled = true;
    if (!cleaned && typeof animation?.stop === 'function') animation.stop();
    cleanup();
  };
};
