import React from 'react';
import MaterialIcons, {
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons';
import { type TextProps } from 'react-native';
import { Colors } from '../theme';

export type IconName = MaterialIconsIconName;

export interface IconProps extends TextProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Wrapper ikon MaterialIcons (font otomatis ter-link via autolinking,
 * tanpa setup native tambahan).
 */
export function Icon({ name, size = 20, color = Colors.text, style, ...rest }: IconProps) {
  return <MaterialIcons {...rest} name={name} size={size} color={color} style={style} />;
}
