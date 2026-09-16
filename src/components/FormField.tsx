import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { Colors } from '../theme';
import { formFieldStyles as styles } from '../theme/styles';
import { Icon, type IconName } from './Icon';

interface FieldProps extends TextInputProps {
  label: string;
  icon: IconName;
  rightIcon?: IconName;
  onRightPress?: () => void;
}

export function FormField({
  label,
  icon,
  rightIcon,
  onRightPress,
  ...rest
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <Icon name={icon} size={20} color={Colors.textMuted} />
        <TextInput
          placeholderTextColor="#94A3B8"
          style={styles.input}
          {...rest}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} hitSlop={12}>
            <Icon name={rightIcon} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export { styles };
