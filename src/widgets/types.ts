import React from 'react';

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'repeater'
  | 'product_picker'
  | 'form_fields_builder';

export interface FormFieldItem {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'number';
  placeholder?: string;
  required?: boolean;
  width?: 'full' | 'half';
  options?: string[]; // For select type choices
  defaultValue?: string;
}

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface WidgetFieldSchema {
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  defaultValue?: any;
  options?: FieldOption[]; // For select type
  subFields?: WidgetFieldSchema[]; // For repeater type
  min?: number;
  max?: number;
  step?: number;
}

export interface CommonSectionSettings {
  sectionTitle?: string;
  sectionSubtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  paddingY?: 'none' | 'small' | 'medium' | 'large';
  containerWidth?: 'boxed' | 'full' | 'narrow';
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  anchorId?: string;
  customCssClass?: string;
}

export interface SectionInstance {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  isGlobal?: boolean;
  globalWidgetId?: string;
  settings: Record<string, any>;
  commonSettings?: CommonSectionSettings;
}

export interface WidgetRenderProps {
  settings: Record<string, any>;
  commonSettings?: CommonSectionSettings;
  isPreview?: boolean;
}

export interface WidgetDefinition {
  type: string;
  title: string;
  category: 'heroes' | 'commerce' | 'content' | 'social' | 'layout';
  description: string;
  iconName: string;
  schema: WidgetFieldSchema[];
  defaultSettings: Record<string, any>;
  component: React.ComponentType<WidgetRenderProps>;
}
