export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#d8e5ff',
          primary: '#4b6cff',
          dark: '#4e00ff'
        }
      },
      backgroundImage: {
        glass: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))'
      },
      boxShadow: {
        glass: '0 20px 60px rgba(14, 30, 60, 0.14)'
      }
    }
  },
  plugins: []
}
