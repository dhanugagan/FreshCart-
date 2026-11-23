import React from 'react';
import { ScooterBoy, type ScooterMood } from '../../animations/ScooterBoy';
import { useApp } from '../../context/AppContext';
import type { EntranceStage } from './ScooterRide';

interface ScooterReactionProps {
  entranceStage: EntranceStage;
  focusedField: 'none' | 'email' | 'password';
  email: string;
  isEmailValid: boolean;
  showPassword: boolean;
  error: string;
  loading: boolean;
  loginSuccess: boolean;
  headlightIntensity: number;
  headlightOn?: boolean;
  hasCap?: boolean;
  manualMood?: ScooterMood | null;
  isCruising?: boolean;
  stoppedByTouch?: boolean;
  boxOpen?: boolean;
  revving?: boolean;
  customBubble?: string | null;
  onRiderTap?: () => void;
  onCapToggle?: () => void;
  onBoxToggle?: (open: boolean) => void;
  onHeadlightClick?: () => void;
}

export const ScooterReaction: React.FC<ScooterReactionProps> = ({
  entranceStage,
  focusedField,
  email,
  isEmailValid,
  showPassword,
  error,
  loading,
  loginSuccess,
  headlightIntensity,
  headlightOn = true,
  hasCap = true,
  manualMood = null,
  isCruising = false,
  stoppedByTouch = false,
  boxOpen = false,
  revving = false,
  customBubble = null,
  onRiderTap,
  onCapToggle,
  onBoxToggle,
  onHeadlightClick,
}) => {
  const { activeRiderIndex, activeRider } = useApp();

  let mood: ScooterMood = 'idle';
  let speechBubble: string | undefined = `Hi! I'm ${activeRider.name} on ${activeRider.bikeName}!`;
  let eyeOffsetX = 0;
  let eyeOffsetY = 0;

  if (loginSuccess) {
    mood = 'celebrate';
    speechBubble = 'Woohoo! Rolling to your dashboard!';
  } else if (loading) {
    mood = 'gripping';
    speechBubble = 'Starting scooter engine...';
  } else if (!hasCap && manualMood !== 'sleeping' && manualMood !== 'eating') {
    mood = 'angry';
    speechBubble = 'Hey! Give back my FreshCart cap!';
  } else if (manualMood) {
    mood = manualMood;
    if (manualMood === 'angry') speechBubble = "Grrr! Don't poke me while I deliver!";
    else if (manualMood === 'eating') speechBubble = 'Munching a crisp Himachali apple!';
    else if (manualMood === 'sleeping') speechBubble = 'Zzz... Quick power nap between rides!';
    else if (manualMood === 'sad') speechBubble = 'Aww... missing an order in my box!';
    else if (manualMood === 'celebrate') speechBubble = 'Yay! Fresh groceries ready to roll!';
  } else if (isCruising) {
    mood = 'riding';
    speechBubble = 'Cruising FreshCart street! Touch me to stop!';
  } else if (stoppedByTouch) {
    mood = 'waving';
    speechBubble = 'Whoa! Stopped right on your tap!';
  } else if (revving) {
    mood = 'riding';
    speechBubble = 'Vroom-vroom! Electric boost on!';
  } else if (entranceStage === 'riding-in') {
    mood = 'waving';
    speechBubble = `${activeRider.name} arriving with fresh stock!`;
  } else if (entranceStage === 'braking') {
    mood = 'riding';
    speechBubble = 'Braking smooth beside you...';
  } else if (entranceStage === 'thumbs-up') {
    mood = 'thumbs-up';
    speechBubble = activeRider.catchphrase;
  } else if (error) {
    mood = 'sad';
    speechBubble = "Oh no! Let's check those details!";
  } else if (focusedField === 'password') {
    if (showPassword) {
      mood = 'peek';
      speechBubble = 'Just one quick peek!';
    } else {
      mood = 'cover-eyes';
      speechBubble = 'Eyes covered! Privacy mode on.';
    }
  } else if (focusedField === 'email') {
    eyeOffsetX = Math.min(3, Math.max(-1, email.length * 0.25));
    eyeOffsetY = 0.8;
    if (isEmailValid) {
      mood = 'nodding';
      speechBubble = 'Email looks fresh and valid!';
    } else {
      mood = 'looking-email';
      speechBubble = 'Typing your email...';
    }
  } else if (isEmailValid) {
    mood = 'thumbs-up';
    speechBubble = 'Now enter your password!';
  }

  if (customBubble && !loginSuccess && !loading) {
    speechBubble = customBubble;
  }

  const effectiveHeadlightOn = headlightOn && entranceStage !== 'camera-pan';

  return (
    <ScooterBoy
      riderIndex={activeRiderIndex}
      mood={mood}
      hasCap={hasCap}
      headlightOn={effectiveHeadlightOn}
      headlightForceOff={!headlightOn}
      headlightIntensity={headlightOn ? Math.max(0.85, headlightIntensity) : 0}
      boxOpen={boxOpen}
      eyeOffsetX={eyeOffsetX}
      eyeOffsetY={eyeOffsetY}
      happySmile={isEmailValid || loginSuccess || manualMood === 'celebrate'}
      shakeError={Boolean(error) || mood === 'angry'}
      showDust={entranceStage === 'braking' || revving || isCruising}
      speechBubble={speechBubble}
      onRiderTap={onRiderTap}
      onCapToggle={onCapToggle}
      onBoxToggle={onBoxToggle}
      onHeadlightClick={onHeadlightClick}
    />
  );
};
