import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    fontSize: 16,
    colorPrimary: '#1677ff',
    borderRadius: 6,
  },
  components: {
    Button: {
      colorPrimary: '#1677ff',
      algorithm: true,
    },
    Input: {
      colorPrimary: '#1677ff',
    },
    Card: {
      colorBorderSecondary: '#f0f0f0',
    },
  },
};

export default theme; 