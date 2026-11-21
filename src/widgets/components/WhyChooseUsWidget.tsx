import React from 'react';
import { WidgetRenderProps } from '../types';
import { WhyChooseUs } from '../../components/WhyChooseUs';
import { useApp } from '../../context/AppContext';

export const WhyChooseUsWidget: React.FC<WidgetRenderProps> = ({ settings, commonSettings }) => {
  const { setCurrentPage } = useApp();

  return (
    <WhyChooseUs 
      onExploreServices={() => setCurrentPage('services')} 
      className={commonSettings?.customCssClass || ''}
    />
  );
};

export default WhyChooseUsWidget;
